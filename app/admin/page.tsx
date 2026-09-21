// app/admin/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import {
  Shield, ArrowLeft, Loader2, Activity, ShieldOff, ShieldCheck,
  Users, FileText, Play, RefreshCw, Database, CheckCircle, XCircle,
  LogIn, BarChart3, TrendingUp, DollarSign, Ticket, Save,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const PERMISSIONS = {
  VIEW_ANCHORS: 'view:anchors',
  RUN_ANCHOR: 'run:anchor',
  VIEW_PAYMENTS: 'view:payments',
  PAUSE_CONTRACT: 'contract:pause',
  UNPAUSE_CONTRACT: 'contract:unpause',
  UPDATE_OWNER: 'contract:update-owner',
  UPDATE_PROCESSOR: 'contract:update-processor',
  MANAGE_ADMINS: 'admins:manage',
  VIEW_AUDIT_LOG: 'audit:view',
  REINDEX_DB: 'db:reindex',
  VIEW_ANALYTICS: 'view:analytics',
} as const

function getWalletAddress(user: any): string | null {
  if (!user) return null
  if (user.wallet?.address) return user.wallet.address
  const linked = user.linkedAccounts || []
  for (const a of linked) {
    if (a.type === 'wallet' && a.address) return a.address
  }
  return null
}

export default function AdminPage() {
  const router = useRouter()
  const { user, authenticated, ready, login } = usePrivy()

  const [admin, setAdmin] = useState<{
    email: string
    isSuperAdmin: boolean
    permissions: string[]
  } | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Extract wallet from Privy user
  useEffect(() => {
    if (authenticated && ready && user) {
      setWalletAddress(getWalletAddress(user))
    }
  }, [authenticated, ready, user])

  // Admin resolution with fail-safe timeout
  useEffect(() => {
    if (!ready) return

    if (!authenticated) {
      setLoading(false)
      return
    }

    if (!walletAddress) {
      // Wallet address hasn't been resolved yet — give it 3s, then fail safe
      const t = setTimeout(() => {
        if (!walletAddress) {
          toast.error('Could not resolve your wallet address')
          router.push('/dashboard')
        }
      }, 3000)
      return () => clearTimeout(t)
    }

    let cancelled = false

    const load = async () => {
      try {
        const adminRes = await fetch(
          `/api/admin/me?walletAddress=${encodeURIComponent(walletAddress)}`
        )
        const adminData = await adminRes.json()

        if (cancelled) return

        if (!adminData.isAdmin) {
          router.push('/dashboard')
          return
        }

        setAdmin({
          email: adminData.email || '',
          isSuperAdmin: !!adminData.isSuperAdmin,
          permissions: adminData.permissions || [],
        })
      } catch (e) {
        if (!cancelled) router.push('/dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [ready, authenticated, walletAddress, router])

  // Loading
  if (!ready || (authenticated && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not signed in — prompt
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full card rounded-2xl p-8 text-center">
          <LogIn className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Admin Access</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in first so we can verify your admin access.
          </p>
          <button onClick={() => login()} className="btn-primary px-6 py-3 w-full">
            Sign In
          </button>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Signed in but not yet verified as admin → show a card, don't spin forever
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full card rounded-2xl p-8 text-center">
          <ShieldOff className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You are not authorized to view this page.
          </p>
          <Link href="/dashboard" className="btn-primary px-6 py-3 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const can = (p: string) => admin.permissions.includes(p)
  const authQS = `walletAddress=${encodeURIComponent(walletAddress || '')}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" /> Back to Dashboard
          </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {can(PERMISSIONS.VIEW_ANALYTICS) && <AnalyticsPanel authQS={authQS} />}

          {can(PERMISSIONS.VIEW_ANCHORS) && (
            <ContractPanel
              authQS={authQS}
              canPause={can(PERMISSIONS.PAUSE_CONTRACT)}
              canUnpause={can(PERMISSIONS.UNPAUSE_CONTRACT)}
              canUpdateOwner={can(PERMISSIONS.UPDATE_OWNER)}
              canUpdateProcessor={can(PERMISSIONS.UPDATE_PROCESSOR)}
              canViewPayments={can(PERMISSIONS.VIEW_PAYMENTS)}
              isSuperAdmin={admin.isSuperAdmin}
            />
          )}

          {/* Anchor + Reindex side by side (each is a half card) */}
          {can(PERMISSIONS.RUN_ANCHOR) && <AnchorPanel authQS={authQS} />}
          {can(PERMISSIONS.REINDEX_DB) && <ReindexPanel authQS={authQS} />}

          {can(PERMISSIONS.MANAGE_ADMINS) && (
            <AdminsPanel authQS={authQS} isSuperAdmin={admin.isSuperAdmin} />
          )}
          {can(PERMISSIONS.VIEW_AUDIT_LOG) && <AuditLogPanel authQS={authQS} />}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────
function AnalyticsPanel({ authQS }: { authQS: string }) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}&${authQS}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [authQS, period])

  useEffect(() => { load() }, [load])

  return (
    <div className="card rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Analytics</h2>
        <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ml-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard icon={<Users className="h-5 w-5" />} label="Active Users" value={data.activeUsers ?? 0} period={period} />
            <MetricCard icon={<Ticket className="h-5 w-5" />} label="Tickets Sold" value={data.ticketsSold ?? 0} period={period} />
            <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Payments" value={data.paymentsCount ?? 0} period={period} />
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              label="USDC Markup Accrued"
              value={`${Number(data.usdcMarkupAccrued ?? 0).toFixed(4)} USDC`}
              period={period}
              highlight
            />
          </div>
          {data.trend?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Period</th>
                    <th className="py-2 px-3 font-semibold text-right">Users</th>
                    <th className="py-2 px-3 font-semibold text-right">Tickets</th>
                    <th className="py-2 px-3 font-semibold text-right">USDC Markup</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((row: any) => (
                    <tr key={row.label} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3">{row.label}</td>
                      <td className="py-2 px-3 text-right">{row.users}</td>
                      <td className="py-2 px-3 text-right">{row.tickets}</td>
                      <td className="py-2 px-3 text-right font-mono">{Number(row.usdcMarkup).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function MetricCard({ icon, label, value, period, highlight }: any) {
  return (
    <div className={`rounded-xl p-4 ${
      highlight
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
        : 'bg-gray-50 dark:bg-gray-800'
    }`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-400 mt-1">per {period}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Contract Panel
// ─────────────────────────────────────────────────────────────
function ContractPanel({
  authQS, canPause, canUnpause, canUpdateOwner, canUpdateProcessor, canViewPayments,
}: {
  authQS: string
  canPause: boolean
  canUnpause: boolean
  canUpdateOwner: boolean
  canUpdateProcessor: boolean
  canViewPayments: boolean
  isSuperAdmin: boolean
}) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newOwner, setNewOwner] = useState('')
  const [newProcessor, setNewProcessor] = useState('')

  const [lookupPaymentId, setLookupPaymentId] = useState('')
  const [paymentResult, setPaymentResult] = useState<any>(null)
  const [lookupBatchId, setLookupBatchId] = useState('')
  const [batchResult, setBatchResult] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/contract/status?${authQS}`)
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Failed to load contract status')
      setStatus(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const pause = async () => {
    if (!confirm('Pause the registry? All writes will revert.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/contract/pause?${authQS}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Contract paused')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const unpause = async () => {
    if (!confirm('Resume the registry? Writes will be accepted again.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/contract/unpause?${authQS}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Contract unpaused')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const updateOwner = async () => {
    if (!newOwner.match(/^0x[a-fA-F0-9]{40}$/)) { toast.error('Invalid address'); return }
    if (!confirm(`Set platform owner to ${newOwner}?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/contract/update-owner?${authQS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwner }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Owner updated')
      setNewOwner('')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const updateProcessor = async () => {
    if (!newProcessor.match(/^0x[a-fA-F0-9]{40}$/)) { toast.error('Invalid address'); return }
    if (!confirm(`Set payment processor to ${newProcessor}?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/contract/update-processor?${authQS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newProcessor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Processor updated')
      setNewProcessor('')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  const lookupPayment = async () => {
    setPaymentResult(null)
    try {
      const res = await fetch(`/api/admin/contract/payment?id=${encodeURIComponent(lookupPaymentId)}&${authQS}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPaymentResult(data.payment)
    } catch (e: any) { toast.error(e.message) }
  }

  const lookupBatch = async () => {
    setBatchResult(null)
    try {
      const res = await fetch(`/api/admin/contract/anchor?id=${encodeURIComponent(lookupBatchId)}&${authQS}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBatchResult(data.anchor)
    } catch (e: any) { toast.error(e.message) }
  }

  const show = (v: any, fallback = '—') =>
    v === undefined || v === null || v === '' ? fallback : String(v)

  return (
    <div className="card rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Contract Status</h2>
        <button onClick={load} className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300 mb-4 flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !status ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Contract Address</div>
              <div className="font-mono text-xs break-all">
                {status?.address ? status.address : <span className="text-red-500">Not configured</span>}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div className={`font-semibold ${status?.paused ? 'text-red-600' : 'text-green-600'}`}>
                {status?.paused ? 'Paused' : 'Active'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Platform Owner</div>
              <div className="font-mono text-xs break-all">{show(status?.owner)}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Payment Processor</div>
              <div className="font-mono text-xs break-all">{show(status?.processor)}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Total Anchored Batches</div>
              <div className="text-2xl font-bold">{show(status?.totalBatches, '0')}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Network</div>
              <div className="font-semibold">Arc Mainnet</div>
            </div>
          </div>

          {/* Pause / Unpause */}
          <div className="flex flex-wrap gap-2 mb-6">
            {status && !status.paused && canPause && (
              <button onClick={pause} disabled={busy}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                <ShieldOff className="h-4 w-4" /> Pause Contract
              </button>
            )}
            {status && status.paused && canUnpause && (
              <button onClick={unpause} disabled={busy}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4" /> Unpause Contract
              </button>
            )}
            {status?.address && (
              <a href={`https://explorer.arc.io/address/${status.address}`} target="_blank" rel="noreferrer"
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                View on ArcScan ↗
              </a>
            )}
          </div>

          {/* Update Owner */}
          {canUpdateOwner && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
              <label className="block text-xs font-semibold mb-2 text-amber-900 dark:text-amber-300">
                Update Platform Owner (cold wallet)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="0x..."
                  className="input-field flex-1 text-xs font-mono"
                />
                <button onClick={updateOwner} disabled={busy || !newOwner} className="btn-primary px-4 py-2 text-sm flex items-center gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>
          )}

          {/* Update Processor */}
          {canUpdateProcessor && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
              <label className="block text-xs font-semibold mb-2 text-amber-900 dark:text-amber-300">
                Update Payment Processor (backend hot wallet)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProcessor}
                  onChange={(e) => setNewProcessor(e.target.value)}
                  placeholder="0x..."
                  className="input-field flex-1 text-xs font-mono"
                />
                <button onClick={updateProcessor} disabled={busy || !newProcessor} className="btn-primary px-4 py-2 text-sm flex items-center gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>
          )}

          {/* Lookups */}
          {canViewPayments && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div>
                <label className="block text-xs font-semibold mb-2">Lookup Payment</label>
                <div className="flex gap-2">
                  <input type="text" value={lookupPaymentId}
                    onChange={(e) => setLookupPaymentId(e.target.value)}
                    placeholder="paymentId (bytes32)"
                    className="input-field flex-1 text-xs font-mono" />
                  <button onClick={lookupPayment} disabled={!lookupPaymentId}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50">
                    Lookup
                  </button>
                </div>
                {paymentResult && (
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(paymentResult, null, 2)}
                  </pre>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">Lookup Anchor Batch</label>
                <div className="flex gap-2">
                  <input type="text" value={lookupBatchId}
                    onChange={(e) => setLookupBatchId(e.target.value)}
                    placeholder="batchId (bytes32)"
                    className="input-field flex-1 text-xs font-mono" />
                  <button onClick={lookupBatch} disabled={!lookupBatchId}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50">
                    Lookup
                  </button>
                </div>
                {batchResult && (
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(batchResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Anchor Panel
// ─────────────────────────────────────────────────────────────
function AnchorPanel({ authQS }: { authQS: string }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/anchors/run?${authQS}`, { method: 'POST' })
      const data = await res.json()
      setResult(data)
      if (data.anchored) toast.success(`Anchored ${data.recordCount} records`)
      else toast.info(data.reason || 'Anchor not needed')
    } catch { toast.error('Anchor run failed') } finally { setBusy(false) }
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
      <button onClick={run} disabled={busy}
        className="btn-primary px-4 py-2 w-full flex items-center justify-center gap-2">
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

// ─────────────────────────────────────────────────────────────
// Admins Panel
// ─────────────────────────────────────────────────────────────
function AdminsPanel({ authQS, isSuperAdmin }: { authQS: string; isSuperAdmin: boolean }) {
  const [admins, setAdmins] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/admin/admins?${authQS}`)
    const data = await res.json()
    setAdmins(data.admins || [])
  }

  useEffect(() => { if (isSuperAdmin) load() /* eslint-disable-next-line */ }, [isSuperAdmin])

  const add = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/admins?${authQS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permissions }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Admin granted')
      setEmail(''); setPermissions([]); load()
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  const remove = async (targetEmail: string) => {
    if (!confirm(`Revoke admin for ${targetEmail}?`)) return
    const res = await fetch(`/api/admin/admins?email=${encodeURIComponent(targetEmail)}&${authQS}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Revoked'); load() } else toast.error('Failed to revoke')
  }

  if (!isSuperAdmin) return null

  return (
    <div className="card rounded-2xl p-6 lg:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Admin Management</h2>
      </div>

      <div className="space-y-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <input type="email" placeholder="admin@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} className="input-field w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(PERMISSIONS).map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={permissions.includes(p)}
                onChange={(e) => setPermissions((prev) => e.target.checked ? [...prev, p] : prev.filter((x) => x !== p))} />
              {p}
            </label>
          ))}
        </div>
        <button onClick={add} disabled={loading || !email} className="btn-primary px-4 py-2">
          {loading ? 'Granting…' : 'Grant Admin'}
        </button>
      </div>

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.email} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="font-mono text-sm">{a.email}</div>
              <div className="text-xs text-gray-500">{(a.permissions || []).length} permissions</div>
            </div>
            <button onClick={() => remove(a.email)} className="text-red-600 hover:text-red-800 text-sm">Revoke</button>
          </div>
        ))}
        {admins.length === 0 && <p className="text-sm text-gray-500">No admins yet.</p>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Audit Log Panel
// ─────────────────────────────────────────────────────────────
function AuditLogPanel({ authQS }: { authQS: string }) {
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/admin/audit-log?limit=50&${authQS}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
    // eslint-disable-next-line
  }, [])

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

// ─────────────────────────────────────────────────────────────
// Reindex Panel
// ─────────────────────────────────────────────────────────────
function ReindexPanel({ authQS }: { authQS: string }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/db/reindex?${authQS}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Indexes checked: ${data.summary || 'done'}`)
    } catch (e: any) { toast.error(e.message || 'Reindex failed') } finally { setBusy(false) }
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