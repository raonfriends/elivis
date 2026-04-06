import type {
    ApiTaskRequest,
    ApiWorkspacePriority,
    ApiWorkspaceStatus,
    ApiWorkspaceTask,
} from "./workspace-api";

/** 내 작업공간 탭 — 상태·우선순위·업무 CRUD·순서 (앱 서버 액션 주입) */
export interface WorkspaceDetailMyWorkMutations {
    createWorkspaceStatus: (
        workspaceId: string,
        input: { name: string; color?: string; notifyOnChange?: boolean },
    ) => Promise<{ ok: true; status: ApiWorkspaceStatus } | { ok: false; message: string }>;
    updateWorkspaceStatus: (
        workspaceId: string,
        statusId: string,
        input: { name?: string; color?: string; notifyOnChange?: boolean },
    ) => Promise<{ ok: true; status: ApiWorkspaceStatus } | { ok: false; message: string }>;
    deleteWorkspaceStatus: (
        workspaceId: string,
        statusId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    createWorkspacePriority: (
        workspaceId: string,
        input: { name: string; color?: string; value?: number },
    ) => Promise<{ ok: true; priority: ApiWorkspacePriority } | { ok: false; message: string }>;
    updateWorkspacePriority: (
        workspaceId: string,
        priorityId: string,
        input: { name?: string; color?: string; value?: number },
    ) => Promise<{ ok: true; priority: ApiWorkspacePriority } | { ok: false; message: string }>;
    deleteWorkspacePriority: (
        workspaceId: string,
        priorityId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    reorderWorkspaceTasks: (
        workspaceId: string,
        items: Array<{ id: string; order: number; statusId?: string }>,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    createWorkspaceTask: (
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
    updateWorkspaceTask: (
        workspaceId: string,
        taskId: string,
        input: {
            title?: string;
            description?: string | null;
            statusId?: string;
            priorityId?: string | null;
            assigneeId?: string | null;
            startDate?: string | null;
            dueDate?: string | null;
            order?: number;
        },
    ) => Promise<{ ok: true; task: ApiWorkspaceTask } | { ok: false; message: string }>;
    deleteWorkspaceTask: (
        workspaceId: string,
        taskId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
}

export interface WorkspaceTaskRequestsActions {
    listTaskRequests: (
        workspaceId: string,
    ) => Promise<{ ok: true; requests: ApiTaskRequest[] } | { ok: false; message: string }>;
    acceptTaskRequest: (
        requestId: string,
        workspaceId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    rejectTaskRequest: (
        requestId: string,
        workspaceId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
}
