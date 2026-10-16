# RugOS Backend (Phase 1)

Express + MongoDB API for SKUs and Orders.

## Database

- **Name:** `rugos_erp` (new DB only — do not reuse existing databases)
- **URI:** `mongodb://127.0.0.1:27017/rugos_erp`

## Run

```bash
# Ensure MongoDB is running on :27017, then:
npm install
npm run seed
npm run dev
```

API: http://localhost:5000/api/health

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with `--watch` |
| `npm run seed` | Reset `skus` + `orders` collections in `rugos_erp` |
| `npm start` | Production start |

## Endpoints

- `GET/POST /api/skus`
- `GET/PUT/DELETE /api/skus/:sku`
- `GET/POST /api/orders`
- `GET/PUT/DELETE /api/orders/:orderId`
