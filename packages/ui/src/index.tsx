export { Button } from "./Button";
export { NotificationTypeIcon } from "./NotificationTypeIcon";
export type { NotificationTypeIconProps, NotificationTypeIconSize } from "./NotificationTypeIcon";

export { MarkdownContent } from "./MarkdownContent";
export { TopLoadingBar } from "./TopLoadingBar";
export { UserAvatar, getAvatarColor, getInitials, toAvatarSrc } from "./UserAvatar";

export { StatusDropdown, STATUS_STYLE, STATUS_ORDER } from "./StatusDropdown";
export { LanguageSelector } from "./LanguageSelector";
export { ProjectFavoriteButton } from "./ProjectFavoriteButton";
export { TeamFavoriteButton } from "./TeamFavoriteButton";
export { WorkspaceSidebarLabelModal } from "./WorkspaceSidebarLabelModal";

export { AppHeader } from "./AppHeader";
export { AppSidebar, type SidebarSize } from "./AppSidebar";
export { AdminHeader } from "./AdminHeader";
export { AdminSidebar, type AdminSidebarSize } from "./AdminSidebar";

export { NotificationContext, useNotificationContext } from "./context/NotificationContext";
export { UserStatusProvider, useUserStatus } from "./context/UserStatusContext";

export {
    useNotifications,
    requestDesktopNotificationPermission,
    type NotificationItem,
    type UseNotificationsOptions,
} from "./hooks/useNotifications";
export { useNotificationCopy } from "./hooks/useNotificationCopy";

export {
    NotificationPanel,
    NotificationBellButton,
} from "./notifications/NotificationPanel";
export { NotificationBell } from "./notifications/NotificationBell";
export {
    NotificationToastStack,
    useNotificationToastQueue,
    type ToastEntry,
} from "./notifications/NotificationToast";

export { DocxUploader } from "./DocxUploader";
export { DocxAnalysisView } from "./DocxAnalysisView";

export type { UserStatus } from "./types/user-status";
export type { UserProfile } from "./types/user-profile";
export type {
    SidebarWorkspaceListItem,
    SidebarTeamFavoriteItem,
    SidebarProjectFavoriteItem,
} from "./types/app-sidebar";
export type { WorkspaceSidebarLabelTarget } from "./types/workspace-sidebar-label";

export { getApiBaseUrl, apiUrl } from "./utils/api-base-url";
export { getNotificationDeepLink } from "./utils/notification-links";
export { workspaceDisplayName } from "./utils/workspace-display-name";
export { formatFileSize, isDocxFile, DOCX_EXT } from "./utils/docx";
export { formatXml } from "./utils/xml-format";
export { extractDocumentXmlFromDocx } from "./utils/extract-docx-xml";
