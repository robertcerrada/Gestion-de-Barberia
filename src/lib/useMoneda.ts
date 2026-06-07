/**
 * useMoneda.ts
 * Hook global para leer el símbolo de moneda configurado en Ajustes.
 *
 * La configuración se guarda con clave 'moneda_codigo' (ej: 'EUR').
 * Este hook convierte el código al símbolo correspondiente (ej: '€').
 *
 * Uso:
 *   const { simbolo, codigo, fmt } = useMoneda();
 *   fmt(1234.5)  →  "€1,234.50"
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfig } from './db';

export const MONEDA_CHANGE_EVENT = 'moneda-changed';

// Mapa código ISO → símbolo
export const MONEDA_SIMBOLOS: Record<string, string> = {
  USD: '$',
  ARS: '$',
  EUR: '€',
  BRL: 'R$',
  COP: '$',
  MXN: '$',
  CLP: '$',
  UYU: '$',
  PEN: 'S/.',
};

const DEFAULT_CODIGO = 'USD';
const DEFAULT_SIMBOLO = '$';

/** Convierte código ISO al símbolo de moneda */
export function codigoASimboloMoneda(codigo: string): string {
  return MONEDA_SIMBOLOS[codigo] ?? DEFAULT_SIMBOLO;
}

// ── Cache en módulo (compartida entre todas las instancias) ─────
let _codigoCached: string | null = null;

export function useMoneda() {
  const [codigo, setCodigo] = useState<string>(_codigoCached ?? DEFAULT_CODIGO);
  const simbolo = codigoASimboloMoneda(codigo);

  useEffect(() => {
    const cancelled = { current: false };
    const timer = setTimeout(() => {
      (async () => {
        try {
          // Leer la clave unificada 'moneda_codigo'
          const v = await getConfig('moneda_codigo');
          if (cancelled.current) return;
          const nuevoCodigo = v || DEFAULT_CODIGO;
          _codigoCached = nuevoCodigo;
          requestAnimationFrame(() => {
            if (!cancelled.current) setCodigo(nuevoCodigo);
          });
        } catch (err) {
          console.warn('[useMoneda] Error cargando configuración de moneda:', err);
        }
      })();
    }, 0);

    // Escuchar cambios emitidos desde Ajustes
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ codigo: string }>).detail;
      if (detail?.codigo) {
        _codigoCached = detail.codigo;
        requestAnimationFrame(() => {
          if (!cancelled.current) setCodigo(detail.codigo);
        });
      }
    };
    window.addEventListener(MONEDA_CHANGE_EVENT, handler);
    return () => {
      cancelled.current = true;
      clearTimeout(timer);
      window.removeEventListener(MONEDA_CHANGE_EVENT, handler);
    };
  }, []);

  /**
   * Formatea un número con el símbolo activo.
   * fmt(1234.5)  →  "€1,234.50"
   * fmt(0)       →  "€0.00"
   */
  const fmt = useCallback(
    (n: number) => {
      const safe = typeof n === 'number' && isFinite(n) ? n : 0;
      return simbolo + safe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    [simbolo]
  );

  return { simbolo, codigo, fmt };
}

/**
 * Llama esto desde ModalFinanzas después de guardar para notificar a toda la app.
 * Recibe el CÓDIGO ISO (ej: 'EUR'), no el símbolo.
 */
export function emitirCambioMoneda(codigoISO: string) {
  _codigoCached = codigoISO;
  window.dispatchEvent(
    new CustomEvent(MONEDA_CHANGE_EVENT, { detail: { codigo: codigoISO } })
  );
}
