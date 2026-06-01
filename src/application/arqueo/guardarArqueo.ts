import { guardarArqueo as guardarArqueoImpl } from '@/lib/business';

/**
 * Clean Architecture: Case de uso para guardar arqueo de caja.
 * Thin wrapper para mantener comportamiento sin cambios.
 */
export async function guardarArqueo(
  fecha: Date,
  montoBanco: number,
  notas?: string
) {
  return guardarArqueoImpl(fecha, montoBanco, notas);
}

