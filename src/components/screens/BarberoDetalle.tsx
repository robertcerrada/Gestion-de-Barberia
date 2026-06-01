import { useState, useEffect } from 'react';
import { useAppConfig } from '@/lib/useAppConfig';
import { useMoneda } from '@/lib/useMoneda';
import { db } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';
import { getComisionBrutaMes, getAdelantosMes, getSaldoDisponibleBarbero } from '@/lib/business';
import { CheckCircle2, Percent, X, Plus } from 'lucide-react';

export default function BarberoDetalle({ barberoId, porcentaje, mesFecha = new Date() }: { barberoId: number; porcentaje: number; mesFecha?: Date }) {
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

      const [c, a, s] = await Promise.all([
        getComisionBrutaMes(barberoId, mesFecha),
        getAdelantosMes(barberoId, mesFecha),
        getSaldoDisponibleBarbero(barberoId, mesFecha),
      ]);
      if (!cancelled) {
        setComision(c);
        setAdelantos(a);
        setSaldo(s);
      }

      const registros = await db.registros_diarios.where('barbero_id').equals(barberoId).toArray();
      let ing = 0;
      for (const r of registros) {
        if (new Date(r.fecha) >= inicio && new Date(r.fecha) <= fin) {
          const item = await db.servicios_productos.get(r.item_id);
          if (item?.tipo === 'servicio') ing += r.monto_total;
        }
      }
      if (!cancelled) setIngresosBarbero(ing);

      const list = await db.Adelantos
        .where('barbero_id')
        .equals(barberoId)
        .and((adv) => adv.fecha >= inicio && adv.fecha <= fin)
        .toArray();
      list.sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
      if (!cancelled) setListaAdelantos(list);
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
    <div className="barbero-detalle">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">{t('generated')}</span>
          <span className="stat-value gold">{formatCurrency(ingresosBarbero)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('grossCommission')}</span>
          <span className="stat-value gold">{formatCurrency(comision)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('advancesPaid')}</span>
          <span className="stat-value red">{formatCurrency(Adelantos)}</span>
        </div>
        <div className="stat-card" style={{ borderColor: saldo > 0 ? 'rgba(76,175,130,0.3)' : saldo === 0 ? 'rgba(212,175,55,0.3)' : 'rgba(224,82,82,0.3)' }}>
          <span className="stat-label">{t('netBalance2')}</span>
          <span className="stat-value" style={{ color: saldo > 0 ? 'var(--success)' : saldo === 0 ? 'var(--gold)' : 'var(--danger)' }}>
            {saldo > 0 ? '+' : ''}{formatCurrency(saldo)}
          </span>
          <p className="balance-subtext" style={{ color: saldo >= 0 ? 'var(--gray-muted)' : 'var(--danger)' }}>
            {saldo >= 0 ? t('commissionGenMinusAdv') : t('advanceExceedsComm')}
          </p>
          {saldo > 0 && (
            <p className="balance-subtext success">{t('canStillCollect')} {formatCurrency(saldo)}</p>
          )}
          {saldo < 0 && (
            <p className="balance-subtext danger">{t('advanceExceedsBy')} {formatCurrency(Math.abs(saldo))}</p>
          )}
          {saldo === 0 && (
            <p className="balance-subtext gold">{t('zeroBalance')}</p>
          )}
        </div>
      </div>

      <div className="advances-section">
        <p className="section-title">{t('advanceHistory')}</p>
        {listaAdelantos.length === 0 ? (
          <p className="text-hint italic">{t('noAdvancesMonth')}</p>
        ) : (
          <div className="advances-list">
            {listaAdelantos.map((a) => (
              <div key={a.id} className="advance-item">
                <div>
                  <p className="advance-motive">{a.motivo}</p>
                  <p className="advance-date">📅 {new Date(a.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <span className="advance-amount">-{formatCurrency(a.monto)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-hint note">{t('productsNoBenefit')}</p>
      </div>
    </div>
  );
}
