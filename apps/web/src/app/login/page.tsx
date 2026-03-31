"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { loginAction } from "@/app/actions/auth";
import { LanguageSelector } from "@/components/LanguageSelector";

const initialState = { error: null };
const SAVED_EMAIL_KEY = "elivis_saved_email";
const REMEMBER_PREF_KEY = "elivis_remember_pref"; // 체크박스 ON/OFF 상태 별도 저장

export default function LoginPage() {
    const t = useTranslations("auth");
    const [state, formAction, isPending] = useActionState(loginAction, initialState);

    const [emailValue, setEmailValue] = useState("");
    const [rememberEmail, setRememberEmail] = useState(false);

    // 마운트(및 리마운트) 시 localStorage에서 이메일·체크박스 상태 복원
    useEffect(() => {
        const pref = localStorage.getItem(REMEMBER_PREF_KEY) === "1";
        const saved = localStorage.getItem(SAVED_EMAIL_KEY) ?? "";
        setRememberEmail(pref);
        if (pref && saved) setEmailValue(saved);
    }, []);

    // 체크박스 변경 시 즉시 저장 → 에러 후 리마운트돼도 유지
    function handleRememberChange(checked: boolean) {
        setRememberEmail(checked);
        localStorage.setItem(REMEMBER_PREF_KEY, checked ? "1" : "0");
        if (!checked) localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    function handleSubmit() {
        if (rememberEmail && emailValue) {
            localStorage.setItem(SAVED_EMAIL_KEY, emailValue);
        } else {
            localStorage.removeItem(SAVED_EMAIL_KEY);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f5] px-4 py-8 sm:px-6">
            <div className="w-full max-w-[400px]">
                {/* 로고 */}
                <div className="mb-10 text-center">
                    <span className="inline-block text-5xl font-semibold tracking-tight text-stone-800 font-sans">
                        Elivis
                    </span>
                </div>

                {/* 카드 */}
                <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/50 transition-shadow hover:shadow-md">
                    {/* 언어 선택 — 카드 최상단 full-width */}
                    <div className="border-b border-stone-100 px-5 py-3">
                        <LanguageSelector variant="full" align="right" />
                    </div>

                    <form action={formAction} onSubmit={handleSubmit} className="space-y-5 p-8">
                        {/* 에러 메시지 */}
                        {state.error && (
                            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                                {state.error}
                            </p>
                        )}

                        {/* 이메일 */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-stone-600"
                            >
                                {t("emailLabel")}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder={t("emailPlaceholder")}
                                value={emailValue}
                                onChange={(e) => setEmailValue(e.target.value)}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                                disabled={isPending}
                                required
                            />
                        </div>

                        {/* 비밀번호 */}
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-stone-600"
                            >
                                {t("passwordLabel")}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder={t("passwordPlaceholder")}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
                                disabled={isPending}
                                required
                            />
                        </div>

                        {/* 아이디 저장 체크박스 */}
                        <label className="flex cursor-pointer items-center gap-2.5 select-none">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberEmail}
                                    onChange={(e) => handleRememberChange(e.target.checked)}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-stone-300 bg-white transition-colors checked:border-amber-400 checked:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/30 disabled:opacity-60"
                                    disabled={isPending}
                                />
                                {/* 체크 아이콘 */}
                                <svg
                                    className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m1.5 6 3 3 6-6"
                                    />
                                </svg>
                            </div>
                            <span className="text-sm text-stone-500">{t("rememberEmail")}</span>
                        </label>

                        {/* 로그인 버튼 */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 active:scale-[0.99] disabled:opacity-70"
                        >
                            {isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    {t("loggingIn")}
                                </span>
                            ) : (
                                t("loginButton")
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
