import { getArqueoDia as getArqueoDiaImpl } from '@/lib/business';

/**
 * Clean Architecture: Case de uso para obtener arqueo de caja por fecha.
 * Thin wrapper para mantener comportamiento sin cambios.
 */
export async function getArqueoDia(fecha: Date) {
  return getArqueoDiaImpl(fecha);
}

