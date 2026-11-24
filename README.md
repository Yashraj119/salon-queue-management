# Salon Queue Management

## Local development

Install Node.js 22.13 or later, then run `npm install` at the repository root. The install command sets up the root, frontend and backend workspaces.

Run `npm run dev` to start the frontend at `http://localhost:5173` and the API at `http://localhost:3001`. The frontend proxies `/api` and Socket.IO connections to the backend.

Use `npm run typecheck` for TypeScript checks and `npm run build` to build both applications. The backend creates its SQLite database in `server/data/` on first start.

The Express API owns shared application data in SQLite using Node's built-in SQLite module. Socket.IO provides live events to connected browser screens so customer phones, reception tablets and the waiting-area display can receive the same changes without polling.

## Routes

`/` (Home) and `/join` are implemented with live SQLite-backed salon data. `/status/:id`, `/reception`, `/barber/:name`, `/display`, and `/admin` remain themed placeholders for later steps.
