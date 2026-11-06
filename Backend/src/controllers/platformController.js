import bcrypt from 'bcryptjs'
import { addBillingPeriod, planPublicList, PLANS } from '../constants/plans.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { createCheckout, verifyPayment } from '../integrations/adapters/razorpay.js'
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
    currency: doc.currency || planMeta.currency || 'USD',
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
      currency: planMeta.currency || 'USD',
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
      currency: planMeta.currency || 'USD',
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
function razorpayEnv() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim()
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim()
  if (!keyId.startsWith('rzp_') || keyId.includes('your_key') || !keySecret || keySecret.includes('your_test')) {
    const err = new Error(
      'Razorpay test keys are not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Backend/.env (Test mode).',
    )
    err.status = 503
    throw err
  }
  return { keyId, keySecret, currency: 'USD' }
}

async function openRazorpayOrder(fields, { amountUsd, receipt, notes }) {
  try {
    const order = await createCheckout(fields, {
      amount: amountUsd,
      currency: 'USD',
      receipt,
      notes,
    })
    return { ...order, chargedAmount: amountUsd, chargedCurrency: 'USD' }
  } catch (err) {
    const msg = String(err.message || '')
    if (!/currency|international/i.test(msg)) throw err
    const inr = Math.max(1, Math.round(Number(amountUsd) * 83))
    const order = await createCheckout(fields, {
      amount: inr,
      currency: 'INR',
      receipt,
      notes: { ...notes, displayCurrency: 'USD', displayAmount: String(amountUsd) },
    })
    return { ...order, chargedAmount: inr, chargedCurrency: 'INR' }
  }
}

/** Public — create a pending company + Razorpay test order (prices are USD). */
export async function createSubscriptionCheckout(req, res) {
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

    const fields = razorpayEnv()
    const planMeta = PLANS[plan]
    const amountUsd = cycle === 'yearly' ? planMeta.yearlyPrice : planMeta.monthlyPrice
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const id = `tenant-${slug}-${Date.now().toString(36).slice(-4)}`
    const receipt = `rugos-${id}`.slice(0, 40)

    const order = await openRazorpayOrder(fields, {
      amountUsd,
      receipt,
      notes: {
        tenantId: id,
        plan,
        billingCycle: cycle,
        email,
      },
    })

    await Tenant().create({
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
      status: 'Pending Payment',
      billingStatus: 'unpaid',
      billingCycle: cycle,
      amount: amountUsd,
      currency: 'USD',
      paymentRef: order.orderId,
      renewsAt: null,
      activatedAt: null,
      businessMode: null,
      notes: 'Razorpay checkout started — payment not confirmed',
      tenantId: id,
    })

    res.status(201).json({
      success: true,
      keyId: fields.keyId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      chargedAmount: order.chargedAmount,
      chargedCurrency: order.chargedCurrency,
      displayAmount: amountUsd,
      displayCurrency: 'USD',
      tenantId: id,
      plan,
      billingCycle: cycle,
      mode: fields.keyId.startsWith('rzp_test_') ? 'test' : 'live',
    })
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message })
  }
}

/** Public — confirm Razorpay payment signature and mark the company paid. */
export async function verifySubscriptionPayment(req, res) {
  try {
    const tenantId = String(req.body?.tenantId || '').trim()
    const orderId = String(req.body?.razorpay_order_id || req.body?.orderId || '').trim()
    const paymentId = String(req.body?.razorpay_payment_id || req.body?.paymentId || '').trim()
    const signature = String(req.body?.razorpay_signature || req.body?.signature || '').trim()
    if (!tenantId || !orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, message: 'Payment confirmation is incomplete' })
    }

    const fields = razorpayEnv()
    verifyPayment(fields, { orderId, paymentId, signature })

    const tenant = await Tenant().findOne({ id: tenantId }).lean()
    if (!tenant) return res.status(404).json({ success: false, message: 'Company not found' })
    if (tenant.paymentRef && tenant.paymentRef !== orderId && tenant.billingStatus === 'paid') {
      return res.json({ success: true, tenant: publicTenant(tenant), message: 'Already paid' })
    }
    if (tenant.paymentRef && tenant.paymentRef !== orderId) {
      return res.status(400).json({ success: false, message: 'Order does not match this company' })
    }

    const updated = await Tenant()
      .findOneAndUpdate(
        { id: tenantId },
        {
          $set: {
            status: 'Pending Approval',
            billingStatus: 'paid',
            paymentRef: paymentId,
            notes: `Paid via Razorpay ${paymentId} (order ${orderId}). Awaiting platform owner activation.`,
          },
        },
        { new: true },
      )
      .lean()

    res.json({
      success: true,
      tenant: publicTenant(updated),
      paymentId,
      message: 'Payment received. Platform owner will activate your company.',
    })
  } catch (err) {
    res.status(err.status || 400).json({ success: false, message: err.message })
  }
}

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
      const monthly = t.billingCycle === 'yearly' ? amt / 12 : amt
      const cur = String(t.currency || 'USD').toUpperCase()
      return sum + (cur === 'INR' ? monthly / 83 : monthly)
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
        estimatedMrrUsd: Math.round(mrr),
        estimatedMrrInr: Math.round(mrr),
        expiring,
        pendingBuyers: pending,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
