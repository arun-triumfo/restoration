# Restoration Rugs / RugOS — Exact Wireframe Clone

Same-to-same copy of:

https://wire-frame-erp-dc65.vercel.app/wireframe/

All original pages, data, charts, modals, and SOW content are included.

## Run

```bash
npm install
npm run dev
```

Open **http://localhost:5173/**

Or via Laragon: **http://wireframe.test/** (serves `index.html` + root JS/CSS).

## Exact source files

| File | Size | Contents |
|------|------|----------|
| `index.html` | shell | Header, sidebar, modals |
| `styles.css` | ~100 KB | Full light/dark design system |
| `app.js` | ~1.4 MB | All modules + mock data + CRUD |
| `analytics-core.js` | dashboard analytics |
| `analytics-actions.js` | action handlers |
| `analytics-forecast.js` | Demand Forecast workbench |
| `analytics-warehouse.js` | warehouse analytics |

## Pages (hash routes)

- `#mod8-dash` — Executive Dashboard
- `#mod8-forecast` — Demand & Replenishment Planning
- `#mod8-automation` — Automation & Alerts
- `#mod8-integrations` — Integrations
- `#mod2-products` — Inventory
- `#mod2-warehouse` — Warehouses
- `#mod3-orders` — Orders
- …plus Purchase Orders, Transfers, Shipping, Export Docs, Returns, Courier Audit, Receivables, Profitability, Reports, Company, RBAC, Logs, Config
