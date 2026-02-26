import { useState, useCallback, useEffect } from "react";
import { getDashboard } from "@/services/siguaApi";
import type { SiguaDashboardData, SiguaFilters } from "@/types/sigua";

export interface UseSiguaDashboardReturn {
  data: SiguaDashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch dashboard SIGUA. Refetch cuando cambien los filtros.
 */
export function useSiguaDashboard(filters?: SiguaFilters | null): UseSiguaDashboardReturn {
  const [data, setData] = useState<SiguaDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await getDashboard(filters ?? undefined);
    if (err) {
      setError(err);
      setData(null);
    } else {
      setData(res ?? null);
    }
    setLoading(false);
  }, [filters?.sede_id, filters?.sistema_id, filters?.fecha_desde, filters?.fecha_hasta]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
