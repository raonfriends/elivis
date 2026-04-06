/** 업무 요청 생성 (앱 `createTaskRequestAction` 시그니처) */
export type CreateProjectTaskRequestFn = (
    projectId: string,
    input: {
        toUserId: string;
        title: string;
        content?: string;
        isUrgent?: boolean;
    },
) => Promise<{ ok: true; request: unknown } | { ok: false; message: string }>;
