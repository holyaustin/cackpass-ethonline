'use client';

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Clock,
  Ticket,
  Shield,
  AlertTriangle,
  Home,
  RefreshCw,
} from 'lucide-react';

// Lazy load jsQR library only when needed
let jsQRModule: any = null;
const loadJsQR = async () => {
  if (!jsQRModule) {
    jsQRModule = await import('jsqr');
  }
  return jsQRModule.default;
};

type VerificationStatus =
  | 'success'
  | 'already_used'
  | 'wrong_event'
  | 'invalid_signature'
  | 'expired'
  | 'not_found'
  | 'error';

interface VerificationResult {
  status: VerificationStatus;
  message: string;
  usedAt?: string;
  eventTitle?: string;
  ticketNumber?: string;
}

// Loading spinner component
const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function ScanPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalResult, setModalResult] = useState<VerificationResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [jsQRLoaded, setJsQRLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const isScanningRef = useRef(false);
  const isInitialisingRef = useRef(false);

  const logDebug = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[SCAN] ${timestamp}: ${msg}`);
  };

  // Load jsQR library when component mounts
  useEffect(() => {
    loadJsQR()
      .then(() => {
        logDebug('jsQR library loaded successfully');
        setJsQRLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load jsQR:', error);
        setCameraError('Failed to load QR scanner library. Please refresh the page.');
      });
  }, []);

  // Authorization check
  useEffect(() => {
    const checkAuth = async () => {
      if (!ready || !authenticated) {
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
          router.push('/dashboard');
          return;
        }
        setAuthorized(true);
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) setEventTitle(eventData.event.title);
        logDebug(`Authorized for event: ${eventData.event.title}`);
      } catch (error) {
        console.error(error);
        router.push('/dashboard');
      }
    };
    if (eventId) checkAuth();
  }, [eventId, authenticated, ready, user, router]);

  const mapErrorToStatus = (errorMessage: string): VerificationStatus => {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('already been used') || msg.includes('already used')) return 'already_used';
    if (msg.includes('does not belong to this event')) return 'wrong_event';
    if (msg.includes('invalid signature') || msg.includes('fake')) return 'invalid_signature';
    if (msg.includes('event has ended') || msg.includes('expired')) return 'expired';
    if (msg.includes('not found')) return 'not_found';
    return 'error';
  };

  // Stop camera and scanning
  const stopCamera = useCallback(() => {
    logDebug('Stopping camera');
    isScanningRef.current = false;
    isInitialisingRef.current = false;
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // QR processing
  const processQrCode = useCallback(
    async (scannedText: string) => {
      logDebug(`✅ QR detected: ${scannedText.substring(0, 80)}...`);
      isProcessingRef.current = true;
      isScanningRef.current = false;
      setProcessing(true);

      try {
        let qrData;
        try {
          qrData = JSON.parse(scannedText);
          logDebug(`📦 Parsed JSON: ${JSON.stringify(qrData).substring(0, 150)}`);
        } catch {
          throw new Error('Invalid QR code format (not JSON)');
        }

        let ticketNumber: string | null = null;
        let qrEventId: string | null = null;
        let signature: string | null = null;

        // Secure format
        if (qrData.ticketNumber && qrData.eventId) {
          ticketNumber = qrData.ticketNumber;
          qrEventId = qrData.eventId;
          signature = qrData.sig || null;
          logDebug(`🎫 Secure QR: ticketNumber=${ticketNumber}`);
        }
        // Legacy format (reference + eventTitle)
        else if (qrData.reference) {
          logDebug(`📧 Legacy QR: reference=${qrData.reference}`);
          const resolveRes = await fetch(
            `/api/tickets/find-by-reference?reference=${encodeURIComponent(qrData.reference)}&eventId=${eventId}`
          );
          if (!resolveRes.ok) {
            const errData = await resolveRes.json();
            throw new Error(errData.error || 'Ticket not found for this reference');
          }
          const resolveData = await resolveRes.json();
          ticketNumber = resolveData.ticketNumber;
          qrEventId = eventId as string;
          signature = null;
          logDebug(`🔍 Resolved → ticketNumber=${ticketNumber}`);
        } else {
          throw new Error('QR code missing both ticketNumber and reference');
        }

        // Validate event
        if (qrEventId && qrEventId !== eventId) {
          throw new Error('Ticket does not belong to this event');
        }

        logDebug('📡 Sending verification request...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const verifyRes = await fetch('/api/tickets/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketNumber,
            eventId: qrEventId,
            signature,
            scannerUserId: user?.id,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await verifyRes.json();
        logDebug(`📡 Response: ${verifyRes.status} - ${JSON.stringify(data)}`);

        if (verifyRes.ok) {
          setModalResult({
            status: 'success',
            message: data.message || 'Ticket verified! Entry granted.',
            ticketNumber: ticketNumber || undefined,
            eventTitle,
          });
        } else {
          const status = mapErrorToStatus(data.error || '');
          let customMessage = data.error || 'Verification failed';
          let usedAt: string | undefined;
          if (status === 'already_used' && data.usedAt) {
            usedAt = new Date(data.usedAt).toLocaleString();
            customMessage = `This ticket was already used on ${usedAt}.`;
          }
          setModalResult({
            status,
            message: customMessage,
            usedAt,
            ticketNumber: ticketNumber || undefined,
            eventTitle,
          });
        }
      } catch (err: any) {
        logDebug(`❌ Error: ${err.message}`);
        setModalResult({
          status: 'error',
          message: err.message || 'Invalid QR code',
        });
      } finally {
        setProcessing(false);
        isProcessingRef.current = false;
      }
    },
    [eventId, user?.id, eventTitle, mapErrorToStatus]
  );

  // Start scanning loop
  const startScanLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      logDebug('startScanLoop: refs missing');
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      logDebug('startScanLoop: no 2d context');
      return;
    }

    // Load jsQR if not loaded
    const jsQR = await loadJsQR();
    if (!jsQR) {
      logDebug('jsQR not loaded');
      return;
    }

    logDebug('Scan loop starting');
    isScanningRef.current = true;

    const tick = () => {
      if (!isScanningRef.current || isProcessingRef.current) {
        if (!isProcessingRef.current && isScanningRef.current) {
          animationId.current = requestAnimationFrame(tick);
        }
        return;
      }

      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        animationId.current = requestAnimationFrame(tick);
        return;
      }

      // Ensure canvas dimensions match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        logDebug(`Canvas sized: ${canvas.width}x${canvas.height}`);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        logDebug(`getImageData failed: ${e}`);
        animationId.current = requestAnimationFrame(tick);
        return;
      }

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code?.data) {
        logDebug(`QR detected, stopping scan loop`);
        isScanningRef.current = false;
        if (animationId.current) {
          cancelAnimationFrame(animationId.current);
          animationId.current = null;
        }
        processQrCode(code.data);
        return;
      }

      animationId.current = requestAnimationFrame(tick);
    };

    animationId.current = requestAnimationFrame(tick);
  }, [processQrCode]);

  // Initialize camera
  const initCamera = useCallback(async () => {
    if (isInitialisingRef.current) {
      logDebug('Camera already initialising, skipping');
      return;
    }
    
    if (!jsQRLoaded) {
      logDebug('Waiting for jsQR to load...');
      return;
    }
    
    isInitialisingRef.current = true;
    logDebug('Initializing camera...');

    setCameraError(null);
    setCameraReady(false);
    isScanningRef.current = false;
    isProcessingRef.current = false;

    // Clean up existing resources
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Small delay to let browser settle
    await new Promise(resolve => setTimeout(resolve, 80));

    // Try constraints in order
    let stream: MediaStream | null = null;
    const constraintsList = [
      { video: { facingMode: { exact: 'environment' } } },
      { video: { facingMode: 'environment' } },
      { video: true },
    ];

    for (const constraint of constraintsList) {
      try {
        logDebug(`Trying constraint: ${JSON.stringify(constraint)}`);
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        const track = stream.getVideoTracks()[0];
        logDebug(`Stream obtained: label=${track?.label}`);
        break;
      } catch (err) {
        logDebug(`Constraint failed: ${err}`);
      }
    }

    if (!stream) {
      logDebug('All camera constraints failed');
      setCameraError('Camera access denied or unavailable. Please allow camera access and try again.');
      isInitialisingRef.current = false;
      return;
    }

    streamRef.current = stream;
    if (!videoRef.current) {
      logDebug('videoRef is null after getUserMedia');
      stream.getTracks().forEach(t => t.stop());
      isInitialisingRef.current = false;
      return;
    }

    videoRef.current.srcObject = stream;
    logDebug('srcObject assigned, waiting for loadeddata');

    // Wait for loadeddata
    await new Promise<void>((resolve) => {
      const vid = videoRef.current!;
      const onLoaded = () => {
        vid.removeEventListener('loadeddata', onLoaded);
        logDebug(`loadeddata fired, dimensions: ${vid.videoWidth}x${vid.videoHeight}`);
        resolve();
      };
      vid.addEventListener('loadeddata', onLoaded);
      setTimeout(() => {
        vid.removeEventListener('loadeddata', onLoaded);
        logDebug('loadeddata timeout, proceeding anyway');
        resolve();
      }, 5000);
    });

    // Play video
    try {
      await videoRef.current.play();
      logDebug('play() succeeded');
    } catch (playErr: any) {
      logDebug(`play() error: ${playErr.name} - ${playErr.message}`);
      if (videoRef.current?.paused) {
        setCameraError('Could not start camera preview. Tap "Try Again" or interact with the page first.');
        isInitialisingRef.current = false;
        return;
      }
    }

    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      logDebug('videoWidth still 0 after play');
      setCameraError('Camera stream appears empty. Please try again.');
      isInitialisingRef.current = false;
      return;
    }

    logDebug('Camera fully ready, starting scan loop');
    setCameraReady(true);
    isInitialisingRef.current = false;
    startScanLoop();
  }, [startScanLoop, jsQRLoaded]);

  // Initial camera start when authorized and jsQR loaded
  useEffect(() => {
    if (!authorized || !jsQRLoaded) return;
    logDebug('Authorized and jsQR loaded, initializing camera');
    const timer = setTimeout(() => initCamera(), 100);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, jsQRLoaded]);

  // Handle "Scan Again"
  const handleScanAgain = () => {
    logDebug('Restarting scanner (Scan Again)');
    setModalResult(null);
    setProcessing(false);
    isProcessingRef.current = false;
    isInitialisingRef.current = false;
    initCamera();
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  const renderModalContent = () => {
    if (!modalResult) return null;

    const { status, message, usedAt, ticketNumber, eventTitle: resultEventTitle } = modalResult;

    const config = {
      success: {
        icon: <CheckCircle className="h-20 w-20 text-green-500" />,
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        titleColor: 'text-green-800 dark:text-green-300',
        borderColor: 'border-green-200 dark:border-green-800',
      },
      already_used: {
        icon: <AlertCircle className="h-20 w-20 text-orange-500" />,
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        titleColor: 'text-orange-800 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
      },
      wrong_event: {
        icon: <XCircle className="h-20 w-20 text-red-500" />,
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        titleColor: 'text-red-800 dark:text-red-300',
        borderColor: 'border-red-200 dark:border-red-800',
      },
      invalid_signature: {
        icon: <Shield className="h-20 w-20 text-red-500" />,
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        titleColor: 'text-red-800 dark:text-red-300',
        borderColor: 'border-red-200 dark:border-red-800',
      },
      expired: {
        icon: <Clock className="h-20 w-20 text-gray-500" />,
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        titleColor: 'text-gray-800 dark:text-gray-300',
        borderColor: 'border-gray-200 dark:border-gray-800',
      },
      not_found: {
        icon: <Ticket className="h-20 w-20 text-gray-500" />,
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        titleColor: 'text-gray-800 dark:text-gray-300',
        borderColor: 'border-gray-200 dark:border-gray-800',
      },
      error: {
        icon: <AlertTriangle className="h-20 w-20 text-red-500" />,
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        titleColor: 'text-red-800 dark:text-red-300',
        borderColor: 'border-red-200 dark:border-red-800',
      },
    };

    const { icon, bgColor, titleColor, borderColor } = config[status];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className={`max-w-md w-full ${bgColor} rounded-2xl shadow-2xl border ${borderColor} p-8 text-center`}>
          <div className="mb-6">{icon}</div>
          <h2 className={`text-2xl font-bold mb-3 ${titleColor}`}>
            {status === 'success' && '✅ Ticket Valid'}
            {status === 'already_used' && '⚠️ Ticket Already Used'}
            {status === 'wrong_event' && '❌ Wrong Event'}
            {status === 'invalid_signature' && '🔒 Invalid / Fake Ticket'}
            {status === 'expired' && '⏰ Event Has Ended'}
            {status === 'not_found' && '🔍 Ticket Not Found'}
            {status === 'error' && '💥 Verification Error'}
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>

          {(ticketNumber || resultEventTitle) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 text-left space-y-2">
              {ticketNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="h-4 w-4 text-gray-500" />
                  <span className="font-mono">{ticketNumber}</span>
                </div>
              )}
              {resultEventTitle && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{resultEventTitle}</span>
                </div>
              )}
              {usedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Used on: {usedAt}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleScanAgain}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
            >
              <RefreshCw className="h-5 w-5" />
              Scan Again
            </button>
            <button
              onClick={goToDashboard}
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <Home className="h-5 w-5" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!ready || authorized === null) {
    return <LoadingState />;
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

        {cameraError && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Unavailable</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{cameraError}</p>
            <button
              onClick={() => {
                isInitialisingRef.current = false;
                initCamera();
              }}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        <div
          className="bg-black rounded-xl overflow-hidden aspect-square relative"
          style={{ display: cameraError ? 'none' : 'block' }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {(!cameraReady || !jsQRLoaded) && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <p className="text-white text-sm">
                {!jsQRLoaded ? 'Loading scanner...' : 'Starting camera…'}
              </p>
            </div>
          )}

          {processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
              <p className="text-white text-sm font-medium">Verifying ticket…</p>
            </div>
          )}

          {cameraReady && jsQRLoaded && !processing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4">
          {cameraReady && jsQRLoaded ? 'Position the QR code inside the frame to scan' : 'Initializing scanner…'}
        </p>
      </div>

      {modalResult && renderModalContent()}
    </div>
  );
}