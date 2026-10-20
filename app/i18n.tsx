"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  useEffect,
  type ReactNode,
} from "react";

export type Locale = "zh" | "en" | "ja" | "ko";

export const localeOptions: Array<{ code: Locale; label: string }> = [
  { code: "zh", label: "简中" },
  { code: "en", label: "EN" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: "zh", setLocale: () => {} });

function subscribeLocale(callback: () => void) {
  window.addEventListener("wins:locale", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("wins:locale", callback);
    window.removeEventListener("storage", callback);
  };
}
function getLocale(): Locale {
  const stored = localStorage.getItem("wins-locale");
  return localeOptions.some((item) => item.code === stored)
    ? (stored as Locale)
    : "zh";
}
function setLocale(locale: Locale) {
  localStorage.setItem("wins-locale", locale);
  window.dispatchEvent(new Event("wins:locale"));
}
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocale,
    () => "zh" as Locale,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  return useContext(I18nContext);
}
