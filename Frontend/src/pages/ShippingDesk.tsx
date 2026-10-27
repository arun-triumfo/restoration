import { Printer, Search, Truck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { Button } from '../components/ui/Button'

type Rate = { service: string; name: string; days: number; amount: number; currency: string }
type Shipment = Record<string, unknown> & { awb?: string; labelUrl?: string; status?: string }

function uploadsUrl(path?: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = api.base.replace(/\/api\/?$/, '')
  return `${base}${path}`
}

export function ShippingDesk() {
  const [carrier, setCarrier] = useState('SHIPROCKET')
  const [weightKg, setWeightKg] = useState('5')
  const [fromZip, setFromZip] = useState('221001')
  const [toZip, setToZip] = useState('08817')
  const [orderId, setOrderId] = useState('')
  const [service, setService] = useState('FEDEX_GROUND')
  const [rates, setRates] = useState<Rate[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [trackAwb, setTrackAwb] = useState('')
  const [trackResult, setTrackResult] = useState<Shipment | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadShipments = useCallback(async () => {
    try {
      const res = await api.shipping.list()
      setShipments(res.data as Shipment[])
    } catch {
      /* ignore on first paint */
    }
  }, [])

  useEffect(() => {
    loadShipments()
  }, [loadShipments])

  const quote = async () => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await api.shipping.rates({
        carrier,
        weightKg: Number(weightKg) || 5,
        fromZip,
        toZip,
      })
      setRates(res.rates)
      if (res.rates[0]) setService(res.rates[0].service)
      setMsg(`${res.carrierLabel}: ${res.rates.length} rates (${res.mode || 'sandbox'})`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Quote failed')
    } finally {
      setBusy(false)
    }
  }

  const buy = async () => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await api.shipping.buyLabel({
        carrier,
        service,
        weightKg: Number(weightKg) || 5,
        fromZip,
        toZip,
        orderId: orderId || undefined,
      })
      setMsg(`Label ${res.shipment.awb} — open print link`)
      setTrackAwb(String(res.shipment.awb || ''))
      await loadShipments()
      if (res.shipment.labelUrl) window.open(uploadsUrl(res.shipment.labelUrl), '_blank')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Buy label failed')
    } finally {
      setBusy(false)
    }
  }

  const track = async () => {
    if (!trackAwb.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.shipping.track(trackAwb.trim())
      setTrackResult(res.shipment as Shipment)
      setMsg(`Tracking ${res.shipment.awb}: ${res.shipment.status}`)
      await loadShipments()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Track failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          P4 · Courier desk
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Shipping · Rate → Label → Track</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Shiprocket, Aramex, ShipGlobal, FedEx and DHL in sandbox mode. Labels save under{' '}
          <code>/uploads/labels</code>. Live AWBs switch on once courier API access is connected
          in Integrations.
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

      <div className="grid gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:grid-cols-2">
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Carrier
          <select
            value={carrier}
            onChange={(e) => {
              setCarrier(e.target.value)
              setRates([])
            }}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          >
            <option value="SHIPROCKET">Shiprocket (sandbox)</option>
            <option value="ARAMEX">Aramex (sandbox)</option>
            <option value="SHIPGLOBAL">ShipGlobal (sandbox)</option>
            <option value="FEDEX">FedEx (sandbox)</option>
            <option value="DHL">DHL (sandbox)</option>
          </select>
        </label>
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Weight (kg)
          <input
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)]">
          From ZIP
          <input
            value={fromZip}
            onChange={(e) => setFromZip(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)]">
          To ZIP
          <input
            value={toZip}
            onChange={(e) => setToZip(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)] sm:col-span-2">
          Order ID (optional)
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="ORD-…"
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={quote}>
            <Truck className="h-3.5 w-3.5" /> Get rates
          </Button>
          <Button type="button" variant="primary" disabled={busy || !rates.length} onClick={buy}>
            <Printer className="h-3.5 w-3.5" /> Buy label & print
          </Button>
        </div>
      </div>

      {rates.length ? (
        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Select service</h2>
          <ul className="mt-2 space-y-2">
            {rates.map((r) => (
              <li key={r.service}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-3 py-2 hover:bg-[var(--bg-elevated)]">
                  <input
                    type="radio"
                    name="svc"
                    checked={service === r.service}
                    onChange={() => setService(r.service)}
                  />
                  <span className="flex-1 text-sm font-semibold text-[var(--text-main)]">{r.name}</span>
                  <span className="text-[12px] text-[var(--text-dim)]">{r.days}d</span>
                  <span className="font-mono text-sm font-bold text-[var(--text-main)]">
                    {r.currency} {r.amount}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <h2 className="text-sm font-bold text-[var(--text-main)]">Track AWB</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={trackAwb}
            onChange={(e) => setTrackAwb(e.target.value)}
            placeholder="SR… / AX… / SG… / FX… / JD…"
            className="h-10 min-w-[12rem] flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-main)]"
          />
          <Button type="button" variant="secondary" disabled={busy} onClick={track}>
            <Search className="h-3.5 w-3.5" /> Track
          </Button>
        </div>
        {trackResult?.events && Array.isArray(trackResult.events) ? (
          <ul className="mt-3 space-y-1 text-[12px] text-[var(--text-muted)]">
            {(trackResult.events as { at?: string; description?: string }[]).map((e, i) => (
              <li key={i}>
                <span className="font-mono text-[var(--text-dim)]">
                  {e.at ? new Date(e.at).toLocaleString() : ''}
                </span>{' '}
                — {e.description}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-sm font-bold text-[var(--text-main)]">
          Recent shipments ({shipments.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase text-[var(--text-dim)]">
              <tr>
                <th className="px-3 py-2">AWB</th>
                <th className="px-3 py-2">Carrier</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Label</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={String(s.awb)} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text-main)]">{s.awb}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{String(s.carrier || '')}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{String(s.status || '')}</td>
                  <td className="px-3 py-2">
                    {s.labelUrl ? (
                      <a
                        href={uploadsUrl(String(s.labelUrl))}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-indigo-600 no-underline dark:text-indigo-300"
                      >
                        Print
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
