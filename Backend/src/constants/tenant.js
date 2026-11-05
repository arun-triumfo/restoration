import { PLANS } from './plans.js'

/** Default demo tenant for Restoration / Odette single-company installs */
export const DEFAULT_TENANT_ID = 'tenant-restoration'

export const DEFAULT_TENANT = {
  id: DEFAULT_TENANT_ID,
  name: 'Restoration Rugs / Odette',
  companyName: 'Restoration Rugs / Odette',
  slug: 'restoration',
  plan: 'enterprise',
  status: 'Active',
  billingStatus: 'active',
  billingCycle: 'yearly',
  amount: PLANS.enterprise.yearlyPrice,
  currency: 'INR',
  paymentRef: 'PAY-PLATFORM-OWNER',
  modules: [...PLANS.enterprise.modules],
  seats: PLANS.enterprise.seats,
  /** Far future — platform demo tenant never expires */
  renewsAt: '2099-12-31T00:00:00.000Z',
  activatedAt: new Date().toISOString(),
  tenantId: DEFAULT_TENANT_ID,
  notes: 'Platform owner tenant',
}

/** Second demo tenant for isolation smoke tests */
export const DEMO_TENANT_B = {
  id: 'tenant-demo-b',
  name: 'Demo Rugs Co (Tenant B)',
  slug: 'demo-b',
  plan: 'growth',
  status: 'active',
  billingStatus: 'active',
  modules: [...PLANS.growth.modules],
  seats: PLANS.growth.seats,
  renewsAt: null,
  tenantId: 'tenant-demo-b',
}
