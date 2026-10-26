import { Link2, Play, PlugZap, Unplug } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, type IntegrationConnection } from '../api/client'
import { Button } from '../components/ui/Button'

const CHANNELS = [
  { id: 'shopify', label: 'Shopify', hint: 'Admin API token + shop domain' },
  { id: 'amazon', label: 'Amazon SP-API', hint: 'Seller / LWA credentials (sandbox sync)' },
  { id: 'etsy', label: 'Etsy', hint: 'Optional sandbox channel' },
]

export function IntegrationsHub() {
  const [rows, setRows] = useState<IntegrationConnection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [forms, setForms] = useState<Record<string, { apiKey: string; shopDomain: string }>>({
    shopify: { apiKey: '', shopDomain: '' },
    amazon: { apiKey: '', shopDomain: '' },
    etsy: { apiKey: '', shopDomain: '' },
  })

  const load = useCallback(async () => {
    try {
      const res = await api.integrations.list()
      setRows(res.data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load integrations')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const byChannel = Object.fromEntries(rows.map((r) => [r.channel, r]))

  const run = async (channel: string, action: 'connect' | 'test' | 'sync' | 'disconnect') => {
    setBusy(`${channel}:${action}`)
    setError(null)
    setMsg(null)
    try {
      if (action === 'connect') {
        const f = forms[channel] || { apiKey: '', shopDomain: '' }
        const res = await api.integrations.connect(channel, {
          apiKey: f.apiKey || `sandbox-${channel}-key`,
          shopDomain: f.shopDomain || undefined,
          mode: 'sandbox',
        })
        setMsg(res.message || 'Connected')
      } else if (action === 'test') {
        const res = await api.integrations.test(channel)
        setMsg(res.message || 'OK')
      } else if (action === 'sync') {
        const res = await api.integrations.sync(channel)
        setMsg(
          res.message ||
            `Imported ${res.imported || 0} orders${res.orderIds?.length ? `: ${res.orderIds.join(', ')}` : ''}`,
        )
      } else {
        const res = await api.integrations.disconnect(channel)
        setMsg(res.message || 'Disconnected')
      }
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          P3 · Marketplace connectors
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Integrations</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Credentials tenant-scoped + encrypted. Connect → Test → Sync now (sandbox orders into Order
          Pipeline). Live Shopify OAuth / Amazon SP-API follow.
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

      <div className="space-y-3">
        {CHANNELS.map((ch) => {
          const row = byChannel[ch.id]
          const connected = row?.status === 'connected'
          const f = forms[ch.id] || { apiKey: '', shopDomain: '' }
          return (
            <article
              key={ch.id}
              className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                    <PlugZap className="h-4 w-4 text-indigo-500" />
                    {ch.label}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{ch.hint}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                    Status:{' '}
                    <span className="font-semibold text-[var(--text-main)]">
                      {row?.status || 'disconnected'}
                    </span>
                    {row?.lastSyncAt ? ` · Last sync ${new Date(row.lastSyncAt).toLocaleString()}` : ''}
                    {row?.secretHint ? ` · Key ${row.secretHint}` : ''}
                  </p>
                  {row?.lastError ? (
                    <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{row.lastError}</p>
                  ) : null}
                </div>
              </div>

              {!connected ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="API key / access token"
                    value={f.apiKey}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [ch.id]: { ...f, apiKey: e.target.value },
                      }))
                    }
                    className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-main)]"
                  />
                  <input
                    placeholder={ch.id === 'amazon' ? 'Seller / marketplace id' : 'shop.myshopify.com'}
                    value={f.shopDomain}
                    onChange={(e) =>
                      setForms((prev) => ({
                        ...prev,
                        [ch.id]: { ...f, shopDomain: e.target.value },
                      }))
                    }
                    className="h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-main)]"
                  />
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {!connected ? (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={busy !== null}
                    onClick={() => run(ch.id, 'connect')}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Connect
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy !== null}
                      onClick={() => run(ch.id, 'test')}
                    >
                      Test
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      disabled={busy !== null}
                      onClick={() => run(ch.id, 'sync')}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Sync now
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy !== null}
                      onClick={() => run(ch.id, 'disconnect')}
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
