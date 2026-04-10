import React, { act } from "react";
import ReactDOMClient from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/lib/user/user-types";

const mockChangePasswordState = vi.hoisted(() => ({
    state: {} as { error?: string; success?: string },
    formAction: vi.fn(),
    isPending: false,
}));

vi.mock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
        ...actual,
        useActionState: () =>
            [mockChangePasswordState.state, mockChangePasswordState.formAction, mockChangePasswordState.isPending] as const,
    };
});

const translations: Record<string, Record<string, string>> = {
    settings: {
        "tabs.profile": "Profile",
        "tabs.security": "Security",
        "tabs.preferences": "Notifications",
        "profile.roleAdmin": "Super Admin",
        "profile.roleUser": "Member",
    },
    "settings.profile": {
        sectionTitle: "Basic Information",
        nameLabel: "Name",
        namePlaceholder: "Enter your name",
        bioLabel: "Profile Message",
        bioPlaceholder: "Write a short message about yourself",
        emailLabel: "Email",
        emailNote: "Email cannot be changed.",
        roleLabel: "Role",
        joinedLabel: "Joined",
        saveButton: "Save",
        saving: "Saving…",
        saveSuccess: "Saved successfully.",
        avatarLabel: "Profile Picture",
        avatarChange: "Change Photo",
        avatarRemove: "Remove Photo",
        avatarSuccess: "Profile picture updated.",
        avatarRemoveSuccess: "Profile picture removed.",
        avatarFileTooLarge: "File size must be 2MB or less.",
        avatarInvalidType: "Only image files (jpg, png, gif, webp) are allowed.",
    },
    "settings.securityAccount": {
        title: "Change password",
        current: "Current password",
        new: "New password",
        confirm: "Confirm new password",
        submit: "Update password",
        submitting: "Updating…",
        externalOnly: "Accounts that sign in through an external provider cannot change password here.",
        success: "Your password has been changed.",
        mismatch: "New password confirmation does not match.",
        changeError: "Could not change password.",
    },
    "settings.preferences": {
        intro: "Manage notifications",
        teamsTitle: "Teams",
        projectsTitle: "Projects",
        pushLabel: "Push",
        emailLabel: "Email",
        pushOn: "Push notifications on",
        pushOff: "Push notifications off",
        emailOn: "Email notifications on",
        emailOff: "Email notifications off",
        notifyOn: "Notifications on",
        notifyOff: "Notifications off",
        emptyTeams: "No teams",
        emptyProjects: "No projects",
        save: "Save",
        saving: "Saving…",
        success: "Saved",
        error: "Error",
    },
};

vi.mock("next-intl", () => ({
    useTranslations: (namespace: keyof typeof translations) => (key: string) =>
        translations[namespace]?.[key] ?? `${String(namespace)}.${key}`,
}));

vi.mock("@/app/actions/users", () => ({
    changePasswordAction: vi.fn(async () => ({})),
    deleteAvatarAction: vi.fn(async () => ({ ok: true })),
    patchNotificationPreferencesAction: vi.fn(async () => ({ ok: true, data: { teams: [], projects: [] } })),
    updateProfileAction: vi.fn(async () => ({})),
    updateStatusAction: vi.fn(async () => ({ ok: true })),
    uploadAvatarAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@repo/ui", () => ({
    StatusDropdown: () => <div data-testid="status-dropdown" />,
}));

import { SettingsClient } from "./SettingsClient";

function buildUser(authProvider: UserProfile["authProvider"]): UserProfile {
    return {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        bio: null,
        status: "WORKING",
        avatarUrl: null,
        systemRole: "USER",
        createdAt: "2026-01-01T00:00:00.000Z",
        authProvider,
    };
}

describe("SettingsClient security tab", () => {
    let container: HTMLDivElement;
    let root: ReactDOMClient.Root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = ReactDOMClient.createRoot(container);
        mockChangePasswordState.state = {};
        mockChangePasswordState.isPending = false;
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    function renderFor(authProvider: UserProfile["authProvider"]) {
        act(() => {
            root.render(<SettingsClient user={buildUser(authProvider)} notificationPrefs={null} />);
        });

        const securityTab = Array.from(container.querySelectorAll("button")).find(
            (button) => button.textContent?.includes("Security"),
        );

        act(() => {
            securityTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });
    }

    it.each(["GOOGLE", "LDAP"] as const)(
        "hides the password form for %s accounts and shows generic external sign-in wording",
        (authProvider) => {
            renderFor(authProvider);

            expect(container.textContent).toContain(
                "Accounts that sign in through an external provider cannot change password here.",
            );
            expect(container.textContent).not.toContain("Current password");
            expect(container.textContent).not.toContain("Update password");
        },
    );

    it("keeps the password form visible for LOCAL accounts", () => {
        renderFor("LOCAL");

        expect(container.textContent).toContain("Current password");
        expect(container.textContent).toContain("New password");
        expect(container.textContent).toContain("Update password");
    });
});
