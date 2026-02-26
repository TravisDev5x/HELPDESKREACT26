/**
 * Tipos TypeScript para el módulo SIGUA (Sistema Integral de Gestión de Usuarios y Accesos).
 * Alineados con la API y modelos Laravel.
 */

// --- Catálogos mínimos (relaciones embebidas) ---

export interface Sistema {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  es_externo: boolean;
  contacto_externo: string | null;
}

export interface SedeMin {
  id: number;
  name: string;
  code?: string | null;
}

export interface CampaignMin {
  id: number;
  name: string;
}

export interface UserMin {
  id: number;
  name: string;
  email?: string | null;
}

// --- Cuenta genérica ---

export interface CuentaGenerica {
  id: number;
  system_id: number;
  sistema?: Sistema | null;
  usuario_cuenta: string;
  nombre_cuenta: string;
  sede_id: number;
  sede?: SedeMin | null;
  isla: string | null;
  perfil: string | null;
  campaign_id: number | null;
  campaign?: CampaignMin | null;
  estado: 'activa' | 'suspendida' | 'baja';
  ou_ad: string | null;
  nombre_completo?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- Formato CA-01 ---

export interface FormatoCA01 {
  id: number;
  gerente_user_id: number;
  gerente?: UserMin | null;
  campaign_id: number;
  campaign?: CampaignMin | null;
  sede_id: number;
  sede?: SedeMin | null;
  system_id: number;
  sistema?: Sistema | null;
  fecha_firma: string;
  fecha_vencimiento: string;
  estado: 'vigente' | 'vencido' | 'cancelado';
  esta_vigente?: boolean;
  archivo_firmado: string | null;
  observaciones: string | null;
  cuentas?: CuentaGenerica[] | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- Bitácora ---

export interface CuentaMin {
  id: number;
  usuario_cuenta: string;
  nombre_cuenta: string;
  sede_id?: number;
  system_id?: number;
}

export interface RegistroBitacora {
  id: number;
  account_id: number;
  cuenta?: CuentaMin | null;
  system_id: number;
  sede_id: number;
  sede?: SedeMin | null;
  campaign_id: number | null;
  fecha: string;
  turno: 'matutino' | 'vespertino' | 'nocturno' | 'mixto';
  turno_label?: string;
  agente_nombre: string;
  agente_num_empleado: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  hora_cambio: string | null;
  supervisor_user_id: number;
  supervisor?: UserMin | null;
  observaciones: string | null;
  created_at: string;
  updated_at?: string;
}

// --- Incidente ---

export interface Incidente {
  id: number;
  account_id: number;
  cuenta?: CuentaMin | CuentaGenerica | null;
  fecha_incidente: string;
  descripcion: string;
  ip_origen: string | null;
  system_id: number;
  ca01_id: number | null;
  ca01?: FormatoCA01 | null;
  agente_identificado: string | null;
  resolucion: string | null;
  estado: 'abierto' | 'investigando' | 'resuelto' | 'escalado';
  reportado_por: number;
  reportador?: UserMin | null;
  asignado_a: number | null;
  asignado?: UserMin | null;
  created_at: string;
  updated_at?: string;
}

// --- Importación ---

export type TipoImportacion =
  | 'rh_activos'
  | 'ad_usuarios'
  | 'neotel_isla2'
  | 'neotel_isla3'
  | 'neotel_isla4'
  | 'bajas_rh';

export interface Importacion {
  id: number;
  tipo: TipoImportacion;
  archivo: string;
  registros_procesados: number;
  registros_nuevos: number;
  registros_actualizados: number;
  errores: number;
  importado_por: number;
  created_at: string;
  updated_at?: string;
}

// --- Cruce ---

export type TipoCruce = 'rh_vs_ad' | 'rh_vs_neotel' | 'ad_vs_neotel' | 'completo';

export interface Cruce {
  id: number;
  import_id: number | null;
  tipo_cruce: TipoCruce;
  fecha_ejecucion: string;
  total_analizados: number;
  coincidencias: number;
  sin_match: number;
  resultado_json: Record<string, unknown> | null;
  ejecutado_por: number;
  created_at: string;
  updated_at?: string;
}

// --- Dashboard ---

export interface SiguaDashboardData {
  kpis?: {
    total_cuentas?: number;
    ca01_vigentes?: number;
    ca01_vencidos?: number;
    bitacoras_hoy?: number;
    incidentes_abiertos?: number;
  };
  total_cuentas_por_sistema?: Array< { sistema_id: number; sistema: string | null; total: number } >;
  ca01_vigentes?: number;
  ca01_vencidos?: number;
  bitacoras_hoy?: number;
  incidentes_abiertos?: number;
  distribucion_por_sede?: Array< { sede_id: number; sede: string | null; total: number } >;
  alertas?: Array<{
    tipo: string;
    mensaje: string;
    datos?: unknown;
  }>;
}

// --- Filtros ---

export interface SiguaFilters {
  sede_id?: number | string | null;
  sistema_id?: number | string | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  estado?: string | null;
  campaign_id?: number | string | null;
  search?: string | null;
  turno?: 'matutino' | 'vespertino' | 'nocturno' | 'mixto' | null;
  fecha?: string | null;
  per_page?: number;
  cuenta_generica_id?: number | null;
  gerente_user_id?: number | string | null;
}

// --- Respuestas API genéricas ---

export interface SiguaApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
