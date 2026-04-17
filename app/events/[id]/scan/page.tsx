// app/events/[id]/scan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

// Dynamically import the QR scanner to avoid SSR issues
const BarcodeScanner = dynamic(
  () => import('react-qr-barcode-scanner'),
  { ssr: false }
);

export default function ScanPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [eventTitle, setEventTitle] = useState('');

  // Check authorization
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
        
        // Fetch event title
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setEventTitle(eventData.event.title);
        }
      } catch (error) {
        console.error('Authorization check failed:', error);
        toast.error('Authorization check failed');
        router.push('/dashboard');
      }
    };

    if (eventId) {
      checkAuth();
    }
  }, [eventId, authenticated, ready, user, router]);

  // Callback for each scan attempt
  const handleUpdate = async (err: any, result: any) => {
    if (err) {
      console.error('Scanner error:', err);
      toast.error('Camera error. Please check permissions.');
      return;
    }

    if (result && result.text && !processing && scanning) {
      const scannedText = result.text;
      setScanning(false);
      setProcessing(true);
      
      try {
        let qrData;
        try {
          qrData = JSON.parse(scannedText);
        } catch {
          throw new Error('Invalid QR code format');
        }

        const { ticketNumber, eventId: qrEventId, sig } = qrData;

        if (qrEventId !== eventId) {
          throw new Error('Ticket does not belong to this event');
        }

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
        
        if (verifyRes.ok) {
          setLastResult({ success: true, message: 'Ticket verified! Entry granted.' });
          toast.success('Ticket checked in');
        } else {
          setLastResult({ success: false, message: data.error || 'Verification failed' });
          toast.error(data.error);
        }
      } catch (err: any) {
        console.error('Scan error:', err);
        setLastResult({ success: false, message: err.message || 'Invalid QR code' });
        toast.error(err.message || 'Invalid QR code');
      } finally {
        setProcessing(false);
        // Restart scanning after 2 seconds
        setTimeout(() => {
          setScanning(true);
          setLastResult(null);
        }, 2000);
      }
    }
  };

  if (!ready || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return null; // Will redirect via useEffect
  }

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

        <div className="bg-black rounded-xl overflow-hidden aspect-square relative">
          {scanning ? (
            <BarcodeScanner
              onUpdate={handleUpdate}
              onError={(err) => console.error('Scanner error:', err)}
              facingMode="environment"
              width="100%"
              height="100%"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              {processing ? (
                <Loader2 className="h-12 w-12 animate-spin text-white" />
              ) : lastResult ? (
                <div className="text-center p-4">
                  {lastResult.success ? (
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                  )}
                  <p className="text-white font-medium">{lastResult.message}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-4">
          Position the QR code inside the frame to scan
        </p>
      </div>
    </div>
  );
}