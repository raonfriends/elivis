import React, { act } from "react";
import ReactDOMClient from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseTranslations = vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
        emailLabel: "Email",
        emailPlaceholder: "Enter your email",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        loginButton: "Login",
        loggingIn: "Logging in…",
        rememberEmail: "Remember email",
        signupButton: "Create account",
        loginTabLocal: "Local",
        loginTabLdap: "LDAP",
        ldapTabHelp: "Use your directory email and password.",
        loginTabsAria: "Sign-in method",
    };

    return translations[key] ?? key;
});

vi.mock("next-intl", () => ({
    useTranslations: () => mockUseTranslations(),
}));

vi.mock("@/app/actions/auth", () => ({
    loginAction: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/app/actions/language", () => ({
    setLanguageAction: vi.fn(async () => undefined),
}));

vi.mock("@repo/ui", () => ({
    LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock("./SignupModal", () => ({
    SignupModal: () => null,
}));

import { LoginPageClient } from "./LoginPageClient";

describe("LoginPageClient", () => {
    let container: HTMLDivElement;
    let root: ReactDOMClient.Root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = ReactDOMClient.createRoot(container);
        window.localStorage.clear();
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    it("hides the Google login button when googleEnabled is false", () => {
        act(() => {
            root.render(
                <LoginPageClient
                    publicSignupEnabled={false}
                    ldapEnabled={false}
                    googleEnabled={false}
                    callbackError={null}
                />,
            );
        });

        expect(container.textContent).not.toContain("Continue with Google");
    });

    it("shows the Google login button when googleEnabled is true", () => {
        act(() => {
            root.render(
                <LoginPageClient
                    publicSignupEnabled={false}
                    ldapEnabled={false}
                    googleEnabled={true}
                    callbackError={null}
                />,
            );
        });

        const googleLink = container.querySelector('a[href="http://localhost:4000/api/auth/google/start"]');

        expect(googleLink).not.toBeNull();
        expect(googleLink?.textContent).toContain("Continue with Google");
    });

    it("surfaces the callback error on the login page", () => {
        act(() => {
            root.render(
                <LoginPageClient
                    publicSignupEnabled={false}
                    ldapEnabled={false}
                    googleEnabled={false}
                    callbackError="Google sign-in failed."
                />,
            );
        });

        expect(container.textContent).toContain("Google sign-in failed.");
    });
});
