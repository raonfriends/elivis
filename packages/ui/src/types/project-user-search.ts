/** GET /api/users/search 한 행 (앱 `ApiUserSearchRow`와 동일) */
export type SearchableUserForProject = {
    id: string;
    email: string;
    name: string | null;
};
