/**
 * shared/utils/currency.ts
 *
 * Utilidad pura de formateo de moneda.
 * Centraliza la lógica que estaba duplicada en cada Screen como
 * `function formatCurrency(n, simbolo)` y `const fc = (n) => formatCurrency(n, simbolo)`.
 */

/**
 * Formatea un número con símbolo de moneda.
 * Muestra hasta 3 decimales solo cuando es necesario (e.g. comisiones).
 *
 * @example
 * formatCurrency(1234.5, '€')   → '€1234.50'
 * formatCurrency(1234.567, '$') → '$1234.567'
 * formatCurrency(NaN, 'ARS')   → 'ARS0.00'
 */
export function formatCurrency(n: number, simbolo = '€'): string {
  const safe = typeof n === 'number' && isFinite(n) ? n : 0;
  const fixed3 = safe.toFixed(3);
  return `${simbolo}${fixed3.endsWith('0') ? safe.toFixed(2) : fixed3}`;
}

/**
 * Crea una función de formateo con el símbolo fijo.
 * Uso: const fc = makeCurrencyFormatter('ARS'); fc(1200) → 'ARS1200.00'
 */
export function makeCurrencyFormatter(simbolo: string) {
  return (n: number) => formatCurrency(n, simbolo);
}
