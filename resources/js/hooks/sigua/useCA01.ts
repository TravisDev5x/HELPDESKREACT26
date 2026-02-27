import { useState, useCallback, useEffect } from "react";
import {
  getCA01s,
  getCA01,
  createCA01,
  updateCA01,
  renovarCA01,
} from "@/services/siguaApi";
import type { FormatoCA01, SiguaFilters } from "@/types/sigua";
import type { CreateCA01Payload, UpdateCA01Payload } from "@/services/siguaApi";

export interface SiguaMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UseCA01Return {
  data: FormatoCA01[];
  meta: SiguaMeta | null;
  loading: boolean;
  error: string | null;
  refetch: (page?: number) => Promise<void>;
  create: (payload: CreateCA01Payload) => Promise<{ data: FormatoCA01 | null; error: string | null }>;
  update: (id: number, payload: UpdateCA01Payload) => Promise<{ data: FormatoCA01 | null; error: string | null }>;
  renovar: (id: number, data?: { fecha_firma?: string }) => Promise<{ data: FormatoCA01 | null; error: string | null }>;
  getOne: (id: number) => Promise<{ data: FormatoCA01 | null; error: string | null }>;
  mutating: boolean;
}

export function useCA01(filters?: SiguaFilters | null): UseCA01Return {
  const [data, setData] = useState<FormatoCA01[]>([]);
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
      const result = await getCA01s(filters ?? undefined, p);
      if (result.error) {
        setError(result.error);
        setData([]);
        setMeta(null);
      } else {
        setData(Array.isArray(result.data) ? result.data : []);
        setMeta(result.meta ?? null);
        if (pageNum != null) setPage(pageNum);
      }
      setLoading(false);
    },
    [filters?.sede_id, filters?.sistema_id, filters?.estado, filters?.gerente_user_id, page]
  );

  useEffect(() => {
    refetch(1);
  }, [filters?.sede_id, filters?.sistema_id, filters?.estado, filters?.gerente_user_id]);

  const create = useCallback(
    async (payload: CreateCA01Payload) => {
      setMutating(true);
      const result = await createCA01(payload);
      setMutating(false);
      if (!result.error) await refetch(1);
      return { data: result.data, error: result.error };
    },
    [refetch]
  );

  const update = useCallback(
    async (id: number, payload: UpdateCA01Payload) => {
      setMutating(true);
      const result = await updateCA01(id, payload);
      setMutating(false);
      if (!result.error) await refetch(page);
      return { data: result.data, error: result.error };
    },
    [refetch, page]
  );

  const renovar = useCallback(
    async (id: number, payload?: { fecha_firma?: string }) => {
      setMutating(true);
      const result = await renovarCA01(id, payload);
      setMutating(false);
      if (!result.error) await refetch(1);
      return { data: result.data, error: result.error };
    },
    [refetch]
  );

  const getOne = useCallback(async (id: number) => getCA01(id), []);

  return {
    data,
    meta,
    loading,
    error,
    refetch: (p?: number) => refetch(p ?? page),
    create,
    update,
    renovar,
    getOne,
    mutating,
  };
}
