import { useState, useCallback, useEffect } from "react";
import {
  getCuentas,
  getCuenta,
  createCuenta,
  updateCuenta,
  deleteCuenta,
} from "@/services/siguaApi";
import type { CuentaGenerica, SiguaFilters } from "@/types/sigua";
import type { CreateCuentaPayload, UpdateCuentaPayload } from "@/services/siguaApi";

export interface SiguaMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UseCuentasGenericasReturn {
  data: CuentaGenerica[];
  meta: SiguaMeta | null;
  loading: boolean;
  error: string | null;
  refetch: (page?: number) => Promise<void>;
  create: (payload: CreateCuentaPayload) => Promise<{ data: CuentaGenerica | null; error: string | null }>;
  update: (id: number, payload: UpdateCuentaPayload) => Promise<{ data: CuentaGenerica | null; error: string | null }>;
  remove: (id: number) => Promise<{ error: string | null }>;
  getOne: (id: number) => Promise<{ data: CuentaGenerica | null; error: string | null }>;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

export function useCuentasGenericas(filters?: SiguaFilters | null) {
  const [data, setData] = useState<CuentaGenerica[]>([]);
  const [meta, setMeta] = useState<SiguaMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(
    async (pageNum?: number) => {
      const p = pageNum ?? page;
      setLoading(true);
      setError(null);
      const result = await getCuentas(filters ?? undefined, p);
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
    [
      filters?.sede_id,
      filters?.sistema_id,
      filters?.estado,
      filters?.campaign_id,
      filters?.search,
      filters?.tipo,
      page,
    ]
  );

  useEffect(() => {
    refetch(1);
  }, [filters?.sede_id, filters?.sistema_id, filters?.estado, filters?.campaign_id, filters?.search, filters?.tipo]);

  const create = useCallback(
    async (payload: CreateCuentaPayload) => {
      setCreating(true);
      const result = await createCuenta(payload);
      setCreating(false);
      if (!result.error) await refetch(1);
      return { data: result.data, error: result.error };
    },
    [refetch]
  );

  const update = useCallback(
    async (id: number, payload: UpdateCuentaPayload) => {
      setUpdating(true);
      const result = await updateCuenta(id, payload);
      setUpdating(false);
      if (!result.error) await refetch(page);
      return { data: result.data, error: result.error };
    },
    [refetch, page]
  );

  const remove = useCallback(
    async (id: number) => {
      setDeleting(true);
      const result = await deleteCuenta(id);
      setDeleting(false);
      if (!result.error) await refetch(page);
      return { error: result.error };
    },
    [refetch, page]
  );

  const getOne = useCallback(async (id: number) => {
    return getCuenta(id);
  }, []);

  return {
    data,
    meta,
    loading,
    error,
    refetch: (p?: number) => refetch(p ?? page),
    create,
    update,
    remove,
    getOne,
    creating,
    updating,
    deleting,
  };
}
