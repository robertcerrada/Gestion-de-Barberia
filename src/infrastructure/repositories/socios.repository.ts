/**
 * infrastructure/repositories/socios.repository.ts
 */

import { db } from '@/lib/db';
import type { Socio } from '@/domain/types';

export const sociosRepository = {
  async getAll(): Promise<Socio[]> {
    return db.socios.orderBy('nombre').toArray();
  },

  async getActivos(): Promise<Socio[]> {
    return db.socios.filter(s => s.activo).toArray();
  },

  async get(id: number): Promise<Socio | undefined> {
    return db.socios.get(id);
  },

  async save(socio: Omit<Socio, 'id'>): Promise<number> {
    return db.socios.add(socio as Socio);
  },

  async update(id: number, changes: Partial<Socio>): Promise<void> {
    await db.socios.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.socios.delete(id);
  },

  async count(): Promise<number> {
    return db.socios.count();
  },

  async existeNombre(nombre: string, excludeId?: number): Promise<boolean> {
    const normalizado = nombre.trim().toLowerCase();
    const todos = await db.socios.toArray();
    return todos.some(s => s.nombre.toLowerCase() === normalizado && s.id !== excludeId);
  },

  async bulkAdd(socios: Socio[]): Promise<void> {
    await db.socios.bulkAdd(socios);
  },

  async clear(): Promise<void> {
    await db.socios.clear();
  },
};
