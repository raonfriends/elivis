import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import { SUPPORTED_LOCALES, getWebMessages, parseLocale, type Locale } from "@repo/i18n";

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get("elivis_lang")?.value;

    let locale: Locale;

    if (cookieLang && (SUPPORTED_LOCALES as string[]).includes(cookieLang)) {
        // 1순위: 사용자가 직접 선택한 언어 (쿠키)
        locale = cookieLang as Locale;
    } else {
        // 2순위: Accept-Language 헤더 자동 감지
        //   ko/ja → 해당 언어, 그 외 모든 국가 → en
        const headerStore = await headers();
        locale = parseLocale(headerStore.get("accept-language"));
    }

    return {
        locale,
        messages: getWebMessages(locale) as Record<string, unknown>,
    };
});
