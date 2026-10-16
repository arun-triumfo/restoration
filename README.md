# RugOS — Frontend + Backend (Phase 1)

## Structure

- `Frontend/` — Restoration Rugs wireframe (Vite)
- `Backend/` — Express + MongoDB API (`rugos_erp`)

## Prerequisites

- Node.js
- MongoDB on `127.0.0.1:27017`  
  If the Windows service cannot start, run a local mongod:
  ```bash
  "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath Backend\data\db --port 27017 --bind_ip 127.0.0.1
  ```

## Start

```bash
# Terminal 1 — API
cd Backend
npm install
npm run seed
npm run dev

# Terminal 2 — UI
cd Frontend
npm install
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:5000/api/health
- DB: `rugos_erp` (SKUs + Orders only in Phase 1)

## Phase 1 scope

Dynamic Mongo-backed **list / add / edit / delete** for:

- Products (SKUs)
- Orders

No auth yet. Other modules still use in-memory wireframe data.
