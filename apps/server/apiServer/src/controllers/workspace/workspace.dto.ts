// ─────────────────────────────────────────────────────────────────────────────
// 요청 바디 / 파라미터 타입 (워크스페이스 API)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceParams {
    workspaceId: string;
}

/** PATCH /api/workspaces/:workspaceId — 본인 워크스페이스 메타 */
export interface UpdateWorkspaceBody {
    /** null이면 프로젝트명으로 되돌림(저장 값 삭제) */
    sidebarLabel: string | null;
}

export interface WorkspaceTaskParams extends WorkspaceParams {
    taskId: string;
}

export interface WorkspaceStatusParams extends WorkspaceParams {
    statusId: string;
}

export interface CreateWorkspaceTaskBody {
    title: string;
    statusId?: string;
    priorityId?: string;
    assigneeId?: string;
    startDate?: string;
    dueDate?: string;
    order?: number;
    parentId?: string;
}

export interface UpdateWorkspaceTaskBody {
    title?: string;
    description?: string | null;
    statusId?: string;
    priorityId?: string | null;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    order?: number;
}

export interface WorkspaceTaskCommentParams extends WorkspaceTaskParams {
    commentId: string;
}

export interface CreateWorkspaceTaskCommentBody {
    content: string;
}

export interface WorkspaceTaskAttachmentParams extends WorkspaceTaskParams {
    attachmentId: string;
}

export interface WorkspaceTaskNoteParams extends WorkspaceTaskParams {
    noteId: string;
}

export interface CreateWorkspaceTaskNoteBody {
    content: string;
}

/** Prisma `WorkspaceStatusSemantic`와 동일 문자열 */
export type WorkspaceStatusSemanticDto =
    | "WAITING"
    | "REVIEW"
    | "IN_PROGRESS"
    | "ON_HOLD"
    | "DONE";

export interface CreateWorkspaceStatusBody {
    name: string;
    color?: string;
    order?: number;
    notifyOnChange?: boolean;
    semantic: WorkspaceStatusSemanticDto;
}

export interface UpdateWorkspaceStatusBody {
    name?: string;
    color?: string;
    order?: number;
    notifyOnChange?: boolean;
    semantic?: WorkspaceStatusSemanticDto;
}

export interface WorkspacePriorityParams extends WorkspaceParams {
    priorityId: string;
}

export interface CreateWorkspacePriorityBody {
    name: string;
    color?: string;
    order?: number;
    value?: number;
}

export interface UpdateWorkspacePriorityBody {
    name?: string;
    color?: string;
    order?: number;
    value?: number;
}

export interface ReorderTasksBody {
    items: Array<{ id: string; order: number; statusId?: string }>;
}
