import { useState, useCallback, useEffect } from "react";
import { importarArchivo, getHistorialImportaciones } from "@/services/siguaApi";
import type { Importacion, TipoImportacion } from "@/types/sigua";

export interface SiguaMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UseImportacionesReturn {
  historial: Importacion[];
  meta: SiguaMeta | null;
  loading: boolean;
  error: string | null;
  refetchHistorial: (page?: number) => Promise<void>;
  importar: (file: File, tipo: TipoImportacion, sistemaId?: number) => Promise<{ data: Importacion | null; error: string | null }>;
  importing: boolean;
}

export function useImportaciones(params?: { tipo?: string; per_page?: number }): UseImportacionesReturn {
  const [historial, setHistorial] = useState<Importacion[]>([]);
  const [meta, setMeta] = useState<SiguaMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const refetchHistorial = useCallback(async (page?: number) => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await getHistorialImportaciones({
      ...params,
      per_page: params?.per_page ?? 15,
      ...(page != null && { page }),
    });
    if (err) {
      setError(err);
      setHistorial([]);
      setMeta(null);
    } else {
      const body = res as { data: Importacion[]; meta?: SiguaMeta };
      setHistorial(Array.isArray(body?.data) ? body.data : []);
      setMeta(body?.meta ?? null);
    }
    setLoading(false);
  }, [params?.tipo, params?.per_page]);

  useEffect(() => {
    refetchHistorial(1);
  }, [params?.tipo]);

  const importar = useCallback(
    async (file: File, tipo: TipoImportacion, sistemaId?: number) => {
      setImporting(true);
      const result = await importarArchivo(file, tipo, sistemaId);
      setImporting(false);
      if (!result.error) await refetchHistorial(1);
      return { data: result.data, error: result.error };
    },
    [refetchHistorial]
  );

  return {
    historial,
    meta,
    loading,
    error,
    refetchHistorial,
    importar,
    importing,
  };
}
