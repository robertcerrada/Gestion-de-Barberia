/**
 * infrastructure/repositories/ventas.repository.ts
 *
 * Acceso a datos para RegistroDiario. Toda query a la tabla
 * registros_diarios pasa por aquí — los componentes y servicios
 * nunca importan `db` directamente.
 */

import { db } from '@/lib/db';
import { startOfDay, endOfDay } from '@/shared/utils/dates';
import type { RegistroDiario } from '@/domain/types';

export const ventasRepository = {
  /** Registros de un día específico */
  async getByFecha(fecha: Date): Promise<RegistroDiario[]> {
    return db.registros_diarios
      .where('fecha')
      .between(startOfDay(fecha), endOfDay(fecha), true, true)
      .toArray();
  },

  /** Registros entre dos fechas */
  async getBetween(desde: Date, hasta: Date): Promise<RegistroDiario[]> {
    return db.registros_diarios
      .where('fecha')
      .between(desde, hasta, true, true)
      .toArray();
  },

  /** Todos los registros (para backup/export) */
  async getAll(): Promise<RegistroDiario[]> {
    return db.registros_diarios.toArray();
  },

  async save(registro: Omit<RegistroDiario, 'id'>): Promise<number> {
    return db.registros_diarios.add(registro as RegistroDiario);
  },

  async update(id: number, changes: Partial<RegistroDiario>): Promise<void> {
    await db.registros_diarios.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.registros_diarios.delete(id);
  },

  async get(id: number): Promise<RegistroDiario | undefined> {
    return db.registros_diarios.get(id);
  },

  async bulkAdd(registros: RegistroDiario[]): Promise<void> {
    await db.registros_diarios.bulkAdd(registros);
  },

  /** Primer registro ordenado por fecha (para detectar inicio de actividad) */
  async getFirst(): Promise<RegistroDiario | undefined> {
    return db.registros_diarios.orderBy('fecha').first();
  },

  /** Cuenta registros en un rango de fechas */
  async countBetween(desde: Date, hasta: Date): Promise<number> {
    return db.registros_diarios
      .where('fecha')
      .between(desde, hasta, true, true)
      .count();
  },

  async clear(): Promise<void> {
    await db.registros_diarios.clear();
  },
};
