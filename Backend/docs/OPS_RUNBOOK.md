# RugOS ops runbook (P5)

## Env (production)

| Var | Purpose |
|-----|---------|
| `MONGODB_URI` | Atlas connection (include DB name) |
| `JWT_SECRET` | **Rotate** from default — long random string |
| `JWT_EXPIRES` | e.g. `7d` |
| `CORS_ORIGINS` | Comma-separated FE origins (Render FE URL) |
| `DEMO_PASSWORD` | Seed only — do not use in prod tenants |
| `SECRETS_KEY` | Encryption key for integration credentials |
| `AUTH_DISABLED` | Never `true` on Render |

## JWT rotation

1. Generate new secret: `openssl rand -hex 32`
2. Set `JWT_SECRET` on Render → redeploy Backend
3. All users must log in again (old tokens invalid)

## Atlas backup drill

1. Atlas → Cluster → Backup → take snapshot (or confirm continuous backup)
2. Restore to a **new** cluster / temp DB name
3. Point a staging `MONGODB_URI` at restore; run `npm run smoke:tenants`
4. Document date of last successful restore in team chat

## First tenant onboard

1. Login as platform Super Admin
2. `/tenants` → create company + admin temp password
3. Share credentials; ask admin to change password (when change-password ships)
4. Confirm `/billing` plan and `/integrations` sandbox

## Smoke after deploy

```bash
curl -s https://YOUR-API/api/health
npm run smoke:tenants   # against API_BASE=https://YOUR-API/api
```
