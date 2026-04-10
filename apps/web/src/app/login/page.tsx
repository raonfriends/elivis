import { fetchPublicAuthConfig } from "@/lib/server/auth.server";

import { LoginPageClient } from "./LoginPageClient";

type LoginPageSearchParams = {
    error?: string | string[];
};

function getSearchParamValue(value: string | string[] | undefined): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return null;
}

export default async function LoginPage(props: { searchParams?: Promise<LoginPageSearchParams> | LoginPageSearchParams }) {
    const config = await fetchPublicAuthConfig();
    const searchParams = await Promise.resolve(props.searchParams ?? {});

    return (
        <LoginPageClient
            publicSignupEnabled={config.publicSignupEnabled}
            ldapEnabled={config.ldapEnabled}
            googleEnabled={config.googleEnabled}
            callbackError={getSearchParamValue(searchParams.error)}
        />
    );
}
