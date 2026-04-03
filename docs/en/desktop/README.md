# Desktop — `apps/desktop`

Electron 41 desktop shell.  
In development it loads the Next.js dev server at `http://localhost:3000`.  
In production it bundles the static web output from `apps/web/out`.

The packaged app uses the same API and notification URLs as the web client; root `.env` values for `NEXT_PUBLIC_*` are baked in at web build time.

## Table of contents

- [Tech stack](#tech-stack)
- [Directory layout](#directory-layout)
- [Development](#development)
- [Production build](#production-build)
- [Electron architecture](#electron-architecture)
- [Troubleshooting (Windows)](#troubleshooting-windows)

---

## Tech stack

| Item | Version |
|------|---------|
| Electron | 41.1.0 |
| electron-builder | 26.8.1 |
| Node.js | 24+ |
| TypeScript | 5.x |

---

## Directory layout

```
apps/desktop/
├── src/
│   ├── main.ts         # Main process
│   └── preload.ts      # Preload (context bridge)
├── dist/               # Compiled JS (after build)
├── release/            # Installer / portable output
└── electron-builder.yml
```

---

## Development

> **Prerequisite:** the web dev server (`localhost:3000`) must be running.

Recommended — run web, API, notifications, and desktop together:

```bash
pnpm dev
```

Desktop only (web dev server already up):

```bash
pnpm dev:desktop
# or
pnpm --filter @repo/desktop dev
```

The dev script waits on `wait-on tcp:127.0.0.1:3000` before starting Electron.

---

## Production build

### Step 1: static web build

```bash
pnpm --filter web build:static
# output: apps/web/out/
```

### Step 2: package Electron

```bash
pnpm build:desktop
# output: apps/desktop/release/
```

`electron-builder.yml` copies `apps/web/out/` into the app as `web-out/`.

### Artifacts

| File | Description |
|------|-------------|
| `release/*-Setup.exe` | NSIS installer (Windows) |
| `release/*-Portable.exe` | Portable executable |

---

## Electron architecture

### Dev vs production loading

```typescript
// main.ts
if (app.isPackaged) {
  // Production: load bundled static files
  const webOutDir = path.join(process.resourcesPath, "web-out");
  win.loadFile(path.join(webOutDir, "index.html"));
} else {
  // Development: Next.js dev server
  win.loadURL("http://localhost:3000");
}
```

### preload.ts

Exposes a minimal, safe API to the renderer via the context bridge with `contextIsolation: true`.

---

## Troubleshooting (Windows)

### `Cannot create symbolic link`

You may see this when running `electron-builder`:

```
ERROR: Cannot create symbolic link
```

**Fix: enable Windows Developer Mode**

1. Open **Settings** → **Update & Security** → **For developers**  
   (Windows 11: **Settings** → **System** → **For developers**)
2. Turn on **Developer Mode**.
3. Reboot and rebuild.

> Developer Mode allows creating symbolic links without elevated privileges.

---

### Electron shows a blank window

- Ensure the web dev server on `localhost:3000` is running.
- Running `pnpm dev` starts everything and `wait-on` handles ordering.

---

### `ENOENT: no such file or directory` during packaging

- Confirm `apps/web/out/` exists.
- Run `pnpm --filter web build:static` before `pnpm build:desktop`.
