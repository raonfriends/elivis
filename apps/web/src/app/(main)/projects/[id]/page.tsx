import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AT_COOKIE } from "@/lib/auth.server";
import { fetchProjectById } from "@/lib/projects.server";
import { checkProjectFavoriteAction } from "@/app/actions/projects";

import { ProjectDetailPageClient } from "./ProjectDetailPageClient";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const jar = await cookies();

    if (!jar.get(AT_COOKIE)?.value) {
        return <ProjectDetailPageClient initialProject={null} loadMode="client_only" isFavorite={false} />;
    }

    const [result, isFavorite] = await Promise.all([
        fetchProjectById(id),
        checkProjectFavoriteAction(id),
    ]);

    if (result.ok) {
        return <ProjectDetailPageClient initialProject={result.project} loadMode="server_ok" isFavorite={isFavorite} />;
    }

    if (result.reason === "unauthorized") {
        redirect("/login");
    }

    if (result.reason === "forbidden") {
        return (
            <div className="flex min-h-full items-center justify-center p-8">
                <p className="text-stone-600">이 프로젝트를 볼 권한이 없습니다.</p>
            </div>
        );
    }

    return <ProjectDetailPageClient initialProject={null} loadMode="server_miss" isFavorite={false} />;
}
