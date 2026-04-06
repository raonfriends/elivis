/** 팀 상세 UI용 — API `GET /api/teams/:id` `data`와 동일 구조 */

export type TeamMemberRow = {
    role: "LEADER" | "MEMBER";
    joinedAt: string;
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
};

export type TeamProjectRow = {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    _count: { tasks: number; members: number };
};

export type TeamDetail = {
    id: string;
    name: string;
    shortDescription: string | null;
    introMessage: string | null;
    bannerUrl: string | null;
    introLayoutJson: string | null;
    hiddenFromUsers: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    createdBy: { id: string; email: string; name: string | null; avatarUrl: string | null };
    members: TeamMemberRow[];
    projects: TeamProjectRow[];
    viewerRole: "LEADER" | "MEMBER" | null;
    _count?: { members: number };
};
