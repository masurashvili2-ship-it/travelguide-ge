# Users file on production (`data/users.json`)

## Why login failed on travelguide.ge

`data/users.json` was gitignored, so it was **never deployed**. The server had **no accounts**, so every login failed and you were redirected with `?error=Invalid%20email%20or%20password` (often unnoticed on the home URL).

## After this fix

- An empty `[]` file ships with the app. **Register again** on production (the **first** user becomes **admin**), **or** replace `users.json` on the server with your local file (hashed passwords only—keep the repo private if you commit real users).

## DigitalOcean App Platform — persist across redeploys

Without extra setup, a **new deploy can reset** `users.json` to whatever is in git.

1. App → your component → **Edit** → **Storage** (or **Resources** → persistent storage).
2. Add a **persistent volume** mounted at the directory that holds `data/` (often `/workspace/data` for Node builds—confirm `process.cwd()` in logs if unsure).
3. After the first deploy with the volume, upload or recreate `users.json` on that volume, or register once and let the file live on the volume.

## Local development

Copy `users.json` from backup or use **Register** on localhost as usual.
