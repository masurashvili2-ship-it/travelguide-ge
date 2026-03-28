# Production auth & `data/users.json`

## `SESSION_SECRET` scope on App Platform

Variables with scope **BUILD_TIME** are **not** available to the running Node server. The app reads `process.env.SESSION_SECRET` **on each request**, so set **`SESSION_SECRET` with scope RUN_TIME** (or use an **app-level** variable, which is available at runtime unless a component overrides it).

See: [How to Use Environment Variables in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/) (build-time vs runtime).

If the secret is missing or too short at runtime, logs show `[auth] SESSION_SECRET missing…` and the app falls back to an insecure default.

## `users.json` is not in git

`data/users.json` is **gitignored** so a push to GitHub **never overwrites** production accounts with an empty file.

- **Local:** copy `data/users.json.example` to `data/users.json` (starts as `[]`), then register, or paste a backup.
- **Production:** mount a **persistent volume** on `data/` (see below). On first boot, if the file is missing, the app treats it as no users until someone registers (first user becomes **admin**).

## www vs non-www (`travelguide.ge`)

The session cookie is **host-only**. `www.travelguide.ge` and `travelguide.ge` do **not** share cookies, so you can look logged out when switching hosts, and admin/login can loop.

The app **redirects `www.travelguide.ge` → `https://travelguide.ge`** (308). Bookmarks and DNS should prefer the **apex** host.

## HTML caching

If a CDN or browser caches HTML without respecting cookies, pages can show the wrong signed-in state. Middleware sets **`Cache-Control: private, no-store`** and **`Vary: Cookie`** on HTML responses.

## Multiple instances

Session cookies embed **user id, email, and role** in a signed token, so staying logged in does **not** require each instance to share `users.json` reads on every request.

You still need **`users.json` on shared storage** (or a single instance) so **login, register, and password checks** see the same data.

## DigitalOcean App Platform — persist `data/` and uploads

Without extra setup, redeploys use an **ephemeral** filesystem.

1. **Users (and optional JSON content)** — add a **persistent volume** mounted at the app’s **`data/`** directory (confirm `process.cwd()` in your build; often `/workspace/data` or similar).
2. **Uploaded tour / what-to-do images** — **required** if you run **more than one worker/instance**:

   The Node adapter serves static files from `dist/client` **before** SSR. User uploads are written under `dist/client/uploads/…` on **one** instance only. With a load balancer, each refresh can hit a different instance — images **appear and disappear at random** unless uploads live on **shared** storage.

   **Fix:** set **`UPLOAD_ROOT`** (runtime) to a path on a **persistent volume** that contains subfolders `tours` and `what-to-do`. The app entrypoint `scripts/node-with-uploads.mjs` serves `/uploads/…` from that directory **before** the static handler runs, so every instance reads the same files.

   **Alternative:** scale the web component to **1 instance** (no load balancing) until you add a volume.

Set in App → Environment (runtime):

- `UPLOAD_ROOT` — shared base dir for `tours/` and `what-to-do/` (recommended)
- `TOUR_UPLOAD_DIR` / `WTD_UPLOAD_DIR` — optional full paths overriding each kind

See `.env.example`. Production **`npm start`** runs `scripts/node-with-uploads.mjs` (not `dist/server/entry.mjs` directly).

## Coolify (Nixpacks)

Redeploys use a **fresh container filesystem** unless JSON data and uploads live on a **persistent volume**.

1. In Coolify → your application → **Persistent Storage**, add a volume and note the **mount path** (often like `/data/coolify/applications/<uuid>`).
2. Set **runtime** environment variables:
   - **`DATA_DIR`** = that mount path (same value at build + runtime is fine).
   - **`UPLOAD_ROOT`** = optional. If omitted, the app uses **`${DATA_DIR}/uploads`** automatically.
3. **Start command** must be production Node, not `astro dev`. This repo’s **`package.json`** `start` script runs **`node ./scripts/node-with-uploads.mjs`** — use **`npm start`** or that command explicitly.
4. On boot, logs should include: **`[travelguide] persistent paths: DATA_DIR=… uploads=…`**. If you see **`DATA_DIR not set`**, the app is still using ephemeral `./data` and data will reset when the container is replaced.
5. Name the session variable **`SESSION_SECRET`** exactly (not `ESSION_SECRET`). It must be available at **runtime** (min 16 characters).

After the first successful deploy with a volume, copy/restore any JSON backups into `DATA_DIR` if you are migrating from an old server.

## Local development

Copy `users.json` from backup or use **Register** on localhost as usual. If the file is missing, start from `data/users.json.example`.
