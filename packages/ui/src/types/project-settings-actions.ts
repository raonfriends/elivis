import type { Project } from "./project-ui";
import type { SearchableUserForProject } from "./project-user-search";

export interface ProjectSettingsActions {
    updateProject: (
        projectId: string,
        input: {
            name?: string;
            description?: string | null;
            isPublic?: boolean;
            startDate?: string;
            endDate?: string;
            noEndDate?: boolean;
        },
    ) => Promise<{ ok: true; project: Project } | { ok: false; message: string }>;
    deleteProject: (
        projectId: string,
        confirmName: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
    searchUsers: (
        query: string,
    ) => Promise<{ ok: true; users: SearchableUserForProject[] } | { ok: false; message: string }>;
    addProjectMember: (
        projectId: string,
        userId: string,
        role: "MEMBER" | "DEPUTY_LEADER",
    ) => Promise<{ ok: true; project: Project } | { ok: false; message: string }>;
}
