'use client';

import React, { useState, useEffect, useRef } from 'react';
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

export function DatePicker({ value, onChange, className = '', compact = false, markedDates = [] }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => value && isValid(parseISO(value)) ? parseISO(value) : new Date());
  
  useEffect(() => {
    if (value && isValid(parseISO(value))) {
      setCurrentMonth(parseISO(value));
    }
  }, [value]);

  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const renderCalendar = () => {
    return (
      <div className="modal-overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 9999, alignItems: 'center' }}>
        <div 
          className="card" 
          onClick={e => e.stopPropagation()}
          style={{ 
            width: '90%', maxWidth: '340px', 
            background: 'var(--black-card)', 
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px var(--black-border)',
            animation: 'fadeIn 0.2s ease-out',
            padding: '20px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost" style={{ minHeight: '36px', padding: '6px' }}>
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontWeight: 600, color: 'var(--white-soft)', textTransform: 'capitalize', fontSize: '15px' }}>
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost" style={{ minHeight: '36px', padding: '6px' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Días de la semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px', textAlign: 'center' }}>
            {weekDays.map(d => (
              <span key={d} style={{ fontSize: '11px', color: 'var(--gray-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{d}</span>
            ))}
          </div>

          {/* Días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {calendarDays.map(day => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(format(day, 'yyyy-MM-dd'));
                    setIsOpen(false);
                  }}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', cursor: 'pointer',
                    background: isSelected ? 'linear-gradient(135deg, var(--gold-light), var(--gold))' : isToday ? 'rgba(255,255,255,0.08)' : (markedDates.includes(format(day, 'yyyy-MM-dd')) ? 'rgba(212,175,55,0.16)' : 'transparent'),
                    color: isSelected ? '#0a0a0a' : markedDates.includes(format(day, 'yyyy-MM-dd')) ? 'var(--gold)' : isCurrentMonth ? 'var(--white-soft)' : 'var(--gray-muted)',
                    fontWeight: isSelected ? 800 : markedDates.includes(format(day, 'yyyy-MM-dd')) ? 700 : isToday ? 700 : 500,
                    opacity: isCurrentMonth ? 1 : 0.4,
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 12px rgba(212,175,55,0.4)' : 'none'
                  }}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-ghost" style={{ flex: 1, minHeight: '36px', fontSize: '13px', padding: '0' }} onClick={() => setIsOpen(false)}>Cancelar</button>
            <button type="button" className="btn-gold" style={{ flex: 1, minHeight: '36px', fontSize: '13px', padding: '0' }} onClick={() => {
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
        className={`input-dark ${className}`}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%', 
          justifyContent: 'flex-start', cursor: 'pointer',
          padding: compact ? '6px 12px' : '12px 14px',
          minHeight: compact ? '34px' : '48px',
          color: selectedDate ? 'var(--white-soft)' : 'var(--gray-muted)',
          boxSizing: 'border-box'
        }}
        onClick={() => setIsOpen(true)}
      >
        <CalendarIcon size={compact ? 14 : 18} color="var(--gold)" />
        <span style={{ fontSize: compact ? '13px' : '15px', fontWeight: 500, letterSpacing: '0.01em' }}>
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
