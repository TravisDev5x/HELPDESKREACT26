import { useState, useCallback, useEffect } from "react";
import {
  getIncidentes,
  getIncidente,
  createIncidente,
  updateIncidente,
  investigarIncidente,
  resolverIncidente,
  escalarIncidente,
} from "@/services/siguaApi";
import type { Incidente, SiguaFilters } from "@/types/sigua";
import type {
  CreateIncidentePayload,
  InvestigarIncidentePayload,
  ResolverIncidentePayload,
} from "@/services/siguaApi";

export interface SiguaMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UseIncidentesReturn {
  data: Incidente[];
  meta: SiguaMeta | null;
  loading: boolean;
  error: string | null;
  refetch: (page?: number) => Promise<void>;
  create: (payload: CreateIncidentePayload) => Promise<{ data: Incidente | null; error: string | null }>;
  update: (id: number, payload: Partial<{ estado: string; asignado_a: number | null; resolucion: string; agente_identificado: string | null }>) => Promise<{ data: Incidente | null; error: string | null }>;
  investigar: (id: number, payload: InvestigarIncidentePayload) => Promise<{ data: Incidente | null; error: string | null }>;
  resolver: (id: number, payload: ResolverIncidentePayload) => Promise<{ data: Incidente | null; error: string | null }>;
  escalar: (id: number) => Promise<{ data: Incidente | null; error: string | null }>;
  getOne: (id: number) => Promise<{ data: Incidente | null; error: string | null }>;
  mutating: boolean;
}

export function useIncidentes(filters?: SiguaFilters | null): UseIncidentesReturn {
  const [data, setData] = useState<Incidente[]>([]);
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
      const result = await getIncidentes(filters ?? undefined, p);
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
    [filters?.estado, filters?.sistema_id, filters?.cuenta_generica_id, page]
  );

  useEffect(() => {
    refetch(1);
  }, [filters?.estado, filters?.sistema_id]);

  const create = useCallback(
    async (payload: CreateIncidentePayload) => {
      setMutating(true);
      const result = await createIncidente(payload);
      setMutating(false);
      if (!result.error) await refetch(1);
      return { data: result.data, error: result.error };
    },
    [refetch]
  );

  const update = useCallback(
    async (id: number, payload: Partial<{ estado: string; asignado_a: number | null; resolucion: string; agente_identificado: string | null }>) => {
      setMutating(true);
      const result = await updateIncidente(id, payload);
      setMutating(false);
      if (!result.error) await refetch(page);
      return { data: result.data, error: result.error };
    },
    [refetch, page]
  );

  const investigar = useCallback(
    async (id: number, payload: InvestigarIncidentePayload) => {
      setMutating(true);
      const result = await investigarIncidente(id, payload);
      setMutating(false);
      if (!result.error) await refetch(page);
      return { data: result.data, error: result.error };
    },
    [refetch, page]
  );

  const resolver = useCallback(
    async (id: number, payload: ResolverIncidentePayload) => {
      setMutating(true);
      const result = await resolverIncidente(id, payload);
      setMutating(false);
      if (!result.error) await refetch(page);
      return { data: result.data, error: result.error };
    },
    [refetch, page]
  );

  const escalar = useCallback(
    async (id: number) => {
      setMutating(true);
      const result = await escalarIncidente(id);
      setMutating(false);
      if (!result.error) await refetch(page);
      return { data: result.data, error: result.error };
    },
    [refetch, page]
  );

  const getOne = useCallback((id: number) => getIncidente(id), []);

  return {
    data,
    meta,
    loading,
    error,
    refetch: (p?: number) => refetch(p ?? page),
    create,
    update,
    investigar,
    resolver,
    escalar,
    getOne,
    mutating,
  };
}
