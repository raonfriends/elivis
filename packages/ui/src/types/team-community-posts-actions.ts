import type { ApiTeamPost, ApiTeamPostComment } from "./team-posts-api";

type ActionResult<T> = { ok: true } & T | { ok: false; message: string };

export type TeamCommunityPostsActions = {
    listTeamPostsAction: (
        teamId: string,
        opts?: { category?: string; take?: number; skip?: number },
    ) => Promise<ActionResult<{ posts: ApiTeamPost[]; total: number }>>;
    getTeamPostAction: (
        teamId: string,
        postId: string,
    ) => Promise<ActionResult<{ post: ApiTeamPost }>>;
    createTeamPostAction: (
        teamId: string,
        input: {
            title: string;
            content: string;
            category: string;
            attachments?: { url: string; name: string; mimeType: string; size: number }[];
        },
    ) => Promise<ActionResult<{ post: ApiTeamPost }>>;
    updateTeamPostAction: (
        teamId: string,
        postId: string,
        input: {
            title?: string;
            content?: string;
            category?: string;
            attachments?: { url: string; name: string; mimeType: string; size: number }[];
        },
    ) => Promise<ActionResult<{ post: ApiTeamPost }>>;
    deleteTeamPostAction: (
        teamId: string,
        postId: string,
    ) => Promise<ActionResult<{ id: string }>>;
    toggleTeamPostPinAction: (
        teamId: string,
        postId: string,
    ) => Promise<ActionResult<{ post: ApiTeamPost }>>;
    createTeamPostCommentAction: (
        teamId: string,
        postId: string,
        content: string,
        parentId?: string,
    ) => Promise<ActionResult<{ comment: ApiTeamPostComment }>>;
    deleteTeamPostCommentAction: (
        teamId: string,
        postId: string,
        commentId: string,
    ) => Promise<ActionResult<{ id: string }>>;
    uploadTeamPostFileAction: (
        file: File,
    ) => Promise<
        ActionResult<{ url: string; name: string; mimeType: string; size: number; isImage: boolean }>
    >;
};
