import { useState, useEffect } from 'react';
import { useAppConfig } from '@/lib/useAppConfig';
import { useMoneda } from '@/lib/useMoneda';
import { db } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getComisionBrutaMes, getAdelantosMes, getSaldoDisponibleBarbero } from '@/lib/business';

import styles from './BarberoDetalle.module.css';

export default function BarberoDetalle({ barberoId, mesFecha = new Date() }: { barberoId: number; porcentaje: number; mesFecha?: Date }) {
  const { simbolo } = useMoneda();
  const { t } = useAppConfig();
  const formatCurrency = (n: number) => `${simbolo}${n.toFixed(2)}`;

  const [comision, setComision] = useState(0);
  const [Adelantos, setAdelantos] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [ingresosBarbero, setIngresosBarbero] = useState(0);
  const [listaAdelantos, setListaAdelantos] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      const inicio = startOfMonth(mesFecha);
      const fin = endOfMonth(mesFecha);

      // Cargar comisión, adelantos, saldo e items en paralelo — un solo batch
      const [c, a, s, registros, items, lista] = await Promise.all([
        getComisionBrutaMes(barberoId, mesFecha),
        getAdelantosMes(barberoId, mesFecha),
        getSaldoDisponibleBarbero(barberoId, mesFecha),
        db.registros_diarios.where('barbero_id').equals(barberoId).toArray(),
        db.servicios_productos.toArray(),
        db.Adelantos
          .where('barbero_id')
          .equals(barberoId)
          .and(adv => adv.fecha >= inicio && adv.fecha <= fin)
          .toArray(),
      ]);

      if (cancelled) return;

      setComision(c);
      setAdelantos(a);
      setSaldo(s);

      // Calcular ingresos del barbero en el mes usando Map — sin N+1 queries
      const itemMap = new Map(items.map(i => [i.id!, i]));
      const ing = registros.reduce((sum, r) => {
        const fecha = new Date(r.fecha);
        if (fecha < inicio || fecha > fin) return sum;
        return itemMap.get(r.item_id)?.tipo === 'servicio' ? sum + r.monto_total : sum;
      }, 0);
      setIngresosBarbero(ing);

      // Ordenar adelantos más reciente primero
      lista.sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
      setListaAdelantos(lista);
    }

    const t = setTimeout(() => {
      if (!cancelled) cargar();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [barberoId, mesFecha]);

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('generated')}</span>
          <span className={`${styles.statValue} ${styles.goldText}`} style={{ color: 'var(--gold)' }}>{formatCurrency(ingresosBarbero)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('grossCommission')}</span>
          <span className={`${styles.statValue} ${styles.goldText}`} style={{ color: 'var(--gold)' }}>{formatCurrency(comision)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('advancesPaid')}</span>
          <span className={styles.statValue} style={{ color: 'var(--danger)' }}>{formatCurrency(Adelantos)}</span>
        </div>
        <div className={`${styles.statCard} ${styles.balanceCard}`} style={{ borderColor: saldo > 0 ? 'rgba(76,175,130,0.3)' : saldo === 0 ? 'rgba(212,175,55,0.3)' : 'rgba(224,82,82,0.3)' }}>
          <span className={styles.statLabel}>{t('netBalance2')}</span>
          <span className={styles.statValue} style={{ color: saldo > 0 ? 'var(--success)' : saldo === 0 ? 'var(--gold)' : 'var(--danger)' }}>
            {saldo > 0 ? '+' : ''}{formatCurrency(saldo)}
          </span>
          <p className={styles.balanceSubtext} style={{ color: saldo >= 0 ? 'var(--gray-muted)' : 'var(--danger)' }}>
            {saldo >= 0 ? t('commissionGenMinusAdv') : t('advanceExceedsComm')}
          </p>
          {saldo > 0 && (
            <p className={styles.balanceSubtext} style={{ color: 'var(--success)' }}>{t('canStillCollect')} {formatCurrency(saldo)}</p>
          )}
          {saldo < 0 && (
            <p className={styles.balanceSubtext} style={{ color: 'var(--danger)' }}>{t('advanceExceedsBy')} {formatCurrency(Math.abs(saldo))}</p>
          )}
          {saldo === 0 && (
            <p className={styles.balanceSubtext} style={{ color: 'var(--gold)' }}>{t('zeroBalance')}</p>
          )}
        </div>
      </div>

      <div className={styles.advancesSection}>
        <p className={styles.sectionTitle}>{t('advanceHistory')}</p>
        {listaAdelantos.length === 0 ? (
          <p className={styles.note}>{t('noAdvancesMonth')}</p>
        ) : (
          <div className={styles.advancesList}>
            {listaAdelantos.map((a) => (
              <div key={a.id} className={styles.advanceItem}>
                <div>
                  <p className={styles.advanceMotive}>{a.motivo}</p>
                  <p className={styles.advanceDate}>📅 {new Date(a.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <span className={styles.advanceAmount}>-{formatCurrency(a.monto)}</span>
              </div>
            ))}
          </div>
        )}
        <p className={styles.note}>{t('productsNoBenefit')}</p>
      </div>
    </div>
  );
}
