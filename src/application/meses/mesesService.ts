/**
 * application/meses/mesesService.ts
 *
 * Casos de uso: cierre y apertura de meses, consulta de meses pendientes.
 */

import { startOfMonth, endOfMonth } from 'date-fns';
import { ventasRepository } from '@/infrastructure/repositories/ventas.repository';
import { adelantosRepository } from '@/infrastructure/repositories/adelantos.repository';
import { barberosRepository } from '@/infrastructure/repositories/barberos.repository';
import { sociosRepository } from '@/infrastructure/repositories/socios.repository';
import { historicoCierresRepository } from '@/infrastructure/repositories/historico-cierres.repository';
import { getMesAno } from '@/shared/utils/dates';
import { getResumenMes } from '@/application/resumen/resumenService';
import { getSaldoDisponibleBarbero, adelantoPerteneceASocio } from '@/application/comisiones/comisionesService';
import type { MesPendiente, MesAbierto } from '@/domain/types';

export async function isMesBloqueado(fecha: Date): Promise<boolean> {
  const mesAnoStr = getMesAno(fecha);
  const cierre = await historicoCierresRepository.getByMesAno(mesAnoStr);
  return cierre?.bloqueado ?? false;
}

export async function cerrarMes(mes: Date = new Date()): Promise<void> {
  const mesAno = getMesAno(mes);
  const existente = await historicoCierresRepository.getByMesAno(mesAno);
  if (existente?.bloqueado) throw new Error('Este mes ya fue cerrado y bloqueado.');

  // Validar saldos de barberos
  const barberos = await barberosRepository.getActivos();
  const pendientesBarberos: string[] = [];
  for (const b of barberos) {
    if (!b.id) continue;
    const saldo = await getSaldoDisponibleBarbero(b.id, mes);
    if (saldo > 0.01) pendientesBarberos.push(`${b.nombre}: ${saldo.toFixed(2)}`);
  }
  if (pendientesBarberos.length > 0) {
    throw new Error(
      `No se puede cerrar el mes. Barberos con saldo pendiente:\n${pendientesBarberos.join('\n')}`
    );
  }

  // Validar saldos de socios
  const resumen = await getResumenMes(mes);
  const pendientesSocios: string[] = [];
  for (const socio of resumen.pagosPorSocio) {
    if (socio.saldoPendiente > 0.01)
      pendientesSocios.push(`${socio.nombre}: falta pagar ${socio.saldoPendiente.toFixed(2)}`);
    if (socio.saldoPendiente < -0.01)
      pendientesSocios.push(`${socio.nombre}: debe devolver ${Math.abs(socio.saldoPendiente).toFixed(2)}`);
  }
  if (pendientesSocios.length > 0) {
    throw new Error(
      `No se puede cerrar el mes. Socios con pago pendiente:\n${pendientesSocios.join('\n')}`
    );
  }

  const datos = {
    mes_ano: mesAno,
    ingresos_totales: resumen.ingresos,
    gastos_totales: resumen.gastos,
    comisiones_pagadas: resumen.comisiones,
    utilidad_neta: resumen.utilidad_neta,
    pago_esposa: resumen.pago_esposa,
    pago_socio: resumen.pago_socio,
    bloqueado: true,
    fecha_cierre: new Date(),
  };

  if (existente?.id) {
    await historicoCierresRepository.update(existente.id, datos);
  } else {
    await historicoCierresRepository.save(datos);
  }
}

export async function reabrirMes(mes: Date): Promise<void> {
  const mesAno = getMesAno(mes);
  const cierre = await historicoCierresRepository.getByMesAno(mesAno);
  if (!cierre?.id) throw new Error('No se encontró un cierre para este mes.');
  await historicoCierresRepository.update(cierre.id, { bloqueado: false });
}

export async function getHistoricoAnual(year: number) {
  const cierres = await historicoCierresRepository.getAll();
  return cierres.filter(c => c.mes_ano.endsWith(String(year)));
}

export async function getMesesAbiertosYPendientes(): Promise<MesAbierto[]> {
  const hoy = new Date();
  const cierres = await historicoCierresRepository.getAll();
  const mesesCerrados = new Set(cierres.filter(c => c.bloqueado).map(c => c.mes_ano));

  const primerRegistro = await ventasRepository.getFirst();
  if (!primerRegistro) return [];

  const primerFecha = new Date(primerRegistro.fecha);
  const resultado: MesAbierto[] = [];

  let anio = primerFecha.getFullYear();
  let mes = primerFecha.getMonth();

  while (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth())) {
    const mesAno = `${String(mes + 1).padStart(2, '0')}-${anio}`;
    if (!mesesCerrados.has(mesAno)) {
      const fechaMes = new Date(anio, mes, 1, 12, 0, 0);
      const inicio = startOfMonth(fechaMes);
      const fin = endOfMonth(fechaMes);
      const cantRegistros = await ventasRepository.countBetween(inicio, fin);

      if (cantRegistros > 0) {
        const resumen = await getResumenMes(fechaMes);
        const sociosSinPagar = resumen.pagosPorSocio
          .filter(s => s.saldoPendiente > 0.01)
          .map(s => ({ nombre: s.nombre, monto: s.saldoPendiente }));

        resultado.push({
          mesAno,
          mes: new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(fechaMes),
          ingresos: resumen.ingresos,
          gastos: resumen.gastos,
          comisiones: resumen.comisiones,
          utilidad: resumen.utilidad_neta,
          sociosSinPagar,
          totalPendiente: sociosSinPagar.reduce((sum, s) => sum + s.monto, 0),
        });
      }
    }
    mes++;
    if (mes > 11) { mes = 0; anio++; }
  }

  return resultado.sort((a, b) => b.mesAno.localeCompare(a.mesAno));
}

const NOMBRES_MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export async function getMesesPendientes(): Promise<MesPendiente[]> {
  const hoy = new Date();
  const [primerRegistro, barberos, cierres] = await Promise.all([
    ventasRepository.getFirst(),
    barberosRepository.getActivos(),
    historicoCierresRepository.getAll(),
  ]);
  if (!primerRegistro) return [];

  const primerFecha = new Date(primerRegistro.fecha);
  const pendientes: MesPendiente[] = [];

  let anio = primerFecha.getFullYear();
  let mes = primerFecha.getMonth();

  while (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth())) {
    const fechaMes = new Date(anio, mes, 1);
    const mesAno = `${String(mes + 1).padStart(2, '0')}-${anio}`;
    const label = `${NOMBRES_MESES[mes]} ${anio}`;
    const inicio = startOfMonth(fechaMes);
    const fin = endOfMonth(fechaMes);
    const cantRegistros = await ventasRepository.countBetween(inicio, fin);

    if (cantRegistros > 0) {
      const cierre = cierres.find(c => c.mes_ano === mesAno);
      const noCerrado = !cierre?.bloqueado;

      const barberosPendientes: { id: number; nombre: string; saldo: number }[] = [];
      for (const b of barberos) {
        if (!b.id) continue;
        const saldo = await getSaldoDisponibleBarbero(b.id, fechaMes);
        if (saldo > 0.01) barberosPendientes.push({ id: b.id, nombre: b.nombre, saldo });
      }

      if (noCerrado || barberosPendientes.length > 0) {
        pendientes.push({ mesAno, label, fechaMes, noCerrado, barberosPendientes });
      }
    }
    mes++;
    if (mes > 11) { mes = 0; anio++; }
  }

  return pendientes;
}

export async function getAdelantosSocioMes(socioId: number, mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const [socio, barberoMismoId] = await Promise.all([
    sociosRepository.get(socioId),
    barberosRepository.get(socioId),
  ]);
  if (!socio) return [];
  const adelantos = await adelantosRepository.getBetween(inicio, fin);
  return adelantos
    .filter(a => a.barbero_id === socioId)
    .filter(a => adelantoPerteneceASocio(a, socio, barberoMismoId));
}
