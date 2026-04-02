import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generatePublicId } from "@repo/database";
import { ok, created } from "../utils/response";

const MAX_FAVORITES = 10;

export function createTeamFavoriteController(app: FastifyInstance) {
    /** GET /api/teams/favorites — 내 즐겨찾기 목록 */
    async function listFavorites(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.userId;

        const favorites = await (app.prisma as any).teamFavorite.findMany({
            where: { userId },
            orderBy: { order: "asc" },
            select: {
                id: true,
                order: true,
                createdAt: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        shortDescription: true,
                        bannerThumbUrl: true,
                        hiddenFromUsers: true,
                        _count: { select: { members: true } },
                    },
                },
            },
        });

        return reply.send(ok(favorites, "즐겨찾기 목록입니다."));
    }

    /** POST /api/teams/:id/favorite — 즐겨찾기 추가 */
    async function addFavorite(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const teamId = request.params.id;

        // 팀 존재 여부 확인
        const team = await app.prisma.team.findUnique({
            where: { id: teamId },
            select: { id: true, hiddenFromUsers: true },
        });
        if (!team) {
            return reply.status(404).send({ code: 404, message: "팀을 찾을 수 없습니다.", data: null });
        }

        // 이미 즐겨찾기인지 확인
        const existing = await (app.prisma as any).teamFavorite.findUnique({
            where: { userId_teamId: { userId, teamId } },
        });
        if (existing) {
            return reply.status(409).send({ code: 409, message: "이미 즐겨찾기에 추가된 팀입니다.", data: null });
        }

        // 최대 10개 제한
        const count = await (app.prisma as any).teamFavorite.count({ where: { userId } });
        if (count >= MAX_FAVORITES) {
            return reply.status(400).send({
                code: 400,
                message: `즐겨찾기는 최대 ${MAX_FAVORITES}개까지 추가할 수 있습니다.`,
                data: null,
            });
        }

        const favorite = await (app.prisma as any).teamFavorite.create({
            data: {
                id: generatePublicId(12),
                userId,
                teamId,
                order: count, // 현재 개수 = 새 항목의 순서
            },
            select: {
                id: true,
                order: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                        shortDescription: true,
                        bannerThumbUrl: true,
                        hiddenFromUsers: true,
                        _count: { select: { members: true } },
                    },
                },
            },
        });

        return reply.status(201).send(created(favorite, "즐겨찾기에 추가되었습니다."));
    }

    /** DELETE /api/teams/:id/favorite — 즐겨찾기 제거 */
    async function removeFavorite(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const teamId = request.params.id;

        const deleted = await (app.prisma as any).teamFavorite.deleteMany({
            where: { userId, teamId },
        });

        if (deleted.count === 0) {
            return reply.status(404).send({ code: 404, message: "즐겨찾기 항목을 찾을 수 없습니다.", data: null });
        }

        // order 재정렬
        const remaining = await (app.prisma as any).teamFavorite.findMany({
            where: { userId },
            orderBy: { order: "asc" },
            select: { id: true },
        });
        await Promise.all(
            remaining.map((f: { id: string }, i: number) =>
                (app.prisma as any).teamFavorite.update({
                    where: { id: f.id },
                    data: { order: i },
                }),
            ),
        );

        return reply.send(ok(null, "즐겨찾기에서 제거되었습니다."));
    }

    /** GET /api/teams/:id/favorite/status — 즐겨찾기 여부 확인 */
    async function checkFavorite(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const userId = request.userId;
        const teamId = request.params.id;

        const fav = await (app.prisma as any).teamFavorite.findUnique({
            where: { userId_teamId: { userId, teamId } },
            select: { id: true },
        });

        return reply.send(ok({ isFavorite: !!fav }, "즐겨찾기 상태입니다."));
    }

    return { listFavorites, addFavorite, removeFavorite, checkFavorite };
}
