'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Scissors, Package, X, Search } from 'lucide-react';

export interface ItemOption {
  id: string;
  nombre: string;
  tipo: 'servicio' | 'producto';
  precio: number;
  stock_actual?: number;
  stock_minimo?: number;
  simbolo?: string;
}

interface ItemSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ItemOption[];
  placeholder?: string;
  simbolo?: string;
}

const OPTION_H  = 56;
const SEARCH_H  = 52;
const MAX_VISIBLE = 5;

const GROUP_COLORS: Record<'servicio' | 'producto', string> = {
  servicio: 'linear-gradient(135deg, #D4AF37, #C5972A)',
  producto: 'linear-gradient(135deg, #5288E0, #3F6EC5)',
};

export function ItemSelect({
  id,
  value,
  onChange,
  options,
  placeholder = '— Seleccionar servicio o producto —',
  simbolo = '€',
}: ItemSelectProps) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number; bottom: number; left: number; width: number; spaceBelow: number;
  } | null>(null);

  const selected = options.find(o => o.id === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top:        rect.bottom + 6,
      bottom:     window.innerHeight - rect.top + 6,
      left:       rect.left,
      width:      rect.width,
      spaceBelow: window.innerHeight - rect.bottom,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch('');
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current  && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onEsc    = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => updatePosition();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, updatePosition]);

  const q = search.toLowerCase();
  const servicios = options.filter(o => o.tipo === 'servicio' && o.nombre.toLowerCase().includes(q));
  const productos = options.filter(o => o.tipo === 'producto' && o.nombre.toLowerCase().includes(q));
  const totalFiltered = servicios.length + productos.length;

  function handleSelect(optId: string) { onChange(optId); setOpen(false); }
  function handleClear(e: React.MouseEvent) { e.stopPropagation(); onChange(''); }

  const showSearch = options.length > 4;
  const listHeight = Math.min(MAX_VISIBLE, totalFiltered) * OPTION_H;
  const totalContentH = listHeight + (showSearch ? SEARCH_H : 0) + 16;
  const maxDropdownH  = Math.min(
    totalContentH,
    pos ? Math.max(pos.spaceBelow, 200) - 16 : 340
  );
  const openUpward = pos !== null && pos.spaceBelow < Math.min(totalContentH, 300);

  const dropStyle: React.CSSProperties = pos
    ? {
        position: 'fixed',
        left:  pos.left,
        width: pos.width,
        zIndex: 99999,
        ...(openUpward ? { bottom: pos.bottom } : { top: pos.top }),
      }
    : {};

  return (
    <>
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 12,
          border: `1.5px solid ${open ? 'var(--gold)' : selected ? 'rgba(212,175,55,0.3)' : 'var(--black-border)'}`,
          background: open ? 'rgba(212,175,55,0.06)' : selected ? 'rgba(212,175,55,0.04)' : 'var(--black-surface)',
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
          fontFamily: 'var(--font-body)',
          textAlign: 'left',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(212,175,55,0.1)' : 'none',
          minHeight: 46,
        }}
      >
        {/* Icono / avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: selected ? GROUP_COLORS[selected.tipo] : 'var(--black-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: selected ? '0 2px 6px rgba(0,0,0,0.3)' : 'none',
        }}>
          {selected
            ? (selected.tipo === 'servicio'
                ? <Scissors size={14} color="#fff" />
                : <Package  size={14} color="#fff" />)
            : <Scissors size={14} color="var(--gray-muted)" />
          }
        </div>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: selected ? 600 : 400,
            color: selected ? 'var(--white-soft)' : 'var(--gray-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0,
          }}>
            {selected ? selected.nombre : placeholder}
          </p>
          {selected && (
            <p style={{ fontSize: 12, color: 'var(--gold)', margin: '1px 0 0' }}>
              {selected.tipo === 'servicio' ? '✂️ Servicio' : '📦 Producto'} · {simbolo}{selected.precio.toFixed(2)}
            </p>
          )}
        </div>

        {/* Clear + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selected && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Borrar selección"
              className="cs-clear-button"
            >
              <X size={12} color="var(--gray-muted)" />
            </button>
          )}
          <ChevronDown
            size={16} color="var(--gray-muted)"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </div>
      </button>

      {/* ── Dropdown portal ── */}
      {open && pos && createPortal(
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar selector"
            className="dropdown-backdrop-button"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            ref={dropdownRef}
            style={{
              ...dropStyle,
              background: 'var(--black-card)',
              border: '1.5px solid rgba(212,175,55,0.25)',
              borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
              animation: 'isSlideIn 0.2s cubic-bezier(0.16,1,0.3,1)',
              maxHeight: maxDropdownH,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Buscador */}
            {showSearch && (
              <div className="cs-search-wrapper">
                <Search size={14} color="var(--gray-muted)" style={{ flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar servicio o producto..."
                  aria-label="Buscar servicios o productos"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="cs-search-input"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="cs-clear-button">
                    <X size={13} color="var(--gray-muted)" />
                  </button>
                )}
              </div>
            )}

            {/* Lista */}
            <div ref={listRef} style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'thin', scrollbarColor: 'rgba(212,175,55,0.2) transparent' }}>

              {totalFiltered === 0 && (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--gray-muted)' }}>
                  Sin resultados para "{search}"
                </p>
              )}

              {/* ── Grupo Servicios ── */}
              {servicios.length > 0 && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px 6px',
                    fontSize: 12, fontWeight: 700, color: 'var(--gold)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    background: 'rgba(212,175,55,0.04)',
                    borderBottom: '1px solid rgba(212,175,55,0.12)',
                  }}>
                    <Scissors size={11} /> Servicios ({servicios.length})
                  </div>
                  {servicios.map((opt, idx) => {
                    const isSel = value === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => handleSelect(opt.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px',
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: isSel ? 'rgba(212,175,55,0.09)' : 'transparent',
                          cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
                          transition: 'background 0.13s', minHeight: OPTION_H,
                        }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: GROUP_COLORS.servicio,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isSel ? '0 0 0 2px var(--gold), 0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.25)',
                          transition: 'box-shadow 0.18s',
                        }}>
                          <Scissors size={14} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: isSel ? 700 : 500,
                            color: isSel ? 'var(--gold)' : 'var(--white-soft)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            margin: 0, transition: 'color 0.13s',
                          }}>{opt.nombre}</p>
                          <p style={{ fontSize: 11, color: isSel ? 'rgba(212,175,55,0.7)' : 'var(--gray-muted)', margin: '1px 0 0' }}>
                            {simbolo}{opt.precio.toFixed(2)}
                          </p>
                        </div>
                        {isSel ? (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(212,175,55,0.35)' }}>
                            <Check size={12} color="#0a0a0a" strokeWidth={3} />
                          </div>
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--black-border)', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── Grupo Productos ── */}
              {productos.length > 0 && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px 6px',
                    fontSize: 11, fontWeight: 700, color: '#5288E0',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    background: 'rgba(82,136,224,0.04)',
                    borderTop: servicios.length > 0 ? '1px solid rgba(82,136,224,0.12)' : 'none',
                    borderBottom: '1px solid rgba(82,136,224,0.12)',
                  }}>
                    <Package size={11} /> Productos ({productos.length})
                  </div>
                  {productos.map((opt) => {
                    const isSel    = value === opt.id;
                    const sinStock = (opt.stock_actual ?? 0) === 0;
                    return (
                      <button key={opt.id} type="button" onClick={() => { if (!sinStock) handleSelect(opt.id); }}
                        disabled={sinStock}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px',
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: isSel ? 'rgba(82,136,224,0.1)' : 'transparent',
                          cursor: sinStock ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-body)', textAlign: 'left',
                          transition: 'background 0.13s', minHeight: OPTION_H,
                          opacity: sinStock ? 0.45 : 1,
                        }}
                        onMouseEnter={e => { if (!isSel && !sinStock) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = sinStock ? 'transparent' : 'transparent'; }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: GROUP_COLORS.producto,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isSel ? '0 0 0 2px #5288E0, 0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.25)',
                          transition: 'box-shadow 0.18s',
                        }}>
                          <Package size={14} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: isSel ? 700 : 500,
                            color: isSel ? '#5288E0' : 'var(--white-soft)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            margin: 0, transition: 'color 0.13s',
                          }}>{opt.nombre}</p>
                          <p style={{ fontSize: 11, margin: '1px 0 0', color: sinStock ? 'var(--danger)' : isSel ? 'rgba(82,136,224,0.7)' : 'var(--gray-muted)' }}>
                            {simbolo}{opt.precio.toFixed(2)}
                            {opt.stock_actual !== undefined && (
                              <span style={{ marginLeft: 6 }}>
                                {sinStock ? '⚠ Sin stock' : `· Stock: ${opt.stock_actual}`}
                              </span>
                            )}
                          </p>
                        </div>
                        {isSel ? (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#5288E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={12} color="#fff" strokeWidth={3} />
                          </div>
                        ) : (
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--black-border)', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {options.length === 0 && !search && (
                <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: 'var(--gray-muted)' }}>
                  Sin servicios ni productos. Agregá desde Ajustes.
                </p>
              )}
            </div>

            {/* Footer contador */}
            {search && totalFiltered > 0 && (
              <div style={{
                padding: '6px 14px', borderTop: '1px solid var(--black-border)',
                fontSize: 11, color: 'var(--gray-muted)', flexShrink: 0,
                background: 'var(--black-card)',
              }}>
                {totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      <style>{`
        @keyframes isSlideIn {
          from { opacity: 0; transform: translateY(${openUpward ? '6px' : '-8px'}) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes isFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
