'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Camera,
  AlertCircle,
  Calendar,
  Clock,
  Ticket,
  Shield,
  AlertTriangle,
  Home,
  RefreshCw,
} from 'lucide-react';
import jsQR from 'jsqr';

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

export default function ScanPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [modalResult, setModalResult] = useState<VerificationResult | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  const logDebug = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[SCAN] ${timestamp}: ${msg}`);
  };

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

  // Stop the scanning loop and camera
  const stopCameraAndScanning = useCallback(() => {
    // Cancel animation frame
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }
    
    // Stop all camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
    setProcessing(false);
    isProcessingRef.current = false;
  }, []);

  // Start scanning loop (only called after camera is ready)
  const startScanningLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cancel any existing animation frame
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }

    let active = true;

    const scan = () => {
      // Stop scanning if we're no longer in scanning state or processing
      if (!active || !scanning || processing || isProcessingRef.current) {
        if (active && scanning) {
          animationId.current = requestAnimationFrame(scan);
        }
        return;
      }

      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationId.current = requestAnimationFrame(scan);
        return;
      }

      // Set canvas size to match video dimensions
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && !isProcessingRef.current) {
        const scannedText = code.data;
        logDebug(`✅ QR detected: ${scannedText.substring(0, 80)}...`);

        // Stop scanning immediately
        active = false;
        setScanning(false);
        setProcessing(true);
        isProcessingRef.current = true;
        
        if (animationId.current) {
          cancelAnimationFrame(animationId.current);
          animationId.current = null;
        }

        // Process QR asynchronously
        (async () => {
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
            // Scanner remains stopped until user clicks "Scan Again"
          }
        })();

        return;
      }

      animationId.current = requestAnimationFrame(scan);
    };

    animationId.current = requestAnimationFrame(scan);
  }, [scanning, processing, eventId, user?.id, eventTitle]);

  // Initialize camera (always creates a fresh stream)
  const initCamera = useCallback(async () => {
    logDebug('Initializing camera...');
    
    // Clean up any existing camera stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          logDebug('Camera stream started');
          setScanning(true);
          startScanningLoop();
        };
      }
      setCameraPermission('granted');
      setShowPermissionRequest(false);
    } catch (err) {
      const error = err as { name?: string; message?: string };
      logDebug(`Camera init error: ${error.name} - ${error.message}`);
      setCameraPermission('denied');
      setShowPermissionRequest(true);
    }
  }, [startScanningLoop]);

  const requestCameraPermission = async () => {
    setShowPermissionRequest(false);
    await initCamera();
  };

  // Initial permission check and camera setup
  useEffect(() => {
    const checkPermission = async () => {
      logDebug('Checking permission status');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setCameraPermission('granted');
        setShowPermissionRequest(false);
        initCamera();
      } catch (err) {
        const error = err as { name?: string; message?: string };
        logDebug(`Permission check: ${error.name}`);
        setCameraPermission('denied');
        setShowPermissionRequest(true);
      }
    };
    if (typeof window !== 'undefined') {
      checkPermission();
    }
    return () => {
      if (animationId.current) cancelAnimationFrame(animationId.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initCamera]);

  // Handle "Scan Again" - completely reset and restart camera
  const handleScanAgain = () => {
    logDebug('Restarting scanner...');
    
    // Reset all state
    setModalResult(null);
    setProcessing(false);
    setScanning(true);
    isProcessingRef.current = false;
    
    // Cancel any existing animation frame
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
      animationId.current = null;
    }
    
    // Re-initialize camera (which will restart the scanning loop)
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

        {showPermissionRequest && cameraPermission !== 'granted' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 mb-4 text-center">
            <Camera className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Access Required</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This app needs access to your camera to scan QR codes.
            </p>
            <button
              onClick={requestCameraPermission}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Allow Camera Access
            </button>
          </div>
        )}

        {cameraPermission === 'granted' && (
          <div className="bg-black rounded-xl overflow-hidden aspect-square relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        {cameraPermission === 'denied' && !showPermissionRequest && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Access Denied</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You have denied camera access. Please enable it in your browser settings.
            </p>
            <button
              onClick={requestCameraPermission}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4">
          Position the QR code inside the frame to scan
        </p>
      </div>

      {modalResult && renderModalContent()}
    </div>
  );
}