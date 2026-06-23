import { format } from 'date-fns';
import type { GastoFijo } from './db';
import type { MetodosPagoMes, ResumenMes, VentaBarberoMes } from '@/domain/types';

export interface PanelReportCsvInput {
  mesLabel: string;
  resumen: ResumenMes;
  metodosPago: Pick<MetodosPagoMes, 'comisionBancaria' | 'banco' | 'bancoNeto'>;
  ventasBarbero: Pick<VentaBarberoMes, 'nombre' | 'totalServicios' | 'comision' | 'porcentaje'>[];
  ventasProductos: number;
  gastosDetallados: Pick<GastoFijo, 'fecha' | 'categoria' | 'descripcion' | 'monto'>[];
  currencySymbol?: string;
}

function money(value: number, symbol: string) {
  return `${symbol}${value.toFixed(2)}`;
}

function csvCell(value: string | number) {
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function row(values: Array<string | number>) {
  return `${values.map(csvCell).join(',')}\n`;
}

export function buildPanelReportCsv({
  mesLabel,
  resumen,
  metodosPago,
  ventasBarbero,
  ventasProductos,
  gastosDetallados,
  currencySymbol = '€',
}: PanelReportCsvInput) {
  let csv = `Reporte Mensual - Gestión de Barberia\n${mesLabel}\n\n`;
  csv += 'RESUMEN FINANCIERO\n';
  csv += row(['Concepto', 'Monto']);
  csv += row(['Ingresos Totales', money(resumen.ingresos, currencySymbol)]);
  csv += row(['Gastos Fijos', money(resumen.gastos, currencySymbol)]);
  csv += row(['Comisiones', money(resumen.comisiones, currencySymbol)]);
  csv += row(['Comisión Bancaria', money(metodosPago.comisionBancaria, currencySymbol)]);
  csv += row(['Banco Bruto', money(metodosPago.banco, currencySymbol)]);
  csv += row(['Banco Neto', money(metodosPago.bancoNeto, currencySymbol)]);
  csv += row(['Saldo Neto', money(resumen.utilidad_neta, currencySymbol)]);
  csv += row(['Pago Dueña (50%)', money(resumen.pago_esposa, currencySymbol)]);
  csv += row(['Pago Socio (50%)', money(resumen.pago_socio, currencySymbol)]);

  csv += '\nINGRESOS POR BARBERO\n';
  csv += row(['Barbero', 'Total Servicios', 'Comisión', '% Comisión']);
  for (const vb of ventasBarbero) {
    csv += row([vb.nombre, money(vb.totalServicios, currencySymbol), money(vb.comision, currencySymbol), `${(vb.porcentaje * 100).toFixed(0)}%`]);
  }
  csv += row(['La Barbería (Productos)', money(ventasProductos, currencySymbol), '—', '—']);

  csv += '\nGASTOS FIJOS DEL MES\n';
  csv += row(['Fecha', 'Categoría', 'Descripción', 'Monto']);
  for (const gasto of gastosDetallados) {
    csv += row([format(new Date(gasto.fecha), 'dd/MM/yyyy'), gasto.categoria, gasto.descripcion, money(gasto.monto, currencySymbol)]);
  }

  csv += '\nREPARTO DE SOCIOS\n';
  csv += row(['Socio', 'Porcentaje', 'Asignado', 'Pagado', 'Saldo', 'Estado']);
  for (const socio of resumen.pagosPorSocio) {
    const estado = socio.saldoPendiente > 0.01
      ? 'Pendiente de pagar'
      : socio.saldoPendiente < -0.01 ? 'Debe a la barbería' : 'Saldado';
    csv += row([
      socio.nombre,
      `${(socio.porcentaje * 100).toFixed(0)}%`,
      socio.monto.toFixed(2),
      socio.pagado.toFixed(2),
      socio.saldoPendiente.toFixed(2),
      estado,
    ]);
  }

  return csv;
}
