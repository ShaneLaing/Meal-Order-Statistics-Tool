# Meal Order Statistics Tool

This project is a Vite + React + TypeScript app for meal ordering and order statistics.

## 1) Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm (recommended for this project because `pnpm-lock.yaml` exists)

Install pnpm globally if needed:

```bash
npm install -g pnpm
```

## 2) Activate (Run Locally)

From the project root:

```bash
pnpm install
pnpm dev
```

After startup, open:

- `http://localhost:3000`

The dev server is configured in `package.json` as `vite --port=3000 --host=0.0.0.0`.

## 3) Build for Production

```bash
pnpm build
pnpm preview
```

## 4) Connect to Google Apps Script backend

The backend lives in `backend/Code.js` and writes back to a single Google Sheet with three tabs. **The schema is fixed** — change column order or sheet names and the backend stops working.

| Sheet | Columns | Notes |
|---|---|---|
| `Menu` | A=餐點名稱, B=餐點價錢 | name 為唯一鍵 |
| `OrdersSummary` | A=訂單時間, B=訂單姓名, C=餐點名稱, D=餐點數量, E=餐點價錢(小計), F=訂單總計 | (filler_name, timestamp) 複合鍵；多餐點同 key 多列 |
| `Config` | A=`截止時間`, B=`Date` (例: `2026/4/30 15:00:00`) | substring 匹配 `截止時間` |

Setup:

1. Open `backend/Code.js` in Google Apps Script.
2. Replace `SPREADSHEET_ID` with your own Google Sheet ID.
3. Make sure the three tabs above exist with the listed columns.
4. Deploy as **Web App**:
   - Execute as: **Me**
   - Access: **Anyone**
5. Copy the deployed Web App `/exec` URL.
6. Create `.env.local` from `.env.example` and set:
   ```
   VITE_APP_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec
   ```
7. Restart `pnpm dev`.

If `VITE_APP_SCRIPT_WEB_APP_URL` is empty, the app runs in mock mode (state in memory only).

### Backend behaviour

- **Order CRUD** (`upsertOrder` / `deleteOrder`) is gated by `Config.截止時間`. Past the deadline the backend returns `{ success: false, error: 'PAST_DEADLINE' }` and the frontend disables the buttons + shows a banner.
- **Menu CRUD** (`upsertMenu` / `deleteMenu`) is **not** gated — admins can edit the menu after orders close.
- The frontend auto-refreshes the menu every 60 seconds and on `window.focus`. A **重載菜單** button on the order form forces an immediate refresh.

### In-app menu admin

The page bottom has an **進階設定 — 菜單管理** panel. Expand it to add, edit, rename, or delete menu items; changes write straight back to the `Menu` worksheet.

## 5) Deploy to GitHub Pages

This repo includes `.github/workflows/deploy.yml` which builds & deploys to GitHub Pages on every push to `main`.

Setup once on GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Name: `VITE_APP_SCRIPT_WEB_APP_URL`
   - Value: your Apps Script `/exec` URL.
   *(Optional — the workflow falls back to the URL committed in `.env.example`.)*
3. Push to `main` → site appears at `https://<user>.github.io/Meal-Order-Statistics-Tool/`.

The `base` path in `vite.config.ts` is set to `/Meal-Order-Statistics-Tool/`. **If you fork to a repo with a different name, update `base` to match `/<your-repo>/`** or asset URLs will 404.

Manual deploy fallback (uses `gh-pages` branch):

```bash
pnpm build
pnpm deploy
```

## 6) Useful Commands

```bash
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
pnpm preview      # preview the production build
pnpm deploy       # publish dist via gh-pages
```

Note: The `clean` script uses `rm -rf dist`, which may not work in default Windows PowerShell. On Windows, use:

```powershell
Remove-Item -Recurse -Force dist
```
