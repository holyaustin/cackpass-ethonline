'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import {
  Loader2, CheckCircle, XCircle, ArrowLeft,
  Camera, AlertCircle, Home, RefreshCw,
} from 'lucide-react';

// ─── Debug logger ────────────────────────────────────────────────────────────
const DEBUG = true; // set false in production
function log(scope: string, msg: string, data?: unknown) {
  if (!DEBUG) return;
  const prefix = `[SCAN:${scope}]`;
  data !== undefined
    ? console.log(prefix, msg, data)
    : console.log(prefix, msg);
}
function logError(scope: string, msg: string, err?: unknown) {
  console.error(`[SCAN:${scope}] ❌ ${msg}`, err ?? '');
}

export default function ScanPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();

  const [authorized, setAuthorized]       = useState<boolean | null>(null);
  const [eventTitle, setEventTitle]       = useState('');
  const [cameraPermission, setCameraPermission] =
    useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [processing, setProcessing] = useState(false);
  const [resultModal, setResultModal] = useState<{
    show: boolean; success: boolean; message: string;
  }>({ show: false, success: false, message: '' });

  const scannerRef  = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId  = 'qr-reader-container';

  // ── 1. Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      log('AUTH', 'Starting auth check', { eventId, authenticated, ready });

      if (!ready || !authenticated) {
        logError('AUTH', 'Not authenticated');
        toast.error('Please login to scan tickets');
        router.push('/');
        return;
      }

      try {
        const walletAddress = user?.wallet?.address;
        const userEmail     = user?.email?.address;
        log('AUTH', 'User identifiers', { walletAddress, userEmail, userId: user?.id });

        const res = await fetch(`/api/events/${eventId}/can-scan`, {
          headers: {
            'x-wallet-address': walletAddress || '',
            'x-user-email':     userEmail     || '',
          },
        });
        log('AUTH', 'can-scan response', { status: res.status, ok: res.ok });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          logError('AUTH', 'Not authorized', body);
          toast.error('You are not authorized to scan this event');
          router.push('/dashboard');
          return;
        }

        setAuthorized(true);

        const eventRes  = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        log('AUTH', 'Event data', eventData);

        if (eventData.success) setEventTitle(eventData.event.title);
      } catch (error) {
        logError('AUTH', 'Authorization check threw', error);
        toast.error('Authorization check failed');
        router.push('/dashboard');
      }
    };

    if (eventId) checkAuth();
  }, [eventId, authenticated, ready, user, router]);

  // ── 2. Camera permission ────────────────────────────────────────────────────
  const requestCameraPermission = async () => {
    log('CAMERA', 'Requesting camera permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      log('CAMERA', 'Permission granted');
      setCameraPermission('granted');
      toast.success('Camera access granted');
    } catch (err) {
      logError('CAMERA', 'Permission denied', err);
      setCameraPermission('denied');
      toast.error('Camera access denied. Please allow camera access in your browser settings.');
    }
  };

  // ── 3. Look up event ID by title (old QR fallback) ──────────────────────────
  const fetchEventIdByTitle = async (title: string): Promise<string | null> => {
    log('LOOKUP', `Searching event by title: "${title}"`);
    try {
      const res  = await fetch(`/api/events?search=${encodeURIComponent(title)}&limit=5`);
      const data = await res.json();
      log('LOOKUP', 'Search results', data);

      if (!data.success || !data.events?.length) {
        logError('LOOKUP', 'No events returned for title', { title, data });
        return null;
      }

      // exact-match first, then fallback to first result
      const exact = data.events.find(
        (e: { title: string; _id: string }) =>
          e.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      if (exact) {
        log('LOOKUP', 'Exact title match found', { id: exact._id, title: exact.title });
        return exact._id;
      }

      log('LOOKUP', 'No exact match, using first result', data.events[0]);
      return data.events[0]._id;
    } catch (err) {
      logError('LOOKUP', 'fetchEventIdByTitle threw', err);
      return null;
    }
  };

  // ── 4. Core QR processing ───────────────────────────────────────────────────
  const processQrCode = async (decodedText: string) => {
    if (processing) {
      log('QR', 'Already processing — skipping duplicate scan');
      return;
    }
    setProcessing(true);

    // ── Step A: Log the raw string so we know exactly what the scanner read ──
    log('QR', '━━━ NEW SCAN ━━━');
    log('QR', 'Raw decoded text', decodedText);
    log('QR', 'Raw length', decodedText.length);
    log('QR', 'Current page eventId', eventId);

    try {
      // ── Step B: Parse JSON ─────────────────────────────────────────────────
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(decodedText);
        log('QR', 'Parsed JSON keys', Object.keys(parsed));
        log('QR', 'Parsed JSON value', parsed);
      } catch (jsonErr) {
        logError('QR', 'JSON.parse failed — raw text is not valid JSON', jsonErr);
        throw new Error(
          `QR code is not valid JSON. First 80 chars: "${decodedText.slice(0, 80)}"`
        );
      }

      let ticketNumber: string | undefined;
      let qrEventId:    string | undefined;
      let signature:    string | undefined;

      // ── Step C: Detect format ──────────────────────────────────────────────
      const hasNewFormat =
        typeof parsed.ticketNumber === 'string' &&
        typeof parsed.eventId      === 'string';

      // old format field names varied — check all known variants
      const refField =
        (parsed.reference   as string | undefined) ??
        (parsed.ticketRef   as string | undefined) ??
        (parsed.ref         as string | undefined);

      const titleField =
        (parsed.eventTitle  as string | undefined) ??
        (parsed.event       as string | undefined) ??
        (parsed.title       as string | undefined);

      const hasOldFormat = Boolean(refField && titleField);

      log('QR', 'Format detection', {
        hasNewFormat,
        hasOldFormat,
        refField,
        titleField,
      });

      if (hasNewFormat) {
        // ── NEW FORMAT: { ticketNumber, eventId, sig } ─────────────────────
        ticketNumber = parsed.ticketNumber as string;
        qrEventId    = parsed.eventId      as string;
        signature    = (parsed.sig ?? parsed.signature ?? '') as string;

        log('QR', 'New-format fields', { ticketNumber, qrEventId, signature });

        // Compare as strings — MongoDB ObjectId vs string is a common mismatch
        const pageId = String(eventId).trim();
        const qrId   = String(qrEventId).trim();
        log('QR', 'Event ID comparison', { pageId, qrId, match: pageId === qrId });

        if (pageId !== qrId) {
          throw new Error(
            `Ticket belongs to a different event.\n` +
            `QR event: "${qrId}"\nThis event: "${pageId}"`
          );
        }

      } else if (hasOldFormat) {
        // ── OLD FORMAT: { reference, eventTitle } ──────────────────────────
        log('QR', 'Old-format path — resolving event by title', { refField, titleField });

        const foundEventId = await fetchEventIdByTitle(titleField!);
        log('QR', 'Resolved event ID from title', foundEventId);

        if (!foundEventId) {
          throw new Error(`Could not find event for title: "${titleField}"`);
        }

        // Verify this ticket is being scanned at the right event
        const pageId = String(eventId).trim();
        const qrId   = String(foundEventId).trim();
        log('QR', 'Old-format event ID comparison', { pageId, qrId, match: pageId === qrId });

        if (pageId !== qrId) {
          throw new Error(
            `Ticket belongs to a different event.\n` +
            `QR event: "${qrId}"\nThis event: "${pageId}"`
          );
        }

        qrEventId = foundEventId;

        // Resolve ticket number from the reference (drop eventId filter — it may not be stored)
        log('QR', 'Fetching ticket number by reference', { reference: refField, eventId: foundEventId });
        const ticketRes = await fetch(
          `/api/tickets/find-by-reference?reference=${encodeURIComponent(refField!)}&eventId=${encodeURIComponent(foundEventId)}`
        );
        const ticketData = await ticketRes.json();
        log('QR', 'find-by-reference response', { status: ticketRes.status, body: ticketData });

        if (!ticketRes.ok || !ticketData.ticketNumber) {
          logError('QR', 'Could not resolve ticket number', ticketData);
          throw new Error(
            `Ticket not found for reference "${refField}". ` +
            (ticketData.error ?? 'No ticket number returned.')
          );
        }

        ticketNumber = ticketData.ticketNumber;
        signature    = ''; // old QR codes have no HMAC
        log('QR', 'Old-format resolved', { ticketNumber, qrEventId, signature });

      } else {
        // ── UNKNOWN FORMAT ─────────────────────────────────────────────────
        logError('QR', 'Unrecognised QR format', { parsedKeys: Object.keys(parsed), parsed });
        throw new Error(
          `Unrecognised QR code format. Found keys: [${Object.keys(parsed).join(', ')}]`
        );
      }

      // ── Step D: Call verify API ────────────────────────────────────────────
      const verifyPayload = {
        ticketNumber,
        eventId:       qrEventId,
        signature,
        scannerUserId: user?.id,
      };
      log('QR', 'Calling /api/tickets/verify with payload', verifyPayload);

      const verifyRes = await fetch('/api/tickets/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(verifyPayload),
      });

      const verifyData = await verifyRes.json();
      log('QR', 'Verify response', { status: verifyRes.status, ok: verifyRes.ok, body: verifyData });

      setResultModal({
        show:    true,
        success: verifyRes.ok,
        message: verifyRes.ok
          ? 'Ticket verified! Entry granted.'
          : (verifyData.error ?? 'Verification failed'),
      });
      scannerRef.current?.pause(true);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid QR code';
      logError('QR', 'processQrCode threw', err);
      setResultModal({ show: true, success: false, message });
      scannerRef.current?.pause(true);
    } finally {
      setProcessing(false);
    }
  };

  // ── 5. Initialize scanner ───────────────────────────────────────────────────
  useEffect(() => {
    if (!authorized || cameraPermission !== 'granted') return;

    const container = containerRef.current;
    if (!container) {
      logError('SCANNER', 'Container ref not ready');
      return;
    }

    log('SCANNER', 'Initializing Html5QrcodeScanner', { containerId });

    if (scannerRef.current) {
      scannerRef.current.clear().catch(err =>
        logError('SCANNER', 'Failed to clear previous scanner', err)
      );
      scannerRef.current = null;
    }

    const config = {
      fps:         15,
      qrbox:       { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    const html5Scanner = new Html5QrcodeScanner(containerId, config, false);
    scannerRef.current = html5Scanner;

    html5Scanner.render(
      (decodedText: string) => {
        log('SCANNER', 'Decode success callback fired', { decodedText });
        processQrCode(decodedText);
      },
      (errMsg: unknown) => {
        // Fired repeatedly while no QR in frame — only log non-trivial messages
        if (typeof errMsg === 'string' && !errMsg.includes('No MultiFormat Readers')) {
          log('SCANNER', 'Scan frame error (non-critical)', errMsg);
        }
      }
    );

    return () => {
      log('SCANNER', 'Cleaning up scanner');
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err =>
          logError('SCANNER', 'Cleanup clear failed', err)
        );
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, cameraPermission, eventId]);

  // ── 6. Reset after result ───────────────────────────────────────────────────
  const resetScanner = () => {
    log('SCANNER', 'Resetting scanner for next scan');
    setResultModal({ show: false, success: false, message: '' });
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!ready || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold mb-2">Scan Ticket QR Code</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Event: <span className="font-semibold">{eventTitle}</span>
          </p>
        </div>

        {cameraPermission === 'prompt' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 text-center">
            <Camera className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Camera Access Required
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This app needs access to your camera to scan QR codes.
            </p>
            <button
              onClick={requestCameraPermission}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              Allow Camera Access
            </button>
          </div>
        )}

        {cameraPermission === 'granted' && (
          <div
            id={containerId}
            ref={containerRef}
            className="bg-black rounded-xl overflow-hidden"
          />
        )}

        {cameraPermission === 'denied' && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center mt-4">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Camera Access Denied
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please enable camera access in your browser settings.
            </p>
            <button
              onClick={requestCameraPermission}
              className="px-6 py-2 bg-primary text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {processing && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying ticket…
          </div>
        )}

        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4">
          Position the QR code inside the frame to scan
        </p>
      </div>

      {resultModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
            {resultModal.success ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {resultModal.success ? 'Entry Granted' : 'Verification Failed'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">
              {resultModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={resetScanner}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Scan Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Home className="h-5 w-5" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}