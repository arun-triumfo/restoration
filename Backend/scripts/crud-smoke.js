import http from 'node:http'
import { RESOURCES } from '../src/resources.js'

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers: data
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
          : {},
      },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          let parsed
          try {
            parsed = JSON.parse(d)
          } catch {
            parsed = { raw: d }
          }
          resolve({ status: res.statusCode, body: parsed })
        })
      },
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

function makeId(name, stamp) {
  if (name === 'users') return `crud.${stamp}@test.local`
  if (name === 'currencies' || name === 'carriers') return `T${String(stamp).slice(-5)}`
  return `CRUD-${stamp}-${name.slice(0, 6)}`
}

function makePayload(name, idField, id) {
  const payload = {
    [idField]: id,
    name: 'CRUD Test',
    title: 'CRUD Test',
    status: 'Active',
  }
  if (name === 'skus') {
    Object.assign(payload, {
      sku: id,
      title: 'CRUD Rug',
      collection: 'Test',
      sellingPriceUSD: 9,
      stock: {
        indiaAvailable: 1,
        indiaPacked: 0,
        inTransit: 0,
        usaAvailable: 0,
        usaReserved: 0,
        fba: 0,
      },
    })
  }
  if (name === 'orders') {
    Object.assign(payload, {
      orderId: id,
      channel: 'Test',
      buyerName: 'CRUD',
      sku: 'SKU-X',
      qty: 1,
      totalOrderUSD: 1,
      status: 'Pending Allocation',
    })
  }
  if (name === 'users') {
    Object.assign(payload, {
      email: id,
      name: 'CRUD User',
      role: 'Viewer',
      status: 'Active',
    })
  }
  return payload
}

const stamp = Date.now()
const fails = []
const ok = []

for (const [name, meta] of Object.entries(RESOURCES)) {
  const id = makeId(name, stamp)
  const enc = encodeURIComponent(id)
  const payload = makePayload(name, meta.idField, id)

  try {
    const c = await req('POST', `/api/${name}`, payload)
    if (c.status !== 201) {
      throw new Error(`CREATE ${c.status} ${c.body.message || JSON.stringify(c.body)}`)
    }

    const g = await req('GET', `/api/${name}/${enc}`)
    if (g.status !== 200) throw new Error(`GET ${g.status} ${g.body.message}`)
    if (String(g.body.data?.[meta.idField]) !== String(id)) {
      throw new Error(`GET id mismatch got=${g.body.data?.[meta.idField]}`)
    }

    const u = await req('PUT', `/api/${name}/${enc}`, { status: 'Updated-CRUD' })
    if (u.status !== 200) throw new Error(`UPDATE ${u.status} ${u.body.message}`)
    if (u.body.data?.status !== 'Updated-CRUD') throw new Error('UPDATE not applied')

    const d = await req('DELETE', `/api/${name}/${enc}`)
    if (d.status !== 200) throw new Error(`DELETE ${d.status} ${d.body.message}`)

    const gone = await req('GET', `/api/${name}/${enc}`)
    if (gone.status !== 404) throw new Error(`DELETE not persisted, GET=${gone.status}`)

    ok.push(name)
  } catch (err) {
    fails.push(`${name}: ${err.message}`)
    await req('DELETE', `/api/${name}/${enc}`).catch(() => {})
  }
}

console.log(`OK ${ok.length}/${Object.keys(RESOURCES).length}`)
ok.forEach((n) => console.log('  PASS', n))
if (fails.length) {
  console.log(`FAIL ${fails.length}`)
  fails.forEach((f) => console.log('  FAIL', f))
  process.exit(1)
}
