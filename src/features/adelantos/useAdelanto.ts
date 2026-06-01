'use client';
/**
 * features/adelantos/useAdelanto.ts
 *
 * Lógica de estado para el formulario de adelantos y pagos.
 * REGLA: No importa `db` directamente — usa repositorios y casos de uso.
 */

import { useState } from 'react';
import { adelantosRepository } from '@/infrastructure/repositories/adelantos.repository';
import { isMesBloqueado } from '@/application/meses/mesesService';

function fechaHoy(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

interface UseAdelantoOptions {
  fechaInicial?: string;
  adelantoEditar?: any;
  onSuccess: () => void;
}

export function useAdelanto({ fechaInicial, adelantoEditar, onSuccess }: UseAdelantoOptions) {
  const [fecha, setFecha]                   = useState(fechaInicial ?? fechaHoy());
  const [destinatarioId, setDestinatarioId] = useState(adelantoEditar ? String(adelantoEditar.barbero_id) : '');
  const [tipo, setTipo]                     = useState<'barbero' | 'socio' | 'devolucion_socio'>(
    adelantoEditar?.destinatario_tipo ?? 'barbero'
  );
  const [monto, setMonto]     = useState(adelantoEditar ? String(adelantoEditar.monto) : '');
  const [motivo, setMotivo]   = useState(adelantoEditar?.motivo ?? '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  async function guardar() {
    if (!monto || !motivo || !fecha || !destinatarioId) {
      setError('Completá todos los campos.');
      return;
    }
    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto === 0) { setError('Monto inválido.'); return; }

    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);

    if (await isMesBloqueado(fechaDate)) { setError('Este mes está cerrado.'); return; }

    setLoading(true);
    setError('');
    try {
      const datos = {
        fecha: fechaDate,
        barbero_id: parseInt(destinatarioId),
        monto: valMonto,
        motivo: motivo.trim(),
        destinatario_tipo: tipo,
        ...(tipo === 'socio' || tipo === 'devolucion_socio'
          ? { socio_id: parseInt(destinatarioId) }
          : {}),
      };

      if (adelantoEditar?.id) {
        await adelantosRepository.update(adelantoEditar.id, datos);
      } else {
        await adelantosRepository.save(datos);
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
    if (await isMesBloqueado(fechaReg)) { alert('Mes cerrado.'); return; }
    if (!confirm('¿Eliminar este adelanto?')) return;
    await adelantosRepository.delete(id);
    onSuccess();
  }

  return {
    fecha, setFecha,
    destinatarioId, setDestinatarioId,
    tipo, setTipo,
    monto, setMonto,
    motivo, setMotivo,
    loading, success, error,
    guardar, eliminar,
  };
}
