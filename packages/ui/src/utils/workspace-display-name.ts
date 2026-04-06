/** 사이드바·목록 등에 쓸 표시 이름 (커스텀 없으면 프로젝트명) */
export function workspaceDisplayName(ws: {
    sidebarLabel?: string | null;
    project: { name: string };
}): string {
    const custom = ws.sidebarLabel?.trim();
    return custom && custom.length > 0 ? custom : ws.project.name;
}
