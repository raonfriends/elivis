export interface ApiTeamPostAuthor {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
}

export interface ApiTeamPostComment {
    id: string;
    postId: string;
    parentId: string | null;
    content: string;
    author: ApiTeamPostAuthor;
    replies?: ApiTeamPostComment[];
    createdAt: string;
    updatedAt: string;
}

export interface ApiTeamPostAttachment {
    id: string;
    postId: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
    createdAt: string;
}

export interface ApiTeamPost {
    id: string;
    teamId: string;
    category: string;
    title: string;
    content: string;
    isPinned: boolean;
    author: ApiTeamPostAuthor;
    _count?: { comments: number };
    comments?: ApiTeamPostComment[];
    attachments?: ApiTeamPostAttachment[];
    createdAt: string;
    updatedAt: string;
}
