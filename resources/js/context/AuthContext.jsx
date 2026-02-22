import { createContext, useContext, useState, useEffect } from "react";
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

    const login = async (credentials) => {
        // PASO ÚNICO CSRF
        await axios.get('/sanctum/csrf-cookie');

        // LOGIN CORRECTO
        const { data } = await axios.post('/api/login', credentials);
        setUser({
            ...data.user,
            roles: data.roles || [],
            permissions: data.permissions || [],
        });
    };

    const logout = async () => {
        try {
            await axios.get('/sanctum/csrf-cookie');
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            setUser(null);
            // navegación SPA; evita recarga completa
            window.dispatchEvent(new CustomEvent('navigate-to-login'));
        }
    };

    const updateUserPrefs = (prefs) => {
        setUser((prev) => (prev ? { ...prev, ...prefs } : prev));
    };

    const refreshUser = () => {
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
    };

    const updateUserTheme = (theme) => updateUserPrefs({ theme });

    const can = (permission) => {
        if (!permission) return false;
        return Boolean(user?.permissions?.includes(permission));
    };

    const hasRole = (role) => {
        if (!role) return false;
        return Boolean(user?.roles?.includes(role));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUserTheme, updateUserPrefs, refreshUser, can, hasRole }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);


