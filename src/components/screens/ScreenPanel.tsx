'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell, ComposedChart, Area
} from 'recharts';
import { db, type GastoFijo } from '@/lib/db';
import {
  getResumenMes,
  getGastosPorCategoria,
  getHistoricoAnual,
  cerrarMes,
  reabrirMes,
  getVentasPorBarberoMes,
  getVentasProductosMes,
  getGastosDetalladosMes,
  getSaldoFondoCaja,
  getIngresosDiariosConGastosMes,
  getAdelantosSocioMes,
  getMetodosPagoMes,
  getMesesAbiertosYPendientes,
} from '@/lib/business';
import { getMesAno } from '@/shared/utils/dates';
import { format, setMonth, setYear, getYear, getMonth } from 'date-fns';
import { AlertTriangle, Lock, Unlock, CheckCircle2, X, Download, FileSpreadsheet, FileImage, FileText, ChevronLeft, ChevronRight, ChevronDown, Wallet } from 'lucide-react';
import { exportarAGoogleDrive } from '@/lib/drive';
import { useMoneda } from '@/lib/useMoneda';
import { useAppConfig } from '@/lib/useAppConfig';

function useFmt() {
  const { simbolo } = useMoneda();
  return (n: number) => {
    const safe = typeof n === 'number' && isFinite(n) ? n : 0;
    const fixed3 = safe.toFixed(3);
    return `${simbolo}${fixed3.endsWith('0') ? safe.toFixed(2) : fixed3}`;
  };
}

const GOLD = '#D4AF37';
const GREEN = '#4CAF82';
const RED = '#E05252';
const BLUE = '#5288E0';
const PURPLE = '#8B52E0';
const ORANGE = '#E09A52';

const COLORES_CATEGORIAS: Record<string, string> = {
  alquiler: BLUE, internet: PURPLE, limpieza: GREEN, insumos: ORANGE,
  impuestos: '#E0B452', camaras: '#52B4E0', seguro: '#A052E0', luz: '#FFD700', agua: '#52B4E0', gestoria: '#E0A452', comision_bancaria: GOLD, otro: '#888888',
};

const EMOJI_CATEGORIAS: Record<string, string> = {
  alquiler: '🏠', internet: '🌐', limpieza: '🧹', insumos: '🧴',
  impuestos: '🧾', camaras: '📷', seguro: '🛡️', luz: '💡', agua: '💧', gestoria: '📝', comision_bancaria: '💸', otro: '📌',
};



type VentaBarbero = Awaited<ReturnType<typeof getVentasPorBarberoMes>>[number];
type Resumen = Awaited<ReturnType<typeof getResumenMes>>;

export default function ScreenPanel() {
  const formatCurrency = useFmt();
  const { t } = useAppConfig();
  const MESES = Array.from({ length: 12 }, (_, i) => t(`month_${i}`));
  const yearActual = getYear(new Date());
  const mesActual = getMonth(new Date());

  const [selectedMes, setSelectedMes] = useState(mesActual);
  const [selectedYear, setSelectedYear] = useState(yearActual);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [gastosCategoria, setGastosCategoria] = useState<{ name: string; value: number }[]>([]);
  const [historicoActual, setHistoricoActual] = useState<Awaited<ReturnType<typeof getHistoricoAnual>>>([]);
  const [historicoAnterior, setHistoricoAnterior] = useState<Awaited<ReturnType<typeof getHistoricoAnual>>>([]);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [mesBloqueado, setMesBloqueado] = useState(false);
  const [ventasBarbero, setVentasBarbero] = useState<VentaBarbero[]>([]);
  const [ventasProductos, setVentasProductos] = useState(0);
  const [gastosDetallados, setGastosDetallados] = useState<GastoFijo[]>([]);
  const [saldoFondo, setSaldoFondo] = useState(0);
  const [movimientosFondoMes, setMovimientosFondoMes] = useState<{ ingreso: number; egreso: number }>({ ingreso: 0, egreso: 0 });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [ingresosDiarios, setIngresosDiarios] = useState<{ dia: string; ingresos: number; gastos: number }[]>([]);
  const [adelantosPorSocio, setAdelantosPorSocio] = useState<Record<number, any[]>>({});
  const [mesesPendientes, setMesesPendientes] = useState<Awaited<ReturnType<typeof getMesesAbiertosYPendientes>>>([]);
  const [ingresosMetodoPago, setIngresosMetodoPago] = useState<{ efectivo: number; banco: number; bancoNeto: number; comisionBancaria: number }>({ efectivo: 0, banco: 0, bancoNeto: 0, comisionBancaria: 0 });
  const [modalLiquidacion, setModalLiquidacion] = useState<{ mesAno: string; mes: string } | null>(null);
  const [comisionesAbiertas, setComisionesAbiertas] = useState(false);

  const hoy = new Date();
  const esMesActual = selectedMes === hoy.getMonth() && selectedYear === hoy.getFullYear();

  function navAnterior() {
    if (selectedMes === 0) { setSelectedMes(11); setSelectedYear(a => a - 1); }
    else setSelectedMes(m => m - 1);
  }

  function navSiguiente() {
    if (esMesActual) return;
    if (selectedMes === 11) { setSelectedMes(0); setSelectedYear(a => a + 1); }
    else setSelectedMes(m => m + 1);
  }

  function irAHoy() {
    setSelectedMes(hoy.getMonth());
    setSelectedYear(hoy.getFullYear());
  }

  const fecha = setMonth(setYear(new Date(), selectedYear), selectedMes);

  const cargarDatos = useCallback(async () => {
    const [r, g, h1, h2, vb, vp, gd, mesesPend] = await Promise.all([
      getResumenMes(fecha),
      getGastosPorCategoria(fecha),
      getHistoricoAnual(selectedYear),
      getHistoricoAnual(selectedYear - 1),
      getVentasPorBarberoMes(fecha),
      getVentasProductosMes(fecha),
      getGastosDetalladosMes(fecha),
      getMesesAbiertosYPendientes(),
    ]);
    setResumen(r);
    setGastosCategoria(g);
    setHistoricoActual(h1);
    setHistoricoAnterior(h2);
    setVentasBarbero(vb);
    setVentasProductos(vp);
    setGastosDetallados(gd);
    setMesesPendientes(mesesPend);

    const fondo = await getSaldoFondoCaja();
    setSaldoFondo(fondo);
    const inicio = new Date(selectedYear, selectedMes, 1, 0, 0, 0);
    const fin = new Date(selectedYear, selectedMes + 1, 0, 23, 59, 59);
    const movs = await db.fondo_caja.where('fecha').between(inicio, fin, true, true).toArray();
    const ingreso = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const egreso = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
    setMovimientosFondoMes({ ingreso, egreso });

    const mesAnoStr = getMesAno(fecha);
    const cierre = await db.historico_cierres.where('mes_ano').equals(mesAnoStr).first();
    setMesBloqueado(cierre?.bloqueado ?? false);

    const diarios = await getIngresosDiariosConGastosMes(fecha);
    setIngresosDiarios(diarios);

    const socios = await db.socios.filter(s => s.activo).toArray();
    const mapaSocio: Record<number, any[]> = {};
    await Promise.all(socios.map(async (s) => {
      if (s.id) mapaSocio[s.id] = await getAdelantosSocioMes(s.id, fecha);
    }));
    setAdelantosPorSocio(mapaSocio);

    const mp = await getMetodosPagoMes(fecha);
    setIngresosMetodoPago({ efectivo: mp.efectivo, banco: mp.banco, bancoNeto: mp.bancoNeto, comisionBancaria: mp.comisionBancaria });
  }, [fecha, selectedMes, selectedYear]);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      if (cancelled.current) return;
      try { 
        requestAnimationFrame(() => {
          if (!cancelled.current) cargarDatos();
        });
      } catch (err) { 
        console.warn('[ScreenPanel] cargarDatos failed:', err); 
      }
    }, 0);
    return () => { 
      cancelled.current = true; 
      clearTimeout(t); 
    };
  }, [cargarDatos]);

  async function handleReabrirMes() {
    if (!confirm(`¿Estás seguro de que deseas reabrir ${MESES[selectedMes]} ${selectedYear}?`)) return;
    setReabriendo(true);
    try {
      await reabrirMes(fecha);
      await cargarDatos();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al reabrir mes');
    }
    setReabriendo(false);
  }

  // ── CSV ────────────────────────────────────────────────────────
  function exportCSV() {
    if (!resumen) return;
    const mpPromise = getMetodosPagoMes(fecha);
    const BOM = '\uFEFF';
    const mesLabel = `${MESES[selectedMes]} ${selectedYear}`;
    let csv = `Reporte Mensual - Gestión de Barberia\n${mesLabel}\n\n`;
    csv += `RESUMEN FINANCIERO\nConcepto,Monto\n`;
    csv += `Ingresos Totales,€${resumen.ingresos.toFixed(2)}\n`;
    csv += `Gastos Fijos,€${resumen.gastos.toFixed(2)}\n`;
    csv += `Comisiones,€${resumen.comisiones.toFixed(2)}\n`;
    // Añadir comision bancaria y banco bruto/neto
    mpPromise.then(mp => {
      csv += `Comisión Bancaria,€${mp.comisionBancaria.toFixed(2)}\n`;
      csv += `Banco Bruto,€${mp.banco.toFixed(2)}\n`;
      csv += `Banco Neto,€${mp.bancoNeto.toFixed(2)}\n`;
      csv += `Saldo Neto,€${resumen.utilidad_neta.toFixed(2)}\n`;

      csv += `Pago Dueña (50%),€${resumen.pago_esposa.toFixed(2)}\n`;
      csv += `Pago Socio (50%),€${resumen.pago_socio.toFixed(2)}\n\n`;

      csv += `INGRESOS POR BARBERO\nBarbero,Total Servicios,Comisión,% Comisión\n`;
      for (const vb of ventasBarbero) {
        csv += `${vb.nombre},€${vb.totalServicios.toFixed(2)},€${vb.comision.toFixed(2)},${(vb.porcentaje * 100).toFixed(0)}%\n`;
      }
      csv += `La Barbería (Productos),€${ventasProductos.toFixed(2)},—,—\n\n`;
      csv += `GASTOS FIJOS DEL MES\nFecha,Categoría,Descripción,Monto\n`;
      for (const g of gastosDetallados) {
        csv += `${format(new Date(g.fecha), 'dd/MM/yyyy')},${g.categoria},${g.descripcion},€${g.monto.toFixed(2)}\n`;
      }
      csv += `\nREPARTO DE SOCIOS\nSocio,Porcentaje,Asignado,Pagado,Saldo,Estado\n`;
      for (const socio of resumen.pagosPorSocio) {
        const estado = socio.saldoPendiente > 0.01 ? 'Pendiente de pagar'
          : socio.saldoPendiente < -0.01 ? 'Debe a la barbería' : 'Saldado';
        csv += `${socio.nombre},${(socio.porcentaje * 100).toFixed(0)}%,${socio.monto.toFixed(2)},${socio.pagado.toFixed(2)},${socio.saldoPendiente.toFixed(2)},${estado}\n`;
      }
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Templo_BarberShop_${MESES[selectedMes]}_${selectedYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportMenu(false);
    });
    
  }

  // ── PDF ────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!resumen) return;
    const mesLabel = `${MESES[selectedMes]} ${selectedYear}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Habilita las ventanas emergentes para exportar.'); return; }

    const { getConfig } = await import('@/lib/db');
    const nombreBarberia = (await getConfig('nombre_barberia')) || 'Barber Shop';

    let logoBase64 = '';
    try {
      const resp = await fetch('/Logo.jpg');
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>(res => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(blob);
      });
    } catch {}

    const mp = await getMetodosPagoMes(fecha);
    const gastosHTML = gastosDetallados.map(g =>
      `<tr>
        <td>${format(new Date(g.fecha), 'dd/MM/yyyy')}</td>
        <td>${EMOJI_CATEGORIAS[g.categoria] || ''} ${g.categoria}</td>
        <td>${g.descripcion}</td>
        <td class="num red">€${g.monto.toFixed(2)}</td>
      </tr>`
    ).join('') || '<tr><td colspan="4" class="empty">Sin gastos registrados</td></tr>';

    const barberosHTML = ventasBarbero.filter(vb => vb.totalServicios > 0).map(vb => {
      const saldoStr = vb.saldoPendiente > 0
        ? `<span class="gold">+€${vb.saldoPendiente.toFixed(2)}</span>`
        : `<span style="color:#888">✓</span>`;
      return `<tr>
        <td>${vb.nombre}</td>
        <td class="num">${(vb.porcentaje * 100).toFixed(0)}%</td>
        <td class="num green">€${vb.totalServicios.toFixed(2)}</td>
        <td class="num orange">€${vb.comision.toFixed(2)}</td>
        <td class="num red">€${vb.pagado.toFixed(2)}</td>
        <td class="num">${saldoStr}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="empty">Sin ventas</td></tr>';

    const sociosHTML = resumen.pagosPorSocio.map(s => {
      const estado = s.saldoPendiente > 0.01
        ? `<span class="badge-pending">Pendiente: €${s.saldoPendiente.toFixed(2)}</span>`
        : s.saldoPendiente < -0.01
        ? `<span class="badge-debt">Debe: €${Math.abs(s.saldoPendiente).toFixed(2)}</span>`
        : `<span class="badge-ok">✓ Saldado</span>`;
      const pagos = (adelantosPorSocio[s.id] ?? []);
      const pagosHTML = pagos.length > 0
        ? pagos.map((p: any) => `
          <div class="pago-row">
            <span>${format(new Date(p.fecha), 'dd/MM')} — ${p.motivo || 'Pago'}</span>
            <span class="${p.monto < 0 ? 'green' : 'orange'}">${p.monto < 0 ? '+' : '-'}€${Math.abs(p.monto).toFixed(2)}</span>
          </div>`).join('')
        : '<p class="empty" style="margin:4px 0">Sin movimientos este mes</p>';
      const cardClass = s.saldoPendiente < -0.01 ? 'debt' : s.saldoPendiente > 0.01 ? 'pending' : 'ok';
      return `
        <div class="socio-card ${cardClass}">
          <div class="socio-header">
            <div>
              <strong>${s.nombre}</strong>
              <span class="porcentaje">${(s.porcentaje * 100).toFixed(0)}% de la utilidad</span>
            </div>
            ${estado}
          </div>
          <div class="socio-grid">
            <div class="socio-stat">
              <span class="stat-l">Beneficio del mes</span>
              <span class="stat-v gold">€${s.monto.toFixed(2)}</span>
            </div>
            <div class="socio-stat">
              <span class="stat-l">Ya cobrado</span>
              <span class="stat-v orange">€${s.pagado.toFixed(2)}</span>
            </div>
            <div class="socio-stat">
              <span class="stat-l">${s.saldoPendiente < 0 ? 'Debe devolver' : 'Pendiente'}</span>
              <span class="stat-v ${s.saldoPendiente < 0 ? 'red' : 'green'}">€${Math.abs(s.saldoPendiente).toFixed(2)}</span>
            </div>
          </div>
          ${pagos.length > 0 ? `<div class="pagos-lista">${pagosHTML}</div>` : ''}
        </div>`;
    }).join('');

    const totalComisiones = ventasBarbero.reduce((s, vb) => s + vb.comision, 0);
    const totalVentas = ventasBarbero.reduce((s, vb) => s + vb.totalServicios, 0) + ventasProductos;

    printWindow.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="utf-8">
    <title>${nombreBarberia} — ${mesLabel}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Segoe UI',system-ui,sans-serif; background:#fff; color:#1a1a1a; font-size:13px; }
      .page { max-width:820px; margin:0 auto; padding:32px 28px; }
      .header { display:flex; align-items:center; gap:18px; padding-bottom:18px; border-bottom:3px solid #D4AF37; margin-bottom:24px; }
      .logo { width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #D4AF37; }
      .logo-placeholder { width:64px; height:64px; border-radius:50%; background:#D4AF37; display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0; }
      .header-text h1 { font-size:22px; color:#0a0a0a; font-weight:800; letter-spacing:-0.02em; }
      .header-text p { font-size:13px; color:#777; margin-top:3px; }
      .header-badge { margin-left:auto; text-align:right; }
      .header-badge .mes { font-size:17px; font-weight:700; color:#D4AF37; }
      .header-badge .gen { font-size:11px; color:#aaa; margin-top:2px; }
      .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
      .box { padding:14px; border:1px solid #e8e8e8; border-radius:10px; text-align:center; }
      .box .lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:4px; }
      .box .val { font-size:20px; font-weight:800; display:block; }
      .box.green { border-color:#c8e6c9; background:#f1f8f1; } .box.green .val { color:#2e7d32; }
      .box.red   { border-color:#ffcdd2; background:#fff5f5; } .box.red   .val { color:#c62828; }
      .box.gold  { border-color:#ffe082; background:#fffde7; } .box.gold  .val { color:#9a7700; }
      .box.blue  { border-color:#bbdefb; background:#f0f7ff; } .box.blue  .val { color:#1565c0; }
      h2 { font-size:14px; font-weight:700; color:#0a0a0a; border-left:4px solid #D4AF37; padding-left:10px; margin:22px 0 10px; }
      table { width:100%; border-collapse:collapse; margin-bottom:4px; font-size:12px; }
      th { background:#f5f5f0; color:#555; font-weight:600; padding:7px 10px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
      td { padding:7px 10px; border-bottom:1px solid #f0f0f0; vertical-align:middle; }
      tr:last-child td { border-bottom:none; }
      .num { text-align:right; font-weight:600; }
      .green { color:#2e7d32; } .red { color:#c62828; } .gold { color:#9a7700; } .orange { color:#e65100; }
      .empty { text-align:center; color:#aaa; padding:16px; font-style:italic; }
      .socios-grid { display:flex; flex-direction:column; gap:12px; margin-bottom:4px; }
      .socio-card { border:1px solid #e8e8e8; border-radius:10px; padding:14px; }
      .socio-card.debt    { border-color:#ffcdd2; background:#fff5f5; }
      .socio-card.pending { border-color:#ffe082; background:#fffde7; }
      .socio-card.ok      { border-color:#c8e6c9; background:#f1f8f1; }
      .socio-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
      .socio-header strong { font-size:14px; color:#0a0a0a; display:block; }
      .porcentaje { font-size:11px; color:#888; display:block; margin-top:2px; }
      .badge-ok      { background:#c8e6c9; color:#1b5e20; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
      .badge-pending { background:#ffe082; color:#7a5c00; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
      .badge-debt    { background:#ffcdd2; color:#8b0000; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
      .socio-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .socio-stat { background:rgba(0,0,0,0.03); border-radius:8px; padding:8px 10px; }
      .stat-l { font-size:10px; color:#888; display:block; margin-bottom:2px; }
      .stat-v { font-size:15px; font-weight:700; display:block; }
      .pagos-lista { margin-top:10px; padding-top:10px; border-top:1px solid rgba(0,0,0,0.06); }
      .pago-row { display:flex; justify-content:space-between; font-size:11px; color:#555; padding:3px 0; }
      .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e8e8e8; text-align:center; font-size:11px; color:#bbb; }
      .footer strong { color:#D4AF37; }
      @media print { body { font-size:12px; } .page { padding:16px; } h2 { margin:14px 0 8px; } }
    </style>
    </head><body>
    <div class="page">
      <div class="header">
        ${logoBase64 ? `<img class="logo" src="${logoBase64}" alt="Logo" />` : '<div class="logo-placeholder">✂️</div>'}
        <div class="header-text">
          <h1>${nombreBarberia}</h1>
          <p>Reporte Mensual de Gestión</p>
        </div>
        <div class="header-badge">
          <div class="mes">${mesLabel}</div>
          <div class="gen">Generado ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>
      </div>
      <div class="summary">
        <div class="box green"><span class="lbl">Ingresos</span><span class="val">€${resumen.ingresos.toFixed(2)}</span></div>
        <div class="box red"  ><span class="lbl">Gastos</span><span class="val">€${resumen.gastos.toFixed(2)}</span></div>
        <div class="box gold" ><span class="lbl">Comisiones</span><span class="val">€${resumen.comisiones.toFixed(2)}</span></div>
        <div class="box ${resumen.utilidad_neta >= 0 ? 'green' : 'red'}"><span class="lbl">Saldo Neto</span><span class="val">€${resumen.utilidad_neta.toFixed(2)}</span></div>
        <div class="box blue"><span class="lbl">Total Ventas</span><span class="val">€${totalVentas.toFixed(2)}</span></div>
        <div class="box gold"><span class="lbl">Fondo de Caja</span><span class="val">€${saldoFondo.toFixed(2)}</span></div>
      </div>
      <div style="margin-top:10px; margin-bottom:14px; font-size:13px; color:#555">
        <strong>Banco:</strong> Bruto €${mp.banco.toFixed(2)} • Comisión €${mp.comisionBancaria.toFixed(2)} • Neto €${mp.bancoNeto.toFixed(2)}
      </div>
      <h2>💈 Ingresos por Barbero</h2>
      <table>
        <thead><tr><th>Barbero</th><th>%</th><th class="num">Total</th><th class="num">Comisión</th><th class="num">Pagado</th><th class="num">Pendiente</th></tr></thead>
        <tbody>
          ${barberosHTML}
          <tr style="background:#f0f7ff">
            <td class="blue">📦 La Barbería (Productos)</td><td>—</td>
            <td class="num blue">€${ventasProductos.toFixed(2)}</td>
            <td class="num">—</td><td class="num">—</td><td class="num">—</td>
          </tr>
          <tr style="background:#f5f5f0; font-weight:700; border-top:2px solid #D4AF37;">
            <td colspan="2">TOTAL</td>
            <td class="num">€${totalVentas.toFixed(2)}</td>
            <td class="num gold">€${totalComisiones.toFixed(2)}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
      <h2>📋 Gastos del Mes</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="num">Monto</th></tr></thead>
        <tbody>${gastosHTML}</tbody>
        <tfoot><tr style="background:#fff5f5; font-weight:700">
          <td colspan="3" style="text-align:right; padding-right:16px; color:#888">Total gastos:</td>
          <td class="num red">€${resumen.gastos.toFixed(2)}</td>
        </tr></tfoot>
      </table>
      <h2>🤝 Saldos de Socios / Dueños</h2>
      <div class="socios-grid">${sociosHTML}</div>
      <div class="footer">
        <strong>${nombreBarberia}</strong> &mdash; Sistema de Gestión Interno &mdash; ${mesLabel}
      </div>
    </div>
    <script>window.onload = function() { window.print(); }</script>
    </body></html>`);
    printWindow.document.close();
    setShowExportMenu(false);
  }

  // ── PNG ────────────────────────────────────────────────────────
  async function exportPNG() {
    if (!resumen) return;
    setShowExportMenu(false);

    const { getConfig } = await import('@/lib/db');
    const nombreBarberia = (await getConfig('nombre_barberia')) || 'Barber Shop';
    const mesLabel = `${MESES[selectedMes]} ${selectedYear}`;

    // Cargar logo igual que en PDF: primero config personalizada, luego /Logo.jpg
    let logoBase64 = '';
    try {
      const logoGuardado = await getConfig('logo_barberia');
      if (logoGuardado) {
        logoBase64 = logoGuardado;
      } else {
        const resp = await fetch('/Logo.jpg');
        const blob = await resp.blob();
        logoBase64 = await new Promise<string>(res => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
      }
    } catch {}

    const W = 820;
    const SCALE = 2;
    const PAD = 32;

    // ── Pasada 1: calcular H real dibujando en un canvas offscreen ──
    function calcH(): number {
      // Estimación de todos los bloques con las mismas constantes que el dibujado real
      const HEADER_H  = 24 + 74 + 20;          // y inicial + cabecera + línea + gap
      const METRICS_H = (62 + 10) + (62 + 24); // dos filas de cajas
      const SEC_H     = 26;                     // sectionHeader
      const TH_H      = 28;                     // tableHeader
      const ROW_H     = 28;                     // tableRow
      const filasBarbero = ventasBarbero.filter(vb => vb.totalServicios > 0).length
        + (ventasProductos > 0 ? 1 : 0);
      const filasGastos = Math.min(gastosDetallados.length, 8)
        + (gastosDetallados.length > 8 ? 1 : 0);
      const GASTOS_TOTAL_H = 36;                // fila total gastos
      const SOCIO_H   = 62;                     // tarjeta por socio
      const FOOTER_H  = 12 + 1 + 16 + 20 + 4 + 32; // separador + texto + borde + margen

      return HEADER_H + METRICS_H
        + SEC_H + TH_H + filasBarbero * ROW_H + 12
        + SEC_H + TH_H + filasGastos * ROW_H + GASTOS_TOTAL_H
        + SEC_H + resumen!.pagosPorSocio.length * SOCIO_H
        + FOOTER_H;
    }
    const H = calcH();

    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // ── Fondo BLANCO ──
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Borde dorado superior
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(0, 0, W, 4);

    // ── Helper: rectángulo redondeado ──
    function roundRect(rx: number, ry: number, rw: number, rh: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(rx + r, ry); ctx.lineTo(rx + rw - r, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
      ctx.lineTo(rx + rw, ry + rh - r);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
      ctx.lineTo(rx + r, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
      ctx.lineTo(rx, ry + r);
      ctx.quadraticCurveTo(rx, ry, rx + r, ry);
      ctx.closePath();
    }

    // ── CABECERA: logo + nombre + mes ──
    let y = 24;

    if (logoBase64) {
      await new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          // Círculo recortado
          ctx.save();
          roundRect(PAD, y, 56, 56, 28);
          ctx.clip();
          ctx.drawImage(img, PAD, y, 56, 56);
          ctx.restore();
          // Borde dorado sobre el logo
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 2;
          roundRect(PAD, y, 56, 56, 28);
          ctx.stroke();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = logoBase64;
      });
    } else {
      // Placeholder dorado con ✂
      roundRect(PAD, y, 56, 56, 28);
      ctx.fillStyle = '#D4AF37';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px "Segoe UI", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✂', PAD + 28, y + 38);
    }

    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 22px "Segoe UI", system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(nombreBarberia, PAD + 68, y + 22);
    ctx.fillStyle = '#777';
    ctx.font = '13px "Segoe UI", system-ui';
    ctx.fillText('Reporte Mensual de Gestión', PAD + 68, y + 42);

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 18px "Segoe UI", system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(mesLabel, W - PAD, y + 22);
    ctx.fillStyle = '#aaa';
    ctx.font = '11px "Segoe UI", system-ui';
    ctx.fillText(`Generado ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W - PAD, y + 40);

    y += 74;
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 20;

    // ── Helper: caja métrica (fondo coloreado suave) ──
    function drawMetricBox(label: string, value: string, x: number, yPos: number, w: number, h: number, accent: string) {
      roundRect(x, yPos, w, h, 8);
      // fondo muy suave del mismo color
      ctx.fillStyle = accent + '18'; // 18 = ~10% opacity hex
      ctx.fill();
      ctx.strokeStyle = accent + '55';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '11px "Segoe UI", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), x + w / 2, yPos + 18);
      ctx.fillStyle = accent;
      ctx.font = `bold 20px "Segoe UI", system-ui`;
      ctx.fillText(value, x + w / 2, yPos + h - 12);
    }

    // ── Fila de métricas: 3 columnas ──
    const BOX_H = 62;
    const colW = (W - PAD * 2 - 16) / 3;
    drawMetricBox('Ingresos',    `${formatCurrency(resumen.ingresos)}`,    PAD,               y, colW, BOX_H, '#2e7d32');
    drawMetricBox('Gastos Fijos', `${formatCurrency(resumen.gastos)}`,    PAD + colW + 8,    y, colW, BOX_H, '#c62828');
    drawMetricBox('Comisiones',  `${formatCurrency(resumen.comisiones)}`, PAD + (colW + 8)*2, y, colW, BOX_H, '#9a7700');
    y += BOX_H + 10;
    const utilColor = resumen.utilidad_neta >= 0 ? '#2e7d32' : '#c62828';
    drawMetricBox('Saldo Neto',  `${formatCurrency(resumen.utilidad_neta)}`, PAD,               y, colW, BOX_H, utilColor);
    // Socios dinámicos — hasta 2
    resumen.pagosPorSocio.slice(0, 2).forEach((s, i) => {
      drawMetricBox(s.nombre, `${formatCurrency(s.monto)}`, PAD + (colW + 8) * (i + 1), y, colW, BOX_H, '#9a7700');
    });
    y += BOX_H + 24;

    // ── Helper: encabezado de sección ──
    function sectionHeader(title: string) {
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(PAD, y, 4, 18);
      ctx.fillStyle = '#0a0a0a';
      ctx.font = 'bold 14px "Segoe UI", system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(title, PAD + 12, y + 14);
      y += 26;
    }

    // ── Helper: fila de tabla ──
    function tableHeader(cols: { text: string; x: number; align?: CanvasTextAlign }[]) {
      ctx.fillStyle = '#f5f5f0';
      ctx.fillRect(PAD, y, W - PAD * 2, 26);
      ctx.fillStyle = '#555';
      ctx.font = 'bold 11px "Segoe UI", system-ui';
      for (const col of cols) {
        ctx.textAlign = col.align || 'left';
        ctx.fillText(col.text.toUpperCase(), col.x, y + 17);
      }
      y += 28;
    }

    function tableRow(cols: { text: string; x: number; align?: CanvasTextAlign; color?: string }[], rowIndex: number) {
      if (rowIndex % 2 === 0) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(PAD, y, W - PAD * 2, 26);
      }
      ctx.font = '12px "Segoe UI", system-ui';
      for (const col of cols) {
        ctx.fillStyle = col.color || '#1a1a1a';
        ctx.textAlign = col.align || 'left';
        ctx.fillText(col.text, col.x, y + 17);
      }
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y + 26); ctx.lineTo(W - PAD, y + 26); ctx.stroke();
      y += 28;
    }

    // ── Helper: recortar texto si excede un ancho máximo ──
    function clipText(text: string, maxWidth: number): string {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let t = text;
      while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
      return t + '…';
    }

    // ── TABLA BARBEROS ──
    // Columnas: Barbero | % | Total | Comisión | Pagado | Pendiente
    // X positions dentro del área PAD … W-PAD (756px disponibles)
    const COL = {
      nombre:    PAD + 8,
      pct:       PAD + 200,
      total:     PAD + 290,
      comision:  PAD + 410,
      pagado:    PAD + 530,
      pendiente: W - PAD - 8,
    };
    sectionHeader('💈 Ingresos por Barbero');
    tableHeader([
      { text: 'Barbero',   x: COL.nombre },
      { text: '%',         x: COL.pct,       align: 'right' },
      { text: 'Total',     x: COL.total,     align: 'right' },
      { text: 'Comisión',  x: COL.comision,  align: 'right' },
      { text: 'Pagado',    x: COL.pagado,    align: 'right' },
      { text: 'Pendiente', x: COL.pendiente, align: 'right' },
    ]);
    let rowIdx = 0;
    for (const vb of ventasBarbero.filter(v => v.totalServicios > 0)) {
      // Recortar nombre si es muy largo
      ctx.font = '12px "Segoe UI", system-ui';
      const nombreCorto = clipText(vb.nombre, COL.pct - COL.nombre - 8);
      tableRow([
        { text: nombreCorto,                                       x: COL.nombre },
        { text: `${(vb.porcentaje * 100).toFixed(0)}%`,            x: COL.pct,       align: 'right', color: '#555' },
        { text: `${formatCurrency(vb.totalServicios)}`,           x: COL.total,     align: 'right', color: '#2e7d32' },
        { text: `${formatCurrency(vb.comision)}`,                 x: COL.comision,  align: 'right', color: '#e65100' },
        { text: `${formatCurrency(vb.pagado)}`,                   x: COL.pagado,    align: 'right', color: '#c62828' },
        { text: vb.saldoPendiente <= 0 ? '✓' : `${formatCurrency(vb.saldoPendiente)}`,
          x: COL.pendiente, align: 'right',
          color: vb.saldoPendiente <= 0 ? '#2e7d32' : '#9a7700' },
      ], rowIdx++);
    }
    if (ventasProductos > 0) {
      ctx.font = '12px "Segoe UI", system-ui';
      tableRow([
        { text: 'La Barberia (Productos)', x: COL.nombre, color: '#1565c0' },
        { text: '—', x: COL.pct,       align: 'right', color: '#aaa' },
        { text: `${formatCurrency(ventasProductos)}`, x: COL.total, align: 'right', color: '#1565c0' },
        { text: '—', x: COL.comision,  align: 'right', color: '#aaa' },
        { text: '—', x: COL.pagado,    align: 'right', color: '#aaa' },
        { text: '—', x: COL.pendiente, align: 'right', color: '#aaa' },
      ], rowIdx++);
    }
    y += 12;

    // ── TABLA GASTOS ──
    sectionHeader('📋 Gastos del Mes');
    tableHeader([
      { text: 'Fecha',       x: PAD + 8 },
      { text: 'Categoría',   x: PAD + 100 },
      { text: 'Descripción', x: PAD + 240 },
      { text: 'Monto',       x: W - PAD - 8, align: 'right' },
    ]);
    rowIdx = 0;
    for (const g of gastosDetallados.slice(0, 8)) {
      const desc = g.descripcion.length > 30 ? g.descripcion.slice(0, 30) + '…' : g.descripcion;
      tableRow([
        { text: format(new Date(g.fecha), 'dd/MM/yyyy'), x: PAD + 8,        color: '#555' },
        { text: g.categoria,                             x: PAD + 100,      color: '#555' },
        { text: desc,                                    x: PAD + 240,      color: '#333' },
        { text: `${formatCurrency(g.monto)}`,           x: W - PAD - 8, align: 'right', color: '#c62828' },
      ], rowIdx++);
    }
    if (gastosDetallados.length > 8) {
      ctx.fillStyle = '#aaa';
      ctx.font = 'italic 12px "Segoe UI", system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`... y ${gastosDetallados.length - 8} gastos más`, W / 2, y + 14);
      y += 24;
    }
    // Fila total gastos
    ctx.fillStyle = '#fff5f5';
    ctx.fillRect(PAD, y, W - PAD * 2, 26);
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px "Segoe UI", system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('Total gastos:', W - PAD - 90, y + 17);
    ctx.fillStyle = '#c62828';
    ctx.fillText(`${formatCurrency(resumen.gastos)}`, W - PAD - 8, y + 17);
    y += 36;

    // ── SOCIOS ──
    sectionHeader('🤝 Saldos de Socios / Dueños');
    for (const s of resumen.pagosPorSocio) {
      const debeBarberia = s.saldoPendiente < -0.005;
      const leDebemos    = s.saldoPendiente >  0.005;
      const accent = debeBarberia ? '#c62828' : leDebemos ? '#9a7700' : '#2e7d32';

      // Tarjeta del socio
      roundRect(PAD, y, W - PAD * 2, 52, 8);
      ctx.fillStyle = accent + '12';
      ctx.fill();
      ctx.strokeStyle = accent + '44';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0a0a0a';
      ctx.font = 'bold 13px "Segoe UI", system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(s.nombre, PAD + 12, y + 18);
      ctx.fillStyle = '#888';
      ctx.font = '11px "Segoe UI", system-ui';
      ctx.fillText(`${(s.porcentaje * 100).toFixed(0)}% utilidad`, PAD + 12, y + 36);

      // Tres valores: beneficio / pagado / pendiente
      const cw = (W - PAD * 2 - 24 - 160) / 3;
      const startCol = PAD + 160;
      const labels = ['Beneficio', 'Cobrado', debeBarberia ? 'Debe devolver' : 'Pendiente'];
      const values = [
        `${formatCurrency(s.monto)}`,
        `${formatCurrency(s.pagado)}`,
        `${formatCurrency(Math.abs(s.saldoPendiente))}`,
      ];
      const colors = ['#9a7700', '#e65100', accent];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#aaa';
        ctx.font = '10px "Segoe UI", system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], startCol + cw * i + cw / 2, y + 16);
        ctx.fillStyle = colors[i];
        ctx.font = 'bold 13px "Segoe UI", system-ui';
        ctx.fillText(values[i], startCol + cw * i + cw / 2, y + 36);
      }


      y += 62;
    }

    // ── PIE ──
    y += 12;
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 16;
    ctx.fillStyle = '#bbb';
    ctx.font = '11px "Segoe UI", system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${nombreBarberia}  —  Sistema de Gestión Interno  —  ${mesLabel}`, W / 2, y);

    // Borde dorado inferior
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(0, H - 4, W, 4);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nombreBarberia.replace(/\s+/g, '_')}_${MESES[selectedMes]}_${selectedYear}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // ── Comparativo interanual ─────────────────────────────────────
  const dataComparativo = MESES.map((mes, idx) => {
    const mesNum = String(idx + 1).padStart(2, '0');
    const mesAnoActual = `${mesNum}-${selectedYear}`;
    const mesAnoAnterior = `${mesNum}-${selectedYear - 1}`;
    const actual = historicoActual.find(h => h.mes_ano === mesAnoActual);
    const anterior = historicoAnterior.find(h => h.mes_ano === mesAnoAnterior);
    return {
      mes: mes.substring(0, 3),
      [selectedYear]: actual?.ingresos_totales ?? 0,
      [selectedYear - 1]: anterior?.ingresos_totales ?? 0,
    };
  });

  return (
    <div style={{ padding: '16px', paddingBottom: 100 }}>
      {/* Navegador de mes premium */}
      <div className="card-gold" style={{ marginBottom: 16, padding: '14px 16px', background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* Flecha izquierda */}
          <button
            onClick={navAnterior}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--black-border)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: 'var(--white-soft)', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Mes central interactivo */}
          <div style={{ textAlign: 'center', flex: 1, position: 'relative' }}>
            <input 
              type="month"
              value={`${selectedYear}-${String(selectedMes + 1).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-');
                  setSelectedYear(parseInt(y));
                  setSelectedMes(parseInt(m) - 1);
                }
              }}
              style={{
                position: 'absolute', opacity: 0, inset: 0, width: '100%', cursor: 'pointer'
              }}
            />
            <div style={{ pointerEvents: 'none' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {MESES[selectedMes]} <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </p>
              <p style={{ fontSize: 13, color: esMesActual ? 'var(--success)' : 'var(--gray-muted)', marginTop: 3, fontWeight: esMesActual ? 600 : 400 }}>
                {selectedYear}{esMesActual ? ` ${t('inProgress')}` : ''}
              </p>
            </div>
          </div>

          {/* Flecha derecha */}
          <button
            onClick={navSiguiente}
            disabled={esMesActual}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--black-border)', borderRadius: 10, padding: '8px 10px', cursor: esMesActual ? 'default' : 'pointer', color: esMesActual ? 'var(--black-border)' : 'var(--white-soft)', display: 'flex', alignItems: 'center', flexShrink: 0, opacity: esMesActual ? 0.35 : 1, transition: 'background 0.15s' }}
            onMouseEnter={e => { if (!esMesActual) e.currentTarget.style.background = 'rgba(212,175,55,0.12)'; }}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Botón "Ir a hoy" — solo si no estamos en el mes actual */}
        {!esMesActual && (
          <button
            onClick={irAHoy}
            style={{ marginTop: 10, width: '100%', padding: '7px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.1)')}
          >
            {t('goToCurrentMonth')}
          </button>
        )}
      </div>

      {/* Badge mes bloqueado */}
      {mesBloqueado && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.3)', marginBottom: 16, fontSize: 13, color: 'var(--gold)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} /> {t('monthClosed2')}
          </span>
          <button onClick={handleReabrirMes} disabled={reabriendo} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
            color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Unlock size={13} /> {reabriendo ? t('reopening') : t('reopenMonth')}
          </button>
        </div>
      )}

      {/* 🔔 MESES PENDIENTES DE CIERRE */}
      {mesesPendientes.length > 0 && (
        <div style={{ marginBottom: 20, borderRadius: 12, border: '1px solid rgba(224,82,82,0.25)', background: 'rgba(224,82,82,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(224,82,82,0.1)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
            <AlertTriangle size={18} />
            <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚠️ {mesesPendientes.length} {mesesPendientes.length > 1 ? t('monthsWithoutClosePlural') : t('monthsWithoutClose')}
            </span>
          </div>
          <div style={{ padding: '12px' }}>
            {mesesPendientes.slice(0, 5).map((mesPend) => (
                <div key={mesPend.mesAno} style={{ 
                	padding: '12px', 
                	marginBottom: 8,
                borderRadius: 8, 
                background: 'rgba(224,82,82,0.08)',
                border: '1px solid rgba(224,82,82,0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--white-soft)', textTransform: 'capitalize' }}>
                    {mesPend.mes}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-muted)', background: 'rgba(224,82,82,0.2)', padding: '2px 8px', borderRadius: 4 }}>
                    {t('open')}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--gray-muted)', fontSize: 10, display: 'block', marginBottom: 2 }}>{t('income')}</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>${mesPend.ingresos.toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--gray-muted)', fontSize: 10, display: 'block', marginBottom: 2 }}>{t('utility')}</span>
                    <span style={{ color: mesPend.utilidad >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>${mesPend.utilidad.toFixed(2)}</span>
                  </div>
                </div>

                {mesPend.sociosSinPagar.length > 0 && (
                  <div style={{ marginBottom: 8, paddingTop: 8, borderTop: '1px solid rgba(224,82,82,0.15)' }}>
                    <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('pending')}
                    </p>
                    {mesPend.sociosSinPagar.map((socio, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: i < mesPend.sociosSinPagar.length - 1 ? 4 : 0, color: 'var(--white-soft)' }}>
                        <span>{socio.nombre}</span>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>${socio.monto.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botones de acción */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    onClick={() => setModalLiquidacion({ mesAno: mesPend.mesAno, mes: mesPend.mes })}
                    style={{
                      padding: '8px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                      background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
                      color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}
                  >
                    <Wallet size={13} /> {t('settleHere')}
                  </button>
                  <button
                    onClick={() => {
                      const [mes, año] = mesPend.mesAno.split('-').map(Number);
                      setSelectedYear(año);
                      setSelectedMes(mes - 1);
                    }}
                    style={{
                      padding: '8px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                      background: 'rgba(224,82,82,0.15)', border: '1px solid rgba(224,82,82,0.3)',
                      color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                    }}
                  >
                    <Lock size={13} /> Ver y cerrar
                  </button>
                </div>
              </div>
            ))}
            {mesesPendientes.length > 5 && (
              <p style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--gray-muted)' }}>
                ... y {mesesPendientes.length - 5} mes{mesesPendientes.length - 5 > 1 ? 'es' : ''} más sin cerrar
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resumen financiero */}
      {resumen && (
        <>
          <p className="section-title" style={{ marginBottom: 12 }}>{MESES[selectedMes]} {selectedYear}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            <div className="stat-card"><span className="stat-label">Ingresos</span><span className="stat-value green">{formatCurrency(resumen.ingresos)}</span></div>
            <div className="stat-card"><span className="stat-label">Gastos Fijos</span><span className="stat-value red">{formatCurrency(resumen.gastos)}</span></div>
            <div className="stat-card"><span className="stat-label">Comisiones</span><span className="stat-value gold">{formatCurrency(resumen.comisiones)}</span></div>
            <div className="stat-card" style={{ borderColor: resumen.utilidad_neta >= 0 ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)' }}>
              <span className="stat-label">Saldo Neto</span>
              <span className="stat-value" style={{ color: resumen.utilidad_neta >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(resumen.utilidad_neta)}</span>
            </div>
          </div>

          {/* Desglose de métodos de pago */}
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 10 }}>💳 Ingresos por Método de Pago</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            <div className="stat-card" style={{ borderColor: 'rgba(76,175,130,0.3)', background: 'rgba(76,175,130,0.04)' }}>
              <span className="stat-label">💵 Efectivo</span>
              <span className="stat-value green">{formatCurrency(ingresosMetodoPago.efectivo)}</span>
              {resumen.ingresos > 0 && (
                <span style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 6, display: 'block' }}>
                  {((ingresosMetodoPago.efectivo / resumen.ingresos) * 100).toFixed(1)}% del total
                </span>
              )}
            </div>
            <div className="stat-card" style={{ borderColor: 'rgba(82,136,224,0.3)', background: 'rgba(82,136,224,0.04)' }}>
              <span className="stat-label">🏦 Banco neto</span>
              <span className="stat-value" style={{ color: 'var(--banco)' }}>{formatCurrency(ingresosMetodoPago.bancoNeto)}</span>
              {resumen.ingresos > 0 && (
                <span style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 6, display: 'block' }}>
                  {((ingresosMetodoPago.banco / resumen.ingresos) * 100).toFixed(1)}% del total
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 4, display: 'block' }}>
                Bruto {formatCurrency(ingresosMetodoPago.banco)} • Comisión {formatCurrency(ingresosMetodoPago.comisionBancaria)}
              </span>
            </div>
          </div>

          {/* Ingresos por Barbero */}
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 10 }}>💈 Ingresos por Barbero</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {ventasBarbero.filter(vb => vb.totalServicios > 0).map(vb => (
              <div key={vb.barberoId} className="card" style={{ padding: '12px 14px' }}>
                {/* Cabecera: nombre + % */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--white-soft)' }}>{vb.nombre}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-muted)', background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(212,175,55,0.2)' }}>
                    {(vb.porcentaje * 100).toFixed(0)}% comisión
                  </span>
                </div>
                {/* Grid 2x2 de cifras */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(76,175,130,0.07)', border: '1px solid rgba(76,175,130,0.12)' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total servicios</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(vb.totalServicios)}</p>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.12)' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comisión</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(vb.comision)}</p>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(224,82,82,0.07)', border: '1px solid rgba(224,82,82,0.12)' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ya pagado</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(vb.pagado)}</p>
                  </div>
                  <div style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: vb.saldoPendiente <= 0 ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,55,0.1)',
                    border: `1px solid ${vb.saldoPendiente <= 0 ? 'rgba(255,255,255,0.06)' : 'rgba(212,175,55,0.3)'}`
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pendiente</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: vb.saldoPendiente <= 0 ? 'var(--gray-muted)' : 'var(--warning)' }}>
                      {vb.saldoPendiente <= 0 ? '✓ Pagado' : formatCurrency(vb.saldoPendiente)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* La Barbería — Productos */}
            {ventasProductos > 0 && (
              <div className="card" style={{ padding: '12px 14px', borderColor: 'rgba(82,136,224,0.2)', background: 'rgba(82,136,224,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--banco)' }}>📦 La Barbería</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>Productos</span>
                </div>
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(82,136,224,0.08)', border: '1px solid rgba(82,136,224,0.15)' }}>
                  <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total vendido</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--banco)' }}>{formatCurrency(ventasProductos)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Torta barberos */}
          {ventasBarbero.filter(vb => vb.totalServicios > 0).length > 0 && (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 10 }}>🍕 Distribución de Ingresos por Barbero</p>
              <div className="card" style={{ marginBottom: 20, padding: '16px 8px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie 
                      data={ventasBarbero.filter(vb => vb.totalServicios > 0).map(vb => ({ name: vb.nombre, value: vb.totalServicios }))} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={55}
                      outerRadius={80} 
                      paddingAngle={3}
                      stroke="var(--black-card)"
                      strokeWidth={3}
                      dataKey="value" 
                      labelLine={false} 
                      label={false}
                    >
                      {ventasBarbero.filter(vb => vb.totalServicios > 0).map((_, i) => (
                        <Cell key={i} fill={[GOLD, GREEN, BLUE, PURPLE, ORANGE, RED][i % 6]} style={{ outline: 'none' }} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)} 
                      contentStyle={{ background: '#141414', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, fontSize: 13, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }} 
                      itemStyle={{ color: 'var(--white-soft)', fontWeight: 600 }}
                      cursor={false}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="circle"
                      wrapperStyle={{ paddingTop: 20, fontSize: 12, color: 'var(--gray-muted)' }}
                      formatter={(value) => <span style={{ color: 'var(--white-soft)', fontWeight: 500, marginRight: 8 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Gastos del mes */}
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 10 }}>📋 Gastos del Mes ({gastosDetallados.length})</p>
          {gastosDetallados.length > 0 ? (
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', padding: '10px 14px', background: 'rgba(224,82,82,0.04)', borderBottom: '1px solid var(--black-border)', fontSize: 11, fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Fecha</span><span>Detalle</span><span style={{ textAlign: 'right' }}>Monto</span>
              </div>
              {gastosDetallados.filter(g => g.categoria !== 'comision_bancaria').map(g => (
                <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 13, alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray-muted)', fontSize: 12 }}>{format(new Date(g.fecha), 'dd/MM')}</span>
                  <div>
                    <span style={{ color: 'var(--white-soft)', fontWeight: 500 }}>{EMOJI_CATEGORIAS[g.categoria] || '📌'} {g.descripcion}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--gray-muted)', marginTop: 1 }}>{g.categoria}</span>
                  </div>
                  <span style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>{formatCurrency(g.monto)}</span>
                </div>
              ))}
              {/* Acordeón de Comisiones Bancarias */}
              {gastosDetallados.filter(g => g.categoria === 'comision_bancaria').length > 0 && (() => {
                const comisiones = gastosDetallados.filter(g => g.categoria === 'comision_bancaria');
                const totalComisiones = comisiones.reduce((s, g) => s + g.monto, 0);
                return (
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <button type="button" onClick={() => setComisionesAbiertas(!comisionesAbiertas)} style={{ width: '100%', display: 'grid', gridTemplateColumns: '70px 1fr 1fr', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', alignItems: 'center', transition: 'background 0.2s' }}>
                      <span style={{ color: 'var(--gray-muted)', fontSize: 12 }}>Varias</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>💸 Comisiones Bancarias ({comisiones.length})</span>
                        <ChevronDown size={14} color="var(--gold)" style={{ transition: 'transform 0.25s', transform: comisionesAbiertas ? 'rotate(180deg)' : 'none' }} />
                      </div>
                      <span style={{ textAlign: 'right', color: 'var(--gold)', fontWeight: 700 }}>{formatCurrency(totalComisiones)}</span>
                    </button>
                    {comisionesAbiertas && (
                      <div style={{ background: 'rgba(212,175,55,0.02)', padding: '6px 14px 10px', borderTop: '1px solid rgba(212,175,55,0.1)' }}>
                        {comisiones.map(c => (
                          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                            <span style={{ color: 'var(--gray-muted)' }}>{format(new Date(c.fecha), 'dd/MM')} — {c.descripcion}</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 500 }}>{formatCurrency(c.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 20, padding: '20px 14px', textAlign: 'center', color: 'var(--gray-muted)', fontSize: 13 }}>
              Sin gastos registrados en este mes
            </div>
          )}

          {/* Fondo de Caja */}
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 10 }}>💵 Fondo de Caja</p>
          <div className="card" style={{ marginBottom: 20, padding: '14px 16px', borderColor: 'rgba(212,175,55,0.2)', background: 'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, transparent 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saldo Actual del Fondo</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: saldoFondo >= 0 ? 'var(--gold)' : 'var(--danger)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{formatCurrency(saldoFondo)}</p>
              </div>
              <div style={{ fontSize: 28 }}>🏦</div>
            </div>
            {(movimientosFondoMes.ingreso > 0 || movimientosFondoMes.egreso > 0) && (
              <>
                <hr style={{ borderColor: 'rgba(212,175,55,0.12)', margin: '10px 0' }} />
                <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Movimientos de {MESES[selectedMes]}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(76,175,130,0.07)', border: '1px solid rgba(76,175,130,0.15)' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 2 }}>➕ Ingresos al fondo</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(movimientosFondoMes.ingreso)}</p>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(224,82,82,0.07)', border: '1px solid rgba(224,82,82,0.15)' }}>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 2 }}>➖ Egresos del fondo</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(movimientosFondoMes.egreso)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Saldos de Socios */}
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 10 }}>🤝 Saldos de Socios / Dueños</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {resumen.pagosPorSocio.map((socio) => {
              const debeBarberia = socio.saldoPendiente < -0.005;
              const leDebemos = socio.saldoPendiente > 0.005;
              return (
                <div key={socio.id} className="card" style={{
                  padding: '14px 16px',
                  borderColor: debeBarberia ? 'rgba(224,82,82,0.35)' : leDebemos ? 'rgba(212,175,55,0.35)' : 'rgba(76,175,130,0.3)',
                  background: debeBarberia ? 'rgba(224,82,82,0.05)' : leDebemos ? 'rgba(212,175,55,0.05)' : 'rgba(76,175,130,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--white-soft)' }}>{socio.nombre}</p>
                      <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 2 }}>{(socio.porcentaje * 100).toFixed(0)}% de la utilidad</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: debeBarberia ? 'rgba(224,82,82,0.15)' : leDebemos ? 'rgba(212,175,55,0.15)' : 'rgba(76,175,130,0.15)', color: debeBarberia ? 'var(--danger)' : leDebemos ? 'var(--gold)' : 'var(--success)', border: `1px solid ${debeBarberia ? 'rgba(224,82,82,0.3)' : leDebemos ? 'rgba(212,175,55,0.3)' : 'rgba(76,175,130,0.3)'}` }}>
                      {debeBarberia ? '⚠️ Debe a la barbería' : leDebemos ? '💰 Pendiente de cobro' : '✅ Saldado'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Beneficio mes', value: formatCurrency(socio.monto), color: 'var(--gold)' },
                      { label: 'Ya cobrado', value: formatCurrency(socio.pagado), color: 'var(--warning)' },
                      { label: debeBarberia ? 'Debe devolver' : 'Pendiente', value: debeBarberia ? formatCurrency(Math.abs(socio.saldoPendiente)) : formatCurrency(Math.max(0, socio.saldoPendiente)), color: debeBarberia ? 'var(--danger)' : leDebemos ? 'var(--success)' : 'var(--gray-muted)' },
                    ].map(item => (
                      <div key={item.label} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                        <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginBottom: 3 }}>{item.label}</p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {debeBarberia && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', fontSize: 12, color: 'var(--danger)' }}>
                      Este socio cobró <strong>{formatCurrency(Math.abs(socio.saldoPendiente))}</strong> más de lo correspondiente. Registrá una &quot;Devolución&quot; en Inicio.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reparto detallado */}
          {resumen.pagosPorSocio.length > 0 && (
            <div className="card-gold" style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>💰 Reparto de Socios</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {resumen.pagosPorSocio.map((socio) => {
                  const saldo = socio.saldoPendiente;
                  const estado = saldo > 0.01 ? { label: 'Falta pagar:', value: saldo, color: 'var(--gold)' }
                    : saldo < -0.01 ? { label: 'Debe a la barbería:', value: Math.abs(saldo), color: 'var(--danger)' }
                    : { label: 'Estado:', value: 0, color: 'var(--success)' };
                  const pagosDetalle = adelantosPorSocio[socio.id] ?? [];
                  return (
                    <div key={socio.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <p style={{ fontSize: 14, color: 'var(--white-soft)', fontWeight: 700 }}>{socio.nombre}</p>
                        <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{(socio.porcentaje * 100).toFixed(0)}% de utilidad</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-muted)' }}>Monto asignado:</span>
                          <span style={{ fontWeight: 600, color: 'var(--white-soft)' }}>{formatCurrency(socio.monto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--gray-muted)' }}>Total pagado:</span>
                          <span style={{ fontWeight: 600, color: saldo <= 0 ? 'var(--success)' : 'var(--warning)' }}>{formatCurrency(socio.pagado)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid rgba(212,175,55,0.15)', fontWeight: 700, fontSize: 13 }}>
                          <span style={{ color: estado.color }}>{estado.label}</span>
                          <span style={{ color: estado.color }}>{estado.value > 0 ? formatCurrency(estado.value) : '✓ Saldado'}</span>
                        </div>
                      </div>
                      {pagosDetalle.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                          <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle de pagos</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {pagosDetalle.map((p: any) => (
                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <div>
                                  <span style={{ color: 'var(--white-soft)', fontWeight: 500 }}>{p.motivo || 'Pago'}</span>
                                  <span style={{ color: 'var(--gray-muted)', fontSize: 10, display: 'block', marginTop: 1 }}>
                                    {format(new Date(p.fecha), 'dd/MM/yyyy')}
                                    {p.destinatario_tipo === 'devolucion_socio' && <span style={{ color: 'var(--success)', marginLeft: 6 }}>↩ Devolución</span>}
                                  </span>
                                </div>
                                <span style={{ fontWeight: 700, color: p.destinatario_tipo === 'devolucion_socio' ? 'var(--success)' : 'var(--warning)' }}>
                                  {p.destinatario_tipo === 'devolucion_socio' ? '+' : '-'}{formatCurrency(p.monto)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {pagosDetalle.length === 0 && (
                        <p style={{ fontSize: 11, color: 'var(--gray-muted)', textAlign: 'center', padding: '6px 0' }}>Sin pagos registrados este mes</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Ingresos/Gastos Diarios */}
      {ingresosDiarios.length > 0 && (
        <>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 12 }}>📅 Evolución Diaria</p>
          <div className="card" style={{ marginBottom: 20, padding: '20px 10px 10px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={ingresosDiarios} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RED} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={RED} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis 
                  dataKey="dia" 
                  tick={{ fill: '#888', fontSize: 11, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: '#888', fontSize: 11, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={v => `$${v}`} 
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(val: number, name: string) => [
                    <span key="value" style={{ color: 'var(--white-soft)', fontWeight: 700 }}>{formatCurrency(val)}</span>, 
                    <span key="label" style={{ color: 'var(--gray-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>{name === 'ingresos' ? 'Ingresos' : 'Gastos'}</span>
                  ]} 
                  contentStyle={{ 
                    background: 'rgba(15, 15, 15, 0.95)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: 12, 
                    fontSize: 13,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    padding: '12px 16px'
                  }} 
                  labelStyle={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 6 }} 
                  labelFormatter={(label) => `Día ${label}`} 
                />
                <Legend 
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: '#888', paddingTop: 16 }} 
                  formatter={(value) => <span style={{ color: 'var(--white-soft)', fontWeight: 500, marginRight: 12 }}>{value === 'ingresos' ? 'Ingresos' : 'Gastos'}</span>}
                />
                
                {/* Gastos as an Area underneath */}
                <Area 
                  type="monotone" 
                  dataKey="gastos" 
                  fillOpacity={1} 
                  fill="url(#colorGastos)" 
                  stroke={RED} 
                  strokeWidth={2}
                  activeDot={{ r: 6, fill: RED, stroke: '#141414', strokeWidth: 2 }}
                />
                
                {/* Ingresos as solid Bars */}
                <Bar 
                  dataKey="ingresos" 
                  fill="url(#colorIngresos)" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={24}
                  activeBar={{ fill: '#3A9A6E' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Comparativo interanual */}
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 12 }}>📊 Comparativo Interanual</p>
      <div className="card" style={{ marginBottom: 20, padding: '16px 8px 10px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={dataComparativo}
            layout="vertical"
            margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
            barCategoryGap="30%"
            barGap={3}
          >
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#E5C050" stopOpacity={1}/>
              </linearGradient>
              <linearGradient id="gradAnterior" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" stopOpacity={1}/>
                <stop offset="100%" stopColor="rgba(255,255,255,0.18)" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" horizontal={false} vertical={true} />
            <XAxis
              type="number"
              tick={{ fill: '#666', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: any) => {
                const n = Number(v) || 0;
                return n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`;
              }}
            />
            <YAxis
              type="category"
              dataKey="mes"
              tick={{ fill: '#999', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              formatter={(val: any, name: any) => [
                <span key="val" style={{ color: 'var(--white-soft)', fontWeight: 700 }}>{formatCurrency(Number(val) || 0)}</span>,
                <span key="label" style={{ color: 'var(--gray-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>
                  {String(name) === String(selectedYear) ? `Año ${selectedYear}` : `Año ${selectedYear - 1}`}
                </span>
              ]}
              contentStyle={{
                background: 'rgba(15,15,15,0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 13,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                padding: '12px 16px'
              }}
              labelStyle={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 6 }}
            />
            <Bar dataKey={selectedYear - 1} name={`Año ${selectedYear - 1}`} fill="#6B8CBA" radius={[0, 4, 4, 0]} maxBarSize={10} />
            <Bar dataKey={selectedYear} name={`Año ${selectedYear}`} fill="url(#gradActual)" radius={[0, 4, 4, 0]} maxBarSize={10} />
          </BarChart>
        </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 8, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray-muted)', fontWeight: 500 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#6B8CBA' }} />
              Año {selectedYear - 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray-muted)', fontWeight: 500 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: GOLD }} />
              Año {selectedYear}
            </div>
          </div>
      </div>

      {/* Gastos por categoría */}
      {gastosCategoria.length > 0 && (
        <>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 12 }}>🍕 Gastos por Categoría</p>
          <div className="card" style={{ marginBottom: 20, padding: '16px 8px 30px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie 
                  data={gastosCategoria} 
                  cx="50%" 
                  cy="50%" 
                  startAngle={225} 
                  endAngle={-45} 
                  innerRadius={70}
                  outerRadius={100} 
                  paddingAngle={5}
                  cornerRadius={6}
                  stroke="none"
                  dataKey="value" 
                  labelLine={false} 
                  label={false}
                >
                  {gastosCategoria.map((entry, index) => (
                    <Cell key={index} fill={COLORES_CATEGORIAS[entry.name] || '#888'} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => formatCurrency(val)} 
                  contentStyle={{ 
                    background: 'rgba(15, 15, 15, 0.95)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: 12, 
                    fontSize: 13,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    padding: '12px 16px'
                  }} 
                  itemStyle={{ color: 'var(--white-soft)', fontWeight: 600 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center" 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 30, fontSize: 12, color: 'var(--gray-muted)' }}
                  formatter={(value) => <span style={{ color: 'var(--white-soft)', fontWeight: 500, marginRight: 8 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Exportar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <button
          className="btn-gold"
          style={{ width: '100%', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => setShowExportMenu(!showExportMenu)}
        >
          <Download size={18} />
          Exportar Reporte de {MESES[selectedMes]}
          <ChevronDown size={15} style={{ marginLeft: 2, transition: 'transform 0.22s', transform: showExportMenu ? 'rotate(180deg)' : 'none', opacity: 0.75 }} />
        </button>

        {showExportMenu && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowExportMenu(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 998,
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(2px)',
                animation: 'exportFadeIn 0.16s ease',
              }}
            />

            {/* Panel */}
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(340px, 96vw)',
              zIndex: 999,
              background: 'var(--black-card)',
              border: '1.5px solid rgba(212,175,55,0.28)',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
              animation: 'exportSlideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
            }}>
              {/* Header del panel */}
              <div style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid rgba(212,175,55,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(212,175,55,0.12)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Download size={14} color={GOLD} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-soft)', margin: 0 }}>Exportar Reporte</p>
                    <p style={{ fontSize: 11, color: 'var(--gray-muted)', margin: 0 }}>{MESES[selectedMes]} {selectedYear}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportMenu(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Opciones */}
              <div style={{ padding: '8px' }}>
                {[
                  {
                    icon: <FileSpreadsheet size={20} color={GREEN} />,
                    iconBg: 'rgba(76,175,130,0.1)',
                    iconBorder: 'rgba(76,175,130,0.2)',
                    label: 'Excel (CSV)',
                    subtitle: 'Datos tabulares listos para abrir en Excel',
                    action: exportCSV,
                  },
                  {
                    icon: <FileText size={20} color={RED} />,
                    iconBg: 'rgba(224,82,82,0.1)',
                    iconBorder: 'rgba(224,82,82,0.2)',
                    label: 'Imprimir / PDF',
                    subtitle: 'Abre el diálogo de impresión del navegador',
                    action: exportPDF,
                  },
                  {
                    icon: <FileImage size={20} color={GOLD} />,
                    iconBg: 'rgba(212,175,55,0.1)',
                    iconBorder: 'rgba(212,175,55,0.25)',
                    label: 'Imagen (PNG)',
                    subtitle: 'Resumen visual listo para compartir',
                    action: exportPNG,
                  },
                ].map(({ icon, iconBg, iconBorder, label, subtitle, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 12px', borderRadius: 11, border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'var(--font-body)', transition: 'background 0.13s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: iconBg, border: `1px solid ${iconBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 11, color: 'var(--gray-muted)', margin: 0, marginTop: 2 }}>{subtitle}</p>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: '2px solid var(--black-border)', flexShrink: 0,
                    }} />
                  </button>
                ))}
              </div>
            </div>

            <style>{`
              @keyframes exportSlideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.97); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
              }
              @keyframes exportFadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
              }
            `}</style>
          </>
        )}
      </div>

      {/* Cerrar mes */}
      {!mesBloqueado && (
        <button className="btn-danger" style={{ width: '100%', marginBottom: 24 }} onClick={() => setShowCerrarModal(true)}>
          <Lock size={18} /> Cerrar Mes {MESES[selectedMes]}
        </button>
      )}

      <HistorialCierres />

      {showCerrarModal && (
        <ModalCerrarMes mes={MESES[selectedMes]} year={selectedYear} resumen={resumen} fecha={fecha} onClose={() => { setShowCerrarModal(false); cargarDatos(); }} />
      )}

      {modalLiquidacion && (
        <ModalLiquidacionRapida
          mesAno={modalLiquidacion.mesAno}
          mesLabel={modalLiquidacion.mes}
          onClose={() => { setModalLiquidacion(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}

// ─── MODAL LIQUIDACIÓN RÁPIDA ────────────────────────────────────────────────
// Permite pagar barberos y socios de un mes anterior sin salir del Panel
function ModalLiquidacionRapida({
  mesAno, mesLabel, onClose
}: {
  mesAno: string;
  mesLabel: string;
  onClose: () => void;
}) {
  const formatCurrency = useFmt();
  const [mesNum, anio] = mesAno.split('-').map(Number);
  const fechaMes = useMemo(() => new Date(anio, mesNum - 1, 15, 12, 0, 0), [anio, mesNum]);

  const [barberos, setBarberos] = useState<any[]>([]);
  const [socios, setSocios] = useState<any[]>([]);
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [pagando, setPagando] = useState<Record<string, boolean>>({});
  const [pagados, setPagados] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [efectivoCaja, setEfectivoCaja] = useState(0);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const [vb, resumen, efectivo] = await Promise.all([
        import('@/lib/business').then(m => m.getVentasPorBarberoMes(fechaMes)),
        import('@/lib/business').then(m => m.getResumenMes(fechaMes)),
        import('@/lib/business').then(m => m.getEfectivoDisponibleCaja(fechaMes)),
      ]);
      // Solo barberos con saldo pendiente
      setBarberos(vb.filter(b => b.saldoPendiente > 0.01));
      // Socios con saldo pendiente
      setSocios(resumen.pagosPorSocio.filter(s => s.saldoPendiente > 0.01));
      setEfectivoCaja(efectivo);
      // Pre-rellenar montos con el total pendiente
      const m: Record<string, string> = {};
      const mot: Record<string, string> = {};
      vb.filter(b => b.saldoPendiente > 0.01).forEach(b => {
        m[`b-${b.barberoId}`] = b.saldoPendiente.toFixed(2);
        mot[`b-${b.barberoId}`] = `Pago comisión ${mesLabel}`;
      });
      resumen.pagosPorSocio.filter(s => s.saldoPendiente > 0.01).forEach(s => {
        m[`s-${s.id}`] = s.saldoPendiente.toFixed(2);
        mot[`s-${s.id}`] = `Pago utilidad ${mesLabel}`;
      });
      setMontos(m);
      setMotivos(mot);
      setCargando(false);
    }
    cargar();
  }, [mesAno, mesLabel, fechaMes]);

  async function pagarBarbero(b: any) {
    const key = `b-${b.barberoId}`;
    const montoNum = Number(montos[key]);
    if (!montoNum || montoNum <= 0) { setError(e => ({ ...e, [key]: 'Ingresá un monto válido.' })); return; }
    if (montoNum > b.saldoPendiente + 0.01) { setError(e => ({ ...e, [key]: `Excede la comisión pendiente (${b.saldoPendiente.toFixed(2)})` })); return; }
    setPagando(p => ({ ...p, [key]: true }));
    const { isMesBloqueado } = await import('@/lib/business');
    const bloqueado = await isMesBloqueado(fechaMes);
    if (bloqueado) { setError(e => ({ ...e, [key]: 'El mes está cerrado.' })); setPagando(p => ({ ...p, [key]: false })); return; }
    await db.Adelantos.add({
      fecha: fechaMes,
      barbero_id: b.barberoId,
      monto: montoNum,
      motivo: motivos[key] || `Pago comisión ${mesLabel}`,
      destinatario_tipo: 'barbero',
    });
    setPagados(p => ({ ...p, [key]: true }));
    setPagando(p => ({ ...p, [key]: false }));
    // Refrescar saldo pendiente
    const { getVentasPorBarberoMes } = await import('@/lib/business');
    const vb = await getVentasPorBarberoMes(fechaMes);
    setBarberos(vb.filter(x => x.saldoPendiente > 0.01 && !pagados[`b-${x.barberoId}`]));
  }

  async function pagarSocio(s: any) {
    const key = `s-${s.id}`;
    const montoNum = Number(montos[key]);
    if (!montoNum || montoNum <= 0) { setError(e => ({ ...e, [key]: 'Ingresá un monto válido.' })); return; }
    if (montoNum > s.saldoPendiente + 0.01) { setError(e => ({ ...e, [key]: `Excede el saldo pendiente (${s.saldoPendiente.toFixed(2)})` })); return; }
    setPagando(p => ({ ...p, [key]: true }));
    const { isMesBloqueado, getEfectivoDisponibleCaja } = await import('@/lib/business');
    const bloqueado = await isMesBloqueado(fechaMes);
    if (bloqueado) { setError(e => ({ ...e, [key]: 'El mes está cerrado.' })); setPagando(p => ({ ...p, [key]: false })); return; }
    const efectivoActual = await getEfectivoDisponibleCaja(fechaMes);
    if (montoNum > efectivoActual) { setError(e => ({ ...e, [key]: `Efectivo insuficiente en caja (${efectivoActual.toFixed(2)})` })); setPagando(p => ({ ...p, [key]: false })); return; }
    await db.Adelantos.add({
      fecha: fechaMes,
      barbero_id: s.id,
      monto: montoNum,
      motivo: motivos[key] || `Pago utilidad ${mesLabel}`,
      destinatario_tipo: 'socio',
      socio_id: s.id,
    });
    setPagados(p => ({ ...p, [key]: true }));
    setPagando(p => ({ ...p, [key]: false }));
    const { getResumenMes } = await import('@/lib/business');
    const r = await getResumenMes(fechaMes);
    setSocios(r.pagosPorSocio.filter(x => x.saldoPendiente > 0.01));
    const ef = await getEfectivoDisponibleCaja(fechaMes);
    setEfectivoCaja(ef);
  }

  const todosPagados = barberos.length === 0 && socios.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 2 }}>💸 Liquidación Rápida</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-muted)', textTransform: 'capitalize' }}>{mesLabel}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-muted)' }}>Cargando pendientes...</div>
        ) : todosPagados ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>¡Todo pagado!</p>
            <p style={{ fontSize: 13, color: 'var(--gray-muted)', marginTop: 6 }}>Ya podés cerrar el mes desde el panel.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Efectivo disponible */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(76,175,130,0.07)', border: '1px solid rgba(76,175,130,0.2)' }}>
              <span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>💵 Efectivo disponible en caja</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: efectivoCaja > 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(efectivoCaja)}</span>
            </div>

            {/* Barberos pendientes */}
            {barberos.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💈 Barberos con saldo pendiente</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {barberos.map(b => {
                    const key = `b-${b.barberoId}`;
                    if (pagados[key]) return null;
                    return (
                      <div key={key} className="card" style={{ padding: '12px 14px', borderColor: 'rgba(212,175,55,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{b.nombre}</span>
                          <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{(b.porcentaje * 100).toFixed(0)}% comisión</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10, fontSize: 11, textAlign: 'center' }}>
                          <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                            <span style={{ color: 'var(--gray-muted)', display: 'block' }}>Generado</span>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(b.totalServicios)}</span>
                          </div>
                          <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                            <span style={{ color: 'var(--gray-muted)', display: 'block' }}>Comisión</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(b.comision)}</span>
                          </div>
                          <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                            <span style={{ color: 'var(--gray-muted)', display: 'block' }}>Pendiente</span>
                            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(b.saldoPendiente)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: error[key] ? 6 : 0 }}>
                          <input
                            className="input-dark"
                            type="number" inputMode="decimal" min="0.01" max="99999" step="0.01"
                            value={montos[key] ?? ''}
                            onKeyDown={e => { if (['-','e','E','+'].includes(e.key)) e.preventDefault(); }}
                            onChange={e => { setMontos(m => ({ ...m, [key]: e.target.value })); setError(er => ({ ...er, [key]: '' })); }}
                            placeholder="Monto a pagar"
                            style={{ flex: 1, margin: 0 }}
                          />
                          <button
                            onClick={() => pagarBarbero(b)}
                            disabled={!!pagando[key]}
                            style={{ padding: '0 16px', borderRadius: 10, background: 'var(--gold)', border: 'none', color: '#0a0a0a', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                          >
                            {pagando[key] ? '...' : 'Pagar'}
                          </button>
                        </div>
                        <input
                          className="input-dark"
                          type="text" maxLength={200}
                          value={motivos[key] ?? ''}
                          onChange={e => setMotivos(m => ({ ...m, [key]: e.target.value }))}
                          placeholder="Concepto (ej: Pago comisión mayo)"
                          style={{ margin: '6px 0 0' }}
                        />
                        {error[key] && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error[key]}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Socios pendientes */}
            {socios.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤝 Socios con saldo pendiente</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {socios.map(s => {
                    const key = `s-${s.id}`;
                    if (pagados[key]) return null;
                    return (
                      <div key={key} className="card" style={{ padding: '12px 14px', borderColor: 'rgba(212,175,55,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{s.nombre}</span>
                          <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{(s.porcentaje * 100).toFixed(0)}% utilidad</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10, fontSize: 11, textAlign: 'center' }}>
                          <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                            <span style={{ color: 'var(--gray-muted)', display: 'block' }}>Beneficio</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(s.monto)}</span>
                          </div>
                          <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                            <span style={{ color: 'var(--gray-muted)', display: 'block' }}>Ya cobrado</span>
                            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{formatCurrency(s.pagado)}</span>
                          </div>
                          <div style={{ padding: '6px', borderRadius: 6, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                            <span style={{ color: 'var(--gray-muted)', display: 'block' }}>Pendiente</span>
                            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(s.saldoPendiente)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: error[key] ? 6 : 0 }}>
                          <input
                            className="input-dark"
                            type="number" inputMode="decimal" min="0.01" max="99999" step="0.01"
                            value={montos[key] ?? ''}
                            onKeyDown={e => { if (['-','e','E','+'].includes(e.key)) e.preventDefault(); }}
                            onChange={e => { setMontos(m => ({ ...m, [key]: e.target.value })); setError(er => ({ ...er, [key]: '' })); }}
                            placeholder="Monto a pagar"
                            style={{ flex: 1, margin: 0 }}
                          />
                          <button
                            onClick={() => pagarSocio(s)}
                            disabled={!!pagando[key]}
                            style={{ padding: '0 16px', borderRadius: 10, background: 'var(--gold)', border: 'none', color: '#0a0a0a', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                          >
                            {pagando[key] ? '...' : 'Pagar'}
                          </button>
                        </div>
                        <input
                          className="input-dark"
                          type="text" maxLength={200}
                          value={motivos[key] ?? ''}
                          onChange={e => setMotivos(m => ({ ...m, [key]: e.target.value }))}
                          placeholder="Concepto (ej: Pago utilidad mayo)"
                          style={{ margin: '6px 0 0' }}
                        />
                        {error[key] && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error[key]}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', fontSize: 12, color: 'var(--gray-muted)' }}>
              💡 Una vez pagados todos los saldos, cerrá el mes desde el Panel para bloquearlo.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistorialCierres() {
  const formatCurrency = useFmt();
  const cierres = useLiveQuery(() =>
    db.historico_cierres.orderBy('mes_ano').reverse().limit(12).toArray(), []
  );
  if (!cierres?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)', marginBottom: 12 }}>📋 Historial de Cierres</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cierres.map(c => (
          <div key={c.id} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{c.mes_ano}</p>
                <p style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Utilidad: {formatCurrency(c.utilidad_neta)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>{formatCurrency(c.ingresos_totales)}</p>
                <span className={`badge ${c.bloqueado ? 'badge-gold' : 'badge-green'}`}>
                  {c.bloqueado ? <><Lock size={9} /> Cerrado</> : <><Unlock size={9} /> Abierto</>}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalCerrarMes({ mes, year, resumen, fecha, onClose }: { mes: string; year: number; resumen: Resumen | null; fecha: Date; onClose: () => void; }) {
  const formatCurrency = useFmt();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setLoading(true);
    try {
      await cerrarMes(fecha);
      try { await exportarAGoogleDrive(); } catch {}
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar mes');
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">Cerrar {mes} {year}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>¡Mes cerrado correctamente!</p>
            <p style={{ fontSize: 13, color: 'var(--gray-muted)', marginTop: 6 }}>Copia de seguridad enviada a Drive</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--danger)' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13 }}>Esta acción bloqueará el mes y no podrá editarse. Se enviará una copia de seguridad a Google Drive automáticamente.</p>
              </div>
            </div>
            {resumen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Ingresos Totales', value: resumen.ingresos, color: GREEN },
                  { label: 'Gastos Fijos', value: resumen.gastos, color: RED },
                  { label: 'Comisiones', value: resumen.comisiones, color: GOLD },
                  { label: 'Utilidad Neta', value: resumen.utilidad_neta, color: resumen.utilidad_neta >= 0 ? GREEN : RED },
                  ...resumen.pagosPorSocio.map(s => ({ label: `💰 ${s.nombre} (${(s.porcentaje * 100).toFixed(0)}%)`, value: s.monto, color: GOLD })),
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--black-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-text)' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>
            )}
            <button className="btn-danger" style={{ marginTop: 8 }} disabled={loading} onClick={confirmar}>
              <Lock size={16} /> {loading ? 'Cerrando...' : 'Confirmar Cierre de Mes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
