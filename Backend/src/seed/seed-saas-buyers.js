/**
 * Demo SaaS buyers for platform owner console:
 * - pending landing purchase
 * - active monthly (expires soon)
 * - active yearly
 */
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { PLANS } from '../constants/plans.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

function Tenant() {
  return getResourceModel('tenants', 'id', true)
}

function DemoRequest() {
  return getResourceModel('demo_requests', 'id', false)
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

const BUYERS = [
  {
    id: 'tenant-nordic-pending',
    name: 'Nordic Living AB',
    companyName: 'Nordic Living AB',
    slug: 'nordic-living',
    contactName: 'Anna Berg',
    email: 'anna@nordicliving.demo',
    phone: '+46 70 123 4567',
    plan: 'growth',
    seats: PLANS.growth.seats,
    modules: [...PLANS.growth.modules],
    status: 'Pending Approval',
    billingStatus: 'pending',
    billingCycle: 'yearly',
    amount: PLANS.growth.yearlyPrice,
    currency: 'INR',
    paymentRef: 'PAY-LANDING-NORDIC',
    renewsAt: null,
    activatedAt: null,
    businessMode: null,
    notes: 'Purchased via landing — awaiting platform owner activation',
    tenantId: 'tenant-nordic-pending',
  },
  {
    id: 'tenant-pacific-active',
    name: 'Pacific Import House LLC',
    companyName: 'Pacific Import House LLC',
    slug: 'pacific-import',
    contactName: 'Mike Chen',
    email: 'mike@pacificimport.demo',
    phone: '+1 512 555 0199',
    plan: 'starter',
    seats: PLANS.starter.seats,
    modules: [...PLANS.starter.modules],
    status: 'Active',
    billingStatus: 'active',
    billingCycle: 'monthly',
    amount: PLANS.starter.monthlyPrice,
    currency: 'INR',
    paymentRef: 'PAY-PACIFIC-001',
    renewsAt: daysFromNow(9),
    activatedAt: daysFromNow(-20),
    businessMode: 'import',
    notes: 'USA-side import ops — renews within 14 days',
    tenantId: 'tenant-pacific-active',
  },
  {
    id: 'tenant-austin-yearly',
    name: 'Austin Floor Co',
    companyName: 'Austin Floor Co',
    slug: 'austin-floor',
    contactName: 'James Carter',
    email: 'james@austinfloor.demo',
    phone: '+1 512 555 0101',
    plan: 'enterprise',
    seats: PLANS.enterprise.seats,
    modules: [...PLANS.enterprise.modules],
    status: 'Active',
    billingStatus: 'active',
    billingCycle: 'yearly',
    amount: PLANS.enterprise.yearlyPrice,
    currency: 'INR',
    paymentRef: 'PAY-AUSTIN-YEAR',
    renewsAt: daysFromNow(200),
    activatedAt: daysFromNow(-160),
    businessMode: 'export',
    notes: 'Yearly enterprise — healthy validity',
    tenantId: 'tenant-austin-yearly',
  },
]

async function main() {
  await connectDB(process.env.MONGODB_URI)
  for (const row of BUYERS) {
    await Tenant().findOneAndUpdate({ id: row.id }, { $set: row }, { upsert: true })
    console.log('Upserted buyer', row.id, row.status, row.billingCycle)
  }

  await DemoRequest().findOneAndUpdate(
    { id: 'demo-seed-001' },
    {
      $set: {
        id: 'demo-seed-001',
        companyName: 'Carpet House Dubai',
        contactName: 'Carpet House Dubai',
        email: 'ops@carperthouse.demo',
        phone: '+971 50 000 0000',
        country: 'UAE',
        businessType: 'Importer & Seller',
        message: 'Want a walkthrough of India → USA flow',
        status: 'Pending',
        tenantId: 'tenant-restoration',
      },
    },
    { upsert: true },
  )
  console.log('Upserted demo request demo-seed-001')
  console.log('Done. Open /saas as admin@restoration.com')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
