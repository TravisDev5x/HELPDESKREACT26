/**
 * API Service para el módulo SIGUA.
 * Prefijo: /api/sigua/
 * Usa la misma instancia axios del proyecto (@/lib/axios).
 * Respuestas consistentes: { data, error, message }.
 */

import axios from "@/lib/axios";
import type {
  SiguaDashboardData,
  SiguaFilters,
  SiguaApiResponse,
  CuentaGenerica,
  FormatoCA01,
  RegistroBitacora,
  Incidente,
  Importacion,
  Cruce,
  Sistema,
} from "@/types/sigua";

const PREFIX = "/api/sigua";

// --- Resultado genérico ---

export interface SiguaApiResult<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

function toResult<T>(response: { data: SiguaApiResponse<T> | T }): SiguaApiResult<T> {
  const body = response.data as SiguaApiResponse<T> | T;
  const data = typeof body === "object" && body !== null && "data" in body ? (body as SiguaApiResponse<T>).data : (body as T);
  const message = typeof body === "object" && body !== null && "message" in body ? (body as SiguaApiResponse<T>).message : undefined;
  return { data: data as T, error: null, message };
}

function toError(err: unknown): SiguaApiResult<never> {
  const msg =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err as Error)?.message ||
    "Error en la solicitud";
  return { data: null, error: msg, message: msg };
}

// --- Parámetros de creación/actualización ---

export interface CreateCuentaPayload {
  sistema_id: number;
  usuario_cuenta: string;
  nombre_cuenta: string;
  sede_id: number;
  campaign_id?: number | null;
  isla?: string | null;
  perfil?: string | null;
  ou_ad?: string | null;
  estado: "activa" | "suspendida" | "baja";
}

export interface UpdateCuentaPayload extends CreateCuentaPayload {}

export interface CreateCA01Payload {
  gerente_user_id: number;
  campaign_id: number;
  sede_id: number;
  sistema_id: number;
  fecha_firma: string;
  cuentas: Array<{ cuenta_generica_id: number; justificacion?: string | null }>;
  observaciones?: string | null;
}

export interface UpdateCA01Payload {
  observaciones?: string | null;
  estado?: "vigente" | "vencido" | "cancelado";
}

export interface RegistroBitacoraPayload {
  cuenta_generica_id: number;
  fecha: string;
  turno: "matutino" | "vespertino" | "nocturno" | "mixto";
  agente_nombre: string;
  agente_num_empleado?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  hora_cambio?: string | null;
  observaciones?: string | null;
}

export interface SinUsoPayload {
  cuenta_generica_id: number;
  fecha: string;
  turno: "matutino" | "vespertino" | "nocturno" | "mixto";
  motivo?: string | null;
}

export interface CreateIncidentePayload {
  cuenta_generica_id: number;
  fecha_incidente: string;
  descripcion: string;
  ip_origen?: string | null;
}

export interface InvestigarIncidentePayload {
  asignado_a: number;
}

export interface ResolverIncidentePayload {
  resolucion: string;
  agente_identificado?: string | null;
}

export interface EjecutarCrucePayload {
  tipo_cruce?: "rh_vs_ad" | "rh_vs_neotel" | "ad_vs_neotel" | "completo";
  import_id?: number | null;
}

// --- Catálogos ---

export async function getSistemas(): Promise<SiguaApiResult<Sistema[]>> {
  try {
    const response = await axios.get<SiguaApiResponse<Sistema[]>>(`${PREFIX}/sistemas`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function bulkUpdateEstadoCuentas(ids: number[], estado: "activa" | "suspendida" | "baja"): Promise<SiguaApiResult<{ updated: number }>> {
  try {
    const response = await axios.post<SiguaApiResponse<{ updated: number }>>(`${PREFIX}/cuentas/bulk-estado`, { ids, estado });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Dashboard ---

export async function getDashboard(filters?: SiguaFilters | null): Promise<SiguaApiResult<SiguaDashboardData>> {
  try {
    const params = filters ? { sede_id: filters.sede_id, sistema_id: filters.sistema_id, fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta } : {};
    const response = await axios.get<{ data: SiguaDashboardData; message?: string }>(`${PREFIX}/dashboard`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Cuentas ---

export async function getCuentas(
  filters?: SiguaFilters | null,
  page?: number
): Promise<SiguaApiResult<{ data: CuentaGenerica[]; meta?: SiguaApiResponse<CuentaGenerica>["meta"] }>> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<SiguaApiResponse<CuentaGenerica[]>>(`${PREFIX}/cuentas`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getCuenta(id: number): Promise<SiguaApiResult<CuentaGenerica>> {
  try {
    const response = await axios.get<SiguaApiResponse<CuentaGenerica>>(`${PREFIX}/cuentas/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function createCuenta(data: CreateCuentaPayload): Promise<SiguaApiResult<CuentaGenerica>> {
  try {
    const response = await axios.post<SiguaApiResponse<CuentaGenerica>>(`${PREFIX}/cuentas`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function updateCuenta(id: number, data: UpdateCuentaPayload): Promise<SiguaApiResult<CuentaGenerica>> {
  try {
    const response = await axios.put<SiguaApiResponse<CuentaGenerica>>(`${PREFIX}/cuentas/${id}`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function deleteCuenta(id: number): Promise<SiguaApiResult<null>> {
  try {
    const response = await axios.delete<SiguaApiResponse<null>>(`${PREFIX}/cuentas/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- CA01 ---

export async function getCA01s(
  filters?: SiguaFilters | null,
  page?: number
): Promise<SiguaApiResult<{ data: FormatoCA01[]; meta?: SiguaApiResponse<FormatoCA01[]>["meta"] }>> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<SiguaApiResponse<FormatoCA01[]>>(`${PREFIX}/ca01`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getCA01(id: number): Promise<SiguaApiResult<FormatoCA01>> {
  try {
    const response = await axios.get<SiguaApiResponse<FormatoCA01>>(`${PREFIX}/ca01/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function createCA01(data: CreateCA01Payload): Promise<SiguaApiResult<FormatoCA01>> {
  try {
    const response = await axios.post<SiguaApiResponse<FormatoCA01>>(`${PREFIX}/ca01`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function updateCA01(id: number, data: UpdateCA01Payload): Promise<SiguaApiResult<FormatoCA01>> {
  try {
    const response = await axios.put<SiguaApiResponse<FormatoCA01>>(`${PREFIX}/ca01/${id}`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function renovarCA01(id: number, data?: { fecha_firma?: string }): Promise<SiguaApiResult<FormatoCA01>> {
  try {
    const response = await axios.post<SiguaApiResponse<FormatoCA01>>(`${PREFIX}/ca01/${id}/renovar`, data ?? {});
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Bitácora ---

export async function getBitacora(
  filters?: SiguaFilters | null,
  page?: number
): Promise<SiguaApiResult<{ data: RegistroBitacora[]; meta?: SiguaApiResponse<RegistroBitacora[]>["meta"] }>> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<SiguaApiResponse<RegistroBitacora[]>>(`${PREFIX}/bitacora`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getBitacoraHoy(): Promise<SiguaApiResult<RegistroBitacora[]>> {
  try {
    const response = await axios.get<{ data: RegistroBitacora[]; message?: string }>(`${PREFIX}/bitacora/hoy`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getBitacoraPorSede(sedeId: number): Promise<SiguaApiResult<{ data: RegistroBitacora[]; meta?: SiguaApiResponse<RegistroBitacora[]>["meta"] }>> {
  try {
    const response = await axios.get<SiguaApiResponse<RegistroBitacora[]>>(`${PREFIX}/bitacora/sede/${sedeId}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function registrarBitacora(data: RegistroBitacoraPayload): Promise<SiguaApiResult<RegistroBitacora>> {
  try {
    const response = await axios.post<SiguaApiResponse<RegistroBitacora>>(`${PREFIX}/bitacora`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function registrarBitacoraBulk(
  registros: Array<RegistroBitacoraPayload>
): Promise<SiguaApiResult<RegistroBitacora[]>> {
  try {
    const response = await axios.post<SiguaApiResponse<RegistroBitacora[]>>(`${PREFIX}/bitacora/bulk`, { registros });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function registrarSinUso(data: SinUsoPayload): Promise<SiguaApiResult<{ id: number; account_id: number; fecha: string; turno: string; sede_id: number; supervisor_user_id: number; motivo: string | null }>> {
  try {
    const response = await axios.post<{ data: { id: number; account_id: number; fecha: string; turno: string; sede_id: number; supervisor_user_id: number; motivo: string | null }; message?: string }>(`${PREFIX}/bitacora/sin-uso`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Incidentes ---

export async function getIncidentes(
  filters?: SiguaFilters | null,
  page?: number
): Promise<SiguaApiResult<{ data: Incidente[]; meta?: SiguaApiResponse<Incidente[]>["meta"] }>> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<SiguaApiResponse<Incidente[]>>(`${PREFIX}/incidentes`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getIncidente(id: number): Promise<SiguaApiResult<Incidente>> {
  try {
    const response = await axios.get<SiguaApiResponse<Incidente>>(`${PREFIX}/incidentes/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function createIncidente(data: CreateIncidentePayload): Promise<SiguaApiResult<Incidente>> {
  try {
    const response = await axios.post<SiguaApiResponse<Incidente>>(`${PREFIX}/incidentes`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function updateIncidente(id: number, data: Partial<{ estado: string; asignado_a: number | null; resolucion: string; agente_identificado: string | null }>): Promise<SiguaApiResult<Incidente>> {
  try {
    const response = await axios.put<SiguaApiResponse<Incidente>>(`${PREFIX}/incidentes/${id}`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function investigarIncidente(id: number, data: InvestigarIncidentePayload): Promise<SiguaApiResult<Incidente>> {
  try {
    const response = await axios.patch<SiguaApiResponse<Incidente>>(`${PREFIX}/incidentes/${id}/investigar`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function resolverIncidente(id: number, data: ResolverIncidentePayload): Promise<SiguaApiResult<Incidente>> {
  try {
    const response = await axios.patch<SiguaApiResponse<Incidente>>(`${PREFIX}/incidentes/${id}/resolver`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function escalarIncidente(id: number): Promise<SiguaApiResult<Incidente>> {
  try {
    const response = await axios.patch<SiguaApiResponse<Incidente>>(`${PREFIX}/incidentes/${id}/escalar`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Importar ---

export async function importarArchivo(
  file: File,
  tipo: Importacion["tipo"]
): Promise<SiguaApiResult<Importacion>> {
  try {
    const form = new FormData();
    form.append("archivo", file);
    form.append("tipo", tipo);
    const response = await axios.post<SiguaApiResponse<Importacion>>(`${PREFIX}/importar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getHistorialImportaciones(params?: { tipo?: string; per_page?: number; page?: number }): Promise<SiguaApiResult<{ data: Importacion[]; meta?: SiguaApiResponse<Importacion[]>["meta"] }>> {
  try {
    const response = await axios.get<SiguaApiResponse<Importacion[]>>(`${PREFIX}/importar/historial`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Cruces ---

export async function ejecutarCruce(payload?: EjecutarCrucePayload): Promise<SiguaApiResult<Cruce>> {
  try {
    const response = await axios.post<SiguaApiResponse<Cruce>>(`${PREFIX}/cruces`, payload ?? {});
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getHistorialCruces(params?: { tipo_cruce?: string; per_page?: number; page?: number }): Promise<SiguaApiResult<{ data: Cruce[]; meta?: SiguaApiResponse<Cruce[]>["meta"] }>> {
  try {
    const response = await axios.get<SiguaApiResponse<Cruce[]>>(`${PREFIX}/cruces/historial`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function getDetalleCruce(id: number): Promise<SiguaApiResult<Cruce>> {
  try {
    const response = await axios.get<SiguaApiResponse<Cruce>>(`${PREFIX}/cruces/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Reportes ---

export async function getResumenGeneral(filters?: SiguaFilters | null): Promise<SiguaApiResult<{ cuentas: CuentaGenerica[]; ca01: FormatoCA01[]; bitacora: RegistroBitacora[]; incidentes: Incidente[]; kpis: Record<string, number> }>> {
  try {
    const params = filters ? { sede_id: filters.sede_id, sistema_id: filters.sistema_id, fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta } : {};
    const response = await axios.get<{ data: { cuentas: CuentaGenerica[]; ca01: FormatoCA01[]; bitacora: RegistroBitacora[]; incidentes: Incidente[]; kpis: Record<string, number> }; message?: string }>(`${PREFIX}/reportes/resumen`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function exportarCuentas(filters?: SiguaFilters | null): Promise<SiguaApiResult<Blob>> {
  try {
    const params = filters ? { sede_id: filters.sede_id, sistema_id: filters.sistema_id, estado: filters.estado } : {};
    const response = await axios.get<Blob>(`${PREFIX}/reportes/exportar-cuentas`, { params, responseType: "blob" });
    const blob = response.data instanceof Blob ? response.data : new Blob([JSON.stringify(response.data)]);
    return { data: blob, error: null };
  } catch (err) {
    return toError(err);
  }
}

export async function exportarBitacora(filters?: SiguaFilters | null): Promise<SiguaApiResult<Blob>> {
  try {
    const params = filters ? { fecha: filters.fecha, fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta, sede_id: filters.sede_id, sistema_id: filters.sistema_id } : {};
    const response = await axios.get<Blob>(`${PREFIX}/reportes/exportar-bitacora`, { params, responseType: "blob" });
    const blob = response.data instanceof Blob ? response.data : new Blob([JSON.stringify(response.data)]);
    return { data: blob, error: null };
  } catch (err) {
    return toError(err);
  }
}

export async function exportarCruce(cruceId: number): Promise<SiguaApiResult<Blob>> {
  try {
    const response = await axios.get<Blob>(`${PREFIX}/reportes/exportar-cruce/${cruceId}`, { responseType: "blob" });
    const blob = response.data instanceof Blob ? response.data : new Blob([JSON.stringify(response.data)]);
    return { data: blob, error: null };
  } catch (err) {
    return toError(err);
  }
}
