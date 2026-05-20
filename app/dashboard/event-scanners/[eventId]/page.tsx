//app/dashboard/event-scanners/[eventId]/page.tsx

'use client';

import { useState, useEffect, Suspense, lazy, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const LoadingSpinner = dynamic(() => 
  import('@/components/common/LoadingSpinner').then(mod => ({ default: mod.LoadingSpinner })),
  { ssr: false }
);

// Memoized Scanner List component to prevent unnecessary re-renders
const ScannerList = memo(({ scanners, onRemove, saving }: { 
  scanners: string[]; 
  onRemove: (email: string) => void; 
  saving: boolean;
}) => {
  if (scanners.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No scanners added yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {scanners.map((email) => (
        <div
          key={email}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
          <button
            onClick={() => onRemove(email)}
            disabled={saving}
            className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors p-1"
            aria-label={`Remove scanner ${email}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
});

ScannerList.displayName = 'ScannerList';

// Email input validation with debounce
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Main component with Suspense for lazy loading
export default function EventScannersPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="Loading scanner management..." />}>
      <EventScannersContent />
    </Suspense>
  );
}

function EventScannersContent() {
  const { eventId } = useParams();
  const router = useRouter();
  const { getAccessToken, authenticated, ready, user } = usePrivy();
  const [scanners, setScanners] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Debounced email for validation
  const debouncedEmail = useDebouncedValue(newEmail, 300);
  const isValidEmail = useMemo(() => {
    return debouncedEmail.includes('@') && debouncedEmail.includes('.');
  }, [debouncedEmail]);

  // Fetch event details and scanners in parallel
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error('Please login to manage scanners');
      router.push('/');
      return;
    }
    
    // Parallel fetching for better performance
    const fetchData = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          toast.error('Authentication failed. Please refresh the page.');
          setLoading(false);
          return;
        }

        // Fetch both event details and scanners in parallel
        const [eventRes, scannersRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/scanners`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        // Process event data
        if (eventRes.ok) {
          const eventData = await eventRes.json();
          if (eventData.success) {
            setEventTitle(eventData.event.title);
          }
        }

        // Process scanners data
        if (scannersRes.ok) {
          const scannersData = await scannersRes.json();
          setScanners(scannersData.scanners || []);
        } else if (scannersRes.status === 401) {
          toast.error('Session expired. Please refresh the page.');
        } else {
          const err = await scannersRes.json();
          toast.error(err.error || 'Failed to load scanners');
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Network error. Please check your connection.');
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
      }
    };

    fetchData();
  }, [eventId, ready, authenticated, getAccessToken, router]);

  // Memoized add scanner function
  const addScanner = useCallback(async () => {
    if (!isValidEmail) {
      toast.error('Enter a valid email address');
      return;
    }

    if (!authenticated || !ready) {
      toast.error('Please wait, still loading...');
      return;
    }

    setSaving(true);
    const token = await getAccessToken();
    if (!token) {
      toast.error('Authentication token missing. Please refresh the page.');
      setSaving(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`/api/events/${eventId}/scanners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newEmail }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setScanners(data.scanners || []);
        setNewEmail('');
        toast.success('Scanner added successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add scanner');
      }
    } catch (error: any) {
      console.error('Add scanner error:', error);
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Network error. Please check your connection.');
      }
    } finally {
      setSaving(false);
    }
  }, [newEmail, isValidEmail, authenticated, ready, getAccessToken, eventId]);

  // Memoized remove scanner function
  const removeScanner = useCallback(async (email: string) => {
    if (!authenticated || !ready) return;

    setSaving(true);
    const token = await getAccessToken();
    if (!token) {
      toast.error('Authentication failed');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/scanners`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        setScanners(data.scanners || []);
        toast.success('Scanner removed successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to remove scanner');
      }
    } catch (error) {
      console.error('Remove scanner error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [authenticated, ready, getAccessToken, eventId]);

  // Handle enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidEmail && !saving) {
      addScanner();
    }
  }, [isValidEmail, saving, addScanner]);

  // Loading state
  if (isInitialLoad && loading) {
    return <LoadingSpinner fullScreen text="Loading scanner management..." />;
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back button with better UX */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6 group"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        {/* Main card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">Scanner Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Event: <span className="font-semibold">{eventTitle || 'Loading...'}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Add email addresses of staff who will scan tickets at this event.
            </p>

            {/* Add scanner form */}
            <div className="flex gap-2 mb-6">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter scanner's email address"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                disabled={saving}
                autoComplete="off"
              />
              <button
                onClick={addScanner}
                disabled={saving || !isValidEmail}
                className="btn-primary flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
            </div>

            {/* Scanner list header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Authorized Scanners</h3>
              {scanners.length > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {scanners.length} {scanners.length === 1 ? 'scanner' : 'scanners'}
                </span>
              )}
            </div>

            {/* Scanner list with memoized component */}
            <ScannerList 
              scanners={scanners} 
              onRemove={removeScanner} 
              saving={saving} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Import memo from React
import { memo } from 'react';