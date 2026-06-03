/**
 * application/comisiones/comisionesService.ts
 *
 * Casos de uso: cálculo de comisiones de barberos y socios.
 * Solo depende de repositorios — nunca importa `db` directamente.
 */

import { startOfMonth, endOfMonth } from 'date-fns';
import { ventasRepository } from '@/infrastructure/repositories/ventas.repository';
import { adelantosRepository } from '@/infrastructure/repositories/adelantos.repository';
import { barberosRepository } from '@/infrastructure/repositories/barberos.repository';
import { sociosRepository } from '@/infrastructure/repositories/socios.repository';
import { serviciosRepository } from '@/infrastructure/repositories/servicios.repository';
import { configRepository } from '@/infrastructure/repositories/config.repository';
import type { Adelanto, Barbero, Socio } from '@/domain/types';

// ─── Predicado de dominio (exportado para tests) ──────────────────────────────

export function adelantoPerteneceASocio(
  adelanto: Adelanto,
  socio: Socio,
  barberoMismoId?: Barbero
): boolean {
  if (!socio.id || adelanto.barbero_id !== socio.id) return false;
  if (
    adelanto.destinatario_tipo === 'socio' ||
    adelanto.destinatario_tipo === 'devolucion_socio' ||
    adelanto.socio_id === socio.id
  ) return true;
  if (!barberoMismoId) return true;
  return adelanto.motivo.toLowerCase().includes(socio.nombre.toLowerCase());
}

// ─── Comisión bancaria ────────────────────────────────────────────────────────

export async function getPorcentajeComisionBancaria(): Promise<number> {
  const valor = parseFloat((await configRepository.get('porcentaje_comision_bancaria')) ?? '0');
  return Number.isFinite(valor) ? Math.max(0, Math.min(valor, 100)) : 0;
}

export async function calcularComisionBancaria(montoBanco: number): Promise<number> {
  const porcentaje = await getPorcentajeComisionBancaria();
  return Math.round((montoBanco * porcentaje / 100) * 1000) / 1000;
}

// ─── Comisión bruta por barbero ───────────────────────────────────────────────

export async function getComisionBrutaMes(
  barberoId: number,
  mes: Date = new Date()
): Promise<number> {
  const barbero = await barberosRepository.get(barberoId);
  if (!barbero) return 0;

  const [registros, items] = await Promise.all([
    ventasRepository.getBetween(startOfMonth(mes), endOfMonth(mes)),
    serviciosRepository.getAll(),
  ]);

  const itemMap = new Map(items.map(i => [i.id!, i]));

  return registros
    .filter(r => r.barbero_id === barberoId)
    .reduce((sum, r) => {
      const item = itemMap.get(r.item_id);
      return item?.tipo === 'servicio'
        ? sum + r.monto_total * barbero.porcentaje_comision
        : sum;
    }, 0);
}

// ─── Adelantos por barbero ────────────────────────────────────────────────────

export async function getAdelantosMes(
  barberoId: number,
  mes: Date = new Date()
): Promise<number> {
  const [adelantos, socioMismoId, barberoMismoId] = await Promise.all([
    adelantosRepository.getBetween(startOfMonth(mes), endOfMonth(mes)),
    sociosRepository.get(barberoId),
    barberosRepository.get(barberoId),
  ]);

  return adelantos
    .filter(a => a.barbero_id === barberoId)
    .filter(a => {
      if (a.destinatario_tipo === 'socio' || a.destinatario_tipo === 'devolucion_socio' || a.socio_id) return false;
      if (socioMismoId && adelantoPerteneceASocio(a, socioMismoId, barberoMismoId)) return false;
      // Incluir adelantos a barberos: destinatario_tipo === 'barbero' o sin tipo (compatibilidad legacy)
      return a.destinatario_tipo === 'barbero' || !a.destinatario_tipo;
    })
    .reduce((sum, a) => sum + a.monto, 0);
}

// ─── Pagos a socios ───────────────────────────────────────────────────────────

export async function getPagosSocioMes(
  socioId: number,
  mes: Date = new Date()
): Promise<number> {
  const [socio, barberoMismoId, adelantos] = await Promise.all([
    sociosRepository.get(socioId),
    barberosRepository.get(socioId),
    adelantosRepository.getBetween(startOfMonth(mes), endOfMonth(mes)),
  ]);
  if (!socio) return 0;

  return adelantos
    .filter(a => a.barbero_id === socioId)
    .filter(a => adelantoPerteneceASocio(a, socio, barberoMismoId))
    .reduce((sum, a) => sum + a.monto, 0);
}

// ─── Saldo disponible ─────────────────────────────────────────────────────────

export async function getSaldoDisponibleBarbero(
  barberoId: number,
  mes: Date = new Date()
): Promise<number> {
  const [comision, adelantos] = await Promise.all([
    getComisionBrutaMes(barberoId, mes),
    getAdelantosMes(barberoId, mes),
  ]);
  return comision - adelantos;
}

// ─── Comisiones totales del mes ───────────────────────────────────────────────

export async function getComisionesTotalesMes(mes: Date = new Date()): Promise<number> {
  const [registros, items, barberos] = await Promise.all([
    ventasRepository.getBetween(startOfMonth(mes), endOfMonth(mes)),
    serviciosRepository.getAll(),
    barberosRepository.getAll(),
  ]);

  const itemMap = new Map(items.map(i => [i.id!, i]));
  const barberoMap = new Map(barberos.map(b => [b.id!, b]));

  return registros.reduce((total, r) => {
    const item = itemMap.get(r.item_id);
    if (item?.tipo !== 'servicio') return total;
    const barbero = barberoMap.get(r.barbero_id);
    return barbero ? total + r.monto_total * barbero.porcentaje_comision : total;
  }, 0);
}

// ─── Ventas por barbero ───────────────────────────────────────────────────────

export async function getVentasPorBarberoMes(mes: Date = new Date()) {
  const [registros, barberos, items] = await Promise.all([
    ventasRepository.getBetween(startOfMonth(mes), endOfMonth(mes)),
    barberosRepository.getAll(),
    serviciosRepository.getAll(),
  ]);

  const itemMap = new Map(items.map(i => [i.id!, i]));

  return Promise.all(
    barberos
      .filter(b => b.id)
      .map(async b => {
        const ventas = registros.filter(r => r.barbero_id === b.id);
        const totalServicios = ventas
          .filter(r => itemMap.get(r.item_id)?.tipo === 'servicio')
          .reduce((sum, r) => sum + r.monto_total, 0);
        const comision = totalServicios * b.porcentaje_comision;
        const pagado = await getAdelantosMes(b.id!, mes);
        return {
          barberoId: b.id!,
          nombre: b.nombre,
          totalServicios,
          comision,
          porcentaje: b.porcentaje_comision,
          pagado,
          saldoPendiente: comision - pagado,
        };
      })
  );
}
