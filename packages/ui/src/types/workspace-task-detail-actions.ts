import type {
    ApiWorkspaceTask,
    ApiWorkspaceTaskAttachment,
    ApiWorkspaceTaskComment,
    ApiWorkspaceTaskNote,
} from "./workspace-api";

/** TaskDetailPanel·노트·댓글·첨부 — 앱에서 서버 액션 묶음으로 주입 */
export interface WorkspaceTaskDetailActions {
    updateWorkspaceTaskAction: (
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
    listTaskCommentsAction: (
        workspaceId: string,
        taskId: string,
    ) => Promise<{ ok: true; comments: ApiWorkspaceTaskComment[] } | { ok: false; message: string }>;
    createTaskCommentAction: (
        workspaceId: string,
        taskId: string,
        content: string,
    ) => Promise<{ ok: true; comment: ApiWorkspaceTaskComment } | { ok: false; message: string }>;
    deleteTaskCommentAction: (
        workspaceId: string,
        taskId: string,
        commentId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    listTaskAttachmentsAction: (
        workspaceId: string,
        taskId: string,
    ) => Promise<{ ok: true; attachments: ApiWorkspaceTaskAttachment[] } | { ok: false; message: string }>;
    uploadTaskAttachmentAction: (
        workspaceId: string,
        taskId: string,
        formData: FormData,
    ) => Promise<{ ok: true; attachment: ApiWorkspaceTaskAttachment } | { ok: false; message: string }>;
    deleteTaskAttachmentAction: (
        workspaceId: string,
        taskId: string,
        attachmentId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    listTaskNotesAction: (
        workspaceId: string,
        taskId: string,
    ) => Promise<{ ok: true; notes: ApiWorkspaceTaskNote[] } | { ok: false; message: string }>;
    createTaskNoteAction: (
        workspaceId: string,
        taskId: string,
        content: string,
    ) => Promise<{ ok: true; note: ApiWorkspaceTaskNote } | { ok: false; message: string }>;
    deleteTaskNoteAction: (
        workspaceId: string,
        taskId: string,
        noteId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
}
