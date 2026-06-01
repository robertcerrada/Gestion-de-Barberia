'use client';
/**
 * features/arqueo/useArqueo.ts
 *
 * Lógica del arqueo de caja diario.
 * Extraído de ModalArqueoCaja en ScreenInicio.tsx.
 */

import { useState } from 'react';
import { guardarArqueo, isMesBloqueado } from '@/lib/business';

function fechaHoy(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

interface UseArqueoOptions {
  fechaInicial?: string;
  onSuccess: () => void;
}

export interface ResultadoArqueo {
  debe_quedar: number;
  monto_efectivo: number;
  total_ventas: number;
  fondo_caja: number;
}

export function useArqueo({ fechaInicial, onSuccess }: UseArqueoOptions) {
  const [fecha, setFecha]       = useState(fechaInicial ?? fechaHoy());
  const [montoBanco, setMontoBanco] = useState('');
  const [notas, setNotas]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [resultado, setResultado] = useState<ResultadoArqueo | null>(null);
  const [error, setError]       = useState('');

  async function guardar() {
    if (!fecha) { setError('Seleccioná una fecha.'); return; }
    const val = parseFloat(montoBanco);
    if (isNaN(val) || val < 0) { setError('Ingresá el monto de banco válido.'); return; }

    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    const locked = await isMesBloqueado(fechaDate);
    if (locked) { setError('Este mes está cerrado.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await guardarArqueo(fechaDate, val, notas.trim() || undefined);
      setResultado(res);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 1500);
    } catch (e) {
      setError('Error al guardar el arqueo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return {
    fecha, setFecha,
    montoBanco, setMontoBanco,
    notas, setNotas,
    loading, success, resultado, error,
    guardar,
  };
}
