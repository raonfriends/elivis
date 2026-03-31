import type { FastifyInstance } from "fastify";

import { authenticateUser } from "../middleware/auth";
import { createUserController } from "../controllers/user.controller";

export async function userRoutes(app: FastifyInstance) {
    const { getMe, updateMe, uploadAvatar, deleteAvatar } = createUserController(app);

    app.get("/users/me", { preHandler: [authenticateUser] }, getMe);
    app.patch("/users/me", { preHandler: [authenticateUser] }, updateMe);
    app.post("/users/me/avatar", { preHandler: [authenticateUser] }, uploadAvatar);
    app.delete("/users/me/avatar", { preHandler: [authenticateUser] }, deleteAvatar);
}
