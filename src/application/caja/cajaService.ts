/**
 * application/caja/cajaService.ts
 *
 * Casos de uso: fondo de caja, arqueo diario, ventas del día.
 */

import { ventasRepository } from '@/infrastructure/repositories/ventas.repository';
import { gastosRepository } from '@/infrastructure/repositories/gastos.repository';
import { adelantosRepository } from '@/infrastructure/repositories/adelantos.repository';
import { arqueoRepository } from '@/infrastructure/repositories/arqueo.repository';
import { fondoCajaRepository } from '@/infrastructure/repositories/fondo-caja.repository';
import { calcularComisionBancaria } from '@/application/comisiones/comisionesService';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getSaldoFondoCaja(): Promise<number> {
  const movimientos = await fondoCajaRepository.getAll();
  return movimientos.reduce(
    (sum, m) => sum + (m.tipo === 'ingreso' ? m.monto : -m.monto),
    0
  );
}

export async function getVentasDia(fecha: Date = new Date()): Promise<number> {
  const registros = await ventasRepository.getByFecha(fecha);
  return registros.reduce((sum, r) => sum + r.monto_total, 0);
}

export async function getArqueoDia(fecha: Date) {
  return arqueoRepository.getByFecha(fecha);
}

export async function getCashRecordDates(): Promise<string[]> {
  const arqueos = await arqueoRepository.getAll();
  const fechasSet = new Set(
    arqueos.map(a => {
      const f = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
      return f.toISOString().split('T')[0];
    })
  );
  return Array.from(fechasSet);
}

export async function guardarArqueo(
  fecha: Date,
  montoBanco: number,
  notas?: string
): Promise<{ debe_quedar: number; monto_efectivo: number; total_ventas: number; fondo_caja: number }> {
  const [total_ventas, fondo_caja] = await Promise.all([
    getVentasDia(fecha),
    getSaldoFondoCaja(),
  ]);

  const monto_efectivo = Math.max(0, total_ventas - montoBanco);
  const debe_quedar = monto_efectivo + fondo_caja;

  const datos = { fecha, total_ventas, monto_banco: montoBanco, monto_efectivo, fondo_caja, debe_quedar, notas };
  await arqueoRepository.upsert(fecha, datos);

  // Registrar comisión bancaria como gasto
  const comision = await calcularComisionBancaria(montoBanco);
  await gastosRepository.deleteByFechaAndCategoria(fecha, 'comision_bancaria');
  if (comision > 0) {
    await gastosRepository.save({
      fecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0),
      categoria: 'comision_bancaria',
      monto: comision,
      descripcion: 'Comisión bancaria (Arqueo)',
    });
  }

  return { debe_quedar, monto_efectivo, total_ventas, fondo_caja };
}

export async function getEfectivoDisponibleCaja(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);

  const [fondo, registros, gastos, adelantos] = await Promise.all([
    getSaldoFondoCaja(),
    ventasRepository.getBetween(inicio, fin),
    gastosRepository.getBetween(inicio, fin),
    adelantosRepository.getBetween(inicio, fin),
  ]);

  const efectivoMes = registros.filter(r => r.metodo_pago === 'efectivo').reduce((s, r) => s + r.monto_total, 0);
  const gastosMes = gastos.reduce((s, g) => s + g.monto, 0);
  const adelantosMes = adelantos.filter(a => a.destinatario_tipo !== 'barbero').reduce((s, a) => s + a.monto, 0);

  return fondo + efectivoMes - gastosMes - adelantosMes;
}
