export type WhKey = 'india' | 'usa'

export type BinLocation = {
  zone: string
  aisle: string
  rack: string
  bin: string
  note: string
  photoUrl: string
}

export function emptyLoc(): BinLocation {
  return { zone: '', aisle: '', rack: '', bin: '', note: '', photoUrl: '' }
}

function str(v: unknown) {
  return v == null ? '' : String(v).trim()
}

export function locOf(sku: Record<string, unknown> | undefined, wh: WhKey): BinLocation {
  if (!sku) return emptyLoc()
  const nested = (sku.locations as Record<string, Record<string, unknown>> | undefined)?.[wh] || {}
  return {
    zone: str(nested.zone || sku[`${wh}Zone`]),
    aisle: str(nested.aisle || sku[`${wh}Aisle`]),
    rack: str(nested.rack || sku[`${wh}Rack`]),
    bin: str(nested.bin || sku[`${wh}Bin`]),
    note: str(nested.note || sku[`${wh}LocationNote`] || sku[`${wh}Note`]),
    photoUrl: str(nested.photoUrl || sku[`${wh}LocationPhotoUrl`] || sku[`${wh}PhotoUrl`]),
  }
}

export function hasLoc(loc: BinLocation) {
  return Boolean(loc.zone || loc.aisle || loc.rack || loc.bin)
}

export function pickPath(loc: BinLocation, warehouseLabel: string) {
  const bits = [
    warehouseLabel,
    loc.zone ? `Zone ${loc.zone}` : '',
    loc.aisle ? `Aisle ${loc.aisle}` : '',
    loc.rack ? `Rack ${loc.rack}` : '',
    loc.bin ? `Bin ${loc.bin}` : '',
  ].filter(Boolean)
  if (bits.length <= 1) return `${warehouseLabel} · location not set`
  return bits.join(' · ')
}

export function locationsFromForm(form: Record<string, string>) {
  return {
    india: {
      zone: form.indiaZone || '',
      aisle: form.indiaAisle || '',
      rack: form.indiaRack || '',
      bin: form.indiaBin || '',
      note: form.indiaNote || '',
      photoUrl: form.indiaPhotoUrl || '',
    },
    usa: {
      zone: form.usaZone || '',
      aisle: form.usaAisle || '',
      rack: form.usaRack || '',
      bin: form.usaBin || '',
      note: form.usaNote || '',
      photoUrl: form.usaPhotoUrl || '',
    },
  }
}

export function flattenLocToForm(sku: Record<string, unknown>): Record<string, string> {
  const i = locOf(sku, 'india')
  const u = locOf(sku, 'usa')
  return {
    indiaZone: i.zone,
    indiaAisle: i.aisle,
    indiaRack: i.rack,
    indiaBin: i.bin,
    indiaNote: i.note,
    indiaPhotoUrl: i.photoUrl,
    usaZone: u.zone,
    usaAisle: u.aisle,
    usaRack: u.rack,
    usaBin: u.bin,
    usaNote: u.note,
    usaPhotoUrl: u.photoUrl,
  }
}

export function locationsFromCsv(row: Record<string, string>) {
  return {
    india: {
      zone: row.indiaZone || '',
      aisle: row.indiaAisle || '',
      rack: row.indiaRack || '',
      bin: row.indiaBin || '',
      note: row.indiaLocationNote || row.indiaNote || '',
      photoUrl: row.indiaLocationPhotoUrl || '',
    },
    usa: {
      zone: row.usaZone || '',
      aisle: row.usaAisle || '',
      rack: row.usaRack || '',
      bin: row.usaBin || '',
      note: row.usaLocationNote || row.usaNote || '',
      photoUrl: row.usaLocationPhotoUrl || '',
    },
  }
}

export function mediaUrl(raw: unknown, apiBase: string) {
  const s = str(raw).trim()
  if (!s || s === 'null' || s === 'undefined' || s === '-') return ''
  if (/^(https?:|data:|blob:)/i.test(s)) return s
  const origin = apiBase.replace(/\/api\/?$/, '')
  return `${origin}${s.startsWith('/') ? s : `/${s}`}`
}

/** Hide broken /uploads paths (Render disk resets wipe files after redeploy). */
export function isUsablePhotoUrl(raw: unknown, apiBase: string) {
  return Boolean(mediaUrl(raw, apiBase))
}

export const CSV_LOCATION_HEADERS = [
  'indiaZone',
  'indiaAisle',
  'indiaRack',
  'indiaBin',
  'indiaLocationNote',
  'indiaLocationPhotoUrl',
  'usaZone',
  'usaAisle',
  'usaRack',
  'usaBin',
  'usaLocationNote',
  'usaLocationPhotoUrl',
] as const
