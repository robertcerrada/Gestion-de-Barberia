import { restaurarDesdeDatos as restaurarDesdeDatosImpl } from '@/lib/business';

/**
 * Clean Architecture: Case de uso (thin wrapper) para restaurar datos desde un JSON.
 * Mantiene comportamiento y firma, delegando a la implementación existente.
 */
export async function restaurarDesdeDatos(jsonStr: string) {
  return restaurarDesdeDatosImpl(jsonStr);
}

