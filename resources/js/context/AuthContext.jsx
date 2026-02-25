import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/check-auth')
            .then(res => {
                const payload = res.data;
                if (payload?.user) {
                    setUser({
                        ...payload.user,
                        roles: payload.roles || [],
                        permissions: payload.permissions || [],
                    });
                } else {
                    setUser(null);
                }
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (credentials) => {
        await axios.get('/sanctum/csrf-cookie');
        const { data } = await axios.post('/api/login', credentials);
        setUser({
            ...data.user,
            roles: data.roles || [],
            permissions: data.permissions || [],
        });
    }, []);

    const logout = useCallback(async () => {
        try {
            await axios.get('/sanctum/csrf-cookie');
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            setUser(null);
            window.dispatchEvent(new CustomEvent('navigate-to-login'));
        }
    }, []);

    const updateUserPrefs = useCallback((prefs) => {
        setUser((prev) => (prev ? { ...prev, ...prefs } : prev));
    }, []);

    const refreshUser = useCallback(() => {
        return axios.get('/api/check-auth').then((res) => {
            const payload = res.data;
            if (payload?.user) {
                setUser({
                    ...payload.user,
                    roles: payload.roles || [],
                    permissions: payload.permissions || [],
                });
            } else {
                setUser(null);
            }
        }).catch(() => setUser(null));
    }, []);

    const updateUserTheme = useCallback((theme) => {
        setUser((prev) => (prev ? { ...prev, theme } : prev));
    }, []);

    const can = useCallback((permission) => {
        if (!permission) return false;
        return Boolean(user?.permissions?.includes(permission));
    }, [user?.permissions]);

    const hasRole = useCallback((role) => {
        if (!role) return false;
        return Boolean(user?.roles?.includes(role));
    }, [user?.roles]);

    const value = useMemo(() => ({
        user,
        loading,
        login,
        logout,
        updateUserTheme,
        updateUserPrefs,
        refreshUser,
        can,
        hasRole,
    }), [user, loading, login, logout, updateUserTheme, updateUserPrefs, refreshUser, can, hasRole]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);


