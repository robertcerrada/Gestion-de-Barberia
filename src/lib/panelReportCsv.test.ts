import { describe, expect, it } from 'vitest';
import { buildPanelReportCsv } from './panelReportCsv';

describe('panel monthly CSV report', () => {
  it('builds the report downloaded from Panel with financial, barber, expense, and partner sections', () => {
    const csv = buildPanelReportCsv({
      mesLabel: 'Junio 2026',
      resumen: {
        ingresos: 150,
        gastos: 30,
        comisiones: 50,
        comision_bancaria: 5,
        utilidad_neta: 65,
        pago_esposa: 39,
        pago_socio: 26,
        pagosPorSocio: [
          { id: 1, nombre: 'Socia A', porcentaje: 0.6, monto: 39, pagado: 39, saldoPendiente: 0, debeBarberia: 0 },
          { id: 2, nombre: 'Socio B', porcentaje: 0.4, monto: 26, pagado: 0, saldoPendiente: 26, debeBarberia: 0 },
        ],
      },
      metodosPago: { comisionBancaria: 5, banco: 50, bancoNeto: 45 },
      ventasBarbero: [
        { nombre: 'Carlos', totalServicios: 100, comision: 50, porcentaje: 0.5 },
      ],
      ventasProductos: 50,
      gastosDetallados: [
        { fecha: new Date(2026, 5, 10, 12), categoria: 'alquiler', descripcion: 'Alquiler local', monto: 30 },
      ],
    });

    expect(csv).toContain('Reporte Mensual - Gestión de Barberia');
    expect(csv).toContain('Junio 2026');
    expect(csv).toContain('Ingresos Totales,€150.00');
    expect(csv).toContain('Comisión Bancaria,€5.00');
    expect(csv).toContain('Carlos,€100.00,€50.00,50%');
    expect(csv).toContain('10/06/2026,alquiler,Alquiler local,€30.00');
    expect(csv).toContain('Socio B,40%,26.00,0.00,26.00,Pendiente de pagar');
  });

  it('escapes commas and quotes so Excel keeps columns aligned', () => {
    const csv = buildPanelReportCsv({
      mesLabel: 'Junio 2026',
      resumen: {
        ingresos: 0,
        gastos: 0,
        comisiones: 0,
        comision_bancaria: 0,
        utilidad_neta: 0,
        pago_esposa: 0,
        pago_socio: 0,
        pagosPorSocio: [],
      },
      metodosPago: { comisionBancaria: 0, banco: 0, bancoNeto: 0 },
      ventasBarbero: [{ nombre: 'Carlos, "El Pro"', totalServicios: 0, comision: 0, porcentaje: 0.5 }],
      ventasProductos: 0,
      gastosDetallados: [],
    });

    expect(csv).toContain('"Carlos, ""El Pro""",€0.00,€0.00,50%');
  });
});
