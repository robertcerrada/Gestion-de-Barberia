/**
 * infrastructure/repositories/config.repository.ts
 *
 * Encapsula todo acceso a la tabla config_barberia.
 * Reemplaza las funciones getConfig / setConfig de lib/db.ts.
 * Los nuevos features deben importar desde aquí.
 */

import { db } from '@/lib/db';
import type { ConfigBarberia } from '@/domain/types';

export const configRepository = {
  async get(clave: string): Promise<string | null> {
    const row = await db.config_barberia.where('clave').equals(clave).first();
    return row?.valor ?? null;
  },

  async set(clave: string, valor: string): Promise<void> {
    const existing = await db.config_barberia.where('clave').equals(clave).first();
    if (existing?.id) {
      await db.config_barberia.update(existing.id, { valor });
    } else {
      await db.config_barberia.add({ clave, valor });
    }
  },

  async getAll(): Promise<ConfigBarberia[]> {
    return db.config_barberia.toArray();
  },

  async bulkAdd(items: ConfigBarberia[]): Promise<void> {
    await db.config_barberia.bulkAdd(items);
  },

  async clear(): Promise<void> {
    await db.config_barberia.clear();
  },
};
