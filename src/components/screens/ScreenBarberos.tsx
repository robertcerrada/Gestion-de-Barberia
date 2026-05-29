'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getComisionBrutaMes, getAdelantosMes, getSaldoDisponibleBarbero, getIngresosTotalesMes } from '@/lib/business';
import { ChevronRight, UserCheck, UserX, Plus, X, CheckCircle2, Edit3, Package, Scissors, Percent, CalendarDays, ChevronLeft, ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useMoneda } from '@/lib/useMoneda';

function formatCurrencyWith(n: number, simbolo: string) { const safe = typeof n === 'number' && isFinite(n) ? n : 0; const fixed3 = safe.toFixed(3); return `${simbolo}${fixed3.endsWith('0') ? safe.toFixed(2) : fixed3}`; }

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function mesAnioAFecha(mes: number, anio: number): Date {
  return new Date(anio, mes, 1);
}

export default function ScreenBarberos() {
  const hoy = new Date();
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [mesNav, setMesNav] = useState(hoy.getMonth());   // 0-11
  const [anioNav, setAnioNav] = useState(hoy.getFullYear());

  const esMesActual = mesNav === hoy.getMonth() && anioNav === hoy.getFullYear();
  const esFuturo = anioNav > hoy.getFullYear() || (anioNav === hoy.getFullYear() && mesNav > hoy.getMonth());

  const fechaMes = mesAnioAFecha(mesNav, anioNav);

  function navAnterior() {
    setSelectedBarbero(null);
    if (mesNav === 0) { setMesNav(11); setAnioNav(a => a - 1); }
    else setMesNav(m => m - 1);
  }

  function navSiguiente() {
    if (esMesActual) return;
    setSelectedBarbero(null);
    if (mesNav === 11) { setMesNav(0); setAnioNav(a => a + 1); }
    else setMesNav(m => m + 1);
  }

  function irAHoy() {
    setSelectedBarbero(null);
    setMesNav(hoy.getMonth());
    setAnioNav(hoy.getFullYear());
  }

  const barberos = useLiveQuery(async () => {
    if (esMesActual) {
      return db.barberos.toArray()
        .then(list => list.filter(b => b.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } else {
      const inicio = startOfMonth(fechaMes);
      const fin = endOfMonth(fechaMes);
      const registros = await db.registros_diarios
        .where('fecha').between(inicio, fin, true, true)
        .toArray();
      const ids = [...new Set(registros.map(r => r.barbero_id))];
      const todos = await db.barberos.toArray();
      return todos
        .filter(b => ids.includes(b.id!))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  }, [mesNav, anioNav]);

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="section-title">Barberos</p>
      </div>

      {/* ── Navegador de mes ── */}
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
              value={`${anioNav}-${String(mesNav + 1).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-');
                  setSelectedBarbero(null);
                  setAnioNav(parseInt(y));
                  setMesNav(parseInt(m) - 1);
                }
              }}
              style={{
                position: 'absolute', opacity: 0, inset: 0, width: '100%', cursor: 'pointer'
              }}
            />
            <div style={{ pointerEvents: 'none' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {MESES_ES[mesNav]} <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </p>
              <p style={{ fontSize: 13, color: esMesActual ? 'var(--success)' : 'var(--gray-muted)', marginTop: 3, fontWeight: esMesActual ? 600 : 400 }}>
                {anioNav}{esMesActual ? ' · En curso' : ''}
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
            style={{ marginTop: 10, width: '100%', padding: '7px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            📅 Ir al mes actual
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {barberos?.map(b => (
          <div key={b.id}
            id={`barbero-card-${b.id}`}
            className="card"
            style={{ cursor: 'pointer', transition: 'border-color 0.2s', borderColor: selectedBarbero === b.id ? 'var(--gold)' : 'var(--black-border)', opacity: (!esMesActual && !b.activo) ? 0.75 : 1, overflow: 'hidden' }}
            onClick={() => setSelectedBarbero(selectedBarbero === b.id ? null : b.id!)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: b.activo ? 'linear-gradient(135deg, var(--gold-light), var(--gold))' : 'var(--black-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Scissors size={20} color={b.activo ? '#0a0a0a' : 'var(--gray-muted)'} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{b.nombre}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span className={`badge ${b.activo ? 'badge-green' : 'badge-red'}`}>
                      {b.activo ? '● Activo' : '● Inactivo'}
                    </span>
                    <span className="badge badge-gold">
                      <Percent size={9} /> {(b.porcentaje_comision * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--gray-muted)', transform: selectedBarbero === b.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
            {selectedBarbero === b.id && <BarberoDetalle barberoId={b.id!} porcentaje={b.porcentaje_comision} mesFecha={fechaMes} />}
          </div>
        ))}

        {(!barberos || barberos.length === 0) && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--gray-muted)' }}>
            <Scissors size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>{esMesActual ? 'No hay barberos activos' : `Sin actividad en ${MESES_ES[mesNav]} ${anioNav}`}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BarberoDetalle({ barberoId, porcentaje, mesFecha = new Date() }: { barberoId: number, porcentaje: number, mesFecha?: Date }) {
  const { simbolo } = useMoneda();
  const formatCurrency = (n: number) => formatCurrencyWith(n, simbolo);
  const [comision, setComision] = useState(0);
  const [Adelantos, setAdelantos] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [ingresosBarbero, setIngresosBarbero] = useState(0);
  const [listaAdelantos, setListaAdelantos] = useState<any[]>([]);

  useEffect(() => {
    async function cargar() {
      const inicio = startOfMonth(mesFecha);
      const fin = endOfMonth(mesFecha);

      const [c, a, s] = await Promise.all([
        getComisionBrutaMes(barberoId, mesFecha),
        getAdelantosMes(barberoId, mesFecha),
        getSaldoDisponibleBarbero(barberoId, mesFecha),
      ]);
      setComision(c);
      setAdelantos(a);
      setSaldo(s);
      // Ingresos generados por el barbero (solo servicios)
      const registros = await db.registros_diarios.where('barbero_id').equals(barberoId).toArray();
      let ing = 0;
      for (const r of registros) {
        if (new Date(r.fecha) >= inicio && new Date(r.fecha) <= fin) {
          const item = await db.servicios_productos.get(r.item_id);
          if (item?.tipo === 'servicio') ing += r.monto_total;
        }
      }
      setIngresosBarbero(ing);

      // Adelantos del mes consultado
      const list = await db.Adelantos
        .where('barbero_id').equals(barberoId)
        .and(adv => adv.fecha >= inicio && adv.fecha <= fin)
        .toArray();
      list.sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
      setListaAdelantos(list);
    }
    cargar();
  }, [barberoId, mesFecha]);

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--black-border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="stat-card">
          <span className="stat-label">Generado (mes)</span>
          <span className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(ingresosBarbero)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Comisión Bruta</span>
          <span className="stat-value gold" style={{ fontSize: 18 }}>{formatCurrency(comision)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Adelantos cobrados</span>
          <span className="stat-value red" style={{ fontSize: 18 }}>{formatCurrency(Adelantos)}</span>
        </div>
        <div className="stat-card" style={{ borderColor: saldo > 0 ? 'rgba(76,175,130,0.3)' : saldo === 0 ? 'rgba(212,175,55,0.3)' : 'rgba(224,82,82,0.3)' }}>
          <span className="stat-label">Saldo neto</span>
          <span className="stat-value" style={{ fontSize: 18, color: saldo > 0 ? 'var(--success)' : saldo === 0 ? 'var(--gold)' : 'var(--danger)' }}>
            {saldo > 0 ? '+' : ''}{formatCurrency(saldo)}
          </span>
          <p style={{ fontSize: 10, marginTop: 4, color: saldo >= 0 ? 'var(--gray-muted)' : 'var(--danger)' }}>
            {saldo >= 0 ? 'Comisión generada menos adelantos cobrados' : 'Adelanto menos comisión generada'}
          </p>
          {saldo > 0 && (
            <p style={{ fontSize: 10, color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
              ✓ Aún puede cobrar {formatCurrency(saldo)}
            </p>
          )}
          {saldo < 0 && (
            <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4, fontWeight: 600 }}>
              ⚠️ El adelanto supera la comisión en {formatCurrency(Math.abs(saldo))}
            </p>
          )}
          {saldo === 0 && (
            <p style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4, fontWeight: 600 }}>✓ Saldo cero</p>
          )}
        </div>
      </div>

      {/* Historial detallado de Adelantos */}
      <div style={{ marginTop: 16 }}>
        <p className="text-section" style={{ marginBottom: 8 }}>
          💸 Historial de Adelantos / Pagos
        </p>
        {listaAdelantos.length === 0 ? (
          <p className="text-hint" style={{ fontStyle: 'italic', padding: '4px 0' }}>
            No se han registrado Adelantos este mes.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '220px', overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
            {listaAdelantos.map(a => (
              <div key={a.id} style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black-surface)', border: '1px solid var(--black-border)', borderRadius: 10, flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--white-soft)' }}>{a.motivo}</p>
                  <p className="text-hint">
                    📅 {new Date(a.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>
                  -{formatCurrency(a.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

        <p className="text-hint" style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'var(--black-surface)' }}>
          Las ventas de productos no generan comisión — van 100% a la barbería
        </p>
    </div>
  );
}

export function ModalAddBarbero({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState('');
  const [porcentaje, setPorcentaje] = useState('50');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    const nombreLimpio = nombre.replace(/<[^>]*>/g, '').trim().slice(0, 100);
    if (!nombreLimpio) { setError('Ingresá un nombre válido.'); return; }
    // Verificar duplicados
    const existe = await db.barberos.filter(b => b.nombre.toLowerCase() === nombreLimpio.toLowerCase()).first();
    if (existe) { setError(`Ya existe un barbero llamado "${nombreLimpio}".`); return; }
    setLoading(true);
    await db.barberos.add({ nombre: nombreLimpio, porcentaje_comision: Number(porcentaje) / 100, activo: true });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">Nuevo Barbero</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>¡Barbero agregado!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Nombre Completo</label>
              <input id="barbero-nombre" className="input-dark" type="text" value={nombre}
                maxLength={100}
                autoComplete="off"
                onChange={e => { setNombre(e.target.value.replace(/[<>"'`]/g, '')); setError(''); }}
                placeholder="Ej: Carlos Pérez" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>
                Comisión por Servicios: <strong style={{ color: 'var(--gold)' }}>{porcentaje}%</strong>
              </label>
              <input id="barbero-comision" type="range" min="10" max="70" step="5" value={porcentaje}
                onChange={e => setPorcentaje(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--gold)', height: 6, cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-muted)', marginTop: 4 }}>
                <span>10%</span><span>40%</span><span>70%</span>
              </div>
            </div>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button id="btn-guardar-barbero" className="btn-gold" style={{ marginTop: 8 }}
              disabled={!nombre.trim() || loading} onClick={guardar}>
              {loading ? 'Guardando...' : 'Agregar Barbero'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PrecioItem({ precio }: { precio: number }) {
  const { simbolo } = useMoneda();
  return <p style={{ fontSize: 12, color: 'var(--gold)' }}>{simbolo}{precio.toFixed(2)}</p>;
}

export function ModalGestionItems({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'servicio' | 'producto'>('servicio');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stockActual, setStockActual] = useState('10');
  const [stockMin, setStockMin] = useState('3');
  const [success, setSuccess] = useState(false);
  const { simbolo } = useMoneda();

  const items = useLiveQuery(() => db.servicios_productos.where('tipo').equals(tab).toArray(), [tab]);

  async function agregar() {
    if (!nombre || !precio) return;
    const nuevo: Parameters<typeof db.servicios_productos.add>[0] = { nombre, tipo: tab, precio: Number(precio) };
    if (tab === 'producto') {
      nuevo.stock_actual = Number(stockActual);
      nuevo.stock_minimo = Number(stockMin);
    }
    await db.servicios_productos.add(nuevo);
    setNombre(''); setPrecio(''); setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
  }

  async function eliminar(id: number) {
    await db.servicios_productos.delete(id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">Servicios & Productos</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, flexShrink: 0 }}>
          {(['servicio', 'producto'] as const).map(t => (
            <button key={t} id={`tab-${t}`} onClick={() => setTab(t)}
              style={{
                padding: '10px', borderRadius: 10, border: `2px solid ${tab === t ? 'var(--gold)' : 'var(--black-border)'}`,
                background: tab === t ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)',
                color: tab === t ? 'var(--gold)' : 'var(--gray-text)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, transition: 'all 0.2s'
              }}>
              {t === 'servicio' ? '🪒 Servicios' : '📦 Productos'}
            </button>
          ))}
        </div>

        {/* Lista con scroll propio — crece pero no desborda */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items?.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--gray-muted)', textAlign: 'center', padding: '20px 0' }}>
                No hay {tab === 'servicio' ? 'servicios' : 'productos'} aún
              </p>
            )}
            {items?.map(item => (
              <div key={item.id} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{item.nombre}</p>
                  <PrecioItem precio={item.precio} />
                  {item.tipo === 'producto' && (
                    <p style={{ fontSize: 11, color: item.stock_actual! <= item.stock_minimo! ? 'var(--danger)' : 'var(--gray-text)' }}>
                      Stock: {item.stock_actual} (mín: {item.stock_minimo})
                    </p>
                  )}
                </div>
                <button onClick={() => eliminar(item.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario fijo al fondo — nunca se oculta */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--black-border)', paddingTop: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 12 }}>+ Agregar {tab}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input id="item-nombre" className="input-dark" type="text" value={nombre}
              maxLength={100} autoComplete="off"
              onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))}
              placeholder={`Nombre del ${tab}`} />
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-muted)', fontSize: 14, pointerEvents: 'none' }}>{simbolo}</span>
              <input id="item-precio" className="input-dark" type="number" inputMode="decimal"
                min="0" max="99999" step="0.01"
                value={precio}
                onKeyDown={e => { if (['-','e','E','+'].includes(e.key)) e.preventDefault(); }}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '' || (Number(v) >= 0 && Number(v) <= 99999)) setPrecio(v);
                }}
                placeholder="0.00"
                style={{ paddingLeft: 28 }} />
            </div>
            {tab === 'producto' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input id="item-stock" className="input-dark" type="number" inputMode="numeric"
                  min="0" max="99999" step="1"
                  value={stockActual}
                  onKeyDown={e => { if (['-','e','E','+','.'].includes(e.key)) e.preventDefault(); }}
                  onChange={e => { const v = e.target.value; if (v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0)) setStockActual(v); }}
                  placeholder="Stock actual" />
                <input id="item-stock-min" className="input-dark" type="number" inputMode="numeric"
                  min="0" max="99999" step="1"
                  value={stockMin}
                  onKeyDown={e => { if (['-','e','E','+','.'].includes(e.key)) e.preventDefault(); }}
                  onChange={e => { const v = e.target.value; if (v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0)) setStockMin(v); }}
                  placeholder="Stock mínimo" />
              </div>
            )}
            <button id="btn-agregar-item" className="btn-gold" disabled={!nombre || !precio} onClick={agregar}>
              {success ? '✓ Agregado' : `Agregar ${tab}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
