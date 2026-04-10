# Elivis Google Workspace OIDC 로그인 설계

## 목표
- 기존 **로컬 로그인**과 **LDAP 로그인**은 유지한다.
- 로그인 화면에 **Google Workspace 로그인 옵션**을 추가한다.
- 허용 Google Workspace 도메인은 **환경변수로 제어**한다.
- Google 최초 로그인 사용자는 **자동 생성(JIT provisioning)** 한다.
- Google 인증 성공 후 현재 시스템과 동일하게 **Elivis access/refresh token**을 발급한다.

## 현재 구조 요약
- API 서버: `apps/server/apiServer`
- 웹 앱: `apps/web`
- 공개 로그인 설정 API: `GET /api/auth/config`
- 현재 provider: `LOCAL`, `LDAP`
- 로그인 UI: `apps/web/src/app/login/LoginPageClient.tsx`
- 관리자 인증 설정은 현재 LDAP 중심이며, 이번 범위에서는 **Google OIDC 설정을 관리자 UI에 추가하지 않는다.**

## 범위
### 포함
- Google OIDC 로그인 시작 / callback 처리
- 환경변수 기반 enable/disable
- 환경변수 기반 허용 도메인 제한
- Google 사용자 자동 생성
- 기존 JWT 세션 발급 흐름과 연결
- 로그인 UI의 Google 버튼 노출
- 다국어 에러 메시지 추가
- 문서/환경변수 문서 업데이트

### 제외
- 관리자 UI에서 Google OIDC 설정 수정
- 다중 OIDC provider 일반화
- 기존 LOCAL/LDAP 계정과 Google 계정 자동 병합
- 역할 매핑/그룹 매핑/SCIM

## 추천 아키텍처
### 선택안
**API 서버 주도 OIDC 직접 구현**을 채택한다.

### 이유
- 현재 인증의 최종 권한이 API 서버에 있다.
- local / ldap / google 세 가지 인증 수단을 하나의 서버 정책으로 관리할 수 있다.
- Google OIDC 이후에도 access/refresh token 발급 로직을 그대로 재사용할 수 있다.
- 도메인 제한, provider 충돌 정책, 이메일 검증 강제를 서버에서 일관되게 집행할 수 있다.

## 인증 정책
### 로그인 수단
- `LOCAL`: 기존 이메일/비밀번호 로그인 유지
- `LDAP`: 기존 LDAP 탭 로그인 유지
- `GOOGLE`: 신규 Google OIDC 로그인 추가

### 도메인 제한
- 허용 도메인은 환경변수에서 읽는다.
- 여러 도메인을 쉼표 구분으로 허용할 수 있다.
- ID token의 `hd` claim이 있으면 우선 참고하되, 최종 판정은 **이메일 도메인** 기준으로도 검증한다.
- `email_verified === true` 가 아니면 로그인 거부한다.

### 자동 생성 정책
- 동일 이메일 사용자가 없으면 `authProvider=GOOGLE`, `systemRole=USER` 로 자동 생성한다.
- `password` 필드는 LDAP 전용 계정과 같은 방식으로 **사용되지 않는 더미 bcrypt hash** 를 저장한다.

### provider 충돌 정책
보수적으로 자동 병합을 하지 않는다.

- 기존 `LOCAL` 계정과 이메일이 같으면 Google 로그인 거부
- 기존 `LDAP` 계정과 이메일이 같으면 Google 로그인 거부
- 기존 `GOOGLE` 계정이면 정상 로그인

이 정책은 계정 탈취/자동 연결 리스크를 줄인다.

## 환경변수 설계
다음 환경변수를 추가한다.

- `GOOGLE_OIDC_ENABLED`
- `GOOGLE_OIDC_CLIENT_ID`
- `GOOGLE_OIDC_CLIENT_SECRET`
- `GOOGLE_OIDC_REDIRECT_URI`
- `GOOGLE_OIDC_ALLOWED_DOMAINS`
- `GOOGLE_OIDC_SCOPES` (기본값: `openid email profile`)
- `WEB_PUBLIC_URL`

### 동작 원칙
- `GOOGLE_OIDC_ENABLED=true` 이고 필수값이 모두 유효할 때만 공개 UI에 노출한다.
- 필수값이 누락되면 Google 로그인은 비활성화된 것으로 간주한다.
- 이번 1차에서는 DB 시드/관리자 설정 저장소에 넣지 않고 **env-only** 로 관리한다.

## 데이터 모델 변경
### Prisma enum 확장
`packages/database/prisma/schema.prisma`

기존:
- `LOCAL`
- `LDAP`

변경:
- `LOCAL`
- `LDAP`
- `GOOGLE`

### User 사용 방식
이번 범위에서도 **Google `sub` 저장은 필수**로 포함한다.

- `email`: 사용자 표시/연락용 이메일
- `name`: Google profile name으로 최초 생성 및 필요 시 업데이트
- `authProvider=GOOGLE`
- `password`: dummy hash
- `googleSub`: Google OIDC의 고유 subject

이유:
- 이메일만으로는 OIDC provider 내부의 안정적 식별자를 보장하기 어렵다.
- 향후 이메일 rename, alias, 조직 정책 변경 상황에서도 Google 계정 연속성을 유지하려면 `sub` 를 영속 보관해야 한다.

권장 최소 스키마 변경:
- `User.googleSub String? @unique`

운영 규칙:
- 신규 Google 사용자 생성 시 `googleSub` 저장
- 기존 `GOOGLE` 사용자 로그인 시 1차 식별은 `googleSub` 로 수행
- `googleSub` 가 같고 이메일이 바뀌었으면 이메일/이름을 갱신할 수 있다.
- `googleSub` 는 다른 사용자의 값으로 재사용될 수 없어야 한다.

## 백엔드 설계
### 1) Public auth config 확장
`GET /api/auth/config` 응답에 아래 필드를 추가한다.
- `googleEnabled: boolean`

이 값은 env 검증 결과를 반영한다.

### 2) Google OIDC service 추가
예상 파일:
- `apps/server/apiServer/src/services/google-oidc.service.ts`

책임:
- env 로드/검증
- Google discovery 또는 고정 endpoint 구성
- authorization URL 생성
- state / nonce / PKCE verifier 생성 및 검증 보조
- code -> token 교환
- ID token 검증
- email / email_verified / name / hd / sub 추출
- 허용 도메인 검사

### 3) OIDC state/nonce/PKCE 처리
간단하고 안전한 방식으로 **Redis 기반 단기 저장**을 사용한다.

저장 정보 예시:
- `state`
- `nonce`
- `codeVerifier`
- `returnTo`(선택)
- 만료 시간: 5~10분

이유:
- 이미 Redis 인프라가 존재한다.
- API/웹이 분리된 구조에서 서버 검증에 적합하다.
- 무상태 JWT보다 구현이 단순하고 회수도 쉽다.

추가 보안 원칙:
- Authorization Code Flow에 **PKCE(S256)** 를 적용한다.
- `code_challenge` 는 시작 시 authorize 요청에 포함한다.
- `code_verifier` 는 callback의 token 교환 시 사용한다.

### 4) 라우트 추가
`apps/server/apiServer/src/routes/auth.routes.ts`

추가 후보:
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/google/complete`

#### `/api/auth/google/start`
- Google 기능이 비활성화면 **404** 반환
- state / nonce 생성 후 Redis 저장
- PKCE verifier/challenge 생성
- Google authorize URL로 redirect

#### `/api/auth/google/callback`
- `code`, `state` 검증
- Redis에서 state 조회 및 nonce/codeVerifier 확보
- token endpoint 교환
- ID token 검증
- 도메인/이메일 검증
- 사용자 조회/생성/충돌 판정
- Elivis access/refresh token 발급
- one-time completion ticket 생성 후 웹 세션 확정 경로로 redirect

#### `POST /api/auth/google/complete`
- 입력: `{ ticket: string }`
- 역할: API가 Redis에 저장된 one-time login completion ticket을 **원자적으로 1회만 소비**한다.
- 성공 응답: `{ accessToken, refreshToken, user }`
- 실패 응답: 만료/이미 사용됨/존재하지 않음에 대해 400 또는 401의 안정된 에러 코드 반환
- ticket TTL: 60초 내외 권장

### 5) 웹 세션 연결 방식
**권장 방식:** API callback이 웹의 세션 완료 엔드포인트로 짧은 수명 one-time ticket을 넘긴다.

구체 방식:
1. API callback에서 Elivis 토큰(access/refresh)을 직접 URL에 싣지 않는다.
2. 대신 Redis에 짧은 수명의 login-completion key를 저장한다.
3. API는 신뢰된 웹 앱 base URL을 사용해 **절대 URL** 예: `${WEB_PUBLIC_URL}/auth/google/callback?ticket=...` 로 redirect 한다.
4. 웹 route handler가 `ticket` 으로 `POST /api/auth/google/complete` 를 호출해 토큰을 받아 httpOnly cookie를 설정한다.
5. 이후 `/` 또는 원래 목적지로 redirect 한다.

이유:
- access/refresh token이 URL, browser history, proxy log에 직접 남지 않는다.
- 현재 웹 쿠키 관리 패턴과 잘 맞는다.
- 웹/API 분리 origin 환경에서도 callback 목적지가 명확하다.

주의:
- 웹이 Redis를 직접 읽지 않는다.
- completion ticket 소비는 API 단일 엔드포인트에서만 수행한다.
- ticket은 1회 사용 후 즉시 삭제되어 replay를 막아야 한다.
- API -> 웹 redirect는 상대 경로가 아니라 **신뢰된 절대 URL** 로만 구성한다.

### 5-1) 웹 callback 공개 경로 처리
현재 `apps/web/src/proxy.ts` 는 `/login` 만 공개 경로로 취급한다.
따라서 Google callback route를 실제로 사용하려면 아래 중 하나를 포함해야 한다.

- `PUBLIC_PATHS` 에 `/auth/google/callback` 추가
- 또는 동일 효과의 공개 경로 네임스페이스 사용

이번 설계에서는 `apps/web/src/proxy.ts` 를 수정해 `/auth/google/callback` 을 공개 경로로 추가하는 것을 기본안으로 한다.

### 5-2) 웹 앱 base URL 설정
API callback이 웹으로 안전하게 되돌아오려면 신뢰 가능한 웹 origin이 필요하다.

권장 환경변수:
- `WEB_PUBLIC_URL`

원칙:
- API는 이 값을 사용해 callback 완료 redirect 절대 URL을 생성한다.
- user input이나 request header 기반으로 redirect 목적지를 조립하지 않는다.
- `NEXT_PUBLIC_API_URL` 과는 역할이 다르며, 이는 API 호출 base URL용이다.

### 6) 사용자 처리 로직
기존 `auth.controller.ts`에 Google 완료 헬퍼를 추가한다.

추가 영향:
- `GOOGLE` provider 도입에 따라 사용자 프로필 타입과 보안 설정 UI도 함께 갱신해야 한다.
- 현재 `LDAP` 만 외부 인증으로 가정한 비밀번호 변경 제한 문구/분기(`SettingsClient`, `user.controller`, `packages/ui` 타입)를 `LOCAL` vs `EXTERNAL(GOOGLE|LDAP)` 관점으로 일반화한다.

동작:
- `googleSub` 로 기존 `GOOGLE` 사용자 우선 조회
- 없으면 `email` 로 기존 사용자 조회
- `user == null` -> 생성
- `user.authProvider === GOOGLE` -> 로그인
- `user.authProvider === LOCAL || LDAP` -> 충돌 오류

이때 Google에서 받은 이름이 기존 값과 다르면 `GOOGLE` 계정에 한해 이름 갱신을 허용할 수 있다.
또한 `googleSub` 가 일치하는 기존 `GOOGLE` 계정은 이메일 변경이 있어도 동일 사용자로 취급한다.

### 7) OIDC 검증 체크리스트
ID token 검증 시 아래 항목을 명시적으로 검사한다.

- 서명 검증: Google discovery/JWKS 기반
- `iss`: Google 허용 issuer 와 일치
- `aud`: 우리 `GOOGLE_OIDC_CLIENT_ID` 와 일치
- `azp`: 필요한 경우 허용된 client 와 일치
- `exp`: 만료되지 않음
- `nbf`: 존재 시 현재 시각 이전/동일
- `nonce`: Redis에 저장한 값과 일치
- `sub`: 비어 있지 않음
- `email`: 비어 있지 않음
- `email_verified === true`

구현은 discovery metadata 및 JWKS 검증을 사용하는 표준 OIDC/OAuth 라이브러리 위에서 수행한다.

## 웹 설계
### 로그인 화면
`apps/web/src/app/login/page.tsx`
`apps/web/src/app/login/LoginPageClient.tsx`
`apps/web/src/lib/server/auth.server.ts`

변경:
- public auth config에 `googleEnabled` 반영
- 로그인 카드 내 또는 하단에 **Google Workspace 로그인 버튼** 추가
- local/ldap 탭 구조는 유지
- 버튼 클릭 시 API 시작 엔드포인트로 이동

### 권장 UI 배치
- 기존 폼 아래에 구분선
- `Google Workspace로 로그인` 버튼 추가
- LDAP와는 별도 탭이 아니라 **독립된 소셜 버튼** 으로 노출
- callback 실패 시 `searchParams.error` 또는 동등한 flash 상태를 로그인 카드 상단 에러 영역에 표시

이유:
- OIDC는 비밀번호 입력형 로그인과 상호작용 패턴이 다르다.
- 탭보다 독립 CTA가 이해하기 쉽다.
- callback 오류가 실제 사용자에게 보이도록 기존 로그인 에러 렌더링과 연결해야 한다.

### 웹 callback 처리
예상 파일:
- `apps/web/src/app/auth/google/callback/route.ts` 또는 page/route handler

책임:
- `ticket` 수신
- 서버에서 세션 확정
- httpOnly cookie 설정
- 성공 시 `/` redirect
- 실패 시 `/login?error=...` redirect

추가 요구사항:
- 이 callback 경로는 인증 전 접근 가능해야 하므로 `apps/web/src/proxy.ts` 공개 경로 예외에 포함한다.
- 로그인 실패 메시지를 실제로 보여주려면 `apps/web/src/app/login/page.tsx` 가 `searchParams.error` 를 읽어 `LoginPageClient.tsx` 로 전달하거나, 동등한 flash-cookie 메커니즘을 사용해야 한다.
- v1 기본안은 구현 단순성을 위해 `searchParams.error` 전달 방식을 사용한다.

## 에러/메시지 설계
추가 메시지 키 예시:
- Google 로그인 비활성화
- Google 인증 시작 실패
- Google state 불일치
- Google token 검증 실패
- Google 이메일 미확인
- 허용되지 않은 도메인
- 기존 LOCAL 계정과 충돌
- 기존 LDAP 계정과 충돌
- Google 로그인 완료 실패
- Google completion ticket 만료/재사용

기존 `packages/i18n/src/locales/*.ts` 및 서버 메시지 체계에 맞춘다.

## 보안 고려사항
- state 필수 검증
- nonce 필수 검증
- PKCE(S256) 적용
- `email_verified` 강제
- 도메인 화이트리스트 검증
- access/refresh token을 URL query로 직접 전달 금지
- one-time ticket 짧은 TTL 및 1회 사용 후 폐기
- ticket consume는 원자적이어야 함
- `iss`, `aud`, `azp`, `exp`, `nbf`, `sub` 검증 필수
- 오류 메시지는 사용자에게 과도한 내부 정보 노출 금지

### returnTo 정책
- v1에서는 open redirect 위험을 줄이기 위해 `returnTo` 를 선택 기능으로만 다루고, 구현 시에는 **상대 경로만 허용**한다.
- 상대 경로가 아니거나 비어 있으면 `/` 로 fallback 한다.
- 구현 복잡도를 줄이고 싶으면 v1에서 `returnTo` 자체를 생략하고 항상 `/` 로 보내도 무방하다.

## 검증 계획
### 백엔드
- Google env 유효/무효에 따른 `googleEnabled` 계산 테스트
- 허용 도메인 파서 테스트
- state/nonce 검증 테스트
- PKCE verifier/challenge 사용 테스트
- provider 충돌 테스트
- 신규 Google 사용자 생성 테스트
- `googleSub` 기반 기존 사용자 로그인 테스트
- 동일 `googleSub` + 이메일 변경 케이스 테스트
- blocked user(`accessBlocked`) 거부 테스트

### 웹
- `googleEnabled=false` 일 때 버튼 비노출
- `googleEnabled=true` 일 때 버튼 노출
- callback 성공 시 세션 쿠키 설정 및 redirect
- callback 실패 시 로그인 화면으로 복귀
- 만료/재사용 ticket 실패 테스트

### 수동 검증
- 허용 도메인 계정 로그인 성공
- 비허용 도메인 계정 로그인 실패
- 기존 LOCAL 동일 이메일 로그인 실패
- 기존 LDAP 동일 이메일 로그인 실패
- 신규 사용자 자동 생성 확인
- 동일 ticket 재사용 실패 확인

### 예상 변경 파일
### 서버
- `apps/server/apiServer/src/controllers/auth.controller.ts`
- `apps/server/apiServer/src/controllers/user.controller.ts`
- `apps/server/apiServer/src/routes/auth.routes.ts`
- `apps/server/apiServer/src/services/auth-config.service.ts`
- `apps/server/apiServer/src/services/google-oidc.service.ts` (new)
- `apps/server/apiServer/src/services/token.service.ts` (재사용 가능, 변경은 최소화)
- `apps/server/apiServer/src/utils/messages.ts`
- `apps/server/apiServer/src/index.ts` 또는 동등한 설정 로딩 지점 (필요 시 `WEB_PUBLIC_URL` 검증)

### 웹
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/login/LoginPageClient.tsx`
- `apps/web/src/app/auth/google/callback/...` (new)
- `apps/web/src/lib/server/auth.server.ts`
- `apps/web/src/proxy.ts`
- `apps/web/src/app/(main)/settings/SettingsClient.tsx`
- `apps/web/src/lib/http/api-base-url.ts` (변경 필요 여부 점검)

### 공용/DB/문서
- `packages/database/prisma/schema.prisma`
- `packages/ui/src/types/user-profile.ts`
- `packages/i18n/src/locales/ko.ts`
- `packages/i18n/src/locales/en.ts`
- `packages/i18n/src/locales/ja.ts`
- `README.md`
- `README.en.md`
- `docs/server/README.md`
- `docs/en/server/README.md`

## 트레이드오프
### 이번 설계의 장점
- 현재 구조와 잘 맞는다.
- 최소 변경으로 Google OIDC를 추가할 수 있다.
- 보안상 자동 병합을 피한다.
- 운영 제어를 env로 간단하게 유지한다.

### 이번 설계의 한계
- 관리 UI에서 on/off/도메인 수정이 불가하다.
- 향후 Microsoft/Azure AD 등 추가 시 추상화가 더 필요할 수 있다.

## 후속 확장 후보
- 관리자 화면에서 Google OIDC 설정 관리
- OIDC provider 공통 인터페이스 추상화
- 계정 연결/병합 승인 플로우
- role/group 기반 자동 권한 매핑

## 구현 결론
이번 1차는 아래 조합으로 확정한다.

- **API 서버 주도 Google OIDC**
- **env 기반 enable 및 허용 도메인 설정**
- **JIT 사용자 생성 허용**
- **LOCAL/LDAP와 자동 병합 금지**
- **기존 JWT 세션 발급 재사용**
- **웹에는 Google 로그인 버튼만 추가**

이 설계는 현재 Elivis의 인증 구조를 크게 흔들지 않으면서 Google Workspace 로그인을 안전하게 추가하는 최소·실용 설계다.
