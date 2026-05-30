import * as xlsx from 'xlsx';
import { db, getConfig, setConfig } from './db';

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const CATS_VALIDAS = ['alquiler','internet','limpieza','insumos','impuestos','camaras','seguro','luz','agua','gestoria','otro'] as const;

export async function exportToExcel() {
  const [registros, adelantos, gastos, barberos, servicios, socios] = await Promise.all([
    db.registros_diarios.toArray(),
    db.Adelantos.toArray(),
    db.gastos_fijos.toArray(),
    db.barberos.toArray(),
    db.servicios_productos.toArray(),
    db.socios.toArray(),
  ]);

  const wb = xlsx.utils.book_new();

  // ─ Hoja 1: Ventas ─
  const ventasData = registros.map(r => {
    const barbero = barberos.find(b => b.id === r.barbero_id);
    const item = servicios.find(s => s.id === r.item_id);
    return {
      Fecha: formatDate(r.fecha),
      Barbero: barbero ? barbero.nombre : 'La Barbería',
      'Servicio/Producto': item ? item.nombre : 'Desconocido',
      Monto: r.monto_total,
      'Metodo de Pago': r.metodo_pago,
    };
  });
  const wsVentas = xlsx.utils.json_to_sheet(
    ventasData.length > 0
      ? ventasData
      : [{ Fecha: 'DD/MM/YYYY', Barbero: 'Nombre del barbero', 'Servicio/Producto': 'Corte Clásico', Monto: 0, 'Metodo de Pago': 'efectivo' }]
  );
  xlsx.utils.book_append_sheet(wb, wsVentas, 'Ventas');

  // ─ Hoja 2: Pagos y Adelantos ─
  const pagosData = adelantos.map(a => {
    let nombre = `ID #${a.barbero_id}`;
    if (a.destinatario_tipo === 'barbero') {
      const b = barberos.find(x => x.id === a.barbero_id);
      if (b) nombre = b.nombre;
    } else {
      const s = socios.find(x => x.id === (a.socio_id ?? a.barbero_id));
      if (s) nombre = s.nombre;
    }
    return {
      Fecha: formatDate(a.fecha),
      Destinatario: nombre,
      Tipo: a.destinatario_tipo ?? 'barbero',
      Monto: a.monto,
      Motivo: a.motivo,
    };
  });
  const wsPagos = xlsx.utils.json_to_sheet(
    pagosData.length > 0
      ? pagosData
      : [{ Fecha: 'DD/MM/YYYY', Destinatario: 'Nombre', Tipo: 'barbero / socio / devolucion_socio', Monto: 0, Motivo: 'Adelanto' }]
  );
  xlsx.utils.book_append_sheet(wb, wsPagos, 'Pagos_Adelantos');

  // ─ Hoja 3: Gastos ─
  const gastosData = gastos.map(g => ({
    Fecha: formatDate(g.fecha),
    Categoria: g.categoria,
    Monto: g.monto,
    Descripcion: g.descripcion,
  }));
  const wsGastos = xlsx.utils.json_to_sheet(
    gastosData.length > 0
      ? gastosData
      : [{ Fecha: 'DD/MM/YYYY', Categoria: 'alquiler', Monto: 0, Descripcion: 'Ejemplo' }]
  );
  xlsx.utils.book_append_sheet(wb, wsGastos, 'Gastos');

  // ─ Hoja 4: Referencia (barberos, servicios, socios disponibles) ─
  const refBarberos = barberos.map(b => ({ Nombre: b.nombre, Tipo: 'Barbero', 'Comision %': `${(b.porcentaje_comision * 100).toFixed(0)}%`, Activo: b.activo ? 'Sí' : 'No' }));
  const refServicios = servicios.map(s => ({ Nombre: s.nombre, Tipo: s.tipo === 'servicio' ? 'Servicio' : 'Producto', 'Precio Base': s.precio, Activo: 'Sí' }));
  const refSocios = socios.map(s => ({ Nombre: s.nombre, Tipo: 'Socio', 'Utilidad %': `${(s.porcentaje_utilidad * 100).toFixed(0)}%`, Activo: s.activo ? 'Sí' : 'No' }));
  const refCats = CATS_VALIDAS.map(c => ({ 'Categorias validas para Gastos': c }));

  const wsRef = xlsx.utils.json_to_sheet([
    { '--- BARBEROS ---': '', '': '' },
    ...refBarberos.map(b => ({ '--- BARBEROS ---': b.Nombre, '': `Comisión ${b['Comision %']} | ${b.Activo === 'Sí' ? 'Activo' : 'Inactivo'}` })),
    { '--- BARBEROS ---': '', '': '' },
    { '--- BARBEROS ---': '--- SERVICIOS Y PRODUCTOS ---', '': '' },
    ...refServicios.map(s => ({ '--- BARBEROS ---': s.Nombre, '': `${s.Tipo} | ${s['Precio Base']}` })),
    { '--- BARBEROS ---': '', '': '' },
    { '--- BARBEROS ---': '--- SOCIOS ---', '': '' },
    ...refSocios.map(s => ({ '--- BARBEROS ---': s.Nombre, '': `Utilidad ${s['Utilidad %']} | ${s.Activo === 'Sí' ? 'Activo' : 'Inactivo'}` })),
    { '--- BARBEROS ---': '', '': '' },
    { '--- BARBEROS ---': '--- CATEGORIAS DE GASTOS ---', '': '' },
    ...refCats.map(c => ({ '--- BARBEROS ---': c['Categorias validas para Gastos'], '': '' })),
  ]);
  xlsx.utils.book_append_sheet(wb, wsRef, 'Referencia');

  // ─ Hoja 5: Configuración ─
  const porcentaje = (await getConfig('porcentaje_comision_bancaria')) || '0';
  const configData = [
    { Clave: 'porcentaje_comision_bancaria', Valor: porcentaje },
  ];
  const wsConfig = xlsx.utils.json_to_sheet(configData);
  xlsx.utils.book_append_sheet(wb, wsConfig, 'Configuracion');

  xlsx.writeFile(wb, `HistoricoBarberia_${formatDate(new Date()).replace(/\//g, '-')}.xlsx`);
}

function parseDate(str: string | number): Date | null {
  if (!str) return null;
  // DD/MM/YYYY
  const parts = String(str).split('/');
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  // ISO string u otro formato
  if (typeof str === 'string') {
    const d2 = new Date(str);
    if (!isNaN(d2.getTime())) { d2.setHours(12, 0, 0, 0); return d2; }
  }
  // Número serial de Excel
  if (typeof str === 'number') {
    const d3 = new Date(Math.round((str - 25569) * 864e5));
    d3.setHours(12, 0, 0, 0);
    if (!isNaN(d3.getTime())) return d3;
  }
  return null;
}

export async function importFromExcel(file: File) {
  const data = await file.arrayBuffer();
  const wb = xlsx.read(data);

  const [barberos, servicios, socios] = await Promise.all([
    db.barberos.toArray(),
    db.servicios_productos.toArray(),
    db.socios.toArray(),
  ]);

  // Leer configuración si existe en la hoja 'Configuracion'
  if (wb.Sheets['Configuracion']) {
    try {
      const conf = xlsx.utils.sheet_to_json<any>(wb.Sheets['Configuracion']);
      for (const row of conf) {
        const clave = String(row.Clave || '').trim();
        const valor = String(row.Valor || '').trim();
        if (!clave) continue;
        if (clave === 'porcentaje_comision_bancaria') {
          await setConfig('porcentaje_comision_bancaria', valor);
        }
      }
    } catch (e) { /* ignore */ }
  }

  let importedVentas = 0;
  let importedPagos = 0;
  let importedGastos = 0;
  const errores: string[] = [];

  // ─ Hoja Ventas ─
  if (wb.Sheets['Ventas']) {
    const ventas = xlsx.utils.sheet_to_json<any>(wb.Sheets['Ventas']);
    for (const [i, row] of ventas.entries()) {
      if (!row.Fecha || row.Monto === undefined || row.Monto === '') continue;
      const monto = Number(row.Monto);
      if (isNaN(monto) || monto <= 0) continue;

      const fechaDate = parseDate(row.Fecha);
      if (!fechaDate) { errores.push(`Ventas fila ${i + 2}: fecha inválida ("${row.Fecha}")`); continue; }

      const nombreBarbero = String(row.Barbero || '').trim();
      const nombreItem = String(row['Servicio/Producto'] || '').trim();

      const barbero = barberos.find(b => b.nombre.toLowerCase() === nombreBarbero.toLowerCase());
      const item = servicios.find(s => s.nombre.toLowerCase() === nombreItem.toLowerCase());

      if (!item) { errores.push(`Ventas fila ${i + 2}: servicio "${nombreItem}" no encontrado — verifícalo en la hoja Referencia`); continue; }

      const metodo = String(row['Metodo de Pago'] || row['Método de Pago'] || 'efectivo').toLowerCase();

      await db.registros_diarios.add({
        fecha: fechaDate,
        barbero_id: barbero ? barbero.id! : 0,  // 0 = venta de la barbería (sin barbero asignado)
        item_id: item.id!,
        monto_total: monto,
        metodo_pago: metodo === 'banco' ? 'banco' : 'efectivo',
      });
      if (!barbero) {
        errores.push(`Ventas fila ${i + 2}: barbero "${nombreBarbero}" no encontrado — la venta se importó sin barbero asignado (barbero_id=0)`);
      }
      importedVentas++;
    }
  }

  // ─ Hoja Pagos_Adelantos ─
  if (wb.Sheets['Pagos_Adelantos']) {
    const pagos = xlsx.utils.sheet_to_json<any>(wb.Sheets['Pagos_Adelantos']);
    for (const [i, row] of pagos.entries()) {
      if (!row.Fecha || row.Monto === undefined || row.Monto === '') continue;
      const monto = Number(row.Monto);
      if (isNaN(monto)) continue;

      const fechaDate = parseDate(row.Fecha);
      if (!fechaDate) { errores.push(`Pagos fila ${i + 2}: fecha inválida ("${row.Fecha}")`); continue; }

      const tipoStr = String(row.Tipo || 'barbero').toLowerCase().trim();
      let destinatarioTipo: 'barbero' | 'socio' | 'devolucion_socio' = 'barbero';
      if (tipoStr.includes('devolucion') || tipoStr.includes('devolución')) destinatarioTipo = 'devolucion_socio';
      else if (tipoStr.includes('socio')) destinatarioTipo = 'socio';

      const nombreDest = String(row.Destinatario || '').trim();
      let barberoId = 0;
      let socioId: number | undefined;

      if (destinatarioTipo === 'barbero') {
        const b = barberos.find(x => x.nombre.toLowerCase() === nombreDest.toLowerCase());
        if (!b) { errores.push(`Pagos fila ${i + 2}: barbero "${nombreDest}" no encontrado`); continue; }
        barberoId = b.id!;
      } else {
        const s = socios.find(x => x.nombre.toLowerCase() === nombreDest.toLowerCase());
        if (!s) { errores.push(`Pagos fila ${i + 2}: socio "${nombreDest}" no encontrado`); continue; }
        barberoId = s.id!;
        socioId = s.id!;
      }

      await db.Adelantos.add({
        fecha: fechaDate,
        barbero_id: barberoId,
        monto,
        motivo: String(row.Motivo || 'Importado desde Excel'),
        destinatario_tipo: destinatarioTipo,
        ...(socioId !== undefined ? { socio_id: socioId } : {}),
      });
      importedPagos++;
    }
  }

  // ─ Hoja Gastos ─
  if (wb.Sheets['Gastos']) {
    const gastosData = xlsx.utils.sheet_to_json<any>(wb.Sheets['Gastos']);
    for (const [i, row] of gastosData.entries()) {
      if (!row.Fecha || row.Monto === undefined || row.Monto === '') continue;
      const monto = Number(row.Monto);
      if (isNaN(monto) || monto <= 0) continue;

      const fechaDate = parseDate(row.Fecha);
      if (!fechaDate) { errores.push(`Gastos fila ${i + 2}: fecha inválida ("${row.Fecha}")`); continue; }

      const catRaw = String(row.Categoria || row['Categoría'] || 'otro').toLowerCase().trim();
      const categoria = (CATS_VALIDAS as readonly string[]).includes(catRaw) ? catRaw : 'otro';

      await db.gastos_fijos.add({
        fecha: fechaDate,
        categoria: categoria as any,
        monto,
        descripcion: String(row.Descripcion || row['Descripción'] || categoria),
      });
      importedGastos++;
    }
  }

  return { importedVentas, importedPagos, importedGastos, errores };
}

// Leer hoja de configuración si existe (porcentaje de comisión bancaria, etc.)
export async function importarConfiguracionDesdeExcel(file: File) {
  const data = await file.arrayBuffer();
  const wb = xlsx.read(data);
  if (wb.Sheets['Configuracion']) {
    try {
      const conf = xlsx.utils.sheet_to_json<any>(wb.Sheets['Configuracion']);
      for (const row of conf) {
        const clave = String(row.Clave || row.Clave || '').trim();
        const valor = String(row.Valor || row.Valor || '').trim();
        if (!clave) continue;
        if (clave === 'porcentaje_comision_bancaria') {
          await setConfig('porcentaje_comision_bancaria', valor);
        }
      }
    } catch (e) { /* ignore */ }
  }
}
