import type { AuthSettings, PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it } from "vitest";

import { getPublicAuthConfig } from "./auth-config.service";

const defaultRow: AuthSettings = {
    id: "default",
    publicSignupEnabled: true,
    ldapEnabled: true,
    ldapUrl: "ldaps://ldap.example.com",
    ldapUserDnTemplate: "uid={{email}},ou=people,dc=example,dc=com",
    ldapBindDn: "",
    ldapBindPassword: "",
    ldapSearchBase: "ou=people,dc=example,dc=com",
    ldapSearchFilter: "(mail={{email}})",
    ldapNameAttribute: "cn",
    ldapTimeoutMs: 15_000,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
});

function setGoogleEnv(overrides?: Partial<NodeJS.ProcessEnv>) {
    process.env = {
        ...originalEnv,
        GOOGLE_OIDC_ENABLED: "true",
        GOOGLE_OIDC_CLIENT_ID: "client-id",
        GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
        GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
        GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
        ...overrides,
    };
}

function makePrisma(options?: { row?: AuthSettings; superAdminCount?: number }): PrismaClient {
    const row = options?.row ?? defaultRow;
    const superAdminCount = options?.superAdminCount ?? 0;

    return {
        authSettings: {
            findUnique: async () => row,
            create: async () => row,
        },
        user: {
            count: async () => superAdminCount,
        },
    } as unknown as PrismaClient;
}

describe("public auth config google enablement", () => {
    it("returns false when google oidc env is incomplete", async () => {
        setGoogleEnv({ GOOGLE_OIDC_CLIENT_ID: "   " });

        await expect(getPublicAuthConfig(makePrisma({ superAdminCount: 1 }))).resolves.toMatchObject({
            publicSignupEnabled: true,
            ldapEnabled: true,
            googleEnabled: false,
        });
    });

    it("returns false when no super admin exists", async () => {
        setGoogleEnv();

        await expect(getPublicAuthConfig(makePrisma({ superAdminCount: 0 }))).resolves.toMatchObject({
            googleEnabled: false,
        });
    });

    it("returns true when google oidc env is valid and a super admin exists", async () => {
        setGoogleEnv();

        await expect(getPublicAuthConfig(makePrisma({ superAdminCount: 1 }))).resolves.toMatchObject({
            googleEnabled: true,
        });
    });
});
