import { fetchProjectsList } from "@/lib/projects.server";

import { ProjectsPageClient } from "./ProjectsPageClient";

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const searchQuery = (q ?? "").trim();

    const res = await fetchProjectsList({ take: 200, skip: 0, q: searchQuery || undefined });

    if (!res) {
        return (
            <div className="w-full p-6 text-stone-600">
                프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
        );
    }

    return <ProjectsPageClient projects={res.items} />;
}
