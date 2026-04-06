import type { ApiWorkspaceTask } from "../types/workspace-api";

export function sortTasksByOrder(a: ApiWorkspaceTask, b: ApiWorkspaceTask) {
    if (a.order !== b.order) return a.order - b.order;
    return a.createdAt.localeCompare(b.createdAt);
}

/** 같은 parentId 를 가진 형제만, order 순 */
export function siblingTasksForParent(tasks: ApiWorkspaceTask[], parentId: string | null): ApiWorkspaceTask[] {
    return tasks
        .filter((t) => (t.parentId ?? null) === (parentId ?? null))
        .sort(sortTasksByOrder);
}
