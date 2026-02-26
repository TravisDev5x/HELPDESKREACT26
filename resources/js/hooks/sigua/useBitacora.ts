import { useState, useCallback, useEffect } from "react";
import {
  getBitacora,
  getBitacoraHoy,
  getBitacoraPorSede,
  registrarBitacora,
  registrarBitacoraBulk,
  registrarSinUso,
} from "@/services/siguaApi";
import type { RegistroBitacora, SiguaFilters } from "@/types/sigua";
import type { RegistroBitacoraPayload, SinUsoPayload } from "@/services/siguaApi";

export interface SiguaMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UseBitacoraReturn {
  data: RegistroBitacora[];
  meta: SiguaMeta | null;
  loading: boolean;
  error: string | null;
  refetch: (page?: number) => Promise<void>;
  registrar: (payload: RegistroBitacoraPayload) => Promise<{ data: RegistroBitacora | null; error: string | null }>;
  registrarBulk: (registros: RegistroBitacoraPayload[]) => Promise<{ data: RegistroBitacora[] | null; error: string | null }>;
  registrarSinUso: (payload: SinUsoPayload) => Promise<{ error: string | null }>;
  mutating: boolean;
}

export function useBitacora(filters?: SiguaFilters | null): UseBitacoraReturn {
  const [data, setData] = useState<RegistroBitacora[]>([]);
  const [meta, setMeta] = useState<SiguaMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [mutating, setMutating] = useState(false);

  const refetch = useCallback(
    async (pageNum?: number) => {
      const p = pageNum ?? page;
      setLoading(true);
      setError(null);
      const { data: res, error: err } = await getBitacora(filters ?? undefined, p);
      if (err) {
        setError(err);
        setData([]);
        setMeta(null);
      } else {
        const body = res as { data: RegistroBitacora[]; meta?: SiguaMeta };
        setData(Array.isArray(body?.data) ? body.data : []);
        setMeta(body?.meta ?? null);
        if (pageNum != null) setPage(pageNum);
      }
      setLoading(false);
    },
    [
      filters?.fecha,
      filters?.fecha_desde,
      filters?.fecha_hasta,
      filters?.sede_id,
      filters?.sistema_id,
      filters?.turno,
      filters?.campaign_id,
      page,
    ]
  );

  useEffect(() => {
    refetch(1);
  }, [filters?.fecha, filters?.fecha_desde, filters?.fecha_hasta, filters?.sede_id, filters?.sistema_id, filters?.turno, filters?.campaign_id]);

  const registrar = useCallback(
    async (payload: RegistroBitacoraPayload) => {
      setMutating(true);
      const result = await registrarBitacora(payload);
      setMutating(false);
      if (!result.error) await refetch(1);
      return { data: result.data, error: result.error };
    },
    [refetch]
  );

  const registrarBulk = useCallback(
    async (registros: RegistroBitacoraPayload[]) => {
      setMutating(true);
      const result = await registrarBitacoraBulk(registros);
      setMutating(false);
      if (!result.error) await refetch(1);
      return { data: result.data ?? null, error: result.error };
    },
    [refetch]
  );

  const registrarSinUsoHandler = useCallback(
    async (payload: SinUsoPayload) => {
      setMutating(true);
      const result = await registrarSinUso(payload);
      setMutating(false);
      if (!result.error) await refetch(1);
      return { error: result.error };
    },
    [refetch]
  );

  return {
    data,
    meta,
    loading,
    error,
    refetch: (p?: number) => refetch(p ?? page),
    registrar,
    registrarBulk,
    registrarSinUso: registrarSinUsoHandler,
    mutating,
  };
}

/** Hook solo para bitácora de hoy (sin paginación). */
export function useBitacoraHoy() {
  const [data, setData] = useState<RegistroBitacora[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await getBitacoraHoy();
    if (err) {
      setError(err);
      setData([]);
    } else {
      setData(Array.isArray(res) ? res : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/** Hook para bitácora por sede. */
export function useBitacoraPorSede(sedeId: number | null) {
  const [data, setData] = useState<RegistroBitacora[]>([]);
  const [meta, setMeta] = useState<SiguaMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (sedeId == null) {
      setData([]);
      setMeta(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await getBitacoraPorSede(sedeId);
    if (err) {
      setError(err);
      setData([]);
      setMeta(null);
    } else {
      const body = res as { data: RegistroBitacora[]; meta?: SiguaMeta };
      setData(Array.isArray(body?.data) ? body.data : []);
      setMeta(body?.meta ?? null);
    }
    setLoading(false);
  }, [sedeId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, meta, loading, error, refetch };
}
