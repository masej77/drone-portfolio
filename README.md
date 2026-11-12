# MAXIO AERIAL — Drone Pilot Portfolio (`drone-portfolio`)

An interactive commercial drone pilot portfolio built for **Cloudflare Workers + Static Assets + Cloudflare D1**.

## Features
- **Aerial Drone Camera Engine**: Starts at a `120m ASL` top-down coastal overview with organic gimbal hover physics and zooms directly into terrain landmarks:
  - **01 / About (`32m ASL`)** — Hillside Command Studio
  - **02 / Services (`45m ASL`)** — Wind Turbine Ridge
  - **03 / Contact (`18m ASL`)** — Coastal Harbor Landing Zone
- **Cloudflare D1 Database Integration**:
  - `GET /api/status`: Reads live pilot flight availability, optional `motd`, and total logged mission count from Cloudflare D1 (`env.DB`).
  - `POST /api/contact`: Logs new flight dispatch requests directly into the `inquiries` table in Cloudflare D1 (`env.DB`), automatically creating the schema on first run if needed.

## Project Structure
```text
├── public/
│   ├── index.html       # Drone HUD & waypoint panels
│   ├── styles.css       # Optical viewfinder & responsive layout
│   ├── app.js           # Camera zoom/pan engine & D1 API client
│   └── aerial-world.jpg # High-resolution aerial coastal terrain
├── src/
│   └── worker.js        # Cloudflare Worker + D1 API routes
├── schema.sql           # Optional explicit D1 SQL schema migration
└── wrangler.jsonc       # Cloudflare Worker & D1 binding config
```

## Deploying to Cloudflare
1. Connect this repository (`masej77/drone-portfolio`) to **Cloudflare Workers & Pages**, or deploy via CLI:
   ```bash
   npx wrangler deploy
   ```
2. *(Optional)* Run the SQL migration manually against D1 (note: `src/worker.js` also auto-initializes the tables automatically on first request):
   ```bash
   npx wrangler d1 execute maxio-sample1-db --file=./schema.sql
   ```
