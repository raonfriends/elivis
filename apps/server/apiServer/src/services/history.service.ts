import type { FastifyInstance } from "fastify";
import type {
    ProjectHistoryAction,
    ProjectHistoryResourceType,
} from "@repo/database";
import { generatePublicId } from "@repo/database";

export interface RecordHistoryOptions {
    projectId: string;
    userId: string;
    action: ProjectHistoryAction;
    resourceType: ProjectHistoryResourceType;
    resourceId?: string;
    resourceName?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
}

/**
 * 프로젝트 변경 사항을 ProjectHistory 테이블에 기록합니다.
 * fire-and-forget: 히스토리 기록 실패가 본 요청에 영향을 주지 않습니다.
 */
export function recordHistory(
    app: FastifyInstance,
    options: RecordHistoryOptions,
): void {
    const { projectId, userId, action, resourceType, resourceId, resourceName, before, after } =
        options;

    void (app.prisma as any).projectHistory
        .create({
            data: {
                id: generatePublicId(12),
                projectId,
                userId,
                action,
                resourceType,
                resourceId: resourceId ?? null,
                resourceName: resourceName ?? null,
                before: before ? JSON.stringify(before) : null,
                after: after ? JSON.stringify(after) : null,
            },
        })
        .catch((err: unknown) => {
            app.log.error({ err }, "[History] Failed to record project history");
        });
}
