import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { NavLink, Outlet } from "react-router-dom";

export default function AppLayout({ title = "Dashboard", children }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Top bar */}
            <header className="h-14 border-b flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="font-semibold tracking-tight">
                        UserScope
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="text-sm text-muted-foreground">{title}</div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">
                        Nuevo
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                        TD
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Perfil</DropdownMenuItem>
                            <DropdownMenuItem>Configuración</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                                Cerrar sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main grid */}
            <div className="grid grid-cols-[260px_1fr]">
                {/* Sidebar */}
                <nav className="space-y-1">
                    <SideLink to="/">Dashboard</SideLink>
                    <SideLink to="/users">Usuarios</SideLink>
                    <SideLink to="/roles">Roles</SideLink>
                    <SideLink to="/permissions">Permisos</SideLink>
                    <Separator className="my-3" />
                    <SideLink to="/settings">Configuración</SideLink>
                </nav>

                {/* Content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function SideLink({ to, children }) {
    return (
        <NavLink
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
                [
                    "block w-full rounded-lg px-3 py-2 text-sm transition",
                    isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                ].join(" ")
            }
        >
            {children}
        </NavLink>
    );
}
