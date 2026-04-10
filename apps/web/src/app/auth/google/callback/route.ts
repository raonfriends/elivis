import { NextResponse } from "next/server";

import { completeGoogleLogin } from "@/lib/server/auth.server";

function buildLoginRedirect(request: Request, error: string) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", error);
    return NextResponse.redirect(loginUrl);
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
        const message = error instanceof Error && error.message ? error.message : "Google sign-in failed.";
        return buildLoginRedirect(request, message);
    }
}
