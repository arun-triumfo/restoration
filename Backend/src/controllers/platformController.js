import bcrypt from 'bcryptjs'
import { PLANS } from '../constants/plans.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

function Tenant() {
  return getResourceModel('tenants', 'id', true)
}
function User() {
  return getResourceModel('users', 'email', true)
}

function isPlatformAdmin(user) {
  return user?.roleCode === 'super_admin'
}

function publicTenant(doc) {
  if (!doc) return null
  const plan = doc.plan || 'enterprise'
  const planMeta = PLANS[plan] || PLANS.enterprise
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    plan,
    planLabel: planMeta.label,
    seats: doc.seats ?? planMeta.seats,
    modules: doc.modules?.length ? doc.modules : planMeta.modules,
    status: doc.status || 'active',
    billingStatus: doc.billingStatus || 'active',
    renewsAt: doc.renewsAt || null,
    createdAt: doc.createdAt,
  }
}

/** List all tenants (platform) or only own tenant */
export async function listTenants(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      const own = await Tenant().findOne({ id: req.user.tenantId }).lean()
      return res.json({
        success: true,
        count: own ? 1 : 0,
        data: own ? [publicTenant(own)] : [],
      })
    }
    const data = await Tenant().find({}).sort({ name: 1 }).lean()
    res.json({ success: true, count: data.length, data: data.map(publicTenant) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** Create tenant + first admin (temp password) */
export async function createTenant(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Platform admin only' })
    }
    const name = String(req.body?.name || '').trim()
    const slug = String(req.body?.slug || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const plan = String(req.body?.plan || 'starter').toLowerCase()
    const adminEmail = String(req.body?.adminEmail || '').trim().toLowerCase()
    const adminName = String(req.body?.adminName || 'Tenant Admin').trim()
    const tempPassword = String(req.body?.tempPassword || `RugOS@${Date.now().toString().slice(-6)}`)

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'name and slug required' })
    }
    if (!adminEmail) {
      return res.status(400).json({ success: false, message: 'adminEmail required' })
    }
    if (!PLANS[plan]) {
      return res.status(400).json({ success: false, message: `Invalid plan. Use: ${Object.keys(PLANS).join(', ')}` })
    }

    const id = `tenant-${slug}`
    const exists = await Tenant().findOne({ $or: [{ id }, { slug }] }).lean()
    if (exists) {
      return res.status(409).json({ success: false, message: 'Tenant id/slug already exists' })
    }
    const emailTaken = await User().findOne({ email: adminEmail }).lean()
    if (emailTaken) {
      return res.status(409).json({ success: false, message: 'Admin email already registered' })
    }

    const planMeta = PLANS[plan]
    const tenant = await Tenant().create({
      id,
      name,
      slug,
      plan,
      seats: planMeta.seats,
      modules: [...planMeta.modules],
      status: 'active',
      billingStatus: 'trialing',
      renewsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      tenantId: id,
    })

    const passwordHash = await bcrypt.hash(tempPassword, 10)
    await User().create({
      email: adminEmail,
      name: adminName,
      role: 'Super Admin / Management',
      roleCode: 'super_admin',
      status: 'Active',
      tenantId: id,
      passwordHash,
      whAccess: 'As per role',
      perm: 'Role-based',
    })

    res.status(201).json({
      success: true,
      tenant: publicTenant(tenant.toObject ? tenant.toObject() : tenant),
      admin: { email: adminEmail, name: adminName, tempPassword },
      message: 'Tenant created. Share temp password with admin (change on first login later).',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateTenantBilling(req, res) {
  try {
    const tid = req.params.tenantId || req.user.tenantId
    if (!isPlatformAdmin(req.user) && tid !== req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Cannot edit other tenants' })
    }
    const body = { ...(req.body || {}) }
    const allowed = ['plan', 'seats', 'modules', 'billingStatus', 'status', 'name', 'renewsAt']
    const patch = {}
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k]
    }
    if (patch.plan && PLANS[patch.plan]) {
      const meta = PLANS[patch.plan]
      if (patch.modules === undefined) patch.modules = [...meta.modules]
      if (patch.seats === undefined) patch.seats = meta.seats
    }
    const updated = await Tenant()
      .findOneAndUpdate({ id: tid }, { $set: patch }, { new: true })
      .lean()
    if (!updated) return res.status(404).json({ success: false, message: 'Tenant not found' })
    res.json({ success: true, tenant: publicTenant(updated) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getMyTenant(req, res) {
  try {
    const tid = req.user.tenantId || DEFAULT_TENANT_ID
    const doc = await Tenant().findOne({ id: tid }).lean()
    if (!doc) {
      return res.json({
        success: true,
        tenant: publicTenant({
          id: tid,
          name: 'Default tenant',
          slug: 'default',
          plan: 'enterprise',
          billingStatus: 'active',
        }),
      })
    }
    res.json({ success: true, tenant: publicTenant(doc) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
