import { redirect } from "next/navigation";

import { getMyProfile } from "@/lib/server/user-profile.server";
import {
    fetchWorkspaceList,
    fetchWorkspaceTasks,
    fetchWorkspaceStatuses,
    fetchWorkspacePriorities,
} from "@/lib/server/workspaces.server";

import { AdminPerformanceShell } from "./AdminPerformanceShell";

export const dynamic = "force-dynamic";

export default async function AdminPerformancePage() {
    const user = await getMyProfile();

    if (!user) {
        redirect("/login");
    }

    const workspaces = await fetchWorkspaceList();

    const workspaceDataList =
        workspaces && workspaces.length > 0
            ? await Promise.all(
                  workspaces.map(async (ws) => {
                      const [tasks, statuses, priorities] = await Promise.all([
                          fetchWorkspaceTasks(ws.id),
                          fetchWorkspaceStatuses(ws.id),
                          fetchWorkspacePriorities(ws.id),
                      ]);
                      return {
                          workspace: ws,
                          tasks: tasks ?? [],
                          statuses: statuses ?? [],
                          priorities: priorities ?? [],
                      };
                  }),
              )
            : [];

    return <AdminPerformanceShell workspaceDataList={workspaceDataList} currentUserId={user.id} />;
}
