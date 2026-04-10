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
추가 컬럼은 이번 범위에서 필수가 아니다. 최소 변경 원칙으로 간다.
- `email`: Google 기본 식별자
- `name`: Google profile name으로 최초 생성 및 필요 시 업데이트
- `authProvider=GOOGLE`
- `password`: dummy hash

> 메모: 향후 Google `sub` 저장 필요성이 생기면 별도 컬럼 또는 연결 테이블로 확장할 수 있으나, 이번 범위에서는 YAGNI 원칙으로 제외한다.

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
- state / nonce 생성 및 검증 보조
- code -> token 교환
- ID token 검증
- email / email_verified / name / hd 추출
- 허용 도메인 검사

### 3) OIDC state/nonce 처리
간단하고 안전한 방식으로 **Redis 기반 단기 저장**을 사용한다.

저장 정보 예시:
- `state`
- `nonce`
- `returnTo`(선택)
- 만료 시간: 5~10분

이유:
- 이미 Redis 인프라가 존재한다.
- API/웹이 분리된 구조에서 서버 검증에 적합하다.
- 무상태 JWT보다 구현이 단순하고 회수도 쉽다.

### 4) 라우트 추가
`apps/server/apiServer/src/routes/auth.routes.ts`

추가 후보:
- `GET /auth/google/start`
- `GET /auth/google/callback`

#### `/auth/google/start`
- Google 기능이 비활성화면 404 또는 400 반환
- state / nonce 생성 후 Redis 저장
- Google authorize URL로 redirect

#### `/auth/google/callback`
- `code`, `state` 검증
- Redis에서 state 조회 및 nonce 확보
- token endpoint 교환
- ID token 검증
- 도메인/이메일 검증
- 사용자 조회/생성/충돌 판정
- Elivis access/refresh token 발급
- 웹 세션 확정 경로로 redirect

### 5) 웹 세션 연결 방식
**권장 방식:** API callback이 웹의 세션 완료 엔드포인트로 짧은 수명 one-time payload를 넘긴다.

구체 방식:
1. API callback에서 Elivis 토큰(access/refresh)을 직접 URL에 싣지 않는다.
2. 대신 Redis에 짧은 수명의 login-completion key를 저장한다.
3. API는 웹의 예: `/auth/google/callback?ticket=...` 로 redirect 한다.
4. 웹 서버 액션/route handler가 `ticket` 으로 API 또는 Redis-backed endpoint를 조회해 토큰을 받아 httpOnly cookie를 설정한다.
5. 이후 `/` 또는 원래 목적지로 redirect 한다.

이유:
- access/refresh token이 URL, browser history, proxy log에 직접 남지 않는다.
- 현재 웹 쿠키 관리 패턴과 잘 맞는다.

### 6) 사용자 처리 로직
기존 `auth.controller.ts`에 Google 완료 헬퍼를 추가한다.

동작:
- `user = findUnique({ email })`
- `user == null` -> 생성
- `user.authProvider === GOOGLE` -> 로그인
- `user.authProvider === LOCAL || LDAP` -> 충돌 오류

이때 Google에서 받은 이름이 기존 값과 다르면 `GOOGLE` 계정에 한해 이름 갱신을 허용할 수 있다.

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

이유:
- OIDC는 비밀번호 입력형 로그인과 상호작용 패턴이 다르다.
- 탭보다 독립 CTA가 이해하기 쉽다.

### 웹 callback 처리
예상 파일:
- `apps/web/src/app/auth/google/callback/route.ts` 또는 page/route handler

책임:
- `ticket` 수신
- 서버에서 세션 확정
- httpOnly cookie 설정
- 성공 시 `/` redirect
- 실패 시 `/login?error=...` redirect

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

기존 `packages/i18n/src/locales/*.ts` 및 서버 메시지 체계에 맞춘다.

## 보안 고려사항
- state 필수 검증
- nonce 필수 검증
- `email_verified` 강제
- 도메인 화이트리스트 검증
- access/refresh token을 URL query로 직접 전달 금지
- one-time ticket 짧은 TTL 및 1회 사용 후 폐기
- 오류 메시지는 사용자에게 과도한 내부 정보 노출 금지

## 검증 계획
### 백엔드
- Google env 유효/무효에 따른 `googleEnabled` 계산 테스트
- 허용 도메인 파서 테스트
- state/nonce 검증 테스트
- provider 충돌 테스트
- 신규 Google 사용자 생성 테스트

### 웹
- `googleEnabled=false` 일 때 버튼 비노출
- `googleEnabled=true` 일 때 버튼 노출
- callback 성공 시 세션 쿠키 설정 및 redirect
- callback 실패 시 로그인 화면으로 복귀

### 수동 검증
- 허용 도메인 계정 로그인 성공
- 비허용 도메인 계정 로그인 실패
- 기존 LOCAL 동일 이메일 로그인 실패
- 기존 LDAP 동일 이메일 로그인 실패
- 신규 사용자 자동 생성 확인

## 예상 변경 파일
### 서버
- `apps/server/apiServer/src/controllers/auth.controller.ts`
- `apps/server/apiServer/src/routes/auth.routes.ts`
- `apps/server/apiServer/src/services/auth-config.service.ts`
- `apps/server/apiServer/src/services/google-oidc.service.ts` (new)
- `apps/server/apiServer/src/services/token.service.ts` (재사용 가능, 변경은 최소화)
- `apps/server/apiServer/src/utils/messages.ts`

### 웹
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/login/LoginPageClient.tsx`
- `apps/web/src/lib/server/auth.server.ts`
- `apps/web/src/app/auth/google/callback/...` (new)

### 공용/DB/문서
- `packages/database/prisma/schema.prisma`
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
- Google `sub` 영속 저장이 없어 장기적으로 provider 내부 식별 강화 여지가 남는다.
- 향후 Microsoft/Azure AD 등 추가 시 추상화가 더 필요할 수 있다.

## 후속 확장 후보
- 관리자 화면에서 Google OIDC 설정 관리
- OIDC provider 공통 인터페이스 추상화
- 계정 연결/병합 승인 플로우
- Google `sub` 저장 및 추가 무결성 검증
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
