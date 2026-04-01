"use client";

import type { TeamDetail } from "@/lib/teams.server";
import {
    colSpanClass,
    parseIntroLayoutJson,
    type IntroLayoutBlock,
    type IntroLayoutConfig,
} from "@/lib/team-intro-layout";

import { IntroBlockContent } from "./TeamIntroBlockContent";

export function TeamIntroBlocks({
    team,
    layout,
}: {
    team: TeamDetail;
    layout: IntroLayoutConfig;
}) {
    return (
        <div className="grid grid-cols-12 items-start gap-4">
            {layout.blocks.map((b: IntroLayoutBlock) => (
                <div key={b.id} className={`min-w-0 ${colSpanClass(b.colSpan)}`}>
                    <IntroBlockContent
                        team={team}
                        blockType={b.type}
                    />
                </div>
            ))}
        </div>
    );
}

export function TeamIntroGrid({
    team,
}: {
    team: TeamDetail;
}) {
    const layout = parseIntroLayoutJson(team.introLayoutJson);
    return (
        <TeamIntroBlocks
            team={team}
            layout={layout}
        />
    );
}
