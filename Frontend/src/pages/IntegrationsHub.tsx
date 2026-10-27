import { CreditCard, Link2, Play, PlugZap, Save, Truck, Unplug } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  api,
  ApiError,
  type IntegrationCatalogItem,
  type IntegrationConnection,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

const KIND_META = {
  billing: { label: 'Payments', Icon: CreditCard },
  courier: { label: 'Couriers', Icon: Truck },
  marketplace: { label: 'Marketplaces', Icon: PlugZap },
} as const

export function IntegrationsHub() {
  const { user } = useAuth()
  const canWrite = user?.roleCode === 'super_admin' || Boolean(user?.permissions?.actions?.includes('write'))
  const [catalog, setCatalog] = useState<IntegrationCatalogItem[]>([])
  const [rows, setRows] = useState<IntegrationConnection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({})
  const [mode, setMode] = useState<Record<string, 'live' | 'sandbox'>>({})

  const load = useCallback(async () => {
    const res = await api.integrations.list()
    setCatalog(res.catalog || [])
    setRows(res.data)
    setMode((prev) => {
      const next = { ...prev }
      for (const r of res.data) {
        if (!next[r.channel]) {
          next[r.channel] =
            r.status === 'connected' || r.status === 'error'
              ? r.mode === 'sandbox'
                ? 'sandbox'
                : 'live'
              : 'live'
        }
      }
      return next
    })
  }, [])

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load integrations'))
  }, [load])

  const byChannel = Object.fromEntries(rows.map((r) => [r.channel, r]))

  const setField = (channel: string, key: string, value: string) =>
    setForms((prev) => ({ ...prev, [channel]: { ...(prev[channel] || {}), [key]: value } }))

  const run = async (
    ch: IntegrationCatalogItem,
    action: 'save' | 'test' | 'sync' | 'disconnect',
  ) => {
    setBusy(`${ch.id}:${action}`)
    setError(null)
    setMsg(null)
    try {
      if (action === 'save') {
        const fields = { ...(forms[ch.id] || {}) }
        const res = await api.integrations.connect(ch.id, {
          mode: mode[ch.id] || 'live',
          fields,
        })
        setForms((prev) => ({ ...prev, [ch.id]: {} }))
        setMsg(res.message || 'Saved')
      } else if (action === 'test') {
        const res = await api.integrations.test(ch.id)
        setMsg(res.message || 'OK')
      } else if (action === 'sync') {
        const res = await api.integrations.sync(ch.id)
        setMsg(
          res.message ||
            `Imported ${res.imported || 0} orders${res.orderIds?.length ? `: ${res.orderIds.join(', ')}` : ''}`,
        )
      } else {
        const res = await api.integrations.disconnect(ch.id)
        setMsg(res.message || 'Disconnected')
      }
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed')
      await load().catch(() => {})
    } finally {
      setBusy(null)
    }
  }

  const inputCls =
    'mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]'

  const renderChannel = (ch: IntegrationCatalogItem) => {
    const row = byChannel[ch.id]
    const connected = row?.status === 'connected' || row?.status === 'error'
        const currentMode =
          mode[ch.id] ||
          (row?.status === 'connected' || row?.status === 'error'
            ? row?.mode === 'sandbox'
              ? 'sandbox'
              : 'live'
            : 'live')
    const f = forms[ch.id] || {}
    const KindIcon = KIND_META[ch.kind].Icon
    return (
      <article
        key={ch.id}
        className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2 font-bold text-[var(--text-main)]">
          <KindIcon className="h-4 w-4 text-indigo-500" />
          {ch.label}
          {connected ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                row?.status === 'error'
                  ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                  : currentMode === 'live'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-dim)]'
              }`}
            >
              {row?.status === 'error' ? 'error' : currentMode}
            </span>
          ) : (
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-dim)]">
              not saved
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{ch.hint}</p>
        <p className="mt-1 text-[11px] text-[var(--text-dim)]">
          {row?.lastVerifiedAt ? `Verified ${new Date(row.lastVerifiedAt).toLocaleString()} · ` : ''}
          {row?.lastSyncAt ? `Last sync ${new Date(row.lastSyncAt).toLocaleString()}` : ''}
        </p>
        {row?.lastError ? (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{row.lastError}</p>
        ) : null}

        {canWrite ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ch.fields.map((field) => {
              const filled = row?.fields?.[field.key]
              return (
                <label key={field.key} className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
                  {field.label}
                  {field.required ? ' *' : ''}
                  <input
                    type={field.secret ? 'password' : 'text'}
                    autoComplete="off"
                    placeholder={
                      filled?.filled
                        ? filled.hint || 'saved — paste to replace'
                        : field.placeholder || field.label
                    }
                    value={f[field.key] ?? ''}
                    onChange={(e) => setField(ch.id, field.key, e.target.value)}
                    className={inputCls}
                  />
                </label>
              )
            })}
            <label className="block text-[11px] font-bold uppercase text-[var(--text-dim)]">
              Mode
              <select
                value={currentMode}
                onChange={(e) =>
                  setMode((prev) => ({ ...prev, [ch.id]: e.target.value as 'live' | 'sandbox' }))
                }
                className={inputCls}
              >
                <option value="live">Live — ping real API on save</option>
                <option value="sandbox">Sandbox — demo data until keys are ready</option>
              </select>
            </label>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--text-dim)]">Only Super Admin can save keys.</p>
        )}

        {canWrite ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="primary" disabled={busy !== null} onClick={() => run(ch, 'save')}>
              {connected ? <Save className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {connected ? 'Save keys' : 'Save & connect'}
            </Button>
            {connected ? (
              <>
                <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => run(ch, 'test')}>
                  Test
                </Button>
                {ch.kind === 'marketplace' ? (
                  <Button type="button" variant="primary" disabled={busy !== null} onClick={() => run(ch, 'sync')}>
                    <Play className="h-3.5 w-3.5" />
                    Sync now
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => run(ch, 'disconnect')}
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </article>
    )
  }

  const kinds = (['billing', 'courier', 'marketplace'] as const).filter((k) =>
    catalog.some((c) => c.kind === k),
  )

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          Connectors
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Integrations</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Paste Restoration keys here. They are stored encrypted and never shown again. Live mode
          tests the real API on save — as soon as Test succeeds, Sync / Shipping Desk / Billing
          checkout use that account.
        </p>
      </header>

      {msg ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {msg}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {kinds.map((kind) => (
        <section key={kind} className="space-y-3">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            {KIND_META[kind].label}
          </h2>
          {catalog.filter((c) => c.kind === kind).map(renderChannel)}
        </section>
      ))}
    </div>
  )
}
