/**
 * sanitize.ts — Funciones puras de sanitización y validación.
 *
 * Extraídas de business.ts. Son funciones PURAS: sin efectos secundarios,
 * sin acceso a DB, testeables de forma aislada.
 */

/** Elimina tags HTML/script para prevenir XSS e inyección */
export function sanitizeText(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().slice(0, 500);
}

/** Coerciona a número dentro de un rango válido */
export function sanitizeNumber(val: unknown, min = 0, max = 9_999_999): number {
  const n = Number(val);
  if (!isFinite(n)) return 0;
  return Math.min(Math.max(n, min), max);
}

/** Valida y normaliza un MIME type */
export function sanitizeMimeType(val: unknown): string {
  if (typeof val !== 'string') return '';
  const normalized = val.trim().toLowerCase();
  if (/^[a-z]+\/[a-z0-9.+-]+$/.test(normalized)) return normalized;
  return '';
}

/** Verifica que un string sea Base64 válido */
export function isValidBase64(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const cleaned = val.trim();
  if (cleaned.length === 0 || cleaned.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(cleaned);
}

/** Convierte cualquier valor a Date de forma segura */
export function toDate(val: unknown): Date {
  if (val instanceof Date) return val;
  if (typeof val === 'string' && val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Serializa fechas a ISO string en un array de objetos */
export function serializarFechas<T extends object>(arr: T[]): any[] {
  return arr.map(obj => {
    const copy: any = { ...obj };
    for (const key of Object.keys(copy)) {
      if (copy[key] instanceof Date) copy[key] = copy[key].toISOString();
    }
    return copy;
  });
}
