/**
 * infrastructure/repositories/adelantos.repository.ts
 */

import { db } from '@/lib/db';
import { startOfDay, endOfDay } from '@/shared/utils/dates';
import type { Adelanto } from '@/domain/types';

export const adelantosRepository = {
  async getByFecha(fecha: Date): Promise<Adelanto[]> {
    return db.Adelantos
      .where('fecha')
      .between(startOfDay(fecha), endOfDay(fecha), true, true)
      .toArray();
  },

  async getBetween(desde: Date, hasta: Date): Promise<Adelanto[]> {
    return db.Adelantos
      .where('fecha')
      .between(desde, hasta, true, true)
      .toArray();
  },

  async getByBarbero(barberoId: number): Promise<Adelanto[]> {
    return db.Adelantos.where('barbero_id').equals(barberoId).toArray();
  },

  async getAll(): Promise<Adelanto[]> {
    return db.Adelantos.toArray();
  },

  async save(adelanto: Omit<Adelanto, 'id'>): Promise<number> {
    return db.Adelantos.add(adelanto as Adelanto);
  },

  async update(id: number, changes: Partial<Adelanto>): Promise<void> {
    await db.Adelantos.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.Adelantos.delete(id);
  },

  async bulkAdd(adelantos: Adelanto[]): Promise<void> {
    await db.Adelantos.bulkAdd(adelantos);
  },

  async clear(): Promise<void> {
    await db.Adelantos.clear();
  },
};
