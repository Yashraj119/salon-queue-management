# Salon Queue Management
**Live demo:** `<url>`

Replace `<url>` with the production Vercel URL after the first successful deployment.

## Local development

Install Node.js 22.13 or later, then run `npm install` at the repository root.

For the Vite development proxy, create the git-ignored file `client/.env.development.local` with `VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:3001`. Then run `npm run dev` to start the frontend on port `5173` and the Express API on port `3001`; Vite forwards `/api` and Socket.IO traffic to the backend. This target is used only by Vite's development server.

Use `npm run typecheck` and `npm run build` to check both workspaces. The backend creates its SQLite file under `server/data/` unless `DATABASE_PATH` is set.

## Production deployment

This repository is a monorepo with a static Vite frontend and a separate Express + Socket.IO API. Deploy the frontend to Vercel and the backend to one Render or Railway web service. Keep the SQLite database file on that backend service's persistent storage.

### 1. Deploy the backend

Push the repository to GitHub, then create a web service from it on Render or Railway. Use the repository root as the service root directory so the root workspace lockfile is used.

Use these commands:

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build --prefix server` |
| Start command | `npm run start --prefix server` |
| Health check path | `/api/health` |

Set these service variables. You can leave `WEB_ORIGIN` unset for this initial backend deploy; add it after creating the Vercel project and obtaining its production URL.

| Variable | Value |
| --- | --- |
| `HOST` | `0.0.0.0` |
| `DATABASE_PATH` | The persistent volume path described below, ending in `salon-queue.sqlite` |
| `WEB_ORIGIN` | The exact Vercel production origin, such as `https://your-project.vercel.app` (no trailing slash) |

The platform provides `PORT`; the server reads it automatically. Do not set a fixed port in production.

**Render:** create a Web Service, keep Root Directory blank, use the commands above, and attach a persistent disk mounted at `/var/data`. Set `DATABASE_PATH=/var/data/salon-queue.sqlite`. Render's default filesystem is ephemeral, so SQLite data would be lost on restart or redeploy without the disk. Render persistent disks require a paid service and disable zero-downtime deploys. Keep this SQLite-backed service to one instance.

**Railway:** create a service from the GitHub repo, leave the service root at the repository root, and use the commands above. In the service's Settings → Volumes, add a volume mounted at `/data`, then set `DATABASE_PATH=/data/salon-queue.sqlite`. Railway's regular container filesystem is ephemeral; the attached volume preserves the SQLite file. Keep this service to one replica because SQLite is a local file, not a shared database.

After deployment, copy the backend's public HTTPS URL. Check that `https://<backend-domain>/api/health` returns `{"status":"ok","database":"ok"}`.

### 2. Deploy the frontend to Vercel

Import the same GitHub repository into Vercel. Configure the project with the repository root as Root Directory and the Vite framework preset.

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build --prefix client` |
| Output directory | `client/dist` |

Add `VITE_API_BASE_URL` to the Vercel Production environment and set it to the backend's public HTTPS origin, with no trailing slash. This is a public build-time URL, not a secret. Redeploy after changing it.

`vercel.json` rewrites unknown paths to `index.html`, allowing React Router to load routes such as `/status/demo` directly and on refresh. Verify by opening the Vercel URL with `/status/demo` appended and refreshing the page.

### 3. Allow the Vercel origin on the API

Copy the Vercel production origin (scheme and hostname only, no path or trailing slash) into the backend's `WEB_ORIGIN` variable, then redeploy the backend. The API and Socket.IO server use this origin for CORS. If you later use a custom frontend domain, update `WEB_ORIGIN` to that domain and redeploy.

### 4. Verify the live deployment

1. Open `https://<backend-domain>/api/health`; confirm the API and SQLite report `ok`.
2. Open the Vercel domain; confirm Home loads service/barber data and the Join Queue link works.
3. Open `/join`, select services, submit a test entry, and confirm the queue summary updates.
4. Refresh `/status/demo` directly to confirm the Vercel SPA rewrite serves the app shell.
5. Check the backend logs and browser console for CORS or Socket.IO connection errors.

The current implementation uses Node's built-in SQLite API. Keep the backend runtime at Node 22.13 or later, as required by `server/package.json`.

## Routes

`/` (Home) and `/join` are implemented. `/status/:id`, `/reception`, `/barber/:name`, `/display`, and `/admin` remain themed placeholders for later steps.
