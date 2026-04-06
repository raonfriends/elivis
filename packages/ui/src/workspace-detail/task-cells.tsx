"use client";

import { useState } from "react";

import type { ApiWorkspaceTask } from "../types/workspace-api";

export function DateCell({
    value,
    disabled,
    onCommit,
}: {
    value: string | null;
    disabled?: boolean;
    onCommit: (v: string | null) => void;
}) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <input
                type="date"
                autoFocus
                defaultValue={value ? value.slice(0, 10) : ""}
                className="rounded border border-stone-300 px-1.5 py-0.5 text-xs outline-none focus:border-stone-500"
                onChange={(e) => {
                    onCommit(e.target.value || null);
                    setEditing(false);
                }}
                onBlur={() => setEditing(false)}
                disabled={disabled}
            />
        );
    }

    const formatted = value
        ? (() => {
            const d = new Date(value);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        })()
        : null;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                formatted
                    ? "font-medium text-stone-700 hover:bg-stone-100"
                    : "text-stone-300 hover:text-stone-500"
            }`}
        >
            {formatted ?? "—"}
        </button>
    );
}

export function AssigneeChip({ assignee }: { assignee: ApiWorkspaceTask["assignee"] }) {
    if (!assignee) return <span className="text-xs text-stone-400">—</span>;
    const name = assignee.name?.trim() || assignee.email.split("@")[0];
    return (
        <div className="flex items-center gap-1.5">
            {assignee.avatarUrl ? (
                <img src={assignee.avatarUrl} alt={name} className="h-5 w-5 rounded-full object-cover ring-1 ring-white" />
            ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600">
                    {name[0]?.toUpperCase()}
                </span>
            )}
            <span className="max-w-[80px] truncate text-xs text-stone-600">{name}</span>
        </div>
    );
}
