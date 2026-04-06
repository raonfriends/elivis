/** 프로젝트 상세 UI용 (앱 `@/lib/projects`와 동일 구조) */

export type ProjectViewerRole = "LEADER" | "DEPUTY_LEADER" | "MEMBER";

export type ProjectUser = {
    id: string;
    name: string;
    /** 표시용(이메일) */
    userId: string;
    role?: ProjectViewerRole;
    avatarUrl?: string | null;
};

export type ProjectTeam = {
    id: string;
    name: string;
    teamId: string;
};

export type ProjectType = "personal" | "team";

export type Project = {
    id: string;
    name: string;
    description: string;
    projectUrl: string;
    startDate: string;
    endDate: string;
    noEndDate: boolean;
    projectType: ProjectType;
    isPublic: boolean;
    participants: ProjectUser[];
    teams: ProjectTeam[];
    createdAt: number;
    viewerRole?: ProjectViewerRole;
};
