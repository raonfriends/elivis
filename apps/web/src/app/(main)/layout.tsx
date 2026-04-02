import { redirect } from "next/navigation";

import { getMyProfile } from "@/lib/users";
import { fetchWorkspaceList } from "@/lib/workspaces.server";
import { getAccessToken } from "@/lib/auth.server";
import { fetchTeamFavoritesAction } from "@/app/actions/teams";
import { fetchProjectFavoritesAction } from "@/app/actions/projects";
import { MainLayoutClient } from "./MainLayoutClient";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const [user, workspaces, accessToken, teamFavRes, projectFavRes] = await Promise.all([
        getMyProfile(),
        fetchWorkspaceList(),
        getAccessToken(),
        fetchTeamFavoritesAction(),
        fetchProjectFavoritesAction(),
    ]);

    if (!user) {
        redirect("/login");
    }

    const teamFavorites = teamFavRes.ok ? teamFavRes.favorites : [];
    const projectFavorites = projectFavRes.ok ? projectFavRes.favorites : [];

    return (
        <MainLayoutClient
            user={user}
            workspaces={workspaces ?? []}
            accessToken={accessToken}
            teamFavorites={teamFavorites}
            projectFavorites={projectFavorites}
        >
            {children}
        </MainLayoutClient>
    );
}
