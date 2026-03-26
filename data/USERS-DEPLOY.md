# Users file on production (`data/users.json`)

## Why login failed on travelguide.ge

`data/users.json` was gitignored, so it was **never deployed**. The server had **no accounts**, so every login failed and you were redirected with `?error=Invalid%20email%20or%20password` (often unnoticed on the home URL).

## After this fix

- An empty `[]` file ships with the app. **Register again** on production (the **first** user becomes **admin**), **or** replace `users.json` on the server with your local file (hashed passwords only—keep the repo private if you commit real users).

## www vs non-www (`travelguide.ge`)

The session cookie is **host-only**. `www.travelguide.ge` and `travelguide.ge` do **not** share cookies, so you can look logged out when switching hosts, and admin/login can loop.

The app **redirects `www.travelguide.ge` → `https://travelguide.ge`** (308). Bookmarks and DNS should prefer the **apex** host.

## HTML caching

If a CDN or browser caches HTML without respecting cookies, pages can show the wrong signed-in state. Middleware sets **`Cache-Control: private, no-store`** and **`Vary: Cookie`** on HTML responses.

## Multiple instances (`users.json`)

If you run **more than one** app instance without a **shared** `data/` volume, each instance has its **own** `users.json`. The session cookie is valid on all instances, but **`userFromRequest` reloads the user from disk** — if one instance’s file is missing that user id, you appear **logged out** on that request.

Use **one instance** or a **persistent shared disk** for `data/` (or move users to Postgres later).

## DigitalOcean App Platform — persist across redeploys

Without extra setup, a **new deploy can reset** `users.json` to whatever is in git.

1. App → your component → **Edit** → **Storage** (or **Resources** → persistent storage).
2. Add a **persistent volume** mounted at the directory that holds `data/` (often `/workspace/data` for Node builds—confirm `process.cwd()` in logs if unsure).
3. After the first deploy with the volume, upload or recreate `users.json` on that volume, or register once and let the file live on the volume.

## Local development

Copy `users.json` from backup or use **Register** on localhost as usual.
