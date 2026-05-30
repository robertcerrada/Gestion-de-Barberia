import Dexie, { type Table } from 'dexie';

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
  metodo_pago: 'efectivo' | 'banco';
}

export interface Adelanto {
  id?: number;
  fecha: Date;
  barbero_id: number;
  monto: number;
  motivo: string;
  destinatario_tipo?: 'barbero' | 'socio' | 'devolucion_socio';
  socio_id?: number;
}

export interface GastoFijo {
  id?: number;
  fecha: Date;
  categoria: 'internet' | 'alquiler' | 'limpieza' | 'insumos' | 'impuestos' | 'camaras' | 'seguro' | 'luz' | 'agua' | 'gestoria' | 'comision_bancaria' | 'otro';
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
  tipo: 'ingreso' | 'egreso';
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

export type TipoDocumento =
  | 'dni'
  | 'contrato'
  | 'alquiler_silla'
  | 'certificado'
  | 'foto_perfil'
  | 'otro';

export interface DocumentoBarbero {
  id?: number;
  barbero_id: number;
  tipo: TipoDocumento;
  nombre: string;          // nombre del archivo original
  descripcion?: string;    // nota opcional del usuario
  mime_type: string;       // 'image/jpeg', 'application/pdf', etc.
  data: string;            // base64 del archivo
  fecha_subida: Date;
  tamano_bytes: number;
}

export class BarberiaDexie extends Dexie {
  barberos!: Table<Barbero, number>;
  servicios_productos!: Table<ServicioProducto, number>;
  registros_diarios!: Table<RegistroDiario, number>;
  Adelantos!: Table<Adelanto, number>;
  gastos_fijos!: Table<GastoFijo, number>;
  historico_cierres!: Table<HistoricoCierre, number>;
  fondo_caja!: Table<MovimientoFondo, number>;
  arqueo_caja!: Table<ArqueoCaja, number>;
  config_barberia!: Table<ConfigBarberia, number>;
  socios!: Table<Socio, number>;
  documentos_barbero!: Table<DocumentoBarbero, number>;

  constructor() {
    super('BarberiaPWA');
    this.version(2).stores({
      barberos: '++id, nombre, activo',
      servicios_productos: '++id, nombre, tipo',
      registros_diarios: '++id, fecha, barbero_id, item_id, metodo_pago',
      Adelantos: '++id, fecha, barbero_id',
      gastos_fijos: '++id, fecha, categoria',
      historico_cierres: '++id, mes_ano, bloqueado',
      fondo_caja: '++id, fecha, tipo',
    });
    this.version(3).stores({
      barberos: '++id, nombre, activo',
      servicios_productos: '++id, nombre, tipo',
      registros_diarios: '++id, fecha, barbero_id, item_id, metodo_pago',
      Adelantos: '++id, fecha, barbero_id',
      gastos_fijos: '++id, fecha, categoria',
      historico_cierres: '++id, mes_ano, bloqueado',
      fondo_caja: '++id, fecha, tipo',
      arqueo_caja: '++id, fecha',
    });
    // v4-v6 consolidadas en v5: socios + config + adelantos con destinatario
    this.version(5).stores({
      barberos: '++id, nombre, activo',
      servicios_productos: '++id, nombre, tipo',
      registros_diarios: '++id, fecha, barbero_id, item_id, metodo_pago',
      Adelantos: '++id, fecha, barbero_id, destinatario_tipo, socio_id',
      gastos_fijos: '++id, fecha, categoria',
      historico_cierres: '++id, mes_ano, bloqueado',
      fondo_caja: '++id, fecha, tipo',
      arqueo_caja: '++id, fecha',
      config_barberia: '++id, clave',
      socios: '++id, nombre, activo',
    });
    // v7: agrega tabla de documentos por barbero
    this.version(7).stores({
      barberos: '++id, nombre, activo',
      servicios_productos: '++id, nombre, tipo',
      registros_diarios: '++id, fecha, barbero_id, item_id, metodo_pago',
      Adelantos: '++id, fecha, barbero_id, destinatario_tipo, socio_id',
      gastos_fijos: '++id, fecha, categoria',
      historico_cierres: '++id, mes_ano, bloqueado',
      fondo_caja: '++id, fecha, tipo',
      arqueo_caja: '++id, fecha',
      config_barberia: '++id, clave',
      socios: '++id, nombre, activo',
      documentos_barbero: '++id, barbero_id, tipo, fecha_subida',
    });
  }
}

export async function getConfig(clave: string): Promise<string | null> {
  const row = await db.config_barberia.where('clave').equals(clave).first();
  return row?.valor ?? null;
}

export async function setConfig(clave: string, valor: string): Promise<void> {
  const existing = await db.config_barberia.where('clave').equals(clave).first();
  if (existing?.id) {
    await db.config_barberia.update(existing.id, { valor });
  } else {
    await db.config_barberia.add({ clave, valor });
  }
}

export const db = new BarberiaDexie();

export async function seedInitialData() {
  const count = await db.barberos.count();
  if (count === 0) {
    await db.barberos.bulkAdd([
      { nombre: 'Barbero 1', porcentaje_comision: 0.5, activo: true },
      { nombre: 'Barbero 2', porcentaje_comision: 0.4, activo: true },
    ]);
    await db.servicios_productos.bulkAdd([
      { nombre: 'Corte Clásico', tipo: 'servicio', precio: 12 },
      { nombre: 'Corte + Barba', tipo: 'servicio', precio: 20 },
      { nombre: 'Corte + Barba + Ceja', tipo: 'servicio', precio: 24 },
      { nombre: 'Barba', tipo: 'servicio', precio: 8 },
      { nombre: 'Ceja', tipo: 'servicio', precio: 4 },
      { nombre: 'Barba + Ceja', tipo: 'servicio', precio: 12 },
      { nombre: 'Tinte', tipo: 'servicio', precio: 35 },
      { nombre: 'Champú', tipo: 'producto', precio: 18, stock_actual: 20, stock_minimo: 5 },
      { nombre: 'Cera para Cabello', tipo: 'producto', precio: 12, stock_actual: 15, stock_minimo: 3 },
    ]);
  }

  const countFondo = await db.fondo_caja.count();
  if (countFondo === 0) {
    await db.fondo_caja.add({
      fecha: new Date(),
      monto: 0,
      tipo: 'ingreso',
      motivo: 'Fondo de caja inicial'
    });
  }

  const countSocios = await db.socios.count();
  if (countSocios === 0) {
    await db.socios.bulkAdd([
      { nombre: 'Socio 1', porcentaje_utilidad: 0.5, activo: true, rol: 'Dueño' },
      { nombre: 'Socio 2', porcentaje_utilidad: 0.5, activo: true, rol: 'Socio' },
    ]);
  }
}
