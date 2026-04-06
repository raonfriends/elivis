/** `GET /api/workspaces` 목록 행 — 사이드바와 동일 필드 */
export type SidebarWorkspaceListItem = {
    id: string;
    sidebarLabel?: string | null;
    createdAt: string;
    updatedAt: string;
    project: {
        id: string;
        name: string;
        description: string | null;
        startDate: string | null;
        endDate: string | null;
        noEndDate: boolean;
        isPublic: boolean;
        team: { id: string; name: string } | null;
        projectTeams: { team: { id: string; name: string } }[];
        _count: { tasks: number };
    };
    _count: { tasks: number };
};

export type SidebarTeamFavoriteItem = {
    id: string;
    team: { id: string; name: string };
};

export type SidebarProjectFavoriteItem = {
    id: string;
    project: { id: string; name: string };
};
