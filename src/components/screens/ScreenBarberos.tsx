'use client';

import { useState } from 'react';
import Image from 'next/image';
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

function ClipperIcon({ size = 20, active = true }: { size?: number; active?: boolean }) {
  return (
    <div style={{ 
      width: size, 
      height: size, 
      position: 'relative', 
      opacity: active ? 1 : 0.4,
      filter: active ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' : 'grayscale(100%) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      transition: 'all 0.3s'
    }}>
      <Image 
        src="/clipper-3d.png" 
        alt="Máquina de cortar pelo" 
        fill 
        sizes={`${size}px`}
        style={{ objectFit: 'contain', borderRadius: '50%' }} 
      />
    </div>
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
          <div
            key={b.id}
            className={`${styles.card} ${selectedBarbero === b.id ? styles.selectedCard : ''} ${(!esMesActual && !b.activo) ? styles.inactiveCard : ''}`}
          >
            <button
              type="button"
              className={styles.cardHeaderButton}
              onClick={() => setSelectedBarbero(selectedBarbero === b.id ? null : b.id!)}
            >
              <div className={styles.barberoInfo}>
                <div className={`${styles.avatar} ${b.activo ? styles.avatarActive : styles.avatarInactive}`}>
                  <ClipperIcon size={44} active={b.activo} />
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
            </button>
            {selectedBarbero === b.id && (
              <BarberoDetalle barberoId={b.id!} porcentaje={b.porcentaje_comision} mesFecha={fechaMes} />
            )}
          </div>
        ))}

        {(!barberos || barberos.length === 0) && (
          <div className={styles.emptyState}>
            <div style={{ margin: '0 auto 12px', opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipperIcon size={48} active={false} />
            </div>
            <p>{esMesActual ? t('noActiveBarbers') : `${t('noActivityMonth')} ${MESES[mesNav]} ${anioNav}`}</p>
          </div>
        )}
      </div>
    </div>
  );
}
