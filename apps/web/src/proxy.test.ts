import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("proxy", () => {
    it("allows the suspended-account page through without an auth cookie", () => {
        const response = proxy(new NextRequest("http://localhost:3000/account-suspended?reason=policy"));

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(response.headers.get("location")).toBeNull();
    });

    it("redirects unauthenticated protected routes to login", () => {
        const response = proxy(new NextRequest("http://localhost:3000/dashboard"));

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });
});
