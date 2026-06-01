import { db, getConfig } from './db';
import type { Barbero, ServicioProducto, RegistroDiario, Adelanto, Socio } from './db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getMesAno } from '@/shared/utils/dates';
export { getMesAno };
import { sanitizeText, sanitizeNumber, sanitizeMimeType, isValidBase64, toDate, serializarFechas } from '@/shared/utils/sanitize';

function adelantoPerteneceASocio(adelanto: Adelanto, socio: Socio, barberoMismoId?: Barbero) {
  if (!socio.id || adelanto.barbero_id !== socio.id) return false;
  if (adelanto.destinatario_tipo === 'socio' || adelanto.destinatario_tipo === 'devolucion_socio' || adelanto.socio_id === socio.id) return true;
  if (!barberoMismoId) return true;
  return adelanto.motivo.toLowerCase().includes(socio.nombre.toLowerCase());
}

export async function isMesBloqueado(fecha: Date): Promise<boolean> {
  const mesAnoStr = getMesAno(fecha);
  const cierre = await db.historico_cierres.where('mes_ano').equals(mesAnoStr).first();
  return cierre?.bloqueado ?? false;
}

export async function getPorcentajeComisionBancaria(): Promise<number> {
  const valor = parseFloat(await getConfig('porcentaje_comision_bancaria') ?? '0');
  return Number.isFinite(valor) ? Math.max(0, Math.min(valor, 100)) : 0;
}

export async function calcularComisionBancaria(montoBanco: number): Promise<number> {
  const porcentaje = await getPorcentajeComisionBancaria();
  return Math.round((montoBanco * porcentaje / 100) * 1000) / 1000;
}

export async function getMoneda(): Promise<string> {
  return (await getConfig('moneda')) ?? '€';
}

export async function getComisionBrutaMes(barberoId: number, mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);

  // Usamos between() en lugar de .and() con comparación de fechas para evitar
  // inconsistencias cuando IndexedDB almacena fechas como strings vs Date objects.
  // Luego filtramos por barbero_id en memoria.
  const barbero = await db.barberos.get(barberoId);
  if (!barbero) return 0;
  const todosRegistros: RegistroDiario[] = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  const items: ServicioProducto[] = await db.servicios_productos.toArray();
  const itemMap = new Map(items.map(i => [i.id!, i]));
  const registros = todosRegistros.filter(r => r.barbero_id === barberoId);

  let comisionBruta = 0;
  for (const reg of registros) {
    const item = itemMap.get(reg.item_id);
    if (item?.tipo === 'servicio') {
      comisionBruta += reg.monto_total * barbero.porcentaje_comision;
    }
  }
  return comisionBruta;
}

export async function getAdelantosMes(barberoId: number, mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  // Usamos between() para consistencia con el resto de consultas de fechas.
  // Luego filtramos por barbero_id en memoria para evitar inconsistencias de tipos.
  const todosAdelantos: Adelanto[] = await db.Adelantos
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  const socioMismoId = await db.socios.get(barberoId);
  const barberoMismoId = await db.barberos.get(barberoId);
  const Adelantos = todosAdelantos.filter(a => a.barbero_id === barberoId);

  return Adelantos
    .filter(a => {
      // Excluir pagos a socios/dueños
      if (a.destinatario_tipo === 'socio' || a.destinatario_tipo === 'devolucion_socio' || a.socio_id) return false;
      // Excluir si el socioBárbero (cuando ID coincide con un socio) se llevó el adelanto
      if (socioMismoId && adelantoPerteneceASocio(a, socioMismoId, barberoMismoId)) return false;
      // Incluir solo adelantos a barberos (destinatario_tipo === 'barbero' o sin tipo definido para compatibilidad con registros viejos)
      return a.destinatario_tipo === 'barbero' || !a.destinatario_tipo || a.destinatario_tipo === '';
    })
    .reduce((sum, a) => sum + a.monto, 0);
}

export async function getPagosSocioMes(socioId: number, mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const socio = await db.socios.get(socioId);
  if (!socio) return 0;
  const barberoMismoId = await db.barberos.get(socioId);
  const todosAdelantos: Adelanto[] = await db.Adelantos
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  const adelantos = todosAdelantos.filter(a => a.barbero_id === socioId);
  return adelantos
    .filter(a => adelantoPerteneceASocio(a, socio, barberoMismoId))
    .reduce((sum, a) => sum + a.monto, 0);
}

export async function getSaldoDisponibleBarbero(barberoId: number, mes: Date = new Date()): Promise<number> {
  const comision = await getComisionBrutaMes(barberoId, mes);
  const Adelantos = await getAdelantosMes(barberoId, mes);
  return comision - Adelantos;
}

export async function getIngresosTotalesMes(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const registros = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  return registros.reduce((sum, r) => sum + r.monto_total, 0);
}

export async function getGastosTotalesMes(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const gastos = await db.gastos_fijos
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  return gastos.reduce((sum, g) => sum + g.monto, 0);
}

export async function getComisionesTotalesMes(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const registros = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .toArray();

  // Pre-fetch en batch para evitar N+1 queries
  const items: ServicioProducto[] = await db.servicios_productos.toArray();
  const barberos: Barbero[] = await db.barberos.toArray();
  const itemMap = new Map(items.map(i => [i.id!, i]));
  const barberoMap = new Map(barberos.map(b => [b.id!, b]));

  let total = 0;
  for (const reg of registros) {
    const item = itemMap.get(reg.item_id);
    if (item?.tipo === 'servicio') {
      const barbero = barberoMap.get(reg.barbero_id);
      if (barbero) {
        total += reg.monto_total * barbero.porcentaje_comision;
      }
    }
  }
  return total;
}

export async function getIngresosEfectivoMes(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const registros = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .and(r => r.metodo_pago === 'efectivo')
    .toArray();
  return registros.reduce((sum, r) => sum + r.monto_total, 0);
}

/**
 * Resumen de métodos de pago del mes.
 * Banco = suma de monto_banco de los arqueos diarios (fuente principal, ingresada manualmente).
 *         Si un día no tiene arqueo, se toma la suma de registros con metodo_pago='banco' como fallback.
 * Efectivo = total del mes - banco.
 */
export async function getMetodosPagoMes(mes: Date = new Date()): Promise<{
  efectivo: number;
  banco: number;
  bancoNeto: number;
  comisionBancaria: number;
  total: number;
}> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const diasEnMes = fin.getDate();

  const [registros, arqueos] = await Promise.all([
    db.registros_diarios.where('fecha').between(inicio, fin, true, true).toArray(),
    db.arqueo_caja.where('fecha').between(inicio, fin, true, true).toArray(),
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
      // Fallback: registros individuales marcados como banco
      const bancoRegistrosDia = registros
        .filter(r => r.fecha >= inicioD && r.fecha <= finD && r.metodo_pago === 'banco')
        .reduce((s, r) => s + r.monto_total, 0);
      bancoPorRegistros += bancoRegistrosDia;
    }
  }

  const banco = bancoPorArqueo + bancoPorRegistros;
  const efectivo = Math.max(0, total - banco);
  const comisionBancaria = await calcularComisionBancaria(banco);
  const bancoNeto = Math.max(0, banco - comisionBancaria);

  return { efectivo, banco, bancoNeto, comisionBancaria, total };
}

export async function getResumenMes(mes: Date = new Date()) {
  const ingresos = await getIngresosTotalesMes(mes);
  const gastos = await getGastosTotalesMes(mes);
  const comisiones = await getComisionesTotalesMes(mes);
  const metodos = await getMetodosPagoMes(mes);
  const comisionBancaria = metodos.comisionBancaria || 0;
  const utilidad_neta = ingresos - gastos - comisiones - comisionBancaria;

  // Leer socios activos para calcular reparto dinámico
  const socios = await db.socios.filter(s => s.activo).toArray();
  const totalPorcentaje = socios.reduce((sum, s) => sum + s.porcentaje_utilidad, 0);

  const pagosPorSocio = await Promise.all(socios.map(async (s) => {
    const monto = totalPorcentaje > 0 ? utilidad_neta * (s.porcentaje_utilidad / totalPorcentaje) : 0;
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
  }));

  // Compatibilidad con campos heredados pago_esposa / pago_socio
  // Primer socio activo -> pago_esposa (id más bajo), segundo -> pago_socio
  const sorted = [...pagosPorSocio].sort((a, b) => a.id - b.id);
  const pago_esposa = sorted[0]?.monto ?? 0;
  const pago_socio = sorted[1]?.monto ?? 0;

  return {
    ingresos,
    gastos,
    comisiones,
    comision_bancaria: comisionBancaria,
    utilidad_neta,
    pago_esposa,
    pago_socio,
    pagosPorSocio,
  };
}

export async function cerrarMes(mes: Date = new Date()): Promise<void> {
  const mesAno = getMesAno(mes);
  const existente = await db.historico_cierres.where('mes_ano').equals(mesAno).first();
  if (existente?.bloqueado) throw new Error('Este mes ya fue cerrado y bloqueado.');

  // ─ Validar que todos los barberos estén saldados ─
  const barberos = await db.barberos.filter(b => b.activo).toArray();
  const pendientesBarberos: string[] = [];
  for (const b of barberos) {
    if (!b.id) continue;
    const saldo = await getSaldoDisponibleBarbero(b.id, mes);
    if (saldo > 0.01) pendientesBarberos.push(`${b.nombre}: ${saldo.toFixed(2)}`);
  }
  if (pendientesBarberos.length > 0) {
    throw new Error(
      `No se puede cerrar el mes. Los siguientes barberos tienen saldo pendiente:\n${pendientesBarberos.join('\n')}\n\nRegistá los pagos antes de cerrar.`
    );
  }

  // ─ Validar que los socios estén saldados ─
  const resumen = await getResumenMes(mes);
  const pendientesSocios: string[] = [];
  for (const socio of resumen.pagosPorSocio) {
    if (socio.saldoPendiente > 0.01) {
      pendientesSocios.push(`${socio.nombre}: falta pagar ${socio.saldoPendiente.toFixed(2)}`);
    }
    if (socio.saldoPendiente < -0.01) {
      pendientesSocios.push(`${socio.nombre}: debe devolver ${Math.abs(socio.saldoPendiente).toFixed(2)} a la barbería`);
    }
  }
  if (pendientesSocios.length > 0) {
    throw new Error(
      `No se puede cerrar el mes. Los siguientes socios tienen pago pendiente:\n${pendientesSocios.join('\n')}\n\nRegistá los pagos antes de cerrar.`
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
    await db.historico_cierres.update(existente.id, datos);
  } else {
    await db.historico_cierres.add(datos);
  }
}

export async function getGastosPorCategoria(mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const gastos = await db.gastos_fijos
    .where('fecha').between(inicio, fin, true, true)
    .toArray();

  const categorias: Record<string, number> = {};
  for (const g of gastos) {
    categorias[g.categoria] = (categorias[g.categoria] || 0) + g.monto;
  }
  return Object.entries(categorias).map(([name, value]) => ({ name, value }));
}

export async function getHistoricoAnual(year: number) {
  const cierres = await db.historico_cierres.toArray();
  return cierres.filter(c => c.mes_ano.endsWith(String(year)));
}

export async function getSaldoFondoCaja(): Promise<number> {
  const movimientos = await db.fondo_caja.toArray();
  return movimientos.reduce((sum, m) => {
    return sum + (m.tipo === 'ingreso' ? m.monto : -m.monto);
  }, 0);
}

/**
 * Efectivo real disponible en caja para pagar a barberos/socios.
 * = Fondo de caja + Ingresos en efectivo del mes - Gastos ya registrados del mes - Adelantos/Pagos ya entregados del mes
 */
export async function getEfectivoDisponibleCaja(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);

  const [fondo, efectivoMes, gastosMes] = await Promise.all([
    getSaldoFondoCaja(),
    getIngresosEfectivoMes(mes),
    getGastosTotalesMes(mes),
  ]);

  // Sumar todos los adelantos/pagos ya realizados en el mes
  const adelantosMes = await db.Adelantos
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  // Los adelantos a barberos salen de su comisión y no del efectivo de la caja
  const totalAdelantosMes = adelantosMes
    .filter(a => a.destinatario_tipo !== 'barbero')
    .reduce((sum, a) => sum + a.monto, 0);

  return fondo + efectivoMes - gastosMes - totalAdelantosMes;
}

export async function getVentasDia(fecha: Date = new Date()): Promise<number> {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
  const fin = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
  const registros = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
  return registros.reduce((sum, r) => sum + r.monto_total, 0);
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

  // Buscar si ya existe un arqueo para este día (upsert)
  const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
  const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
  const existente = await db.arqueo_caja.where('fecha').between(inicioDia, finDia, true, true).first();

  const datos = { fecha, total_ventas, monto_banco: montoBanco, monto_efectivo, fondo_caja, debe_quedar, notas };

  if (existente?.id) {
    await db.arqueo_caja.update(existente.id, datos);
  } else {
    await db.arqueo_caja.add(datos);
  }

  // Registrar comisión bancaria como gasto_fijo
  const comision = await calcularComisionBancaria(montoBanco);
  // Usar between en lugar de equals para evitar fallos de comparación exacta de milisegundos en IndexedDB
  const inicioDiaG = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
  const finDiaG = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
  const gastosComisionExistentes = await db.gastos_fijos
    .where('fecha').between(inicioDiaG, finDiaG, true, true)
    .and(g => g.categoria === 'comision_bancaria')
    .toArray();
  await Promise.all(gastosComisionExistentes.map(g => db.gastos_fijos.delete(g.id!)));
  if (comision > 0) {
    const fechaGasto = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0);
    await db.gastos_fijos.add({
      fecha: fechaGasto,
      categoria: 'comision_bancaria',
      monto: comision,
      descripcion: 'Comisión bancaria (Arqueo)',
    });
  }

  return { debe_quedar, monto_efectivo, total_ventas, fondo_caja };
}

export async function getArqueoDia(fecha: Date) {
  const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0);
  const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59);
  return db.arqueo_caja.where('fecha').between(inicioDia, finDia, true, true).first() ?? null;
}

export async function getMesesAbiertosYPendientes() {
  const hoy = new Date();
  const cierres = await db.historico_cierres.toArray();
  const mesesCerradosSet = new Set<string>();
for (const c of cierres) {
  if (c.bloqueado) {
    mesesCerradosSet.add(c.mes_ano);
  }
}

  // Partir desde el primer registro en la DB hasta el mes anterior al actual
  const primerRegistro = await db.registros_diarios.orderBy('fecha').first();
  if (!primerRegistro) return [];

  const primerFecha = new Date(primerRegistro.fecha);
  const resultado: {
    mesAno: string;
    mes: string;
    ingresos: number;
    gastos: number;
    comisiones: number;
    utilidad: number;
    sociosSinPagar: { nombre: string; monto: number }[];
    totalPendiente: number;
  }[] = [];

  let anio = primerFecha.getFullYear();
  let mes = primerFecha.getMonth();

  // Solo iterar hasta el mes ANTERIOR al actual (el mes en curso no se cierra aún)
  while (
    anio < hoy.getFullYear() ||
    (anio === hoy.getFullYear() && mes < hoy.getMonth())
  ) {
    const mesAno = `${String(mes + 1).padStart(2, '0')}-${anio}`;

    // Solo mostrar si NO está cerrado/bloqueado
    if (!mesesCerradosSet.has(mesAno)) {
      const fechaMes = new Date(anio, mes, 1, 12, 0, 0);
      const inicio = startOfMonth(fechaMes);
      const fin = endOfMonth(fechaMes);

      // Solo incluir si tiene ventas registradas
      const cantRegistros = await db.registros_diarios
        .where('fecha').between(inicio, fin, true, true)
        .count();

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

  // Más reciente primero
  return resultado.sort((a, b) => b.mesAno.localeCompare(a.mesAno));
}

// ─── BACKUP VERSION ────────────────────────────────────────────────────────

/**
 * Returns a list of dates (YYYY-MM-DD) for which a cash‑record (arqueo) exists.
 * Used by the cash‑reconciliation modal date picker to enable only dates with records.
 */
export async function getCashRecordDates(): Promise<string[]> {
  // Fetch all cash‑record entries
  const arqueos = await db.arqueo_caja.toArray();
  const fechasSet = new Set<string>();
  arqueos.forEach(a => {
    // Ensure we work with a Date object (could be stored as Date or ISO string)
    const fecha: Date = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
    // Store only the date part (YYYY-MM-DD) for easy comparison
    fechasSet.add(fecha.toISOString().split('T')[0]);
  });
  return Array.from(fechasSet);
}


const BACKUP_VERSION = 3;

export async function exportarTodosLosDatos() {
  const [
    barberos,
    servicios,
    registros,
    adelantos,
    gastos,
    historico,
    fondo,
    arqueos,
    config,
    socios,
    documentos,
  ] = await Promise.all([
    db.barberos.toArray(),
    db.servicios_productos.toArray(),
    db.registros_diarios.toArray(),
    db.Adelantos.toArray(),
    db.gastos_fijos.toArray(),
    db.historico_cierres.toArray(),
    db.fondo_caja.toArray(),
    db.arqueo_caja.toArray(),
    db.config_barberia.toArray(),
    db.socios.toArray(),
    db.documentos_barbero.toArray(),
  ]);

  // serializarFechas se importa desde @/shared/utils/sanitize.ts
  const payload = {
    version: BACKUP_VERSION,
    fecha_exportacion: new Date().toISOString(),
    db_version: 7,           // versión actual del schema de Dexie
    barberos:              serializarFechas(barberos),
    servicios_productos:   serializarFechas(servicios),
    registros_diarios:     serializarFechas(registros),
    Adelantos:             serializarFechas(adelantos),
    gastos_fijos:          serializarFechas(gastos),
    historico_cierres:     serializarFechas(historico),
    fondo_caja:            serializarFechas(fondo),
    arqueo_caja:           serializarFechas(arqueos),
    config_barberia:       serializarFechas(config),
    socios:                serializarFechas(socios),
    documentos_barbero:    serializarFechas(documentos),
  };

  return JSON.stringify(payload, null, 2);
}

// Sanitización movida a @/shared/utils/sanitize.ts
// Las funciones sanitizeText, sanitizeNumber, sanitizeMimeType, isValidBase64, toDate, serializarFechas
// se importan desde arriba.

export async function restaurarDesdeDatos(jsonStr: string) {
  // ─ Validaciones básicas ─
  if (!jsonStr || typeof jsonStr !== 'string' || jsonStr.length > 100 * 1024 * 1024) {
    throw new Error('Archivo inválido o demasiado grande (máx. 100 MB).');
  }
  let datos: any;
  try {
    datos = JSON.parse(jsonStr);
  } catch {
    throw new Error('El archivo no tiene formato JSON válido.');
  }
  if (!datos || typeof datos !== 'object') throw new Error('Formato de backup inválido.');

  // Advertir si el backup viene de una versión futura del schema
  const DB_VERSION_ACTUAL = 7;
  if (typeof datos.db_version === 'number' && datos.db_version > DB_VERSION_ACTUAL) {
    throw new Error(
      `Este backup fue creado con una versión más nueva de la app (schema v${datos.db_version}). ` +
      `Actualizá la app antes de restaurar para no perder datos.`
    );
  }

  // toDate se importa desde @/shared/utils/sanitize.ts — no redefinir localmente.

  const categoriasValidas = ['internet','alquiler','limpieza','insumos','impuestos','camaras','seguro','luz','agua','gestoria','comision_bancaria','otro'];

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
    // Limpiar todas las tablas
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

    // ─ Barberos ─
    if (Array.isArray(datos.barberos) && datos.barberos.length) {
      const clean = datos.barberos.map((b: any) => ({
        ...(Number.isInteger(b.id) && b.id > 0 ? { id: b.id } : {}),
        nombre: sanitizeText(b.nombre) || 'Barbero',
        porcentaje_comision: sanitizeNumber(b.porcentaje_comision, 0, 1),
        activo: b.activo !== false,   // por defecto activo si falta el campo
      }));
      await db.barberos.bulkAdd(clean);
    }

    // ─ Servicios y productos ─
    if (Array.isArray(datos.servicios_productos) && datos.servicios_productos.length) {
      const clean = datos.servicios_productos.map((s: any) => ({
        ...(Number.isInteger(s.id) && s.id > 0 ? { id: s.id } : {}),
        nombre: sanitizeText(s.nombre) || 'Servicio',
        tipo: s.tipo === 'producto' ? 'producto' : 'servicio',
        precio: sanitizeNumber(s.precio, 0, 99999),
        ...(s.stock_actual !== undefined && s.stock_actual !== null
          ? { stock_actual: sanitizeNumber(s.stock_actual, 0, 99999) }
          : {}),
        ...(s.stock_minimo !== undefined && s.stock_minimo !== null
          ? { stock_minimo: sanitizeNumber(s.stock_minimo, 0, 99999) }
          : {}),
      }));
      await db.servicios_productos.bulkAdd(clean as any);
    }

    // ─ Registros diarios ─
    if (Array.isArray(datos.registros_diarios) && datos.registros_diarios.length) {
      const clean = datos.registros_diarios.map((r: any) => ({
        ...(Number.isInteger(r.id) && r.id > 0 ? { id: r.id } : {}),
        fecha: toDate(r.fecha),
        barbero_id: sanitizeNumber(r.barbero_id, 0),
        item_id: sanitizeNumber(r.item_id, 1),
        monto_total: sanitizeNumber(r.monto_total, 0, 99999),
        metodo_pago: r.metodo_pago === 'banco' ? 'banco' : 'efectivo',
      }));
      await db.registros_diarios.bulkAdd(clean);
    }

    // ─ Adelantos ─
    if (Array.isArray(datos.Adelantos) && datos.Adelantos.length) {
      const clean = datos.Adelantos.map((a: any) => ({
        ...(Number.isInteger(a.id) && a.id > 0 ? { id: a.id } : {}),
        fecha: toDate(a.fecha),
        barbero_id: sanitizeNumber(a.barbero_id, 0),
        monto: sanitizeNumber(a.monto, -99999, 99999),
        motivo: sanitizeText(a.motivo) || 'Adelanto',
        destinatario_tipo: ['barbero','socio','devolucion_socio'].includes(a.destinatario_tipo)
          ? a.destinatario_tipo
          : (a.destinatario_tipo == null || a.destinatario_tipo === '' ? undefined : 'barbero'),
        ...(a.socio_id != null ? { socio_id: sanitizeNumber(a.socio_id, 0) } : {}),
      }));
      await db.Adelantos.bulkAdd(clean);
    }

    // ─ Gastos fijos ─
    if (Array.isArray(datos.gastos_fijos) && datos.gastos_fijos.length) {
      const clean = datos.gastos_fijos.map((g: any) => ({
        ...(Number.isInteger(g.id) && g.id > 0 ? { id: g.id } : {}),
        fecha: toDate(g.fecha),
        categoria: categoriasValidas.includes(g.categoria) ? g.categoria : 'otro',
        monto: sanitizeNumber(g.monto, 0, 99999),
        descripcion: sanitizeText(g.descripcion) || 'Gasto',
      }));
      await db.gastos_fijos.bulkAdd(clean);
    }

    // ─ Histórico cierres ─
    if (Array.isArray(datos.historico_cierres) && datos.historico_cierres.length) {
      const clean = datos.historico_cierres.map((h: any) => ({
        ...(Number.isInteger(h.id) && h.id > 0 ? { id: h.id } : {}),
        mes_ano: sanitizeText(h.mes_ano),
        ingresos_totales: sanitizeNumber(h.ingresos_totales),
        gastos_totales: sanitizeNumber(h.gastos_totales),
        comisiones_pagadas: sanitizeNumber(h.comisiones_pagadas),
        utilidad_neta: sanitizeNumber(h.utilidad_neta, -9999999),
        pago_esposa: sanitizeNumber(h.pago_esposa),
        pago_socio: sanitizeNumber(h.pago_socio),
        bloqueado: !!h.bloqueado,
        fecha_cierre: toDate(h.fecha_cierre),
      }));
      await db.historico_cierres.bulkAdd(clean);
    }

    // ─ Fondo de caja ─
    if (Array.isArray(datos.fondo_caja) && datos.fondo_caja.length) {
      const clean = datos.fondo_caja.map((f: any) => ({
        ...(Number.isInteger(f.id) && f.id > 0 ? { id: f.id } : {}),
        fecha: toDate(f.fecha),
        monto: sanitizeNumber(f.monto, 0, 99999),
        tipo: f.tipo === 'egreso' ? 'egreso' : 'ingreso',
        motivo: sanitizeText(f.motivo) || 'Movimiento',
      }));
      await db.fondo_caja.bulkAdd(clean);
    }

    // ─ Arqueos de caja (nuevo en v3) ─
    if (Array.isArray(datos.arqueo_caja) && datos.arqueo_caja.length) {
      const clean = datos.arqueo_caja.map((a: any) => ({
        ...(Number.isInteger(a.id) && a.id > 0 ? { id: a.id } : {}),
        fecha: toDate(a.fecha),
        total_ventas: sanitizeNumber(a.total_ventas, 0),
        monto_banco: sanitizeNumber(a.monto_banco, 0),
        monto_efectivo: sanitizeNumber(a.monto_efectivo, 0),
        fondo_caja: sanitizeNumber(a.fondo_caja, 0),
        debe_quedar: sanitizeNumber(a.debe_quedar, 0),
        ...(a.notas != null ? { notas: sanitizeText(a.notas) } : {}),
      }));
      await db.arqueo_caja.bulkAdd(clean);
    }

    // ─ Configuración de la barbería (nuevo en v3) ─
    if (Array.isArray(datos.config_barberia) && datos.config_barberia.length) {
      const clavesPermitidas = [
        'nombre_barberia', 'logo_data', 'emails_autorizados',
        'pin_hash', 'pin_salt', 'porcentaje_comision_bancaria', 'moneda',
      ];
      const clean = datos.config_barberia
        .filter((c: any) => typeof c.clave === 'string' && clavesPermitidas.includes(c.clave))
        .map((c: any) => ({
          clave: c.clave,
          valor: typeof c.valor === 'string' ? c.valor.slice(0, 200_000) : '',
        }));
      if (clean.length) await db.config_barberia.bulkAdd(clean);
    }

    // ─ Documentos de barberos (nuevo en v3) ─
    if (Array.isArray(datos.documentos_barbero) && datos.documentos_barbero.length) {
      const tiposValidos = ['dni','contrato','alquiler_silla','certificado','foto_perfil','otro'];
      const clean = datos.documentos_barbero
        .filter((d: any) => {
          const mimeType = sanitizeMimeType(d.mime_type);
          return Number.isInteger(d.barbero_id) && d.barbero_id > 0 &&
                 typeof d.nombre === 'string' &&
                 mimeType &&
                 typeof d.data === 'string' &&
                 isValidBase64(d.data) &&
                 d.data.length <= 120 * 1024 * 1024;
        })
        .map((d: any) => ({
          ...(Number.isInteger(d.id) && d.id > 0 ? { id: d.id } : {}),
          barbero_id: d.barbero_id,
          tipo: tiposValidos.includes(d.tipo) ? d.tipo : 'otro',
          nombre: sanitizeText(d.nombre),
          descripcion: d.descripcion ? sanitizeText(d.descripcion) : undefined,
          mime_type: sanitizeMimeType(d.mime_type),
          data: d.data,
          fecha_subida: toDate(d.fecha_subida),
          tamano_bytes: sanitizeNumber(d.tamano_bytes, 0, 100 * 1024 * 1024), // máx 100 MB
        }));
      if (clean.length) {
        await db.documentos_barbero.bulkAdd(clean as any);
      }
    }

    // ─ Socios (nuevo en v3) ─
    if (Array.isArray(datos.socios) && datos.socios.length) {
      const clean = datos.socios.map((s: any) => ({
        ...(Number.isInteger(s.id) && s.id > 0 ? { id: s.id } : {}),
        nombre: sanitizeText(s.nombre) || 'Socio',
        porcentaje_utilidad: sanitizeNumber(s.porcentaje_utilidad, 0, 1),
        activo: s.activo !== false,
        rol: sanitizeText(s.rol) || 'Socio',
      }));
      await db.socios.bulkAdd(clean);
    }
  });
}

export async function reabrirMes(mes: Date): Promise<void> {
  const mesAno = getMesAno(mes);
  const cierre = await db.historico_cierres.where('mes_ano').equals(mesAno).first();
  if (!cierre?.id) throw new Error('No se encontró un cierre para este mes.');
  await db.historico_cierres.update(cierre.id, { bloqueado: false });
}

export async function getVentasPorBarberoMes(mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const registros = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .toArray();

  const barberos = await db.barberos.toArray();
  const servicios = await db.servicios_productos.toArray();

  const result: { barberoId: number; nombre: string; totalServicios: number; comision: number; porcentaje: number; pagado: number; saldoPendiente: number }[] = [];

  for (const b of barberos) {
    if (!b.id) continue;
    const ventas = registros.filter(r => r.barbero_id === b.id);
    const totalServicios = ventas
      .filter(r => {
        const item = servicios.find(s => s.id === r.item_id);
        return item?.tipo === 'servicio';
      })
      .reduce((sum, r) => sum + r.monto_total, 0);

    const comision = totalServicios * b.porcentaje_comision;
    const pagado = await getAdelantosMes(b.id, mes);

    result.push({
      barberoId: b.id,
      nombre: b.nombre,
      totalServicios,
      comision,
      porcentaje: b.porcentaje_comision,
      pagado,
      saldoPendiente: comision - pagado,
    });
  }

  return result;
}

export async function getVentasProductosMes(mes: Date = new Date()): Promise<number> {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const registros = await db.registros_diarios
    .where('fecha').between(inicio, fin, true, true)
    .toArray();

  const servicios = await db.servicios_productos.toArray();
  return registros
    .filter(r => {
      const item = servicios.find(s => s.id === r.item_id);
      return item?.tipo === 'producto';
    })
    .reduce((sum, r) => sum + r.monto_total, 0);
}

export async function getGastosDetalladosMes(mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  return db.gastos_fijos
    .where('fecha').between(inicio, fin, true, true)
    .toArray();
}

export async function getIngresosDiariosConGastosMes(mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const diasEnMes = fin.getDate();

  const [registros, gastos] = await Promise.all([
    db.registros_diarios.where('fecha').between(inicio, fin, true, true).toArray(),
    db.gastos_fijos.where('fecha').between(inicio, fin, true, true).toArray(),
  ]);

  const dias: { dia: string; ingresos: number; gastos: number }[] = [];
  for (let d = 1; d <= diasEnMes; d++) {
    const inicioD = new Date(mes.getFullYear(), mes.getMonth(), d, 0, 0, 0);
    const finD = new Date(mes.getFullYear(), mes.getMonth(), d, 23, 59, 59);
    const ingresos = registros
      .filter(r => r.fecha >= inicioD && r.fecha <= finD)
      .reduce((s, r) => s + r.monto_total, 0);
    const gastosDia = gastos
      .filter(g => g.fecha >= inicioD && g.fecha <= finD)
      .reduce((s, g) => s + g.monto, 0);
    if (ingresos > 0 || gastosDia > 0) {
      dias.push({ dia: String(d), ingresos, gastos: gastosDia });
    }
  }
  return dias;
}

export async function getAdelantosSocioMes(socioId: number, mes: Date = new Date()) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const [socio, barberoMismoId] = await Promise.all([
    db.socios.get(socioId),
    db.barberos.get(socioId),
  ]);
  if (!socio) return [];
  const adelantos = await db.Adelantos
    .where('barbero_id').equals(socioId)
    .and(a => a.fecha >= inicio && a.fecha <= fin)
    .toArray();
  return adelantos.filter(a => adelantoPerteneceASocio(a, socio, barberoMismoId));
}

const NOMBRES_MESES_PEND = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export interface MesPendiente {
  mesAno: string;
  label: string;
  fechaMes: Date;
  noCerrado: boolean;
  barberosPendientes: { id: number; nombre: string; saldo: number }[];
}

export async function getMesesPendientes(): Promise<MesPendiente[]> {
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const primerRegistro = await db.registros_diarios.orderBy('fecha').first();
  if (!primerRegistro) return [];

  const primerFecha = new Date(primerRegistro.fecha);
  const barberos = await db.barberos.filter(b => b.activo).toArray();
  const cierres = await db.historico_cierres.toArray();

  const pendientes: MesPendiente[] = [];

  let anio = primerFecha.getFullYear();
  let mes = primerFecha.getMonth();

  while (anio < anioActual || (anio === anioActual && mes < mesActual)) {
    const fechaMes = new Date(anio, mes, 1);
    const mesAno = `${String(mes + 1).padStart(2, '0')}-${anio}`;
    const label = `${NOMBRES_MESES_PEND[mes]} ${anio}`;

    const inicio = startOfMonth(fechaMes);
    const fin = endOfMonth(fechaMes);
    const registrosMes = await db.registros_diarios
      .where('fecha').between(inicio, fin, true, true)
      .count();

    if (registrosMes > 0) {
      const cierre = cierres.find(c => c.mes_ano === mesAno);
      const noCerrado = !cierre || !cierre.bloqueado;

      const barberosPendientes: { id: number; nombre: string; saldo: number }[] = [];
      for (const b of barberos) {
        if (!b.id) continue;
        const saldo = await getSaldoDisponibleBarbero(b.id, fechaMes);
        if (saldo > 0.01) {
          barberosPendientes.push({ id: b.id, nombre: b.nombre, saldo });
        }
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
