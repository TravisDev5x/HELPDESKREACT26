import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getConfiguracion, updateConfiguracion } from "@/services/siguaApi";
import { SiguaBreadcrumbs } from "@/components/SiguaBreadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import type { Configuracion } from "@/types/sigua";
import { AlertTriangle, Loader2, Save, Settings } from "lucide-react";

export default function SiguaConfiguracion() {
  const { can } = useAuth();
  const canManage = can("sigua.cuentas.manage") || can("sigua.importar");

  const [items, setItems] = useState<Configuracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string | number | boolean>>({});

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getConfiguracion();
    if (res.error) {
      setError(res.error);
      setItems([]);
    } else {
      const list = res.data ?? [];
      setItems(list);
      const vals: Record<string, string | number | boolean> = {};
      list.forEach((c) => {
        if (c.tipo === "bool") vals[c.clave] = c.valor === "1" || c.valor === "true";
        else if (c.tipo === "int") vals[c.clave] = parseInt(String(c.valor ?? "0"), 10);
        else vals[c.clave] = String(c.valor ?? "");
      });
      setLocalValues(vals);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const setValue = useCallback((clave: string, value: string | number | boolean) => {
    setLocalValues((prev) => ({ ...prev, [clave]: value }));
  }, []);

  const handleSave = useCallback(async (c: Configuracion) => {
    const raw = localValues[c.clave];
    let valor: string | number | boolean | Record<string, unknown> | null = null;
    if (c.tipo === "bool") valor = Boolean(raw);
    else if (c.tipo === "int") valor = Number(raw);
    else if (c.tipo === "json") valor = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
    else valor = String(raw ?? "");
    setSavingKey(c.clave);
    const res = await updateConfiguracion(c.clave, valor);
    setSavingKey(null);
    if (res.error) notify.error(res.error);
    else {
      notify.success("Parámetro actualizado.");
      fetchConfig();
    }
  }, [localValues, fetchConfig]);

  if (!canManage && !can("sigua.dashboard")) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-center text-muted-foreground">No tienes permiso para ver la configuración SIGUA.</p>
          <Button asChild variant="outline"><Link to="/sigua">Volver a SIGUA</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <SiguaBreadcrumbs items={[{ label: "Configuración" }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración SIGUA</h1>
          <p className="text-sm text-muted-foreground">Parámetros del módulo</p>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Settings className="h-10 w-10 mx-auto mb-2 opacity-50" />
            No hay parámetros de configuración.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((c) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="font-mono text-sm">{c.clave}</Label>
                  {c.descripcion && <p className="text-xs text-muted-foreground mt-0.5">{c.descripcion}</p>}
                </div>
                <div className="flex items-center gap-2 sm:w-72">
                  {c.tipo === "bool" ? (
                    <Switch
                      checked={Boolean(localValues[c.clave])}
                      onCheckedChange={(v) => setValue(c.clave, v)}
                      disabled={!canManage}
                    />
                  ) : (
                    <Input
                      type={c.tipo === "int" ? "number" : "text"}
                      value={String(localValues[c.clave] ?? "")}
                      onChange={(e) => setValue(c.clave, c.tipo === "int" ? e.target.valueAsNumber : e.target.value)}
                      disabled={!canManage}
                      className="font-mono"
                    />
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(c)}
                      disabled={savingKey === c.clave}
                    >
                      {savingKey === c.clave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
