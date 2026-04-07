import type { PrismaClient } from "@prisma/client";

/**
 * 프로젝트 관련 푸시 알림을 해당 사용자에게 보낼지 여부.
 * - ProjectMember.notifyEnabled 가 false 면 차단
 * - 프로젝트에 연결된 팀 중, 사용자가 속한 팀이 하나라도 있으면 그중 최소 하나는 notifyEnabled 가 true 여야 함
 */
export async function shouldDeliverProjectNotification(
    prisma: PrismaClient,
    userId: string,
    projectId: string,
): Promise<boolean> {
    const pm = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId, projectId } },
        select: { notifyEnabled: true },
    });
    if (pm && !pm.notifyEnabled) return false;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            teamId: true,
            projectTeams: { select: { teamId: true } },
        },
    });
    if (!project) return false;

    const linkedTeamIds = new Set<string>();
    if (project.teamId) linkedTeamIds.add(project.teamId);
    for (const pt of project.projectTeams) linkedTeamIds.add(pt.teamId);

    if (linkedTeamIds.size === 0) return true;

    const memberships = await prisma.teamMember.findMany({
        where: { userId, teamId: { in: [...linkedTeamIds] } },
        select: { notifyEnabled: true },
    });
    if (memberships.length === 0) return true;

    return memberships.some((m) => m.notifyEnabled);
}
