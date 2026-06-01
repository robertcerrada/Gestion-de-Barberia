import { exportarTodosLosDatos as exportarTodosLosDatosImpl } from '@/lib/business';

/**
 * Clean Architecture: Case de uso (thin wrapper) para exportar todos los datos.
 * Mantiene comportamiento y firma, delegando a la implementación existente.
 */
export async function exportarTodosLosDatos() {
  return exportarTodosLosDatosImpl();
}

