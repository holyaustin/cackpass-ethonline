//app/dashboard/event-scanners/[eventId]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, ArrowLeft, Loader2 } from 'lucide-react';

export default function EventScannersPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { getAccessToken, authenticated, ready, user } = usePrivy();
  const [scanners, setScanners] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error('Please login to manage scanners');
      router.push('/');
      return;
    }
    fetchEventDetails();
    fetchScanners();
  }, [eventId, ready, authenticated]);

  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEventTitle(data.event.title);
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    }
  };

  const fetchScanners = async () => {
    if (!authenticated || !ready) return;
    const token = await getAccessToken();
    if (!token) {
      toast.error('Authentication failed. Please refresh the page.');
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/scanners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setScanners(data.scanners || []);
      } else if (res.status === 401) {
        toast.error('Session expired. Please refresh the page.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to load scanners');
      }
    } catch (error) {
      console.error('Failed to fetch scanners:', error);
      toast.error('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const addScanner = async () => {
    if (!newEmail.includes('@')) {
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

    console.log('Adding scanner:', newEmail, 'Event ID:', eventId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
  };

  const removeScanner = async (email: string) => {
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
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Scanner Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Event: <span className="font-semibold">{eventTitle}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Add email addresses of staff who will scan tickets at this event.
          </p>

          <div className="flex gap-2 mb-6">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter scanner's email address"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              disabled={saving}
            />
            <button
              onClick={addScanner}
              disabled={saving || !newEmail}
              className="btn-primary flex items-center gap-2 px-4 py-2 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold mb-3">Authorized Scanners</h3>
            {scanners.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No scanners added yet.
              </p>
            ) : (
              scanners.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{email}</span>
                  </div>
                  <button
                    onClick={() => removeScanner(email)}
                    disabled={saving}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}