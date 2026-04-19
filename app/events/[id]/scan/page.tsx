// app/events/[id]/scan/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Camera, AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function ScanPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [processing, setProcessing] = useState(false);
  const [resultModal, setResultModal] = useState<{ show: boolean; success: boolean; message: string }>({
    show: false,
    success: false,
    message: '',
  });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = 'qr-reader-container';

  // 1. Authorization & event info
  useEffect(() => {
    const checkAuth = async () => {
      if (!ready || !authenticated) {
        toast.error('Please login to scan tickets');
        router.push('/');
        return;
      }

      try {
        const walletAddress = user?.wallet?.address;
        const userEmail = user?.email?.address;

        const res = await fetch(`/api/events/${eventId}/can-scan`, {
          headers: {
            'x-wallet-address': walletAddress || '',
            'x-user-email': userEmail || '',
          },
        });

        if (!res.ok) {
          toast.error('You are not authorized to scan this event');
          router.push('/dashboard');
          return;
        }

        setAuthorized(true);
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) setEventTitle(eventData.event.title);
      } catch (error) {
        console.error('Authorization check failed:', error);
        toast.error('Authorization check failed');
        router.push('/dashboard');
      }
    };

    if (eventId) checkAuth();
  }, [eventId, authenticated, ready, user, router]);

  // 2. Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      toast.success('Camera access granted');
    } catch (err: any) {
      console.error('Permission error:', err);
      setCameraPermission('denied');
      toast.error('Camera access denied. Please allow camera access in your browser settings.');
    }
  };

  // 3. Initialize scanner when container is ready and permission granted
  useEffect(() => {
    if (!authorized || cameraPermission !== 'granted') return;

    // Ensure the container div exists
    const container = containerRef.current;
    if (!container) return;

    // Clean up previous scanner
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    const html5Scanner = new Html5QrcodeScanner(containerId, config, false);
    scannerRef.current = html5Scanner;

    html5Scanner.render(
      async (decodedText: string) => {
        if (processing) return;
        setProcessing(true);

        try {
          const qrData = JSON.parse(decodedText);
          const { ticketNumber, eventId: qrEventId, sig } = qrData;

          if (qrEventId !== eventId) throw new Error('Ticket does not belong to this event');

          const verifyRes = await fetch('/api/tickets/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticketNumber,
              eventId: qrEventId,
              signature: sig,
              scannerUserId: user?.id,
            }),
          });

          const data = await verifyRes.json();

          setResultModal({
            show: true,
            success: verifyRes.ok,
            message: verifyRes.ok ? 'Ticket verified! Entry granted.' : data.error || 'Verification failed',
          });

          html5Scanner.pause(true);
        } catch (err: any) {
          setResultModal({
            show: true,
            success: false,
            message: err.message || 'Invalid QR code',
          });
          html5Scanner.pause(true);
        } finally {
          setProcessing(false);
        }
      },
      (err: any) => {
        // Ignore non-critical scanning errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [authorized, cameraPermission, eventId, processing, user?.id]);

  const resetScanner = () => {
    setResultModal({ show: false, success: false, message: '' });
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Access Required</h3>
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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Access Denied</h3>
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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