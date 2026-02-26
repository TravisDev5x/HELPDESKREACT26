/**
 * Custom hooks del módulo SIGUA.
 * Patrón: data, loading, error, refetch; mutaciones con invalidación/refetch.
 */

export { useSiguaDashboard } from "./useSiguaDashboard";
export type { UseSiguaDashboardReturn } from "./useSiguaDashboard";

export { useCuentasGenericas } from "./useCuentasGenericas";
export type { UseCuentasGenericasReturn, SiguaMeta as SiguaMetaCuentas } from "./useCuentasGenericas";

export { useCA01 } from "./useCA01";
export type { UseCA01Return, SiguaMeta as SiguaMetaCA01 } from "./useCA01";

export { useBitacora, useBitacoraHoy, useBitacoraPorSede } from "./useBitacora";
export type { UseBitacoraReturn, SiguaMeta as SiguaMetaBitacora } from "./useBitacora";

export { useIncidentes } from "./useIncidentes";
export type { UseIncidentesReturn, SiguaMeta as SiguaMetaIncidentes } from "./useIncidentes";

export { useImportaciones } from "./useImportaciones";
export type { UseImportacionesReturn, SiguaMeta as SiguaMetaImportaciones } from "./useImportaciones";

export { useCruces } from "./useCruces";
export type { UseCrucesReturn, SiguaMeta as SiguaMetaCruces } from "./useCruces";

export { useSiguaFilters } from "./useSiguaFilters";
export type { UseSiguaFiltersReturn, UseSiguaFiltersOptions } from "./useSiguaFilters";
