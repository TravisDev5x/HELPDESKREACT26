import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { SiguaFilters } from "@/types/sigua";

const DEFAULT_FILTERS: SiguaFilters = {
  sede_id: null,
  sistema_id: null,
  fecha_desde: null,
  fecha_hasta: null,
  estado: null,
  campaign_id: null,
  search: null,
  turno: null,
  fecha: null,
  per_page: 15,
};

const PARAM_KEYS = [
  "sede_id",
  "sistema_id",
  "fecha_desde",
  "fecha_hasta",
  "estado",
  "campaign_id",
  "search",
  "turno",
  "fecha",
  "per_page",
] as const;

function parseFiltersFromSearchParams(searchParams: URLSearchParams): SiguaFilters {
  const filters: SiguaFilters = { ...DEFAULT_FILTERS };
  PARAM_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value == null || value === "") return;
    if (key === "per_page") {
      const n = parseInt(value, 10);
      if (!Number.isNaN(n)) filters.per_page = n;
      return;
    }
    if (key === "sede_id" || key === "sistema_id" || key === "campaign_id") {
      const n = parseInt(value, 10);
      filters[key] = Number.isNaN(n) ? value : n;
      return;
    }
    (filters as Record<string, unknown>)[key] = value;
  });
  return filters;
}

function filtersToSearchParams(filters: SiguaFilters): URLSearchParams {
  const params = new URLSearchParams();
  (PARAM_KEYS as readonly string[]).forEach((key) => {
    const value = (filters as Record<string, unknown>)[key];
    if (value == null || value === "") return;
    params.set(key, String(value));
  });
  return params;
}

export interface UseSiguaFiltersOptions {
  /** Si es true, sincroniza filtros con la URL (query string). Default true cuando hay Router. */
  syncUrl?: boolean;
}

export interface UseSiguaFiltersReturn {
  filters: SiguaFilters;
  setFilters: (f: SiguaFilters | ((prev: SiguaFilters) => SiguaFilters)) => void;
  setFilter: <K extends keyof SiguaFilters>(key: K, value: SiguaFilters[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Estado compartido de filtros SIGUA con sincronización opcional a URL.
 * Usar dentro de un Router para syncUrl (useSearchParams).
 */
export function useSiguaFilters(
  initialFilters?: Partial<SiguaFilters> | null,
  options: UseSiguaFiltersOptions = {}
): UseSiguaFiltersReturn {
  const { syncUrl = true } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFiltersState] = useState<SiguaFilters>(() => {
    const fromUrl = syncUrl ? parseFiltersFromSearchParams(searchParams) : {};
    return { ...DEFAULT_FILTERS, ...initialFilters, ...fromUrl };
  });

  // Sincronizar URL -> state cuando cambie la URL (ej. navegación atrás)
  useEffect(() => {
    if (!syncUrl) return;
    const fromUrl = parseFiltersFromSearchParams(searchParams);
    const hasAny = PARAM_KEYS.some((k) => searchParams.has(k));
    if (hasAny) {
      setFiltersState((prev) => ({ ...prev, ...fromUrl }));
    }
  }, [searchParams, syncUrl]);

  const setFilters = useCallback(
    (arg: SiguaFilters | ((prev: SiguaFilters) => SiguaFilters)) => {
      setFiltersState((prev) => {
        const next = typeof arg === "function" ? arg(prev) : arg;
        if (syncUrl) {
          const params = filtersToSearchParams(next);
          setSearchParams(params, { replace: true });
        }
        return next;
      });
    },
    [syncUrl, setSearchParams]
  );

  const setFilter = useCallback(
    <K extends keyof SiguaFilters>(key: K, value: SiguaFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  const resetFilters = useCallback(() => {
    const next = { ...DEFAULT_FILTERS, ...initialFilters };
    setFiltersState(next);
    if (syncUrl) setSearchParams(new URLSearchParams(), { replace: true });
  }, [initialFilters, syncUrl, setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.sede_id != null && filters.sede_id !== "") ||
      (filters.sistema_id != null && filters.sistema_id !== "") ||
      (filters.fecha_desde != null && filters.fecha_desde !== "") ||
      (filters.fecha_hasta != null && filters.fecha_hasta !== "") ||
      (filters.estado != null && filters.estado !== "") ||
      (filters.campaign_id != null && filters.campaign_id !== "") ||
      (filters.search != null && filters.search !== "") ||
      (filters.turno != null && filters.turno !== "") ||
      (filters.fecha != null && filters.fecha !== "")
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    setFilter,
    resetFilters,
    hasActiveFilters,
  };
}
