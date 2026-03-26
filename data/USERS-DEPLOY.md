# Production auth & `data/users.json`

## `SESSION_SECRET` scope on App Platform

Variables with scope **BUILD_TIME** are **not** available to the running Node server. The app reads `process.env.SESSION_SECRET` **on each request**, so set **`SESSION_SECRET` with scope RUN_TIME** (or use an **app-level** variable, which is available at runtime unless a component overrides it).

See: [How to Use Environment Variables in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/) (build-time vs runtime).

If the secret is missing or too short at runtime, logs show `[auth] SESSION_SECRET missing…` and the app falls back to an insecure default.

## Why login failed on travelguide.ge (historical)

`data/users.json` was gitignored, so it was **never deployed**. The server had **no accounts**, so every login failed and you were redirected with `?error=Invalid%20email%20or%20password` (often unnoticed on the home URL).

## After this fix

- An empty `[]` file ships with the app. **Register again** on production (the **first** user becomes **admin**), **or** replace `users.json` on the server with your local file (hashed passwords only—keep the repo private if you commit real users).

## www vs non-www (`travelguide.ge`)

The session cookie is **host-only**. `www.travelguide.ge` and `travelguide.ge` do **not** share cookies, so you can look logged out when switching hosts, and admin/login can loop.

The app **redirects `www.travelguide.ge` → `https://travelguide.ge`** (308). Bookmarks and DNS should prefer the **apex** host.

## HTML caching

If a CDN or browser caches HTML without respecting cookies, pages can show the wrong signed-in state. Middleware sets **`Cache-Control: private, no-store`** and **`Vary: Cookie`** on HTML responses.

## Multiple instances

New session cookies embed **user id, email, and role** in a signed token, so **staying logged in no longer depends on each instance having the same `users.json`**.

You still need **`users.json` consistent** (or shared storage) for **login, register, and password checks**. Use a **persistent disk** on `data/` if those writes must survive redeploys.

## DigitalOcean App Platform — persist across redeploys

Without extra setup, a **new deploy can reset** `users.json` to whatever is in git.

1. App → your component → **Edit** → **Storage** (or **Resources** → persistent storage).
2. Add a **persistent volume** mounted at the directory that holds `data/` (often `/workspace/data` for Node builds—confirm `process.cwd()` in logs if unsure).
3. After the first deploy with the volume, upload or recreate `users.json` on that volume, or register once and let the file live on the volume.

## Local development

Copy `users.json` from backup or use **Register** on localhost as usual.
