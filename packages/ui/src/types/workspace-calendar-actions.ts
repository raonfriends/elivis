import type { ApiWorkspaceTask } from "./workspace-api";

export type CreateWorkspaceTaskFn = (
    workspaceId: string,
    input: {
        title: string;
        statusId?: string;
        priorityId?: string;
        assigneeId?: string;
        startDate?: string;
        dueDate?: string;
        parentId?: string;
    },
) => Promise<{ ok: true; task: ApiWorkspaceTask } | { ok: false; message: string }>;
