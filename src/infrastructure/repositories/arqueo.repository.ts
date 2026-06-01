/**
 * infrastructure/repositories/arqueo.repository.ts
 */

import { db } from '@/lib/db';
import { startOfDay, endOfDay } from '@/shared/utils/dates';
import type { ArqueoCaja } from '@/domain/types';

export const arqueoRepository = {
  async getByFecha(fecha: Date): Promise<ArqueoCaja | null> {
    const result = await db.arqueo_caja
      .where('fecha')
      .between(startOfDay(fecha), endOfDay(fecha), true, true)
      .first();
    return result ?? null;
  },

  async getBetween(desde: Date, hasta: Date): Promise<ArqueoCaja[]> {
    return db.arqueo_caja
      .where('fecha')
      .between(desde, hasta, true, true)
      .toArray();
  },

  async getAll(): Promise<ArqueoCaja[]> {
    return db.arqueo_caja.toArray();
  },

  async upsert(fecha: Date, datos: Omit<ArqueoCaja, 'id'>): Promise<void> {
    const existente = await this.getByFecha(fecha);
    if (existente?.id) {
      await db.arqueo_caja.update(existente.id, datos);
    } else {
      await db.arqueo_caja.add(datos as ArqueoCaja);
    }
  },

  async bulkAdd(arqueos: ArqueoCaja[]): Promise<void> {
    await db.arqueo_caja.bulkAdd(arqueos);
  },

  async clear(): Promise<void> {
    await db.arqueo_caja.clear();
  },
};
