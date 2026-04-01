/**
 * API `data` 타입·매핑 모음. 규칙은 `api-envelope.ts` 참고.
 * 개별 도메인은 `map-api-*.ts` 에서 import 해도 된다.
 */

export type { ApiEnvelope } from "./api-envelope";
export type {
    ApiAdminUserDetail,
    ApiAdminUserMembership,
    ApiAdminUserRow,
} from "./map-api-admin";
export type { ApiAuthLoginData, ApiAuthUser } from "./map-api-auth";
export type {
    ApiIdPayload,
    ApiProjectDetail,
    ApiProjectListData,
    ApiProjectListItem,
} from "./map-api-project";
export type {
    ApiTeamBannerData,
    ApiTeamDetail,
    ApiTeamFieldsUpdated,
    ApiTeamListItem,
    ApiTeamMemberRow,
    ApiTeamProjectRow,
    ApiTeamsListData,
} from "./map-api-team";
export type { ApiUserProfile, ApiUserSearchRow } from "./map-api-user";

export { mapApiProjectToClient, toYmdFromIso } from "./map-api-project";
