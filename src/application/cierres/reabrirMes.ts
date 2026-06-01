import { reabrirMes as reabrirMesImpl } from '@/lib/business';

/**
 * Clean Architecture: Case de uso para reabrir el mes.
 * Thin wrapper para mantener comportamiento sin cambios.
 */
export async function reabrirMes(mes: Date) {
  return reabrirMesImpl(mes);
}

