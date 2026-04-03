# Elivis

**Team, project, and task management focused on real workflows.** Same UI on web and desktop, designed for **self-hosting**.

> 한국어: [README.md](README.md)

For architecture, API details, and build options, see **[`docs/en/`](docs/en/README.md)**.

### Made by

[![Instagram](https://img.shields.io/badge/Instagram-%40hi.kimsunim-E4405F?logo=instagram&logoColor=white)](https://www.instagram.com/hi.kimsunim/)
[![Threads](https://img.shields.io/badge/Threads-%40hi.kimsunim-000000?logo=threads&logoColor=white)](https://www.threads.com/@hi.kimsunim)

---

## What it does

- Create **teams**, invite members, and discuss on a team **community board**.
- Create **projects**, manage members and roles; each person gets a **workspace** (personal task board).
- Tasks support **statuses and priorities**, comments, attachments, notes, and **task requests** (accept / reject).
- **Notifications**: list and mark read over REST; **Socket.IO** pushes live updates.
- On first boot with an **empty database**, the API prints a one-time **setup token** for the initial admin.

---

## Tech stack (summary)

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces, Turborepo |
| Web | Next.js 16, React 19, Tailwind CSS |
| Desktop | Electron 41 |
| API | Fastify 5, Node.js 24+ |
| Notifications | Socket.IO, Redis pub/sub |
| Database | PostgreSQL 16, Prisma 6 |
| Cache / sessions | Redis 7 |
| Auth | JWT (access / refresh) + RBAC |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 24.14.0+ (see `package.json` `engines`) |
| pnpm | 9.x (`corepack enable` recommended) |
| Docker Desktop | Latest (local PostgreSQL & Redis) |

---

## Quick start

```bash
git clone https://github.com/haeinkkk/elivis.git
cd elivis
```

**1. Environment**

```bash
# macOS / Linux
cp env.example .env

# Windows (PowerShell)
Copy-Item env.example .env
```

Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to long random values (e.g. `openssl rand -hex 32`).

**2. One-shot setup**

```bash
pnpm setup
```

- `pnpm install`
- `docker compose up -d --wait` → PostgreSQL + Redis
- `prisma generate` + `prisma migrate dev` via `@repo/database` `db:setup`

**3. Development**

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| REST API | http://localhost:4000 |
| Notifications (Socket.IO) | http://localhost:4001 (web uses `NEXT_PUBLIC_NOTIFICATION_URL`) |
| Desktop | Electron window (starts after web is ready with `pnpm dev`) |

---

## Usage (product view)

1. **First account** — When there are no users, the API logs a `SETUP TOKEN`. Sign up with `setupToken` in the body to create **SUPER_ADMIN**. After that, normal signup / invite flows apply. ([Details: `docs/en/server/README.md` — Bootstrap](docs/en/server/README.md#bootstrap-super_admin))

2. **Browser** — Open http://localhost:3000 and sign in. Teams, projects, my work, notifications, and settings live under the App Router. ([`docs/en/web/README.md`](docs/en/web/README.md))

3. **Desktop** — With the web dev server on port 3000, `pnpm dev` also launches Electron. For installers, run the static web build then package the desktop app. ([`docs/en/desktop/README.md`](docs/en/desktop/README.md))

4. **Admins** — `SUPER_ADMIN` uses the admin UI for users and roles. ([`docs/en/server/README.md`](docs/en/server/README.md))

5. **Production** — Prepare `.env.production` and use the production Docker Compose flow. ([`docs/en/server/README.md` — Production](docs/en/server/README.md#production-builds))

---

## Common commands

| Command | Description |
|---------|-------------|
| `pnpm setup` | Install + Docker + DB migrations |
| `pnpm dev` | Web, API, notifications, desktop in dev mode |
| `pnpm dev:web` / `pnpm dev:server` / `pnpm dev:notification` / `pnpm dev:desktop` | Single app |
| `pnpm build` | Build all packages |
| `pnpm build:desktop` | Static web + Electron installer |
| `pnpm start` | After build: web + API + notification servers |
| `pnpm db:studio` | Prisma Studio |
| `pnpm docker:dev:*` / `pnpm docker:prod:*` | Docker helpers |

---

## Repository layout (summary)

```
apps/
  web/
  desktop/
  server/
    apiServer/
    notificationServer/
packages/
  database/
  ui/, types/, i18n/
docs/           # Detailed docs (Korean: docs/, English: docs/en/)
```

---

## Documentation

- [English index](docs/en/README.md)
- [Server & API](docs/en/server/README.md)
- [Web app](docs/en/web/README.md)
- [Desktop](docs/en/desktop/README.md)
- [한국어 문서](docs/README.md)

---

## Contributing

Issues and PRs are welcome. For larger changes, opening an issue first helps align direction.

1. Fork and create a branch  
2. Commit and push  
3. Open a pull request

---

## License

MIT License

Copyright (c) 2026 Elivis Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
