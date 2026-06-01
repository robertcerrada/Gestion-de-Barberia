/**
 * domain/types.ts
 *
 * Tipos de dominio centralizados — la única fuente de verdad para las
 * entidades de negocio. Sin dependencias de infraestructura ni de UI.
 *
 * Regla: este archivo puede ser importado por CUALQUIER capa.
 * Ninguna capa de infraestructura o UI debe definir sus propios tipos de entidad.
 */

// ─── Entidades de negocio ────────────────────────────────────────────────────

export interface Barbero {
  id?: number;
  nombre: string;
  porcentaje_comision: number;
  activo: boolean;
}

export interface ServicioProducto {
  id?: number;
  nombre: string;
  tipo: 'servicio' | 'producto';
  precio: number;
  stock_actual?: number;
  stock_minimo?: number;
}

export interface RegistroDiario {
  id?: number;
  fecha: Date;
  barbero_id: number;
  item_id: number;
  monto_total: number;
  metodo_pago: MetodoPago;
}

export interface Adelanto {
  id?: number;
  fecha: Date;
  barbero_id: number;
  monto: number;
  motivo: string;
  destinatario_tipo?: TipoDestinatario;
  socio_id?: number;
}

export interface GastoFijo {
  id?: number;
  fecha: Date;
  categoria: CategoriaGasto;
  monto: number;
  descripcion: string;
}

export interface HistoricoCierre {
  id?: number;
  mes_ano: string;
  ingresos_totales: number;
  gastos_totales: number;
  comisiones_pagadas: number;
  utilidad_neta: number;
  pago_esposa: number;
  pago_socio: number;
  bloqueado: boolean;
  fecha_cierre: Date;
}

export interface ConfigBarberia {
  id?: number;
  clave: string;
  valor: string;
}

export interface Socio {
  id?: number;
  nombre: string;
  porcentaje_utilidad: number;
  activo: boolean;
  rol: string;
}

export interface MovimientoFondo {
  id?: number;
  fecha: Date;
  monto: number;
  tipo: TipoMovimiento;
  motivo: string;
}

export interface ArqueoCaja {
  id?: number;
  fecha: Date;
  total_ventas: number;
  monto_banco: number;
  monto_efectivo: number;
  fondo_caja: number;
  debe_quedar: number;
  notas?: string;
}

export interface DocumentoBarbero {
  id?: number;
  barbero_id: number;
  tipo: TipoDocumento;
  nombre: string;
  descripcion?: string;
  mime_type: string;
  data: string;
  fecha_subida: Date;
  tamano_bytes: number;
}

// ─── Value Objects (enums / tipos literales) ─────────────────────────────────

export type MetodoPago = 'efectivo' | 'banco';

export type TipoDestinatario = 'barbero' | 'socio' | 'devolucion_socio';

export type TipoMovimiento = 'ingreso' | 'egreso';

export type TipoDocumento =
  | 'dni'
  | 'contrato'
  | 'alquiler_silla'
  | 'certificado'
  | 'foto_perfil'
  | 'otro';

export type CategoriaGasto =
  | 'internet'
  | 'alquiler'
  | 'limpieza'
  | 'insumos'
  | 'impuestos'
  | 'camaras'
  | 'seguro'
  | 'luz'
  | 'agua'
  | 'gestoria'
  | 'comision_bancaria'
  | 'otro';

// ─── DTOs de resultado (outputs de casos de uso) ─────────────────────────────

export interface ResumenDia {
  totalVentas: number;
  efectivo: number;
  banco: number;
  comisionBancaria: number;
  gastos: number;
  adelantosBarberos: number;
  adelantosSocios: number;
  saldoNeto: number;
}

export interface ResumenMes {
  ingresos: number;
  gastos: number;
  comisiones: number;
  comision_bancaria: number;
  utilidad_neta: number;
  pago_esposa: number;
  pago_socio: number;
  pagosPorSocio: PagoSocio[];
}

export interface PagoSocio {
  id: number;
  nombre: string;
  porcentaje: number;
  monto: number;
  pagado: number;
  saldoPendiente: number;
  debeBarberia: number;
}

export interface MetodosPagoMes {
  efectivo: number;
  banco: number;
  bancoNeto: number;
  comisionBancaria: number;
  total: number;
}

export interface VentaBarberoMes {
  barberoId: number;
  nombre: string;
  totalServicios: number;
  comision: number;
  porcentaje: number;
  pagado: number;
  saldoPendiente: number;
}

export interface MesPendiente {
  mesAno: string;
  label: string;
  fechaMes: Date;
  noCerrado: boolean;
  barberosPendientes: { id: number; nombre: string; saldo: number }[];
}

export interface MesAbierto {
  mesAno: string;
  mes: string;
  ingresos: number;
  gastos: number;
  comisiones: number;
  utilidad: number;
  sociosSinPagar: { nombre: string; monto: number }[];
  totalPendiente: number;
}

// ─── Constantes de dominio ───────────────────────────────────────────────────

export const CATEGORIAS_GASTO: CategoriaGasto[] = [
  'internet', 'alquiler', 'limpieza', 'insumos', 'impuestos',
  'camaras', 'seguro', 'luz', 'agua', 'gestoria', 'comision_bancaria', 'otro',
];

export const TIPOS_DOCUMENTO: TipoDocumento[] = [
  'dni', 'contrato', 'alquiler_silla', 'certificado', 'foto_perfil', 'otro',
];

export const CLAVES_CONFIG_PERMITIDAS = [
  'nombre_barberia',
  'logo_data',
  'emails_autorizados',
  'pin_hash',
  'pin_salt',
  'porcentaje_comision_bancaria',
  'moneda',
] as const;

export type ClaveConfig = typeof CLAVES_CONFIG_PERMITIDAS[number];
