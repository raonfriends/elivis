import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generatePublicId } from "@repo/database";
import { ok, created } from "../utils/response";

const MAX_FAVORITES = 10;

export function createProjectFavoriteController(app: FastifyInstance) {
    /** GET /api/projects/favorites */
    async function listFavorites(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.userId;

        const favorites = await (app.prisma as any).projectFavorite.findMany({
            where: { userId },
            orderBy: { order: "asc" },
            select: {
                id: true,
                order: true,
                createdAt: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        isPublic: true,
                        _count: { select: { members: true, tasks: true } },
                        team: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return reply.send(ok(favorites, "즐겨찾기 목록입니다."));
    }

    /** POST /api/projects/:projectId/favorite */
    async function addFavorite(
        request: FastifyRequest<{ Params: { projectId: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const projectId = request.params.projectId;

        const project = await app.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true },
        });
        if (!project) {
            return reply.status(404).send({ code: 404, message: "프로젝트를 찾을 수 없습니다.", data: null });
        }

        const existing = await (app.prisma as any).projectFavorite.findUnique({
            where: { userId_projectId: { userId, projectId } },
        });
        if (existing) {
            return reply.status(409).send({ code: 409, message: "이미 즐겨찾기에 추가된 프로젝트입니다.", data: null });
        }

        const count = await (app.prisma as any).projectFavorite.count({ where: { userId } });
        if (count >= MAX_FAVORITES) {
            return reply.status(400).send({
                code: 400,
                message: `즐겨찾기는 최대 ${MAX_FAVORITES}개까지 추가할 수 있습니다.`,
                data: null,
            });
        }

        const favorite = await (app.prisma as any).projectFavorite.create({
            data: {
                id: generatePublicId(12),
                userId,
                projectId,
                order: count,
            },
            select: {
                id: true,
                order: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        isPublic: true,
                        _count: { select: { members: true, tasks: true } },
                        team: { select: { id: true, name: true } },
                    },
                },
            },
        });

        return reply.status(201).send(created(favorite, "즐겨찾기에 추가되었습니다."));
    }

    /** DELETE /api/projects/:projectId/favorite */
    async function removeFavorite(
        request: FastifyRequest<{ Params: { projectId: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const projectId = request.params.projectId;

        const deleted = await (app.prisma as any).projectFavorite.deleteMany({
            where: { userId, projectId },
        });

        if (deleted.count === 0) {
            return reply.status(404).send({ code: 404, message: "즐겨찾기 항목을 찾을 수 없습니다.", data: null });
        }

        // order 재정렬
        const remaining = await (app.prisma as any).projectFavorite.findMany({
            where: { userId },
            orderBy: { order: "asc" },
            select: { id: true },
        });
        await Promise.all(
            remaining.map((f: { id: string }, i: number) =>
                (app.prisma as any).projectFavorite.update({
                    where: { id: f.id },
                    data: { order: i },
                }),
            ),
        );

        return reply.send(ok(null, "즐겨찾기에서 제거되었습니다."));
    }

    /** GET /api/projects/:projectId/favorite/status */
    async function checkFavorite(
        request: FastifyRequest<{ Params: { projectId: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const projectId = request.params.projectId;

        const fav = await (app.prisma as any).projectFavorite.findUnique({
            where: { userId_projectId: { userId, projectId } },
            select: { id: true },
        });

        return reply.send(ok({ isFavorite: !!fav }, "즐겨찾기 상태입니다."));
    }

    return { listFavorites, addFavorite, removeFavorite, checkFavorite };
}
