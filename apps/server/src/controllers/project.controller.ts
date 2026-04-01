import {
    canAccessProject,
    checkProjectPermission,
    generatePublicId,
    generateProjectId,
    isSuperAdmin,
} from "@repo/database";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { badRequest, created, forbidden, notFound, ok } from "../utils/response";

export interface CreateProjectBody {
    name: string;
    description?: string;
    /** 연결할 팀 ID 목록. 요청자가 각 팀의 팀장(LEADER)이어야 함. 첫 번째가 `Project.teamId`(호환)와 동기화됩니다. */
    teamIds?: string[];
    /** YYYY-MM-DD */
    startDate?: string;
    endDate?: string;
    noEndDate?: boolean;
    isPublic?: boolean;
    /** 추가 참여자(프로젝트장은 항상 요청자) */
    participantUserIds?: string[];
}

export interface ProjectParams {
    projectId: string;
}

export interface AddMemberBody {
    userId: string;
    role?: "DEPUTY_LEADER" | "MEMBER";
}

export interface UpdateProjectBody {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
    /** YYYY-MM-DD */
    startDate?: string;
    endDate?: string;
    noEndDate?: boolean;
}

export interface DeleteProjectBody {
    confirmName: string;
}

const PROJECT_DETAIL_INCLUDE = {
    team: { select: { id: true, name: true } },
    projectTeams: {
        orderBy: { createdAt: "asc" as const },
        include: {
            team: { select: { id: true, name: true } },
        },
    },
    members: {
        include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
    },
} as const;

/** GET /api/teams/:id 의 `members[]`와 동일 select — 웹 `ApiTeamMemberRow`와 맞춤 */
const LINKED_TEAM_MEMBER_SELECT = {
    role: true,
    joinedAt: true,
    user: { select: { id: true, email: true, name: true, avatarUrl: true } },
} as const;

async function linkedTeamMembersForProject(
    app: FastifyInstance,
    teamId: string | null,
    projectTeams: { teamId: string }[],
) {
    const teamIds = new Set<string>();
    if (teamId) teamIds.add(teamId);
    for (const pt of projectTeams) teamIds.add(pt.teamId);
    if (teamIds.size === 0) return [];

    const rows = await app.prisma.teamMember.findMany({
        where: { teamId: { in: [...teamIds] } },
        select: LINKED_TEAM_MEMBER_SELECT,
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    const seenUser = new Set<string>();
    const out: typeof rows = [];
    for (const r of rows) {
        if (seenUser.has(r.user.id)) continue;
        seenUser.add(r.user.id);
        out.push(r);
    }
    out.sort((a, b) => {
        const na = a.user.name?.trim() || a.user.email;
        const nb = b.user.name?.trim() || b.user.email;
        return na.localeCompare(nb, "ko");
    });
    return out;
}

/** YYYY-MM-DD → UTC 정오 (저장·비교용) */
function parseYmdToUtcNoon(s: string | undefined): Date | null {
    if (!s?.trim()) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if (Number.isNaN(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo, d, 12, 0, 0));
    return Number.isNaN(dt.getTime()) ? null : dt;
}

export function createProjectController(app: FastifyInstance) {
    async function createProject(
        request: FastifyRequest<{ Body: CreateProjectBody }>,
        reply: FastifyReply,
    ) {
        const {
            name,
            description,
            teamIds: rawTeamIds,
            startDate: rawStart,
            endDate: rawEnd,
            noEndDate: rawNoEnd,
            isPublic: rawIsPublic,
            participantUserIds: rawParticipantIds,
        } = request.body;
        const lang = request.lang;

        if (!name?.trim()) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_NAME_REQUIRED)));
        }

        const noEndDate = Boolean(rawNoEnd);
        const isPublic = rawIsPublic !== false;

        const startTrim = rawStart?.trim() ?? "";
        const endTrim = rawEnd?.trim() ?? "";

        if (!startTrim) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_START_DATE_REQUIRED)));
        }

        const startParsed = parseYmdToUtcNoon(startTrim);
        if (!startParsed) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
        }
        const startDate = startParsed;

        let endDate: Date | undefined;
        if (!noEndDate) {
            if (!endTrim) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_END_DATE_REQUIRED)));
            }
            const endParsed = parseYmdToUtcNoon(endTrim);
            if (!endParsed) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
            }
            endDate = endParsed;
        }

        if (endDate && endDate < startDate) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_INVALID_DATES)));
        }

        const fromArray = Array.isArray(rawTeamIds)
            ? rawTeamIds.map((x) => String(x).trim()).filter(Boolean)
            : [];
        const teamIdsUnique = [...new Set(fromArray)];

        for (const tid of teamIdsUnique) {
            const canLink = await app.prisma.team.findFirst({
                where: {
                    id: tid,
                    members: {
                        some: { userId: request.userId, role: "LEADER" },
                    },
                },
                select: { id: true },
            });
            if (!canLink) {
                return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_TEAM_LEADER_ONLY)));
            }
        }

        const primaryTeamId = teamIdsUnique[0];

        const participantIds = [
            ...new Set(
                (rawParticipantIds ?? [])
                    .map((id) => (typeof id === "string" ? id.trim() : ""))
                    .filter(Boolean),
            ),
        ].filter((id) => id !== request.userId);

        if (participantIds.length > 0) {
            const found = await app.prisma.user.findMany({
                where: { id: { in: participantIds } },
                select: { id: true },
            });
            if (found.length !== participantIds.length) {
                return reply
                    .code(400)
                    .send(badRequest(t(lang, MSG.PROJECT_PARTICIPANTS_INVALID)));
            }
        }

        const memberCreates = [
            { id: generatePublicId(), userId: request.userId, role: "LEADER" as const },
            ...participantIds.map((userId) => ({
                id: generatePublicId(),
                userId,
                role: "MEMBER" as const,
            })),
        ];

        const project = await app.prisma.project.create({
            data: {
                id: generateProjectId(),
                name: name.trim(),
                description: description?.trim() || undefined,
                teamId: primaryTeamId,
                startDate,
                endDate: noEndDate ? undefined : endDate,
                noEndDate,
                isPublic,
                members: { create: memberCreates },
                ...(teamIdsUnique.length > 0
                    ? {
                          projectTeams: {
                              create: teamIdsUnique.map((tid) => ({
                                  id: generatePublicId(),
                                  teamId: tid,
                              })),
                          },
                      }
                    : {}),
            },
            include: {
                members: {
                    where: { userId: request.userId },
                    select: { role: true },
                },
            },
        });

        return reply.code(201).send(created(project, t(lang, MSG.PROJECT_CREATED)));
    }

    async function getProject(
        request: FastifyRequest<{ Params: ProjectParams }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;

        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            include: PROJECT_DETAIL_INCLUDE,
        });

        if (!project) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const allowed = await canAccessProject(request.userId, projectId);
        if (!allowed) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        const memberRow = project.members.find((m) => m.userId === request.userId);
        const viewerRole =
            memberRow?.role ??
            ((await isSuperAdmin(request.userId)) ? null : "MEMBER");

        const linkedTeamMembers = await linkedTeamMembersForProject(
            app,
            project.teamId,
            project.projectTeams,
        );

        return reply.send(
            ok({ ...project, linkedTeamMembers, viewerRole }, t(lang, MSG.PROJECT_FETCHED)),
        );
    }

    async function updateProject(
        request: FastifyRequest<{ Params: ProjectParams; Body: UpdateProjectBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;
        const body = request.body ?? {};

        const existing = await app.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const perm = await checkProjectPermission(request.userId, projectId);
        if (!perm.isMember) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }
        if (!perm.isLeader) {
            return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_LEADER_ONLY)));
        }

        const nextName =
            body.name !== undefined ? String(body.name).trim() : existing.name;
        if (!nextName) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_NAME_REQUIRED)));
        }

        const nextDesc =
            body.description !== undefined
                ? body.description === null || String(body.description).trim() === ""
                    ? null
                    : String(body.description).trim()
                : existing.description;

        const nextIsPublic =
            body.isPublic !== undefined ? body.isPublic !== false : existing.isPublic;

        const nextNoEnd =
            body.noEndDate !== undefined ? Boolean(body.noEndDate) : existing.noEndDate;

        let nextStartDate: Date;
        if (body.startDate !== undefined) {
            const p = parseYmdToUtcNoon(body.startDate);
            if (!p) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
            }
            nextStartDate = p;
        } else if (existing.startDate) {
            nextStartDate = existing.startDate;
        } else {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_START_DATE_REQUIRED)));
        }

        let nextEndDate: Date | null;
        if (nextNoEnd) {
            nextEndDate = null;
        } else if (body.endDate !== undefined) {
            const p = parseYmdToUtcNoon(body.endDate);
            if (!p) {
                return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DATE_INVALID)));
            }
            nextEndDate = p;
        } else if (existing.endDate) {
            nextEndDate = existing.endDate;
        } else {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_END_DATE_REQUIRED)));
        }

        if (nextEndDate && nextEndDate < nextStartDate) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_INVALID_DATES)));
        }

        const updated = await app.prisma.project.update({
            where: { id: projectId },
            data: {
                name: nextName,
                description: nextDesc,
                isPublic: nextIsPublic,
                startDate: nextStartDate,
                endDate: nextNoEnd ? null : nextEndDate,
                noEndDate: nextNoEnd,
            },
            include: PROJECT_DETAIL_INCLUDE,
        });

        const viewerRole =
            updated.members.find((m) => m.userId === request.userId)?.role ?? null;

        const linkedTeamMembers = await linkedTeamMembersForProject(
            app,
            updated.teamId,
            updated.projectTeams,
        );

        return reply.send(
            ok({ ...updated, linkedTeamMembers, viewerRole }, t(lang, MSG.PROJECT_UPDATED)),
        );
    }

    async function deleteProject(
        request: FastifyRequest<{ Params: ProjectParams; Body: DeleteProjectBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const lang = request.lang;
        const confirmName = String(request.body?.confirmName ?? "").trim();

        const perm = await checkProjectPermission(request.userId, projectId);
        if (!perm.isMember) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }
        if (!perm.isLeader) {
            return reply.code(403).send(forbidden(t(lang, MSG.PROJECT_LEADER_ONLY)));
        }

        const existing = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true },
        });
        if (!existing) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }
        if (confirmName !== existing.name) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_DELETE_NAME_MISMATCH)));
        }

        await app.prisma.project.delete({ where: { id: projectId } });

        return reply.send(ok({ id: projectId }, t(lang, MSG.PROJECT_DELETED)));
    }

    async function addMember(
        request: FastifyRequest<{ Params: ProjectParams; Body: AddMemberBody }>,
        reply: FastifyReply,
    ) {
        const { projectId } = request.params;
        const { userId, role = "MEMBER" } = request.body;
        const lang = request.lang;

        const member = await app.prisma.projectMember.upsert({
            where: { userId_projectId: { userId, projectId } },
            update: { role },
            create: { id: generatePublicId(), userId, projectId, role },
        });

        return reply.code(201).send(created(member, t(lang, MSG.PROJECT_MEMBER_ADDED)));
    }

    return { createProject, getProject, updateProject, deleteProject, addMember };
}
