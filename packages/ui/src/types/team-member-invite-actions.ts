export type SearchableUserForTeamInvite = {
    id: string;
    email: string;
    name: string | null;
};

export type TeamMemberInviteActions = {
    searchUsersForTeam: (
        q: string,
    ) => Promise<{ ok: true; users: SearchableUserForTeamInvite[] } | { ok: false; message: string }>;
    addTeamMember: (
        teamId: string,
        userId: string,
    ) => Promise<{ ok: true } | { ok: false; message: string }>;
};
