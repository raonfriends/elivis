"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskDetailPanel from "../workspace/TaskDetailPanel";
import type { ApiWorkspacePriority, ApiWorkspaceStatus, ApiWorkspaceTask } from "../types/workspace-api";
import type { WorkspaceDetailMyWorkMutations } from "../types/workspace-detail-mutations";
import type { WorkspaceTaskDetailActions } from "../types/workspace-task-detail-actions";
import { formatTaskTitleForList } from "../utils/task-title-display";

import { DroppableColumn } from "./DroppableColumn";
import { FilterSortDropdown } from "./FilterSortDropdown";
import { InlineAddForm } from "./InlineAddForm";
import { SortableTaskRow } from "./TaskRows";
import type { MyWorkView, SortBy } from "./types";
import { siblingTasksForParent } from "./task-sort";

export function MyWorkTab({
    tasks, statuses, priorities, workspaceId,
    myWorkMutations,
    taskPanelActions,
    onUpdate, onDelete, onAdded, onStatusesChange, onPrioritiesChange,
    onTasksChange,
}: {
    tasks: ApiWorkspaceTask[];
    statuses: ApiWorkspaceStatus[];
    priorities: ApiWorkspacePriority[];
    workspaceId: string;
    myWorkMutations: WorkspaceDetailMyWorkMutations;
    taskPanelActions: WorkspaceTaskDetailActions;
    onUpdate: (t: ApiWorkspaceTask) => void;
    onDelete: (id: string) => void;
    onAdded: (t: ApiWorkspaceTask) => void;
    onStatusesChange: (s: ApiWorkspaceStatus[]) => void;
    onPrioritiesChange: (p: ApiWorkspacePriority[]) => void;
    onTasksChange: (t: ApiWorkspaceTask[]) => void;
}) {
    const t = useTranslations("workspace");
    const [view, setView] = useState<MyWorkView>("list");
    const [addingTop, setAddingTop] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [panelTask, setPanelTask] = useState<ApiWorkspaceTask | null>(null);
    const [filterStatusId, setFilterStatusId] = useState<string>("all");
    const [filterPriorityId, setFilterPriorityId] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortBy>("default");

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const topTasks = tasks.filter((t) => !t.parentId);
    const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

    // ── 필터 적용 ──────────────────────────────────────────────────────────
    const filteredTopTasks = topTasks
        .filter((t) => filterStatusId === "all" || t.statusId === filterStatusId)
        .filter((t) => filterPriorityId === "all" || t.priorityId === filterPriorityId);

    // ── 정렬 적용 ──────────────────────────────────────────────────────────
    const displayTopTasks = sortBy === "default"
        ? filteredTopTasks
        : [...filteredTopTasks].sort((a, b) => {
            if (sortBy === "status") {
                return sortedStatuses.findIndex((s) => s.id === a.statusId) - sortedStatuses.findIndex((s) => s.id === b.statusId);
            }
            if (sortBy === "priority") {
                return (b.priority?.value ?? -1) - (a.priority?.value ?? -1);
            }
            if (sortBy === "startDate") {
                if (!a.startDate && !b.startDate) return 0;
                if (!a.startDate) return 1;
                if (!b.startDate) return -1;
                return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            }
            if (sortBy === "dueDate") {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            return 0;
        });

    const topTaskIds = displayTopTasks.map((t) => t.id);

    // 보드: 상태 필터 적용
    const displayStatuses = filterStatusId === "all"
        ? sortedStatuses
        : sortedStatuses.filter((s) => s.id === filterStatusId);

    // 필터/정렬 옵션
    const statusOptions = [
        { value: "all", label: t("toolbar.allStatuses") },
        ...sortedStatuses.map((s) => ({ value: s.id, label: s.name })),
    ];
    const priorityOptions = [
        { value: "all", label: t("toolbar.allPriorities") },
        ...([...priorities].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))).map((p) => ({ value: p.id, label: p.name })),
    ];
    const sortOptions: { value: SortBy; label: string }[] = [
        { value: "default", label: t("sort.default") },
        { value: "status", label: t("sort.status") },
        { value: "priority", label: t("sort.priority") },
        { value: "startDate", label: t("sort.startDate") },
        { value: "dueDate", label: t("sort.dueDate") },
    ];

    // ── 리스트 뷰 DnD ──────────────────────────────────────────────────────

    function handleListDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);
        if (!over || active.id === over.id) return;

        const activeTask = tasks.find((t) => t.id === active.id);
        const overTask = tasks.find((t) => t.id === over.id);
        if (!activeTask || !overTask) return;

        const activeParent = activeTask.parentId ?? null;
        const overParent = overTask.parentId ?? null;
        if (activeParent !== overParent) return;

        const siblingList =
            activeParent === null
                ? displayTopTasks
                : siblingTasksForParent(tasks, activeParent);

        const oldIndex = siblingList.findIndex((t) => t.id === active.id);
        const newIndex = siblingList.findIndex((t) => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(siblingList, oldIndex, newIndex);
        const items = reordered.map((t, i) => ({ ...t, order: i }));

        const nextTasks = tasks.map((t) => {
            const u = items.find((x) => x.id === t.id);
            return u ?? t;
        });
        onTasksChange(nextTasks);

        myWorkMutations.reorderWorkspaceTasks(
            workspaceId,
            items.map((t) => ({ id: t.id, order: t.order })),
        );
    }

    // ── 보드 뷰 DnD (컬럼 간 이동) ────────────────────────────────────────

    function handleBoardDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const draggedTask = tasks.find((t) => t.id === active.id);
        if (!draggedTask) return;

        const targetStatusId = over.id as string;
        if (targetStatusId === draggedTask.statusId) return;

        // 타깃 컬럼에서 마지막 order 계산
        const colTasks = tasks.filter((t) => t.statusId === targetStatusId && !t.parentId);
        const newOrder = colTasks.length;

        const updatedTask: ApiWorkspaceTask = { ...draggedTask, statusId: targetStatusId, status: statuses.find((s) => s.id === targetStatusId)! ?? draggedTask.status, order: newOrder };
        onUpdate(updatedTask);

        myWorkMutations.reorderWorkspaceTasks(workspaceId, [
            { id: draggedTask.id, order: newOrder, statusId: targetStatusId },
        ]);
    }

    return (
        <div className="flex h-full flex-col">
            {/* 툴바 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-4 py-2 sm:px-5">
                {/* 뷰 토글 */}
                <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                    {(["list", "board"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setView(v)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === v ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                            {v === "list" ? t("toolbar.list") : t("toolbar.board")}
                        </button>
                    ))}
                </div>

                {/* 구분선 */}
                <div className="h-4 w-px bg-stone-200" />

                {/* 필터 */}
                <FilterSortDropdown
                    value={filterStatusId}
                    options={statusOptions}
                    onChange={setFilterStatusId}
                    label={t("toolbar.filterStatus")}
                />
                <FilterSortDropdown
                    value={filterPriorityId}
                    options={priorityOptions}
                    onChange={setFilterPriorityId}
                    label={t("toolbar.filterPriority")}
                />

                {/* 구분선 */}
                <div className="h-4 w-px bg-stone-200" />

                {/* 정렬 */}
                <FilterSortDropdown
                    value={sortBy}
                    options={sortOptions}
                    onChange={setSortBy}
                    label={t("toolbar.sort")}
                />

                {/* 필터/정렬 초기화 */}
                {(filterStatusId !== "all" || filterPriorityId !== "all" || sortBy !== "default") && (
                    <button
                        type="button"
                        onClick={() => { setFilterStatusId("all"); setFilterPriorityId("all"); setSortBy("default"); }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {t("toolbar.reset")}
                    </button>
                )}

                {/* 우측: 업무 추가 */}
                <div className="ml-auto">
                    <button type="button" onClick={() => setAddingTop(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t("common.addTask")}
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
                {/* ── 리스트 뷰 ── */}
                {view === "list" && (
                    <DndContext id="workspace-list-dnd" sensors={sensors} collisionDetection={closestCenter}
                        onDragStart={(e) => setActiveId(String(e.active.id))}
                        onDragEnd={handleListDragEnd}>
                        <SortableContext items={topTaskIds} strategy={verticalListSortingStrategy}>
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50/60">
                                        <th className="w-6 py-2 pl-2" />
                                        <th className="py-2 pr-3 pl-1 text-left text-xs font-medium text-stone-500">{t("table.task")}</th>
                                        <th className="py-2 pr-2 text-center text-xs font-medium text-stone-500">{t("table.status")}</th>
                                        <th className="py-2 pr-2 text-center text-xs font-medium text-stone-500">{t("table.priority")}</th>
                                        <th className="hidden py-2 pr-3 text-center text-xs font-medium text-stone-500 sm:table-cell">{t("table.assignee")}</th>
                                        <th className="hidden py-2 pr-2 text-center text-xs font-medium text-stone-500 md:table-cell">{t("table.startDate")}</th>
                                        <th className="hidden py-2 pr-2 text-center text-xs font-medium text-stone-500 md:table-cell">{t("table.dueDate")}</th>
                                        <th className="w-16 py-2 pr-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {addingTop && (
                                        <tr>
                                            <td colSpan={8} className="px-3 py-1.5">
                                                <InlineAddForm workspaceId={workspaceId} defaultStatusId={sortedStatuses[0]?.id}
                                                    createWorkspaceTask={myWorkMutations.createWorkspaceTask}
                                                    onAdded={(t) => { onAdded(t); setAddingTop(false); }} onCancel={() => setAddingTop(false)} />
                                            </td>
                                        </tr>
                                    )}
                                    {displayTopTasks.map((task) => (
                                        <SortableTaskRow key={task.id} task={task}
                                            subTasks={tasks.filter((t) => t.parentId === task.id)}
                                            allTasks={tasks} statuses={statuses} priorities={priorities}
                                            workspaceId={workspaceId} depth={0}
                                            onUpdate={onUpdate} onDelete={onDelete} onAdded={onAdded}
                                            onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange}
                                            onOpenPanel={(t) => setPanelTask(t)}
                                            myWorkMutations={myWorkMutations}
                                        />
                                    ))}
                                    {!addingTop && displayTopTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-sm text-stone-400">
                                                {topTasks.length === 0 ? t("empty.noTasks") : t("empty.noTasksFilter")}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </SortableContext>
                        <DragOverlay>
                            {activeTask && (
                                <div className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold shadow-lg opacity-90">
                                    {formatTaskTitleForList(activeTask.title)}
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* ── 보드 뷰 ── */}
                {view === "board" && (
                    <DndContext id="workspace-board-dnd" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleBoardDragEnd}>
                        <div className="flex gap-4 overflow-x-auto p-4">
                            {displayStatuses.map((status) => {
                                const colTasks = tasks
                                    .filter((t) => t.statusId === status.id && !t.parentId)
                                    .filter((t) => filterPriorityId === "all" || t.priorityId === filterPriorityId)
                                    .sort((a, b) => {
                                        if (sortBy === "priority") return (b.priority?.value ?? -1) - (a.priority?.value ?? -1);
                                        if (sortBy === "startDate") {
                                            if (!a.startDate && !b.startDate) return 0;
                                            if (!a.startDate) return 1;
                                            if (!b.startDate) return -1;
                                            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                                        }
                                        if (sortBy === "dueDate") {
                                            if (!a.dueDate && !b.dueDate) return 0;
                                            if (!a.dueDate) return 1;
                                            if (!b.dueDate) return -1;
                                            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                        }
                                        return a.order - b.order;
                                    });
                                return (
                                    <DroppableColumn key={status.id} status={status} tasks={colTasks}
                                        statuses={statuses} priorities={priorities} workspaceId={workspaceId}
                                        myWorkMutations={myWorkMutations}
                                        onUpdate={onUpdate} onDelete={onDelete} onAdded={onAdded}
                                        onStatusesChange={onStatusesChange} onPrioritiesChange={onPrioritiesChange}
                                        onOpenPanel={(t) => setPanelTask(t)} />
                                );
                            })}
                        </div>
                        <DragOverlay>
                            {activeTask && (
                                <div className="w-[260px] rounded-lg border border-stone-300 bg-white p-3 shadow-xl opacity-95">
                                    <p className="text-sm font-medium text-stone-800">{formatTaskTitleForList(activeTask.title)}</p>
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* 업무 상세 슬라이드 패널 */}
            {panelTask && (
                <TaskDetailPanel
                    actions={taskPanelActions}
                    task={panelTask}
                    statuses={statuses}
                    priorities={priorities}
                    workspaceId={workspaceId}
                    onUpdate={(t) => { onUpdate(t); setPanelTask(t); }}
                    onClose={() => setPanelTask(null)}
                />
            )}
        </div>
    );
}