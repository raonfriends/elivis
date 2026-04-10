import { afterEach, describe, expect, it, vi } from "vitest";

import {
    assertGoogleOidcAvailable,
    buildAllowedDomainSet,
    consumeGoogleAuthorization,
    createGoogleAuthorizationRequest,
    getGoogleOidcConfig,
    getTrustedGoogleCallbackBaseUrl,
    isAllowedGoogleDomain,
    isGoogleOidcAvailable,
} from "./google-oidc.service";

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
});

describe("buildAllowedDomainSet", () => {
    it("normalizes, deduplicates, and removes blanks", () => {
        expect([...buildAllowedDomainSet(" Example.com,example.com, TEAM.EXAMPLE.COM ,, ")]).toEqual([
            "example.com",
            "team.example.com",
        ]);
    });
});

describe("isAllowedGoogleDomain", () => {
    it("matches against the normalized email domain", () => {
        const allowed = buildAllowedDomainSet("example.com,team.example.com");

        expect(isAllowedGoogleDomain("User@Example.com", allowed)).toBe(true);
        expect(isAllowedGoogleDomain("user@TEAM.example.com", allowed)).toBe(true);
        expect(isAllowedGoogleDomain("user@other.com", allowed)).toBe(false);
        expect(isAllowedGoogleDomain("invalid-email", allowed)).toBe(false);
    });
});

describe("getGoogleOidcConfig", () => {
    it("parses env into normalized config", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: " client-id ",
            GOOGLE_OIDC_CLIENT_SECRET: " client-secret ",
            GOOGLE_OIDC_REDIRECT_URI: " https://example.com/auth/google/callback ",
            GOOGLE_OIDC_ALLOWED_DOMAINS: " Example.com,TEAM.example.com ",
        };

        expect(getGoogleOidcConfig()).toMatchObject({
            enabled: true,
            issuer: "https://accounts.google.com",
            clientId: "client-id",
            clientSecret: "client-secret",
            redirectUri: "https://example.com/auth/google/callback",
            authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenEndpoint: "https://oauth2.googleapis.com/token",
        });
        expect([...getGoogleOidcConfig().allowedDomains]).toEqual(["example.com", "team.example.com"]);
    });
});

describe("assertGoogleOidcAvailable", () => {
    it("throws when no super admin exists", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
            WEB_PUBLIC_URL: "https://web.example.com",
        };

        expect(() => assertGoogleOidcAvailable(false)).toThrow(/super admin/i);
    });

    it("throws when enabled config is incomplete", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
            WEB_PUBLIC_URL: "https://web.example.com",
        };

        expect(() => assertGoogleOidcAvailable(true)).toThrow(/client id/i);
    });

    it("throws when WEB_PUBLIC_URL is missing or invalid", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
            WEB_PUBLIC_URL: "",
        };

        expect(() => assertGoogleOidcAvailable(true)).toThrow(/WEB_PUBLIC_URL/i);

        process.env = {
            ...process.env,
            WEB_PUBLIC_URL: "ftp://web.example.com",
        };

        expect(() => assertGoogleOidcAvailable(true)).toThrow(/http\(s\)/i);
    });
});

describe("isGoogleOidcAvailable", () => {
    it("returns false instead of throwing for invalid or unavailable config", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
            WEB_PUBLIC_URL: "https://web.example.com",
        };

        expect(isGoogleOidcAvailable(false)).toBe(false);
        expect(isGoogleOidcAvailable(true)).toBe(false);
    });

    it("returns true for complete config with an existing super admin", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
            WEB_PUBLIC_URL: "https://web.example.com",
        };

        expect(isGoogleOidcAvailable(true)).toBe(true);
    });

    it("returns false when WEB_PUBLIC_URL is missing", () => {
        process.env = {
            ...originalEnv,
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
            WEB_PUBLIC_URL: "",
        };

        expect(isGoogleOidcAvailable(true)).toBe(false);
    });
});

describe("getTrustedGoogleCallbackBaseUrl", () => {
    it("normalizes a valid trusted web callback base URL", () => {
        expect(
            getTrustedGoogleCallbackBaseUrl({
                WEB_PUBLIC_URL: " https://web.example.com/app ",
            }),
        ).toBe("https://web.example.com/app");
    });

    it("rejects missing or non-http(s) callback base URLs", () => {
        expect(() => getTrustedGoogleCallbackBaseUrl({ WEB_PUBLIC_URL: "" })).toThrow(/WEB_PUBLIC_URL/i);
        expect(() => getTrustedGoogleCallbackBaseUrl({ WEB_PUBLIC_URL: "ftp://web.example.com" })).toThrow(
            /http\(s\)/i,
        );
    });
});

describe("createGoogleAuthorizationRequest", () => {
    it("builds a google authorize url with state, nonce, and PKCE", () => {
        const config = getGoogleOidcConfig({
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
        });

        const request = createGoogleAuthorizationRequest({
            config,
            state: "state-token",
            nonce: "nonce-token",
            codeVerifier: "verifier-token",
        });

        const url = new URL(request.authorizationUrl);

        expect(request).toMatchObject({
            state: "state-token",
            nonce: "nonce-token",
            codeVerifier: "verifier-token",
        });
        expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
        expect(url.searchParams.get("client_id")).toBe("client-id");
        expect(url.searchParams.get("redirect_uri")).toBe("https://example.com/auth/google/callback");
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("scope")).toBe("openid email profile");
        expect(url.searchParams.get("state")).toBe("state-token");
        expect(url.searchParams.get("nonce")).toBe("nonce-token");
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");
        expect(url.searchParams.get("code_challenge")).toBe(
            "m_r6OIumhSE9k2Tx2xDwPs3q2ppJMPnPEp5--b1wOKc",
        );
        expect(url.searchParams.get("hd")).toBe("example.com");
    });
});

describe("consumeGoogleAuthorization", () => {
    it("fails fast when state does not match", async () => {
        const config = getGoogleOidcConfig({
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
        });
        const consumeAuthorizationCode = vi.fn();

        await expect(
            consumeGoogleAuthorization({
                config,
                authorizationCode: "auth-code",
                expectedState: "expected-state",
                returnedState: "wrong-state",
                expectedNonce: "expected-nonce",
                codeVerifier: "verifier-token",
                oidc: { consumeAuthorizationCode },
            }),
        ).rejects.toThrow(/state/i);

        expect(consumeAuthorizationCode).not.toHaveBeenCalled();
    });

    it("rejects unverified or disallowed emails after oidc validation", async () => {
        const config = getGoogleOidcConfig({
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
        });

        await expect(
            consumeGoogleAuthorization({
                config,
                authorizationCode: "auth-code",
                expectedState: "expected-state",
                returnedState: "expected-state",
                expectedNonce: "expected-nonce",
                codeVerifier: "verifier-token",
                oidc: {
                    consumeAuthorizationCode: async () => ({
                        claims: {
                            sub: "google-sub",
                            email: "user@other.com",
                            email_verified: false,
                            name: "Example User",
                            hd: "example.com",
                        },
                        tokenSet: { access_token: "access", refresh_token: "refresh" },
                    }),
                },
            }),
        ).rejects.toThrow(/verified email|allowed domain/i);
    });

    it("returns a normalized profile and passes nonce/code_verifier to the oidc adapter", async () => {
        const config = getGoogleOidcConfig({
            GOOGLE_OIDC_ENABLED: "true",
            GOOGLE_OIDC_CLIENT_ID: "client-id",
            GOOGLE_OIDC_CLIENT_SECRET: "client-secret",
            GOOGLE_OIDC_REDIRECT_URI: "https://example.com/auth/google/callback",
            GOOGLE_OIDC_ALLOWED_DOMAINS: "example.com",
        });
        const consumeAuthorizationCode = vi.fn(async () => ({
            claims: {
                sub: "google-sub",
                email: "User@Example.com",
                email_verified: true,
                name: "Example User",
                hd: "example.com",
            },
            tokenSet: { access_token: "access", refresh_token: "refresh" },
        }));

        await expect(
            consumeGoogleAuthorization({
                config,
                authorizationCode: "auth-code",
                expectedState: "expected-state",
                returnedState: "expected-state",
                expectedNonce: "expected-nonce",
                codeVerifier: "verifier-token",
                oidc: { consumeAuthorizationCode },
            }),
        ).resolves.toMatchObject({
            profile: {
                sub: "google-sub",
                email: "User@Example.com",
                emailVerified: true,
                name: "Example User",
                hostedDomain: "example.com",
            },
            tokenSet: { access_token: "access", refresh_token: "refresh" },
        });

        expect(consumeAuthorizationCode).toHaveBeenCalledWith(
            expect.objectContaining({
                authorizationCode: "auth-code",
                expectedNonce: "expected-nonce",
                codeVerifier: "verifier-token",
            }),
        );
    });
});
