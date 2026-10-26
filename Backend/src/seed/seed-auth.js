/**
 * P0/P1 seed: default tenant + demo users with password hashes.
 * Does NOT wipe other collections. Safe to re-run.
 *
 * Demo password for all users: RugOS@2026
 */
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { normalizeRoleCode } from '../constants/roles.js'
import { DEFAULT_TENANT, DEFAULT_TENANT_ID, DEMO_TENANT_B } from '../constants/tenant.js'
import { getResourceModel } from '../models/createResourceModel.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rugos_erp'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'RugOS@2026'

const DEMO_USERS = [
  {
    email: 'admin@ctasinfo.com',
    name: 'Ctas Admin',
    role: 'Super Admin / Management',
    roleCode: 'super_admin',
  },
  {
    email: 'vikram@rugos.in',
    name: 'Vikram Singh',
    role: 'India Warehouse Manager',
    roleCode: 'india_wh',
  },
  {
    email: 'j.gallagher@3pl-edison.com',
    name: 'John Gallagher',
    role: 'USA 3PL Warehouse Lead',
    roleCode: 'usa_wh',
  },
  {
    email: 'deepak.logistics@rugos.in',
    name: 'Deepak Sharma',
    role: 'Logistics & Export Lead',
    roleCode: 'logistics',
  },
  {
    email: 'finance@rugos.in',
    name: 'Sunita Agarwal',
    role: 'Accounts & Finance Lead',
    roleCode: 'finance',
  },
  {
    email: 'sales@rugos.in',
    name: 'Priya Mehta',
    role: 'Sales / Marketplace',
    roleCode: 'sales',
  },
  {
    email: 'scm@rugos.in',
    name: 'Amit Planner',
    role: 'Planning / SCM',
    roleCode: 'scm',
  },
  {
    email: 'auditor@rugos.in',
    name: 'Neha Auditor',
    role: 'Statutory Auditor',
    roleCode: 'auditor',
  },
]

async function stampTenantIdOnAll() {
  const { RESOURCES } = await import('../resources.js')
  let stamped = 0
  for (const name of Object.keys(RESOURCES)) {
    if (name === 'tenants') continue
    const Model = getResourceModel(name, RESOURCES[name].idField, RESOURCES[name].unique !== false)
    const result = await Model.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
      { $set: { tenantId: DEFAULT_TENANT_ID } },
    )
    stamped += result.modifiedCount || 0
  }
  return stamped
}

async function main() {
  await connectDB(MONGODB_URI)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const Tenant = getResourceModel('tenants', 'id', true)
  await Tenant.findOneAndUpdate(
    { id: DEFAULT_TENANT_ID },
    { $set: DEFAULT_TENANT },
    { upsert: true, new: true },
  )
  console.log('Tenant upserted:', DEFAULT_TENANT_ID)

  await Tenant.findOneAndUpdate(
    { id: DEMO_TENANT_B.id },
    { $set: DEMO_TENANT_B },
    { upsert: true, new: true },
  )
  console.log('Tenant upserted:', DEMO_TENANT_B.id)

  const User = getResourceModel('users', 'email', true)
  for (const u of DEMO_USERS) {
    await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          email: u.email,
          name: u.name,
          role: u.role,
          roleCode: u.roleCode || normalizeRoleCode(u.role),
          status: 'Active',
          tenantId: DEFAULT_TENANT_ID,
          passwordHash,
          whAccess: 'As per role',
          perm: 'Role-based',
        },
      },
      { upsert: true, new: true },
    )
    console.log('User upserted:', u.email, '→', u.roleCode)
  }

  // Isolation demo admin for Tenant B
  await User.findOneAndUpdate(
    { email: 'admin@demo-b.rugos.test' },
    {
      $set: {
        email: 'admin@demo-b.rugos.test',
        name: 'Tenant B Admin',
        role: 'Super Admin / Management',
        roleCode: 'super_admin',
        status: 'Active',
        tenantId: DEMO_TENANT_B.id,
        passwordHash,
        whAccess: 'As per role',
        perm: 'Role-based',
      },
    },
    { upsert: true, new: true },
  )
  console.log('User upserted: admin@demo-b.rugos.test → super_admin (Tenant B)')

  // Seed one SKU only visible to Tenant B
  const Sku = getResourceModel('skus', 'sku', true)
  await Sku.findOneAndUpdate(
    { sku: 'TENANT-B-ONLY', tenantId: DEMO_TENANT_B.id },
    {
      $set: {
        sku: 'TENANT-B-ONLY',
        title: 'Tenant B Private Rug',
        status: 'Active',
        tenantId: DEMO_TENANT_B.id,
        qty: 3,
      },
    },
    { upsert: true, new: true },
  )

  const stamped = await stampTenantIdOnAll()
  console.log(`Stamped tenantId on ${stamped} legacy documents`)
  console.log(`\nDemo password for all users: ${DEMO_PASSWORD}`)
  console.log('Try: admin@ctasinfo.com /', DEMO_PASSWORD)
  console.log('Tenant B: admin@demo-b.rugos.test /', DEMO_PASSWORD)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
