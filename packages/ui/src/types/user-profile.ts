import type { UserStatus } from "./user-status";

export type UserAuthProvider = "LOCAL" | "LDAP" | "GOOGLE";

export function isExternalAuthProvider(
    authProvider: UserAuthProvider | null | undefined,
): authProvider is Exclude<UserAuthProvider, "LOCAL"> {
    return authProvider === "LDAP" || authProvider === "GOOGLE";
}

export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    bio: string | null;
    status: UserStatus;
    avatarUrl: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
    createdAt: string;
    /** 로컬 계정만 비밀번호 변경 가능 (외부 인증 계정은 읽기 전용 표시에 사용) */
    authProvider?: UserAuthProvider;
}
