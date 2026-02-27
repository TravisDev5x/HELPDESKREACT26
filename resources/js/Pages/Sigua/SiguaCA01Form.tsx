import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCuentas, getCA01s } from "@/services/siguaApi";
import type { CuentaGenerica, FormatoCA01, Sistema } from "@/types/sigua";
import type { CreateCA01Payload } from "@/services/siguaApi";

const formSchema = z.object({
  gerente_user_id: z.number({ required_error: "Selecciona un gerente" }),
  campaign_id: z.number({ required_error: "Selecciona campaña" }),
  sede_id: z.number({ required_error: "Selecciona sede" }),
  sistema_id: z.number({ required_error: "Selecciona sistema" }),
  fecha_firma: z.string().min(1, "Fecha de firma requerida"),
  observaciones: z.string().max(1000).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export interface SiguaCA01FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCA01Payload) => Promise<void>;
  onCancel: () => void;
  sistemas: Sistema[];
  sedes: Array<{ id: number; name: string }>;
  campaigns: Array<{ id: number; name: string }>;
  users: Array<{ id: number; name: string }>;
  isSubmitting?: boolean;
}

export function SiguaCA01Form({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  sistemas,
  sedes,
  campaigns,
  users,
  isSubmitting = false,
}: SiguaCA01FormProps) {
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaGenerica[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [justificaciones, setJustificaciones] = useState<Record<number, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [vigenteExistente, setVigenteExistente] = useState<boolean>(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gerente_user_id: 0,
      campaign_id: 0,
      sede_id: 0,
      sistema_id: 0,
      fecha_firma: "",
      observaciones: "",
    },
  });

  const sedeId = form.watch("sede_id");
  const sistemaId = form.watch("sistema_id");
  const gerenteId = form.watch("gerente_user_id");
  const campaignId = form.watch("campaign_id");

  useEffect(() => {
    if (!sedeId || !sistemaId || !open) {
      setCuentasDisponibles([]);
      setSelectedIds(new Set());
      return;
    }
    setLoadingCuentas(true);
    getCuentas({ sede_id: sedeId, sistema_id: sistemaId, estado: "activa" }, 1).then((res) => {
      const list = res.data && "data" in res.data ? (res.data as { data: CuentaGenerica[] }).data : [];
      setCuentasDisponibles(Array.isArray(list) ? list : []);
      setSelectedIds(new Set());
      setJustificaciones({});
      setLoadingCuentas(false);
    }).catch(() => setLoadingCuentas(false));
  }, [sedeId, sistemaId, open]);

  useEffect(() => {
    if (!sedeId || !sistemaId || !open) {
      setVigenteExistente(false);
      return;
    }
    getCA01s({ sede_id: sedeId, sistema_id: sistemaId, estado: "vigente" }, 1).then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      const mismoGerenteCampana = gerenteId && campaignId
        ? list.some((c) => c.gerente_user_id === gerenteId && c.campaign_id === campaignId)
        : false;
      setVigenteExistente(mismoGerenteCampana);
    });
  }, [sedeId, sistemaId, gerenteId, campaignId, open]);

  const toggleCuenta = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedCuentas = useMemo(() => cuentasDisponibles.filter((c) => selectedIds.has(c.id)), [cuentasDisponibles, selectedIds]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (selectedIds.size === 0) {
      form.setError("sistema_id", { message: "Selecciona al menos una cuenta" });
      return;
    }
    const payload: CreateCA01Payload = {
      gerente_user_id: values.gerente_user_id,
      campaign_id: values.campaign_id,
      sede_id: values.sede_id,
      sistema_id: values.sistema_id,
      fecha_firma: values.fecha_firma,
      cuentas: Array.from(selectedIds).map((cuenta_generica_id) => ({
        cuenta_generica_id,
        justificacion: justificaciones[cuenta_generica_id]?.trim() || null,
      })),
      observaciones: values.observaciones?.trim() || null,
    };
    await onSubmit(payload);
    onOpenChange(false);
  });

  const canPreview = form.formState.isValid && selectedIds.size > 0 && sedeId && sistemaId && gerenteId && campaignId && form.getValues("fecha_firma");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo CA-01</DialogTitle>
          <DialogDescription>
            Selecciona gerente, campaña, sede, sistema y las cuentas que cubre este formato.
          </DialogDescription>
        </DialogHeader>

        {vigenteExistente && (
          <div className={cn("flex gap-3 rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 text-sm")}>
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-200">
              Ya existe un CA-01 vigente para la misma combinación gerente, campaña, sede y sistema. El backend puede rechazar el registro.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gerente_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerente</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar gerente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
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
                    <FormLabel>Campaña</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar campaña" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                name="sistema_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sistema</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sistema" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sistemas.map((s) => (
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
                name="fecha_firma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de firma</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Texto libre" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label className="text-sm font-medium">Cuentas a incluir (sede + sistema)</Label>
              {loadingCuentas ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas…
                </div>
              ) : !sedeId || !sistemaId ? (
                <p className="text-sm text-muted-foreground py-2">Selecciona sede y sistema para cargar la lista.</p>
              ) : cuentasDisponibles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No hay cuentas activas para esta sede y sistema.</p>
              ) : (
                <div className="border rounded-md max-h-[220px] overflow-auto mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-10">Incluir</TableHead>
                        <TableHead>Usuario / Nombre</TableHead>
                        <TableHead>Justificación (opcional)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentasDisponibles.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(c.id)}
                              onCheckedChange={() => toggleCuenta(c.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{c.usuario_cuenta}</span>
                            <span className="text-muted-foreground text-xs block">{c.nombre_cuenta}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs"
                              placeholder="Opcional"
                              value={justificaciones[c.id] ?? ""}
                              onChange={(e) => setJustificaciones((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              disabled={!selectedIds.has(c.id)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {selectedIds.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedIds.size} cuenta(s) seleccionada(s)</p>
              )}
            </div>

            {showPreview && canPreview && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-sm font-medium">Vista previa</p>
                <p className="text-xs text-muted-foreground">
                  Gerente: {users.find((u) => u.id === gerenteId)?.name} · Campaña: {campaigns.find((c) => c.id === campaignId)?.name} · Sede: {sedes.find((s) => s.id === sedeId)?.name} · Sistema: {sistemas.find((s) => s.id === sistemaId)?.name}
                </p>
                <p className="text-xs text-muted-foreground">Firma: {form.getValues("fecha_firma")} · Cuentas: {selectedIds.size}</p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                disabled={!canPreview}
              >
                {showPreview ? "Ocultar preview" : "Vista previa"}
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedIds.size === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear CA-01
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
