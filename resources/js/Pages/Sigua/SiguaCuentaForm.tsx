import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CuentaGenerica, Sistema } from "@/types/sigua";
import type { CreateCuentaPayload } from "@/services/siguaApi";

const formSchema = z.object({
  sistema_id: z.number({ required_error: "Selecciona un sistema" }),
  usuario_cuenta: z.string().min(1, "Usuario/cuenta es requerido").max(100, "Máximo 100 caracteres"),
  nombre_cuenta: z.string().min(1, "Nombre de cuenta es requerido").max(255, "Máximo 255 caracteres"),
  sede_id: z.number({ required_error: "Selecciona una sede" }),
  campaign_id: z.union([z.number(), z.nan()]).optional().transform((v) => (Number.isNaN(v) || v == null ? null : v)),
  isla: z.string().max(100).optional().nullable(),
  perfil: z.string().max(100).optional().nullable(),
  ou_ad: z.string().max(255).optional().nullable(),
  estado: z.enum(["activa", "suspendida", "baja"], { required_error: "Selecciona estado" }),
});

type FormValues = z.infer<typeof formSchema>;

export interface SiguaCuentaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCuentaPayload) => Promise<void>;
  onCancel: () => void;
  cuenta?: CuentaGenerica | null;
  sistemas: Sistema[];
  sedes: Array<{ id: number; name: string }>;
  campaigns: Array<{ id: number; name: string }>;
  isSubmitting?: boolean;
}

export function SiguaCuentaForm({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  cuenta,
  sistemas,
  sedes,
  campaigns,
  isSubmitting = false,
}: SiguaCuentaFormProps) {
  const isEdit = Boolean(cuenta?.id);
  const selectedSistema = sistemas.find((s) => s.id === (cuenta?.system_id ?? 0));
  const isExterno = selectedSistema?.es_externo === true || selectedSistema?.slug?.toLowerCase() === "ahevaa";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sistema_id: cuenta?.system_id ?? 0,
      usuario_cuenta: cuenta?.usuario_cuenta ?? "",
      nombre_cuenta: cuenta?.nombre_cuenta ?? "",
      sede_id: cuenta?.sede_id ?? 0,
      campaign_id: cuenta?.campaign_id ?? null,
      isla: cuenta?.isla ?? "",
      perfil: cuenta?.perfil ?? "",
      ou_ad: cuenta?.ou_ad ?? "",
      estado: (cuenta?.estado as "activa" | "suspendida" | "baja") ?? "activa",
    },
  });

  const sistemaId = form.watch("sistema_id");
  const sistemaSelected = sistemas.find((s) => s.id === sistemaId);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: CreateCuentaPayload = {
      sistema_id: values.sistema_id,
      usuario_cuenta: values.usuario_cuenta.trim(),
      nombre_cuenta: values.nombre_cuenta.trim(),
      sede_id: values.sede_id,
      campaign_id: values.campaign_id ?? null,
      isla: values.isla?.trim() || null,
      perfil: values.perfil?.trim() || null,
      ou_ad: values.ou_ad?.trim() || null,
      estado: values.estado,
    };
    await onSubmit(payload);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cuenta genérica" : "Nueva cuenta genérica"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifica los datos de la cuenta." : "Completa los datos para registrar la cuenta."}
          </DialogDescription>
        </DialogHeader>

        {sistemaSelected && (sistemaSelected.es_externo || sistemaSelected.slug?.toLowerCase() === "ahevaa") && (
          <div className={cn("flex gap-3 rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 text-sm")}>
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-200">
              Sistema externo (Ahevaa). Verifica permisos y contacto externo antes de asignar esta cuenta.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="sistema_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sistema</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ""}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sistema" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sistemas.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} {s.es_externo ? "(externo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="usuario_cuenta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario / Cuenta</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: neotel_camp1" disabled={isEdit} />
                    </FormControl>
                    <FormDescription className="text-xs">Identificador en el sistema (no editable tras crear)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nombre_cuenta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de cuenta</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre descriptivo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sede_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sedes.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="campaign_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaña (opcional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "" ? null : Number(v))}
                    value={field.value != null ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguna" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Ninguna</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Isla (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Ej: Isla 2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="perfil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Ej: Agente" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ou_ad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OU AD (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Unidad organizativa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="suspendida">Suspendida</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
