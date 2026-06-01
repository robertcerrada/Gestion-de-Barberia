'use client';
/**
 * features/gastos/useGasto.ts
 *
 * Lógica de estado del formulario de registro de gastos.
 * Extraído de ModalGasto en ScreenInicio.tsx.
 */

import { useState } from 'react';
import { db } from '@/lib/db';
import { isMesBloqueado } from '@/lib/business';
import type { CategoriaGasto } from '@/domain/types';

function fechaHoy(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

interface UseGastoOptions {
  fechaInicial?: string;
  gastoEditar?: any;
  onSuccess: () => void;
}

export function useGasto({ fechaInicial, gastoEditar, onSuccess }: UseGastoOptions) {
  const [fecha, setFecha]         = useState(gastoEditar ? (() => {
    const d = new Date(gastoEditar.fecha);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })() : (fechaInicial ?? fechaHoy()));
  const [categoria, setCategoria] = useState<CategoriaGasto>(gastoEditar?.categoria ?? 'otro');
  const [monto, setMonto]         = useState(gastoEditar ? String(gastoEditar.monto) : '');
  const [descripcion, setDescripcion] = useState(gastoEditar?.descripcion ?? '');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  async function guardar() {
    if (!monto || !descripcion || !fecha) { setError('Completá todos los campos.'); return; }
    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) { setError('Monto inválido.'); return; }

    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    const locked = await isMesBloqueado(fechaDate);
    if (locked) { setError('Este mes está cerrado.'); return; }

    setLoading(true);
    setError('');
    try {
      if (gastoEditar?.id) {
        await db.gastos_fijos.update(gastoEditar.id, {
          fecha: fechaDate,
          categoria,
          monto: valMonto,
          descripcion: descripcion.trim(),
        });
      } else {
        await db.gastos_fijos.add({
          fecha: fechaDate,
          categoria,
          monto: valMonto,
          descripcion: descripcion.trim(),
        });
      }
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 900);
    } catch (e) {
      setError('Error al guardar.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function eliminar(id: number, fechaReg: Date) {
    const locked = await isMesBloqueado(fechaReg);
    if (locked) { alert('Mes cerrado.'); return; }
    if (!confirm('¿Eliminar gasto?')) return;
    await db.gastos_fijos.delete(id);
    onSuccess();
  }

  return {
    fecha, setFecha,
    categoria, setCategoria,
    monto, setMonto,
    descripcion, setDescripcion,
    loading, success, error,
    guardar, eliminar,
  };
}
