// app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import Link from 'next/link'
import {
  Shield, ArrowLeft, Loader2, AlertCircle, Activity,
  ShieldOff, ShieldCheck, Users, FileText, Play,
  RefreshCw, Database, Mail, CheckCircle, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const PERMISSIONS = {
  VIEW_ANCHORS:      'view:anchors',
  RUN_ANCHOR:        'run:anchor',
  VIEW_PAYMENTS:     'view:payments',
  PAUSE_CONTRACT:    'contract:pause',
  UNPAUSE_CONTRACT:  'contract:unpause',
  MANAGE_ADMINS:     'admins:manage',
  VIEW_AUDIT_LOG:    'audit:view',
  REINDEX_DB:        'db:reindex',
  PURGE_OLD_PAYMENTS:'db:purge',
  SEND_TEST_EMAIL:   'email:test',
}

export default function AdminPage() {
  const router = useRouter()
  const { authenticated, ready } = usePrivy()

  const [admin, setAdmin] = useState<{
    email: string
    isSuperAdmin: boolean
    permissions: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      if (!ready) return
      if (!authenticated) {
        router.push('/')
        return
      }

      // Get token
      let t = ''
      if (typeof window !== 'undefined') {
        t = await (window as any).privy?.getAccessToken?.() || ''
        setToken(t)
      }

      try {
        const res = await fetch('/api/admin/me', {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
        })
        const data = await res.json()
        if (!data.isAdmin) {
          toast.error('You are not an admin')
          router.push('/dashboard')
          return
        }
        setAdmin({
          email: data.email,
          isSuperAdmin: data.isSuperAdmin,
          permissions: data.permissions,
        })
      } catch (e) {
        toast.error('Failed to load admin state')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ready, authenticated, router])

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const can = (p: string) => admin.permissions.includes(p)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Admin Panel
                {admin.isSuperAdmin && (
                  <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                    SUPER ADMIN
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Signed in as {admin.email}
              </p>
            </div>
          </div>
        </div>

        {/* Panels grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {can(PERMISSIONS.VIEW_ANCHORS) && (
            <ContractStatusPanel token={token} canPause={can(PERMISSIONS.PAUSE_CONTRACT)} canUnpause={can(PERMISSIONS.UNPAUSE_CONTRACT)} />
          )}
          {can(PERMISSIONS.RUN_ANCHOR) && (
            <AnchorPanel token={token} />
          )}
          {can(PERMISSIONS.MANAGE_ADMINS) && (
            <AdminsPanel token={token} isSuperAdmin={admin.isSuperAdmin} />
          )}
          {can(PERMISSIONS.VIEW_AUDIT_LOG) && (
            <AuditLogPanel token={token} />
          )}
          {can(PERMISSIONS.REINDEX_DB) && (
            <ReindexPanel token={token} />
          )}
          {can(PERMISSIONS.SEND_TEST_EMAIL) && (
            <TestEmailPanel token={token} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Panels — each one is small and self-contained
// ─────────────────────────────────────────────────────────────

function ContractStatusPanel({ token, canPause, canUnpause }: { token: string; canPause: boolean; canUnpause: boolean }) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/contract/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setStatus(data)
    } catch {
      toast.error('Failed to load contract status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Contract Status</h2>
        <button onClick={load} className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {loading && !status ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : status ? (
        <div className="space-y-2 text-sm">
          <Row label="Address" value={`${status.address?.slice(0, 10)}…`} mono />
          <Row label="Owner" value={`${status.owner?.slice(0, 10)}…`} mono />
          <Row label="Processor" value={`${status.processor?.slice(0, 10)}…`} mono />
          <Row label="Total Batches" value={String(status.totalBatches)} />
          <Row label="Paused" value={status.paused ? 'Yes' : 'No'} badge={status.paused ? 'red' : 'green'} />
        </div>
      ) : null}
    </div>
  )
}

function AnchorPanel({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/anchors/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setResult(data)
      if (data.anchored) toast.success(`Anchored ${data.recordCount} records`)
      else toast.info(data.reason || 'Anchor not needed')
    } catch {
      toast.error('Anchor run failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Anchor Batcher</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Triggers the fiat anchor pipeline. Runs only if the cadence (50 records / 7 days) is met.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="btn-primary px-4 py-2 w-full flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {busy ? 'Running…' : 'Run Anchor Now'}
      </button>
      {result && (
        <pre className="mt-4 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

function AdminsPanel({ token, isSuperAdmin }: { token: string; isSuperAdmin: boolean }) {
  const [admins, setAdmins] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/admins', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setAdmins(data.admins || [])
  }

  useEffect(() => { if (isSuperAdmin) load() }, [isSuperAdmin])

  const add = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, permissions }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Admin granted')
      setEmail(''); setPermissions([])
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (targetEmail: string) => {
    if (!confirm(`Revoke admin for ${targetEmail}?`)) return
    const res = await fetch(`/api/admin/admins?email=${encodeURIComponent(targetEmail)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) { toast.success('Revoked'); load() }
    else toast.error('Failed to revoke')
  }

  if (!isSuperAdmin) return null

  return (
    <div className="card rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Admin Management</h2>
      </div>

      {/* Add */}
      <div className="space-y-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <input
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field w-full"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(PERMISSIONS).map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={permissions.includes(p)}
                onChange={(e) => {
                  setPermissions((prev) =>
                    e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                  )
                }}
              />
              {p}
            </label>
          ))}
        </div>
        <button
          onClick={add}
          disabled={loading || !email}
          className="btn-primary px-4 py-2"
        >
          {loading ? 'Granting…' : 'Grant Admin'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.email} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="font-mono text-sm">{a.email}</div>
              <div className="text-xs text-gray-500">{(a.permissions || []).length} permissions</div>
            </div>
            <button
              onClick={() => remove(a.email)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Revoke
            </button>
          </div>
        ))}
        {admins.length === 0 && <p className="text-sm text-gray-500">No admins yet.</p>}
      </div>
    </div>
  )
}

function AuditLogPanel({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/admin/audit-log?limit=50', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
  }, [token])

  return (
    <div className="card rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Audit Log (Last 50)</h2>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.map((l) => (
          <div key={l._id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            {l.success ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
            <div className="flex-1">
              <div><span className="font-mono text-xs">{l.actorEmail}</span> → <strong>{l.action}</strong> {l.target && `on ${l.target}`}</div>
              <div className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-gray-500">No actions yet.</p>}
      </div>
    </div>
  )
}

function ReindexPanel({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/db/reindex', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      toast.success(`Indexes checked: ${data.summary || 'done'}`)
    } catch {
      toast.error('Reindex failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Database Housekeeping</h2>
      </div>
      <button onClick={run} disabled={busy} className="btn-primary px-4 py-2 w-full">
        {busy ? 'Running…' : 'Ensure Indexes'}
      </button>
    </div>
  )
}

function TestEmailPanel({ token }: { token: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email }),
      })
      if (res.ok) toast.success('Test email sent')
      else toast.error('Failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Email Test</h2>
      </div>
      <input
        type="email"
        placeholder="test@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-field w-full mb-3"
      />
      <button onClick={send} disabled={busy || !email} className="btn-primary px-4 py-2 w-full">
        {busy ? 'Sending…' : 'Send Test Email'}
      </button>
    </div>
  )
}

function Row({ label, value, mono, badge }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      {badge ? (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          badge === 'red' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>{value}</span>
      ) : (
        <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
      )}
    </div>
  )
}