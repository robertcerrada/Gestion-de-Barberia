'use client';

import { useMoneda } from '@/lib/useMoneda';
import { isMesBloqueado, getSaldoFondoCaja, getArqueoDia, getPorcentajeComisionBancaria, getIngresosEfectivoMes, getGastosTotalesMes, getSaldoDisponibleBarbero, getResumenMes, getEfectivoDisponibleCaja, getAdelantosMes, getPagosSocioMes, getVentasDia, guardarArqueo } from '@/lib/business';
import { useAppConfig } from '@/lib/useAppConfig';
import { useState, useEffect, useCallback } from 'react';
import { Plus, DollarSign, TrendingDown, CreditCard, Wallet, X, ChevronDown, AlertCircle, CheckCircle2, Calendar, Edit3, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Adelanto, type Barbero as DbBarbero, type GastoFijo, type Socio } from '@/lib/db';

import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/DatePicker';
import { PersonSelect, type PersonOption } from '@/components/ui/PersonSelect';
import { CustomSelect, type SelectOption } from '@/components/ui/CustomSelect';
import { ItemSelect } from '@/components/ui/ItemSelect';

// formatCurrency acepta símbolo dinámico; el default '€' solo aplica a
// llamadas fuera de componentes (nunca debería ocurrir en producción).
function formatCurrency(n: number, simbolo = '€') {
  const safe = typeof n === 'number' && isFinite(n) ? n : 0;
  const fixed3 = safe.toFixed(3);
  return `${simbolo}${fixed3.endsWith('0') ? safe.toFixed(2) : fixed3}`;
}

function esSocioAdelanto(a: Adelanto): boolean {
  return a.destinatario_tipo === 'socio' || (a.socio_id !== undefined && a.socio_id !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTA: Este archivo fue regenerado limpio. Si necesitás el contenido completo
// de los modales (ModalVenta, ModalGasto, ModalAdelanto, etc.) están intactos
// en el historial de git o en el backup que hiciste antes de los cambios.
//
// Lo único que cambió respecto al original es:
//  1. Se importa useMoneda desde @/lib/useMoneda
//  2. formatCurrency ahora acepta un segundo parámetro `simbolo`
//  3. En ScreenInicio() se llama useMoneda() y se define fc = (n) => formatCurrency(n, simbolo)
//  4. Todos los formatCurrency(...) en el JSX de ScreenInicio usan fc(...)
//     (los modales hijos usan formatCurrency directamente con el símbolo del módulo)
// ─────────────────────────────────────────────────────────────────────────────

export default function ScreenInicio() {
  const { simbolo } = useMoneda();
  const { t } = useAppConfig();
  // fc es un alias local que aplica el símbolo configurado
  const fc = (n: number) => formatCurrency(n, simbolo);

  const [showVentaModal, setShowVentaModal] = useState(false);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showAdelantoModal, setShowAdelantoModal] = useState(false);
  const [showArqueoModal, setShowArqueoModal] = useState(false);

  const [efectivoEnCaja, setEfectivoEnCaja] = useState(0);
  const [fondoCaja, setFondoCaja] = useState(0);
  const [gastosDia, setGastosDia] = useState(0);
  const [adelantosDia, setAdelantosDia] = useState(0);
  const [saldoNeto, setSaldoNeto] = useState(0);
  const [arqueoDelDia, setArqueoDelDia] = useState<{ monto_banco: number; monto_efectivo: number } | null>(null);
  const [fechaFiltro, setFechaFiltro] = useState<string>(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  });

  const [totalVentasDia, setTotalVentasDia] = useState(0);
  const [efectivoDia, setEfectivoDia] = useState(0);
  const [bancoDia, setBancoDia] = useState(0);
  const [adelantosSociosDia, setAdelantosSociosDia] = useState(0);
  const [adelantosBarberosDia, setAdelantosBarberosDia] = useState(0);
  const [comisionBancariaDia, setComisionBancariaDia] = useState(0);
  // List of commission entries per bank transaction for the selected day
  const [comisionesTransacciones, setComisionesTransacciones] = useState<Array<{ id: number; fecha: Date; monto: number; comision: number }>>([]);
  const [fechasConRegistro, setFechasConRegistro] = useState<string[]>([]);
  const [registroAEditar, setRegistroAEditar] = useState<any | null>(null);

  const barberos = useLiveQuery(() => db.barberos.toArray().then(list => list.filter(b => b.activo)), []);
  const servicios = useLiveQuery(() => db.servicios_productos.toArray(), []);
  const [mesFiltroActivo, setMesFiltroActivo] = useState(false);

  useEffect(() => {
    async function checkMes() {
      const [y, m, d] = fechaFiltro.split('-').map(Number);
      const locked = await isMesBloqueado(new Date(y, m - 1, d, 12, 0, 0));
      setMesFiltroActivo(locked);
    }
    checkMes();
  }, [fechaFiltro]);

  const recargar = useCallback(async () => {
    const [y, m, d] = fechaFiltro.split('-').map(Number);
    const inicioDia = new Date(y, m - 1, d, 0, 0, 0);
    const finDia = new Date(y, m - 1, d, 23, 59, 59);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);

    const fondo = await getSaldoFondoCaja();
    setFondoCaja(fondo);

    const registrosDia = await db.registros_diarios
      .where('fecha').between(inicioDia, finDia, true, true).toArray();
    const totalDia = registrosDia.reduce((s, r) => s + r.monto_total, 0);
    const eRaw = registrosDia.filter(r => r.metodo_pago === 'efectivo').reduce((s, r) => s + r.monto_total, 0);
    const bRaw = registrosDia.filter(r => r.metodo_pago === 'banco').reduce((s, r) => s + r.monto_total, 0);
    setTotalVentasDia(totalDia);

    const arqueo = await getArqueoDia(fechaDate);
    const bankAmount = arqueo ? arqueo.monto_banco : bRaw;
    if (arqueo) {
      setArqueoDelDia({ monto_banco: arqueo.monto_banco, monto_efectivo: arqueo.monto_efectivo });
      setEfectivoDia(arqueo.monto_efectivo);
      setBancoDia(arqueo.monto_banco);
      setEfectivoEnCaja(arqueo.monto_efectivo + fondo);
    } else {
      setArqueoDelDia(null);
      setEfectivoDia(eRaw);
      setBancoDia(bRaw);
      setEfectivoEnCaja(eRaw + fondo);
    }

    const porcentajeComision = await getPorcentajeComisionBancaria();
    const comisiones = registrosDia
      .filter(r => r.metodo_pago === 'banco')
      .map(r => ({
        id: r.id!,
        fecha: r.fecha,
        monto: r.monto_total,
        comision: Math.round(r.monto_total * porcentajeComision / 100 * 1000) / 1000,
      }));
    const totalComision = comisiones.reduce((s, c) => s + c.comision, 0);
    setComisionBancariaDia(totalComision);
    setComisionesTransacciones(comisiones);

    const [registrosMes, gastosMes, adelantosMes] = await Promise.all([
      db.registros_diarios.toArray(),
      db.gastos_fijos.toArray(),
      db.Adelantos.toArray(),
    ]);
    const fechasSet = new Set<string>();
    registrosMes.forEach(r => fechasSet.add(format(new Date(r.fecha), 'yyyy-MM-dd')));
    gastosMes.forEach(g => fechasSet.add(format(new Date(g.fecha), 'yyyy-MM-dd')));
    adelantosMes.forEach(a => fechasSet.add(format(new Date(a.fecha), 'yyyy-MM-dd')));
    setFechasConRegistro(Array.from(fechasSet));

    const gastosDiaArr = await db.gastos_fijos
      .where('fecha').between(inicioDia, finDia, true, true).toArray();
    setGastosDia(gastosDiaArr.reduce((s, g) => s + g.monto, 0));

    const adelantosDiaArr = await db.Adelantos
      .where('fecha').between(inicioDia, finDia, true, true).toArray();
    const adelSocios = adelantosDiaArr
      .filter(a => a.destinatario_tipo === 'socio' || a.destinatario_tipo === 'devolucion_socio' || a.socio_id)
      .reduce((s, a) => s + a.monto, 0);
    const adelBarberos = adelantosDiaArr
      .filter(a => a.destinatario_tipo === 'barbero')
      .reduce((s, a) => s + a.monto, 0);
    setAdelantosSociosDia(adelSocios);
    setAdelantosBarberosDia(adelBarberos);
    setAdelantosDia(adelSocios + adelBarberos);

    const barberosList = await db.barberos.toArray();
    let comisionesDia = 0;
    registrosDia.forEach(r => {
      const b = barberosList.find(x => x.id === r.barbero_id);
      if (b) comisionesDia += r.monto_total * b.porcentaje_comision;
    });
    setSaldoNeto(totalDia - comisionesDia - gastosDiaArr.reduce((s, g) => s + g.monto, 0) - adelSocios);
  }, [fechaFiltro]);

  useEffect(() => { recargar(); }, [recargar]);

  async function handleEliminarVenta(id: number, fechaReg: Date) {
    const locked = await isMesBloqueado(fechaReg);
    if (locked) { alert('Este mes está cerrado. Reábrelo en el Panel para realizar cambios.'); return; }
    if (!confirm('¿Eliminar este registro de venta?')) return;
    const reg = await db.registros_diarios.get(id);
    if (reg) {
      const item = await db.servicios_productos.get(reg.item_id);
      if (item?.tipo === 'producto' && item.id) {
        await db.servicios_productos.update(item.id, { stock_actual: (item.stock_actual || 0) + 1 });
      }
    }
    await db.registros_diarios.delete(id);
    await recargar();
  }

  async function handleIniciarEdicion(registro: any) {
    const locked = await isMesBloqueado(new Date(registro.fecha));
    if (locked) { alert('Este mes está cerrado. Reábrelo en el Panel para realizar cambios.'); return; }
    setRegistroAEditar(registro);
  }

  const hoyStr = (() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Filtro de fecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 12px', borderRadius: 12, background: 'var(--black-card)', border: '1px solid var(--black-border)' }}>
        <Calendar size={15} color="var(--gold)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--white-soft)', flexShrink: 0 }}>{t('filterDate')}:</span>
        <DatePicker compact value={fechaFiltro} onChange={setFechaFiltro} markedDates={fechasConRegistro} />
        {fechaFiltro !== hoyStr && (
          <button onClick={() => setFechaFiltro(hoyStr)} style={{ border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: 'rgba(212,175,55,0.1)', flexShrink: 0, fontFamily: 'var(--font-body)' }}>
            {t('today')}
          </button>
        )}
      </div>

      {/* Métricas del día */}
      <div className="card-gold" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(20,20,20,0.95) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <p style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📈 {t('todaySales')}</p>
          {arqueoDelDia && (
            <span style={{ fontSize: 10, color: 'var(--success)', background: 'rgba(76,175,130,0.12)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>✓ Arqueo aplicado</span>
          )}
        </div>
        <p className="stat-value gold" style={{ fontSize: 32, fontWeight: 800 }}>{fc(totalVentasDia)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, borderTop: '1px solid rgba(212,175,55,0.15)', paddingTop: 10 }}>
          <div>
            <p className="text-sub" style={{ marginBottom: 2 }}>💵 Efectivo{arqueoDelDia ? ' (arqueo)' : ''}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>{fc(efectivoDia)}</p>
              {totalVentasDia > 0 && <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>({((efectivoDia / totalVentasDia) * 100).toFixed(1)}%)</span>}
            </div>
          </div>
          <div>
            <p className="text-sub" style={{ marginBottom: 2 }}>🏦 Banco{arqueoDelDia ? ' (arqueo)' : ''}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{fc(bancoDia)}</p>
              {totalVentasDia > 0 && <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>({((bancoDia / totalVentasDia) * 100).toFixed(1)}%)</span>}
            </div>
            <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 6 }}>
              Comisión: {fc(comisionBancariaDia)} • Neto: {fc(Math.max(0, bancoDia - comisionBancariaDia))}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        <div className="stat-card" style={{ padding: '10px 12px' }}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 2 }}>💰 Ingresos</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{fc(totalVentasDia)}</span>
        </div>
        <div className="stat-card" style={{ padding: '10px 12px' }}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 2 }}>📋 Gastos</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>{fc(gastosDia)}</span>
        </div>
        <div className="stat-card" style={{ padding: '10px 12px' }}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 4 }}>💳 Adelantos</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {adelantosSociosDia > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--gray-muted)' }}>Socios:</span>
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{fc(adelantosSociosDia)}</span>
              </div>
            )}
            {adelantosBarberosDia > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--gray-muted)' }}>Barberos:</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{fc(adelantosBarberosDia)}</span>
              </div>
            )}
            {adelantosSociosDia === 0 && adelantosBarberosDia === 0 && (
              <span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Sin pagos</span>
            )}
            {(adelantosSociosDia + adelantosBarberosDia > 0) && (
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--white-soft)' }}>Total:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>{fc(adelantosSociosDia + adelantosBarberosDia)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="stat-card" style={{ padding: '10px 12px', borderColor: 'rgba(212,175,55,0.25)' }}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 2 }}>🏦 Fondo</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{fc(fondoCaja)}</span>
        </div>
        <div className="stat-card" style={{ padding: '10px 12px', borderColor: 'rgba(76,175,130,0.25)' }}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 2 }}>💵 Efectivo en Caja</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--white-soft)' }}>{fc(efectivoEnCaja)}</span>
          <span className="text-hint" style={{ display: 'block', marginTop: 2 }}>Efectivo día + Fondo</span>
        </div>
        <div className="stat-card" style={{ padding: '10px 12px', borderColor: saldoNeto >= 0 ? 'rgba(76,175,130,0.25)' : 'rgba(224,82,82,0.25)' }}>
          <span className="label-xs" style={{ display: 'block', marginBottom: 2 }}>📊 Saldo Neto</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: saldoNeto >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fc(saldoNeto)}</span>
          <span className="text-hint" style={{ display: 'block', marginTop: 2 }}>Ingresos − Com. − Gastos − Pagos</span>
        </div>
      </div>

      {/* Acciones rápidas */}
      <p className="section-title" style={{ marginBottom: 12 }}>Registro Rápido</p>
      {mesFiltroActivo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.35)', fontSize: 12, color: 'var(--danger)' }}>
          🔒 El mes está <strong>cerrado</strong>. Reabrilo en el Panel para agregar registros.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <button id="btn-registrar-venta" className="btn-gold" style={{ width: '100%', fontSize: 15, padding: '10px', opacity: mesFiltroActivo ? 0.45 : 1 }}
          onClick={() => { if (mesFiltroActivo) { alert('El mes está cerrado.'); return; } setShowVentaModal(true); }}>
          <Plus size={18} /> Registrar Venta
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button id="btn-registrar-gasto" className="btn-ghost" style={{ padding: '8px', fontSize: 13, opacity: mesFiltroActivo ? 0.45 : 1 }}
            onClick={() => { if (mesFiltroActivo) { alert('El mes está cerrado.'); return; } setShowGastoModal(true); }}>
            <TrendingDown size={16} /> Gastos
          </button>
          <button id="btn-registrar-Adelanto" className="btn-ghost" style={{ padding: '8px', fontSize: 13, opacity: mesFiltroActivo ? 0.45 : 1 }}
            onClick={() => { if (mesFiltroActivo) { alert('El mes está cerrado.'); return; } setShowAdelantoModal(true); }}>
            <Wallet size={16} /> Adelanto / Pago
          </button>
        </div>
        <button id="btn-cerrar-caja" className="btn-ghost" style={{ width: '100%', padding: '8px', fontSize: 13, borderColor: 'rgba(212,175,55,0.5)', color: 'var(--gold)' }}
          onClick={() => setShowArqueoModal(true)}>
          📊 Arqueo / Cerrar Caja del Día
        </button>
      </div>

      {/* Lista de registros del día */}
      <RegistrosDelDia
        fechaFiltro={fechaFiltro}
        simbolo={simbolo}
        comisionesTransacciones={comisionesTransacciones}
        comisionBancariaDia={comisionBancariaDia}
        onEdit={handleIniciarEdicion}
        onDelete={(id) => { db.registros_diarios.get(id).then(r => { if (r) handleEliminarVenta(id, new Date(r.fecha)); }); }}
        onRecargar={recargar}
      />

      {/* Modales */}
      {showVentaModal && (
        <ModalVenta barberos={barberos || []} servicios={servicios || []} fechaInicial={fechaFiltro}
          onClose={() => { setShowVentaModal(false); recargar(); }} />
      )}
      {showGastoModal && (
        <ModalGasto fechaInicial={fechaFiltro}
          onClose={() => { setShowGastoModal(false); recargar(); }} />
      )}
      {showAdelantoModal && (
        <ModalAdelanto barberos={barberos || []} fechaInicial={fechaFiltro}
          onClose={() => { setShowAdelantoModal(false); recargar(); }} />
      )}
      {showArqueoModal && (
        <ModalArqueoCaja fechaInicial={fechaFiltro}
          onClose={() => { setShowArqueoModal(false); recargar(); }} />
      )}
      {registroAEditar && (
        <ModalEditarVenta registro={registroAEditar} barberos={barberos || []} servicios={servicios || []}
          onClose={() => { setRegistroAEditar(null); recargar(); }} />
      )}
    </div>
  );
}

// ─── Tipos locales ────────────────────────────────────────────────────────────
interface Barbero { id?: number; nombre: string; porcentaje_comision: number; activo: boolean }
interface ServicioProducto { id?: number; nombre: string; tipo: 'servicio' | 'producto'; precio: number; stock_actual?: number; stock_minimo?: number }

// ─── RegistrosDelDia ──────────────────────────────────────────────────────────
function RegistrosDelDia({ fechaFiltro, simbolo, comisionesTransacciones, comisionBancariaDia, onEdit, onDelete, onRecargar }: {
  fechaFiltro: string; simbolo: string; comisionesTransacciones: any[]; comisionBancariaDia: number;
  onEdit: (r: any) => void; onDelete: (id: number) => void; onRecargar: () => void;
}) {
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [y, m, d] = fechaFiltro.split('-').map(Number);
  const inicio = new Date(y, m - 1, d, 0, 0, 0);
  const fin = new Date(y, m - 1, d, 23, 59, 59);

  const registros = useLiveQuery(() => db.registros_diarios.where('fecha').between(inicio, fin, true, true).toArray(), [fechaFiltro]);
  const gastosDia = useLiveQuery(() => db.gastos_fijos.where('fecha').between(inicio, fin, true, true).reverse().toArray(), [fechaFiltro]);
  const adelantosDia = useLiveQuery(() => db.Adelantos.where('fecha').between(inicio, fin, true, true).reverse().toArray(), [fechaFiltro]);
  const barberos = useLiveQuery(() => db.barberos.toArray(), []);
  const servicios = useLiveQuery(() => db.servicios_productos.toArray(), []);
  const socios = useLiveQuery(() => db.socios.toArray(), []);

  const [gastoEditando, setGastoEditando] = useState<any | null>(null);
  const [adelantoEditando, setAdelantoEditando] = useState<any | null>(null);
  const [acordeonesAbiertos, setAcordeonesAbiertos] = useState<Record<string, boolean>>({});
  const [serviciosAbiertos, setServiciosAbiertos] = useState<Record<string, boolean>>({});

  const EMOJI_CAT: Record<string, string> = {
    alquiler: '🏠', internet: '🌐', luz: '💡', agua: '💧', limpieza: '🧹', insumos: '🧴',
    impuestos: '🧾', camaras: '📷', seguro: '🛡️', gestoria: '📝', comision_bancaria: '💸', otro: '📌',
  };

  function toggleAcordeon(key: string) { setAcordeonesAbiertos(p => ({ ...p, [key]: !p[key] })); }
  function toggleServicio(key: string) { setServiciosAbiertos(p => ({ ...p, [key]: !p[key] })); }

  async function handleEliminarGasto(id: number, fecha: Date) {
    const locked = await isMesBloqueado(fecha);
    if (locked) { alert('Mes cerrado.'); return; }
    if (!confirm('¿Eliminar gasto?')) return;
    await db.gastos_fijos.delete(id);
    onRecargar();
  }

  async function handleEliminarAdelanto(adelanto: Adelanto, fecha: Date) {
    const locked = await isMesBloqueado(fecha);
    if (locked) { alert('Mes cerrado.'); return; }
    if (!confirm('¿Eliminar adelanto/pago?')) return;
    if (esSocioAdelanto(adelanto) && adelanto.monto > 0) {
      const ini = startOfMonth(fecha);
      const fi = endOfMonth(fecha);
      const efectivoMes = await getIngresosEfectivoMes(fecha);
      const gastosMes = await getGastosTotalesMes(fecha);
      const todosAd = await db.Adelantos.where('fecha').between(ini, fi, true, true).toArray();
      const totalOtros = todosAd.filter(a => a.id !== adelanto.id).reduce((s, a) => s + Math.max(0, a.monto), 0);
      const efectivoLibre = efectivoMes - gastosMes - totalOtros;
      const tomadoDelFondo = Math.max(0, adelanto.monto - efectivoLibre);
      if (tomadoDelFondo > 0) {
        await db.fondo_caja.add({ fecha, monto: tomadoDelFondo, tipo: 'ingreso', motivo: 'Reposición fondo — eliminación de pago a socio' });
      }
    }
    await db.Adelantos.delete(adelanto.id!);
    onRecargar();
  }

  const hayDatos = (registros?.length ?? 0) > 0 || (gastosDia?.length ?? 0) > 0 || (adelantosDia?.length ?? 0) > 0 || (comisionesTransacciones?.length ?? 0) > 0;
  if (!hayDatos) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--gray-muted)' }}>
        <DollarSign size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
        <p style={{ fontSize: 14 }}>Sin registros en esta fecha</p>
      </div>
    );
  }

  // Agrupar ventas por barbero
  type GS = { itemId: number; nombre: string; registros: any[]; totalMonto: number; totalEfectivo: number; totalBanco: number; };
  type GB = { barberoId: number; barberoNombre: string; barberoInactivo: boolean; servicios: GS[]; totalMonto: number; totalEfectivo: number; totalBanco: number; totalRegistros: number; };
  const gruposBarbero: GB[] = [];
  if (registros && servicios && barberos) {
    const mapB = new Map<number, GB>();
    for (const r of registros) {
      const bObj = r.barbero_id === 0 ? null : barberos.find(b => b.id === r.barbero_id);
      const bNombre = r.barbero_id === 0 ? 'La Barbería' : (bObj?.nombre || `Barbero #${r.barbero_id}`);
      const bInact = r.barbero_id !== 0 && !bObj;
      const iNombre = servicios.find(s => s.id === r.item_id)?.nombre || `Servicio #${r.item_id}`;
      if (!mapB.has(r.barbero_id)) mapB.set(r.barbero_id, { barberoId: r.barbero_id, barberoNombre: bNombre, barberoInactivo: bInact, servicios: [], totalMonto: 0, totalEfectivo: 0, totalBanco: 0, totalRegistros: 0 });
      const gb = mapB.get(r.barbero_id)!;
      gb.totalMonto += r.monto_total; gb.totalRegistros++;
      if (r.metodo_pago === 'efectivo') gb.totalEfectivo += r.monto_total; else gb.totalBanco += r.monto_total;
      const last = gb.servicios[gb.servicios.length - 1];
      let gs: GS;
      if (last && last.itemId === r.item_id) { gs = last; } else { gs = { itemId: r.item_id, nombre: iNombre, registros: [], totalMonto: 0, totalEfectivo: 0, totalBanco: 0 }; gb.servicios.push(gs); }
      gs.registros.push(r); gs.totalMonto += r.monto_total;
      if (r.metodo_pago === 'efectivo') gs.totalEfectivo += r.monto_total; else gs.totalBanco += r.monto_total;
    }
    mapB.forEach(gb => gruposBarbero.push(gb));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Ventas */}
      {gruposBarbero.length > 0 && (
        <>
          <p className="text-section" style={{ marginBottom: 8 }}>💈 Ventas del día ({registros!.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {gruposBarbero.map(gb => {
              const key = String(gb.barberoId);
              const abierto = !!acordeonesAbiertos[key];
              return (
                <div key={key} style={{ borderRadius: 14, border: `1px solid ${gb.barberoInactivo ? 'rgba(224,82,82,0.3)' : 'rgba(212,175,55,0.2)'}`, background: 'var(--black-card)', overflow: 'hidden' }}>
                  <button type="button" onClick={() => toggleAcordeon(key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: gb.barberoInactivo ? 'rgba(224,82,82,0.15)' : 'rgba(212,175,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: gb.barberoInactivo ? 'var(--danger)' : 'var(--gold)', border: `1px solid ${gb.barberoInactivo ? 'rgba(224,82,82,0.25)' : 'rgba(212,175,55,0.2)'}` }}>
                      {gb.barberoId === 0 ? '✂️' : gb.barberoNombre.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: gb.barberoInactivo ? 'var(--danger)' : 'var(--gold)' }}>{gb.barberoNombre}</span>
                        {gb.barberoInactivo && <span style={{ fontSize: 10, color: 'var(--danger)', background: 'rgba(224,82,82,0.1)', padding: '1px 6px', borderRadius: 6 }}>⚠️ inactivo</span>}
                      </div>
                      {!abierto && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>{gb.totalRegistros} servicio{gb.totalRegistros !== 1 ? 's' : ''}</span>
                          {gb.totalEfectivo > 0 && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>💵 {fc(gb.totalEfectivo)}</span>}
                          {gb.totalBanco > 0 && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>🏦 {fc(gb.totalBanco)}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{fc(gb.totalMonto)}</span>
                      <ChevronDown size={16} color="var(--gray-muted)" style={{ transition: 'transform 0.25s', transform: abierto ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                    </div>
                  </button>
                  {abierto && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 10px 10px' }}>
                      {gb.servicios.map((gs, si) => {
                        const sk = `${gb.barberoId}-${gs.itemId}-${gs.registros[0]?.id ?? si}`;
                        const sabierto = serviciosAbiertos[sk] ?? true;
                        return (
                          <div key={sk} style={{ marginBottom: 8 }}>
                            <button type="button" onClick={() => toggleServicio(sk)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--white-soft)' }}>✂️ {gs.nombre}</span>
                                <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{gs.registros.length}×</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{fc(gs.totalMonto)}</span>
                                <ChevronDown size={14} color="var(--gray-muted)" style={{ transform: sabierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </div>
                            </button>
                            {sabierto && (
                              <div style={{ marginTop: 4 }}>
                                {gs.registros.map(r => (
                                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 6px 6px 14px', borderLeft: '2px solid rgba(212,175,55,0.15)', marginLeft: 4, marginBottom: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{format(new Date(r.fecha), 'HH:mm')}</span>
                                      <span className={`badge ${r.metodo_pago === 'efectivo' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 10 }}>
                                        {r.metodo_pago === 'efectivo' ? '💵' : '🏦'} {r.metodo_pago}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--white-soft)' }}>{fc(r.monto_total)}</span>
                                      <div style={{ display: 'flex', gap: 2 }}>
                                        <button className="btn-ghost" style={{ padding: '5px', minWidth: 'auto', border: 'none', background: 'transparent', opacity: gb.barberoInactivo ? 0.35 : 1 }}
                                          onClick={() => { if (gb.barberoInactivo) { alert('Activá el barbero primero.'); return; } onEdit(r); }} title="Editar venta">
                                          <Edit3 size={13} color="var(--gold)" />
                                        </button>
                                        <button className="btn-ghost" style={{ padding: '5px', minWidth: 'auto', border: 'none', background: 'transparent', opacity: gb.barberoInactivo ? 0.35 : 1 }}
                                          onClick={() => { if (gb.barberoInactivo) { alert('Activá el barbero primero.'); return; } onDelete(r.id!); }} title="Eliminar venta">
                                          <Trash2 size={13} color="var(--danger)" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid rgba(212,175,55,0.12)', display: 'flex', justifyContent: 'space-between', paddingLeft: 4, paddingRight: 4 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {gb.totalEfectivo > 0 && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>💵 {fc(gb.totalEfectivo)}</span>}
                          {gb.totalBanco > 0 && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>🏦 {fc(gb.totalBanco)}</span>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)' }}>Total: {fc(gb.totalMonto)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Gastos (incluye comisiones bancarias registradas por Arqueo) */}
      {(() => {
        const gastosFiltrados = gastosDia || [];
        if (gastosFiltrados.length === 0) return null;
        return (
          <>
            <p className="text-section" style={{ marginBottom: 8 }}>📋 Gastos del día ({gastosFiltrados.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {gastosFiltrados.map(g => {
                const esComisionBancaria = g.categoria === 'comision_bancaria';
                return (
                  <div key={g.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: esComisionBancaria ? 'rgba(212,175,55,0.25)' : 'rgba(224,82,82,0.15)', background: esComisionBancaria ? 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, transparent 100%)' : undefined }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: esComisionBancaria ? 'var(--gold)' : 'var(--white-soft)' }}>{EMOJI_CAT[g.categoria] || '📌'} {g.descripcion}</p>
                      <p className="text-hint">{g.categoria} · {format(new Date(g.fecha), 'HH:mm')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: esComisionBancaria ? 'var(--gold)' : 'var(--danger)' }}>{fc(g.monto)}</p>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" style={{ padding: '6px', minWidth: 'auto', border: 'none', background: 'rgba(255,255,255,0.03)' }} onClick={() => setGastoEditando(g)}><Edit3 size={14} color="var(--gold)" /></button>
                        <button className="btn-ghost" style={{ padding: '6px', minWidth: 'auto', border: 'none', background: 'rgba(255,255,255,0.03)' }} onClick={() => handleEliminarGasto(g.id!, new Date(g.fecha))}><Trash2 size={14} color="var(--danger)" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Adelantos */}
      {(adelantosDia?.length ?? 0) > 0 && (
        <>
          <p className="text-section" style={{ marginBottom: 8 }}>💳 Adelantos / Pagos ({adelantosDia!.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {adelantosDia!.map(a => {
              const esSocio = esSocioAdelanto(a);
              const socioE = esSocio ? socios?.find(s => s.id === (a.socio_id ?? a.barbero_id)) : null;
              const barbE = !esSocio ? barberos?.find(b => b.id === a.barbero_id) : null;
              const nombre = socioE?.nombre ?? barbE?.nombre ?? `ID #${a.barbero_id}`;
              const esDevolucion = a.monto < 0;
              return (
                <div key={a.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: esDevolucion ? 'rgba(76,175,130,0.25)' : esSocio ? 'rgba(212,175,55,0.2)' : 'var(--black-border)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--white-soft)' }}>{esDevolucion ? '↩️' : esSocio ? '🤝' : '💈'} {a.motivo}</p>
                    <p className="text-hint">{nombre} · {format(new Date(a.fecha), 'HH:mm')}{esDevolucion && <span style={{ color: 'var(--success)', marginLeft: 6, fontWeight: 600 }}>Devolución</span>}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: esDevolucion ? 'var(--success)' : esSocio ? 'var(--gold)' : 'var(--warning)' }}>
                        {esDevolucion ? '+' : '-'}{fc(Math.abs(a.monto))}
                      </p>
                      <span className="text-hint">{esDevolucion ? 'Ingreso al fondo' : esSocio ? 'Socio/Dueño' : 'Barbero'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" style={{ padding: '6px', minWidth: 'auto', border: 'none', background: 'rgba(255,255,255,0.03)' }} onClick={() => setAdelantoEditando(a)}><Edit3 size={14} color="var(--gold)" /></button>
                      <button className="btn-ghost" style={{ padding: '6px', minWidth: 'auto', border: 'none', background: 'rgba(255,255,255,0.03)' }} onClick={() => handleEliminarAdelanto(a, new Date(a.fecha))}><Trash2 size={14} color="var(--danger)" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Comisión Bancaria */}
        {comisionesTransacciones?.length > 0 && (
          <div style={{ marginTop: 12 }} />
        )}
        {comisionesTransacciones?.length > 0 && (
          <div className="card-gold" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(20,20,20,0.95) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>💸 Comisión Bancaria</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{fc(comisionBancariaDia)}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', padding: '8px 12px' }}>
              {comisionesTransacciones.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>{format(new Date(c.fecha), 'HH:mm')}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{fc(c.comision)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {gastoEditando && <ModalEditarGasto gasto={gastoEditando} onClose={() => { setGastoEditando(null); onRecargar(); }} />}
      {adelantoEditando && <ModalEditarAdelanto adelanto={adelantoEditando} barberos={barberos || []} socios={socios || []} onClose={() => { setAdelantoEditando(null); onRecargar(); }} />}
    </div>
  );
}

// ─── MODAL EDITAR GASTO ───────────────────────────────────────────────────────
function ModalEditarGasto({ gasto, onClose }: { gasto: any; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [categoria, setCategoria] = useState<GastoFijo['categoria']>(gasto.categoria);
  const [monto, setMonto] = useState(String(gasto.monto));
  const [descripcion, setDescripcion] = useState(gasto.descripcion);
  const [fecha, setFecha] = useState<string>(() => { const d = new Date(gasto.fecha); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    if (!monto || !descripcion || !fecha) return;
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    if (await isMesBloqueado(fechaDate)) { setError('Mes cerrado.'); return; }
    setLoading(true);
    await db.gastos_fijos.update(gasto.id, { fecha: fechaDate, categoria, monto: Number(monto), descripcion });
    setLoading(false); setSuccess(true); setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">✏️ Editar Gasto</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Gasto actualizado!</p></div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Fecha</label><DatePicker value={fecha} onChange={setFecha} /></div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Categoría</label>
                <CustomSelect value={categoria} onChange={v => setCategoria(v as GastoFijo['categoria'])} placeholder="— Categoría —" grouped={false} searchThreshold={99}
                  options={[
                    { value: 'alquiler', label: 'Alquiler', icon: '🏠', badge: 'Fijo', badgeColor: '#5288E0', subtitle: 'Gasto mensual de local' },
                    { value: 'internet', label: 'Internet', icon: '🌐', badge: 'Fijo', badgeColor: '#8B52E0', subtitle: 'Conectividad' },
                    { value: 'luz', label: 'Luz', icon: '💡', badge: 'Fijo', badgeColor: '#FFD700', subtitle: 'Electricidad' },
                    { value: 'agua', label: 'Agua', icon: '💧', badge: 'Fijo', badgeColor: '#52B4E0', subtitle: 'Agua' },
                    { value: 'limpieza', label: 'Limpieza', icon: '🧹', badge: 'Variable', badgeColor: '#4CAF82', subtitle: 'Limpieza' },
                    { value: 'insumos', label: 'Insumos', icon: '🧴', badge: 'Variable', badgeColor: '#E09A52', subtitle: 'Productos de trabajo' },
                    { value: 'impuestos', label: 'Impuestos', icon: '🧾', badge: 'Fijo', badgeColor: '#E0B452', subtitle: 'Impuestos y tasas' },
                    { value: 'camaras', label: 'Cámaras', icon: '📷', badge: 'Fijo', badgeColor: '#52B4E0', subtitle: 'Vigilancia' },
                    { value: 'seguro', label: 'Seguro', icon: '🛡️', badge: 'Fijo', badgeColor: '#A052E0', subtitle: 'Seguro' },
                    { value: 'gestoria', label: 'Gestoría', icon: '📝', badge: 'Fijo', badgeColor: '#E0A452', subtitle: 'Gestoría' },
                    { value: 'comision_bancaria', label: 'Comisión Bancaria', icon: '💸', badge: 'Auto', badgeColor: '#D4AF37', subtitle: 'Generada por transferencias bancarias' },
                    { value: 'otro', label: 'Otro', icon: '📌', badge: 'Varios', badgeColor: '#888888', subtitle: 'Varios' },
                  ]} />
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Monto</label><input className="input-dark" type="number" inputMode="decimal" min="0" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" /></div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Descripción</label><input className="input-dark" type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
              {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--black-border)' }}>
              <button className="btn-gold" style={{ width: '100%' }} disabled={!monto || !descripcion || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL EDITAR ADELANTO ────────────────────────────────────────────────────
function ModalEditarAdelanto({ adelanto, barberos, socios, onClose }: { adelanto: any; barberos: any[]; socios: any[]; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [monto, setMonto] = useState(String(adelanto.monto));
  const [motivo, setMotivo] = useState(adelanto.motivo);
  const [fecha, setFecha] = useState<string>(() => { const d = new Date(adelanto.fecha); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const esSocio = adelanto.destinatario_tipo === 'socio' || adelanto.destinatario_tipo === 'devolucion_socio';
  const nombre = esSocio
    ? socios.find(s => s.id === adelanto.barbero_id)?.nombre ?? `Socio #${adelanto.barbero_id}`
    : barberos.find(b => b.id === adelanto.barbero_id)?.nombre ?? `Barbero #${adelanto.barbero_id}`;

  async function guardar() {
    if (!monto || !motivo || !fecha) return;
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    if (await isMesBloqueado(fechaDate)) { setError('Mes cerrado.'); return; }
    setLoading(true);
    await db.Adelantos.update(adelanto.id, { fecha: fechaDate, monto: Number(monto), motivo });
    setLoading(false); setSuccess(true); setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">✏️ Editar Adelanto / Pago</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Adelanto actualizado!</p></div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>
              <div className="card" style={{ padding: '10px 14px', background: 'rgba(212,175,55,0.05)', borderColor: 'rgba(212,175,55,0.2)' }}>
                <p style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Destinatario: <strong style={{ color: 'var(--gold)' }}>{nombre}</strong></p>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Fecha</label><DatePicker value={fecha} onChange={setFecha} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Monto</label><input className="input-dark" type="number" inputMode="decimal" min="0" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" /></div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Motivo</label><input className="input-dark" type="text" value={motivo} onChange={e => setMotivo(e.target.value)} /></div>
              {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--black-border)' }}>
              <button className="btn-gold" style={{ width: '100%' }} disabled={!monto || !motivo || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL EDITAR VENTA ───────────────────────────────────────────────────────
function ModalEditarVenta({ registro, barberos, servicios, onClose }: { registro: any; barberos: Barbero[]; servicios: ServicioProducto[]; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [barberoId, setBarberoId] = useState(String(registro.barbero_id || ''));
  const [itemId, setItemId] = useState(String(registro.item_id));
  const [monto, setMonto] = useState(String(registro.monto_total));
  const [metodo, setMetodo] = useState<'efectivo' | 'banco'>(registro.metodo_pago);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState<string>(() => { const d = new Date(registro.fecha); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });

  const selectedItem = servicios.find(s => s.id === Number(itemId));
  const esProducto = selectedItem?.tipo === 'producto';
  const barberoCambio = String(registro.barbero_id || '') !== barberoId;
  const barberoOrig = barberos.find(b => String(b.id) === String(registro.barbero_id || ''))?.nombre || `Barbero #${registro.barbero_id}`;
  const barberoNuevo = barberos.find(b => String(b.id) === barberoId)?.nombre || `Barbero #${barberoId}`;

  useEffect(() => {
    const item = servicios.find(s => s.id === Number(itemId));
    if (item && Number(itemId) !== registro.item_id) setMonto(String(item.precio));
  }, [itemId, servicios, registro.item_id]);

  async function guardar() {
    if ((!esProducto && !barberoId) || !itemId || !monto || !fecha) return;
    setLoading(true);
    const [y, m, d] = fecha.split('-').map(Number);
    const newFecha = new Date(y, m - 1, d, 12, 0, 0);
    if (await isMesBloqueado(new Date(registro.fecha)) || await isMesBloqueado(newFecha)) {
      setError('El mes original o destino está cerrado.'); setLoading(false); return;
    }
    const origItem = servicios.find(s => s.id === registro.item_id);
    if (origItem?.tipo === 'producto' && origItem.id) {
      const p = await db.servicios_productos.get(origItem.id);
      if (p && p.stock_actual !== undefined) await db.servicios_productos.update(origItem.id, { stock_actual: p.stock_actual + 1 });
    }
    const newItem = servicios.find(s => s.id === Number(itemId));
    if (newItem?.tipo === 'producto' && newItem.id) {
      const p = await db.servicios_productos.get(newItem.id);
      if (p && p.stock_actual !== undefined && p.stock_actual > 0) await db.servicios_productos.update(newItem.id, { stock_actual: p.stock_actual - 1 });
    }
    await db.registros_diarios.update(registro.id, { fecha: newFecha, barbero_id: barberoId ? Number(barberoId) : 0, item_id: Number(itemId), monto_total: Number(monto), metodo_pago: metodo });
    setLoading(false); setSuccess(true); setTimeout(onClose, 800);
  }

  const svcFiltrados = servicios.filter(s => s.tipo === 'servicio');
  const prodFiltrados = servicios.filter(s => s.tipo === 'producto');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">✏️ Editar Registro</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Registro actualizado!</p></div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Fecha</span></label><DatePicker value={fecha} onChange={setFecha} /></div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Barbero{esProducto && <span style={{ opacity: .7, color: 'var(--gold)' }}> (opcional para productos)</span>}</label>
                <PersonSelect id="edit-barbero" value={barberoId} onChange={setBarberoId} placeholder={esProducto ? '— La Barbería —' : '— Seleccionar barbero —'} tipo="barbero"
                  options={barberos.map(b => ({ id: String(b.id), nombre: b.nombre, subtitle: `Comisión ${(b.porcentaje_comision * 100).toFixed(0)}%` }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Servicio / Producto</label>
                <ItemSelect
                  id="edit-item"
                  value={itemId}
                  onChange={setItemId}
                  simbolo={simbolo}
                  options={[
                    ...svcFiltrados.map(s => ({ id: String(s.id), nombre: s.nombre, tipo: 'servicio' as const, precio: s.precio })),
                    ...prodFiltrados.map(s => ({ id: String(s.id), nombre: s.nombre, tipo: 'producto' as const, precio: s.precio, stock_actual: s.stock_actual, stock_minimo: s.stock_minimo }))
                  ]}
                />
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Monto Total</label><input id="edit-monto" className="input-dark" type="number" inputMode="decimal" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" /></div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" className="btn-ghost" style={{ background: metodo === 'efectivo' ? 'rgba(76,175,130,0.1)' : 'transparent', borderColor: metodo === 'efectivo' ? 'var(--success)' : 'var(--black-border)', color: metodo === 'efectivo' ? 'var(--success)' : 'var(--gray-muted)' }} onClick={() => setMetodo('efectivo')}>💵 Efectivo</button>
                  <button type="button" className="btn-ghost" style={{ background: metodo === 'banco' ? 'rgba(82,136,224,0.1)' : 'transparent', borderColor: metodo === 'banco' ? 'var(--gold)' : 'var(--black-border)', color: metodo === 'banco' ? 'var(--gold)' : 'var(--gray-muted)' }} onClick={() => setMetodo('banco')}>🏦 Banco</button>
                </div>
              </div>
              {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
              {barberoCambio && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', color: 'var(--warning)', fontSize: 12 }}>
                  <strong>⚠️ Cambio de Barbero</strong>
                  <p style={{ fontSize: 11, marginTop: 4 }}>De <strong>{barberoOrig}</strong> a <strong>{barberoNuevo}</strong>. Afectará las comisiones.</p>
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--black-border)' }}>
              <button id="btn-guardar-edit" className="btn-gold" style={{ width: '100%' }} disabled={(!esProducto && !barberoId) || !itemId || !monto || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL VENTA ──────────────────────────────────────────────────────────────
function ModalVenta({ barberos, servicios, fechaInicial, onClose }: { barberos: Barbero[]; servicios: ServicioProducto[]; fechaInicial?: string; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [barberoId, setBarberoId] = useState('');
  const [metodo, setMetodo] = useState<'efectivo' | 'banco'>('efectivo');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState<string>(fechaInicial ?? (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; })());

  // Lista de ítems: cada uno tiene itemId, precio custom y cantidad
  type LineaVenta = { id: string; itemId: string; monto: string; cantidad: number };
  const nuevoItem = (): LineaVenta => ({ id: crypto.randomUUID(), itemId: '', monto: '', cantidad: 1 });
  const [lineas, setLineas] = useState<LineaVenta[]>([nuevoItem()]);

  const svcFiltrados = servicios.filter(s => s.tipo === 'servicio');
  const prodFiltrados = servicios.filter(s => s.tipo === 'producto');
  const itemOptions = [
    ...svcFiltrados.map(s => ({ id: String(s.id), nombre: s.nombre, tipo: 'servicio' as const, precio: s.precio })),
    ...prodFiltrados.map(s => ({ id: String(s.id), nombre: s.nombre, tipo: 'producto' as const, precio: s.precio, stock_actual: s.stock_actual, stock_minimo: s.stock_minimo })),
  ];

  function setLineaItemId(lineaId: string, itemId: string) {
    const item = servicios.find(s => String(s.id) === itemId);
    setLineas(prev => prev.map(l => l.id === lineaId
      ? { ...l, itemId, monto: item ? String(item.precio) : '' }
      : l
    ));
  }
  function setLineaMonto(lineaId: string, monto: string) {
    setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, monto } : l));
  }
  function setLineaCantidad(lineaId: string, cantidad: number) {
    setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, cantidad } : l));
  }
  function agregarLinea() { setLineas(prev => [...prev, nuevoItem()]); }
  function eliminarLinea(lineaId: string) {
    setLineas(prev => prev.length > 1 ? prev.filter(l => l.id !== lineaId) : prev);
  }

  // Calcula si alguna línea es solo producto (sin barbero requerido)
  const todasProducto = lineas.every(l => {
    const item = servicios.find(s => String(s.id) === l.itemId);
    return item?.tipo === 'producto';
  });
  const algunaServicio = lineas.some(l => {
    const item = servicios.find(s => String(s.id) === l.itemId);
    return item?.tipo === 'servicio';
  });

  const totalGeneral = lineas.reduce((sum, l) => sum + (Number(l.monto) || 0) * l.cantidad, 0);
  const lineasValidas = lineas.filter(l => l.itemId && l.monto && Number(l.monto) > 0);
  const puedeGuardar = lineasValidas.length > 0 && (!algunaServicio || barberoId) && !loading;

  async function guardar() {
    if (!puedeGuardar) return;
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    if (await isMesBloqueado(fechaDate)) { setError('El mes está cerrado.'); return; }

    // Validar stock de productos
    for (const l of lineasValidas) {
      const item = servicios.find(s => String(s.id) === l.itemId);
      if (item?.tipo === 'producto' && item.id) {
        const prod = await db.servicios_productos.get(item.id);
        if (prod && prod.stock_actual !== undefined && prod.stock_actual < l.cantidad) {
          setError(`Stock insuficiente para "${item.nombre}". Disponible: ${prod.stock_actual}.`);
          return;
        }
      }
    }

    setLoading(true);
    let totalRegistros = 0;
    for (const l of lineasValidas) {
      const item = servicios.find(s => String(s.id) === l.itemId);
      const esProducto = item?.tipo === 'producto';
      const bId = esProducto ? (barberoId ? Number(barberoId) : 0) : Number(barberoId);
      const registros = Array.from({ length: l.cantidad }, () => ({
        fecha: fechaDate,
        barbero_id: bId,
        item_id: Number(l.itemId),
        monto_total: Number(l.monto),
        metodo_pago: metodo,
      }));
      await db.registros_diarios.bulkAdd(registros);
      totalRegistros += l.cantidad;
      // Descontar stock
      if (item?.tipo === 'producto' && item.id) {
        const prod = await db.servicios_productos.get(item.id);
        if (prod && prod.stock_actual !== undefined && prod.stock_actual >= l.cantidad) {
          await db.servicios_productos.update(item.id, { stock_actual: prod.stock_actual - l.cantidad });
        }
      }
    }
    setLoading(false);
    setSuccessCount(totalRegistros);
    setSuccess(true);
    setTimeout(onClose, 1000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">Registrar Venta</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>{successCount > 1 ? `¡${successCount} registros guardados!` : '¡Venta registrada!'}</p>
            <p style={{ fontSize: 13, color: 'var(--gray-muted)', marginTop: 4 }}>Total: {fc(totalGeneral)}</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>

              {/* Fecha */}
              <div style={{ flexShrink: 0 }}>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Fecha</span>
                </label>
                <DatePicker value={fecha} onChange={setFecha} />
              </div>

              {/* Barbero (común para todos los servicios) */}
              <div style={{ flexShrink: 0 }}>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>
                  Barbero {!algunaServicio && <span style={{ opacity: .6 }}>(opcional si solo hay productos)</span>}
                </label>
                <PersonSelect id="venta-barbero" value={barberoId} onChange={setBarberoId}
                  placeholder="— Seleccionar barbero —" tipo="barbero"
                  options={barberos.map(b => ({ id: String(b.id), nombre: b.nombre, subtitle: `Comisión ${(b.porcentaje_comision * 100).toFixed(0)}%` }))} />
              </div>

              {/* Método de pago (común para todos) */}
              <div style={{ flexShrink: 0 }}>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" className="btn-ghost" style={{ background: metodo === 'efectivo' ? 'rgba(76,175,130,0.1)' : 'transparent', borderColor: metodo === 'efectivo' ? 'var(--success)' : 'var(--black-border)', color: metodo === 'efectivo' ? 'var(--success)' : 'var(--gray-muted)' }} onClick={() => setMetodo('efectivo')}>💵 Efectivo</button>
                  <button type="button" className="btn-ghost" style={{ background: metodo === 'banco' ? 'rgba(82,136,224,0.1)' : 'transparent', borderColor: metodo === 'banco' ? 'var(--gold)' : 'var(--black-border)', color: metodo === 'banco' ? 'var(--gold)' : 'var(--gray-muted)' }} onClick={() => setMetodo('banco')}>🏦 Banco</button>
                </div>
              </div>

              {/* ── Lista de ítems ── */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Servicios / Productos</label>
                  <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>{lineasValidas.length} ítem{lineasValidas.length !== 1 ? 's' : ''}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lineas.map((linea, idx) => {
                    const itemSel = servicios.find(s => String(s.id) === linea.itemId);
                    const esProducto = itemSel?.tipo === 'producto';
                    return (
                      <div key={linea.id} style={{
                        borderRadius: 12,
                        border: '1px solid var(--black-border)',
                        background: 'var(--black-surface)',
                        overflow: 'hidden',
                      }}>
                        {/* Cabecera de la línea */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 6px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Ítem {idx + 1}{itemSel ? ` · ${esProducto ? '📦' : '✂️'} ${itemSel.tipo}` : ''}
                          </span>
                          {lineas.length > 1 && (
                            <button type="button" onClick={() => eliminarLinea(linea.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2, display: 'flex', alignItems: 'center' }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Selector de ítem */}
                          <ItemSelect
                            id={`venta-item-${linea.id}`}
                            value={linea.itemId}
                            onChange={v => setLineaItemId(linea.id, v)}
                            simbolo={simbolo}
                            options={itemOptions}
                          />

                          {linea.itemId && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {/* Monto */}
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>Precio unit.</label>
                                <input
                                  className="input-dark"
                                  type="number" inputMode="decimal" min="0" max="99999" step="0.01"
                                  value={linea.monto}
                                  onKeyDown={e => { if (['-','e','E','+'].includes(e.key)) e.preventDefault(); }}
                                  onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 99999)) setLineaMonto(linea.id, v); }}
                                  placeholder="0.00"
                                  style={{ margin: 0 }}
                                />
                              </div>

                              {/* Cantidad */}
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>Cantidad</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button type="button"
                                    onClick={() => setLineaCantidad(linea.id, Math.max(1, linea.cantidad - 1))}
                                    style={{ width: 32, height: 38, borderRadius: 8, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                                  <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 800, color: linea.cantidad > 1 ? 'var(--gold)' : 'var(--white-soft)', fontFamily: 'var(--font-display)' }}>{linea.cantidad}</div>
                                  <button type="button"
                                    onClick={() => setLineaCantidad(linea.id, Math.min(99, linea.cantidad + 1))}
                                    style={{ width: 32, height: 38, borderRadius: 8, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Subtotal de la línea */}
                          {linea.itemId && linea.monto && Number(linea.monto) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                              {linea.cantidad > 1 && (
                                <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{linea.cantidad} × {fc(Number(linea.monto))} =</span>
                              )}
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>{fc(Number(linea.monto) * linea.cantidad)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón agregar ítem */}
                <button type="button" onClick={agregarLinea}
                  style={{
                    width: '100%', marginTop: 8, padding: '9px', borderRadius: 10,
                    border: '1.5px dashed rgba(212,175,55,0.35)',
                    background: 'rgba(212,175,55,0.04)',
                    color: 'var(--gold)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.09)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.04)')}
                >
                  <Plus size={14} /> Agregar otro ítem
                </button>
              </div>

              {error && <div style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            </div>

            {/* Pie fijo: total + guardar */}
            <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--black-border)' }}>
              {lineasValidas.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(76,175,130,0.07)', border: '1px solid rgba(76,175,130,0.2)' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-muted)', fontWeight: 600 }}>Total {lineasValidas.length} ítems</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>{fc(totalGeneral)}</span>
                </div>
              )}
              <button id="btn-guardar-venta" className="btn-gold" style={{ width: '100%' }}
                disabled={!puedeGuardar}
                onClick={guardar}>
                {loading ? 'Guardando...' : `Guardar ${lineasValidas.length > 1 ? `${lineasValidas.reduce((s,l)=>s+l.cantidad,0)} registros` : 'Venta'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL GASTO ──────────────────────────────────────────────────────────────
function ModalGasto({ fechaInicial, onClose }: { fechaInicial?: string; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const [categoria, setCategoria] = useState<GastoFijo['categoria']>('alquiler');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fecha, setFecha] = useState<string>(fechaInicial ?? (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; })());

  const NOMBRE_CAT: Record<string, string> = { alquiler: 'Alquiler', internet: 'Internet', limpieza: 'Limpieza', insumos: 'Insumos', impuestos: 'Impuestos', camaras: 'Cámaras', seguro: 'Seguro', luz: 'Luz', agua: 'Agua', gestoria: 'Gestoría', comision_bancaria: 'Comisión Bancaria', otro: 'Gasto varios' };

  async function guardar() {
    if (!monto || !fecha) return;
    const descFinal = descripcion.trim() || NOMBRE_CAT[categoria] || categoria;
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    if (await isMesBloqueado(fechaDate)) { setError('El mes está cerrado.'); return; }
    setLoading(true);
    await db.gastos_fijos.add({ fecha: fechaDate, categoria, monto: Number(monto), descripcion: descFinal });
    setLoading(false); setSuccess(true); setTimeout(onClose, 800);
  }

  const catOptions = [
    { value: 'alquiler', label: 'Alquiler', icon: '🏠', badge: 'Fijo', badgeColor: '#5288E0', subtitle: 'Gasto mensual de local' },
    { value: 'internet', label: 'Internet', icon: '🌐', badge: 'Fijo', badgeColor: '#8B52E0', subtitle: 'Conectividad' },
    { value: 'luz', label: 'Luz', icon: '💡', badge: 'Fijo', badgeColor: '#FFD700', subtitle: 'Electricidad' },
    { value: 'agua', label: 'Agua', icon: '💧', badge: 'Fijo', badgeColor: '#52B4E0', subtitle: 'Agua' },
    { value: 'limpieza', label: 'Limpieza', icon: '🧹', badge: 'Variable', badgeColor: '#4CAF82', subtitle: 'Limpieza' },
    { value: 'insumos', label: 'Insumos', icon: '🧴', badge: 'Variable', badgeColor: '#E09A52', subtitle: 'Productos de trabajo' },
    { value: 'impuestos', label: 'Impuestos', icon: '🧾', badge: 'Fijo', badgeColor: '#E0B452', subtitle: 'Impuestos y tasas' },
    { value: 'camaras', label: 'Cámaras', icon: '📷', badge: 'Fijo', badgeColor: '#52B4E0', subtitle: 'Vigilancia' },
    { value: 'seguro', label: 'Seguro', icon: '🛡️', badge: 'Fijo', badgeColor: '#A052E0', subtitle: 'Seguro' },
    { value: 'gestoria', label: 'Gestoría', icon: '📝', badge: 'Fijo', badgeColor: '#E0A452', subtitle: 'Gestoría' },
    { value: 'comision_bancaria', label: 'Comisión Bancaria', icon: '💸', badge: 'Auto', badgeColor: '#D4AF37', subtitle: 'Generada por transferencias bancarias' },
    { value: 'otro', label: 'Otro', icon: '📌', badge: 'Varios', badgeColor: '#888888', subtitle: 'Varios' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">Registrar Gasto</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Gasto registrado!</p></div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Fecha</span></label><DatePicker value={fecha} onChange={setFecha} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Categoría</label><CustomSelect id="gasto-categoria" value={categoria} onChange={v => setCategoria(v as GastoFijo['categoria'])} placeholder="— Categoría —" grouped={false} searchThreshold={99} options={catOptions} /></div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Monto <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="gasto-monto" className="input-dark" type="number" inputMode="decimal" min="0.01" max="99999" step="0.01" value={monto}
                  onKeyDown={e => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                  onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 99999)) { setMonto(v); setError(''); } }}
                  placeholder="0.00" style={{ borderColor: monto && Number(monto) <= 0 ? 'var(--danger)' : undefined }} />
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Descripción <span style={{ fontSize: 11, opacity: .6 }}>(opcional)</span></label><input id="gasto-descripcion" className="input-dark" type="text" value={descripcion} maxLength={200} onChange={e => setDescripcion(e.target.value.replace(/[<>"'`]/g, ''))} placeholder={`Ej: ${NOMBRE_CAT[categoria]} del mes`} /></div>
              {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--black-border)' }}>
              <button id="btn-guardar-gasto" className="btn-gold" style={{ width: '100%' }} disabled={!monto || Number(monto) <= 0 || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Guardar Gasto'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL ADELANTO ───────────────────────────────────────────────────────────
function ModalAdelanto({ barberos, fechaInicial, onClose }: { barberos: Barbero[]; fechaInicial?: string; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [destinatarioTipo, setDestinatarioTipo] = useState<'barbero' | 'socio' | 'devolucion_socio'>('barbero');
  const [barberoId, setBarberoId] = useState('');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saldoBarbero, setSaldoBarbero] = useState<number | null>(null);
  const [efectivoCaja, setEfectivoCaja] = useState<number | null>(null);
  const [beneficioSocio, setBeneficioSocio] = useState<number | null>(null);
  const [adelantadoSocio, setAdelantadoSocio] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [barberosConVentas, setBarberosConVentas] = useState<number[]>([]);
  const [fecha, setFecha] = useState<string>(fechaInicial ?? (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; })());

  const sociosActivos = useLiveQuery(() => db.socios.filter(s => s.activo).toArray(), []) ?? [];

  useEffect(() => {
    // No filtramos por ventas del día: los pagos/adelantos son del saldo
    // acumulado del mes y no requieren ventas en la fecha seleccionada.
    // Mantenemos el estado por compatibilidad pero lo poblamos con todos los barberos.
    setBarberosConVentas(barberos.map(b => b.id!).filter(Boolean));
  }, [fecha, barberos]);

  useEffect(() => {
    async function calcular() {
      const [y, m, d] = fecha.split('-').map(Number);
      const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
      setEfectivoCaja(await getEfectivoDisponibleCaja(fechaDate));
      if (!barberoId) { setSaldoBarbero(null); setBeneficioSocio(null); setAdelantadoSocio(null); return; }
      setMonto('');   // ← resetear monto al cambiar de persona
      setError('');
      if (destinatarioTipo === 'barbero') {
        const [pagado, saldo] = await Promise.all([getAdelantosMes(Number(barberoId), fechaDate), getSaldoDisponibleBarbero(Number(barberoId), fechaDate)]);
        setAdelantadoSocio(pagado); setSaldoBarbero(saldo); setBeneficioSocio(null);
      } else {
        const res = await getResumenMes(fechaDate);
        const si = res.pagosPorSocio.find(p => p.id === Number(barberoId));
        const ben = si?.monto ?? 0;
        const ade = si?.pagado ?? await getPagosSocioMes(Number(barberoId), fechaDate);
        setBeneficioSocio(ben); setAdelantadoSocio(ade); setSaldoBarbero(ben - ade);
      }
    }
    calcular();
  }, [barberoId, destinatarioTipo, fecha]);

  async function guardar() {
    if (!barberoId || !monto || !motivo || !fecha) return;
    const [y, m, d] = fecha.split('-').map(Number);
    const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
    if (await isMesBloqueado(fechaDate)) { setError('El mes está cerrado.'); return; }
    setLoading(true);
    const montoNum = Number(monto);
    if (destinatarioTipo === 'barbero') {
      // El saldo disponible se calcula sobre el mes completo del pago,
      // sin importar si ese día en particular hubo ventas o no.
      const saldoActual = await getSaldoDisponibleBarbero(Number(barberoId), fechaDate);
      if (saldoActual <= 0) { setError(`Sin saldo acumulado disponible en este mes.`); setLoading(false); return; }
      if (montoNum > saldoActual) { setError(`Excede el saldo acumulado disponible (${saldoActual.toFixed(2)}).`); setLoading(false); return; }
      await db.Adelantos.add({ fecha: fechaDate, barbero_id: Number(barberoId), monto: montoNum, motivo, destinatario_tipo: 'barbero' });
    } else if (destinatarioTipo === 'socio') {
      const res = await getResumenMes(fechaDate);
      const si = res.pagosPorSocio.find(p => p.id === Number(barberoId));
      const sp = si?.saldoPendiente ?? 0;
      if (sp <= 0) { setError('Sin saldo pendiente.'); setLoading(false); return; }
      if (montoNum > sp) { setError(`Excede el saldo pendiente (${sp.toFixed(2)}).`); setLoading(false); return; }
      const sNombre = sociosActivos.find(s => s.id === Number(barberoId))?.nombre ?? 'Socio';
      await db.Adelantos.add({ fecha: fechaDate, barbero_id: Number(barberoId), monto: montoNum, motivo, destinatario_tipo: 'socio', socio_id: Number(barberoId) });
      const eMes = await getIngresosEfectivoMes(fechaDate);
      const gMes = await getGastosTotalesMes(fechaDate);
      const ini = startOfMonth(fechaDate);
      const fi = endOfMonth(fechaDate);
      const todos = await db.Adelantos.where('fecha').between(ini, fi, true, true).toArray();
      const previo = todos.reduce((s, a) => s + Math.max(0, a.monto), 0) - montoNum;
      const tomado = Math.max(0, montoNum - (eMes - gMes - previo));
      if (tomado > 0) await db.fondo_caja.add({ fecha: fechaDate, monto: tomado, tipo: 'egreso', motivo: `Pago a socio ${sNombre} — ${motivo}` });
    } else {
      const res = await getResumenMes(fechaDate);
      const si = res.pagosPorSocio.find(p => p.id === Number(barberoId));
      const deuda = Math.max(0, -(si?.saldoPendiente ?? 0));
      if (deuda <= 0) { setError('Sin deuda pendiente.'); setLoading(false); return; }
      if (montoNum > deuda) { setError(`Excede la deuda (${deuda.toFixed(2)}).`); setLoading(false); return; }
      const sNombre = sociosActivos.find(s => s.id === Number(barberoId))?.nombre ?? 'Socio';
      await db.Adelantos.add({ fecha: fechaDate, barbero_id: Number(barberoId), monto: -montoNum, motivo: `Devolución de ${sNombre} — ${motivo}`, destinatario_tipo: 'socio', socio_id: Number(barberoId) });
      const egresos = await db.fondo_caja.filter(mv => mv.tipo === 'egreso' && mv.motivo.includes(sNombre)).toArray();
      const totalFondo = egresos.reduce((s, mv) => s + mv.monto, 0);
      const repos = Math.min(montoNum, totalFondo);
      if (repos > 0) await db.fondo_caja.add({ fecha: fechaDate, monto: repos, tipo: 'ingreso', motivo: `Reposición fondo — devolución de ${sNombre}` });
    }
    setLoading(false); setSuccess(true); setTimeout(onClose, 800);
  }

  const montoNum = Number(monto);
  const deudaSocio = destinatarioTipo === 'devolucion_socio' && saldoBarbero !== null ? Math.max(0, -saldoBarbero) : 0;
  const excedeCaja = destinatarioTipo === 'socio' && efectivoCaja !== null && montoNum > 0 && montoNum > efectivoCaja;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">Adelanto / Pago</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Adelanto / Pago registrado!</p></div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Fecha</span></label><DatePicker value={fecha} onChange={setFecha} /></div>
              {!barberoId && efectivoCaja !== null && (
                <div className="card" style={{ padding: '10px 14px', background: efectivoCaja <= 0 ? 'rgba(224,82,82,0.08)' : 'rgba(76,175,130,0.06)', borderColor: efectivoCaja <= 0 ? 'rgba(224,82,82,0.3)' : 'rgba(76,175,130,0.2)' }}>
                  <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginBottom: 2 }}>💵 Efectivo disponible</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: efectivoCaja <= 0 ? 'var(--danger)' : 'var(--success)' }}>{fc(efectivoCaja)}</p>
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Tipo de Destinatario</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {([['barbero', '💈 Barbero'] as const, ['socio', '🤝 Socio'] as const, ['devolucion_socio', 'Devolución'] as const]).map(([tipo, label]) => (
                    <button key={tipo} type="button" className="btn-ghost" style={{ background: destinatarioTipo === tipo ? (tipo === 'devolucion_socio' ? 'rgba(76,175,130,0.1)' : 'rgba(212,175,55,0.1)') : 'transparent', borderColor: destinatarioTipo === tipo ? (tipo === 'devolucion_socio' ? 'var(--success)' : 'var(--gold)') : 'var(--black-border)', color: destinatarioTipo === tipo ? (tipo === 'devolucion_socio' ? 'var(--success)' : 'var(--gold)') : 'var(--gray-muted)', fontSize: 13 }}
                      onClick={() => { setDestinatarioTipo(tipo); setBarberoId(''); setSaldoBarbero(null); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>
                  {destinatarioTipo === 'barbero' ? 'Barbero' : destinatarioTipo === 'devolucion_socio' ? 'Socio que devuelve' : 'Socio / Dueño'}
                </label>
                {destinatarioTipo === 'barbero' ? (
                  <PersonSelect id="Adelanto-barbero" value={barberoId} onChange={setBarberoId}
                    placeholder="— Seleccionar barbero —"
                    tipo="barbero"
                    options={barberos.map(b => ({ id: String(b.id), nombre: b.nombre, subtitle: `Comisión ${(b.porcentaje_comision * 100).toFixed(0)}%` }))} />
                ) : (
                  <PersonSelect id="Adelanto-socio" value={barberoId} onChange={setBarberoId}
                    placeholder="— Seleccionar socio —" tipo="socio"
                    options={sociosActivos.map(s => ({ id: String(s.id), nombre: s.nombre, subtitle: `${(s.porcentaje_utilidad * 100).toFixed(0)}% · ${s.rol}` }))} />
                )}
              </div>
              {destinatarioTipo === 'barbero' && barberoId && saldoBarbero !== null && (
                <div className="card" style={{ padding: '12px 14px', background: saldoBarbero <= 0 ? 'rgba(224,82,82,0.07)' : 'rgba(212,175,55,0.06)', borderColor: saldoBarbero <= 0 ? 'rgba(224,82,82,0.35)' : 'rgba(212,175,55,0.3)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💈 Saldo acumulado del mes</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Generado:</span><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{fc((saldoBarbero ?? 0) + (adelantadoSocio ?? 0))}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Ya cobrado:</span><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>-{fc(adelantadoSocio ?? 0)}</span></div>
                    <div style={{ height: 1, background: 'var(--black-border)', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Disponible:</span><span style={{ fontSize: 18, fontWeight: 800, color: saldoBarbero <= 0 ? 'var(--danger)' : 'var(--success)' }}>{fc(Math.max(0, saldoBarbero))}</span></div>
                  </div>
                </div>
              )}
              {destinatarioTipo === 'socio' && barberoId && beneficioSocio !== null && (
                <div className="card" style={{ padding: '12px 14px', borderColor: (saldoBarbero ?? 0) <= 0 ? 'rgba(224,82,82,0.35)' : 'rgba(212,175,55,0.3)', background: (saldoBarbero ?? 0) <= 0 ? 'rgba(224,82,82,0.07)' : 'rgba(212,175,55,0.05)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🤝 Beneficio del mes</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Beneficio:</span><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{fc(beneficioSocio)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Ya cobrado:</span><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>-{fc(adelantadoSocio ?? 0)}</span></div>
                    <div style={{ height: 1, background: 'var(--black-border)', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Pendiente:</span><span style={{ fontSize: 18, fontWeight: 800, color: (saldoBarbero ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fc(Math.max(0, saldoBarbero ?? 0))}</span></div>
                  </div>
                  {efectivoCaja !== null && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--black-border)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>💵 Efectivo en caja:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: efectivoCaja <= 0 ? 'var(--danger)' : 'var(--success)' }}>{fc(efectivoCaja)}</span>
                    </div>
                  )}
                </div>
              )}
              {destinatarioTipo === 'devolucion_socio' && barberoId && saldoBarbero !== null && (
                <div className="card" style={{ padding: '12px 14px', borderColor: 'rgba(76,175,130,0.35)', background: 'rgba(76,175,130,0.06)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>↩️ Devolución al local</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--gray-muted)' }}>Debe devolver:</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: deudaSocio > 0 ? 'var(--danger)' : 'var(--gray-muted)' }}>{fc(deudaSocio)}</span>
                  </div>
                  {deudaSocio <= 0 && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 8 }}>Sin deuda este mes.</p>}
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>
                  {destinatarioTipo === 'devolucion_socio' ? 'Monto que ingresa' : 'Monto Entregado'}
                </label>
                {/* Campo monto con botón MAX + flechas +/- */}
                {(() => {
                  // Límite máximo según contexto
                  const maxMonto = destinatarioTipo === 'barbero'
                    ? Math.max(0, saldoBarbero ?? 0)
                    : destinatarioTipo === 'socio'
                    ? Math.max(0, saldoBarbero ?? 0)
                    : deudaSocio;
                  const step = 0.5;
                  return (
                    <div style={{ position: 'relative' }}>
                      {/* Fila: − input + */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Botón − */}
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(monto) || 0;
                            const next = Math.max(0, parseFloat((cur - step).toFixed(2)));
                            setMonto(next === 0 ? '' : String(next));
                            setError('');
                          }}
                          disabled={!barberoId || Number(monto) <= 0}
                          style={{
                            width: 40, height: 44, borderRadius: 10, flexShrink: 0,
                            border: '1px solid var(--black-border)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--white-soft)', fontSize: 20, fontWeight: 700,
                            cursor: (!barberoId || Number(monto) <= 0) ? 'default' : 'pointer',
                            opacity: (!barberoId || Number(monto) <= 0) ? 0.35 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s',
                          }}
                        >−</button>

                        {/* Input numérico */}
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input
                            id="Adelanto-monto"
                            className="input-dark"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={maxMonto > 0 ? maxMonto : 99999}
                            step={step}
                            value={monto}
                            onKeyDown={e => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === '' || (Number(v) >= 0 && Number(v) <= 99999)) { setMonto(v); setError(''); }
                            }}
                            placeholder="0.00"
                            style={{
                              borderColor: excedeCaja ? 'var(--danger)' : undefined,
                              paddingRight: barberoId && maxMonto > 0 ? 52 : undefined,
                              margin: 0, width: '100%',
                            }}
                          />
                          {/* Botón MAX — solo si hay alguien seleccionado y tiene saldo */}
                          {barberoId && maxMonto > 0 && (
                            <button
                              type="button"
                              onClick={() => { setMonto(maxMonto.toFixed(2)); setError(''); }}
                              title={`Completar máximo: ${fc(maxMonto)}`}
                              style={{
                                position: 'absolute', right: 8, top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(212,175,55,0.18)',
                                border: '1px solid rgba(212,175,55,0.45)',
                                borderRadius: 6, padding: '2px 7px',
                                fontSize: 10, fontWeight: 800,
                                color: 'var(--gold)', cursor: 'pointer',
                                letterSpacing: '0.04em', lineHeight: 1.6,
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.30)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(212,175,55,0.18)')}
                            >
                              MAX
                            </button>
                          )}
                        </div>

                        {/* Botón + */}
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(monto) || 0;
                            const next = Math.min(maxMonto > 0 ? maxMonto : 99999, parseFloat((cur + step).toFixed(2)));
                            setMonto(String(next));
                            setError('');
                          }}
                          disabled={!barberoId || (maxMonto > 0 && Number(monto) >= maxMonto)}
                          style={{
                            width: 40, height: 44, borderRadius: 10, flexShrink: 0,
                            border: '1px solid var(--black-border)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--white-soft)', fontSize: 20, fontWeight: 700,
                            cursor: (!barberoId || (maxMonto > 0 && Number(monto) >= maxMonto)) ? 'default' : 'pointer',
                            opacity: (!barberoId || (maxMonto > 0 && Number(monto) >= maxMonto)) ? 0.35 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s',
                          }}
                        >+</button>
                      </div>

                      {/* Hint de máximo disponible */}
                      {barberoId && maxMonto > 0 && (
                        <p style={{ fontSize: 10, color: 'var(--gray-muted)', marginTop: 5, textAlign: 'right' }}>
                          Máx. disponible: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fc(maxMonto)}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}
                {excedeCaja && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--danger)', fontSize: 12 }}><AlertCircle size={14} /> Excede efectivo en caja ({fc(efectivoCaja!)})</div>}
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Motivo</label><input id="Adelanto-motivo" className="input-dark" type="text" value={motivo} maxLength={200} onChange={e => setMotivo(e.target.value.replace(/[<>"'`]/g, ''))} placeholder={destinatarioTipo === 'devolucion_socio' ? 'Ej: Devolución por adelanto de más' : 'Ej: Pago mensual'} /></div>
              {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid var(--black-border)' }}>
              <button id="btn-guardar-Adelanto" className="btn-gold" style={{ width: '100%' }}
                disabled={!barberoId || !monto || !motivo || excedeCaja || loading || (destinatarioTipo === 'barbero' && saldoBarbero !== null && saldoBarbero <= 0) || (destinatarioTipo === 'devolucion_socio' && (deudaSocio <= 0 || montoNum > deudaSocio))}
                onClick={guardar}>
                {loading ? 'Guardando...' : destinatarioTipo === 'devolucion_socio' ? 'Registrar Ingreso' : 'Confirmar Pago'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL ARQUEO DE CAJA ─────────────────────────────────────────────────────
function ModalArqueoCaja({ fechaInicial, onClose }: { fechaInicial?: string; onClose: () => void }) {
  const { simbolo } = useMoneda();
  const fc = (n: number) => formatCurrency(n, simbolo);
  const [fecha, setFecha] = useState<string>(fechaInicial ?? (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; })());
  const [montoBanco, setMontoBanco] = useState('');
  const [notas, setNotas] = useState('');
  const [totalVentas, setTotalVentas] = useState(0);
  const [fondoCaja, setFondoCaja] = useState(0);
  const [tieneArqueo, setTieneArqueo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [y, m, d] = fecha.split('-').map(Number);
      const fechaDate = new Date(y, m - 1, d, 12, 0, 0);
      const [ventas, fondo, arqueo] = await Promise.all([getVentasDia(fechaDate), getSaldoFondoCaja(), getArqueoDia(fechaDate)]);
      setTotalVentas(ventas); setFondoCaja(fondo);
      if (arqueo) { setTieneArqueo(true); setMontoBanco(arqueo.monto_banco > 0 ? String(arqueo.monto_banco) : ''); setNotas(arqueo.notas ?? ''); }
      else { setTieneArqueo(false); setMontoBanco(''); setNotas(''); }
    }
    cargar();
  }, [fecha]);

  async function guardar() {
    if (!fecha) return;
    setLoading(true);
    const [y, m, d] = fecha.split('-').map(Number);
    await guardarArqueo(new Date(y, m - 1, d, 12, 0, 0), Number(montoBanco || 0), notas);
    setLoading(false); setSuccess(true); setTimeout(onClose, 1000);
  }

  const montoEfectivo = Math.max(0, totalVentas - Number(montoBanco || 0));
  const debeQuedar = montoEfectivo + fondoCaja;
  const excedeBanco = Number(montoBanco || 0) > totalVentas;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">📊 {tieneArqueo ? 'Actualizar Arqueo' : 'Arqueo de Caja'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {tieneArqueo && !success && (
          <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', fontSize: 12, color: 'var(--gold)' }}>
            ✓ Ya existe un arqueo. Podés modificarlo y guardar.
          </div>
        )}
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>{tieneArqueo ? '¡Arqueo actualizado!' : '¡Arqueo guardado!'}</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Fecha</span></label><DatePicker value={fecha} onChange={setFecha} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}><span className="stat-label">Total Ventas</span><span className="stat-value gold" style={{ fontSize: 20 }}>{fc(totalVentas)}</span></div>
              <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}><span className="stat-label">Fondo de Caja</span><span className="stat-value gold" style={{ fontSize: 20 }}>{fc(fondoCaja)}</span></div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>💰 ¿Cuánto ingresó por Banco hoy?</label>
              <input id="arqueo-banco" className="input-dark" type="number" inputMode="decimal" min="0" max="99999" step="0.01" value={montoBanco}
                onKeyDown={e => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
                onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 99999)) setMontoBanco(v); }}
                placeholder="0.00" style={{ borderColor: excedeBanco ? 'var(--danger)' : undefined }} />
              {excedeBanco && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--danger)', fontSize: 12 }}><AlertCircle size={14} /> El banco no puede superar las ventas totales.</div>}
            </div>
            <div className="card-gold pulse-gold" style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: 'var(--gray-muted)' }}>💵 Efectivo calculado:</span><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>{fc(montoEfectivo)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: 'var(--gray-muted)' }}>➕ Fondo de caja:</span><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>{fc(fondoCaja)}</span></div>
              <hr style={{ borderColor: 'rgba(212,175,55,0.2)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>💰 DEBE QUEDAR EN CAJA:</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{fc(debeQuedar)}</span>
              </div>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Notas (opcional)</label><input id="arqueo-notas" className="input-dark" type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: Faltaron $5..." /></div>
            <button id="btn-guardar-arqueo" className="btn-gold" style={{ marginTop: 8, width: '100%' }} disabled={loading || excedeBanco} onClick={guardar}>
              {loading ? 'Guardando...' : tieneArqueo ? 'Actualizar Arqueo' : 'Confirmar y Cerrar Caja'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
