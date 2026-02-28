import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Protege las rutas del submódulo TimeDesk.
 * Requiere attendances.manage o attendances.view_all.
 */
export function TimeDeskGuard() {
    const { can, loading } = useAuth();
    const allowed = can("attendances.manage") || can("attendances.view_all");

    if (loading) {
        return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
    }

    if (!allowed) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
