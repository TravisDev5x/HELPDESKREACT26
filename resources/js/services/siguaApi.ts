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
  CruceResultado,
  Sistema,
  EmpleadoRh,
  Alerta,
  Configuracion,
  TipoCuenta,
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
  const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  const data = res?.data;
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return { data: null, error: first, message: first };
  }
  const msg = data?.message || (err as Error)?.message || "Error en la solicitud";
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

/** Backend solo acepta tipo_cruce: "completo" | "individual" (individual requiere sistema_id). */
export interface EjecutarCrucePayload {
  tipo_cruce?: "completo" | "individual";
  sistema_id?: number;
  sistema_ids?: number[];
  import_id?: number | null;
}

export interface CreateSistemaPayload {
  name: string;
  slug: string;
  description?: string | null;
  es_externo?: boolean;
  contacto_externo?: string | null;
  campos_mapeo?: Record<string, string> | null;
  campo_id_empleado?: string | null;
  regex_id_empleado?: string | null;
  activo?: boolean;
  icono?: string | null;
  color?: string | null;
  orden?: number;
}

export type UpdateSistemaPayload = Partial<CreateSistemaPayload>;

export interface CumplimientoBitacoraFilters {
  fecha_desde?: string;
  fecha_hasta?: string;
  sede_id?: number;
  sistema_id?: number;
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

export async function getSistema(id: number): Promise<SiguaApiResult<Sistema>> {
  try {
    const response = await axios.get<SiguaApiResponse<Sistema>>(`${PREFIX}/sistemas/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function createSistema(data: CreateSistemaPayload): Promise<SiguaApiResult<Sistema>> {
  try {
    const response = await axios.post<SiguaApiResponse<Sistema>>(`${PREFIX}/sistemas`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function updateSistema(id: number, data: UpdateSistemaPayload): Promise<SiguaApiResult<Sistema>> {
  try {
    const response = await axios.put<SiguaApiResponse<Sistema>>(`${PREFIX}/sistemas/${id}`, data);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function deleteSistema(id: number): Promise<SiguaApiResult<null>> {
  try {
    const response = await axios.delete<SiguaApiResponse<null>>(`${PREFIX}/sistemas/${id}`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Empleados RH ---

export interface EmpleadosRhMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function getEmpleadosRh(params?: { sede_id?: number; campaign_id?: number; estatus?: string; search?: string; per_page?: number; page?: number }): Promise<SiguaApiResult<EmpleadoRh[]> & { meta?: EmpleadosRhMeta }> {
  try {
    const response = await axios.get<{ data: EmpleadoRh[]; meta?: EmpleadosRhMeta; message?: string }>(`${PREFIX}/empleados-rh`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
  } catch (err) {
    return toError(err);
  }
}

export async function getEmpleadoRh(id: number): Promise<SiguaApiResult<EmpleadoRh>> {
  try {
    const response = await axios.get<SiguaApiResponse<EmpleadoRh>>(`${PREFIX}/empleados-rh/${id}`);
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
): Promise<SiguaApiResult<CuentaGenerica[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<{ data: CuentaGenerica[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/cuentas`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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

export async function clasificarCuenta(id: number, tipo: TipoCuenta): Promise<SiguaApiResult<CuentaGenerica>> {
  try {
    const response = await axios.patch<SiguaApiResponse<CuentaGenerica>>(`${PREFIX}/cuentas/${id}/clasificar`, { tipo });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function vincularCuenta(id: number, empleadoRhId: number): Promise<SiguaApiResult<CuentaGenerica>> {
  try {
    const response = await axios.patch<SiguaApiResponse<CuentaGenerica>>(`${PREFIX}/cuentas/${id}/vincular`, { empleado_rh_id: empleadoRhId });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- CA01 ---

export async function getCA01s(
  filters?: SiguaFilters | null,
  page?: number
): Promise<SiguaApiResult<FormatoCA01[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<{ data: FormatoCA01[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/ca01`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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
): Promise<SiguaApiResult<RegistroBitacora[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<{ data: RegistroBitacora[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/bitacora`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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

export async function getBitacoraPorSede(sedeId: number): Promise<SiguaApiResult<RegistroBitacora[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const response = await axios.get<{ data: RegistroBitacora[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/bitacora/sede/${sedeId}`);
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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

export async function getCumplimientoBitacora(
  filters?: CumplimientoBitacoraFilters
): Promise<SiguaApiResult<{ cumplimiento: number; total_esperados: number; registros: Array<{ sede_id: number; fecha: string; turno: string; cumplido: boolean }> }>> {
  try {
    const params = filters ? { fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta, sede_id: filters.sede_id, sistema_id: filters.sistema_id } : {};
    const response = await axios.get<{ data: { cumplimiento: number; total_esperados: number; registros: Array<{ sede_id: number; fecha: string; turno: string; cumplido: boolean }> }; message?: string }>(`${PREFIX}/bitacora/cumplimiento`, { params });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Incidentes ---

export async function getIncidentes(
  filters?: SiguaFilters | null,
  page?: number
): Promise<SiguaApiResult<Incidente[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const params: Record<string, unknown> = { ...(filters || {}), page: page ?? 1 };
    const response = await axios.get<{ data: Incidente[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/incidentes`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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
  tipo: Importacion["tipo"],
  sistemaId?: number
): Promise<SiguaApiResult<Importacion>> {
  try {
    const form = new FormData();
    form.append("archivo", file);
    form.append("tipo", tipo);
    if (tipo === "sistema" && sistemaId != null) {
      form.append("sistema_id", String(sistemaId));
    }
    const response = await axios.post<SiguaApiResponse<Importacion>>(`${PREFIX}/importar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function previewImportacion(
  file: File,
  sistemaId: number
): Promise<SiguaApiResult<{ filas: number; columnas: string[]; muestra: Array<Record<string, unknown>>; errores?: string[] }>> {
  try {
    const form = new FormData();
    form.append("archivo", file);
    form.append("sistema_id", String(sistemaId));
    const response = await axios.post<{ data: { filas: number; columnas: string[]; muestra: Array<Record<string, unknown>>; errores?: string[] }; message?: string }>(`${PREFIX}/importar/preview`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export interface HistorialImportacionesResponse {
  data: Importacion[];
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
}

export async function getHistorialImportaciones(params?: { tipo?: string; per_page?: number; page?: number }): Promise<SiguaApiResult<Importacion[]> & { meta?: HistorialImportacionesResponse["meta"] }> {
  try {
    const response = await axios.get<{ data: Importacion[]; meta?: HistorialImportacionesResponse["meta"]; message?: string }>(`${PREFIX}/importar/historial`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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

export async function getHistorialCruces(params?: { tipo_cruce?: string; per_page?: number; page?: number }): Promise<SiguaApiResult<Cruce[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const response = await axios.get<{ data: Cruce[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/cruces/historial`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
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

export async function compararCruce(cruceId: number): Promise<SiguaApiResult<{ cruce: Cruce; resultados: CruceResultado[] }>> {
  try {
    const response = await axios.get<{ data: { cruce: Cruce; resultados: CruceResultado[] }; message?: string }>(`${PREFIX}/cruces/${cruceId}/comparar`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Alertas ---

export async function getAlertas(params?: { leida?: boolean; resuelta?: boolean; severidad?: string; per_page?: number; page?: number }): Promise<SiguaApiResult<Alerta[]> & { meta?: { current_page: number; last_page: number; per_page: number; total: number } }> {
  try {
    const response = await axios.get<{ data: Alerta[]; meta?: { current_page: number; last_page: number; per_page: number; total: number }; message?: string }>(`${PREFIX}/alertas`, { params });
    const body = response.data;
    return { data: Array.isArray(body?.data) ? body.data : [], error: null, meta: body?.meta };
  } catch (err) {
    return toError(err);
  }
}

export async function marcarAlertaLeida(id: number): Promise<SiguaApiResult<Alerta>> {
  try {
    const response = await axios.patch<SiguaApiResponse<Alerta>>(`${PREFIX}/alertas/${id}/leer`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function resolverAlerta(id: number): Promise<SiguaApiResult<Alerta>> {
  try {
    const response = await axios.patch<SiguaApiResponse<Alerta>>(`${PREFIX}/alertas/${id}/resolver`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

// --- Configuración ---

export async function getConfiguracion(): Promise<SiguaApiResult<Configuracion[]>> {
  try {
    const response = await axios.get<SiguaApiResponse<Configuracion[]>>(`${PREFIX}/configuracion`);
    return toResult(response);
  } catch (err) {
    return toError(err);
  }
}

export async function updateConfiguracion(clave: string, valor: string | number | boolean | Record<string, unknown> | null): Promise<SiguaApiResult<Configuracion>> {
  try {
    const response = await axios.put<SiguaApiResponse<Configuracion>>(`${PREFIX}/configuracion`, { clave, valor });
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
