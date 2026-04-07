import type { WorkspaceDataItem } from "@/app/(main)/mywork/MyWorkOverviewClient";

export type TeamPerformanceSection = {
    id: string;
    name: string;
    items: WorkspaceDataItem[];
};

/** 프로젝트에 연결된 팀 기준으로 워크스페이스 묶음 (개인 프로젝트는 `__personal__`) */
export function buildTeamSections(list: WorkspaceDataItem[]): TeamPerformanceSection[] {
    const map = new Map<string, { name: string; ids: Set<string>; items: WorkspaceDataItem[] }>();

    for (const item of list) {
        const teams = [
            item.workspace.project.team,
            ...item.workspace.project.projectTeams.map((pt) => pt.team),
        ].filter(Boolean) as { id: string; name: string }[];

        if (teams.length === 0) {
            const id = "__personal__";
            let e = map.get(id);
            if (!e) {
                e = { name: "", ids: new Set(), items: [] };
                map.set(id, e);
            }
            if (!e.ids.has(item.workspace.id)) {
                e.ids.add(item.workspace.id);
                e.items.push(item);
            }
            continue;
        }

        const seenTeam = new Set<string>();
        for (const t of teams) {
            if (seenTeam.has(t.id)) continue;
            seenTeam.add(t.id);
            let e = map.get(t.id);
            if (!e) {
                e = { name: t.name, ids: new Set(), items: [] };
                map.set(t.id, e);
            }
            if (!e.ids.has(item.workspace.id)) {
                e.ids.add(item.workspace.id);
                e.items.push(item);
            }
        }
    }

    return [...map.entries()]
        .map(([id, v]) => ({ id, name: v.name, items: v.items }))
        .sort((a, b) => {
            if (a.id === "__personal__") return 1;
            if (b.id === "__personal__") return -1;
            return a.name.localeCompare(b.name, "ko");
        });
}

export function filterWorkspaceDataByTeamId(
    list: WorkspaceDataItem[],
    teamId: string,
): WorkspaceDataItem[] {
    if (teamId === "__personal__") {
        return list.filter((item) => {
            const teams = [
                item.workspace.project.team,
                ...item.workspace.project.projectTeams.map((pt) => pt.team),
            ].filter(Boolean);
            return teams.length === 0;
        });
    }
    return list.filter((item) => {
        const primary = item.workspace.project.team?.id;
        const inLink = item.workspace.project.projectTeams.some((pt) => pt.team.id === teamId);
        return primary === teamId || inLink;
    });
}
