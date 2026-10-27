export async function httpJson(url, { method = 'GET', headers = {}, body, timeout = 20000, raw = false } = {}) {
  const payload =
    body == null || typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)
  const res = await fetch(url, {
    method,
    headers,
    body: payload || undefined,
    signal: AbortSignal.timeout(timeout),
  })
  const text = await res.text()
  if (raw) {
    if (!res.ok) throw httpError(res.status, text)
    return { status: res.status, text, headers: Object.fromEntries(res.headers) }
  }
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) throw httpError(res.status, pickMessage(json, text))
  return json
}

export function basicAuth(user, pass) {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
}

export function formBody(obj) {
  return new URLSearchParams(
    Object.entries(obj).filter(([, v]) => v != null && v !== ''),
  ).toString()
}

function pickMessage(json, text) {
  if (!json) return text?.slice(0, 400) || 'Request failed'
  const cands = [
    json.message,
    json.error_description,
    json.error?.message,
    json.error?.description,
    typeof json.error === 'string' ? json.error : null,
    json.errors?.[0]?.message,
    json.NotificationErrors?.[0]?.Message,
    json.Notifications?.[0]?.Message,
    json.msg,
    json.detail,
  ].filter(Boolean)
  if (cands[0]) return String(cands[0])
  return text.slice(0, 400) || 'Request failed'
}

function httpError(status, message) {
  const err = new Error(message || `HTTP ${status}`)
  err.status = status
  return err
}
