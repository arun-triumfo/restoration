import jwt from 'jsonwebtoken'
import { normalizeRoleCode, roleCanAccessResource } from '../constants/roles.js'
import { DEFAULT_TENANT_ID } from '../constants/tenant.js'

const JWT_SECRET = process.env.JWT_SECRET || 'rugos-dev-secret-change-me'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  })
}

export function authenticate(req, res, next) {
  // Local/dev escape hatch — never enable on production Render without care
  if (process.env.AUTH_DISABLED === 'true') {
    req.user = {
      email: 'dev@local',
      name: 'Dev Bypass',
      roleCode: 'super_admin',
      tenantId: DEFAULT_TENANT_ID,
    }
    return next()
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ success: false, message: 'Login required' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = {
      email: decoded.email,
      name: decoded.name,
      roleCode: normalizeRoleCode(decoded.roleCode),
      tenantId: decoded.tenantId || DEFAULT_TENANT_ID,
    }
    return next()
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired — please login again' })
  }
}

export function requirePermission(resource, action = 'read') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Login required' })
    }
    if (!roleCanAccessResource(req.user.roleCode, resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.roleCode} cannot ${action} ${resource}`,
      })
    }
    return next()
  }
}

export { JWT_SECRET }
