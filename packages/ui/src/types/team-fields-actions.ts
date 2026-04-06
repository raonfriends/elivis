export type UpdateTeamFieldsPayload = {
    teamName?: string;
    shortDescription?: string | null;
    introMessage?: string | null;
    introLayoutJson?: string | null;
    hiddenFromUsers?: boolean;
};

export type UpdateTeamFieldsResult =
    | {
          ok: true;
          name: string;
          shortDescription: string | null;
          introMessage: string | null;
          introLayoutJson: string | null;
          hiddenFromUsers: boolean;
      }
    | { ok: false; message: string };

export type UpdateTeamFieldsFn = (
    teamId: string,
    fields: UpdateTeamFieldsPayload,
) => Promise<UpdateTeamFieldsResult>;

export type TeamBannerMutationResult = {
    ok: boolean;
    message?: string;
    bannerUrl?: string | null;
};

export type TeamBannerActions = {
    uploadTeamBanner: (teamId: string, formData: FormData) => Promise<TeamBannerMutationResult>;
    deleteTeamBanner: (teamId: string) => Promise<TeamBannerMutationResult>;
};
