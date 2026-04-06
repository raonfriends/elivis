import type { UserStatus } from "./user-status";

export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    bio: string | null;
    status: UserStatus;
    avatarUrl: string | null;
    systemRole: "SUPER_ADMIN" | "USER";
    createdAt: string;
}
