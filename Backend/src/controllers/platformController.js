import bcrypt from 'bcryptjs'
import { addBillingPeriod, planPublicList, PLANS } from '../constants/plans.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

function Tenant() {
  return getResourceModel('tenants', 'id', true)
}
function User() {
  return getResourceModel('users', 'email', true)
}
function DemoRequest() {
  return getResourceModel('demo_requests', 'id', false)
}

/** Platform owner = Super Admin on the Restoration / default tenant only */
export function isPlatformAdmin(user) {
  if (!user || user.roleCode !== 'super_admin') return false
  const tid = user.tenantId || DEFAULT_TENANT_ID
  return tid === DEFAULT_TENANT_ID || Boolean(user.isPlatformOwner)
}

function daysUntil(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function publicTenant(doc) {
  if (!doc) return null
  const plan = doc.plan || 'enterprise'
  const planMeta = PLANS[plan] || PLANS.enterprise
  const renewsAt = doc.renewsAt || null
  const daysLeft = daysUntil(renewsAt)
  return {
    id: doc.id,
    name: doc.name || doc.companyName,
    companyName: doc.companyName || doc.name,
    slug: doc.slug,
    contactName: doc.contactName || '',
    email: doc.email || '',
    phone: doc.phone || '',
    plan,
    planLabel: planMeta.label,
    seats: doc.seats ?? planMeta.seats,
    modules: doc.modules?.length ? doc.modules : planMeta.modules,
    status: doc.status || 'active',
    billingStatus: doc.billingStatus || 'active',
    billingCycle: doc.billingCycle || 'monthly',
    amount: doc.amount ?? null,
    currency: doc.currency || planMeta.currency || 'INR',
    paymentRef: doc.paymentRef || '',
    renewsAt,
    daysLeft,
    expiresSoon: daysLeft != null && daysLeft <= 14 && daysLeft >= 0,
    expired: daysLeft != null && daysLeft < 0,
    activatedAt: doc.activatedAt || null,
    businessMode: doc.businessMode || null,
    notes: doc.notes || '',
    createdAt: doc.createdAt,
  }
}

/** Public — landing pricing cards */
export async function listPublicPlans(_req, res) {
  try {
    res.json({ success: true, data: planPublicList() })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** Public — Book a Demo */
export async function createDemoRequest(req, res) {
  try {
    const companyName = String(req.body?.companyName || '').trim()
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    if (!companyName || !email) {
      return res.status(400).json({ success: false, message: 'Company name and work email are required' })
    }
    const id = `demo-${Date.now().toString(36)}`
    const doc = await DemoRequest().create({
      id,
      companyName,
      contactName: String(req.body?.contactName || companyName).trim(),
      email,
      phone: String(req.body?.phone || '').trim(),
      country: String(req.body?.country || '').trim(),
      businessType: String(req.body?.businessType || '').trim(),
      message: String(req.body?.message || '').trim(),
      status: 'Pending',
      tenantId: DEFAULT_TENANT_ID,
    })
    const obj = doc.toObject ? doc.toObject() : doc
    res.status(201).json({
      success: true,
      data: {
        id: obj.id,
        companyName: obj.companyName,
        email: obj.email,
        status: obj.status,
        createdAt: obj.createdAt,
      },
      message: 'Demo request submitted',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** Public — Subscribe from landing (pending activation) */
export async function requestSubscription(req, res) {
  try {
    const companyName = String(req.body?.companyName || '').trim()
    const contactName = String(req.body?.contactName || '').trim()
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    const phone = String(req.body?.phone || '').trim()
    const plan = String(req.body?.planId || req.body?.plan || 'starter').toLowerCase()
    const cycle = req.body?.billingCycle === 'yearly' ? 'yearly' : 'monthly'

    if (!companyName || !contactName || !email) {
      return res.status(400).json({
        success: false,
        message: 'companyName, contactName and email are required',
      })
    }
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Use: ${Object.keys(PLANS).join(', ')}`,
      })
    }

    const planMeta = PLANS[plan]
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const id = `tenant-${slug}-${Date.now().toString(36).slice(-4)}`
    const amount = cycle === 'yearly' ? planMeta.yearlyPrice : planMeta.monthlyPrice
    const paymentRef = `PAY-${Date.now()}`

    const tenant = await Tenant().create({
      id,
      name: companyName,
      companyName,
      slug: id.replace(/^tenant-/, ''),
      contactName,
      email,
      phone,
      plan,
      seats: planMeta.seats,
      modules: [...planMeta.modules],
      status: 'Pending Approval',
      billingStatus: 'pending',
      billingCycle: cycle,
      amount,
      currency: planMeta.currency || 'INR',
      paymentRef,
      renewsAt: null,
      activatedAt: null,
      businessMode: null,
      notes: 'Purchased via landing page — awaiting platform owner activation',
      tenantId: id,
    })

    res.status(201).json({
      success: true,
      tenant: publicTenant(tenant.toObject ? tenant.toObject() : tenant),
      message: 'Purchase request received — pending platform owner approval',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
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
    const data = await Tenant().find({}).sort({ createdAt: -1 }).lean()
    res.json({ success: true, count: data.length, data: data.map(publicTenant) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function listDemoRequests(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Platform admin only' })
    }
    const data = await DemoRequest().find({}).sort({ createdAt: -1 }).lean()
    res.json({
      success: true,
      count: data.length,
      data: data.map((d) => ({
        id: d.id || String(d._id),
        companyName: d.companyName,
        contactName: d.contactName || '',
        email: d.email,
        phone: d.phone || '',
        country: d.country || '',
        businessType: d.businessType || '',
        message: d.message || '',
        status: d.status || 'Pending',
        createdAt: d.createdAt,
      })),
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateDemoRequest(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Platform admin only' })
    }
    const id = req.params.id
    const status = String(req.body?.status || '')
    const allowed = ['Pending', 'Contacted', 'Approved', 'Rejected']
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }
    const updated = await DemoRequest()
      .findOneAndUpdate({ id }, { $set: { status } }, { new: true })
      .lean()
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** Activate pending SaaS buyer — set cycle, renewsAt, optional admin user */
export async function activateTenant(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Platform admin only' })
    }
    const tid = req.params.tenantId
    const tenant = await Tenant().findOne({ id: tid }).lean()
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' })

    const cycle =
      req.body?.billingCycle === 'yearly'
        ? 'yearly'
        : req.body?.billingCycle === 'monthly'
          ? 'monthly'
          : tenant.billingCycle || 'monthly'
    const mode =
      req.body?.businessMode === 'import'
        ? 'import'
        : req.body?.businessMode === 'export'
          ? 'export'
          : tenant.businessMode || 'export'

    const now = new Date()
    const renewsAt = addBillingPeriod(now, cycle).toISOString()
    const plan = tenant.plan || 'starter'
    const planMeta = PLANS[plan] || PLANS.starter
    const amount = cycle === 'yearly' ? planMeta.yearlyPrice : planMeta.monthlyPrice

    const updated = await Tenant()
      .findOneAndUpdate(
        { id: tid },
        {
          $set: {
            status: 'Active',
            billingStatus: 'active',
            billingCycle: cycle,
            businessMode: mode,
            activatedAt: now.toISOString(),
            renewsAt,
            amount,
            paymentRef: tenant.paymentRef || `PAY-ACT-${Date.now()}`,
            notes: tenant.notes || 'Activated by platform owner',
          },
        },
        { new: true },
      )
      .lean()

    // Ensure company admin user exists (india_wh as company ops admin — not platform owner)
    const adminEmail = String(req.body?.adminEmail || tenant.email || '').toLowerCase()
    const tempPassword = String(req.body?.tempPassword || `RugOS@${Date.now().toString().slice(-6)}`)
    let adminCred = null
    if (adminEmail) {
      const existing = await User().findOne({ email: adminEmail }).lean()
      if (!existing) {
        const passwordHash = await bcrypt.hash(tempPassword, 10)
        await User().create({
          email: adminEmail,
          name: tenant.contactName || 'Company Admin',
          role: 'India Warehouse Manager',
          roleCode: 'india_wh',
          status: 'Active',
          tenantId: tid,
          passwordHash,
          whAccess: 'As per role',
          perm: 'Role-based',
        })
        adminCred = { email: adminEmail, tempPassword }
      }
    }

    res.json({
      success: true,
      tenant: publicTenant(updated),
      admin: adminCred,
      message: `Tenant activated (${cycle}). Valid until ${renewsAt.slice(0, 10)}.`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function suspendTenant(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Platform admin only' })
    }
    const tid = req.params.tenantId
    if (tid === DEFAULT_TENANT_ID) {
      return res.status(400).json({ success: false, message: 'Cannot suspend platform tenant' })
    }
    const updated = await Tenant()
      .findOneAndUpdate(
        { id: tid },
        { $set: { status: 'Suspended', billingStatus: 'suspended' } },
        { new: true },
      )
      .lean()
    if (!updated) return res.status(404).json({ success: false, message: 'Tenant not found' })
    res.json({ success: true, tenant: publicTenant(updated), message: 'Tenant suspended' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

/** Create tenant + first admin (temp password) — platform owner */
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
    const cycle = req.body?.billingCycle === 'yearly' ? 'yearly' : 'monthly'
    const adminEmail = String(req.body?.adminEmail || '')
      .trim()
      .toLowerCase()
    const adminName = String(req.body?.adminName || 'Company Admin').trim()
    const tempPassword = String(req.body?.tempPassword || `RugOS@${Date.now().toString().slice(-6)}`)

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'name and slug required' })
    }
    if (!adminEmail) {
      return res.status(400).json({ success: false, message: 'adminEmail required' })
    }
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Use: ${Object.keys(PLANS).join(', ')}`,
      })
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
    const amount = cycle === 'yearly' ? planMeta.yearlyPrice : planMeta.monthlyPrice
    const renewsAt = addBillingPeriod(new Date(), cycle).toISOString()
    const tenant = await Tenant().create({
      id,
      name,
      companyName: name,
      slug,
      contactName: adminName,
      email: adminEmail,
      plan,
      seats: planMeta.seats,
      modules: [...planMeta.modules],
      status: 'Active',
      billingStatus: 'active',
      billingCycle: cycle,
      amount,
      currency: planMeta.currency || 'INR',
      paymentRef: `PAY-MANUAL-${Date.now()}`,
      renewsAt,
      activatedAt: new Date().toISOString(),
      tenantId: id,
    })

    const passwordHash = await bcrypt.hash(tempPassword, 10)
    await User().create({
      email: adminEmail,
      name: adminName,
      role: 'India Warehouse Manager',
      roleCode: 'india_wh',
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
      message: 'Tenant created. Share temp password with company admin.',
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
    const allowed = [
      'plan',
      'seats',
      'modules',
      'billingStatus',
      'status',
      'name',
      'renewsAt',
      'billingCycle',
      'amount',
      'paymentRef',
      'businessMode',
      'notes',
    ]
    const patch = {}
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k]
    }
    if (patch.plan && PLANS[patch.plan]) {
      const meta = PLANS[patch.plan]
      if (patch.modules === undefined) patch.modules = [...meta.modules]
      if (patch.seats === undefined) patch.seats = meta.seats
      if (patch.billingCycle && patch.amount === undefined) {
        patch.amount =
          patch.billingCycle === 'yearly' ? meta.yearlyPrice : meta.monthlyPrice
      }
    }
    // Renew period when activating
    if (patch.billingStatus === 'active' && !patch.renewsAt) {
      const existing = await Tenant().findOne({ id: tid }).lean()
      const cycle = patch.billingCycle || existing?.billingCycle || 'monthly'
      patch.renewsAt = addBillingPeriod(new Date(), cycle).toISOString()
      if (!patch.status) patch.status = 'Active'
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

/** SaaS owner summary cards */
export async function saasOverview(req, res) {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Platform admin only' })
    }
    const tenants = await Tenant().find({}).lean()
    const demos = await DemoRequest().find({ status: 'Pending' }).lean()
    const mapped = tenants.map(publicTenant)
    const active = mapped.filter((t) => String(t.billingStatus).toLowerCase() === 'active')
    const pending = mapped.filter(
      (t) =>
        String(t.status).toLowerCase().includes('pending') ||
        String(t.billingStatus).toLowerCase() === 'pending',
    )
    const expiring = mapped.filter((t) => t.expiresSoon)
    const expired = mapped.filter((t) => t.expired || String(t.billingStatus).toLowerCase() === 'suspended')
    const mrr = active.reduce((sum, t) => {
      const amt = Number(t.amount || 0)
      if (!amt) return sum
      return sum + (t.billingCycle === 'yearly' ? amt / 12 : amt)
    }, 0)

    res.json({
      success: true,
      data: {
        totalTenants: mapped.length,
        active: active.length,
        pending: pending.length,
        expiringSoon: expiring.length,
        suspendedOrExpired: expired.length,
        pendingDemos: demos.length,
        estimatedMrrInr: Math.round(mrr),
        expiring,
        pendingBuyers: pending,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
