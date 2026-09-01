export const DEFAULT_LOCALE = "es";

// Añadir un idioma requiere su catálogo completo y pruebas de cobertura.
export const SUPPORTED_LOCALES = ["es", "en"];

export const LOCALE_OPTIONS = [
    { value: "es", label: "Español", flag: "🇲🇽" },
    { value: "en", label: "English", flag: "🇺🇸" },
];

export const normalizeLocale = (locale) => {
    const value = String(locale || "").slice(0, 2).toLowerCase();
    return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
};

export const toIntlLocale = (locale) => (normalizeLocale(locale) === "en" ? "en-US" : "es-MX");
