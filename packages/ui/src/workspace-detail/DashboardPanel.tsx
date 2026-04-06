"use client";

import { useTranslations } from "next-intl";

import type { ApiWorkspacePriority, ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import { formatTaskTitleForList } from "../utils/task-title-display";

import { tagColorOf } from "../utils/tag-colors";

export function DashboardPanel({
    tasks,
    statuses,
    priorities,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
}) {
    const t = useTranslations("workspace");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topTasks = tasks.filter((t) => !t.parentId);
    const total = topTasks.length;
    const completed = topTasks.filter((t) => (statuses.find((s) => s.id === t.statusId)?.color === "green")).length;
    const overdue = topTasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
        return due < today && statuses.find((s) => s.id === t.statusId)?.color !== "green";
    }).length;
    const dueSoon = topTasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
        const diff = (due.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 3 && statuses.find((s) => s.id === t.statusId)?.color !== "green";
    }).length;
    const noDate = topTasks.filter((t) => !t.startDate && !t.dueDate).length;
    const progressPct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const byStatus = statuses
        .map((s) => ({ ...s, count: topTasks.filter((t) => t.statusId === s.id).length }))
        .filter((s) => s.count > 0).sort((a, b) => a.order - b.order);

    const noPriority = topTasks.filter((t) => !t.priorityId).length;
    const byPriority = priorities
        .map((p) => ({ ...p, count: topTasks.filter((t) => t.priorityId === p.id).length }))
        .filter((p) => p.count > 0).sort((a, b) => a.order - b.order);

    const upcomingTasks = topTasks
        .filter((t) => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
            const diff = (due.getTime() - today.getTime()) / 86400000;
            return diff >= -7 && diff <= 7 && statuses.find((s) => s.id === t.statusId)?.color !== "green";
        })
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-stone-50/40 p-5">
            {/* ── 상단 지표 카드 ── */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: t("dashboard.totalTasks"), value: total, sub: t("dashboard.noDateCount", { count: noDate }), color: "text-stone-900", bg: "bg-white border border-stone-100" },
                    { label: t("dashboard.completed"), value: completed, sub: t("dashboard.achievement", { pct: progressPct }), color: "text-green-700", bg: "bg-green-50 border border-green-100" },
                    { label: t("dashboard.overdue"), value: overdue, sub: t("dashboard.overdueNote"), color: "text-red-600", bg: "bg-red-50 border border-red-100" },
                    { label: t("dashboard.dueSoon"), value: dueSoon, sub: t("dashboard.dueSoonNote"), color: "text-orange-600", bg: "bg-orange-50 border border-orange-100" },
                ].map(({ label, value, sub, color, bg }) => (
                    <div key={label} className={`rounded-2xl ${bg} px-5 py-4`}>
                        <p className="text-xs font-medium text-stone-500">{label}</p>
                        <p className={`mt-1 text-4xl font-bold tracking-tight ${color}`}>{value}</p>
                        <p className="mt-1 text-[11px] text-stone-400">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── 진행률 ── */}
            <div className="mb-5 rounded-2xl border border-stone-100 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-700">{t("dashboard.progress")}</span>
                    <span className="text-2xl font-bold text-stone-900">{progressPct}%</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-2 text-xs text-stone-400">{t("dashboard.progressDetail", { completed, total })}</p>
            </div>

            {/* ── 중단 2열 ── */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* 상태별 */}
                <div className="rounded-2xl border border-stone-100 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-stone-700">{t("dashboard.statusBreakdown")}</h3>
                    {byStatus.length === 0 ? <p className="text-xs text-stone-400">{t("dashboard.noTasks")}</p> : (
                        <div className="space-y-3">
                            {byStatus.map((s) => {
                                const pct = total === 0 ? 0 : Math.round((s.count / total) * 100);
                                const color = tagColorOf(s.color);
                                return (
                                    <div key={s.id}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`} style={color.badgeStyle}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} style={color.dotStyle} />{s.name}
                                            </span>
                                            <span className="text-xs tabular-nums text-stone-500">{t("dashboard.items", { count: s.count })} · {pct}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                            <div className={`h-full rounded-full ${color.dot} transition-all duration-500`} style={{ width: `${pct}%`, ...color.dotStyle }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 우선순위별 */}
                <div className="rounded-2xl border border-stone-100 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-stone-700">{t("dashboard.priorityBreakdown")}</h3>
                    {byPriority.length === 0 && noPriority === total
                        ? <p className="text-xs text-stone-400">{t("dashboard.noTasks")}</p>
                        : (
                            <div className="space-y-3">
                                {byPriority.map((p) => {
                                    const pct = total === 0 ? 0 : Math.round((p.count / total) * 100);
                                    const color = tagColorOf(p.color);
                                    return (
                                        <div key={p.id}>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`} style={color.badgeStyle}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} style={color.dotStyle} />{p.name}
                                                </span>
                                                <span className="text-xs tabular-nums text-stone-500">{t("dashboard.items", { count: p.count })} · {pct}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                                <div className={`h-full rounded-full ${color.dot} transition-all duration-500`} style={{ width: `${pct}%`, ...color.dotStyle }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {noPriority > 0 && (() => {
                                    const pct = total === 0 ? 0 : Math.round((noPriority / total) * 100);
                                    return (
                                        <div>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />{t("dashboard.noPriority")}
                                                </span>
                                                <span className="text-xs tabular-nums text-stone-500">{t("dashboard.items", { count: noPriority })} · {pct}%</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                                <div className="h-full rounded-full bg-stone-300 transition-all duration-500" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                </div>

            </div>

            {/* ── 기한 임박 업무 전체 목록 ── */}
            <div className="rounded-2xl border border-stone-100 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-stone-700">{t("dashboard.upcomingTitle")} <span className="ml-1 text-xs font-normal text-stone-400">{t("dashboard.upcomingNote")}</span></h3>
                {upcomingTasks.length === 0 ? (
                    <p className="text-xs text-stone-400">{t("dashboard.noUpcoming")}</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {upcomingTasks.map((task) => {
                            const due = new Date(task.dueDate!); due.setHours(0, 0, 0, 0);
                            const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
                            const color = tagColorOf(task.status.color);
                            const label = diff < 0 ? t("timeline.daysOverdue", { count: Math.abs(diff) }) : diff === 0 ? t("timeline.todayLabel") : t("timeline.daysLeft", { count: diff });
                            const labelBg = diff < 0 ? "bg-red-100 text-red-600" : diff === 0 ? "bg-orange-100 text-orange-600" : "bg-stone-100 text-stone-500";
                            return (
                                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-stone-100 px-4 py-3">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} style={color.dotStyle} />
                                    <div className="min-w-0 flex-1">
                                        <p title={task.title} className="truncate text-xs font-semibold text-stone-800">{formatTaskTitleForList(task.title)}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-stone-400">{task.status.name}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${labelBg}`}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}