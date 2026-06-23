import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  cerrarMes,
  exportarTodosLosDatos,
  getComisionBrutaMes,
  getResumenMes,
  getSaldoDisponibleBarbero,
  restaurarDesdeDatos,
} from './business';

async function resetDb() {
  await db.open();
  await db.transaction('rw', [
    db.barberos,
    db.servicios_productos,
    db.registros_diarios,
    db.Adelantos,
    db.gastos_fijos,
    db.historico_cierres,
    db.fondo_caja,
    db.arqueo_caja,
    db.config_barberia,
    db.socios,
    db.documentos_barbero,
  ], async () => {
    await Promise.all([
      db.barberos.clear(),
      db.servicios_productos.clear(),
      db.registros_diarios.clear(),
      db.Adelantos.clear(),
      db.gastos_fijos.clear(),
      db.historico_cierres.clear(),
      db.fondo_caja.clear(),
      db.arqueo_caja.clear(),
      db.config_barberia.clear(),
      db.socios.clear(),
      db.documentos_barbero.clear(),
    ]);
  });
}

async function seedMonth() {
  const fecha = new Date(2026, 5, 10, 12, 0, 0);
  const barberoId = await db.barberos.add({ nombre: 'Carlos', porcentaje_comision: 0.5, activo: true });
  const socioAId = await db.socios.add({ nombre: 'Socia A', porcentaje_utilidad: 0.6, activo: true, rol: 'Dueña' });
  const socioBId = await db.socios.add({ nombre: 'Socio B', porcentaje_utilidad: 0.4, activo: true, rol: 'Socio' });
  const corteId = await db.servicios_productos.add({ nombre: 'Corte', tipo: 'servicio', precio: 100 });
  const ceraId = await db.servicios_productos.add({ nombre: 'Cera', tipo: 'producto', precio: 50 });

  await db.registros_diarios.bulkAdd([
    { fecha, barbero_id: barberoId, item_id: corteId, monto_total: 100, metodo_pago: 'efectivo' },
    { fecha, barbero_id: barberoId, item_id: ceraId, monto_total: 50, metodo_pago: 'banco' },
  ]);
  await db.Adelantos.add({ fecha, barbero_id: barberoId, monto: 20, motivo: 'Pago parcial', destinatario_tipo: 'barbero' });
  await db.gastos_fijos.add({ fecha, categoria: 'alquiler', monto: 30, descripcion: 'Alquiler' });
  await db.config_barberia.add({ clave: 'porcentaje_comision_bancaria', valor: '10' });

  return { fecha, barberoId, socioAId, socioBId };
}

beforeEach(async () => {
  await resetDb();
});

describe('business calculations', () => {
  it('calculates commissions, available balance, and monthly summary', async () => {
    const { fecha, barberoId } = await seedMonth();

    await expect(getComisionBrutaMes(barberoId, fecha)).resolves.toBe(50);
    await expect(getSaldoDisponibleBarbero(barberoId, fecha)).resolves.toBe(30);

    const resumen = await getResumenMes(fecha);
    expect(resumen.ingresos).toBe(150);
    expect(resumen.gastos).toBe(30);
    expect(resumen.comisiones).toBe(50);
    expect(resumen.comision_bancaria).toBe(5);
    expect(resumen.utilidad_neta).toBe(65);
    expect(resumen.pagosPorSocio.map(s => ({ nombre: s.nombre, monto: s.monto }))).toEqual([
      { nombre: 'Socia A', monto: 39 },
      { nombre: 'Socio B', monto: 26 },
    ]);
  });

  it('blocks closing a month until barber and partner balances are settled', async () => {
    const { fecha, barberoId, socioAId, socioBId } = await seedMonth();

    await expect(cerrarMes(fecha)).rejects.toThrow(/barberos tienen saldo pendiente/i);

    await db.Adelantos.bulkAdd([
      { fecha, barbero_id: barberoId, monto: 30, motivo: 'Saldo comisión', destinatario_tipo: 'barbero' },
      { fecha, barbero_id: socioAId, socio_id: socioAId, monto: 39, motivo: 'Pago utilidad', destinatario_tipo: 'socio' },
      { fecha, barbero_id: socioBId, socio_id: socioBId, monto: 26, motivo: 'Pago utilidad', destinatario_tipo: 'socio' },
    ]);

    await expect(cerrarMes(fecha)).resolves.toBeUndefined();
    const cierre = await db.historico_cierres.where('mes_ano').equals('06-2026').first();
    expect(cierre?.bloqueado).toBe(true);
    expect(cierre?.utilidad_neta).toBe(65);
  });
});

describe('backup restore', () => {
  it('exports and restores business data with sanitization', async () => {
    await seedMonth();
    const exported = await exportarTodosLosDatos();

    await resetDb();
    await restaurarDesdeDatos(exported);

    expect(await db.registros_diarios.count()).toBe(2);
    expect(await db.barberos.count()).toBe(1);
  });

  it('rejects invalid or future backups before mutating the database', async () => {
    await seedMonth();

    await expect(restaurarDesdeDatos(JSON.stringify({ db_version: 999, barberos: [] })))
      .rejects.toThrow(/versi/i);
    expect(await db.barberos.count()).toBe(1);

    await expect(restaurarDesdeDatos(JSON.stringify({ barberos: 'not-an-array' })))
      .rejects.toThrow(/backup/i);
    expect(await db.barberos.count()).toBe(1);
  });
});
