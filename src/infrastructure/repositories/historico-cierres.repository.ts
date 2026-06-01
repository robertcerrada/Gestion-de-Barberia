/**
 * infrastructure/repositories/historico-cierres.repository.ts
 */

import { db } from '@/lib/db';
import type { HistoricoCierre } from '@/domain/types';

export const historicoCierresRepository = {
  async getAll(): Promise<HistoricoCierre[]> {
    return db.historico_cierres.toArray();
  },

  async getByMesAno(mesAno: string): Promise<HistoricoCierre | null> {
    const result = await db.historico_cierres
      .where('mes_ano')
      .equals(mesAno)
      .first();
    return result ?? null;
  },

  async esBloqueado(mesAno: string): Promise<boolean> {
    const cierre = await this.getByMesAno(mesAno);
    return cierre?.bloqueado ?? false;
  },

  async upsert(mesAno: string, datos: Omit<HistoricoCierre, 'id'>): Promise<void> {
    const existente = await this.getByMesAno(mesAno);
    if (existente?.id) {
      await db.historico_cierres.update(existente.id, datos);
    } else {
      await db.historico_cierres.add(datos as HistoricoCierre);
    }
  },

  async setBloqueo(mesAno: string, bloqueado: boolean): Promise<void> {
    const cierre = await this.getByMesAno(mesAno);
    if (!cierre?.id) throw new Error(`No se encontró cierre para ${mesAno}`);
    await db.historico_cierres.update(cierre.id, { bloqueado });
  },

  async bulkAdd(cierres: HistoricoCierre[]): Promise<void> {
    await db.historico_cierres.bulkAdd(cierres);
  },

  async save(datos: Omit<HistoricoCierre, 'id'>): Promise<number> {
    return db.historico_cierres.add(datos as HistoricoCierre);
  },

  async update(id: number, changes: Partial<HistoricoCierre>): Promise<void> {
    await db.historico_cierres.update(id, changes);
  },

  async clear(): Promise<void> {
    await db.historico_cierres.clear();
  },
};
