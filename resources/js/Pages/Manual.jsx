import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AccordionSimple } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Manual() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="uppercase tracking-wide text-xs">Documentación pública</Badge>
            <Badge variant="secondary">v1.0</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Manual de Helpdesk</h1>
          <p className="text-muted-foreground max-w-3xl">
            Guía rápida y segura para usuarios y agentes. Todo el contenido es de solo lectura y no expone datos sensibles.
          </p>
          <Separator />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Acceso y seguridad</CardTitle>
            <CardDescription>Lineamientos para entrar de forma segura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li>Usa tu correo o número de empleado y contraseña. El sistema aplica políticas de complejidad y bloqueo por intentos.</li>
              <li>Si olvidas tu contraseña, usa “¿Olvidaste tu contraseña?”. El enlace de reset caduca y es de un solo uso.</li>
              <li>Sesiones seguras: cookies HttpOnly con SameSite; cierra sesión en dispositivos compartidos.</li>
              <li>Registro: requiere aprobación o verificación de correo según configuración del administrador.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles y permisos (RBAC)</CardTitle>
            <CardDescription>Cómo se controla el acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Solicitante</strong>: puede crear tickets y ver los propios.</li>
              <li><strong>Área</strong>: ve tickets de su área actual o histórica; puede gestionarlos si es área actual y tiene permisos.</li>
              <li><strong>Responsable</strong>: si el ticket está asignado, puede trabajar aunque cambie de área (requiere permisos específicos).</li>
              <li><strong>Admin</strong>: acceso total (tickets.manage_all).</li>
            </ul>
            <p className="text-muted-foreground">Los permisos se administran en Roles y Permissions, no se asignan directamente a usuarios.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo de tickets</CardTitle>
            <CardDescription>Creación, asignación, escalación y visibilidad</CardDescription>
          </CardHeader>
          <CardContent>
            <AccordionSimple
              items={[
                {
                  value: "crear",
                  title: "Crear un ticket",
                  content: "Completa asunto, descripción, sede, área destino y prioridad. Los campos opcionales no bloquean el registro."
                },
                {
                  value: "asignar",
                  title: "Tomar / asignar",
                  content: (
                    <>
                      Quien tenga permiso <code className="font-mono text-xs">tickets.assign</code> puede tomar un ticket no asignado,
                      reasignarlo dentro del área actual o liberarlo.
                    </>
                  )
                },
                {
                  value: "escalar",
                  title: "Escalar",
                  content: (
                    <>
                      Cambia el área actual y limpia la asignación. Se registra en <code className="font-mono text-xs">ticket_area_access</code>
                      para mantener visibilidad histórica.
                    </>
                  )
                },
                {
                  value: "visibilidad",
                  title: "Visibilidad",
                  content: "Un área ve el ticket si es área actual o participó históricamente. El solicitante siempre ve sus tickets. Admin ve todo."
                },
              ]}
              defaultOpen="crear"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buenas prácticas</CardTitle>
            <CardDescription>Recomendaciones de operación segura</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed space-y-2">
            <ul className="list-disc pl-5 space-y-2">
              <li>No compartas credenciales; usa el cambio de contraseña periódicamente.</li>
              <li>Evita datos sensibles en notas de tickets (PII, secretos).</li>
              <li>Reporta accesos indebidos al administrador.</li>
              <li>Desconéctate al usar equipos públicos o compartidos.</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Manual público • Solo lectura • Sin datos sensibles</span>
          <Button asChild variant="link" className="h-auto p-0 text-primary">
            <Link to="/login">Volver al login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
