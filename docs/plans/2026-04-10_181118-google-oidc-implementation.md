# Google Workspace OIDC Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Elivis에 기존 local/LDAP 로그인을 유지한 채, env 기반 Google Workspace OIDC 로그인 옵션을 추가하고 허용 도메인/부트스트랩/SUPER_ADMIN 정책까지 안전하게 적용한다.

**Architecture:** Fastify API 서버가 Google OIDC authorization code flow(+ PKCE, state, nonce)를 직접 처리하고, one-time completion ticket을 통해 Next web 앱이 기존 httpOnly access/refresh cookie를 설정한다. Google 로그인은 env 설정이 유효하고 최소 1명의 SUPER_ADMIN 이 존재할 때만 공개되며, Google 계정은 `googleSub` 로 식별하고 기존 LOCAL/LDAP 계정과 자동 병합하지 않는다.

**Tech Stack:** Fastify, Next.js App Router, Prisma/PostgreSQL, Redis, bcryptjs, pnpm workspace, Turbo, OIDC client library(예: `openid-client`), Vitest(신규 테스트 인프라)

---

## Context to read first
- Spec: `docs/superpowers/specs/2026-04-10-google-oidc-design.md`
- API auth routes: `apps/server/apiServer/src/routes/auth.routes.ts`
- API auth controller: `apps/server/apiServer/src/controllers/auth.controller.ts`
- Auth config service: `apps/server/apiServer/src/services/auth-config.service.ts`
- User password policy: `apps/server/apiServer/src/controllers/user.controller.ts`
- Web login page: `apps/web/src/app/login/page.tsx`
- Web login client: `apps/web/src/app/login/LoginPageClient.tsx`
- Web auth server helpers: `apps/web/src/lib/server/auth.server.ts`
- Web proxy/public paths: `apps/web/src/proxy.ts`
- User profile UI type: `packages/ui/src/types/user-profile.ts`
- Prisma schema: `packages/database/prisma/schema.prisma`
- i18n locales: `packages/i18n/src/locales/ko.ts`, `packages/i18n/src/locales/en.ts`, `packages/i18n/src/locales/ja.ts`

## Validation commands to use throughout
- Install deps after package changes: `pnpm install`
- API type-check: `pnpm --filter @repo/api-server type-check`
- Web type-check: `pnpm --filter web type-check`
- Workspace type-check: `pnpm type-check`
- API lint: `pnpm --filter @repo/api-server lint`
- Web lint: `pnpm --filter web lint`
- Workspace lint: `pnpm lint`
- Workspace build: `pnpm build`
- New server tests (after adding script): `pnpm --filter @repo/api-server test`
- New web tests (after adding script): `pnpm --filter web test`

## Implementation principles
- No production code before a failing test for that behavior.
- Keep scope to Google OIDC only; do not generalize to multiple providers.
- Prefer small reusable helpers over spreading OIDC logic across controller files.
- Never expose access/refresh token in redirect URL.
- Keep user-facing password messaging provider-agnostic for external auth (`LDAP`, `GOOGLE`).

---

### Task 1: Add minimal test infrastructure for API and web packages

**Objective:** Introduce a lightweight test runner so the remaining tasks can follow TDD instead of relying only on manual checks.

**Files:**
- Modify: `package.json`
- Modify: `apps/server/apiServer/package.json`
- Modify: `apps/web/package.json`
- Create: `vitest.workspace.ts`
- Create: `apps/server/apiServer/vitest.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/server/apiServer/src/test/setup.ts`
- Create: `apps/web/src/test/setup.ts`

**Step 1: Write failing smoke tests for the future test commands**

Create empty smoke tests first:
- `apps/server/apiServer/src/test/smoke.test.ts`
- `apps/web/src/test/smoke.test.ts`

Example server smoke test:
```ts
import { describe, expect, it } from "vitest";

describe("server test setup", () => {
  it("runs vitest", () => {
    expect(true).toBe(true);
  });
});
```

Example web smoke test:
```ts
import { describe, expect, it } from "vitest";

describe("web test setup", () => {
  it("runs vitest", () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run tests to verify failure**

Run:
```bash
pnpm --filter @repo/api-server test
pnpm --filter web test
```

Expected: FAIL — test script/config not found.

**Step 3: Add minimal Vitest setup**

Update root/package scripts and add dev dependency examples:
```json
{
  "scripts": {
    "test": "turbo run test"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Update package scripts:
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

Minimal server config:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
```

Minimal web config:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

**Step 4: Run tests to verify pass**

Run:
```bash
pnpm install
pnpm --filter @repo/api-server test
pnpm --filter web test
```

Expected: PASS — smoke tests pass.

**Step 5: Commit**

```bash
git add package.json apps/server/apiServer/package.json apps/web/package.json vitest.workspace.ts apps/server/apiServer/vitest.config.ts apps/web/vitest.config.ts apps/server/apiServer/src/test/setup.ts apps/web/src/test/setup.ts apps/server/apiServer/src/test/smoke.test.ts apps/web/src/test/smoke.test.ts
git commit -m "test: add vitest workspace setup"
```

---

### Task 2: Add Prisma fields and shared provider types for Google accounts

**Objective:** Extend the data model and shared types so Google accounts can be stored and surfaced safely.

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Modify: `packages/ui/src/types/user-profile.ts`
- Modify: `apps/server/apiServer/src/controllers/auth.controller.ts`
- Modify: `apps/server/apiServer/src/controllers/user.controller.ts`
- Test: `apps/server/apiServer/src/controllers/auth-provider-types.test.ts`

**Step 1: Write failing tests for provider/type coverage**

Create `apps/server/apiServer/src/controllers/auth-provider-types.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("auth provider support plan guard", () => {
  it("documents GOOGLE as a supported external provider", () => {
    const supported = ["LOCAL", "LDAP", "GOOGLE"];
    expect(supported).toContain("GOOGLE");
  });
});
```

Also add a compile-time TODO comment in the test describing expected schema fields.

**Step 2: Run test to verify baseline**

Run:
```bash
pnpm --filter @repo/api-server test -- auth-provider-types
```

Expected: either PASS trivially or expose that the real types are not yet wired. If it passes trivially, continue and use type-check as the true red step below.

**Step 3: Make the real code fail first with type-check**

Change `packages/ui/src/types/user-profile.ts` temporarily to include `GOOGLE`, then run type-check before fixing all usages.

Run:
```bash
pnpm --filter web type-check
pnpm --filter @repo/api-server type-check
```

Expected: FAIL — hardcoded `LOCAL | LDAP` branches and provider-specific code need updates.

**Step 4: Implement minimal schema/type updates**

In `packages/database/prisma/schema.prisma`:
```prisma
enum AuthProvider {
  LOCAL
  LDAP
  GOOGLE
}

model User {
  // ...existing fields
  googleSub String? @unique
}
```

In `packages/ui/src/types/user-profile.ts`:
```ts
authProvider?: "LOCAL" | "LDAP" | "GOOGLE";
```

In API controller-local types, replace hardcoded unions with Prisma-backed or expanded unions.

**Step 5: Run verification**

Run:
```bash
pnpm --filter @repo/api-server type-check
pnpm --filter web type-check
```

Expected: FAIL may remain in provider-specific UI paths; that is acceptable until Task 7 completes, but schema/type syntax must be valid.

**Step 6: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/ui/src/types/user-profile.ts apps/server/apiServer/src/controllers/auth.controller.ts apps/server/apiServer/src/controllers/user.controller.ts apps/server/apiServer/src/controllers/auth-provider-types.test.ts
git commit -m "feat: add google auth provider schema"
```

---

### Task 3: Extend auth config with Google enablement and bootstrap guard

**Objective:** Compute `googleEnabled` only when env is valid and at least one SUPER_ADMIN already exists.

**Files:**
- Modify: `apps/server/apiServer/src/services/auth-config.service.ts`
- Modify: `apps/server/apiServer/src/controllers/auth.controller.ts`
- Modify: `apps/web/src/lib/server/auth.server.ts`
- Modify: `apps/web/src/app/login/page.tsx`
- Test: `apps/server/apiServer/src/services/auth-config.service.test.ts`

**Step 1: Write failing tests**

Create `apps/server/apiServer/src/services/auth-config.service.test.ts` with cases for:
- disabled when env missing
- disabled when no SUPER_ADMIN exists
- enabled when env valid and SUPER_ADMIN exists

Example skeleton:
```ts
import { describe, expect, it } from "vitest";

describe("public auth config google enablement", () => {
  it("returns false when no super admin exists", async () => {
    expect(false).toBe(true);
  });
});
```

**Step 2: Run test to verify failure**

Run:
```bash
pnpm --filter @repo/api-server test -- auth-config.service
```

Expected: FAIL.

**Step 3: Implement minimal config helpers**

Add helpers in `auth-config.service.ts` such as:
```ts
export function getGoogleOidcEnv() {
  return {
    enabled: isTruthyEnv(process.env.GOOGLE_OIDC_ENABLED),
    clientId: process.env.GOOGLE_OIDC_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.GOOGLE_OIDC_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_OIDC_REDIRECT_URI?.trim() ?? "",
    allowedDomains: (process.env.GOOGLE_OIDC_ALLOWED_DOMAINS ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  };
}
```

Extend public config shape:
```ts
export async function getPublicAuthConfig(prisma: PrismaClient) {
  const row = await getAuthSettingsRow(prisma);
  const superAdminExists = (await prisma.user.count({ where: { systemRole: "SUPER_ADMIN" } })) > 0;
  return {
    publicSignupEnabled: row.publicSignupEnabled,
    ldapEnabled: isLdapOfferedInPublicUi(row),
    googleEnabled: isGoogleOidcAvailable(superAdminExists),
  };
}
```

Update web-side `ApiPublicAuthConfig` and `login/page.tsx` props to include `googleEnabled`.

**Step 4: Run tests and type-check**

Run:
```bash
pnpm --filter @repo/api-server test -- auth-config.service
pnpm --filter @repo/api-server type-check
pnpm --filter web type-check
```

Expected: PASS for service tests; type-check may still fail in login UI until Task 6 if prop wiring is partial.

**Step 5: Commit**

```bash
git add apps/server/apiServer/src/services/auth-config.service.ts apps/server/apiServer/src/controllers/auth.controller.ts apps/web/src/lib/server/auth.server.ts apps/web/src/app/login/page.tsx apps/server/apiServer/src/services/auth-config.service.test.ts
git commit -m "feat: add google auth availability config"
```

---

### Task 4: Implement Google OIDC service with env parsing, PKCE, state, and token validation

**Objective:** Centralize all OIDC protocol logic in a single service with strong validation and no controller duplication.

**Files:**
- Create: `apps/server/apiServer/src/services/google-oidc.service.ts`
- Modify: `apps/server/apiServer/package.json`
- Modify: `package.json`
- Test: `apps/server/apiServer/src/services/google-oidc.service.test.ts`

**Step 1: Write failing service tests**

Cover at least:
- parse allowed domains
- reject missing client config
- build authorize URL with state/nonce/code_challenge
- reject unverified email
- reject disallowed domain
- reject missing `sub`

Example skeleton:
```ts
import { describe, expect, it } from "vitest";
import { isAllowedGoogleDomain } from "./google-oidc.service";

describe("isAllowedGoogleDomain", () => {
  it("matches normalized allowed domains", () => {
    expect(isAllowedGoogleDomain("User@Example.com", ["example.com"]))
      .toBe(true);
  });
});
```

**Step 2: Run tests to verify failure**

Run:
```bash
pnpm --filter @repo/api-server test -- google-oidc.service
```

Expected: FAIL — module/functions missing.

**Step 3: Add minimal implementation**

Install an OIDC library in the workspace (example: `openid-client`).

Recommended service surface:
```ts
export type GoogleOidcProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  hostedDomain: string | null;
};

export function getGoogleOidcConfig(): GoogleOidcConfig | null;
export function assertGoogleOidcAvailable(superAdminExists: boolean): GoogleOidcConfig;
export function buildAllowedDomainSet(raw: string): Set<string>;
export function isAllowedGoogleDomain(email: string, allowed: Iterable<string>): boolean;
export async function createGoogleAuthorizationRequest(input: { redis: Redis; returnTo?: string | null }): Promise<{ url: string; state: string }>;
export async function consumeGoogleAuthorization(input: { code: string; state: string; redis: Redis }): Promise<GoogleOidcProfile>;
```

Store Redis payload keys like:
- `auth:google:state:<state>` => `{ nonce, codeVerifier, returnTo }`
- `auth:google:ticket:<ticket>` => `{ accessToken, refreshToken, returnTo, user }`

Validation checklist to implement:
- issuer
- audience
- signature/JWKS
- nonce
- exp / nbf
- `sub`
- `email`
- `email_verified`
- allowed domain by email domain; `hd` advisory only

**Step 4: Run tests**

Run:
```bash
pnpm --filter @repo/api-server test -- google-oidc.service
pnpm --filter @repo/api-server type-check
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/server/apiServer/src/services/google-oidc.service.ts apps/server/apiServer/src/services/google-oidc.service.test.ts apps/server/apiServer/package.json package.json
git commit -m "feat: add google oidc service"
```

---

### Task 5: Add API start/callback/complete routes and Google login controller flow

**Objective:** Wire OIDC service into real auth endpoints, including user creation, provider collision handling, blocked-user enforcement, and one-time ticket completion.

**Files:**
- Modify: `apps/server/apiServer/src/routes/auth.routes.ts`
- Modify: `apps/server/apiServer/src/controllers/auth.controller.ts`
- Modify: `apps/server/apiServer/src/utils/messages.ts`
- Test: `apps/server/apiServer/src/controllers/auth.google.test.ts`

**Step 1: Write failing tests**

Test cases:
- `/api/auth/google/start` rejects when no SUPER_ADMIN exists
- callback creates `GOOGLE` user with `googleSub`
- callback rejects existing LOCAL same-email user
- callback rejects existing LDAP same-email user
- callback logs in existing GOOGLE user by `googleSub` even if email changed
- `/api/auth/google/complete` consumes ticket once only
- blocked user cannot complete login

Example test skeleton (extract pure helpers if full Fastify injection is too heavy):
```ts
it("rejects provider collision with LOCAL account", async () => {
  const result = await finishGoogleLogin({
    existingUser: { authProvider: "LOCAL", email: "a@example.com" },
    profile: { sub: "sub-1", email: "a@example.com", emailVerified: true, name: null, hostedDomain: "example.com" },
  });
  expect(result.ok).toBe(false);
  expect(result.code).toBe("PROVIDER_CONFLICT");
});
```

**Step 2: Run tests to verify failure**

Run:
```bash
pnpm --filter @repo/api-server test -- auth.google
```

Expected: FAIL.

**Step 3: Implement minimal controller flow**

Add handlers in `auth.controller.ts`:
```ts
async function googleStart(request, reply) { /* redirect */ }
async function googleCallback(request, reply) { /* exchange code, provision/login, create ticket, redirect to WEB_PUBLIC_URL */ }
async function googleComplete(request, reply) { /* consume ticket once and return tokens */ }
```

Provision/login helper outline:
```ts
const byGoogleSub = await app.prisma.user.findFirst({ where: { googleSub: profile.sub }, select: loginUserSelect });
const byEmail = byGoogleSub ?? await app.prisma.user.findUnique({ where: { email: profile.email }, select: loginUserSelect });
```

Create new GOOGLE user example:
```ts
const placeholder = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
const user = await app.prisma.user.create({
  data: {
    id: generatePublicId(),
    email: profile.email,
    googleSub: profile.sub,
    name: profile.name,
    password: placeholder,
    authProvider: "GOOGLE",
    systemRole: "USER",
  },
  select: loginUserSelect,
});
```

Atomic completion ticket consume should be implemented in one place; if Redis lacks a native helper, use a Lua script or `MULTI`/`WATCH` strategy so replay is impossible.

**Step 4: Run verification**

Run:
```bash
pnpm --filter @repo/api-server test -- auth.google
pnpm --filter @repo/api-server type-check
pnpm --filter @repo/api-server lint
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/server/apiServer/src/routes/auth.routes.ts apps/server/apiServer/src/controllers/auth.controller.ts apps/server/apiServer/src/utils/messages.ts apps/server/apiServer/src/controllers/auth.google.test.ts
git commit -m "feat: add google auth api flow"
```

---

### Task 6: Add web login button, callback handler, and error surfacing

**Objective:** Expose Google login in the UI, allow unauthenticated callback reachability, complete cookie setup, and show callback failures on `/login`.

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/login/LoginPageClient.tsx`
- Modify: `apps/web/src/lib/server/auth.server.ts`
- Create: `apps/web/src/app/auth/google/callback/route.ts`
- Modify: `apps/web/src/proxy.ts`
- Test: `apps/web/src/app/login/LoginPageClient.test.tsx`
- Test: `apps/web/src/app/auth/google/callback/route.test.ts`

**Step 1: Write failing tests**

Cover:
- Google button hidden when `googleEnabled=false`
- Google button shown when `googleEnabled=true`
- login page renders query-param error
- callback route calls `/api/auth/google/complete`, sets cookies, redirects to `/`
- callback route redirects to `/login?error=...` on failure
- `/auth/google/callback` is public in proxy rules

Example UI assertion:
```tsx
it("renders google login CTA when enabled", () => {
  render(<LoginPageClient publicSignupEnabled={false} ldapEnabled={false} googleEnabled />);
  expect(screen.getByRole("link", { name: /google workspace/i })).toBeInTheDocument();
});
```

**Step 2: Run tests to verify failure**

Run:
```bash
pnpm --filter web test -- LoginPageClient
pnpm --filter web test -- auth/google/callback
```

Expected: FAIL.

**Step 3: Implement minimal web flow**

In `login/page.tsx`, read search params and pass initial error:
```tsx
export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = (await searchParams) ?? {};
  const config = await fetchPublicAuthConfig();
  return <LoginPageClient ... googleEnabled={config.googleEnabled} initialError={params.error ?? null} />;
}
```

In `LoginPageClient.tsx`:
- add `googleEnabled` prop
- add `initialError` prop
- render `<a href={apiUrl("/api/auth/google/start")}>Google Workspace로 로그인</a>` or a stable public URL helper
- merge `initialError` with action state error rendering

In callback route:
```ts
export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get("ticket");
  // call POST /api/auth/google/complete
  // setAuthSessionCookies(...)
  // redirect
}
```

In `proxy.ts`:
```ts
const PUBLIC_PATHS = ["/login", "/auth/google/callback"];
```

**Step 4: Run verification**

Run:
```bash
pnpm --filter web test -- LoginPageClient
pnpm --filter web test -- auth/google/callback
pnpm --filter web type-check
pnpm --filter web lint
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/login/page.tsx apps/web/src/app/login/LoginPageClient.tsx apps/web/src/lib/server/auth.server.ts apps/web/src/app/auth/google/callback/route.ts apps/web/src/proxy.ts apps/web/src/app/login/LoginPageClient.test.tsx apps/web/src/app/auth/google/callback/route.test.ts
git commit -m "feat: add google login web flow"
```

---

### Task 7: Generalize external-provider password handling and profile surfaces

**Objective:** Prevent incorrect LDAP-only UX by treating both LDAP and GOOGLE as external-auth accounts.

**Files:**
- Modify: `apps/server/apiServer/src/controllers/user.controller.ts`
- Modify: `apps/web/src/app/(main)/settings/SettingsClient.tsx`
- Modify: `packages/ui/src/types/user-profile.ts`
- Modify: `packages/i18n/src/locales/ko.ts`
- Modify: `packages/i18n/src/locales/en.ts`
- Modify: `packages/i18n/src/locales/ja.ts`
- Test: `apps/web/src/app/(main)/settings/SettingsClient.test.tsx`

**Step 1: Write failing tests**

Cover:
- security settings hides password form for `GOOGLE`
- message is generic external-auth wording, not LDAP-only wording
- API rejects password change for any non-LOCAL provider

Example UI test:
```tsx
it("shows external auth message for GOOGLE users", () => {
  const user = { authProvider: "GOOGLE" } as const;
  // render SecurityTab wrapper and assert message
});
```

**Step 2: Run tests to verify failure**

Run:
```bash
pnpm --filter web test -- SettingsClient
pnpm --filter @repo/api-server test -- password
```

Expected: FAIL.

**Step 3: Implement minimal wording/branch changes**

In `user.controller.ts` replace LDAP-only condition text with generic external-provider message key.

In `SettingsClient.tsx` replace:
```tsx
if (user?.authProvider === "LDAP") {
```
with:
```tsx
if (user?.authProvider && user.authProvider !== "LOCAL") {
```

Update locale keys from LDAP-only wording to generic external sign-in wording.

**Step 4: Run verification**

Run:
```bash
pnpm --filter web test -- SettingsClient
pnpm --filter web type-check
pnpm --filter @repo/api-server type-check
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/server/apiServer/src/controllers/user.controller.ts apps/web/src/app/(main)/settings/SettingsClient.tsx packages/ui/src/types/user-profile.ts packages/i18n/src/locales/ko.ts packages/i18n/src/locales/en.ts packages/i18n/src/locales/ja.ts apps/web/src/app/(main)/settings/SettingsClient.test.tsx
git commit -m "feat: generalize external auth password policy"
```

---

### Task 8: Add docs/env docs and final verification pass

**Objective:** Document new env vars and verify the integrated flow across type-check, lint, build, and manual QA.

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `docs/server/README.md`
- Modify: `docs/en/server/README.md`
- Modify: `.env.example` (create if absent; if project convention forbids tracked env example, document in README only)

**Step 1: Write failing doc checklist**

Create a temporary markdown checklist in the plan task notes (no repo file needed) for:
- all required env vars documented
- bootstrap guard documented
- callback/web base URL documented
- allowed domains documented

Treat missing docs as the red step.

**Step 2: Implement docs**

Document at least:
- `GOOGLE_OIDC_ENABLED`
- `GOOGLE_OIDC_CLIENT_ID`
- `GOOGLE_OIDC_CLIENT_SECRET`
- `GOOGLE_OIDC_REDIRECT_URI`
- `GOOGLE_OIDC_ALLOWED_DOMAINS`
- `GOOGLE_OIDC_SCOPES`
- `WEB_PUBLIC_URL`
- first SUPER_ADMIN required before Google login appears

**Step 3: Run final verification**

Run:
```bash
pnpm install
pnpm --filter @repo/api-server test
pnpm --filter web test
pnpm type-check
pnpm lint
pnpm build
```

Expected: PASS.

**Step 4: Manual verification checklist**

1. Fresh install: `/login` 에서 Google 버튼 비노출
2. Setup token으로 첫 SUPER_ADMIN 생성
3. 재로그인 페이지에서 Google 버튼 노출
4. 허용 도메인 Google 계정 로그인 성공
5. 비허용 도메인 계정 로그인 실패 + 메시지 노출
6. LOCAL 동일 이메일 계정 충돌 실패
7. LDAP 동일 이메일 계정 충돌 실패
8. GOOGLE 재로그인 성공
9. Google 사용자 설정 화면에서 비밀번호 변경 폼 미노출
10. one-time ticket 재사용 실패

**Step 5: Commit**

```bash
git add README.md README.en.md docs/server/README.md docs/en/server/README.md .env.example
git commit -m "docs: add google oidc environment guide"
```

---

## Final completion checklist
- [ ] Prisma schema migrated and client regenerated if required by repo workflow
- [ ] Google OIDC env validation implemented
- [ ] SUPER_ADMIN bootstrap guard implemented
- [ ] `googleSub` persisted and used as primary Google identity key
- [ ] OIDC validation includes issuer/audience/signature/nonce/email verification
- [ ] completion ticket is one-time and not replayable
- [ ] web callback path is public in `apps/web/src/proxy.ts`
- [ ] login page displays callback error state
- [ ] external-provider password UI/messages generalized
- [ ] docs updated
- [ ] tests, type-check, lint, build all pass

## Suggested commit order
1. `test: add vitest workspace setup`
2. `feat: add google auth provider schema`
3. `feat: add google auth availability config`
4. `feat: add google oidc service`
5. `feat: add google auth api flow`
6. `feat: add google login web flow`
7. `feat: generalize external auth password policy`
8. `docs: add google oidc environment guide`

## Notes for the implementer
- Prefer extracting pure helper functions so tests can avoid heavy Fastify boot in early tasks.
- If Prisma migration files are tracked in this repo, create and commit the migration in Task 2 immediately after schema change.
- If `.env.example` does not exist and the repo intentionally avoids it, remove that file from Task 8 and document envs only in README/docs.
- If `openid-client` introduces ESM friction, keep the service boundary stable and swap library choice; do not redesign the flow.
