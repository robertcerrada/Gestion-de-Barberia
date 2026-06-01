/**
 * infrastructure/repositories/fondo-caja.repository.ts
 */

import { db } from '@/lib/db';
import type { MovimientoFondo } from '@/domain/types';

export const fondoCajaRepository = {
  async getAll(): Promise<MovimientoFondo[]> {
    return db.fondo_caja.toArray();
  },

  async getRecientes(limit = 15): Promise<MovimientoFondo[]> {
    return db.fondo_caja.orderBy('fecha').reverse().limit(limit).toArray();
  },

  async save(movimiento: Omit<MovimientoFondo, 'id'>): Promise<number> {
    return db.fondo_caja.add(movimiento as MovimientoFondo);
  },

  /** Calcula el saldo actual del fondo sumando ingresos y restando egresos */
  async getSaldo(): Promise<number> {
    const movimientos = await db.fondo_caja.toArray();
    return movimientos.reduce(
      (sum, m) => sum + (m.tipo === 'ingreso' ? m.monto : -m.monto),
      0
    );
  },

  async bulkAdd(movimientos: MovimientoFondo[]): Promise<void> {
    await db.fondo_caja.bulkAdd(movimientos);
  },

  async clear(): Promise<void> {
    await db.fondo_caja.clear();
  },
};
