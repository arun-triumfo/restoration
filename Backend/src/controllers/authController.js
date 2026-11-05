import bcrypt from 'bcryptjs'
import { PLANS } from '../constants/plans.js'
import { normalizeRoleCode, ROLES } from '../constants/roles.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'
import { signToken } from '../middleware/auth.js'

function UserModel() {
  return getResourceModel('users', 'email', true)
}

function TenantModel() {
  return getResourceModel('tenants', 'id', true)
}

async function tenantPublic(tenantId) {
  const tid = tenantId || DEFAULT_TENANT_ID
  const doc = await TenantModel().findOne({ id: tid }).lean()
  const plan = doc?.plan || 'enterprise'
  const planMeta = PLANS[plan] || PLANS.enterprise
  return {
    id: tid,
    name: doc?.name || doc?.companyName || 'Restoration Rugs / Odette',
    slug: doc?.slug || 'restoration',
    plan,
    planLabel: planMeta.label,
    seats: doc?.seats ?? planMeta.seats,
    modules: doc?.modules?.length ? doc.modules : planMeta.modules,
    billingStatus: doc?.billingStatus || 'active',
    billingCycle: doc?.billingCycle || 'monthly',
    amount: doc?.amount ?? null,
    paymentRef: doc?.paymentRef || '',
    renewsAt: doc?.renewsAt || null,
    status: doc?.status || 'active',
  }
}

async function publicUser(doc) {
  if (!doc) return null
  const roleCode = normalizeRoleCode(doc.roleCode || doc.role)
  const roleMeta = ROLES[roleCode] || ROLES.india_wh
  const tenantId = doc.tenantId || DEFAULT_TENANT_ID
  const tenant = await tenantPublic(tenantId)
  return {
    email: doc.email,
    name: doc.name,
    role: doc.role || roleMeta.label,
    roleCode,
    tenantId,
    tenant,
    status: doc.status || 'Active',
    menus: roleMeta.menus,
    permissions: {
      resources: roleMeta.resources,
      actions: roleMeta.actions,
    },
  }
}

export async function login(req, res) {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' })
    }

    const user = await UserModel().findOne({ email }).lean()
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }
    if (String(user.status || 'Active').toLowerCase() === 'inactive') {
      return res.status(403).json({ success: false, message: 'Account inactive' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const profile = await publicUser(user)
    const isPlatformOwner =
      profile.roleCode === 'super_admin' &&
      (profile.tenantId === DEFAULT_TENANT_ID || Boolean(user.isPlatformOwner))

    // SaaS gate: non-platform tenants need active billing + valid renew date
    if (!isPlatformOwner) {
      const billing = String(profile.tenant?.billingStatus || 'active').toLowerCase()
      if (['suspended', 'canceled', 'cancelled', 'unpaid', 'pending'].includes(billing)) {
        return res.status(402).json({
          success: false,
          message: `Subscription is ${billing}. Contact RugOS support or renew on Billing.`,
          billingStatus: billing,
        })
      }
      const renewsAt = profile.tenant?.renewsAt
      if (renewsAt) {
        const end = new Date(renewsAt).getTime()
        if (!Number.isNaN(end) && end < Date.now()) {
          return res.status(402).json({
            success: false,
            message: 'Subscription expired. Please renew to continue using RugOS.',
            billingStatus: 'expired',
            renewsAt,
          })
        }
      }
      const tenantStatus = String(profile.tenant?.status || 'active').toLowerCase()
      if (tenantStatus.includes('pending') || tenantStatus === 'suspended') {
        return res.status(402).json({
          success: false,
          message: 'Company account is not active yet. Platform owner must activate your subscription.',
          billingStatus: tenantStatus,
        })
      }
    }

    const token = signToken({
      email: profile.email,
      name: profile.name,
      roleCode: profile.roleCode,
      tenantId: profile.tenantId,
      isPlatformOwner,
    })

    res.json({
      success: true,
      token,
      user: { ...profile, isPlatformOwner },
      redirectTo: isPlatformOwner ? '/saas' : '/dashboard',
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function me(req, res) {
  try {
    const user = await UserModel().findOne({ email: req.user.email }).lean()
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }
    const profile = await publicUser(user)
    const isPlatformOwner =
      profile.roleCode === 'super_admin' &&
      (profile.tenantId === DEFAULT_TENANT_ID || Boolean(user.isPlatformOwner))
    res.json({ success: true, user: { ...profile, isPlatformOwner } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function logout(_req, res) {
  res.json({ success: true, message: 'Logged out' })
}
