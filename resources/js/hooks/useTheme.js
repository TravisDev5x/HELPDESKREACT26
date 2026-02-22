import { useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { useAuth } from '@/context/AuthContext'

const STORAGE_KEY = 'theme'
const STORAGE_LOCALE = 'locale'
const THEME_ORDER = ['light', 'light-dim', 'adminlte-legacy', 'dark', 'dark-deep', 'aeroglass', 'aeroglass-dark']

export const DEFAULT_PREFS = {
    theme: 'light',
    ui_density: 'normal',
    sidebar_state: 'collapsed',
    sidebar_hover_preview: true,
    locale: 'es',
}

const setRootTheme = (theme, opts = {}) => {
    const root = document.documentElement
    THEME_ORDER.forEach((t) => root.classList.remove(t))
    root.classList.add(theme)
    root.style.colorScheme = theme.includes('dark') ? 'dark' : 'light'
    if (opts.blockTransitions) root.dataset.themeSwitching = '1'
}

const setRootLocale = (locale) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = locale || DEFAULT_PREFS.locale
    }
}

export function useTheme() {
    const { user, updateUserTheme, updateUserPrefs } = useAuth()

    const resolveInitialTheme = () => {
        if (typeof window === 'undefined') return { theme: DEFAULT_PREFS.theme, explicit: false }
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return { theme: stored, explicit: true }
        if (user?.theme) return { theme: user.theme, explicit: true }
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return { theme: prefersDark ? 'dark' : DEFAULT_PREFS.theme, explicit: false }
    }

    const initial = resolveInitialTheme()
    const [theme, setThemeState] = useState(initial.theme)
    const [hasExplicitPreference, setHasExplicitPreference] = useState(initial.explicit)
    const [density, setDensity] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_PREFS.ui_density
        return user?.ui_density || localStorage.getItem('ui_density') || DEFAULT_PREFS.ui_density
    })
    const [locale, setLocaleState] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_PREFS.locale
        return user?.locale || localStorage.getItem(STORAGE_LOCALE) || DEFAULT_PREFS.locale
    })

    // Si el usuario llega con datos diferentes, sincronizamos
    useEffect(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (stored) {
            if (!hasExplicitPreference) setHasExplicitPreference(true)
            if (stored !== theme) {
                setThemeState(stored)
            }
            if (user && stored !== user.theme) {
                axios.put('/api/profile/theme', { theme: stored })
                    .then(() => updateUserTheme(stored))
                    .catch(() => { })
            }
            return
        }

        if (user?.theme) {
            if (!hasExplicitPreference) setHasExplicitPreference(true)
            if (user.theme !== theme) {
                setThemeState(user.theme)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.theme])

    useEffect(() => {
        if (user?.ui_density && user.ui_density !== density) {
            applyDensity(user.ui_density, { persist: false })
        } else {
            document.documentElement.dataset.uiDensity = density
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.ui_density])

    useEffect(() => {
        if (user?.locale && user.locale !== locale) {
            applyLocale(user.locale, { persist: false })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.locale])

    useEffect(() => {
        const root = document.documentElement
        setRootTheme(theme)
        if (hasExplicitPreference) {
            localStorage.setItem(STORAGE_KEY, theme)
        }
        if (root.dataset.themeInit) delete root.dataset.themeInit
        if (root.dataset.themeSwitching) {
            setTimeout(() => root.removeAttribute('data-theme-switching'), 150)
        }
    }, [theme, hasExplicitPreference])

    useEffect(() => {
        setRootLocale(locale)
    }, [locale])

    // respeta cambio de sistema si el usuario no fijó preferencia
    useEffect(() => {
        if (hasExplicitPreference) return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e) => setThemeState(e.matches ? 'dark' : DEFAULT_PREFS.theme)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [hasExplicitPreference])

    const persistPreferences = async (payload) => {
        if (!user) return
        try {
            await axios.put('/api/profile/preferences', payload)
            updateUserPrefs(payload)
        } catch (error) {
            // silencioso para no frenar la UI
        }
    }

    const applyTheme = (next, opts = { persist: true }) => {
        if (!THEME_ORDER.includes(next)) return
        setRootTheme(next, { blockTransitions: true })
        setThemeState(next)
        setHasExplicitPreference(true)
        localStorage.setItem(STORAGE_KEY, next)
        if (user && opts.persist !== false) {
            persistPreferences({ theme: next })
            updateUserTheme(next)
        }
    }

    const applyDensity = (next, opts = { persist: true }) => {
        if (!['normal', 'compact'].includes(next)) return
        setDensity(next)
        localStorage.setItem('ui_density', next)
        document.documentElement.dataset.uiDensity = next
        if (user && opts.persist !== false) {
            persistPreferences({ ui_density: next })
        }
    }

    const applyLocale = (next, opts = { persist: true }) => {
        const allowed = ['es', 'en', 'ja', 'de', 'zh', 'fr']
        if (!allowed.includes(next)) return
        setLocaleState(next)
        setRootLocale(next)
        localStorage.setItem(STORAGE_LOCALE, next)
        if (user && opts.persist !== false) {
            persistPreferences({ locale: next })
        }
    }

    return {
        theme,
        toggleTheme: () => {
            const next = theme.startsWith('dark') ? 'light' : 'dark'
            applyTheme(next)
        },
        isDark: theme.startsWith('dark'),
        setTheme: (next, opts) => applyTheme(next, opts),
        density,
        setDensity: (next, opts) => applyDensity(next, opts),
        locale,
        setLocale: (next, opts) => applyLocale(next, opts),
        cycleLight: () => {
            const next = theme.startsWith('light')
                ? (theme === 'light' ? 'light-dim' : 'light')
                : 'light'
            applyTheme(next)
        },
        cycleDark: () => {
            const next = theme.startsWith('dark')
                ? (theme === 'dark' ? 'dark-deep' : 'dark')
                : 'dark'
            applyTheme(next)
        },
        themes: THEME_ORDER,
        defaults: DEFAULT_PREFS,
    }
}
