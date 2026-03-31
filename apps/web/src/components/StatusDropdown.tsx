"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { UserStatus } from "@/lib/user-types";
import { updateStatusAction } from "@/app/actions/users";
import { useUserStatus } from "@/context/UserStatusContext";

export const STATUS_STYLE: Record<UserStatus, { dot: string; badge: string }> = {
    WORKING: { dot: "bg-green-400", badge: "bg-green-50  text-green-700" },
    VACATION: { dot: "bg-blue-400", badge: "bg-blue-50   text-blue-700" },
    OFF_WORK: { dot: "bg-stone-400", badge: "bg-stone-100 text-stone-500" },
    DEEP_FOCUS: { dot: "bg-red-400", badge: "bg-red-50    text-red-700" },
};

const STATUS_ORDER: UserStatus[] = ["WORKING", "VACATION", "OFF_WORK", "DEEP_FOCUS"];

interface StatusDropdownProps {
    /** 드롭다운 패널 정렬 방향 */
    align?: "left" | "right";
}

export function StatusDropdown({ align = "left" }: StatusDropdownProps) {
    const tStatus = useTranslations("domain.userStatus");
    const { status: current, setStatus: setCurrent } = useUserStatus();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", handler);
        return () => document.removeEventListener("pointerdown", handler);
    }, [open]);

    function handleSelect(status: UserStatus) {
        if (status === current) {
            setOpen(false);
            return;
        }
        const prev = current;
        setOpen(false);
        setCurrent(status);
        startTransition(async () => {
            const result = await updateStatusAction(status);
            if (!result.ok) setCurrent(prev);
        });
    }

    const s = STATUS_STYLE[current];

    return (
        <div ref={ref} className="relative inline-flex items-center">
            <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-opacity disabled:opacity-60 ${s.badge}`}
            >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                {tStatus(current)}
                <svg
                    className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                </svg>
            </button>

            {open && (
                <div
                    className={`absolute top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
                >
                    {STATUS_ORDER.map((st) => {
                        const si = STATUS_STYLE[st];
                        const isActive = st === current;
                        return (
                            <button
                                key={st}
                                type="button"
                                onClick={() => handleSelect(st)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-stone-50"
                            >
                                <span className={`h-2 w-2 shrink-0 rounded-full ${si.dot}`} />
                                <span
                                    className={`font-medium ${isActive ? "text-stone-800" : "text-stone-500"}`}
                                >
                                    {tStatus(st)}
                                </span>
                                {isActive && (
                                    <svg
                                        className="ml-auto h-3 w-3 shrink-0 text-stone-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2.5}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4.5 12.75l6 6 9-13.5"
                                        />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
