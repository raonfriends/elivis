import { getMyProfile } from "@/lib/users";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
    const user = await getMyProfile();

    return <SettingsClient user={user} />;
}
