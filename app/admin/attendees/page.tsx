// app/admin/attendees/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import {
  ArrowLeft,
  FileJson,
  FileSpreadsheet,
  FileText,
  Users,
  Mail,
  Wallet,
  Phone,
  Loader2,
  AlertCircle,
  Ticket,
  Filter,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  SendHorizontal,
  Square,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface EventOption {
  _id: string
  title: string
  startDate: string
  endDate: string
  startDateTime?: string
  endDateTime?: string
  status: string
  isActive: boolean
}

interface Attendee {
  buyerId: string
  name: string
  email: string
  walletAddress: string
  phoneNumber: string
  ticketCount: number
  ticketNumbers: string[]
  ticketIds: string[]
  ticketType: string
  paymentMethod: string
  paymentStatus: string
  totalPaid: number
  currency: string
  purchaseDate: string
  reference: string
  status: string
  emailSent: boolean
  emailSentAt: string | null
}

type EventFilter = 'all' | 'upcoming' | 'past'

// ─────────────────────────────────────────────────────────────
// Wallet extraction from Privy user
// ─────────────────────────────────────────────────────────────
function getWalletAddress(user: any): string | null {
  if (!user) return null
  if (user.wallet?.address) return user.wallet.address
  const linked = user.linkedAccounts || []
  for (const a of linked) {
    if (a.type === 'wallet' && a.address) return a.address
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function AdminAttendeesPage() {
  const router = useRouter()
  const { user, authenticated, ready } = usePrivy()

  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const [events, setEvents] = useState<EventOption[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [eventFilter, setEventFilter] = useState<EventFilter>('all')

  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [totalTickets, setTotalTickets] = useState(0)
  const [eventTitle, setEventTitle] = useState('')

  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendingRef, setResendingRef] = useState<string | null>(null)

  // ── Resend-all state ──
  const [forceResendAll, setForceResendAll] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const [bulkFailures, setBulkFailures] = useState<
    Array<{ email: string; reason: string }>
  >([])
  const bulkCancelRef = useRef(false)

  // ── Resolve wallet address ──
  useEffect(() => {
    if (authenticated && ready && user) {
      setWalletAddress(getWalletAddress(user))
    }
  }, [authenticated, ready, user])

  // ── Permission check (view:attendees) ──
  useEffect(() => {
    if (!ready) return
    if (!authenticated) {
      setAuthorized(false)
      return
    }
    if (!walletAddress) return

    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch(
          `/api/admin/me?walletAddress=${encodeURIComponent(walletAddress)}`
        )
        const data = await res.json()
        if (cancelled) return

        const hasAccess =
          !!data.isAdmin &&
          Array.isArray(data.permissions) &&
          data.permissions.includes('view:attendees')

        setAuthorized(hasAccess)
        if (!hasAccess) router.push('/dashboard')
      } catch {
        if (!cancelled) {
          setAuthorized(false)
          router.push('/dashboard')
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [ready, authenticated, walletAddress, router])

  // ── Fetch events ──
  useEffect(() => {
    if (!authorized || !walletAddress) return

    const load = async () => {
      setLoadingEvents(true)
      try {
        const res = await fetch(
          `/api/events?limit=200&dateType=all&page=1&walletAddress=${encodeURIComponent(
            walletAddress
          )}`
        )
        const data = await res.json()
        if (!res.ok || !data.success)
          throw new Error(data.error || 'Failed to load events')
        setEvents(data.events || [])
      } catch (e: any) {
        toast.error(e.message || 'Failed to load events')
      } finally {
        setLoadingEvents(false)
      }
    }

    load()
  }, [authorized, walletAddress])

  // ── Filter events ──
  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events
    const now = new Date()
    return events.filter((ev) => {
      const end = ev.endDateTime
        ? new Date(ev.endDateTime)
        : new Date(ev.endDate)
      if (eventFilter === 'upcoming') return end > now
      if (eventFilter === 'past') return end <= now
      return true
    })
  }, [events, eventFilter])

  useEffect(() => {
    if (
      selectedEventId &&
      !filteredEvents.some((e) => e._id === selectedEventId)
    ) {
      setSelectedEventId('')
      setAttendees([])
      setEventTitle('')
    }
  }, [filteredEvents, selectedEventId])

  // ── Fetch attendees ──
  const fetchAttendees = useCallback(async (eventId: string) => {
    if (!eventId) return
    setLoadingAttendees(true)
    setError(null)
    setAttendees([])
    setTotalTickets(0)

    try {
      const res = await fetch(`/api/events/${eventId}/attendees`)

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Server returned non-JSON response (status ${res.status})`
        )
      }

      const data = await res.json()
      if (!res.ok || !data.success)
        throw new Error(data.error || 'Failed to load attendees')

      setAttendees(data.attendees || [])
      setTotalTickets(data.totalTickets || 0)
    } catch (e: any) {
      setError(e.message || 'Failed to load attendees')
      toast.error(e.message || 'Failed to load attendees')
    } finally {
      setLoadingAttendees(false)
    }
  }, [])

  useEffect(() => {
    const current = filteredEvents.find((e) => e._id === selectedEventId)
    if (current) setEventTitle(current.title)
    if (selectedEventId) fetchAttendees(selectedEventId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, fetchAttendees])

  // ── Helpers ──
  const canEmail = (a: Attendee) =>
    !!a.email && a.email.includes('@') && !!a.reference

  const targetBuyers = useMemo(() => {
    if (forceResendAll) return attendees.filter(canEmail)
    return attendees.filter((a) => canEmail(a) && !a.emailSent)
  }, [attendees, forceResendAll])

  // ── Single resend ──
  const resendEmail = useCallback(
    async (attendee: Attendee) => {
      if (!selectedEventId) {
        toast.error('No event selected')
        return
      }
      if (!walletAddress) {
        toast.error('Wallet address not available')
        return
      }
      if (!canEmail(attendee)) {
        toast.error('No valid email or reference on record')
        return
      }
      if (resendingRef) return

      const confirmed = window.confirm(
        `Resend ticket email to ${attendee.email}?\n\nBuyer: ${attendee.name}\nTickets: ${attendee.ticketCount}`
      )
      if (!confirmed) return

      setResendingRef(attendee.reference)
      const loadingToastId = toast.loading(`Sending to ${attendee.email}…`)

      try {
        const res = await fetch('/api/admin/attendees/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEventId,
            reference: attendee.reference,
            walletAddress,
          }),
        })

        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          throw new Error(`Server returned non-JSON response (${res.status})`)
        }

        const data = await res.json()
        toast.dismiss(loadingToastId)

        if (!res.ok || !data.success) {
          throw new Error(data.error || `Resend failed (${res.status})`)
        }

        toast.success(`Email resent to ${data.to}`)

        setAttendees((prev) =>
          prev.map((a) =>
            a.reference === attendee.reference
              ? {
                  ...a,
                  emailSent: true,
                  emailSentAt: data.resentAt || new Date().toISOString(),
                }
              : a
          )
        )
      } catch (e: any) {
        toast.dismiss(loadingToastId)
        toast.error(e.message || 'Failed to resend email')
      } finally {
        setResendingRef(null)
      }
    },
    [selectedEventId, walletAddress, resendingRef]
  )

  // ── Resend ALL ──
  const resendAll = useCallback(async () => {
    if (!selectedEventId || !walletAddress) {
      toast.error('Missing event or wallet')
      return
    }
    if (bulkRunning) return

    const targets = targetBuyers

    if (targets.length === 0) {
      toast.info('No buyers to send to')
      return
    }

    const confirmMsg = forceResendAll
      ? `Force-resend the ticket email to ALL ${targets.length} buyer(s)?\n\nThis will send to everyone, even those already marked as sent.`
      : `Resend the ticket email to ${targets.length} buyer(s) who haven't received it yet?`

    if (!window.confirm(confirmMsg)) return

    bulkCancelRef.current = false
    setBulkRunning(true)
    setBulkProgress({ done: 0, total: targets.length })
    setBulkFailures([])

    let okCount = 0
    let failCount = 0
    const failures: Array<{ email: string; reason: string }> = []

    const summaryToastId = toast.loading(
      `Sending 0 of ${targets.length}…`
    )

    try {
      for (let i = 0; i < targets.length; i++) {
        if (bulkCancelRef.current) {
          toast.dismiss(summaryToastId)
          toast.info(
            `Cancelled after ${i} of ${targets.length}. ${okCount} sent, ${failCount} failed.`
          )
          break
        }

        const buyer = targets[i]

        try {
          const res = await fetch('/api/admin/attendees/resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: selectedEventId,
              reference: buyer.reference,
              walletAddress,
            }),
          })

          const contentType = res.headers.get('content-type') || ''
          if (!contentType.includes('application/json')) {
            throw new Error(`Non-JSON response (${res.status})`)
          }

          const data = await res.json()
          if (!res.ok || !data.success) {
            throw new Error(data.error || `HTTP ${res.status}`)
          }

          okCount++

          // Flip row locally
          setAttendees((prev) =>
            prev.map((a) =>
              a.reference === buyer.reference
                ? {
                    ...a,
                    emailSent: true,
                    emailSentAt:
                      data.resentAt || new Date().toISOString(),
                  }
                : a
            )
          )
        } catch (e: any) {
          failCount++
          failures.push({
            email: buyer.email,
            reason: e.message || 'Unknown error',
          })
        }

        setBulkProgress({ done: i + 1, total: targets.length })

        toast.loading(
          `Sending ${i + 1} of ${targets.length}… (${okCount} ok, ${failCount} failed)`,
          { id: summaryToastId }
        )
      }

      toast.dismiss(summaryToastId)

      setBulkFailures(failures)

      if (failCount === 0) {
        toast.success(
          `All ${okCount} email${okCount !== 1 ? 's' : ''} sent successfully.`
        )
      } else if (okCount === 0) {
        toast.error(
          `All ${failCount} email${failCount !== 1 ? 's' : ''} failed.`
        )
      } else {
        toast.warning(
          `${okCount} sent, ${failCount} failed. See failure list below.`
        )
      }
    } finally {
      setBulkRunning(false)
      bulkCancelRef.current = false
    }
  }, [selectedEventId, walletAddress, targetBuyers, forceResendAll, bulkRunning])

  const cancelBulk = useCallback(() => {
    bulkCancelRef.current = true
    toast.info('Stopping after the current email completes…')
  }, [])

  // ── Export helpers (unchanged) ──
  const buildFilename = (ext: string) => {
    const safeTitle = (eventTitle || 'event')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
    const stamp = new Date().toISOString().slice(0, 10)
    return `attendees-${safeTitle}-${stamp}.${ext}`
  }

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const escapeCSV = (val: any) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const escapeHtml = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const exportJSON = () => {
    try {
      const payload = {
        eventId: selectedEventId,
        eventTitle,
        exportedAt: new Date().toISOString(),
        total: attendees.length,
        totalTickets,
        attendees,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      triggerDownload(blob, buildFilename('json'))
      toast.success('JSON exported')
    } catch {
      toast.error('Failed to export JSON')
    }
  }

  const exportExcel = () => {
    try {
      const headers = [
        'Name', 'Email', 'Wallet Address', 'Phone',
        'Ticket Type', 'Ticket Count', 'Ticket Numbers',
        'Total Paid', 'Currency', 'Payment Method', 'Payment Status',
        'Reference', 'Purchase Date', 'Ticket Status',
        'Email Sent', 'Email Sent At',
      ]

      const rows = attendees.map((a) => [
        a.name, a.email, a.walletAddress, a.phoneNumber,
        a.ticketType, a.ticketCount, a.ticketNumbers.join(' | '),
        a.totalPaid, a.currency, a.paymentMethod, a.paymentStatus,
        a.reference, new Date(a.purchaseDate).toLocaleString(), a.status,
        a.emailSent ? 'Yes' : 'No',
        a.emailSentAt ? new Date(a.emailSentAt).toLocaleString() : '',
      ])

      const csv = [
        headers.map(escapeCSV).join(','),
        ...rows.map((r) => r.map(escapeCSV).join(',')),
      ].join('\n')

      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      })
      triggerDownload(blob, buildFilename('csv'))
      toast.success('Excel (CSV) exported')
    } catch {
      toast.error('Failed to export Excel')
    }
  }

  const exportPDF = () => {
    try {
      const safeTitle = escapeHtml(eventTitle || 'Event')
      const generatedAt = new Date().toLocaleString()
      const filenameTitle = (eventTitle || 'Event')
        .replace(/[\\/:*?"<>|]/g, '')
        .trim()

      const rowsHtml = attendees
        .map(
          (a) => `
            <tr>
              <td>${escapeHtml(a.name)}</td>
              <td>${escapeHtml(a.email)}</td>
              <td style="text-align:center">${a.ticketCount}</td>
              <td style="text-align:right">${a.totalPaid.toLocaleString()} ${escapeHtml(a.currency)}</td>
              <td>${escapeHtml(a.paymentMethod)}</td>
              <td>${a.emailSent ? 'Sent' : 'Not sent'}</td>
              <td>${escapeHtml(a.reference)}</td>
              <td>${new Date(a.purchaseDate).toLocaleString()}</td>
            </tr>`
        )
        .join('')

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>${filenameTitle} - Attendees</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 24px; color: #111; }
            h1 { margin: 0 0 4px 0; color: #D95427; font-size: 20px; }
            .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f5f5f5; color: #333; font-weight: 700; }
            tr:nth-child(even) td { background: #fafafa; }
            @media print { body { margin: 8mm; } table { font-size: 10px; } tr { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <h1>${safeTitle} — Attendees</h1>
          <div class="meta">
            Total buyers: <strong>${attendees.length}</strong> ·
            Total tickets: <strong>${totalTickets}</strong> ·
            Generated: ${generatedAt}
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Qty</th>
                <th>Total Paid</th><th>Method</th><th>Email</th>
                <th>Reference</th><th>Purchase Date</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
        </html>
      `

      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.style.visibility = 'hidden'
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) {
        document.body.removeChild(iframe)
        toast.error('Failed to prepare PDF')
        return
      }

      doc.open()
      doc.write(html)
      doc.close()
      if (doc.title !== `${filenameTitle} - Attendees`) {
        doc.title = `${filenameTitle} - Attendees`
      }

      const triggerPrint = () => {
        try {
          const win = iframe.contentWindow
          if (!win) throw new Error('No iframe window')
          win.focus()
          win.print()
          toast.success(
            `PDF ready — save as "${filenameTitle} - Attendees.pdf"`
          )
        } catch {
          toast.error('Failed to open print dialog')
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe)
          }, 2000)
        }
      }

      if (doc.readyState === 'complete') {
        setTimeout(triggerPrint, 300)
      } else {
        iframe.onload = () => setTimeout(triggerPrint, 300)
      }
    } catch {
      toast.error('Failed to export PDF')
    }
  }

  // ── Auth gates ──
  if (!ready || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!authorized) return null

  const filterLabel: Record<EventFilter, string> = {
    all: 'All events',
    upcoming: 'Upcoming / Live',
    past: 'Past events',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Admin
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Event Attendees</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Browse buyers, payment details, discount codes and email
                delivery
              </p>
            </div>
          </div>

          {/* Filter + Event picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filter events
              </label>
              <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                {(['all', 'upcoming', 'past'] as EventFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEventFilter(f)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      eventFilter === f
                        ? 'bg-primary text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {filterLabel[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Select event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={loadingEvents}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-primary
                           disabled:opacity-60"
              >
                <option
                  value=""
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {loadingEvents
                    ? 'Loading events…'
                    : filteredEvents.length === 0
                    ? 'No events in this filter'
                    : '— Choose an event —'}
                </option>
                {filteredEvents.map((ev) => {
                  const date = ev.startDate
                    ? new Date(ev.startDate).toLocaleDateString()
                    : ''
                  return (
                    <option
                      key={ev._id}
                      value={ev._id}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {ev.title} {date ? `— ${date}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Stats + Export + Resend All */}
          {selectedEventId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total Buyers</p>
                <p className="text-2xl font-bold">{attendees.length}</p>
              </div>
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">Total Tickets</p>
                <p className="text-2xl font-bold">{totalTickets}</p>
              </div>
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">Email Status</p>
                <p className="text-sm">
                  <span className="text-green-600 font-semibold">
                    {attendees.filter((a) => a.emailSent).length}
                  </span>{' '}
                  sent ·{' '}
                  <span className="text-red-600 font-semibold">
                    {attendees.filter((a) => !a.emailSent && canEmail(a)).length}
                  </span>{' '}
                  pending
                </p>
              </div>
              <div className="card rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-2">Export</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportExcel}
                    disabled={attendees.length === 0}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Excel
                  </button>
                  <button
                    onClick={exportJSON}
                    disabled={attendees.length === 0}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FileJson className="h-3.5 w-3.5" />
                    JSON
                  </button>
                  <button
                    onClick={exportPDF}
                    disabled={attendees.length === 0}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Resend All toolbar ── */}
          {selectedEventId && attendees.length > 0 && (
            <div className="card rounded-2xl p-4 mt-4 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <SendHorizontal className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      Bulk Email Resend
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {forceResendAll ? (
                        <>
                          Will send to all{' '}
                          <strong>{targetBuyers.length}</strong> buyers with a
                          valid email.
                        </>
                      ) : (
                        <>
                          Will send to{' '}
                          <strong>{targetBuyers.length}</strong> buyer
                          {targetBuyers.length !== 1 ? 's' : ''} who haven't
                          received the email yet.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceResendAll}
                      onChange={(e) => setForceResendAll(e.target.checked)}
                      disabled={bulkRunning}
                    />
                    Force resend to everyone
                  </label>

                  {!bulkRunning ? (
                    <button
                      onClick={resendAll}
                      disabled={targetBuyers.length === 0}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      Resend All ({targetBuyers.length})
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <span>
                          {bulkProgress.done} / {bulkProgress.total}
                        </span>
                      </div>
                      <button
                        onClick={cancelBulk}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {bulkRunning && bulkProgress.total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          (bulkProgress.done / bulkProgress.total) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Failure list after a bulk run */}
          {bulkFailures.length > 0 && (
            <div className="card rounded-2xl p-4 mt-4 border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-red-800 dark:text-red-300">
                    {bulkFailures.length} email
                    {bulkFailures.length !== 1 ? 's' : ''} failed
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    These buyers can be retried individually from the Actions
                    column below.
                  </p>
                </div>
                <button
                  onClick={() => setBulkFailures([])}
                  className="text-xs text-red-700 dark:text-red-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {bulkFailures.map((f, i) => (
                  <div
                    key={`${f.email}-${i}`}
                    className="text-xs flex justify-between gap-3 py-1"
                  >
                    <span className="font-mono">{f.email}</span>
                    <span className="text-red-700 dark:text-red-400 text-right">
                      {f.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {!selectedEventId ? (
          <div className="text-center py-20 card rounded-2xl">
            <Ticket className="h-14 w-14 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select an event</h3>
            <p className="text-gray-500">
              Choose an event above to see its attendees.
            </p>
          </div>
        ) : loadingAttendees ? (
          <div className="text-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-500">Loading attendees…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchAttendees(selectedEventId)}
              className="btn-primary px-6 py-3"
            >
              Retry
            </button>
          </div>
        ) : attendees.length === 0 ? (
          <div className="text-center py-20 card rounded-2xl">
            <Ticket className="h-14 w-14 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No attendees yet</h3>
            <p className="text-gray-500">
              Ticket buyers will appear here once they complete a purchase.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto card rounded-2xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Buyer</th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Contact
                    </th>
                    <th className="text-center px-4 py-3 font-semibold">
                      Email Sent
                    </th>
                    <th className="text-center px-4 py-3 font-semibold">Qty</th>
                    <th className="text-right px-4 py-3 font-semibold">Paid</th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Method
                    </th>
                    <th className="text-left px-4 py-3 font-semibold">
                      Purchased
                    </th>
                    <th className="text-right px-4 py-3 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr
                      key={a.buyerId || a.email || a.reference}
                      className="border-b last:border-b-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.name}</div>
                        {a.walletAddress && (
                          <div className="text-xs text-gray-500 font-mono">
                            {a.walletAddress.slice(0, 6)}…
                            {a.walletAddress.slice(-4)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="truncate max-w-[200px]">
                              {a.email}
                            </span>
                          </div>
                        )}
                        {a.phoneNumber && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            {a.phoneNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.emailSent ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium"
                            title={
                              a.emailSentAt
                                ? `Sent ${new Date(
                                    a.emailSentAt
                                  ).toLocaleString()}`
                                : 'Sent'
                            }
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
                            <XCircle className="h-3 w-3" />
                            Not sent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {a.ticketCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.totalPaid.toLocaleString()} {a.currency}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {a.paymentMethod || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(a.purchaseDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => resendEmail(a)}
                          disabled={
                            resendingRef === a.reference ||
                            !a.email ||
                            bulkRunning
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            a.email
                              ? 'Resend ticket email'
                              : 'No email on record'
                          }
                        >
                          {resendingRef === a.reference ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Resend
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {attendees.map((a) => (
                <div
                  key={a.buyerId || a.email || a.reference}
                  className="card rounded-2xl p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{a.name}</div>
                      {a.email && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {a.email}
                        </div>
                      )}
                      {a.walletAddress && (
                        <div className="text-xs text-gray-400 font-mono">
                          <Wallet className="inline h-3 w-3 mr-1" />
                          {a.walletAddress.slice(0, 6)}…
                          {a.walletAddress.slice(-4)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{a.ticketCount}</div>
                      <div className="text-xs text-gray-500">
                        ticket{a.ticketCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Paid:</span>
                      <span className="font-medium">
                        {a.totalPaid.toLocaleString()} {a.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method:</span>
                      <span className="capitalize">
                        {a.paymentMethod || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span>{new Date(a.purchaseDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Email:</span>
                      {a.emailSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
                          <XCircle className="h-3 w-3" />
                          Not sent
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => resendEmail(a)}
                    disabled={
                      resendingRef === a.reference || !a.email || bulkRunning
                    }
                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                  >
                    {resendingRef === a.reference ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Resend Email
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}