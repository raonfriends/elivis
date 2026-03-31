export const ko = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Server — API 응답 메시지
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  server: {
    auth: {
      signup:               "회원가입이 완료되었습니다.",
      login:                "로그인이 완료되었습니다.",
      logout:               "로그아웃이 완료되었습니다.",
      logoutAll:            "모든 기기에서 로그아웃되었습니다.",
      tokenRefreshed:       "토큰이 갱신되었습니다.",
      emailRequired:        "이메일과 비밀번호는 필수입니다.",
      invalidCredentials:   "이메일 또는 비밀번호가 올바르지 않습니다.",
      emailConflict:        "이미 사용 중인 이메일입니다.",
      refreshTokenRequired: "refreshToken이 없습니다.",
      refreshTokenInvalid:  "유효하지 않거나 만료된 refreshToken입니다.",
      tokenMissing:         "인증 토큰이 없습니다.",
      tokenInvalid:         "만료되었거나 유효하지 않은 토큰입니다.",
      tokenWrongType:       "올바른 Access Token이 아닙니다.",
    },
    setup: {
      tokenInvalid: "관리자 인증 토큰이 틀립니다.",
      tokenExpired: "Setup 토큰이 만료됐습니다. 서버를 재시작하세요.",
    },
    forbidden: {
      adminOnly:   "SUPER_ADMIN 권한이 필요합니다.",
      notMember:   "해당 프로젝트의 멤버가 아닙니다.",
      managerOnly: "LEADER 또는 DEPUTY_LEADER 권한이 필요합니다.",
    },
    project: {
      created:      "프로젝트가 생성되었습니다.",
      fetched:      "프로젝트 조회가 완료되었습니다.",
      memberAdded:  "멤버가 추가되었습니다.",
      nameRequired: "name 필드는 필수입니다.",
      notFound:     "프로젝트를 찾을 수 없습니다.",
    },
    user: {
      profileFetched: "프로필 조회가 완료되었습니다.",
      updated:        "프로필이 수정되었습니다.",
      avatarUpdated:  "프로필 사진이 변경되었습니다.",
      avatarRemoved:  "프로필 사진이 삭제되었습니다.",
      avatarRequired: "파일을 선택해주세요.",
      avatarInvalid:  "이미지 파일(jpg, png, gif, webp)만 업로드할 수 있습니다.",
      notFound:       "사용자를 찾을 수 없습니다.",
    },
    admin: {
      usersFetched:    "사용자 목록 조회가 완료되었습니다.",
      userRoleUpdated: "사용자 역할이 변경되었습니다.",
    },
    health: {
      ok:      "서버가 정상 동작 중입니다.",
      dbError: "데이터베이스에 연결할 수 없습니다.",
    },
    validation: {
      invalidStatus: "올바르지 않은 상태 값입니다.",
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 공통 — 도메인 상수
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Web — UI 텍스트
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  web: {
    domain: {
      userStatus: {
        WORKING:    "열일중",
        VACATION:   "휴가중",
        OFF_WORK:   "퇴근",
        DEEP_FOCUS: "초집중모드",
      },
    },
    common: {
      search:         "검색",
      notImplemented: "미구현",
      loading:        "로딩 중…",
    },
    auth: {
      emailLabel:          "이메일",
      emailPlaceholder:    "이메일을 입력하세요",
      passwordLabel:       "비밀번호",
      passwordPlaceholder: "비밀번호를 입력하세요",
      loginButton:         "로그인",
      loggingIn:           "로그인 중…",
      rememberEmail:       "아이디 저장",
      emailRequired:       "이메일과 비밀번호를 입력해주세요.",
      loginFailed:         "로그인에 실패했습니다.",
    },
    nav: {
      dashboard:   "대시보드",
      myWork:      "내작업",
      teams:       "팀",
      projects:    "프로젝트",
      notifications: "알림",
      workspace:   "워크스페이스",
      myWorkspace: "내 워크스페이스",
    },
    header: {
      searchPlaceholder: "검색…",
      openMenu:          "메뉴 열기",
      userMenu:          "사용자 메뉴",
      mySettings:        "내 설정",
      logout:            "로그아웃",
      language:          "언어",
    },
    sidebar: {
      collapse: "사이드바 접기/숨기기",
      restore:  "사이드바 다시 열기",
    },
    settings: {
      title: "내 설정",
      tabs: {
        profile:       "개인정보",
        security:      "보안",
        notifications: "알림",
        integrations:  "연동",
      },
      profile: {
        sectionTitle:    "기본 정보",
        nameLabel:       "이름",
        namePlaceholder: "이름을 입력하세요",
        bioLabel:        "프로필 메시지",
        bioPlaceholder:  "자신을 소개하는 짧은 메시지를 입력하세요",
        emailLabel:      "이메일",
        emailNote:       "이메일은 변경할 수 없습니다.",
        roleLabel:       "역할",
        joinedLabel:     "가입일",
        saveButton:      "저장",
        saving:          "저장 중…",
        saveSuccess:          "저장되었습니다.",
        roleAdmin:            "최고 관리자",
        roleUser:             "일반 사용자",
        avatarLabel:          "프로필 사진",
        avatarChange:         "사진 변경",
        avatarRemove:         "사진 삭제",
        avatarSuccess:        "프로필 사진이 변경되었습니다.",
        avatarRemoveSuccess:  "프로필 사진이 삭제되었습니다.",
        avatarFileTooLarge:   "파일 크기는 2MB 이하여야 합니다.",
        avatarInvalidType:    "이미지 파일(jpg, png, gif, webp)만 업로드할 수 있습니다.",
      },
      comingSoon: "추후 구현 예정",
    },
  },
} as const;
