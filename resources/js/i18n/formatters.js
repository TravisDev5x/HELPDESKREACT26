import { toIntlLocale } from "./locales";

const asDate = (value) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value, locale, options = {}) =>
    new Intl.DateTimeFormat(toIntlLocale(locale), options).format(asDate(value));

export const formatTime = (value, locale, options = {}) =>
    new Intl.DateTimeFormat(toIntlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
        ...options,
    }).format(asDate(value));

export const formatDateTime = (value, locale, options = {}) =>
    new Intl.DateTimeFormat(toIntlLocale(locale), {
        dateStyle: "medium",
        timeStyle: "short",
        ...options,
    }).format(asDate(value));

export const formatCurrency = (value, locale, currency = "MXN") =>
    new Intl.NumberFormat(toIntlLocale(locale), {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
