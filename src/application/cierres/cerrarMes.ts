import { cerrarMes as cerrarMesImpl } from '@/lib/business';

/**
 * Clean Architecture: Case de uso para cerrar el mes.
 * Thin wrapper para mantener comportamiento sin cambios.
 */
export async function cerrarMes(mes?: Date) {
  return cerrarMesImpl(mes ?? new Date());
}

