import type { UserStatus } from "../types/user-status";

export const STATUS_STYLE: Record<UserStatus, { dot: string; badge: string }> = {
    WORKING: { dot: "bg-green-400", badge: "bg-green-50  text-green-700" },
    VACATION: { dot: "bg-blue-400", badge: "bg-blue-50   text-blue-700" },
    OFF_WORK: { dot: "bg-stone-400", badge: "bg-stone-100 text-stone-500" },
    DEEP_FOCUS: { dot: "bg-red-400", badge: "bg-red-50    text-red-700" },
};

export const STATUS_ORDER: UserStatus[] = ["WORKING", "VACATION", "OFF_WORK", "DEEP_FOCUS"];
