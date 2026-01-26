import React, { createContext, useContext, useMemo } from 'react';
import messages from './messages';
import { useTheme } from '@/hooks/useTheme';

const I18nContext = createContext({
    locale: 'es',
    setLocale: () => {},
    t: (key) => key,
});

const interpolate = (text, vars = {}) =>
    text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));

export function I18nProvider({ children }) {
    const { locale, setLocale } = useTheme();

    const value = useMemo(() => ({
        locale,
        setLocale,
        t: (key, vars) => {
            const entry = messages[locale]?.[key] ?? messages.es?.[key] ?? key;
            if (typeof entry === 'function') return entry(vars || {});
            if (typeof entry === 'string' && vars) return interpolate(entry, vars);
            return entry;
        },
    }), [locale, setLocale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
