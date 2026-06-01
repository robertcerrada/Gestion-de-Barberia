'use client';

import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  className?: string;
  compact?: boolean;
  markedDates?: string[];
}

const DEFAULT_MARKED_DATES: string[] = [];
const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export function DatePicker({ value, onChange, className = '', compact = false, markedDates = DEFAULT_MARKED_DATES }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => value && isValid(parseISO(value)) ? parseISO(value) : new Date());
  
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled && value && isValid(parseISO(value))) {
        requestAnimationFrame(() => setCurrentMonth(parseISO(value)));
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value]);

  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const renderCalendar = () => {
    return (
      <div
        className="datepicker-overlay"
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            setIsOpen(false);
          }
        }}
        style={{ background: 'transparent', border: 'none', padding: 0, margin: 0 }}
      >
        <div
          className="card datepicker-card"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="datepicker-header">
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost datepicker-nav-button">
              <ChevronLeft size={20} />
            </button>
            <span className="datepicker-month-label">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost datepicker-nav-button">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="datepicker-weekdays">
            {WEEK_DAYS.map(d => (
              <span key={d} className="datepicker-weekday">{d}</span>
            ))}
          </div>

          {/* Días */}
          <div className="datepicker-grid">
            {calendarDays.map(day => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className="datepicker-day-btn"
                  onClick={() => {
                    onChange(format(day, 'yyyy-MM-dd'));
                    setIsOpen(false);
                  }}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, var(--gold-light), var(--gold))' : isToday ? 'rgba(255,255,255,0.08)' : (markedDates.includes(format(day, 'yyyy-MM-dd')) ? 'rgba(212,175,55,0.16)' : 'transparent'),
                    color: isSelected ? '#0a0a0a' : markedDates.includes(format(day, 'yyyy-MM-dd')) ? 'var(--gold)' : isCurrentMonth ? 'var(--white-soft)' : 'var(--gray-muted)',
                    fontWeight: isSelected ? 800 : markedDates.includes(format(day, 'yyyy-MM-dd')) ? 700 : isToday ? 700 : 500,
                    opacity: isCurrentMonth ? 1 : 0.4,
                    boxShadow: isSelected ? '0 4px 12px rgba(212,175,55,0.4)' : 'none'
                  }}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="datepicker-footer">
            <button type="button" className="btn-ghost datepicker-footer-button" onClick={() => setIsOpen(false)}>Cancelar</button>
            <button type="button" className="btn-gold datepicker-footer-button" onClick={() => {
              onChange(format(new Date(), 'yyyy-MM-dd'));
              setIsOpen(false);
            }}>Hoy</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        className={`input-dark datepicker-trigger ${className}`}
        style={{
          padding: compact ? '6px 12px' : '12px 14px',
          minHeight: compact ? 34 : 48,
          color: selectedDate ? 'var(--white-soft)' : 'var(--gray-muted)',
        }}
        onClick={() => setIsOpen(true)}
      >
        <CalendarIcon size={compact ? 14 : 18} color="var(--gold)" />
        <span className="datepicker-trigger-text" style={{ fontSize: compact ? '13px' : '15px' }}>
          {selectedDate ? format(selectedDate, "d MMM, yyyy", { locale: es }) : 'Seleccionar'}
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        renderCalendar(),
        document.body
      )}
    </>
  );
}
