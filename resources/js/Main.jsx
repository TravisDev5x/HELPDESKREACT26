import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";

import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Roles from "@/pages/Roles";

function NotFound() {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold">404</h1>
            <p className="text-muted-foreground">Ruta no encontrada.</p>
        </div>
    );
}

export default function Main() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/roles" element={<Roles />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
