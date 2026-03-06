import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, LayoutDashboard, ListTodo, Plus, Workflow, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const RESOLVE_BASE = "/resolbeb";

export default function ResolbebDashboard() {
    const { can } = useAuth();
    const canSeeTickets = can("tickets.manage_all") || can("tickets.view_area");
    const canSeeMyTickets = (can("tickets.create") || can("tickets.view_own")) && canSeeTickets;
    const canCreate = can("tickets.create") || can("tickets.manage_all");
    const canSeeCatalogs = can("catalogs.manage") || can("tickets.view_area") || can("tickets.manage_all");

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground flex items-center gap-3">
                        <Ticket className="h-8 w-8 text-primary" />
                        Resolbeb
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm mt-1">
                        Ticketera centralizada de incidencias y solicitudes.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {canSeeMyTickets && (
                    <Card className={cn("border-border/50 bg-card hover:bg-accent/5 transition-colors")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ListTodo className="h-4 w-4 text-primary" />
                                Mis tickets
                            </CardTitle>
                            <CardDescription>Tus tickets como solicitante. Da seguimiento y agrega comentarios.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="secondary" size="sm">
                                <Link to={`${RESOLVE_BASE}/mis-tickets`}>Ver mis tickets</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {canSeeTickets && (
                    <Card className={cn("border-border/50 bg-card hover:bg-accent/5 transition-colors")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4 text-primary" />
                                Gestión de tickets
                            </CardTitle>
                            <CardDescription>Cola de tickets. Filtros, asignación y seguimiento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="secondary" size="sm">
                                <Link to={`${RESOLVE_BASE}/tickets`}>Ir a tickets</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {canCreate && (
                    <Card className={cn("border-border/50 bg-card hover:bg-accent/5 transition-colors")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Plus className="h-4 w-4 text-primary" />
                                Nuevo ticket
                            </CardTitle>
                            <CardDescription>Registrar una nueva solicitud o incidencia.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild size="sm">
                                <Link to={`${RESOLVE_BASE}/tickets/new`}>Crear ticket</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
                {canSeeCatalogs && (
                    <>
                        <Card className={cn("border-border/50 bg-card hover:bg-accent/5 transition-colors")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Workflow className="h-4 w-4 text-primary" />
                                    Estados
                                </CardTitle>
                                <CardDescription>Catálogo de estados del ciclo de vida del ticket.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" size="sm">
                                    <Link to={`${RESOLVE_BASE}/estados`}>Estados de ticket</Link>
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className={cn("border-border/50 bg-card hover:bg-accent/5 transition-colors")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Tags className="h-4 w-4 text-primary" />
                                    Tipos
                                </CardTitle>
                                <CardDescription>Tipos de ticket y áreas responsables.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" size="sm">
                                    <Link to={`${RESOLVE_BASE}/tipos`}>Tipos de ticket</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
