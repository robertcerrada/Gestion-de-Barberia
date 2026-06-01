/**
 * lib/db.ts — Capa de infraestructura: definición de la base de datos IndexedDB.
 *
 * REGLA: Este archivo solo define el schema de Dexie y las operaciones de
 * configuración básica (getConfig / setConfig / seedInitialData).
 * Toda lógica de negocio vive en lib/business.ts y application/.
 * Los tipos de entidad se importan desde domain/types.ts — única fuente de verdad.
 */
import Dexie, { type Table } from 'dexie';
import type {
  Barbero,
  ServicioProducto,
  RegistroDiario,
  Adelanto,
  GastoFijo,
  HistoricoCierre,
  ConfigBarberia,
  Socio,
  MovimientoFondo,
  ArqueoCaja,
  DocumentoBarbero,
} from '@/domain/types';

// Re-exportar desde domain para compatibilidad con imports existentes.
// Los screens deben migrar gradualmente a importar desde @/domain directamente.
export type {
  Barbero,
  ServicioProducto,
  RegistroDiario,
  Adelanto,
  GastoFijo,
  HistoricoCierre,
  ConfigBarberia,
  Socio,
  MovimientoFondo,
  ArqueoCaja,
  DocumentoBarbero,
  TipoDocumento,
} from '@/domain/types';

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
  console.log('[db] seedInitialData started');
  try {
    const count = await db.barberos.count();
    console.log('[db] barberos count:', count);
    if (count === 0) {
      console.log('[db] seeding barberos...');
      await db.barberos.bulkAdd([
        { nombre: 'Barbero 1', porcentaje_comision: 0.5, activo: true },
        { nombre: 'Barbero 2', porcentaje_comision: 0.4, activo: true },
      ]);
      console.log('[db] barberos seeded');
      console.log('[db] seeding servicios...');
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
      console.log('[db] servicios seeded');
    }

    const countFondo = await db.fondo_caja.count();
    console.log('[db] fondo_caja count:', countFondo);
    if (countFondo === 0) {
      console.log('[db] seeding fondo_caja...');
      await db.fondo_caja.add({
        fecha: new Date(),
        monto: 0,
        tipo: 'ingreso',
        motivo: 'Fondo de caja inicial'
      });
      console.log('[db] fondo_caja seeded');
    }

    const countSocios = await db.socios.count();
    console.log('[db] socios count:', countSocios);
    if (countSocios === 0) {
      console.log('[db] seeding socios...');
      await db.socios.bulkAdd([
        { nombre: 'Socio 1', porcentaje_utilidad: 0.5, activo: true, rol: 'Dueño' },
        { nombre: 'Socio 2', porcentaje_utilidad: 0.5, activo: true, rol: 'Socio' },
      ]);
      console.log('[db] socios seeded');
    }
    console.log('[db] seedInitialData completed');
  } catch (e) {
    console.error('[db] error in seedInitialData:', e);
    throw e;
  }
}
