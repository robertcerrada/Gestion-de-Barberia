'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Scissors, UserCog, X, Search } from 'lucide-react';

export interface PersonOption {
  id: string;
  nombre: string;
  subtitle?: string;
  tipo?: 'barbero' | 'socio';
}

interface PersonSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: PersonOption[];
  placeholder?: string;
  tipo?: 'barbero' | 'socio';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #D4AF37, #C5972A)',
  'linear-gradient(135deg, #4CAF82, #3A9A6E)',
  'linear-gradient(135deg, #5288E0, #3F6EC5)',
  'linear-gradient(135deg, #8B52E0, #7040C5)',
  'linear-gradient(135deg, #E09A52, #C5863F)',
  'linear-gradient(135deg, #E05252, #C53F3F)',
  'linear-gradient(135deg, #52B4E0, #3F9AC5)',
  'linear-gradient(135deg, #E0B452, #C59A3F)',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// Altura de cada opción en px — usada para calcular maxHeight dinámico
const OPTION_H = 52;
const SEARCH_H = 52;
const PLACEHOLDER_H = 44;
const MAX_VISIBLE = 5; // cuántas opciones mostrar antes de hacer scroll

export function PersonSelect({
  id,
  value,
  onChange,
  options,
  placeholder = '— Seleccionar —',
  tipo = 'barbero',
}: PersonSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number; bottom: number; left: number; width: number; spaceBelow: number;
  } | null>(null);

  const selected = options.find(o => o.id === value);
  const selectedIndex = options.findIndex(o => o.id === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
      width: rect.width,
      spaceBelow: window.innerHeight - rect.bottom,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        // Scroll automático al elemento seleccionado
        if (selectedIndex > 0 && listRef.current) {
          listRef.current.scrollTop = (selectedIndex) * OPTION_H;
        }
      });
    } else {
      setSearch('');
    }
  }, [open, updatePosition, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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

  const filtered = options.filter(o =>
    o.nombre.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(optId: string) {
    onChange(optId);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }

  const IconComponent = tipo === 'socio' ? UserCog : Scissors;
  const showSearch = options.length > 4;

  // Altura dinámica del dropdown — nunca más alta que el espacio disponible
  const listHeight = Math.min(MAX_VISIBLE, filtered.length) * OPTION_H;
  const totalContentH = PLACEHOLDER_H + 1 + listHeight + (showSearch ? SEARCH_H : 0) + 12;
  const maxDropdownH = Math.min(
    totalContentH,
    pos ? Math.max(pos.spaceBelow, pos.bottom) - 16 : 320
  );

  const openUpward = pos !== null && pos.spaceBelow < Math.min(totalContentH, 280);

  const dropdownPositionStyle: React.CSSProperties = pos
    ? {
        position: 'fixed',
        left: pos.left,
        width: pos.width,
        zIndex: 99999,
        ...(openUpward
          ? { bottom: pos.bottom, top: 'unset' }
          : { top: pos.top }),
      }
    : {};

  return (
    <>
      {/* ── Trigger ───────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 12,
          border: `1.5px solid ${
            open ? 'var(--gold)' : selected ? 'rgba(212,175,55,0.3)' : 'var(--black-border)'
          }`,
          background: open
            ? 'rgba(212,175,55,0.06)'
            : selected
            ? 'rgba(212,175,55,0.04)'
            : 'var(--black-surface)',
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
          fontFamily: 'var(--font-body)',
          textAlign: 'left',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(212,175,55,0.1)' : 'none',
          minHeight: 46,
        }}
      >
        {/* Avatar */}
        {selected ? (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: getAvatarColor(options.indexOf(selected)),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 12, fontWeight: 700, color: '#fff',
            letterSpacing: '0.02em',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}>
            {getInitials(selected.nombre)}
          </div>
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--black-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconComponent size={14} color="var(--gray-muted)" />
          </div>
        )}

        {/* Nombre */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: selected ? 600 : 400,
            color: selected ? 'var(--white-soft)' : 'var(--gray-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            margin: 0,
          }}>
            {selected ? selected.nombre : placeholder}
          </p>
          {selected?.subtitle && (
            <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 1, margin: '1px 0 0' }}>
              {selected.subtitle}
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
            size={16}
            color="var(--gray-muted)"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </div>
      </button>

      {/* ── Dropdown Portal ────────────────────────────────────── */}
      {open && pos && createPortal(
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar selección"
            className="dropdown-backdrop-button"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            ref={dropdownRef}
            style={{
              ...dropdownPositionStyle,
              background: 'var(--black-card)',
              border: '1.5px solid rgba(212,175,55,0.25)',
              borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
              animation: 'psSlideIn 0.2s cubic-bezier(0.16,1,0.3,1)',
              maxHeight: maxDropdownH,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Buscador — solo si hay más de 4 opciones */}
            {showSearch && (
              <div className="cs-search-wrapper">
              <Search size={14} color="var(--gray-muted)" style={{ flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                placeholder={`Buscar ${tipo === 'socio' ? 'socio' : 'barbero'}...`}
                aria-label={`Buscar ${tipo === 'socio' ? 'socio' : 'barbero'}`}
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

            {/* Lista scrolleable */}
            <div
              ref={listRef}
              style={{
                overflowY: 'auto',
                flex: 1,
                /* scrollbar premium */
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(212,175,55,0.2) transparent',
              }}
            >
              {/* Opción vacía */}
              <button
                type="button"
                onClick={() => handleSelect('')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  border: 'none',
                  background: !value ? 'rgba(212,175,55,0.08)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  transition: 'background 0.13s',
                  minHeight: PLACEHOLDER_H,
                }}
                onMouseEnter={e => { if (value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--black-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconComponent size={14} color="var(--gray-muted)" />
                </div>
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
              <div style={{ height: 1, background: 'var(--black-border)', margin: '0 10px' }} />

              {/* Sin resultados */}
              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--gray-muted)' }}>
                  Sin resultados para "{search}"
                </p>
              )}

              {/* Opciones */}
              {filtered.map((option, idx) => {
                const isSelected = value === option.id;
                const optionTipo = option.tipo || tipo;
                const OptionIcon = optionTipo === 'socio' ? UserCog : Scissors;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isSelected ? 'rgba(212,175,55,0.09)' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      textAlign: 'left',
                      transition: 'background 0.13s',
                      minHeight: OPTION_H,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Avatar compacto */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: getAvatarColor(idx),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 12, fontWeight: 700, color: '#fff',
                      letterSpacing: '0.02em',
                      boxShadow: isSelected
                        ? '0 0 0 2px var(--gold), 0 2px 6px rgba(0,0,0,0.3)'
                        : '0 2px 6px rgba(0,0,0,0.25)',
                      transition: 'box-shadow 0.18s',
                    }}>
                      {getInitials(option.nombre)}
                    </div>

                    {/* Nombre + subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--gold)' : 'var(--white-soft)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        transition: 'color 0.13s', margin: 0,
                      }}>
                        {option.nombre}
                      </p>
                      {option.subtitle && (
                        <p style={{
                          fontSize: 11,
                          color: isSelected ? 'rgba(212,175,55,0.7)' : 'var(--gray-muted)',
                          marginTop: 1, margin: '1px 0 0',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <OptionIcon size={9} style={{ flexShrink: 0 }} />
                          {option.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Radio */}
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

            {/* Footer: contador cuando hay búsqueda activa */}
            {search && filtered.length > 0 && (
              <div style={{
                padding: '6px 14px',
                borderTop: '1px solid var(--black-border)',
                fontSize: 11,
                color: 'var(--gray-muted)',
                flexShrink: 0,
                background: 'var(--black-card)',
              }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {options.length}
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      <style>{`
        @keyframes psSlideIn {
          from { opacity: 0; transform: translateY(${openUpward ? '6px' : '-8px'}) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes psFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Scrollbar webkit */
        div[data-ps-list]::-webkit-scrollbar { width: 4px; }
        div[data-ps-list]::-webkit-scrollbar-track { background: transparent; }
        div[data-ps-list]::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 4px; }
      `}</style>
    </>
  );
}
