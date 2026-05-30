/**
 * dates.ts — Helpers de fecha centralizados.
 *
 * Extraídos de business.ts. Funciones puras sin dependencias externas
 * más allá de date-fns.
 */

import { format, startOfMonth, endOfMonth } from 'date-fns';

/** Retorna el string "MM-yyyy" para una fecha dada */
export function getMesAno(fecha: Date = new Date()): string {
  return format(fecha, 'MM-yyyy');
}

/** Inicio del día (00:00:00) */
export function startOfDay(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
}

/** Fin del día (23:59:59) */
export function endOfDay(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
}

/** Re-exporta los helpers de date-fns que usa la app para un único punto de importación */
export { startOfMonth, endOfMonth };

/** Nombres de meses en español (índice 0 = Enero) */
export const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
