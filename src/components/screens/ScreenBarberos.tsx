'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ChevronRight, Percent, ChevronLeft, ChevronDown } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAppConfig } from '@/lib/useAppConfig';
import styles from './ScreenBarberos.module.css';
import BarberoDetalle from './BarberoDetalle';

function mesAnioAFecha(mes: number, anio: number): Date {
  return new Date(anio, mes, 1);
}

function ClipperIcon({ size = 20, color = '#0a0a0a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 18.5 C3.8 17.2 3.5 15 4.2 13.2 L9.5 4.8 C10.2 3.5 11.8 3.2 13 4 L15.5 5.8 C16.7 6.6 17 8.2 16.2 9.5 L11 18 C10.2 19.3 8.5 19.8 7.2 19.2 L5.8 18.5 Z"
        fill={color} fillOpacity="0.24"
      />
      <path
        d="M5 18.5 C3.8 17.2 3.5 15 4.2 13.2 L9.5 4.8 C10.2 3.5 11.8 3.2 13 4 L15.5 5.8 C16.7 6.6 17 8.2 16.2 9.5 L11 18 C10.2 19.3 8.5 19.8 7.2 19.2 L5.8 18.5 Z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round"
      />
      <rect x="8.5" y="2" width="7" height="3" rx="0.8" transform="rotate(32 8.5 2)" fill={color} fillOpacity="0.45" />
      <rect x="8.5" y="2" width="7" height="3" rx="0.8" transform="rotate(32 8.5 2)" stroke={color} strokeWidth="1.5" />
      <line x1="8.2"  y1="1.5" x2="7.2"  y2="3.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="10"   y1="1.0" x2="9.0"  y2="2.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="11.8" y1="0.8" x2="10.8" y2="2.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="13.5" y1="1.0" x2="12.5" y2="2.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="15.2" y1="1.6" x2="14.2" y2="3.3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M9.8 5.5 C10.3 4.6 11.5 4.4 12.3 5 L14.5 6.5 C15.3 7.1 15.4 8.3 14.8 9.2 L12.5 13 C11.9 13.9 10.6 14 9.8 13.3 L8 11.8 C7.2 11.1 7.2 9.9 7.8 9 Z"
        fill={color} fillOpacity="0.4"
      />
      <ellipse
        cx="10.2" cy="13.5" rx="1.8" ry="1.1"
        transform="rotate(-58 10.2 13.5)"
        fill={color} fillOpacity="0.8" stroke={color} strokeWidth="1.2"
      />
      <circle cx="6.5" cy="19.5" r="1.0" fill={color} fillOpacity="0.8" />
    </svg>
  );
}

export default function ScreenBarberos() {
  const { t } = useAppConfig();
  const MESES = Array.from({ length: 12 }, (_, i) => t(`month_${i}`));
  const hoy = new Date();
  const [selectedBarbero, setSelectedBarbero] = useState<number | null>(null);
  const [mesNav, setMesNav] = useState(() => hoy.getMonth());
  const [anioNav, setAnioNav] = useState(() => hoy.getFullYear());

  const esMesActual = mesNav === hoy.getMonth() && anioNav === hoy.getFullYear();
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
        <p className="section-title">{t('barbersTitle')}</p>
      </div>

      {/* ── Navegador de mes ── */}
      <div className={styles.cardGold} style={{ marginBottom: 16 }}>
        <div className={styles.navContainer}>
          <button type="button" onClick={navAnterior} className={styles.navButton} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>

          <div className={styles.navTitle}>
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
              className={styles.hiddenMonthInput}
            />
            <div className={styles.monthDisplay}>
              <p className={styles.monthText}>
                {MESES[mesNav]} <ChevronDown size={14} className={styles.chevronIcon} />
              </p>
              <p className={styles.yearText}>
                {anioNav}{esMesActual ? ` · ${t('currentMonth')}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={navSiguiente}
            disabled={esMesActual}
            aria-label="Mes siguiente"
            className={esMesActual ? styles.navButtonDisabled : styles.navButton}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {!esMesActual && (
          <button type="button" onClick={irAHoy} className={styles.goToCurrentButton}>
            {t('goToCurrentMonth')}
          </button>
        )}
      </div>

      <div className={styles.barberosList}>
        {barberos?.map(b => (
          <button
            key={b.id}
            type="button"
            className={`${styles.card} ${selectedBarbero === b.id ? styles.selectedCard : ''} ${(!esMesActual && !b.activo) ? styles.inactiveCard : ''}`}
            onClick={() => setSelectedBarbero(selectedBarbero === b.id ? null : b.id!)}
          >
            <div className={styles.cardContent}>
              <div className={styles.barberoInfo}>
                <div className={`${styles.avatar} ${b.activo ? styles.avatarActive : styles.avatarInactive}`}>
                  <ClipperIcon size={40} color={b.activo ? "#0a0a0a" : "var(--gray-muted)"} />
                </div>
                <div>
                  <p className={styles.barberoName}>{b.nombre}</p>
                  <div className={styles.badgeContainer}>
                    <span className={`badge ${b.activo ? 'badge-green' : 'badge-red'}`}>
                      {b.activo ? t('active') : t('inactive')}
                    </span>
                    <span className="badge badge-gold">
                      <Percent size={9} /> {(b.porcentaje_comision * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className={selectedBarbero === b.id ? styles.chevronRotated : styles.chevronBase} />
            </div>
            {selectedBarbero === b.id && (
              <BarberoDetalle barberoId={b.id!} porcentaje={b.porcentaje_comision} mesFecha={fechaMes} />
            )}
          </button>
        ))}

        {(!barberos || barberos.length === 0) && (
          <div className={styles.emptyState}>
            <div style={{ margin: '0 auto 12px', opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipperIcon size={44} color="var(--gray-muted)" />
            </div>
            <p>{esMesActual ? t('noActiveBarbers') : `${t('noActivityMonth')} ${MESES[mesNav]} ${anioNav}`}</p>
          </div>
        )}
      </div>
    </div>
  );
}
