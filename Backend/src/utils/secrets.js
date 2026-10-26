import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function keyBuf() {
  const raw = process.env.SECRETS_KEY || process.env.JWT_SECRET || 'rugos-dev-secret-change-me'
  return crypto.createHash('sha256').update(String(raw)).digest()
}

/** Encrypt a string for DB storage (integration API keys). */
export function encryptSecret(plain) {
  if (plain == null || plain === '') return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, keyBuf(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptSecret(blob) {
  if (!blob || typeof blob !== 'string') return ''
  if (!blob.startsWith('v1:')) return blob // legacy plain (dev only)
  const [, ivB64, tagB64, dataB64] = blob.split(':')
  const decipher = crypto.createDecipheriv(ALGO, keyBuf(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function maskSecret(plain) {
  const s = String(plain || '')
  if (s.length <= 4) return '••••'
  return `${'•'.repeat(Math.min(12, s.length - 4))}${s.slice(-4)}`
}
