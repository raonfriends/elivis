/**
 * 서버/클라이언트 양쪽에서 사용하는 User 관련 타입·상수.
 * server-only 의존성이 없으므로 Client Component 에서 안전하게 import 가능합니다.
 */

export type UserStatus = "WORKING" | "VACATION" | "OFF_WORK" | "DEEP_FOCUS";

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  WORKING:    "열일중",
  VACATION:   "휴가중",
  OFF_WORK:   "퇴근",
  DEEP_FOCUS: "초집중모드",
};

export interface UserProfile {
  id:         string;
  email:      string;
  name:       string | null;
  bio:        string | null;
  status:     UserStatus;
  avatarUrl:  string | null;
  systemRole: "SUPER_ADMIN" | "USER";
  createdAt:  string;
}
