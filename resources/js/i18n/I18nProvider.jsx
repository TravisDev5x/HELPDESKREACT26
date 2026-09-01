import React, { createContext, useContext, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import messages from "./messages";
import { DEFAULT_LOCALE, normalizeLocale } from "./locales";

export const I18nContext = createContext({
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key) => key,
});

const interpolate = (text, vars = {}) =>
    text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

function buildI18nValue(locale, setLocale) {
    return {
        locale,
        setLocale,
        t: (key, vars) => {
            const entry = messages[locale]?.[key] ?? messages.es?.[key] ?? key;
            if (typeof entry === "function") return entry(vars || {});
            if (typeof entry === "string" && vars) return interpolate(entry, vars);
            return entry;
        },
    };
}

/** Locale sincronizado con useTheme / API (legacy export). */
export function I18nProvider({ children }) {
    const { locale, setLocale } = useTheme();
    const value = useMemo(() => buildI18nValue(locale, setLocale), [locale, setLocale]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Inertia: sin ThemeProvider; locale desde localStorage. */
export function InertiaI18nProvider({ children }) {
    const { locale, setLocale } = useTheme();
    const value = useMemo(
        () => buildI18nValue(normalizeLocale(locale), setLocale),
        [locale, setLocale]
    );
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
