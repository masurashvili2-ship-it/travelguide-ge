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

## Coolify — persistent data (pushing code does **not** wipe the volume)

Git push only rebuilds the **image** and replaces the **container**. Your JSON “databases” and uploads are wiped on redeploy **only** when the app still writes to **ephemeral** paths inside the container (`/app/data`, etc.). Fixing that is **configuration**, not a code change: the app already uses `DATA_DIR` and `UPLOAD_ROOT` when you set them.

### 1. Persistent Storage mount path = `DATA_DIR`

1. Coolify → **your application** → **Persistent Storage** → add a volume.
2. Set the volume **destination / mount path** in the container to exactly the directory you will use as `DATA_DIR`, for example `/data/coolify/applications/<uuid>` (Coolify usually shows the full path when you create storage).
3. **Critical:** `DATA_DIR` in environment variables must be the **same path** as that mount. If they differ, the app writes to a folder that is **not** on the volume → every redeploy looks like a “database wipe”.

### 2. Environment variables (runtime)

Set at least:

| Variable        | Example value |
|-----------------|---------------|
| `DATA_DIR`      | `/data/coolify/applications/<your-app-uuid>` |
| `UPLOAD_ROOT`   | `/data/coolify/applications/<your-app-uuid>/uploads` (optional but explicit is fine) |

- If you **omit** `UPLOAD_ROOT`, the app uses **`${DATA_DIR}/uploads`** automatically (`src/lib/upload-root.ts`).
- **`SESSION_SECRET`**: runtime, min 16 characters, exact name `SESSION_SECRET`.
- Prefer marking **`DATA_DIR` / `UPLOAD_ROOT` as runtime-only** if Coolify distinguishes build vs runtime (build does not need the volume to exist).

### 3. Start command

Use production Node, not `astro dev`. Default Docker **`CMD`** is `node ./scripts/node-with-uploads.mjs` (same as **`npm start`**). Do not point Coolify at `dist/server/entry.mjs` alone — you would skip upload serving and data seeding.

### 4. Verify after deploy

Open application **logs** on boot. You should see:

`[travelguide] persistent paths: DATA_DIR=/data/coolify/applications/… uploads=…`

- If you see **`DATA_DIR not set`**, the server is still using **`./data` inside the container** → that folder is recreated empty on every deploy.

You may also see **`[data-seed] seeded …`** lines: on first run, missing files are copied from the image’s baked-in `/app/data` into `DATA_DIR` only if they **don’t** already exist on the volume (existing production files are never overwritten).

### 5. One-time migration (data only lived on old container disk)

If you already had live data under `/app/data` **before** attaching the volume:

1. Open a **terminal / exec** into the **old** container (or restore a backup of `/app/data` and `uploads`).
2. Copy onto the volume (paths illustrative — use your real `DATA_DIR`):

   `cp -a /app/data/. "$DATA_DIR/"`

3. If uploads were under `/app/dist/client/uploads` or similar, merge them into **`$UPLOAD_ROOT`** (or `$DATA_DIR/uploads`) preserving subfolders `tours`, `what-to-do`, `regions`, `guides`, `packages`.

After this, redeploys keep using the same volume.

## Local development

Copy `users.json` from backup or use **Register** on localhost as usual. If the file is missing, start from `data/users.json.example`.
