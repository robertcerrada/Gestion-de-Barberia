/**
 * useMoneda.ts
 * Hook global para leer el símbolo de moneda configurado en Ajustes.
 *
 * Uso:
 *   const { simbolo, fmt } = useMoneda();
 *   fmt(1234.5)  →  "€1,234.50"
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfig } from './db';

const DEFAULT_SIMBOLO = '$';
export const MONEDA_CHANGE_EVENT = 'moneda-changed';

// ── Cache en módulo (compartida entre todas las instancias) ─────
let _simboloCached: string | null = null;

export function useMoneda() {
  const [simbolo, setSimbolo] = useState<string>(_simboloCached ?? DEFAULT_SIMBOLO);

  const cargar = useCallback(async () => {
    const v = await getConfig('moneda');
    const nuevo = v || DEFAULT_SIMBOLO;
    _simboloCached = nuevo;
    setSimbolo(nuevo);
  }, []);

  useEffect(() => {
    // Deferir la carga inicial para evitar llamadas sincronas a setState dentro del effect
    // (evita la regla react-hooks/set-state-in-effect)
    const cancelled = { current: false };
    const timer = setTimeout(() => {
      (async () => {
        try {
          const v = await getConfig('moneda');
          if (cancelled.current) return;
          const nuevo = v || DEFAULT_SIMBOLO;
          _simboloCached = nuevo;
          requestAnimationFrame(() => {
            if (!cancelled.current) setSimbolo(nuevo);
          });
        } catch (err) {
          console.warn('[useMoneda] Error cargando configuración de moneda:', err);
        }
      })();
    }, 0);

    // Escuchar cambios emitidos desde Ajustes
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ simbolo: string }>).detail;
      if (detail?.simbolo) {
        _simboloCached = detail.simbolo;
        requestAnimationFrame(() => {
          if (!cancelled.current) setSimbolo(detail.simbolo);
        });
      }
    };
    window.addEventListener(MONEDA_CHANGE_EVENT, handler);
    return () => {
      cancelled.current = true;
      clearTimeout(timer);
      window.removeEventListener(MONEDA_CHANGE_EVENT, handler);
    };
  }, [cargar]);

  /** Formatea un número con el símbolo activo.
   *  fmt(1234.5)  →  "€1,234.50"
   *  fmt(0)       →  "€0.00"
   */
  const fmt = useCallback(
    (n: number) => `${simbolo}${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    [simbolo]
  );

  return { simbolo, fmt };
}

/** Llama esto desde ModalFinanzas después de guardar para notificar a toda la app. */
export function emitirCambioMoneda(simbolo: string) {
  _simboloCached = simbolo;
  window.dispatchEvent(
    new CustomEvent(MONEDA_CHANGE_EVENT, { detail: { simbolo } })
  );
}
