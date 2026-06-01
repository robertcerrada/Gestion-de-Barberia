/**
 * infrastructure/repositories/gastos.repository.ts
 */

import { db } from '@/lib/db';
import { startOfDay, endOfDay } from '@/shared/utils/dates';
import type { GastoFijo } from '@/domain/types';

export const gastosRepository = {
  async getByFecha(fecha: Date): Promise<GastoFijo[]> {
    return db.gastos_fijos
      .where('fecha')
      .between(startOfDay(fecha), endOfDay(fecha), true, true)
      .toArray();
  },

  async getBetween(desde: Date, hasta: Date): Promise<GastoFijo[]> {
    return db.gastos_fijos
      .where('fecha')
      .between(desde, hasta, true, true)
      .toArray();
  },

  async getAll(): Promise<GastoFijo[]> {
    return db.gastos_fijos.toArray();
  },

  async save(gasto: Omit<GastoFijo, 'id'>): Promise<number> {
    return db.gastos_fijos.add(gasto as GastoFijo);
  },

  async update(id: number, changes: Partial<GastoFijo>): Promise<void> {
    await db.gastos_fijos.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.gastos_fijos.delete(id);
  },

  async deleteByFechaAndCategoria(fecha: Date, categoria: string): Promise<void> {
    const existentes = await db.gastos_fijos
      .where('fecha')
      .between(startOfDay(fecha), endOfDay(fecha), true, true)
      .and(g => g.categoria === categoria)
      .toArray();
    await Promise.all(existentes.map(g => db.gastos_fijos.delete(g.id!)));
  },

  async bulkAdd(gastos: GastoFijo[]): Promise<void> {
    await db.gastos_fijos.bulkAdd(gastos);
  },

  async clear(): Promise<void> {
    await db.gastos_fijos.clear();
  },
};
