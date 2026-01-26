import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/i18n/I18nProvider";

// Layout
import AppLayout from "@/layouts/AppLayout";

// Vistas (lazy)
import Dashboard from "@/Pages/Dashboard";
import Users from "@/Pages/Users";
import Roles from "@/Pages/Roles";
import Campaigns from "@/Pages/Campaigns";
import Areas from "@/Pages/Areas";
import Positions from "@/Pages/Positions";
import Sedes from "@/Pages/Sedes";
import Ubicaciones from "@/Pages/Ubicaciones";
import Prioridades from "@/Pages/Prioridades";
import TicketEstados from "@/Pages/TicketEstados";
import TicketTipos from "@/Pages/TicketTipos";
import TicketDetalle from "@/Pages/TicketDetalle";
import Tickets from "@/Pages/Tickets";
import Settings from "@/Pages/Settings";
import Permissions from "@/Pages/Permissions";
import Profile from "@/Pages/Profile";

// Público / auth
import Login from "@/Pages/Login";
import ForgotPassword from "@/Pages/ForgotPassword";
import ResetPassword from "@/Pages/ResetPassword";
import ForceChangePassword from "@/Pages/ForceChangePassword";
import Register from "@/Pages/Register";
import Manual from "@/Pages/Manual";

const Fallback = () => (
    <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
);

const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Fallback />;

    if (!user) return <Navigate to="/login" />;

    if (user.force_password_change && location.pathname !== "/force-change-password") {
        return <Navigate to="/force-change-password" />;
    }

    return <Outlet />;
};

const GuestRoute = () => {
    const { user, loading } = useAuth();

    if (loading) return null;

    return user ? <Navigate to="/" /> : <Outlet />;
};

function NotFound() {
    return (
        <div className="space-y-2 p-10">
            <h1 className="text-2xl font-semibold">404</h1>
            <p className="text-muted-foreground">Ruta no encontrada.</p>
        </div>
    );
}

export default function Main() {
    return (
        <AuthProvider>
            <I18nProvider>
                <Toaster />
                <BrowserRouter>
                    
                        <Routes>

                            {/* ZONA PÚBLICA (Login) */}
                            <Route path="/manual" element={<Manual />} />
                            <Route element={<GuestRoute />}>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                            </Route>

                            {/* ZONA PRIVADA */}
                            <Route element={<ProtectedRoute />}>
                                <Route element={<AppLayout />}>
                                    <Route path="/force-change-password" element={<ForceChangePassword />} />
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/users" element={<Users />} />
                                    <Route path="/campaigns" element={<Campaigns />} />
                                    <Route path="/areas" element={<Areas />} />
                                    <Route path="/positions" element={<Positions />} />
                                    <Route path="/sedes" element={<Sedes />} />
                                    <Route path="/ubicaciones" element={<Ubicaciones />} />
                                    <Route path="/priorities" element={<Prioridades />} />
                                    <Route path="/ticket-states" element={<TicketEstados />} />
                                    <Route path="/ticket-types" element={<TicketTipos />} />
                                    <Route path="/tickets" element={<Tickets />} />
                                    <Route path="/tickets/:id" element={<TicketDetalle />} />
                                    <Route path="/roles" element={<Roles />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/permissions" element={<Permissions />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="*" element={<NotFound />} />
                                </Route>
                            </Route>

                        </Routes>
                    
                </BrowserRouter>
            </I18nProvider>
        </AuthProvider>
    );
}


