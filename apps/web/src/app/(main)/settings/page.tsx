import { getMyNotificationPreferences, getMyProfile } from "@/lib/server/user-profile.server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
    const user = await getMyProfile();
    const notificationPrefs = user ? await getMyNotificationPreferences() : null;

    return <SettingsClient user={user} notificationPrefs={notificationPrefs} />;
}
