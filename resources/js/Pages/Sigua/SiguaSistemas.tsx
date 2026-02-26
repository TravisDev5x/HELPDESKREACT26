import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  getSistemas,
  createSistema,
  updateSistema,
  deleteSistema,
  type CreateSistemaPayload,
  type UpdateSistemaPayload,
} from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { Sistema } from "@/types/sigua";
import { AlertTriangle, Pencil, Trash2, Plus, Loader2, Server } from "lucide-react";

const CAMPOS_MAPEO_PLACEHOLDER = '{\n  "columna_archivo": "campo_bd",\n  "Nombre": "nombre_cuenta",\n  "Usuario": "usuario_cuenta"\n}';

function parseJsonSafe(str: string): Record<string, string> | null {
  try {
    const v = JSON.parse(str);
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export default function SiguaSistemas() {
  const { can } = useAuth();
  const canManage = can("sigua.cuentas.manage") || can("sigua.importar");

  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sistema | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Sistema | null>(null);

  const [form, setForm] = useState<CreateSistemaPayload>({
    name: "",
    slug: "",
    description: null,
    es_externo: false,
    contacto_externo: null,
    campos_mapeo: null,
    campo_id_empleado: null,
    regex_id_empleado: null,
    activo: true,
    icono: null,
    color: null,
    orden: undefined,
  });
  const [camposMapeoRaw, setCamposMapeoRaw] = useState("");

  const fetchSistemas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getSistemas();
    if (res.error) {
      setError(res.error);
      setSistemas([]);
    } else {
      setSistemas(res.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSistemas();
  }, [fetchSistemas]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      description: null,
      es_externo: false,
      contacto_externo: null,
      campos_mapeo: null,
      campo_id_empleado: null,
      regex_id_empleado: null,
      activo: true,
      icono: null,
      color: null,
      orden: undefined,
    });
    setCamposMapeoRaw("");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((s: Sistema) => {
    setEditing(s);
    setForm({
      name: s.name,
      slug: s.slug,
      description: s.description ?? null,
      es_externo: s.es_externo ?? false,
      contacto_externo: s.contacto_externo ?? null,
      campos_mapeo: s.campos_mapeo ?? null,
      campo_id_empleado: s.campo_id_empleado ?? null,
      regex_id_empleado: s.regex_id_empleado ?? null,
      activo: s.activo !== false,
      icono: s.icono ?? null,
      color: s.color ?? null,
      orden: s.orden,
    });
    setCamposMapeoRaw(
      s.campos_mapeo && Object.keys(s.campos_mapeo).length > 0 ? JSON.stringify(s.campos_mapeo, null, 2) : ""
    );
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    const mapeo = camposMapeoRaw.trim() ? parseJsonSafe(camposMapeoRaw) : null;
    if (camposMapeoRaw.trim() && !mapeo) {
      notify.error("campos_mapeo debe ser un JSON válido (objeto clave-valor).");
      return;
    }
    const payload: CreateSistemaPayload & UpdateSistemaPayload = {
      ...form,
      campos_mapeo: mapeo ?? undefined,
    };
    setSaving(true);
    if (editing) {
      const res = await updateSistema(editing.id, payload);
      setSaving(false);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success("Sistema actualizado.");
    } else {
      const res = await createSistema(payload);
      setSaving(false);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success("Sistema creado.");
    }
    setFormOpen(false);
    fetchSistemas();
  }, [form, camposMapeoRaw, editing, fetchSistemas]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const res = await deleteSistema(deleteConfirm.id);
    setDeleteConfirm(null);
    if (res.error) notify.error(res.error);
    else {
      notify.success("Sistema eliminado.");
      fetchSistemas();
    }
  }, [deleteConfirm, fetchSistemas]);

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Sistemas" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sistemas</h1>
            <p className="text-sm text-muted-foreground">CRUD de sistemas y mapeo de columnas para importación</p>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo sistema
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        {loading ? (
          <div className="p-6">Cargando…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Externo</TableHead>
                <TableHead>Mapeo</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sistemas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No hay sistemas.
                  </TableCell>
                </TableRow>
              ) : (
                sistemas.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-sm">{s.slug}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={s.activo !== false ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted"}>
                        {s.activo !== false ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.es_externo ? "Sí" : "No"}</TableCell>
                    <TableCell>
                      {s.campos_mapeo && Object.keys(s.campos_mapeo).length > 0 ? (
                        <Badge variant="secondary">{Object.keys(s.campos_mapeo).length} campos</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => setDeleteConfirm(s)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sistema" : "Nuevo sistema"}</DialogTitle>
            <DialogDescription>Nombre, slug y mapeo de columnas para importación.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Neotel Isla 2" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="neotel_isla2" disabled={!!editing} />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} placeholder="Opcional" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.activo !== false} onCheckedChange={(c) => setForm((f) => ({ ...f, activo: c }))} />
              <Label>Sistema activo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.es_externo ?? false} onCheckedChange={(c) => setForm((f) => ({ ...f, es_externo: c }))} />
              <Label>Es externo</Label>
            </div>
            <div>
              <Label>campos_mapeo (JSON)</Label>
              <Textarea
                value={camposMapeoRaw}
                onChange={(e) => setCamposMapeoRaw(e.target.value)}
                placeholder={CAMPOS_MAPEO_PLACEHOLDER}
                className="font-mono text-xs min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">Objeto: clave = nombre columna en archivo, valor = campo en BD.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campo ID empleado</Label>
                <Input value={form.campo_id_empleado ?? ""} onChange={(e) => setForm((f) => ({ ...f, campo_id_empleado: e.target.value || null }))} placeholder="num_empleado" />
              </div>
              <div>
                <Label>Regex ID empleado</Label>
                <Input value={form.regex_id_empleado ?? ""} onChange={(e) => setForm((f) => ({ ...f, regex_id_empleado: e.target.value || null }))} placeholder="Opcional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar sistema</DialogTitle>
            <DialogDescription>¿Eliminar el sistema &quot;{deleteConfirm?.name}&quot;? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
