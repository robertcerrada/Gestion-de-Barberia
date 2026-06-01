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
        className={`cs-trigger ${className} ${open ? 'cs-trigger--open' : ''} ${selected ? 'cs-trigger--selected' : ''}`}
        style={{
          opacity: disabled ? 0.5 : 1,
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
            <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 1, margin: 0 }}>
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
          <button
            type="button"
            className="dropdown-backdrop-button"
            aria-label="Cerrar selección"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div ref={dropdownRef} className="cs-dropdown-panel" style={dropdownStyle}>

            {/* Buscador */}
            {showSearch && (
              <div className="cs-search-wrapper">
                <input
                  ref={searchRef}
                  type="text"
                  className="cs-search-input"
                  placeholder="🔍 Buscar..."
                  aria-label="Buscar opciones"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}

            {/* Lista */}
            <div className="cs-rows-container">
              {/* Opción vacía / placeholder */}
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="cs-option-btn cs-option-placeholder"
                style={{ background: !value ? 'rgba(212,175,55,0.09)' : 'transparent' }}
              >
                <span className="cs-option-placeholder-label">
                  {placeholder}
                </span>
                {!value && (
                  <div className="cs-option-placeholder-check">
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
                    <p key={`h-${idx}`} className="cs-row-header">
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
                    className={`cs-option-btn ${isSelected ? 'cs-option-btn--selected' : ''}`}
                    style={{ background: isSelected ? 'rgba(212,175,55,0.1)' : 'transparent' }}
                  >
                    {/* Icono */}
                    {o.icon && (
                      <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{o.icon}</span>
                    )}

                    {/* Texto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className={`cs-option-label ${isSelected ? 'cs-option-label--selected' : ''}`}>
                        {o.label}
                      </p>
                      {o.subtitle && (
                        <p className={`cs-option-subtitle ${isSelected ? 'cs-option-subtitle--selected' : ''}`}>
                          {o.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Badge */}
                    {o.badge && (
                      <span
                        className="cs-badge"
                        style={{
                          background: o.badgeColor ? `${o.badgeColor}22` : 'rgba(212,175,55,0.15)',
                          color: o.badgeColor ?? 'var(--gold)',
                          border: `1px solid ${o.badgeColor ? `${o.badgeColor}44` : 'rgba(212,175,55,0.3)'}`,
                        }}
                      >
                        {o.badge}
                      </span>
                    )}

                    {/* Radio indicator */}
                    {isSelected ? (
                      <div className="cs-radio-indicator cs-radio-indicator--selected">
                        <Check size={12} color="#0a0a0a" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="cs-radio-indicator" />
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
