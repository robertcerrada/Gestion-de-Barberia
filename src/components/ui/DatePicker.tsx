'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  className?: string;
  compact?: boolean;
  markedDates?: string[];
}

const MONTH_NAMES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];
const WEEK_DAYS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];
const CAL_WIDTH = 308;

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseYMD(s: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}
function formatDisplay(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES_ES[d.getMonth()]}, ${d.getFullYear()}`;
}
function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  let dow = firstDay.getDay();
  dow = dow === 0 ? 6 : dow - 1;
  const start = new Date(year, month, 1 - dow);
  const lastDay = new Date(year, month + 1, 0);
  let endDow = lastDay.getDay();
  endDow = endDow === 0 ? 6 : endDow - 1;
  const end = new Date(year, month + 1, 0 + (6 - endDow));
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
}

const DEFAULT_MARKED: string[] = [];

export function DatePicker({
  value,
  onChange,
  className = '',
  compact = false,
  markedDates = DEFAULT_MARKED,
}: DatePickerProps) {
  const selectedDate = useMemo(() => parseYMD(value), [value]);
  const [isOpen, setIsOpen]       = useState(false);
  const [viewYear, setViewYear]   = useState(() => selectedDate?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate?.getMonth() ?? new Date().getMonth());
  const [dropPos, setDropPos]     = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted]     = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);

  // Necesario para createPortal (solo en cliente)
  useEffect(() => { setMounted(true); }, []);

  const markedSet    = useMemo(() => new Set(markedDates), [markedDates]);
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayStr     = useMemo(() => toYMD(new Date()), []);

  // Calcula posición real del trigger después del paint
  const recalcPos = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!triggerRef.current) return;
      const tr  = triggerRef.current.getBoundingClientRect();
      const vw  = window.innerWidth;
      const vh  = window.innerHeight;
      const calH = dropRef.current ? dropRef.current.getBoundingClientRect().height : 340;

      // Centrar horizontalmente bajo el trigger, clampear a bordes
      let left = tr.left + tr.width / 2 - CAL_WIDTH / 2;
      left = Math.max(8, Math.min(left, vw - CAL_WIDTH - 8));

      // Abajo si hay espacio, si no arriba
      const spaceBelow = vh - tr.bottom - 8;
      const top = spaceBelow >= calH
        ? tr.bottom + 6
        : Math.max(8, tr.top - calH - 6);

      setDropPos({ top, left });
    });
  }, []);

  useEffect(() => {
    if (!isOpen) { setDropPos(null); return; }
    recalcPos();
    window.addEventListener('scroll', recalcPos, { passive: true, capture: true });
    window.addEventListener('resize', recalcPos, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', recalcPos, { capture: true });
      window.removeEventListener('resize', recalcPos);
    };
  }, [isOpen, viewMonth, viewYear, recalcPos]);

  const handleOpen = useCallback(() => {
    const d = selectedDate ?? new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(true);
  }, [selectedDate]);

  const prevMonth = useCallback(() => setViewMonth(m => { if (m===0){setViewYear(y=>y-1);return 11;} return m-1; }), []);
  const nextMonth = useCallback(() => setViewMonth(m => { if (m===11){setViewYear(y=>y+1);return 0;} return m+1; }), []);
  const handleDaySelect = useCallback((s: string) => { onChange(s); setIsOpen(false); }, [onChange]);

  // El dropdown se porta a document.body para escapar de cualquier
  // ancestro con transform, overflow:hidden o will-change que rompa fixed
  const dropdown = isOpen && mounted ? createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }}
        onPointerDown={() => setIsOpen(false)}
      />
      {/* Calendario */}
      <div
        ref={dropRef}
        style={{
          position: 'fixed',
          top:  dropPos ? dropPos.top  : -9999,
          left: dropPos ? dropPos.left : -9999,
          width: CAL_WIDTH,
          zIndex: 9999,
          opacity: dropPos ? 1 : 0,
          pointerEvents: dropPos ? 'auto' : 'none',
          animation: dropPos ? 'dpFadeIn 0.15s ease-out both' : 'none',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="card datepicker-card" style={{ transform: 'none' }}>

          {/* Header */}
          <div className="datepicker-header">
            <button type="button" className="btn-ghost datepicker-nav-button" onClick={prevMonth}>
              <ChevronLeft size={20} />
            </button>
            <span className="datepicker-month-label">
              {MONTH_NAMES_ES[viewMonth]} {viewYear}
            </span>
            <button type="button" className="btn-ghost datepicker-nav-button" onClick={nextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Días semana */}
          <div className="datepicker-weekdays">
            {WEEK_DAYS.map(d => <span key={d} className="datepicker-weekday">{d}</span>)}
          </div>

          {/* Grid días */}
          <div className="datepicker-grid">
            {calendarDays.map(day => {
              const ds = toYMD(day);
              let cls = 'datepicker-day-btn';
              if (ds === value)                 cls += ' dp-day--selected';
              else if (ds === todayStr)         cls += ' dp-day--today';
              else if (markedSet.has(ds))       cls += ' dp-day--marked';
              if (day.getMonth() !== viewMonth) cls += ' dp-day--other-month';
              return (
                <button key={ds} type="button" className={cls}
                  style={{ touchAction: 'manipulation' }}
                  onPointerDown={e => { e.preventDefault(); handleDaySelect(ds); }}>
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="datepicker-footer">
            <button type="button" className="btn-ghost datepicker-footer-button"
              onClick={() => setIsOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-gold datepicker-footer-button"
              onClick={() => { onChange(todayStr); setIsOpen(false); }}>
              Hoy
            </button>
          </div>

        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative', display: 'block', width: '100%' }}>
      <button
        ref={triggerRef}
        type="button"
        className={`input-dark datepicker-trigger ${className}`}
        style={{
          padding: compact ? '6px 12px' : '12px 14px',
          minHeight: compact ? 34 : 48,
          color: selectedDate ? 'var(--white-soft)' : 'var(--gray-muted)',
        }}
        onPointerDown={e => { e.preventDefault(); isOpen ? setIsOpen(false) : handleOpen(); }}
      >
        <CalendarIcon size={compact ? 14 : 18} color="var(--gold)" />
        <span className="datepicker-trigger-text" style={{ fontSize: compact ? '13px' : '15px' }}>
          {selectedDate ? formatDisplay(selectedDate) : 'Seleccionar'}
        </span>
      </button>

      {dropdown}
    </div>
  );
}
