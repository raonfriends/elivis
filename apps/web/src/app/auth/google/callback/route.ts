import { NextResponse } from "next/server";

import { completeGoogleLogin, GoogleLoginBlockedError } from "@/lib/server/auth.server";

function buildLoginRedirect(request: Request, error: string) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", error);
    return NextResponse.redirect(loginUrl);
}

function buildAccountSuspendedRedirect(request: Request, reason: string | null) {
    const suspendedUrl = new URL("/account-suspended", request.url);
    if (reason) {
        suspendedUrl.searchParams.set("reason", reason);
    }
    return NextResponse.redirect(suspendedUrl);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get("ticket");

    if (!ticket) {
        return buildLoginRedirect(request, "Missing Google login ticket.");
    }

    try {
        await completeGoogleLogin(ticket);
        return NextResponse.redirect(new URL("/", request.url));
    } catch (error) {
        if (error instanceof GoogleLoginBlockedError) {
            return buildAccountSuspendedRedirect(request, error.reason);
        }
        const message = error instanceof Error && error.message ? error.message : "Google sign-in failed.";
        return buildLoginRedirect(request, message);
    }
}
