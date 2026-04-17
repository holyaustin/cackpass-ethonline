'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, ArrowLeft, Loader2 } from 'lucide-react';

interface Scanner {
  email: string;
}

export default function EventScannersPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [scanners, setScanners] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    fetchEventDetails();
    fetchScanners();
  }, [eventId]);

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
    const token = await getAccessToken();
    try {
      const res = await fetch(`/api/events/${eventId}/scanners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setScanners(data.scanners || []);
      }
    } catch (error) {
      console.error('Failed to fetch scanners:', error);
      toast.error('Failed to load scanners');
    } finally {
      setLoading(false);
    }
  };

  const addScanner = async () => {
    if (!newEmail.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }

    setSaving(true);
    const token = await getAccessToken();
    try {
      const res = await fetch(`/api/events/${eventId}/scanners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newEmail }),
      });

      if (res.ok) {
        toast.success('Scanner added successfully');
        setNewEmail('');
        fetchScanners();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add scanner');
      }
    } catch (error) {
      console.error('Add scanner error:', error);
      toast.error('Failed to add scanner');
    } finally {
      setSaving(false);
    }
  };

  const removeScanner = async (email: string) => {
    setSaving(true);
    const token = await getAccessToken();
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
        toast.success('Scanner removed successfully');
        fetchScanners();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to remove scanner');
      }
    } catch (error) {
      console.error('Remove scanner error:', error);
      toast.error('Failed to remove scanner');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
            These users will be able to access the scanner page for this event.
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
                No scanners added yet. Add email addresses above.
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