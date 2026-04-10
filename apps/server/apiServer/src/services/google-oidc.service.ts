import { createHash, randomBytes } from "node:crypto";

import { Issuer, type TokenSet } from "openid-client";

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_SCOPES = ["openid", "email", "profile"] as const;

type EnvSource = Partial<
    Record<
        | "GOOGLE_OIDC_ENABLED"
        | "GOOGLE_OIDC_CLIENT_ID"
        | "GOOGLE_OIDC_CLIENT_SECRET"
        | "GOOGLE_OIDC_REDIRECT_URI"
        | "GOOGLE_OIDC_ALLOWED_DOMAINS",
        string
    >
>;

export type GoogleOidcConfig = {
    enabled: boolean;
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    allowedDomains: Set<string>;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    jwksUri: string;
    scopes: readonly string[];
};

export type GoogleAuthorizationRequest = {
    authorizationUrl: string;
    state: string;
    nonce: string;
    codeVerifier: string;
    codeChallenge: string;
};

export type GoogleOidcClaims = {
    sub?: unknown;
    email?: unknown;
    email_verified?: unknown;
    name?: unknown;
    hd?: unknown;
};

export type GoogleOidcTokenSet = Record<string, unknown>;

export type GoogleOidcProfile = {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string | null;
    hostedDomain: string | null;
};

export type GoogleAuthorizationResult = {
    profile: GoogleOidcProfile;
    tokenSet: GoogleOidcTokenSet;
};

export type ConsumeGoogleAuthorizationInput = {
    config: GoogleOidcConfig;
    authorizationCode: string;
    expectedState: string;
    returnedState: string | null | undefined;
    expectedNonce: string;
    codeVerifier: string;
    oidc?: GoogleOidcAdapter;
};

export type GoogleOidcAdapter = {
    consumeAuthorizationCode(input: {
        config: GoogleOidcConfig;
        authorizationCode: string;
        expectedNonce: string;
        codeVerifier: string;
    }): Promise<{
        claims: GoogleOidcClaims;
        tokenSet: GoogleOidcTokenSet;
    }>;
};

function isTruthyEnv(raw: string | undefined): boolean {
    const value = raw?.trim().toLowerCase();
    return value === "true" || value === "1" || value === "yes";
}

function isValidUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

function normalizeString(value: string | undefined): string {
    return value?.trim() ?? "";
}

export function buildAllowedDomainSet(raw: string): Set<string> {
    return new Set(
        raw
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean),
    );
}

function getEmailDomain(email: string): string | null {
    const trimmed = email.trim();
    const atIndex = trimmed.lastIndexOf("@");
    if (atIndex <= 0 || atIndex === trimmed.length - 1) {
        return null;
    }

    return trimmed.slice(atIndex + 1).toLowerCase();
}

export function isAllowedGoogleDomain(email: string, allowed: Iterable<string>): boolean {
    const emailDomain = getEmailDomain(email);
    if (!emailDomain) {
        return false;
    }

    return new Set([...allowed].map((value) => value.trim().toLowerCase())).has(emailDomain);
}

export function getGoogleOidcConfig(env: EnvSource = process.env): GoogleOidcConfig {
    return {
        enabled: isTruthyEnv(env.GOOGLE_OIDC_ENABLED),
        issuer: GOOGLE_ISSUER,
        clientId: normalizeString(env.GOOGLE_OIDC_CLIENT_ID),
        clientSecret: normalizeString(env.GOOGLE_OIDC_CLIENT_SECRET),
        redirectUri: normalizeString(env.GOOGLE_OIDC_REDIRECT_URI),
        allowedDomains: buildAllowedDomainSet(env.GOOGLE_OIDC_ALLOWED_DOMAINS ?? ""),
        authorizationEndpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
        tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
        userInfoEndpoint: GOOGLE_USERINFO_ENDPOINT,
        jwksUri: GOOGLE_JWKS_URI,
        scopes: GOOGLE_SCOPES,
    };
}

function assertCompleteGoogleOidcConfig(config: GoogleOidcConfig): void {
    if (!config.enabled) {
        throw new Error("Google OIDC is not enabled.");
    }
    if (!config.clientId) {
        throw new Error("Google OIDC client ID is required.");
    }
    if (!config.clientSecret) {
        throw new Error("Google OIDC client secret is required.");
    }
    if (!config.redirectUri) {
        throw new Error("Google OIDC redirect URI is required.");
    }
    if (!isValidUrl(config.redirectUri)) {
        throw new Error("Google OIDC redirect URI must be a valid URL.");
    }
    if (config.allowedDomains.size === 0) {
        throw new Error("Google OIDC allowed domains are required.");
    }
}

export function assertGoogleOidcAvailable(
    superAdminExists: boolean,
    env: EnvSource = process.env,
): GoogleOidcConfig {
    if (!superAdminExists) {
        throw new Error("Google OIDC requires an existing super admin.");
    }

    const config = getGoogleOidcConfig(env);
    assertCompleteGoogleOidcConfig(config);
    return config;
}

function createRandomToken(size = 32): string {
    return randomBytes(size).toString("base64url");
}

export function createCodeChallenge(codeVerifier: string): string {
    return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function createGoogleAuthorizationRequest(input: {
    config: GoogleOidcConfig;
    state?: string;
    nonce?: string;
    codeVerifier?: string;
}): GoogleAuthorizationRequest {
    assertCompleteGoogleOidcConfig(input.config);

    const state = input.state ?? createRandomToken();
    const nonce = input.nonce ?? createRandomToken();
    const codeVerifier = input.codeVerifier ?? createRandomToken(48);
    const codeChallenge = createCodeChallenge(codeVerifier);

    const authorizationUrl = new URL(input.config.authorizationEndpoint);
    authorizationUrl.searchParams.set("client_id", input.config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", input.config.redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", input.config.scopes.join(" "));
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    const allowedDomains = [...input.config.allowedDomains];
    if (allowedDomains.length === 1) {
        authorizationUrl.searchParams.set("hd", allowedDomains[0]);
    }

    return {
        authorizationUrl: authorizationUrl.toString(),
        state,
        nonce,
        codeVerifier,
        codeChallenge,
    };
}

function normalizeGoogleProfile(claims: GoogleOidcClaims): GoogleOidcProfile {
    if (typeof claims.sub !== "string" || !claims.sub.trim()) {
        throw new Error("Google ID token is missing the subject claim.");
    }
    if (typeof claims.email !== "string" || !claims.email.trim()) {
        throw new Error("Google ID token is missing the email claim.");
    }
    if (claims.email_verified !== true) {
        throw new Error("Google OIDC requires a verified email.");
    }

    return {
        sub: claims.sub,
        email: claims.email,
        emailVerified: true,
        name: typeof claims.name === "string" && claims.name.trim() ? claims.name : null,
        hostedDomain: typeof claims.hd === "string" && claims.hd.trim() ? claims.hd.toLowerCase() : null,
    };
}

function getDefaultGoogleOidcAdapter(): GoogleOidcAdapter {
    const issuer = new Issuer({
        issuer: GOOGLE_ISSUER,
        authorization_endpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
        token_endpoint: GOOGLE_TOKEN_ENDPOINT,
        userinfo_endpoint: GOOGLE_USERINFO_ENDPOINT,
        jwks_uri: GOOGLE_JWKS_URI,
    });

    return {
        async consumeAuthorizationCode({ config, authorizationCode, expectedNonce, codeVerifier }) {
            const client = new issuer.Client({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uris: [config.redirectUri],
                response_types: ["code"],
            });

            const tokenSet = await client.callback(
                config.redirectUri,
                { code: authorizationCode },
                {
                    code_verifier: codeVerifier,
                    nonce: expectedNonce,
                },
            );

            return {
                claims: tokenSet.claims() as GoogleOidcClaims,
                tokenSet: tokenSet as unknown as GoogleOidcTokenSet,
            };
        },
    };
}

export async function consumeGoogleAuthorization(
    input: ConsumeGoogleAuthorizationInput,
): Promise<GoogleAuthorizationResult> {
    assertCompleteGoogleOidcConfig(input.config);

    if (!input.returnedState || input.returnedState !== input.expectedState) {
        throw new Error("Google OIDC state validation failed.");
    }

    const oidc = input.oidc ?? getDefaultGoogleOidcAdapter();
    const { claims, tokenSet } = await oidc.consumeAuthorizationCode({
        config: input.config,
        authorizationCode: input.authorizationCode,
        expectedNonce: input.expectedNonce,
        codeVerifier: input.codeVerifier,
    });

    const profile = normalizeGoogleProfile(claims);
    if (!isAllowedGoogleDomain(profile.email, input.config.allowedDomains)) {
        throw new Error("Google OIDC email is not in an allowed domain.");
    }

    return {
        profile,
        tokenSet,
    };
}

export type OpenIdClientTokenSet = TokenSet;
