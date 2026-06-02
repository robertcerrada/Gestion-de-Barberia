'use client';
/**
 * features/ventas/useVenta.ts
 *
 * Lógica de estado del formulario de nueva venta / edición.
 * REGLA: No importa `db` directamente — usa repositorios y casos de uso.
 */

import { useState, useCallback } from 'react';
import { ventasRepository } from '@/infrastructure/repositories/ventas.repository';
import { serviciosRepository } from '@/infrastructure/repositories/servicios.repository';
import { isMesBloqueado } from '@/application/meses/mesesService';
import type { ServicioProducto } from '@/domain/types';

export interface LineaVenta {
  id: string;
  itemId: string;
  monto: string;
  cantidad: number;
}

function nuevaLinea(): LineaVenta {
  return { id: crypto.randomUUID(), itemId: '', monto: '', cantidad: 1 };
}

function fechaHoy(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

interface UseVentaOptions {
  servicios: ServicioProducto[];
  fechaInicial?: string;
  registroEditar?: any;
  onSuccess: () => void;
}

export function useVenta({ servicios, fechaInicial, registroEditar, onSuccess }: UseVentaOptions) {
  const [barberoId, setBarberoId] = useState(registroEditar ? String(registroEditar.barbero_id) : '');
  const [metodo, setMetodo]       = useState<'efectivo' | 'banco'>(registroEditar?.metodo_pago ?? 'efectivo');
  const [fecha, setFecha]         = useState(fechaInicial ?? fechaHoy());
  const [lineas, setLineas]       = useState<LineaVenta[]>(() => {
    if (registroEditar) {
      return [{ id: crypto.randomUUID(), itemId: String(registroEditar.item_id), monto: String(registroEditar.monto_total), cantidad: 1 }];
    }
    return [nuevaLinea()];
  });
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError]             = useState('');

  const setLineaItemId = useCallback((lineaId: string, itemId: string) => {
    const item = servicios.find(s => String(s.id) === itemId);
    setLineas(prev => prev.map(l =>
      l.id === lineaId ? { ...l, itemId, monto: item ? String(item.precio) : '' } : l
    ));
  }, [servicios]);

  const setLineaMonto    = useCallback((lineaId: string, monto: string) =>
    setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, monto } : l)), []);

  const setLineaCantidad = useCallback((lineaId: string, cantidad: number) =>
    setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, cantidad } : l)), []);

  const agregarLinea  = useCallback(() => setLineas(prev => [...prev, nuevaLinea()]), []);
  const eliminarLinea = useCallback((lineaId: string) =>
    setLineas(prev => prev.length > 1 ? prev.filter(l => l.id !== lineaId) : prev), []);

  const todasProducto = lineas.every(l => servicios.find(s => String(s.id) === l.itemId)?.tipo === 'producto');
  const algunaServicio = lineas.some(l => servicios.find(s => String(s.id) === l.itemId)?.tipo === 'servicio');

  const montoTotal = lineas.reduce((sum, l) => {
    const v = parseFloat(l.monto);
    return sum + (isNaN(v) ? 0 : v * l.cantidad);
  }, 0);

  async function guardar() {
    if (!fecha) { setError('Seleccioná una fecha.'); return; }
    if (!barberoId && !todasProducto) { setError('Seleccioná un barbero.'); return; }
    const lineasValidas = lineas.filter(l => l.itemId && l.monto && parseFloat(l.monto) > 0);
    if (!lineasValidas.length) { setError('Agregá al menos un ítem válido.'); return; }

    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);

    if (await isMesBloqueado(fechaDate)) { setError('Este mes está cerrado.'); return; }

    setLoading(true);
    setError('');
    try {
      if (registroEditar?.id) {
        const linea = lineasValidas[0];
        const item = servicios.find(s => String(s.id) === linea.itemId);
        if (!item?.id) { setError('Ítem no encontrado.'); return; }

        // Restaurar stock si cambió el ítem
        const regAnterior = await ventasRepository.get(registroEditar.id);
        if (regAnterior && regAnterior.item_id !== item.id) {
          const itemAnterior = await serviciosRepository.get(regAnterior.item_id);
          if (itemAnterior?.tipo === 'producto' && itemAnterior.id) {
            await serviciosRepository.update(itemAnterior.id, { stock_actual: (itemAnterior.stock_actual || 0) + 1 });
          }
          if (item.tipo === 'producto' && item.id) {
            if ((item.stock_actual ?? 0) < 1) { setError(`Sin stock de "${item.nombre}".`); return; }
            await serviciosRepository.update(item.id, { stock_actual: (item.stock_actual || 0) - 1 });
          }
        }

        await ventasRepository.update(registroEditar.id, {
          fecha: fechaDate,
          barbero_id: barberoId ? parseInt(barberoId) : 0,
          item_id: item.id,
          monto_total: parseFloat(linea.monto) * linea.cantidad,
          metodo_pago: metodo,
        });
      } else {
        // Validar stock de todos los productos primero (fail-fast)
        for (const linea of lineasValidas) {
          const item = servicios.find(s => String(s.id) === linea.itemId);
          if (item?.tipo === 'producto' && item.id) {
            if ((item.stock_actual ?? 0) < linea.cantidad) {
              setError(`Sin stock suficiente de "${item.nombre}".`);
              return;
            }
          }
        }
        // Construir todos los registros en memoria y hacer un solo bulkAdd
        const registrosNuevos: Omit<import('@/domain/types').RegistroDiario, 'id'>[] = [];
        const actualizacionesStock: { id: number; stock_actual: number }[] = [];
        for (const linea of lineasValidas) {
          const item = servicios.find(s => String(s.id) === linea.itemId);
          if (!item?.id) continue;
          if (item.tipo === 'producto') {
            actualizacionesStock.push({ id: item.id, stock_actual: (item.stock_actual || 0) - linea.cantidad });
          }
          for (let i = 0; i < linea.cantidad; i++) {
            registrosNuevos.push({
              fecha: fechaDate,
              barbero_id: barberoId ? parseInt(barberoId) : 0,
              item_id: item.id,
              monto_total: parseFloat(linea.monto),
              metodo_pago: metodo,
            });
          }
        }
        // Una sola escritura a IndexedDB en lugar de N escrituras en loop
        await Promise.all([
          ventasRepository.bulkSave(registrosNuevos),
          ...actualizacionesStock.map(u => serviciosRepository.update(u.id, { stock_actual: u.stock_actual })),
        ]);
      }

      setSuccess(true);
      setSuccessCount(c => c + 1);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 900);
    } catch (e) {
      setError('Error al guardar. Intentá de nuevo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function eliminar(id: number, fechaReg: Date) {
    if (await isMesBloqueado(fechaReg)) { alert('Este mes está cerrado.'); return; }
    if (!confirm('¿Eliminar este registro de venta?')) return;
    const reg = await ventasRepository.get(id);
    if (reg) {
      const item = await serviciosRepository.get(reg.item_id);
      if (item?.tipo === 'producto' && item.id) {
        await serviciosRepository.update(item.id, { stock_actual: (item.stock_actual || 0) + 1 });
      }
    }
    await ventasRepository.delete(id);
    onSuccess();
  }

  return {
    barberoId, setBarberoId,
    metodo, setMetodo,
    fecha, setFecha,
    lineas,
    loading, success, successCount, error,
    setLineaItemId, setLineaMonto, setLineaCantidad,
    agregarLinea, eliminarLinea,
    algunaServicio, todasProducto, montoTotal,
    guardar, eliminar,
  };
}
