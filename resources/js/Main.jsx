import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sileo";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SidebarPositionProvider } from "@/context/SidebarPositionContext";
import { I18nProvider } from "@/i18n/I18nProvider";

// Layout (no lazy: se necesita de inmediato para la shell)
import AppLayout from "@/layouts/AppLayout";

// Vistas privadas (lazy)
const Dashboard = lazy(() => import("@/Pages/Dashboard"));
const Users = lazy(() => import("@/Pages/Users"));
const Roles = lazy(() => import("@/Pages/Roles"));
const Campaigns = lazy(() => import("@/Pages/Campaigns"));
const Areas = lazy(() => import("@/Pages/Areas"));
const Positions = lazy(() => import("@/Pages/Positions"));
const Sedes = lazy(() => import("@/Pages/Sedes"));
const Ubicaciones = lazy(() => import("@/Pages/Ubicaciones"));
const Prioridades = lazy(() => import("@/Pages/Prioridades"));
const TicketEstados = lazy(() => import("@/Pages/TicketEstados"));
const TicketTipos = lazy(() => import("@/Pages/TicketTipos"));
const TicketDetalle = lazy(() => import("@/Pages/TicketDetalle"));
const TicketCreate = lazy(() => import("@/Pages/TicketCreate"));
const Tickets = lazy(() => import("@/Pages/Tickets"));
const Calendario = lazy(() => import("@/Pages/Calendario"));
const Incidents = lazy(() => import("@/Pages/Incidents"));
const IncidentDetalle = lazy(() => import("@/Pages/IncidentDetalle"));
const IncidentTipos = lazy(() => import("@/Pages/IncidentTipos"));
const IncidentSeveridades = lazy(() => import("@/Pages/IncidentSeveridades"));
const IncidentEstados = lazy(() => import("@/Pages/IncidentEstados"));
const Settings = lazy(() => import("@/Pages/Settings"));
const Sessions = lazy(() => import("@/Pages/Sessions"));
const Permissions = lazy(() => import("@/Pages/Permissions"));
const Profile = lazy(() => import("@/Pages/Profile"));
const SiguaDashboard = lazy(() => import("@/Pages/Sigua/SiguaDashboard"));
const SiguaCuentas = lazy(() => import("@/Pages/Sigua/SiguaCuentas"));
const SiguaCuentaDetalle = lazy(() => import("@/Pages/Sigua/SiguaCuentaDetalle"));
const SiguaCA01 = lazy(() => import("@/Pages/Sigua/SiguaCA01"));
const SiguaCA01Nuevo = lazy(() => import("@/Pages/Sigua/SiguaCA01Nuevo"));
const SiguaCA01Detalle = lazy(() => import("@/Pages/Sigua/SiguaCA01Detalle"));
const SiguaBitacora = lazy(() => import("@/Pages/Sigua/SiguaBitacora"));
const SiguaBitacoraSede = lazy(() => import("@/Pages/Sigua/SiguaBitacoraSede"));
const SiguaIncidenteDetalle = lazy(() => import("@/Pages/Sigua/SiguaIncidenteDetalle"));
const SiguaIncidentes = lazy(() => import("@/Pages/Sigua/SiguaIncidentes"));
const SiguaImportar = lazy(() => import("@/Pages/Sigua/SiguaImportar"));
const SiguaCruces = lazy(() => import("@/Pages/Sigua/SiguaCruces"));
const SiguaReportes = lazy(() => import("@/Pages/Sigua/SiguaReportes"));
const SiguaEmpleados = lazy(() => import("@/Pages/Sigua/SiguaEmpleados"));
const SiguaEmpleadoDetalle = lazy(() => import("@/Pages/Sigua/SiguaEmpleadoDetalle"));
const SiguaSistemas = lazy(() => import("@/Pages/Sigua/SiguaSistemas"));
const SiguaAlertas = lazy(() => import("@/Pages/Sigua/SiguaAlertas"));
const SiguaConfiguracion = lazy(() => import("@/Pages/Sigua/SiguaConfiguracion"));

// Público / auth (lazy)
const Login = lazy(() => import("@/Pages/Login"));
const ForgotPassword = lazy(() => import("@/Pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/Pages/ResetPassword"));
const ForceChangePassword = lazy(() => import("@/Pages/ForceChangePassword"));
const Register = lazy(() => import("@/Pages/Register"));
const Manual = lazy(() => import("@/Pages/Manual"));
const VerifyEmail = lazy(() => import("@/Pages/VerifyEmail"));

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
            <SidebarPositionProvider>
                <I18nProvider>
                    <Toaster
                        position="top-center"
                        options={{
                            fill: "hsl(var(--card))",
                            roundness: 12,
                            styles: {
                                title: "!text-foreground !font-semibold",
                                description: "!text-foreground/90",
                                badge: "!bg-primary/15 !text-primary !border !border-primary/30",
                                button: "!bg-muted hover:!bg-accent !text-foreground",
                            },
                        }}
                    />
                    <BrowserRouter>
                    <Suspense fallback={<Fallback />}>
                        <Routes>

                            {/* ZONA PÚBLICA (Login) */}
                            <Route path="/manual" element={<Manual />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
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
                                    <Route path="/mis-tickets" element={<Tickets />} />
                                    <Route path="/tickets" element={<Tickets />} />
                                    <Route path="/tickets/new" element={<TicketCreate />} />
                                    <Route path="/tickets/:id" element={<TicketDetalle />} />
                                    <Route path="/calendario" element={<Calendario />} />
                                    <Route path="/incidents" element={<Incidents />} />
                                    <Route path="/incidents/:id" element={<IncidentDetalle />} />
                                    <Route path="/incident-types" element={<IncidentTipos />} />
                                    <Route path="/incident-severities" element={<IncidentSeveridades />} />
                                    <Route path="/incident-statuses" element={<IncidentEstados />} />
                                    <Route path="/roles" element={<Roles />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/sessions" element={<Sessions />} />
                                    <Route path="/permissions" element={<Permissions />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/sigua" element={<SiguaDashboard />} />
                                    <Route path="/sigua/cuentas" element={<SiguaCuentas />} />
                                    <Route path="/sigua/cuentas/:id" element={<SiguaCuentaDetalle />} />
                                    <Route path="/sigua/empleados-rh" element={<SiguaEmpleados />} />
                                    <Route path="/sigua/empleados-rh/:id" element={<SiguaEmpleadoDetalle />} />
                                    <Route path="/sigua/sistemas" element={<SiguaSistemas />} />
                                    <Route path="/sigua/alertas" element={<SiguaAlertas />} />
                                    <Route path="/sigua/configuracion" element={<SiguaConfiguracion />} />
                                    <Route path="/sigua/ca01" element={<SiguaCA01 />} />
                                    <Route path="/sigua/ca01/nuevo" element={<SiguaCA01Nuevo />} />
                                    <Route path="/sigua/ca01/:id" element={<SiguaCA01Detalle />} />
                                    <Route path="/sigua/bitacora" element={<SiguaBitacora />} />
                                    <Route path="/sigua/bitacora/sede" element={<SiguaBitacoraSede />} />
                                    <Route path="/sigua/bitacora-sede" element={<SiguaBitacoraSede />} />
                                    <Route path="/sigua/incidentes" element={<SiguaIncidentes />} />
                                    <Route path="/sigua/incidentes/:id" element={<SiguaIncidenteDetalle />} />
                                    <Route path="/sigua/importar" element={<SiguaImportar />} />
                                    <Route path="/sigua/cruces" element={<SiguaCruces />} />
                                    <Route path="/sigua/reportes" element={<SiguaReportes />} />
                                    <Route path="*" element={<NotFound />} />
                                </Route>
                            </Route>

                        </Routes>
                    </Suspense>
                </BrowserRouter>
                </I18nProvider>
            </SidebarPositionProvider>
        </AuthProvider>
    );
}


