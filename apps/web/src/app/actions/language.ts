"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { SUPPORTED_LOCALES, type Locale } from "@repo/i18n";

const LANG_COOKIE = "elivis_lang";

export async function setLanguageAction(locale: Locale): Promise<void> {
  if (!(SUPPORTED_LOCALES as string[]).includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LANG_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1년
    sameSite: "lax",
    httpOnly: false, // 클라이언트에서도 읽을 수 있도록
  });

  revalidatePath("/", "layout");
}
