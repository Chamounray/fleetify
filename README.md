# Fleetify

Self-contained car rental and fleet operations platform. Local JWT auth, MongoDB, and print/PDF documents. No third-party APIs.

## Stack

- API: Node.js, Express, TypeScript, Mongoose
- App: React, Vite, Tailwind CSS
- Database: MongoDB 7 replica set (required for rental-completion transactions)

## Design

Dense operations dashboard for rental admins. Navy/slate palette, blue action color `#0369A1`, Plus Jakarta Sans, Phosphor icons. Motion is limited to 180ms state feedback and honors `prefers-reduced-motion`.

## Local setup (Windows)

1. Copy environment values:

```powershell
copy .env.example .env
```

2. Start MongoDB replica set:

```powershell
docker compose up -d
```

Wait until the healthcheck finishes `rs.initiate`. Host port is **27018** so Fleetify does not collide with other local Mongo instances on 27017. Connection string:

`mongodb://127.0.0.1:27018/fleetify?directConnection=true`

Rental completion uses Mongo transactions, so this replica-set container is required.

3. Install and run:

```powershell
npm install
npm run dev:server
npm run dev:client
```

- API: http://127.0.0.1:4000
- App: http://localhost:5173

4. First admin: open the app and use `/setup`. The setup route refuses a second admin.

Optional seed (creates admin only if none exists, plus sample fleet data):

```powershell
npm run seed
```

Seed admin defaults from `.env`: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev:server` | API with reload |
| `npm run dev:client` | Vite admin app |
| `npm test` | API integration tests + UI tests |
| `npm run lint` | Typecheck server and client |
| `npm run build` | Production builds |
| `npm run seed` | Local sample data |
| `npm run docs:smoke` | PDF renderer smoke test |

## Security notes

- Keep `JWT_SECRET` local and long.
- CORS is limited to `CLIENT_ORIGIN`.
- Money is stored as integer cents. Booking totals are recomputed on the server.

## Data backup

Mongo data lives in the Docker volume `fleetify_fleetify_mongo_data`. Export before deleting containers:

```powershell
docker exec fleetify-mongo mongodump --archive=/data/db/fleetify.archive --db=fleetify
docker cp fleetify-mongo:/data/db/fleetify.archive .\fleetify.archive
```

Restore with `mongorestore --archive` against the same replica-set container. Do not delete the volume unless you have a dump.

## Core rules

- Date overlap is blocked by unique `{ vehicleId, date }` availability slots.
- Rental return updates odometer, runs the maintenance engine, and writes alerts in one Mongo transaction.
- Blacklisted customers cannot be booked. Unpaid balances and open incidents require an explicit acknowledgement.
