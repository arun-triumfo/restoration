import { PLANS } from './plans.js'

/** Default demo tenant for Restoration / Odette single-company installs */
export const DEFAULT_TENANT_ID = 'tenant-restoration'

export const DEFAULT_TENANT = {
  id: DEFAULT_TENANT_ID,
  name: 'Restoration Rugs / Odette',
  slug: 'restoration',
  plan: 'enterprise',
  status: 'active',
  billingStatus: 'active',
  modules: [...PLANS.enterprise.modules],
  seats: PLANS.enterprise.seats,
  renewsAt: null,
  tenantId: DEFAULT_TENANT_ID,
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
