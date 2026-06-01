/**
 * infrastructure/repositories/servicios.repository.ts
 */

import { db } from '@/lib/db';
import type { ServicioProducto } from '@/domain/types';

export const serviciosRepository = {
  async getAll(): Promise<ServicioProducto[]> {
    return db.servicios_productos.toArray();
  },

  async getServicios(): Promise<ServicioProducto[]> {
    return db.servicios_productos.filter(s => s.tipo === 'servicio').toArray();
  },

  async getProductos(): Promise<ServicioProducto[]> {
    return db.servicios_productos.filter(s => s.tipo === 'producto').toArray();
  },

  async get(id: number): Promise<ServicioProducto | undefined> {
    return db.servicios_productos.get(id);
  },

  async save(item: Omit<ServicioProducto, 'id'>): Promise<number> {
    return db.servicios_productos.add(item as ServicioProducto);
  },

  async update(id: number, changes: Partial<ServicioProducto>): Promise<void> {
    await db.servicios_productos.update(id, changes);
  },

  async delete(id: number): Promise<void> {
    await db.servicios_productos.delete(id);
  },

  async decrementarStock(id: number, cantidad = 1): Promise<void> {
    const item = await db.servicios_productos.get(id);
    if (item?.stock_actual !== undefined && item.stock_actual >= cantidad) {
      await db.servicios_productos.update(id, {
        stock_actual: item.stock_actual - cantidad,
      });
    }
  },

  async incrementarStock(id: number, cantidad = 1): Promise<void> {
    const item = await db.servicios_productos.get(id);
    if (item?.stock_actual !== undefined) {
      await db.servicios_productos.update(id, {
        stock_actual: item.stock_actual + cantidad,
      });
    }
  },

  async count(): Promise<number> {
    return db.servicios_productos.count();
  },

  async bulkAdd(items: ServicioProducto[]): Promise<void> {
    await db.servicios_productos.bulkAdd(items);
  },

  async clear(): Promise<void> {
    await db.servicios_productos.clear();
  },
};
