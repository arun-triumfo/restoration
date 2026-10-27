/**
 * Seed: Restoration tenant + @restoration.com demo users (4 roles).
 * Safe to re-run. Old rugos.in / ctasinfo emails are deactivated.
 *
 * Demo password: RugOS@2026
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
    email: 'admin@restoration.com',
    name: 'Restoration Admin',
    role: 'Super Admin',
    roleCode: 'super_admin',
  },
  {
    email: 'india@restoration.com',
    name: 'India Warehouse Manager',
    role: 'India Warehouse Manager',
    roleCode: 'india_wh',
  },
  {
    email: 'usa@restoration.com',
    name: 'US Warehouse Manager',
    role: 'US Warehouse Manager',
    roleCode: 'usa_wh',
  },
  {
    email: 'finance@restoration.com',
    name: 'Finance Manager',
    role: 'Finance Manager',
    roleCode: 'finance',
  },
]

/** Legacy emails — keep row but mark inactive so Login only shows @restoration.com */
const LEGACY_DEACTIVATE = [
  'admin@ctasinfo.com',
  'vikram@rugos.in',
  'j.gallagher@3pl-edison.com',
  'finance@rugos.in',
  'deepak.logistics@rugos.in',
  'sales@rugos.in',
  'scm@rugos.in',
  'auditor@rugos.in',
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

  for (const email of LEGACY_DEACTIVATE) {
    const r = await User.updateMany(
      { email },
      { $set: { status: 'Inactive' } },
    )
    if (r.modifiedCount || r.matchedCount) {
      console.log('Deactivated legacy:', email)
    }
  }

  await User.findOneAndUpdate(
    { email: 'admin-b@restoration.com' },
    {
      $set: {
        email: 'admin-b@restoration.com',
        name: 'Tenant B Admin',
        role: 'Super Admin',
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
  console.log('User upserted: admin-b@restoration.com → super_admin (Tenant B)')

  // Deactivate old tenant-b email if present
  await User.updateMany(
    { email: 'admin@demo-b.rugos.test' },
    { $set: { status: 'Inactive' } },
  )

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
  console.log(`\nDemo password: ${DEMO_PASSWORD}`)
  console.log('Logins:')
  for (const u of DEMO_USERS) console.log(`  ${u.email} → ${u.roleCode}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
