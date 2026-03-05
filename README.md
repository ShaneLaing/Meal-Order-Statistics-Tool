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

## 4) Optional: Connect to Google Apps Script backend

The frontend currently uses a hardcoded Apps Script URL in:

- `src/App.tsx` (`APP_SCRIPT_WEB_APP_URL`)

If you want cloud sync:

1. Open `backend/Code.js` in Google Apps Script.
2. Replace `SPREADSHEET_ID` with your own Google Sheet ID.
3. Deploy as **Web App**:
	- Execute as: **Me**
	- Access: **Anyone**
4. Copy the deployed Web App URL.
5. Paste it into `src/App.tsx` as `APP_SCRIPT_WEB_APP_URL`.
6. Restart `pnpm dev`.

If `APP_SCRIPT_WEB_APP_URL` is empty/invalid, the app still runs in local mock mode (no cloud persistence).

## 5) Useful Commands

```bash
pnpm lint
pnpm deploy
```

Note: The `clean` script uses `rm -rf dist`, which may not work in default Windows PowerShell. On Windows, use:

```powershell
Remove-Item -Recurse -Force dist
```
