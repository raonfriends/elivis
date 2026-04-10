import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockAssertGoogleOidcAvailable,
    mockCreateGoogleAuthorizationRequest,
    mockConsumeGoogleAuthorization,
    mockGenerateAccessToken,
    mockGenerateRefreshToken,
    mockGetGoogleOidcConfig,
} = vi.hoisted(() => ({
    mockAssertGoogleOidcAvailable: vi.fn(),
    mockCreateGoogleAuthorizationRequest: vi.fn(),
    mockConsumeGoogleAuthorization: vi.fn(),
    mockGenerateAccessToken: vi.fn(),
    mockGenerateRefreshToken: vi.fn(),
    mockGetGoogleOidcConfig: vi.fn(),
}));

vi.mock("../services/google-oidc.service", () => ({
    assertGoogleOidcAvailable: mockAssertGoogleOidcAvailable,
    createGoogleAuthorizationRequest: mockCreateGoogleAuthorizationRequest,
    consumeGoogleAuthorization: mockConsumeGoogleAuthorization,
    getGoogleOidcConfig: mockGetGoogleOidcConfig,
    isGoogleOidcAvailable: vi.fn(),
}));

vi.mock("../services/token.service", () => ({
    generateAccessToken: mockGenerateAccessToken,
    generateRefreshToken: mockGenerateRefreshToken,
    revokeAllRefreshTokens: vi.fn(),
    revokeRefreshToken: vi.fn(),
    rotateTokens: vi.fn(),
    verifyRefreshToken: vi.fn(),
}));

import { createAuthController } from "./auth.controller";

type MockUser = {
    id: string;
    email: string;
    name: string | null;
    password: string;
    systemRole: "SUPER_ADMIN" | "USER";
    authProvider: "LOCAL" | "LDAP" | "GOOGLE";
    googleSub?: string | null;
    accessBlocked: boolean;
    accessBlockReason: string | null;
};

function createReply() {
    return {
        statusCode: 200,
        payload: undefined as unknown,
        redirectUrl: undefined as string | undefined,
        code(code: number) {
            this.statusCode = code;
            return this;
        },
        send(payload: unknown) {
            this.payload = payload;
            return this;
        },
        redirect(url: string) {
            this.statusCode = 302;
            this.redirectUrl = url;
            return this;
        },
    };
}

function createRedis() {
    const store = new Map<string, string>();

    return {
        store,
        async set(key: string, value: string) {
            store.set(key, value);
            return "OK";
        },
        async eval(_script: string, _numKeys: number, key: string) {
            const value = store.get(key) ?? null;
            if (value !== null) {
                store.delete(key);
            }
            return value;
        },
    };
}

function createApp(overrides?: {
    superAdminCount?: number;
    findUniqueImpl?: (args: unknown) => Promise<MockUser | null>;
    createImpl?: (args: unknown) => Promise<MockUser>;
    updateImpl?: (args: unknown) => Promise<MockUser>;
}) {
    const redis = createRedis();

    const app = {
        prisma: {
            user: {
                count: vi.fn(async (args?: { where?: { systemRole?: string } }) => {
                    if (args?.where?.systemRole === "SUPER_ADMIN") {
                        return overrides?.superAdminCount ?? 1;
                    }
                    return 1;
                }),
                findUnique: vi.fn(overrides?.findUniqueImpl ?? (async () => null)),
                create: vi.fn(
                    overrides?.createImpl ??
                        (async (args: { data: Record<string, unknown> }) => ({
                            id: "new-user-id",
                            email: String(args.data.email),
                            name: (args.data.name as string | null | undefined) ?? null,
                            password: String(args.data.password),
                            systemRole: "USER",
                            authProvider: "GOOGLE",
                            googleSub: (args.data.googleSub as string | null | undefined) ?? null,
                            accessBlocked: false,
                            accessBlockReason: null,
                        })),
                ),
                update: vi.fn(
                    overrides?.updateImpl ??
                        (async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
                            id: args.where.id,
                            email: String(args.data.email ?? "google@example.com"),
                            name: (args.data.name as string | null | undefined) ?? null,
                            password: "placeholder-hash",
                            systemRole: "USER",
                            authProvider: "GOOGLE",
                            googleSub: String(args.data.googleSub ?? "google-sub"),
                            accessBlocked: false,
                            accessBlockReason: null,
                        })),
                ),
            },
        },
        redis,
        log: {
            info: vi.fn(),
        },
    };

    return { app, redis };
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEB_PUBLIC_URL = "https://web.example.com";

    mockAssertGoogleOidcAvailable.mockReturnValue({
        enabled: true,
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "https://api.example.com/api/auth/google/callback",
        allowedDomains: new Set(["example.com"]),
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
        issuer: "https://accounts.google.com",
        scopes: ["openid", "email", "profile"],
    });
    mockGetGoogleOidcConfig.mockReturnValue({ enabled: true });
    mockCreateGoogleAuthorizationRequest.mockReturnValue({
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=state-1",
        state: "state-1",
        nonce: "nonce-1",
        codeVerifier: "verifier-1",
        codeChallenge: "challenge-1",
    });
    mockConsumeGoogleAuthorization.mockResolvedValue({
        profile: {
            sub: "google-sub",
            email: "person@example.com",
            emailVerified: true,
            name: "Google Person",
            hostedDomain: "example.com",
        },
        tokenSet: { access_token: "google-access-token" },
    });
    mockGenerateAccessToken.mockResolvedValue("app-access-token");
    mockGenerateRefreshToken.mockResolvedValue("app-refresh-token");
});

describe("auth google route wiring", () => {
    it("registers google auth start/callback/complete routes", () => {
        const routeFile = readFileSync(join(__dirname, "../routes/auth.routes.ts"), "utf8");

        expect(routeFile).toContain('app.get("/auth/google/start"');
        expect(routeFile).toContain('app.get("/auth/google/callback"');
        expect(routeFile).toContain('app.post<{ Body: GoogleCompleteBody }>("/auth/google/complete"');
    });
});

describe("createAuthController google flow", () => {
    it("returns 404 when google auth is disabled", async () => {
        mockGetGoogleOidcConfig.mockReturnValue({ enabled: false });
        const { app, redis } = createApp({ superAdminCount: 0 });
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleStart({ lang: "en" } as never, reply as never);

        expect(mockAssertGoogleOidcAvailable).not.toHaveBeenCalled();
        expect(reply.statusCode).toBe(404);
        expect(redis.store.size).toBe(0);
    });

    it("keeps other google start unavailability as 503", async () => {
        mockAssertGoogleOidcAvailable.mockImplementation(() => {
            throw new Error("Google OIDC requires an existing super admin.");
        });
        const { app, redis } = createApp({ superAdminCount: 0 });
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleStart({ lang: "en" } as never, reply as never);

        expect(mockAssertGoogleOidcAvailable).toHaveBeenCalledWith(false);
        expect(reply.statusCode).toBe(503);
        expect(redis.store.size).toBe(0);
    });

    it("stores authorization state and redirects to Google on start", async () => {
        const { app, redis } = createApp();
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleStart({ lang: "en" } as never, reply as never);

        expect(mockCreateGoogleAuthorizationRequest).toHaveBeenCalled();
        expect(reply.statusCode).toBe(302);
        expect(reply.redirectUrl).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=state-1");
        expect(redis.store.get("auth:google:state:state-1")).toBeTruthy();
    });

    it("creates a new GOOGLE user, issues app tokens, and redirects with a one-time completion ticket", async () => {
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("googleSub" in typedArgs.where) {
                    return null;
                }
                if ("email" in typedArgs.where) {
                    return null;
                }
                return null;
            },
        });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: {
                    code: "auth-code",
                    state: "returned-state",
                },
            } as never,
            reply as never,
        );

        expect(mockConsumeGoogleAuthorization).toHaveBeenCalledWith(
            expect.objectContaining({
                authorizationCode: "auth-code",
                expectedState: "returned-state",
                returnedState: "returned-state",
                expectedNonce: "nonce-1",
                codeVerifier: "verifier-1",
            }),
        );
        expect(app.prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    email: "person@example.com",
                    authProvider: "GOOGLE",
                    googleSub: "google-sub",
                }),
            }),
        );
        expect(mockGenerateAccessToken).toHaveBeenCalledWith("new-user-id");
        expect(mockGenerateRefreshToken).toHaveBeenCalledWith("new-user-id", app.redis);
        expect(reply.statusCode).toBe(302);
        expect(reply.redirectUrl).toMatch(/^https:\/\/web\.example\.com\/auth\/google\/callback\?ticket=/);
        expect(reply.redirectUrl).not.toContain("app-access-token");
        expect(redis.store.size).toBe(1);
    });

    it("checks googleSub before email and reuses an existing GOOGLE user", async () => {
        const existingUser: MockUser = {
            id: "google-user-id",
            email: "person@example.com",
            name: "Existing User",
            password: "hash",
            systemRole: "USER",
            authProvider: "GOOGLE",
            googleSub: "google-sub",
            accessBlocked: false,
            accessBlockReason: null,
        };
        const findUnique = vi.fn(async (args: unknown) => {
            const typedArgs = args as { where: Record<string, string> };
            if ("googleSub" in typedArgs.where) {
                return existingUser;
            }
            if ("email" in typedArgs.where) {
                throw new Error("email lookup should not happen when googleSub matches");
            }
            return null;
        });
        const { app, redis } = createApp({ findUniqueImpl: findUnique });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: { code: "auth-code", state: "returned-state" },
            } as never,
            reply as never,
        );

        expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { googleSub: "google-sub" } }));
        expect(app.prisma.user.create).not.toHaveBeenCalled();
        expect(reply.statusCode).toBe(302);
    });

    it("reuses the googleSub match even when the Google email changed", async () => {
        const existingUser: MockUser = {
            id: "google-user-id",
            email: "old-email@example.com",
            name: "Existing User",
            password: "hash",
            systemRole: "USER",
            authProvider: "GOOGLE",
            googleSub: "google-sub",
            accessBlocked: false,
            accessBlockReason: null,
        };
        mockConsumeGoogleAuthorization.mockResolvedValueOnce({
            profile: {
                sub: "google-sub",
                email: "new-email@example.com",
                emailVerified: true,
                name: "Google Person",
                hostedDomain: "example.com",
            },
            tokenSet: { access_token: "google-access-token" },
        });
        const findUnique = vi.fn(async (args: unknown) => {
            const typedArgs = args as { where: Record<string, string> };
            if ("googleSub" in typedArgs.where) {
                return existingUser;
            }
            if ("email" in typedArgs.where) {
                throw new Error("email lookup should not happen when googleSub matches even after email changes");
            }
            return null;
        });
        const { app, redis } = createApp({ findUniqueImpl: findUnique });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: { code: "auth-code", state: "returned-state" },
            } as never,
            reply as never,
        );

        expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { googleSub: "google-sub" } }));
        expect(app.prisma.user.update).not.toHaveBeenCalled();
        expect(app.prisma.user.create).not.toHaveBeenCalled();
        expect(mockGenerateAccessToken).toHaveBeenCalledWith("google-user-id");
        expect(reply.statusCode).toBe(302);
    });

    it("rejects same-email GOOGLE users when the googleSub differs", async () => {
        const collidingUser: MockUser = {
            id: "google-user-id",
            email: "person@example.com",
            name: "Existing Google User",
            password: "hash",
            systemRole: "USER",
            authProvider: "GOOGLE",
            googleSub: "different-google-sub",
            accessBlocked: false,
            accessBlockReason: null,
        };
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("googleSub" in typedArgs.where) {
                    return null;
                }
                if ("email" in typedArgs.where) {
                    return collidingUser;
                }
                return null;
            },
        });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: { code: "auth-code", state: "returned-state" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(409);
        expect(app.prisma.user.update).not.toHaveBeenCalled();
        expect(app.prisma.user.create).not.toHaveBeenCalled();
        expect(mockGenerateAccessToken).not.toHaveBeenCalled();
        expect(mockGenerateRefreshToken).not.toHaveBeenCalled();
        expect(reply.redirectUrl).toBeUndefined();
        expect(redis.store.size).toBe(0);
    });

    it("rejects explicit provider collisions with local users", async () => {
        const collidingUser: MockUser = {
            id: "local-user-id",
            email: "person@example.com",
            name: "Local User",
            password: "hash",
            systemRole: "USER",
            authProvider: "LOCAL",
            googleSub: null,
            accessBlocked: false,
            accessBlockReason: null,
        };
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("googleSub" in typedArgs.where) {
                    return null;
                }
                if ("email" in typedArgs.where) {
                    return collidingUser;
                }
                return null;
            },
        });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: { code: "auth-code", state: "returned-state" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(409);
        expect(app.prisma.user.create).not.toHaveBeenCalled();
        expect(mockGenerateAccessToken).not.toHaveBeenCalled();
    });

    it("rejects explicit provider collisions with LDAP users", async () => {
        const collidingUser: MockUser = {
            id: "ldap-user-id",
            email: "person@example.com",
            name: "Ldap User",
            password: "hash",
            systemRole: "USER",
            authProvider: "LDAP",
            googleSub: null,
            accessBlocked: false,
            accessBlockReason: null,
        };
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("googleSub" in typedArgs.where) {
                    return null;
                }
                if ("email" in typedArgs.where) {
                    return collidingUser;
                }
                return null;
            },
        });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: { code: "auth-code", state: "returned-state" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(409);
        expect(app.prisma.user.create).not.toHaveBeenCalled();
        expect(mockGenerateAccessToken).not.toHaveBeenCalled();
    });

    it("rejects blocked google users before creating a completion ticket", async () => {
        const blockedUser: MockUser = {
            id: "blocked-user-id",
            email: "person@example.com",
            name: "Blocked User",
            password: "hash",
            systemRole: "USER",
            authProvider: "GOOGLE",
            googleSub: "google-sub",
            accessBlocked: true,
            accessBlockReason: "policy",
        };
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("googleSub" in typedArgs.where) {
                    return blockedUser;
                }
                return null;
            },
        });
        redis.store.set(
            "auth:google:state:returned-state",
            JSON.stringify({ state: "returned-state", nonce: "nonce-1", codeVerifier: "verifier-1" }),
        );
        const controller = createAuthController(app as never);
        const reply = createReply();

        await controller.googleCallback(
            {
                lang: "en",
                query: { code: "auth-code", state: "returned-state" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(403);
        expect(mockGenerateAccessToken).not.toHaveBeenCalled();
        expect(redis.store.size).toBe(0);
    });

    it("rejects blocked users during completion even if the callback already issued a ticket", async () => {
        const blockedUser: MockUser = {
            id: "google-user-id",
            email: "person@example.com",
            name: "Blocked User",
            password: "hash",
            systemRole: "USER",
            authProvider: "GOOGLE",
            googleSub: "google-sub",
            accessBlocked: true,
            accessBlockReason: "policy",
        };
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("id" in typedArgs.where) {
                    return blockedUser;
                }
                return null;
            },
        });
        const controller = createAuthController(app as never);
        const reply = createReply();
        const completePayload = {
            accessToken: "app-access-token",
            refreshToken: "app-refresh-token",
            user: {
                id: "google-user-id",
                email: "person@example.com",
                name: "Google Person",
                systemRole: "USER",
            },
        };
        redis.store.set("auth:google:ticket:ticket-1", JSON.stringify(completePayload));

        await controller.googleComplete(
            {
                lang: "en",
                body: { ticket: "ticket-1" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(403);
        expect(reply.payload).toMatchObject({
            data: {
                accessBlocked: true,
                accessBlockReason: "policy",
            },
        });

        const secondReply = createReply();
        await controller.googleComplete(
            {
                lang: "en",
                body: { ticket: "ticket-1" },
            } as never,
            secondReply as never,
        );

        expect(secondReply.statusCode).toBe(401);
    });

    it("rejects completion when the ticket user no longer exists", async () => {
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("id" in typedArgs.where) {
                    return null;
                }
                return null;
            },
        });
        const controller = createAuthController(app as never);
        const reply = createReply();
        const completePayload = {
            accessToken: "app-access-token",
            refreshToken: "app-refresh-token",
            user: {
                id: "missing-user-id",
                email: "person@example.com",
                name: "Google Person",
                systemRole: "USER",
            },
        };
        redis.store.set("auth:google:ticket:ticket-1", JSON.stringify(completePayload));

        await controller.googleComplete(
            {
                lang: "en",
                body: { ticket: "ticket-1" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(401);
        expect(reply.payload).toMatchObject({
            code: 401,
            data: null,
            message: "The Google sign-in ticket is invalid or has expired.",
        });
        expect(redis.store.size).toBe(0);
    });

    it("consumes completion tickets exactly once and returns the login payload", async () => {
        const existingUser: MockUser = {
            id: "google-user-id",
            email: "person@example.com",
            name: "Google Person",
            password: "hash",
            systemRole: "USER",
            authProvider: "GOOGLE",
            googleSub: "google-sub",
            accessBlocked: false,
            accessBlockReason: null,
        };
        const { app, redis } = createApp({
            findUniqueImpl: async (args: unknown) => {
                const typedArgs = args as { where: Record<string, string> };
                if ("id" in typedArgs.where) {
                    return existingUser;
                }
                return null;
            },
        });
        const controller = createAuthController(app as never);
        const reply = createReply();
        const completePayload = {
            accessToken: "app-access-token",
            refreshToken: "app-refresh-token",
            user: {
                id: "google-user-id",
                email: "person@example.com",
                name: "Google Person",
                systemRole: "USER",
            },
        };
        redis.store.set("auth:google:ticket:ticket-1", JSON.stringify(completePayload));

        await controller.googleComplete(
            {
                lang: "en",
                body: { ticket: "ticket-1" },
            } as never,
            reply as never,
        );

        expect(reply.statusCode).toBe(200);
        expect(reply.payload).toEqual(completePayload);

        const secondReply = createReply();
        await controller.googleComplete(
            {
                lang: "en",
                body: { ticket: "ticket-1" },
            } as never,
            secondReply as never,
        );

        expect(secondReply.statusCode).toBe(401);
    });
});
