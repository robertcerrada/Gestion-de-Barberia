'use client';
/**
 * features/dashboard/useDashboard.ts
 *
 * Hook que centraliza toda la lógica de datos del dashboard diario.
 * Antes vivía inline en ScreenInicio como una función `recargar` de 80 líneas.
 *
 * Separar esto permite:
 *  - Testear la lógica sin montar el componente
 *  - Reutilizar el estado en otros componentes (ej: un widget de resumen)
 *  - ScreenInicio queda como pura presentación
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import {
  getSaldoFondoCaja,
  getArqueoDia,
  getPorcentajeComisionBancaria,
  isMesBloqueado,
} from '@/lib/business';

export interface DashboardState {
  totalVentasDia: number;
  efectivoDia: number;
  bancoDia: number;
  comisionBancariaDia: number;
  comisionesTransacciones: ComisionTransaccion[];
  gastosDia: number;
  adelantosSociosDia: number;
  adelantosBarberosDia: number;
  adelantosDia: number;
  saldoNeto: number;
  efectivoEnCaja: number;
  fondoCaja: number;
  arqueoDelDia: ArqueoDia | null;
  fechasConRegistro: string[];
  mesFiltroActivo: boolean;
}

export interface ComisionTransaccion {
  id: number;
  fecha: Date;
  monto: number;
  comision: number;
}

export interface ArqueoDia {
  monto_banco: number;
  monto_efectivo: number;
}

const ESTADO_INICIAL: DashboardState = {
  totalVentasDia: 0,
  efectivoDia: 0,
  bancoDia: 0,
  comisionBancariaDia: 0,
  comisionesTransacciones: [],
  gastosDia: 0,
  adelantosSociosDia: 0,
  adelantosBarberosDia: 0,
  adelantosDia: 0,
  saldoNeto: 0,
  efectivoEnCaja: 0,
  fondoCaja: 0,
  arqueoDelDia: null,
  fechasConRegistro: [],
  mesFiltroActivo: false,
};

function todayString(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

export function useDashboard() {
  const [fechaFiltro, setFechaFiltro] = useState<string>(todayString);
  const [estado, setEstado] = useState<DashboardState>(ESTADO_INICIAL);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [y, m, d] = fechaFiltro.split('-').map(Number);
      const inicioDia = new Date(y, m - 1, d, 0, 0, 0);
      const finDia    = new Date(y, m - 1, d, 23, 59, 59);
      const fechaDate = new Date(y, m - 1, d, 12, 0, 0);

      const [fondo, registrosDia, porcentajeComision, locked] = await Promise.all([
        getSaldoFondoCaja(),
        db.registros_diarios.where('fecha').between(inicioDia, finDia, true, true).toArray(),
        getPorcentajeComisionBancaria(),
        isMesBloqueado(fechaDate),
      ]);

      const totalDia = registrosDia.reduce((s, r) => s + r.monto_total, 0);
      const eRaw     = registrosDia.filter(r => r.metodo_pago === 'efectivo').reduce((s, r) => s + r.monto_total, 0);
      const bRaw     = registrosDia.filter(r => r.metodo_pago === 'banco').reduce((s, r) => s + r.monto_total, 0);

      const arqueo = await getArqueoDia(fechaDate);

      let efectivoDia: number;
      let bancoDia: number;
      let arqueoDelDia: ArqueoDia | null = null;
      let efectivoEnCaja: number;

      if (arqueo) {
        arqueoDelDia  = { monto_banco: arqueo.monto_banco, monto_efectivo: arqueo.monto_efectivo };
        efectivoDia   = arqueo.monto_efectivo;
        bancoDia      = arqueo.monto_banco;
        efectivoEnCaja = arqueo.monto_efectivo + fondo;
      } else {
        efectivoDia    = eRaw;
        bancoDia       = bRaw;
        efectivoEnCaja = eRaw + fondo;
      }

      const comisiones = registrosDia
        .filter(r => r.metodo_pago === 'banco')
        .map(r => ({
          id: r.id!,
          fecha: r.fecha,
          monto: r.monto_total,
          comision: Math.round(r.monto_total * porcentajeComision / 100 * 1000) / 1000,
        }));
      const totalComision = comisiones.reduce((s, c) => s + c.comision, 0);

      // Fechas con registros (para el DatePicker marcado)
      const [todosRegistros, todosGastos, todosAdelantos] = await Promise.all([
        db.registros_diarios.toArray(),
        db.gastos_fijos.toArray(),
        db.Adelantos.toArray(),
      ]);
      const fechasSet = new Set<string>();
      todosRegistros.forEach(r => fechasSet.add(format(new Date(r.fecha), 'yyyy-MM-dd')));
      todosGastos.forEach(g    => fechasSet.add(format(new Date(g.fecha), 'yyyy-MM-dd')));
      todosAdelantos.forEach(a => fechasSet.add(format(new Date(a.fecha), 'yyyy-MM-dd')));

      // Gastos del día
      const gastosDiaArr = await db.gastos_fijos.where('fecha').between(inicioDia, finDia, true, true).toArray();
      const gastosDia    = gastosDiaArr.reduce((s, g) => s + g.monto, 0);

      // Adelantos del día
      const adelantosDiaArr = await db.Adelantos.where('fecha').between(inicioDia, finDia, true, true).toArray();
      const adelSocios   = adelantosDiaArr
        .filter(a => a.destinatario_tipo === 'socio' || a.destinatario_tipo === 'devolucion_socio' || a.socio_id)
        .reduce((s, a) => s + a.monto, 0);
      const adelBarberos = adelantosDiaArr
        .filter(a => a.destinatario_tipo === 'barbero')
        .reduce((s, a) => s + a.monto, 0);

      // Saldo neto
      const barberosList = await db.barberos.toArray();
      let comisionesBarberosDia = 0;
      registrosDia.forEach(r => {
        const b = barberosList.find(x => x.id === r.barbero_id);
        if (b) comisionesBarberosDia += r.monto_total * b.porcentaje_comision;
      });
      const saldoNeto = totalDia - comisionesBarberosDia - gastosDia - adelSocios;

      setEstado({
        totalVentasDia: totalDia,
        efectivoDia,
        bancoDia,
        comisionBancariaDia: totalComision,
        comisionesTransacciones: comisiones,
        gastosDia,
        adelantosSociosDia: adelSocios,
        adelantosBarberosDia: adelBarberos,
        adelantosDia: adelSocios + adelBarberos,
        saldoNeto,
        efectivoEnCaja,
        fondoCaja: fondo,
        arqueoDelDia,
        fechasConRegistro: Array.from(fechasSet),
        mesFiltroActivo: locked,
      });
    } finally {
      setCargando(false);
    }
  }, [fechaFiltro]);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      if (cancelled.current) return;
      // Defer actual data reloading to next frame to avoid sync setState inside effect
      requestAnimationFrame(() => { 
        if (!cancelled.current) void recargar(); 
      });
    }, 0);
    return () => { 
      cancelled.current = true; 
      clearTimeout(t); 
    };
  }, [recargar]);

  const hoyStr = todayString();

  return {
    fechaFiltro,
    setFechaFiltro,
    hoyStr,
    estado,
    cargando,
    recargar,
  };
}
