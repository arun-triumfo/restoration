/**
 * P2 smoke: two tenants must not see each other's SKUs.
 * Usage: node scripts/smoke-tenant-isolation.mjs
 * Requires API on PORT (default 5000) + seed:auth.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000/api'
const PASS = process.env.DEMO_PASSWORD || 'RugOS@2026'

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`login ${email}: ${body.message}`)
  return body.token
}

async function listSkus(token) {
  const res = await fetch(`${BASE}/skus`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`skus: ${body.message}`)
  return body.data || []
}

async function main() {
  const tokenA = await login('admin@ctasinfo.com')
  const tokenB = await login('admin@demo-b.rugos.test')
  const skusA = await listSkus(tokenA)
  const skusB = await listSkus(tokenB)

  const aHasB = skusA.some((s) => s.sku === 'TENANT-B-ONLY')
  const bHasOnly = skusB.some((s) => s.sku === 'TENANT-B-ONLY')
  const bSeesACatalog = skusB.filter((s) => s.tenantId === 'tenant-restoration').length

  console.log(`Tenant A SKUs: ${skusA.length} (has TENANT-B-ONLY? ${aHasB})`)
  console.log(`Tenant B SKUs: ${skusB.length} (has TENANT-B-ONLY? ${bHasOnly})`)
  console.log(`Tenant B rows stamped restoration: ${bSeesACatalog}`)

  if (aHasB) {
    console.error('FAIL: Tenant A can see Tenant B private SKU')
    process.exit(1)
  }
  if (!bHasOnly) {
    console.error('FAIL: Tenant B missing TENANT-B-ONLY')
    process.exit(1)
  }
  console.log('PASS: tenant isolation OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
