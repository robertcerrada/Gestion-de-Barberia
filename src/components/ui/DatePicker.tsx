'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  className?: string;
  compact?: boolean;
  markedDates?: string[];
}

// ─── Helpers nativos (sin date-fns, sin locale overhead) ─────────────────────
const MONTH_NAMES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
];
const WEEK_DAYS = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

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
  // month: 0-indexed
  const firstDay = new Date(year, month, 1);
  // Semana empieza en lunes (0=dom → shift)
  let dow = firstDay.getDay(); // 0=dom
  dow = dow === 0 ? 6 : dow - 1; // lunes=0
  const startDate = new Date(year, month, 1 - dow);

  const lastDay = new Date(year, month + 1, 0);
  let endDow = lastDay.getDay();
  endDow = endDow === 0 ? 6 : endDow - 1;
  const endDate = new Date(year, month + 1, 0 + (6 - endDow));

  const days: Date[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
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

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() => selectedDate?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate?.getMonth() ?? new Date().getMonth());

  // Convertir markedDates a Set una sola vez por cambio
  const markedSet = useMemo(() => new Set(markedDates), [markedDates]);

  // Calcular días del calendario solo cuando cambia el mes/año visible
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const todayStr = useMemo(() => toYMD(new Date()), []);

  const handleOpen = useCallback(() => {
    const d = selectedDate ?? new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(true);
  }, [selectedDate]);

  const prevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const handleDaySelect = useCallback((dayStr: string) => {
    onChange(dayStr);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div style={{ position: 'relative', display: 'block', width: '100%' }}>
      <button
        type="button"
        className={`input-dark datepicker-trigger ${className}`}
        style={{
          padding: compact ? '6px 12px' : '12px 14px',
          minHeight: compact ? 34 : 48,
          color: selectedDate ? 'var(--white-soft)' : 'var(--gray-muted)',
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          handleOpen();
        }}
      >
        <CalendarIcon size={compact ? 14 : 18} color="var(--gold)" />
        <span className="datepicker-trigger-text" style={{ fontSize: compact ? '13px' : '15px' }}>
          {selectedDate ? formatDisplay(selectedDate) : 'Seleccionar'}
        </span>
      </button>

      {/* Overlay transparente para cerrar al tocar fuera */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'transparent',
          }}
          onPointerDown={() => setIsOpen(false)}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transform: isOpen ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity 0.12s ease-out, transform 0.12s ease-out',
        }}
      >
        <div 
          className="card datepicker-card" 
          onClick={e => e.stopPropagation()}
          style={{ willChange: 'transform', contain: 'layout' }}
        >
          {/* Header */}
          <div className="datepicker-header">
            <button type="button" onClick={prevMonth} className="btn-ghost datepicker-nav-button">
              <ChevronLeft size={20} />
            </button>
            <span className="datepicker-month-label">
              {MONTH_NAMES_ES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="btn-ghost datepicker-nav-button">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="datepicker-weekdays">
            {WEEK_DAYS.map(d => (
              <span key={d} className="datepicker-weekday">{d}</span>
            ))}
          </div>

          {/* Días del mes */}
          <div className="datepicker-grid">
            {calendarDays.map(day => {
              const dayStr = toYMD(day);
              const isSelected = dayStr === value;
              const isCurrentMonth = day.getMonth() === viewMonth;
              const isToday = dayStr === todayStr;
              const isMarked = markedSet.has(dayStr);

              let cls = 'datepicker-day-btn';
              if (isSelected) cls += ' dp-day--selected';
              else if (isToday) cls += ' dp-day--today';
              else if (isMarked) cls += ' dp-day--marked';
              if (!isCurrentMonth) cls += ' dp-day--other-month';

              return (
                <button
                  key={dayStr}
                  type="button"
                  className={cls}
                  onPointerDown={e => {
                    e.preventDefault();
                    handleDaySelect(dayStr);
                  }}
                  style={{ touchAction: 'manipulation' }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="datepicker-footer">
            <button type="button" className="btn-ghost datepicker-footer-button" onClick={() => setIsOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-gold datepicker-footer-button"
              onClick={() => { onChange(todayStr); setIsOpen(false); }}
            >
              Hoy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
