import type { FastifyInstance, FastifyReply } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../../utils/messages";
import { forbidden, notFound } from "../../utils/response";

/** 워크스페이스 소유자인지 확인 후 row 반환. 없으면 null */
export async function findOwnWorkspace(
    app: FastifyInstance,
    workspaceId: string,
    userId: string,
) {
    return app.prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
    });
}

/**
 * 워크스페이스 소유자이거나 같은 프로젝트 멤버면 접근 허용.
 * 직접 ProjectMember 뿐만 아니라 팀을 통한 프로젝트 접근도 허용.
 * 조회(읽기) 전용 API에 사용.
 */
export async function findAccessibleWorkspace(
    app: FastifyInstance,
    workspaceId: string,
    userId: string,
) {
    const ws = await app.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, userId: true, projectId: true },
    });
    if (!ws) return null;
    // 소유자면 바로 허용
    if (ws.userId === userId) return ws;
    // 직접 프로젝트 멤버 확인
    const directMember = await app.prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId: ws.projectId } },
        select: { role: true },
    });
    if (directMember) return ws;
    // 팀을 통한 프로젝트 접근 확인 (공개 프로젝트 + 팀 멤버)
    const teamAccess = await (app.prisma as any).project.findFirst({
        where: {
            id: ws.projectId,
            isPublic: true,
            OR: [
                { team: { members: { some: { userId } } } },
                { projectTeams: { some: { team: { members: { some: { userId } } } } } },
            ],
        },
        select: { id: true },
    });
    return teamAccess ? ws : null;
}

/** 접근 불가 시 404/403 응답 전송 */
export async function rejectNoWorkspace(
    app: FastifyInstance,
    workspaceId: string,
    lang: string,
    reply: FastifyReply,
) {
    const exists = await app.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
    });
    return reply.code(exists ? 403 : 404).send(
        exists
            ? forbidden(t(lang, MSG.WORKSPACE_FORBIDDEN))
            : notFound(t(lang, MSG.WORKSPACE_NOT_FOUND)),
    );
}

/** 업무에 status + priority 인라인 조인 (별도 query) */
export async function withStatus(
    app: FastifyInstance,
    task: { statusId: string; priorityId?: string | null; [key: string]: unknown },
) {
    const [status, priority] = await Promise.all([
        (app.prisma as any).workspaceStatus.findUnique({
            where: { id: task.statusId },
            select: { id: true, name: true, color: true, order: true, semantic: true },
        }),
        task.priorityId
            ? (app.prisma as any).workspacePriority.findUnique({
                where: { id: task.priorityId },
                select: { id: true, name: true, color: true, order: true, value: true },
              })
            : null,
    ]);
    return {
        ...task,
        status: status ?? { id: task.statusId, name: "—", color: "gray", order: 0, semantic: "IN_PROGRESS" },
        priority: priority ?? null,
    };
}

export async function withStatusMany(
    app: FastifyInstance,
    tasks: Array<{ statusId: string; priorityId?: string | null; [key: string]: unknown }>,
) {
    if (tasks.length === 0) return tasks;

    const statusIds = [...new Set(tasks.map((t) => t.statusId))];
    const priorityIds = [...new Set(tasks.map((t) => t.priorityId).filter(Boolean))] as string[];

    const [statuses, priorities] = await Promise.all([
        (app.prisma as any).workspaceStatus.findMany({
            where: { id: { in: statusIds } },
            select: { id: true, name: true, color: true, order: true, semantic: true },
        }),
        priorityIds.length > 0
            ? (app.prisma as any).workspacePriority.findMany({
                where: { id: { in: priorityIds } },
                select: { id: true, name: true, color: true, order: true, value: true },
              })
            : [],
    ]);

    const statusMap = new Map(statuses.map((s: { id: string }) => [s.id, s]));
    const priorityMap = new Map(priorities.map((p: { id: string }) => [p.id, p]));

    return tasks.map((task) => ({
        ...task,
        status: statusMap.get(task.statusId) ?? {
            id: task.statusId,
            name: "—",
            color: "gray",
            order: 0,
            semantic: "IN_PROGRESS",
        },
        priority: task.priorityId ? (priorityMap.get(task.priorityId as string) ?? null) : null,
    }));
}
