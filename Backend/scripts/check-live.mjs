const BACKEND = 'https://restoration-b.onrender.com'
const FRONTEND = 'https://restoration-f.onrender.com'

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* html */
  }
  return { status: res.status, json, text: text.slice(0, 200) }
}

console.log('--- Backend ---')
const health = await get(`${BACKEND}/api/health`)
console.log('health', health.status, health.json)
const alerts = await get(`${BACKEND}/api/alerts/`)
console.log('alerts', alerts.status, 'count=', alerts.json?.count)
const autos = await get(`${BACKEND}/api/automations/`)
console.log('automations', autos.status, 'count=', autos.json?.count)
const root = await get(`${BACKEND}/`)
console.log('root', root.status, root.json || root.text)

console.log('--- Frontend ---')
const fe = await get(`${FRONTEND}/`)
console.log('frontend', fe.status)
const assetMatch = fe.text.match(/src="(\/assets\/[^"]+)"/)
if (assetMatch) {
  const jsUrl = `${FRONTEND}${assetMatch[1]}`
  const jsRes = await fetch(jsUrl)
  const js = await jsRes.text()
  console.log('bundle', assetMatch[1], 'bytes', js.length)
  console.log('contains restoration-b?', js.includes('restoration-b.onrender.com'))
  console.log('contains "/api"? sample fetch bases...')
  const hits = [...js.matchAll(/https:\/\/[^"'`]+onrender\.com[^"'`]*/g)].map((m) => m[0])
  console.log('onrender urls in bundle:', [...new Set(hits)].slice(0, 10))
}

console.log('--- Frontend /api (wrong host) ---')
const wrong = await get(`${FRONTEND}/api/alerts/`)
console.log('frontend /api/alerts', wrong.status, wrong.text.slice(0, 120))
