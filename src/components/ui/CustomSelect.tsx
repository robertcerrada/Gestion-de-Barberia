'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** Emoji o texto corto a la izquierda del label */
  icon?: string;
  /** Texto secundario debajo del label */
  subtitle?: string;
  /** Pill/badge a la derecha (ej: precio, tipo) */
  badge?: string;
  /** Color del badge en hex */
  badgeColor?: string;
  /** Agrupación — se usa cuando grouped=true */
  group?: string;
  /** Deshabilita esta opción individualmente */
  disabled?: boolean;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Renderiza separadores y cabeceras de grupo */
  grouped?: boolean;
  /**
   * Cantidad mínima de opciones para mostrar el buscador.
   * Por defecto: 5. Poner 99 para desactivarlo siempre.
   */
  searchThreshold?: number;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = '— Seleccionar —',
  grouped = false,
  searchThreshold = 5,
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; bottom: number; left: number; width: number; spaceBelow: number } | null>(null);

  const selected = options.find(o => o.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPos({
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
      width: rect.width,
      spaceBelow,
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

  // Cerrar al hacer click fuera o al presionar Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // Recalcular posición al hacer scroll (útil dentro de modales)
    const handleScroll = () => updatePosition();

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, updatePosition]);

  // ── Filtrado ──────────────────────────────────────────────────
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.subtitle ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Agrupado ──────────────────────────────────────────────────
  type GroupedEntry = { type: 'header'; group: string } | { type: 'option'; option: SelectOption };
  const buildRows = (): GroupedEntry[] => {
    if (!grouped) return filtered.map(o => ({ type: 'option', option: o }));
    const rows: GroupedEntry[] = [];
    let lastGroup = '';
    for (const o of filtered) {
      const g = o.group ?? '';
      if (g !== lastGroup) {
        rows.push({ type: 'header', group: g });
        lastGroup = g;
      }
      rows.push({ type: 'option', option: o });
    }
    return rows;
  };
  const rows = buildRows();

  function handleSelect(optValue: string) {
    onChange(optValue);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  // ── Decidir si el dropdown abre hacia arriba o abajo ──────────
  // Dentro de modal-sheet la pantalla disponible puede ser poca abajo.
  const MAX_HEIGHT = 260;
  const openUpward = pos !== null && pos.spaceBelow < MAX_HEIGHT + 16;

  const dropdownStyle: React.CSSProperties = pos
    ? {
        position: 'fixed',
        left: pos.left,
        width: pos.width,
        zIndex: 99999,
        background: 'var(--black-card)',
        border: '1.5px solid rgba(212,175,55,0.28)',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        animation: 'csSelectIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        maxHeight: MAX_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        ...(openUpward
          ? { bottom: pos.bottom, top: 'unset' }
          : { top: pos.top }),
      }
    : {};

  const showSearch = options.length >= searchThreshold;

  return (
    <>
      {/* ── Trigger ────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
        className={className}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 12,
          border: `1.5px solid ${
            open
              ? 'var(--gold)'
              : selected
              ? 'rgba(212,175,55,0.35)'
              : 'var(--black-border)'
          }`,
          background: open
            ? 'rgba(212,175,55,0.06)'
            : selected
            ? 'rgba(212,175,55,0.04)'
            : 'var(--black-surface)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
          fontFamily: 'var(--font-body)',
          textAlign: 'left',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(212,175,55,0.1)' : 'none',
          minHeight: 46,
        }}
      >
        {/* Icono seleccionado */}
        {selected?.icon && (
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{selected.icon}</span>
        )}

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14,
            fontWeight: selected ? 600 : 400,
            color: selected ? 'var(--white-soft)' : 'var(--gray-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
          }}>
            {selected ? selected.label : placeholder}
          </p>
          {selected?.subtitle && (
            <p style={{ fontSize: 11, color: 'var(--gold)', marginTop: 1, margin: 0 }}>
              {selected.subtitle}
            </p>
          )}
        </div>

        {/* Badge del selected */}
        {selected?.badge && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
            background: selected.badgeColor ? `${selected.badgeColor}22` : 'rgba(212,175,55,0.15)',
            color: selected.badgeColor ?? 'var(--gold)',
            border: `1px solid ${selected.badgeColor ? `${selected.badgeColor}44` : 'rgba(212,175,55,0.3)'}`,
            flexShrink: 0,
          }}>
            {selected.badge}
          </span>
        )}

        {/* Clear + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selected && !disabled && (
            <div
              onClick={handleClear}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,82,82,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              <X size={12} color="var(--gray-muted)" />
            </div>
          )}
          <ChevronDown
            size={16}
            color="var(--gray-muted)"
            style={{
              transition: 'transform 0.2s ease',
              transform: open ? 'rotate(180deg)' : 'none',
              flexShrink: 0,
            }}
          />
        </div>
      </button>

      {/* ── Dropdown Portal ────────────────────────────────────── */}
      {open && pos && createPortal(
        <>
          {/* Backdrop translúcido */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 99998,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(1px)',
              animation: 'csFadeIn 0.15s ease',
            }}
          />

          {/* Panel */}
          <div ref={dropdownRef} style={dropdownStyle}>

            {/* Buscador */}
            {showSearch && (
              <div style={{
                padding: '10px 10px 6px',
                borderBottom: '1px solid var(--black-border)',
                flexShrink: 0,
              }}>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="🔍 Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: 9,
                    border: '1px solid var(--black-border)',
                    background: 'var(--black-surface)',
                    color: 'var(--white-soft)',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--black-border)')}
                />
              </div>
            )}

            {/* Lista */}
            <div style={{
              overflowY: 'auto',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flex: 1,
            }}>
              {/* Opción vacía / placeholder */}
              <button
                type="button"
                onClick={() => handleSelect('')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: !value ? 'rgba(212,175,55,0.09)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  transition: 'background 0.13s',
                }}
                onMouseEnter={e => { if (value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ flex: 1, fontSize: 13, color: 'var(--gray-muted)', fontStyle: 'italic' }}>
                  {placeholder}
                </span>
                {!value && (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={11} color="#0a0a0a" strokeWidth={3} />
                  </div>
                )}
              </button>

              {/* Divisor */}
              <div style={{ height: 1, background: 'var(--black-border)', margin: '3px 8px' }} />

              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', padding: '14px 0', fontSize: 13, color: 'var(--gray-muted)' }}>
                  Sin resultados
                </p>
              )}

              {rows.map((row, idx) => {
                if (row.type === 'header') {
                  return (
                    <p key={`h-${idx}`} style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'var(--gray-muted)',
                      padding: '8px 12px 4px',
                      margin: 0,
                    }}>
                      {row.group}
                    </p>
                  );
                }

                const o = row.option;
                const isSelected = value === o.value;
                const isDisabled = !!o.disabled;

                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleSelect(o.value)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 9,
                      border: 'none',
                      background: isSelected ? 'rgba(212,175,55,0.1)' : 'transparent',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.4 : 1,
                      fontFamily: 'var(--font-body)',
                      textAlign: 'left',
                      transition: 'background 0.13s',
                    }}
                    onMouseEnter={e => { if (!isSelected && !isDisabled) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(212,175,55,0.1)' : 'transparent'; }}
                  >
                    {/* Icono */}
                    {o.icon && (
                      <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{o.icon}</span>
                    )}

                    {/* Texto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--gold)' : isDisabled ? 'var(--gray-muted)' : 'var(--white-soft)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        transition: 'color 0.13s', margin: 0,
                      }}>
                        {o.label}
                      </p>
                      {o.subtitle && (
                        <p style={{
                          fontSize: 11,
                          color: isSelected ? 'rgba(212,175,55,0.7)' : 'var(--gray-muted)',
                          marginTop: 1, margin: 0,
                        }}>
                          {o.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Badge */}
                    {o.badge && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                        background: o.badgeColor ? `${o.badgeColor}22` : 'rgba(212,175,55,0.15)',
                        color: o.badgeColor ?? 'var(--gold)',
                        border: `1px solid ${o.badgeColor ? `${o.badgeColor}44` : 'rgba(212,175,55,0.3)'}`,
                        flexShrink: 0, whiteSpace: 'nowrap',
                      }}>
                        {o.badge}
                      </span>
                    )}

                    {/* Radio indicator */}
                    {isSelected ? (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--gold)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(212,175,55,0.35)',
                      }}>
                        <Check size={12} color="#0a0a0a" strokeWidth={3} />
                      </div>
                    ) : (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '2px solid var(--black-border)',
                        flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      <style>{`
        @keyframes csSelectIn {
          from { opacity: 0; transform: translateY(${openUpward ? '6px' : '-8px'}) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes csFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
