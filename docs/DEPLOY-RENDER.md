# Deploy to Render (production)

Self-contained Fleetify on one Render Web Service + MongoDB Atlas.
No sample fleet seed. Admins are created with `npm run bootstrap:admins`.

## Password rule

App passwords must be **at least 10 characters**.  
`El!e@2026` and `T0n!@2026` are only 9 characters and will be rejected.
Use longer values (example pattern: add one more character), and store them only in Render env / a password manager. Never commit them to git.

## Architecture

| Piece | Where |
| --- | --- |
| MongoDB (replica set) | MongoDB Atlas free M0 |
| API + React UI | One Render **Web Service** (`SERVE_CLIENT=true`) |

Rental completion needs Mongo transactions, so Atlas (replica set) is required. Render’s plain Mongo addon is not enough unless it is a replica set.

---

## 1. Push the repo to GitHub

Commit your latest Fleetify code (including deploy helpers) and push to a GitHub repo Render can access.

Do **not** commit `.env` or real passwords.

---

## 2. Create MongoDB Atlas

1. Sign up at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a **free M0** cluster
3. **Database Access** → add a DB user (username + strong password). Save them.
4. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) for Render (or lock down later)
5. **Connect** → Drivers → copy the URI, e.g.  
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/fleetify?retryWrites=true&w=majority`
6. Put your real password in the URI (URL-encode special characters if needed)

---

## 3. Create the Render Web Service

1. [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect the Fleetify GitHub repo
3. Settings:

| Field | Value |
| --- | --- |
| Name | `fleetify` (or similar) |
| Region | closest to you |
| Runtime | **Node** |
| Root Directory | *(leave empty = repo root)* |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm run start -w @fleetify/server` |
| Instance | Free is fine to start |

4. **Environment** (Environment Variables):

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` *(Render sets this automatically; you can omit)* |
| `MONGODB_URI` | your Atlas URI from step 2 |
| `JWT_SECRET` | long random string (32+ chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_ORIGIN` | `https://YOUR-SERVICE.onrender.com` *(set after first deploy if needed)* |
| `BUSINESS_TIMEZONE` | `Asia/Beirut` *(or your TZ)* |
| `BUSINESS_NAME` | your company name |
| `BUSINESS_ADDRESS` | your address |
| `CURRENCY` | `USD` |
| `SERVE_CLIENT` | `true` |
| `SEED_ON_START` | `false` |
| `LOG_ERRORS` | `true` |

5. Deploy. Wait until the service is **Live**.
6. Open `https://YOUR-SERVICE.onrender.com/api/health` → should return `{"ok":true}`
7. Update `CLIENT_ORIGIN` to that exact `https://…onrender.com` URL and redeploy if you left a placeholder.

---

## 4. Create the two admins (no seed data)

In Render → your service → **Shell** (or local machine with `MONGODB_URI` pointing at Atlas):

```bash
export BOOTSTRAP_SUPERADMIN_EMAIL="elie.barrak@fleetify.com"
export BOOTSTRAP_SUPERADMIN_PASSWORD="YOUR_10+_CHAR_PASSWORD"
export BOOTSTRAP_SUPERADMIN_NAME="Elie Barrak"
export BOOTSTRAP_ADMIN_EMAIL="toni.geagea@fleetify.com"
export BOOTSTRAP_ADMIN_PASSWORD="YOUR_10+_CHAR_PASSWORD"
export BOOTSTRAP_ADMIN_NAME="Toni Geagea"
npm run bootstrap:admins
```

You should see:

```text
Bootstrap complete. Accounts in DB: 2
  SuperAdmin elie.barrak@fleetify.com: created
  Admin toni.geagea@fleetify.com: created
No vehicles/customers/reservations were seeded.
```

Do **not** run `npm run seed` on production.

---

## 5. Sign in

1. Open `https://YOUR-SERVICE.onrender.com`
2. Log in as Elie (SuperAdmin) → you should see **User management**
3. Log in as Toni (Admin) → full fleet access, **no** user management

If the UI shows setup, setup was never closed: run bootstrap again (it upserts), or complete setup once then bootstrap Toni as Admin from User management.

---

## 6. After deploy checklist

- [ ] `/api/health` returns ok
- [ ] Elie can open User management
- [ ] Toni cannot open `/users` (redirects home)
- [ ] Create a vehicle and booking smoke test
- [ ] Errors appear under `server/logs/` on the instance (ephemeral on free Render; download if needed, or set `LOG_DIR` to a disk later)
- [ ] Rotate passwords if they were shared in chat or email

---

## Optional: split Static Site + API

Only if you prefer two Render services:

1. Web Service = API only (`SERVE_CLIENT=false`)
2. Static Site build: `npm install && npm run build -w @fleetify/client`  
   Publish: `client/dist`  
   Env at build time: `VITE_API_BASE_URL=https://YOUR-API.onrender.com`
3. Set API `CLIENT_ORIGIN` to the static site URL

Single-service (`SERVE_CLIENT=true`) is simpler and recommended.
