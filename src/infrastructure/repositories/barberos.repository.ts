/**
 * infrastructure/repositories/barberos.repository.ts
 *
 * Acceso a datos para la entidad Barbero.
 * Encapsula toda interacción con db.barberos.
 */

import { db } from '@/lib/db';
import type { Barbero } from '@/domain/types';

export const barberosRepository = {
  async getAll(): Promise<Barbero[]> {
    return db.barberos.toArray();
  },

  async getActivos(): Promise<Barbero[]> {
    return db.barberos.filter(b => b.activo).toArray();
  },

  async get(id: number): Promise<Barbero | undefined> {
    return db.barberos.get(id);
  },

  async save(barbero: Omit<Barbero, 'id'>): Promise<number> {
    return db.barberos.add(barbero as Barbero);
  },

  async update(id: number, changes: Partial<Barbero>): Promise<void> {
    await db.barberos.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.barberos.delete(id);
  },

  async count(): Promise<number> {
    return db.barberos.count();
  },

  async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    const normalizado = nombre.trim().toLowerCase();
    const todos = await db.barberos.toArray();
    return todos.some(b => b.nombre.toLowerCase() === normalizado && b.id !== excludeId);
  },

  async bulkAdd(barberos: Barbero[]): Promise<void> {
    await db.barberos.bulkAdd(barberos);
  },

  async clear(): Promise<void> {
    await db.barberos.clear();
  },
};
