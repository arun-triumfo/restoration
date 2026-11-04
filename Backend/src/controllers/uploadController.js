import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ALLOWED = new Set(['inventory-locations', 'warehouse-photos'])

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export async function uploadPhoto(req, res) {
  try {
    const folder = String(req.body?.folder || 'inventory-locations').trim()
    if (!ALLOWED.has(folder)) {
      return res.status(400).json({ success: false, message: 'Invalid upload folder' })
    }
    const dataUrl = String(req.body?.photoDataUrl || '')
    if (!dataUrl.startsWith('data:image')) {
      return res.status(400).json({ success: false, message: 'photoDataUrl (data:image/…) is required' })
    }
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid image data URL' })
    }
    const mime = match[1]
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    const key = String(req.body?.key || 'photo')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 40) || 'photo'
    const dir = path.resolve(__dirname, `../../uploads/${folder}`)
    ensureDir(dir)
    const fileName = `${key}-${Date.now()}.${ext}`
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(match[2], 'base64'))
    const url = `/uploads/${folder}/${fileName}`
    res.status(201).json({ success: true, url, folder, fileName })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
