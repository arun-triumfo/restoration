import { Camera, PackageCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, type ResourceRow } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

const WH = new Set(['super_admin', 'india_wh', 'usa_wh', 'logistics'])

export function PackingStation() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<ResourceRow[]>([])
  const [orderId, setOrderId] = useState('')
  const [scannedSku, setScannedSku] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.packing.queue()
      setQueue(res.data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Queue failed')
    }
  }, [])

  useEffect(() => {
    if (WH.has(String(user?.roleCode))) load()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [user?.roleCode, load])

  if (!WH.has(String(user?.roleCode))) {
    return (
      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-muted)]">
        Packing station is for India WH / USA WH / Logistics / Super Admin only.
      </div>
    )
  }

  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError('Camera not available — you can still pack without a photo.')
    }
  }

  const snap = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.7))
  }

  const confirm = async () => {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const res = await api.packing.confirm({
        orderId,
        scannedSku,
        photoDataUrl: photoDataUrl || undefined,
      })
      setMsg(res.message || 'Packed')
      setScannedSku('')
      setPhotoDataUrl(null)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Pack failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          P4 · Packing station
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Scan · Photo · Confirm</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Wrong SKU scan is blocked. Photo proof stored under <code>/uploads/packing</code>.
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

      <div className="grid gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Order ID
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            list="pack-orders"
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
          <datalist id="pack-orders">
            {queue.map((o) => (
              <option key={String(o.orderId)} value={String(o.orderId)} />
            ))}
          </datalist>
        </label>
        <label className="text-[11px] font-bold uppercase text-[var(--text-dim)]">
          Scan SKU / barcode
          <input
            value={scannedSku}
            onChange={(e) => setScannedSku(e.target.value)}
            autoComplete="off"
            className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm font-normal normal-case text-[var(--text-main)]"
          />
        </label>

        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-black/80">
          <video ref={videoRef} className="mx-auto max-h-56 w-full object-contain" muted playsInline />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={startCamera}>
            <Camera className="h-3.5 w-3.5" /> Start camera
          </Button>
          <Button type="button" variant="secondary" onClick={snap}>
            Snap photo
          </Button>
          <Button type="button" variant="primary" disabled={busy || !orderId || !scannedSku} onClick={confirm}>
            <PackageCheck className="h-3.5 w-3.5" /> Confirm packed
          </Button>
        </div>
        {photoDataUrl ? (
          <img src={photoDataUrl} alt="Pack proof" className="max-h-40 rounded-lg object-contain" />
        ) : null}
      </div>

      <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4">
        <h2 className="text-sm font-bold text-[var(--text-main)]">Queue ({queue.length})</h2>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[12px]">
          {queue.map((o) => (
            <li key={String(o.orderId)}>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-[var(--bg-elevated)]"
                onClick={() => {
                  setOrderId(String(o.orderId || ''))
                  setScannedSku(String(o.sku || ''))
                }}
              >
                <span className="font-mono font-semibold text-[var(--text-main)]">{String(o.orderId)}</span>{' '}
                <span className="text-[var(--text-muted)]">
                  {String(o.sku || '')} · {String(o.status || '')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
