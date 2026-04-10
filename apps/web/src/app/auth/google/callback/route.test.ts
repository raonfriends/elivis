import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies } = vi.hoisted(() => ({
    mockCookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: mockCookies,
}));

import { GET } from "./route";

describe("GET /auth/google/callback", () => {
    const cookieStore = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockCookies.mockResolvedValue(cookieStore);
        cookieStore.get.mockReturnValue({ value: "en" });
        global.fetch = vi.fn();
    });

    it("completes Google login, sets auth cookies, and redirects home on success", async () => {
        vi.mocked(global.fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    accessToken: "access-token",
                    refreshToken: "refresh-token",
                    user: {
                        id: "user-1",
                        email: "person@example.com",
                        name: "Person",
                        systemRole: "USER",
                    },
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                },
            ),
        );

        const response = await GET(new Request("http://localhost:3000/auth/google/callback?ticket=ticket-123"));

        expect(global.fetch).toHaveBeenCalledWith("http://localhost:4000/api/auth/google/complete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept-Language": "en",
            },
            body: JSON.stringify({ ticket: "ticket-123" }),
            cache: "no-store",
        });
        expect(cookieStore.set).toHaveBeenNthCalledWith(
            1,
            "elivis_at",
            "access-token",
            expect.objectContaining({
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24,
            }),
        );
        expect(cookieStore.set).toHaveBeenNthCalledWith(
            2,
            "elivis_rt",
            "refresh-token",
            expect.objectContaining({
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 15,
            }),
        );
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost:3000/");
    });

    it("redirects back to login with an error when the ticket is missing", async () => {
        const response = await GET(new Request("http://localhost:3000/auth/google/callback"));

        expect(global.fetch).not.toHaveBeenCalled();
        expect(cookieStore.set).not.toHaveBeenCalled();
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
            "http://localhost:3000/login?error=Missing+Google+login+ticket.",
        );
    });

    it("redirects back to login with the API error when completion fails", async () => {
        vi.mocked(global.fetch).mockResolvedValue(
            new Response(JSON.stringify({ message: "Google ticket is invalid." }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            }),
        );

        const response = await GET(new Request("http://localhost:3000/auth/google/callback?ticket=bad-ticket"));

        expect(cookieStore.set).not.toHaveBeenCalled();
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(
            "http://localhost:3000/login?error=Google+ticket+is+invalid.",
        );
    });
});
