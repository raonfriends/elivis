import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { badRequest, created, forbidden, notFound, ok } from "../utils/response";

export interface CreateProjectBody {
    name: string;
    description?: string;
}

export interface ProjectParams {
    projectId: string;
}

export interface AddMemberBody {
    userId: string;
    role?: "DEPUTY_LEADER" | "MEMBER";
}

export function createProjectController(app: FastifyInstance) {
    async function createProject(
        request: FastifyRequest<{ Body: CreateProjectBody }>,
        reply: FastifyReply,
    ) {
        const { name, description } = request.body;
        const lang = request.lang;

        if (!name?.trim()) {
            return reply.code(400).send(badRequest(t(lang, MSG.PROJECT_NAME_REQUIRED)));
        }

        const project = await app.prisma.project.create({
            data: {
                name: name.trim(),
                description,
                members: {
                    create: { userId: request.userId, role: "LEADER" },
                },
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
            include: {
                members: {
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                },
            },
        });

        if (!project) {
            return reply.code(404).send(notFound(t(lang, MSG.PROJECT_NOT_FOUND)));
        }

        const isMember = project.members.some((m) => m.userId === request.userId);
        if (!isMember) {
            return reply.code(403).send(forbidden(t(lang, MSG.FORBIDDEN_NOT_MEMBER)));
        }

        return reply.send(ok(project, t(lang, MSG.PROJECT_FETCHED)));
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
            create: { userId, projectId, role },
        });

        return reply.code(201).send(created(member, t(lang, MSG.PROJECT_MEMBER_ADDED)));
    }

    return { createProject, getProject, addMember };
}
