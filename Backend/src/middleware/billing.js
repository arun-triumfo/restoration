import { planAllowsModule, PLANS } from '../constants/plans.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

const cache = new Map()
const TTL_MS = 30_000

async function loadTenant(tenantId) {
  const key = tenantId || DEFAULT_TENANT_ID
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.doc
  const doc = await getResourceModel('tenants', 'id', true).findOne({ id: key }).lean()
  cache.set(key, { at: Date.now(), doc })
  return doc
}

export function clearTenantCache(tenantId) {
  if (tenantId) cache.delete(tenantId)
  else cache.clear()
}

/** Block suspended / unpaid tenants (read-only escape for billing page later) */
export async function requireActiveBilling(req, res, next) {
  try {
    if (process.env.AUTH_DISABLED === 'true') return next()
    const tid = req.user?.tenantId || DEFAULT_TENANT_ID
    const tenant = await loadTenant(tid)
    const status = String(tenant?.billingStatus || 'active').toLowerCase()
    if (status === 'suspended' || status === 'canceled' || status === 'unpaid') {
      return res.status(402).json({
        success: false,
        message: `Tenant billing is ${status}. Update plan on /billing.`,
        billingStatus: status,
      })
    }
    req.tenant = tenant || {
      id: tid,
      plan: 'enterprise',
      modules: ['*'],
      billingStatus: 'active',
    }
    return next()
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

export function requireModule(moduleKey) {
  return async (req, res, next) => {
    try {
      if (process.env.AUTH_DISABLED === 'true') return next()
      if (!req.tenant) {
        const tid = req.user?.tenantId || DEFAULT_TENANT_ID
        req.tenant = await loadTenant(tid)
      }
      const plan = req.tenant?.plan || 'enterprise'
      const modules = req.tenant?.modules?.length
        ? req.tenant.modules
        : PLANS[plan]?.modules || ['*']
      const allowed =
        modules.includes('*') || modules.includes(moduleKey) || planAllowsModule(plan, moduleKey)
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Plan "${plan}" does not include module "${moduleKey}"`,
          plan,
        })
      }
      return next()
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message })
    }
  }
}
