import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { t } from "@repo/i18n";

import { MSG } from "../utils/messages";
import { ok } from "../utils/response";

export interface UpdateRoleParams {
    userId: string;
}

export interface UpdateRoleBody {
    systemRole: "SUPER_ADMIN" | "USER";
}

export function createAdminController(app: FastifyInstance) {
    async function listUsers(request: FastifyRequest, reply: FastifyReply) {
        const users = await app.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                systemRole: true,
                createdAt: true,
                _count: { select: { memberships: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return reply.send(ok(users, t(request.lang, MSG.ADMIN_USERS_FETCHED)));
    }

    async function updateUserRole(
        request: FastifyRequest<{ Params: UpdateRoleParams; Body: UpdateRoleBody }>,
        reply: FastifyReply,
    ) {
        const { userId } = request.params;
        const { systemRole } = request.body;

        const updated = await app.prisma.user.update({
            where: { id: userId },
            data: { systemRole },
            select: { id: true, email: true, systemRole: true },
        });

        return reply.send(ok(updated, t(request.lang, MSG.ADMIN_USER_ROLE_UPDATED)));
    }

    return { listUsers, updateUserRole };
}
