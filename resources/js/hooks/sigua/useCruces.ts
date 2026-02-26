import { useState, useCallback, useEffect } from "react";
import { ejecutarCruce, getHistorialCruces, getDetalleCruce } from "@/services/siguaApi";
import type { Cruce } from "@/types/sigua";
import type { EjecutarCrucePayload } from "@/services/siguaApi";

export interface SiguaMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UseCrucesReturn {
  historial: Cruce[];
  meta: SiguaMeta | null;
  loading: boolean;
  error: string | null;
  refetchHistorial: (page?: number) => Promise<void>;
  ejecutar: (payload?: EjecutarCrucePayload) => Promise<{ data: Cruce | null; error: string | null }>;
  getDetalle: (id: number) => Promise<{ data: Cruce | null; error: string | null }>;
  executing: boolean;
}

export function useCruces(params?: { tipo_cruce?: string; per_page?: number }): UseCrucesReturn {
  const [historial, setHistorial] = useState<Cruce[]>([]);
  const [meta, setMeta] = useState<SiguaMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const refetchHistorial = useCallback(async (pageNum?: number) => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await getHistorialCruces({
      ...params,
      per_page: params?.per_page ?? 15,
      ...(pageNum != null && { page: pageNum }),
    });
    if (err) {
      setError(err);
      setHistorial([]);
      setMeta(null);
    } else {
      const body = res as { data: Cruce[]; meta?: SiguaMeta };
      setHistorial(Array.isArray(body?.data) ? body.data : []);
      setMeta(body?.meta ?? null);
    }
    setLoading(false);
  }, [params?.tipo_cruce, params?.per_page]);

  useEffect(() => {
    refetchHistorial(1);
  }, [params?.tipo_cruce]);

  const ejecutar = useCallback(
    async (payload?: EjecutarCrucePayload) => {
      setExecuting(true);
      const result = await ejecutarCruce(payload);
      setExecuting(false);
      if (!result.error) await refetchHistorial(1);
      return { data: result.data, error: result.error };
    },
    [refetchHistorial]
  );

  const getDetalle = useCallback((id: number) => getDetalleCruce(id), []);

  return {
    historial,
    meta,
    loading,
    error,
    refetchHistorial,
    ejecutar,
    getDetalle,
    executing,
  };
}
