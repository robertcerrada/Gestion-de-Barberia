/**
 * application/resumen/resumenService.ts
 *
 * Casos de uso: resúmenes financieros del mes.
 */

import { startOfMonth, endOfMonth } from 'date-fns';
import { ventasRepository } from '@/infrastructure/repositories/ventas.repository';
import { gastosRepository } from '@/infrastructure/repositories/gastos.repository';
import { arqueoRepository } from '@/infrastructure/repositories/arqueo.repository';
import { sociosRepository } from '@/infrastructure/repositories/socios.repository';
import {
  getComisionesTotalesMes,
  getPagosSocioMes,
  calcularComisionBancaria,
} from '@/application/comisiones/comisionesService';
import type { ResumenMes, MetodosPagoMes } from '@/domain/types';

export async function getIngresosTotalesMes(mes: Date = new Date()): Promise<number> {
  const registros = await ventasRepository.getBetween(startOfMonth(mes), endOfMonth(mes));
  return registros.reduce((sum, r) => sum + r.monto_total, 0);
}

export async function getGastosTotalesMes(mes: Date = new Date()): Promise<number> {
  const gastos = await gastosRepository.getBetween(startOfMonth(mes), endOfMonth(mes));
  return gastos.reduce((sum, g) => sum + g.monto, 0);
}

export async function getIngresosEfectivoMes(mes: Date = new Date()): Promise<number> {
  const registros = await ventasRepository.getBetween(startOfMonth(mes), endOfMonth(mes));
  return registros
    .filter(r => r.metodo_pago === 'efectivo')
    .reduce((sum, r) => sum + r.monto_total, 0);
}

export async function getMetodosPagoMes(mes: Date = new Date()): Promise<MetodosPagoMes> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const diasEnMes = fin.getDate();

  const [registros, arqueos] = await Promise.all([
    ventasRepository.getBetween(inicio, fin),
    arqueoRepository.getBetween(inicio, fin),
  ]);

  const total = registros.reduce((s, r) => s + r.monto_total, 0);
  let bancoPorArqueo = 0;
  let bancoPorRegistros = 0;

  for (let d = 1; d <= diasEnMes; d++) {
    const inicioD = new Date(mes.getFullYear(), mes.getMonth(), d, 0, 0, 0, 0);
    const finD    = new Date(mes.getFullYear(), mes.getMonth(), d, 23, 59, 59, 999);

    const arqueo = arqueos.find(a => {
      const fa = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
      return fa >= inicioD && fa <= finD;
    });

    if (arqueo) {
      bancoPorArqueo += arqueo.monto_banco;
    } else {
      bancoPorRegistros += registros
        .filter(r => r.fecha >= inicioD && r.fecha <= finD && r.metodo_pago === 'banco')
        .reduce((s, r) => s + r.monto_total, 0);
    }
  }

  const banco = bancoPorArqueo + bancoPorRegistros;
  const efectivo = Math.max(0, total - banco);
  const comisionBancaria = await calcularComisionBancaria(banco);
  const bancoNeto = Math.max(0, banco - comisionBancaria);

  return { efectivo, banco, bancoNeto, comisionBancaria, total };
}

export async function getResumenMes(mes: Date = new Date()): Promise<ResumenMes> {
  const [ingresos, gastos, comisiones, metodos] = await Promise.all([
    getIngresosTotalesMes(mes),
    getGastosTotalesMes(mes),
    getComisionesTotalesMes(mes),
    getMetodosPagoMes(mes),
  ]);

  const comisionBancaria = metodos.comisionBancaria;
  const utilidad_neta = ingresos - gastos - comisiones - comisionBancaria;

  const socios = await sociosRepository.getActivos();
  const totalPorcentaje = socios.reduce((sum, s) => sum + s.porcentaje_utilidad, 0);

  const pagosPorSocio = await Promise.all(
    socios.map(async s => {
      const monto = totalPorcentaje > 0
        ? utilidad_neta * (s.porcentaje_utilidad / totalPorcentaje)
        : 0;
      const pagado = s.id ? await getPagosSocioMes(s.id, mes) : 0;
      const saldoPendiente = monto - pagado;
      return {
        id: s.id!,
        nombre: s.nombre,
        porcentaje: s.porcentaje_utilidad,
        monto,
        pagado,
        saldoPendiente,
        debeBarberia: Math.max(0, -saldoPendiente),
      };
    })
  );

  const sorted = [...pagosPorSocio].sort((a, b) => a.id - b.id);

  return {
    ingresos,
    gastos,
    comisiones,
    comision_bancaria: comisionBancaria,
    utilidad_neta,
    pago_esposa: sorted[0]?.monto ?? 0,
    pago_socio:  sorted[1]?.monto ?? 0,
    pagosPorSocio,
  };
}

export async function getGastosPorCategoria(mes: Date = new Date()) {
  const gastos = await gastosRepository.getBetween(startOfMonth(mes), endOfMonth(mes));
  const categorias: Record<string, number> = {};
  for (const g of gastos) {
    categorias[g.categoria] = (categorias[g.categoria] || 0) + g.monto;
  }
  return Object.entries(categorias).map(([name, value]) => ({ name, value }));
}

export async function getGastosDetalladosMes(mes: Date = new Date()) {
  return gastosRepository.getBetween(startOfMonth(mes), endOfMonth(mes));
}

export async function getVentasProductosMes(mes: Date = new Date()): Promise<number> {
  const { serviciosRepository } = await import('@/infrastructure/repositories');
  const [registros, items] = await Promise.all([
    ventasRepository.getBetween(startOfMonth(mes), endOfMonth(mes)),
    serviciosRepository.getAll(),
  ]);
  return registros
    .filter(r => items.find(s => s.id === r.item_id)?.tipo === 'producto')
    .reduce((sum, r) => sum + r.monto_total, 0);
}

export async function getIngresosDiariosConGastosMes(mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const diasEnMes = fin.getDate();

  const [registros, gastos] = await Promise.all([
    ventasRepository.getBetween(inicio, fin),
    gastosRepository.getBetween(inicio, fin),
  ]);

  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = i + 1;
    const inicioD = new Date(mes.getFullYear(), mes.getMonth(), d, 0, 0, 0);
    const finD    = new Date(mes.getFullYear(), mes.getMonth(), d, 23, 59, 59);
    const ingresos   = registros.filter(r => r.fecha >= inicioD && r.fecha <= finD).reduce((s, r) => s + r.monto_total, 0);
    const gastosDia  = gastos.filter(g => g.fecha >= inicioD && g.fecha <= finD).reduce((s, g) => s + g.monto, 0);
    return (ingresos > 0 || gastosDia > 0)
      ? { dia: String(d), ingresos, gastos: gastosDia }
      : null;
  }).filter(Boolean) as { dia: string; ingresos: number; gastos: number }[];
}
