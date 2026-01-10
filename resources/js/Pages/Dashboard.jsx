import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    0 registrados
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Roles</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    0 roles
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Permisos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    0 permisos
                </CardContent>
            </Card>
        </div>
    );
}
