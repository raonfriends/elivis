/**
 * 서버 전체 응답 메시지 키 → i18n 경로 테이블
 *
 * 실제 번역 문자열은 packages/i18n/src/locales/*.ts 에 있습니다.
 * 사용법: t(request.lang, MSG.AUTH_LOGIN)
 */
export const MSG = {
  // ── 인증 ──────────────────────────────────────────────────────────────────
  AUTH_SIGNUP:                  "server.auth.signup",
  AUTH_LOGIN:                   "server.auth.login",
  AUTH_LOGOUT:                  "server.auth.logout",
  AUTH_LOGOUT_ALL:              "server.auth.logoutAll",
  AUTH_TOKEN_REFRESHED:         "server.auth.tokenRefreshed",
  AUTH_EMAIL_REQUIRED:          "server.auth.emailRequired",
  AUTH_INVALID_CREDENTIALS:     "server.auth.invalidCredentials",
  AUTH_EMAIL_CONFLICT:          "server.auth.emailConflict",
  AUTH_REFRESH_TOKEN_REQUIRED:  "server.auth.refreshTokenRequired",
  AUTH_REFRESH_TOKEN_INVALID:   "server.auth.refreshTokenInvalid",
  AUTH_TOKEN_MISSING:           "server.auth.tokenMissing",
  AUTH_TOKEN_INVALID:           "server.auth.tokenInvalid",
  AUTH_TOKEN_WRONG_TYPE:        "server.auth.tokenWrongType",

  // ── 초기 설치 ──────────────────────────────────────────────────────────────
  SETUP_TOKEN_INVALID: "server.setup.tokenInvalid",
  SETUP_TOKEN_EXPIRED: "server.setup.tokenExpired",

  // ── 권한 ──────────────────────────────────────────────────────────────────
  FORBIDDEN_ADMIN_ONLY:   "server.forbidden.adminOnly",
  FORBIDDEN_NOT_MEMBER:   "server.forbidden.notMember",
  FORBIDDEN_MANAGER_ONLY: "server.forbidden.managerOnly",

  // ── 프로젝트 ────────────────────────────────────────────────────────────────
  PROJECT_CREATED:      "server.project.created",
  PROJECT_FETCHED:      "server.project.fetched",
  PROJECT_MEMBER_ADDED: "server.project.memberAdded",
  PROJECT_NAME_REQUIRED: "server.project.nameRequired",
  PROJECT_NOT_FOUND:    "server.project.notFound",

  // ── 관리자 ────────────────────────────────────────────────────────────────
  ADMIN_USERS_FETCHED:    "server.admin.usersFetched",
  ADMIN_USER_ROLE_UPDATED: "server.admin.userRoleUpdated",

  // ── 유저 ──────────────────────────────────────────────────────────────────
  USER_PROFILE_FETCHED:     "server.user.profileFetched",
  USER_UPDATED:             "server.user.updated",
  USER_AVATAR_UPDATED:      "server.user.avatarUpdated",
  USER_AVATAR_REMOVED:      "server.user.avatarRemoved",
  USER_AVATAR_REQUIRED:     "server.user.avatarRequired",
  USER_AVATAR_INVALID:      "server.user.avatarInvalid",
  USER_NOT_FOUND:           "server.user.notFound",

  // ── 유효성 검사 ────────────────────────────────────────────────────────────
  VALIDATION_INVALID_STATUS: "server.validation.invalidStatus",

  // ── 헬스 체크 ─────────────────────────────────────────────────────────────
  HEALTH_OK:      "server.health.ok",
  HEALTH_DB_ERROR: "server.health.dbError",
} as const;

export type MsgKey = keyof typeof MSG;
