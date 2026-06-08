'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useGoogleLogin } from '@react-oauth/google';
import { exportarAGoogleDrive, restaurarDesdeGoogleDrive, setAccessToken, clearAccessToken, DRIVE_SCOPE, getLastBackupInfo, isDriveConnected } from '@/lib/drive';
import { exportarTodosLosDatos, getSaldoFondoCaja } from '@/lib/business';
import { getGoogleUser, verifyPin, savePin, isPinConfigured, logoutAll } from '@/lib/auth';
import { Cloud, CloudDownload, LogIn, LogOut, Shield, Download, CheckCircle2, AlertCircle, Scissors, Database, Users, Plus, Wallet, Package, X, Store, UserCog, Percent, Edit2, KeyRound, Mail, Sun, Moon, Globe, RefreshCw, FileText, FileUp, Eye, Trash2, File } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getConfig, setConfig, type Socio, type Adelanto } from '@/lib/db';
import type { DocumentoBarbero, TipoDocumento } from '@/domain/types';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAppConfig, type Lang } from '@/lib/useAppConfig';
import { useMoneda, emitirCambioMoneda } from '@/lib/useMoneda';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function ScreenAjustes({ onNombreChange }: { onNombreChange?: (nombre: string) => void }) {
  const { t } = useAppConfig();
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('PON_TU_CLIENT_ID_AQUI')) {
    return (
      <div style={{ padding: 16 }}>
        <p className="section-title" style={{ marginBottom: 20 }}>{t('settings')}</p>
        <div className="card" style={{ padding: '20px', borderColor: 'rgba(212,175,55,0.3)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            <Shield size={20} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{t('googleConfigErrorTitle')}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-muted)', lineHeight: 1.5 }}>
                {t('googleConfigErrorDesc1')} <code style={{ background: 'var(--black-surface)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> {t('googleConfigErrorDesc2')} <code style={{ background: 'var(--black-surface)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>.env.local</code>.
              </p>
            </div>
          </div>
        </div>
        <AjustesContenido onNombreChange={onNombreChange} />
      </div>
    );
  }
  return <AjustesContenido onNombreChange={onNombreChange} />;
}

const IDIOMAS: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
];

function AjustesContenido({ onNombreChange }: { onNombreChange?: (nombre: string) => void }) {
  const { t, lang } = useAppConfig();
  const [showBarberos, setShowBarberos] = useState(false);
  const [showServicios, setShowServicios] = useState(false);
  const [showFondo, setShowFondo] = useState(false);
  const [showSocios, setShowSocios] = useState(false);
  const [showConfigBarberia, setShowConfigBarberia] = useState(false);
  const [showSeguridad, setShowSeguridad] = useState(false);
  const [showApariencia, setShowApariencia] = useState(false);
  const [showFinanzas, setShowFinanzas] = useState(false);

  const googleUser = typeof window !== 'undefined' ? getGoogleUser() : null;
  const userName = googleUser?.name ?? null;
  const userEmail = googleUser?.email ?? null;
  const rawPicture = googleUser?.picture ?? null;
  const userPicture = rawPicture?.startsWith('https://lh3.googleusercontent.com') ? rawPicture : null;
  const [showUserPicture, setShowUserPicture] = useState(true);

  return (
    <div style={{ padding: 16, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <p className="section-title" style={{ marginBottom: 20 }}>{t('settings')}</p>

      {(userName || userEmail) && (
        <div className="card" style={{ marginBottom: 20, padding: '12px 16px', borderColor: 'rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {userPicture && showUserPicture ? (
              <Image src={userPicture} alt="" width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} onError={() => setShowUserPicture(false)} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18 }}>👤</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || t('userLabel')}</p>
              <p style={{ fontSize: 11, color: 'var(--gray-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail || t('pinAccessLabel')}</p>
            </div>
            <span className="badge badge-green" style={{ fontSize: 10, flexShrink: 0 }}>● {t('active')}</span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Store size={18} color="var(--gold)" />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>{t('myBarberShopSection')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-gold" style={{ width: '100%' }} onClick={() => setShowConfigBarberia(true)}>
            <Edit2 size={18} /> {t('configNameLogoBtn')}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowApariencia(true)}>
            <Sun size={18} /> {t('appearance')}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowSocios(true)}>
            <UserCog size={18} /> {t('manageSociosBtn')}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowSeguridad(true)}>
            <Shield size={18} /> {t('securityAccessBtn')}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowFinanzas(true)}>
            <Percent size={18} /> {t('currencyCommissionBtn')}
          </button>
        </div>
      </div>

      <div className="divider-barber" />

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Scissors size={18} color="var(--gold)" />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>{t('administrationSection')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-gold" style={{ width: '100%' }} onClick={() => setShowBarberos(true)}>
            <Users size={18} /> {t('manageBarbersBtn')}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowServicios(true)}>
            <Package size={18} /> {t('manageServicesBtn')}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowFondo(true)}>
            <Wallet size={18} /> {t('cashFundBtn')}
          </button>
        </div>
      </div>

      <div className="divider-barber" />
      <DriveSection />
      <AjustesGenerales />

      {/* Modales */}
      {showBarberos && <ModalGestionBarberos onClose={() => setShowBarberos(false)} />}
      {showServicios && <ModalGestionServicios onClose={() => setShowServicios(false)} />}
      {showFondo && <ModalFondoCaja onClose={() => setShowFondo(false)} />}
      {showSocios && <ModalGestionSocios onClose={() => setShowSocios(false)} />}
      {showConfigBarberia && <ModalConfigBarberia onClose={() => setShowConfigBarberia(false)} onNombreChange={onNombreChange} />}
      {showSeguridad && <ModalSeguridad onClose={() => setShowSeguridad(false)} />}
      {showApariencia && <ModalAparienciaIdioma onClose={() => setShowApariencia(false)} />}
      {showFinanzas && <ModalFinanzas onClose={() => setShowFinanzas(false)} />}
    </div>
  );
}

// ─── MODAL GESTIÓN DE BARBEROS ────────────────────────────────────────────────
export function ModalGestionBarberos({ onClose }: { onClose: () => void }) {
  const { t } = useAppConfig();
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [verDocumentos, setVerDocumentos] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const barberos = useLiveQuery(() => db.barberos.orderBy('nombre').toArray(), []);

  function mostrarMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function toggleActivo(b: any) {
    if (!b.id) return;
    await db.barberos.update(b.id, { activo: !b.activo });
    mostrarMsg(t(!b.activo ? 'barberActivated' : 'barberPaused').replace('{name}', b.nombre), 'success');
  }

  async function eliminar(b: any) {
    if (!b.id) return;
    const registros = await db.registros_diarios.where('barbero_id').equals(b.id).count();
    if (registros > 0) {
      if (b.activo) {
        await db.barberos.update(b.id, { activo: false });
        mostrarMsg(t('barberHasRecordsInactive').replace('{name}', b.nombre), 'success');
      } else {
        mostrarMsg(t('barberHasRecordsCannotDelete').replace('{name}', b.nombre), 'error');
      }
      return;
    }
    if (!confirm(t('barberDeleteConfirm').replace('{name}', b.nombre))) return;
    await db.barberos.delete(b.id);
    mostrarMsg(t('barberDeleted').replace('{name}', b.nombre), 'success');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title">{t('manageBarbersBtn')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        {msg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        <button className="btn-gold" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {t('newBarber')}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {barberos?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-muted)' }}>
              <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>{t('barbers.noBarbers')}</p>
            </div>
          )}
          {barberos?.map(b => (
            <div key={b.id} className="card" style={{ padding: '12px 14px', opacity: b.activo ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{b.nombre}</p>
                    <span className={`badge ${b.activo ? 'badge-green' : 'badge-red'}`}>{b.activo ? t('active') : t('inactive')}</span>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: 11 }}><Percent size={9} /> {(b.porcentaje_comision * 100).toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => setEditando(b)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: 'rgba(212,175,55,0.4)', color: 'var(--gold)' }}><Edit2 size={12} /> {t('edit')}</button>
                    <button onClick={() => toggleActivo(b)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: b.activo ? 'rgba(224,82,82,0.4)' : 'rgba(76,175,130,0.4)', color: b.activo ? 'var(--danger)' : 'var(--success)' }}>{b.activo ? t('pause') : t('activate')}</button>
                    <button onClick={() => eliminar(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px' }}><X size={16} /></button>
                  </div>
                  {/* Botón documentos */}
                  <button
                    onClick={() => setVerDocumentos(b)}
                    className="btn-ghost"
                    style={{ minHeight: 28, padding: '3px 10px', fontSize: 11, color: 'var(--gray-muted)', borderColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <FileText size={11} /> {t('manageDocumentsBtn')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showAdd && <ModalAddBarbero onClose={() => setShowAdd(false)} />}
        {editando && <ModalEditarBarbero barbero={editando} onClose={() => setEditando(null)} />}
        {verDocumentos && <ModalDocumentosBarbero barbero={verDocumentos} onClose={() => setVerDocumentos(null)} />}
      </div>
    </div>
  );
}

function ModalAddBarbero({ onClose }: { onClose: () => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState('');
  const [comision, setComision] = useState('50');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    const existe = await db.barberos.filter(b => b.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) { alert(t('barberAlreadyExists').replace('{name}', nombre.trim())); return; }
    setLoading(true);
    await db.barberos.add({ nombre: nombre.trim(), porcentaje_comision: Number(comision) / 100, activo: true });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 900);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{t('newBarber')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>{t('barberAdded')}</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('fullName')}</label><input className="input-dark" type="text" value={nombre} maxLength={100} autoComplete="off" onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} placeholder="Ej: Juan Pérez" /></div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('serviceCommission')}: <strong style={{ color: 'var(--gold)' }}>{comision}%</strong></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button"
                  onPointerDown={e => { e.preventDefault(); setComision(v => String(Math.max(1, Number(v) - 1))); }}
                  style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                >−</button>
                <input
                  className="input-dark"
                  type="number" inputMode="decimal" min="1" max="100" step="1"
                  value={comision}
                  onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 100)) setComision(v); }}
                  style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, margin: 0 }}
                />
                <button type="button"
                  onPointerDown={e => { e.preventDefault(); setComision(v => String(Math.min(100, Number(v) + 1))); }}
                  style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                >+</button>
              </div>
            </div>
            <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{loading ? t('saving') : t('addBarber')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalEditarBarbero({ barbero, onClose }: { barbero: any; onClose: () => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState(barbero.nombre);
  const [comision, setComision] = useState(String(Math.round(barbero.porcentaje_comision * 100)));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !barbero.id) return;
    const existe = await db.barberos.filter(b => b.id !== barbero.id && b.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) { alert(t('barberAlreadyExists').replace('{name}', nombre.trim())); return; }
    setLoading(true);
    await db.barberos.update(barbero.id, { nombre: nombre.trim(), porcentaje_comision: Number(comision) / 100 });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{t('editBarberTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>{t('barberUpdated')}</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('fullName')}</label><input className="input-dark" type="text" value={nombre} maxLength={100} autoComplete="off" onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} /></div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('serviceCommission')}: <strong style={{ color: 'var(--gold)' }}>{comision}%</strong></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button"
                  onPointerDown={e => { e.preventDefault(); setComision(v => String(Math.max(1, Number(v) - 1))); }}
                  style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                >−</button>
                <input
                  className="input-dark"
                  type="number" inputMode="decimal" min="1" max="100" step="1"
                  value={comision}
                  onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 100)) setComision(v); }}
                  style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, margin: 0 }}
                />
                <button type="button"
                  onPointerDown={e => { e.preventDefault(); setComision(v => String(Math.min(100, Number(v) + 1))); }}
                  style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
                >+</button>
              </div>
            </div>
            <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{loading ? t('saving') : t('saveChanges')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL DOCUMENTOS DE BARBERO ────────────────────────────────────────────────

const TIPO_DOC_LABELS: Record<TipoDocumento, string> = {
  dni: 'docTypeDni',
  contrato: 'docTypeContrato',
  alquiler_silla: 'docTypeAlquilerSilla',
  certificado: 'docTypeCertificado',
  foto_perfil: 'docTypeFotoPerfil',
  otro: 'docTypeOtro',
};

const TIPO_DOC_ICONS: Record<TipoDocumento, string> = {
  dni: '💼',
  contrato: '📝',
  alquiler_silla: '💈',
  certificado: '🏅',
  foto_perfil: '📷',
  otro: '📄',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function ModalDocumentosBarbero({ barbero, onClose }: { barbero: any; onClose: () => void }) {
  const { t } = useAppConfig();
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const documentos = useLiveQuery(
    () => db.documentos_barbero.where('barbero_id').equals(barbero.id).reverse().sortBy('fecha_subida'),
    [barbero.id]
  );

  function mostrarMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function eliminarDoc(doc: DocumentoBarbero) {
    if (!doc.id) return;
    if (!confirm(t('docDeleteConfirm').replace('{ name }', doc.nombre))) return;
    await db.documentos_barbero.delete(doc.id);
    mostrarMsg(t('docDeleted'), 'success');
  }

  function verDoc(doc: DocumentoBarbero) {
    // Abre en ventana nueva usando data URL
    const win = window.open();
    if (!win) return;
    if (doc.mime_type.startsWith('image/')) {
      win.document.write(`<html><body style="margin:0;background:#000"><img src="${doc.data}" style="max-width:100%;height:auto" /></body></html>`);
    } else {
      win.location.href = doc.data;
    }
  }

  function descargarDoc(doc: DocumentoBarbero) {
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-sheet" style={{ display: 'flex', flexDirection: 'column', maxHeight: '92dvh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="section-title" style={{ fontSize: 16 }}>{t('barbersDocumentsTitle').replace('{name}', barbero.nombre)}</h2>
            <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 2 }}>
              {documentos?.length ?? 0} doc{documentos?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)', flexShrink: 0 }}><X size={22} /></button>
        </div>

        {msg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, flexShrink: 0, background: msg.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        <button className="btn-gold" style={{ width: '100%', marginBottom: 16, flexShrink: 0 }} onClick={() => setShowAdd(true)}>
          <FileUp size={16} /> {t('addDocument')}
        </button>

        {/* Lista de documentos */}
        <div className="modal-body">
          {(!documentos || documentos.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-muted)' }}>
              <File size={44} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontSize: 14 }}>{t('noDocuments')}</p>
              <p style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>DNI, contratos, fotos...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {documentos.map(doc => (
                <div key={doc.id} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Miniatura o icono */}
                    <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--black-surface)', border: '1px solid var(--black-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {doc.mime_type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 20 }}>{TIPO_DOC_ICONS[doc.tipo]}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-gold" style={{ fontSize: 10 }}>{TIPO_DOC_ICONS[doc.tipo]} {t(TIPO_DOC_LABELS[doc.tipo])}</span>
                        <span style={{ fontSize: 10, color: 'var(--gray-muted)' }}>{formatBytes(doc.tamano_bytes)}</span>
                        <span style={{ fontSize: 10, color: 'var(--gray-muted)' }}>{new Date(doc.fecha_subida).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                      </div>
                      {doc.descripcion && (
                        <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.descripcion}</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => verDoc(doc)} className="btn-ghost" style={{ minHeight: 28, padding: '3px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye size={10} /> {t('docView')}
                      </button>
                      <button onClick={() => descargarDoc(doc)} className="btn-ghost" style={{ minHeight: 28, padding: '3px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={10} /> {t('docDownload')}
                      </button>
                      <button onClick={() => eliminarDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdd && (
          <ModalAddDocumento
            barberoId={barbero.id}
            onClose={() => setShowAdd(false)}
            onSuccess={() => { setShowAdd(false); mostrarMsg(t('docAdded'), 'success'); }}
          />
        )}
      </div>
    </div>
  );
}

function ModalAddDocumento({
  barberoId,
  onClose,
  onSuccess,
}: {
  barberoId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useAppConfig();
  const [tipo, setTipo] = useState<TipoDocumento>('otro');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fileData, setFileData] = useState<{ data: string; mime: string; size: number; name: string } | null>(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);

  const TIPOS: TipoDocumento[] = ['dni', 'contrato', 'alquiler_silla', 'certificado', 'foto_perfil', 'otro'];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError(t('docFileTypeError'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('docFileSizeError'));
      return;
    }

    // Auto-completar nombre si está vacío
    if (!nombre) setNombre(file.name.replace(/\.[^.]+$/, ''));

    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      setFileData({ data, mime: file.type, size: file.size, name: file.name });
    };
    reader.readAsDataURL(file);
  }

  async function guardar() {
    if (!fileData || !nombre.trim()) return;
    setLoading(true);
    await db.documentos_barbero.add({
      barbero_id: barberoId,
      tipo,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      mime_type: fileData.mime,
      data: fileData.data,
      fecha_subida: new Date(),
      tamano_bytes: fileData.size,
    });
    setLoading(false);
    onSuccess();
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{t('addDocument')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tipo de documento */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 8 }}>{t('docType')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {TIPOS.map(tp => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setTipo(tp)}
                  style={{
                    padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `2px solid ${tipo === tp ? 'var(--gold)' : 'var(--black-border)'}`,
                    background: tipo === tp ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)',
                    color: tipo === tp ? 'var(--gold)' : 'var(--gray-muted)',
                    fontFamily: 'var(--font-body)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{TIPO_DOC_ICONS[tp]}</span>
                  <span style={{ fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>{t(TIPO_DOC_LABELS[tp])}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Archivo */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('docFile')}</label>
            <label
              htmlFor="doc-file-input"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderRadius: 12, cursor: 'pointer',
                border: `2px dashed ${fileData ? 'var(--gold)' : 'var(--black-border)'}`,
                background: fileData ? 'rgba(212,175,55,0.04)' : 'var(--black-surface)',
                transition: 'border-color 0.2s',
              }}
            >
              {fileData ? (
                <>
                  <CheckCircle2 size={18} color="var(--gold)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gold)' }}>{fileData.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--gray-muted)' }}>{(fileData.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <FileText size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                </>
              ) : (
                <>
                  <FileUp size={18} color="var(--gray-muted)" />
                  <p style={{ fontSize: 13, color: 'var(--gray-muted)' }}>PDF, imagen, Word... (máx. 5 MB)</p>
                </>
              )}
            </label>
            <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: 'none' }} onChange={handleFile} />
            {fileError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{fileError}</p>}
          </div>

          {/* Nombre */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('docName')}</label>
            <input
              className="input-dark"
              type="text"
              value={nombre}
              maxLength={100}
              placeholder="Ej: DNI Frente"
              onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))}
            />
          </div>

          {/* Descripción opcional */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('docDescription')}</label>
            <input
              className="input-dark"
              type="text"
              value={descripcion}
              maxLength={200}
              placeholder="Ej: Vigente hasta diciembre 2025"
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          <button
            className="btn-gold"
            disabled={!fileData || !nombre.trim() || loading}
            onClick={guardar}
          >
            <FileUp size={16} /> {loading ? t('saving') : t('addDocument')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL GESTIÓN DE SERVICIOS Y PRODUCTOS ───────────────────────────────────
export function ModalGestionServicios({ onClose }: { onClose: () => void }) {
  const { t } = useAppConfig();
  const { simbolo } = useMoneda();
  const [tab, setTab] = useState<'servicios' | 'productos'>('servicios');
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const items = useLiveQuery(() => db.servicios_productos.orderBy('nombre').toArray(), []);
  const servicios = items?.filter(i => i.tipo === 'servicio');
  const productos = items?.filter(i => i.tipo === 'producto');
  const lista = tab === 'servicios' ? servicios : productos;

  async function eliminar(item: any) {
    if (!item.id) return;
    const usos = await db.registros_diarios.where('item_id').equals(item.id).count();
    if (usos > 0) { setMsg({ text: t('itemHasRecordsCannotDelete').replace('{name}', item.nombre).replace('{usos}', String(usos)), type: 'error' }); setTimeout(() => setMsg(null), 4000); return; }
    if (!confirm(t('itemDeleteConfirm').replace('{name}', item.nombre))) return;
    await db.servicios_productos.delete(item.id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title">{t('servicesProducts')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {(['servicios', 'productos'] as const).map(opt => (
            <button key={opt} onClick={() => setTab(opt)} style={{ padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: `2px solid ${tab === opt ? 'var(--gold)' : 'var(--black-border)'}`, background: tab === opt ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)', color: tab === opt ? 'var(--gold)' : 'var(--gray-muted)', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>
              {opt === 'servicios' ? `✂️ ${t('services')}` : `📦 ${t('productos')}`}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, background: msg.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        <button className="btn-gold" style={{ width: '100%', marginBottom: 12 }} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {tab === 'servicios' ? t('addService') : t('addProduct')}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-muted)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>{tab === 'servicios' ? t('noServicesYet') : t('noProductsYet')}</p>
            </div>
          )}
          {lista?.map(item => (
            <div key={item.id} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{item.nombre}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                    <span className="badge badge-gold">{simbolo}{item.precio.toFixed(2)}</span>
                    {item.tipo === 'producto' && item.stock_actual !== undefined && (
                      <span className={`badge ${(item.stock_actual ?? 0) <= (item.stock_minimo ?? 0) ? 'badge-red' : 'badge-green'}`}>
                        Stock: {item.stock_actual}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, marginLeft: 8 }}>
                  <button onClick={() => setEditando(item)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: 'rgba(212,175,55,0.4)', color: 'var(--gold)' }}><Edit2 size={12} /> {t('edit')}</button>
                  <button onClick={() => eliminar(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px' }}><X size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showAdd && <ModalAddItem tipo={tab === 'servicios' ? 'servicio' : 'producto'} onClose={() => setShowAdd(false)} />}
        {editando && <ModalEditarItem item={editando} onClose={() => setEditando(null)} />}
      </div>
    </div>
  );
}

function ModalAddItem({ tipo, onClose }: { tipo: 'servicio' | 'producto'; onClose: () => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('0');
  const [stockMin, setStockMin] = useState('0');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !precio) return;
    setLoading(true);
    const datos: any = { nombre: nombre.trim(), tipo, precio: Number(precio) };
    if (tipo === 'producto') { datos.stock_actual = Number(stock); datos.stock_minimo = Number(stockMin); }
    await db.servicios_productos.add(datos);
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 900);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{tipo === 'servicio' ? t('addService') : t('addProduct')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>{t('added')}</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{tipo === 'servicio' ? t('serviceName') : t('productName')}</label><input className="input-dark" type="text" value={nombre} maxLength={100} autoComplete="off" onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('price')}</label><input className="input-dark" type="number" min="0" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
            {tipo === 'producto' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('currentStock')}</label><input className="input-dark" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('minStock')}</label><input className="input-dark" type="number" min="0" value={stockMin} onChange={e => setStockMin(e.target.value)} /></div>
              </div>
            )}
            <button className="btn-gold" disabled={!nombre.trim() || !precio || loading} onClick={guardar}>{loading ? t('saving') : t('add')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalEditarItem({ item, onClose }: { item: any; onClose: () => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState(item.nombre);
  const [precio, setPrecio] = useState(String(item.precio));
  const [stock, setStock] = useState(String(item.stock_actual ?? 0));
  const [stockMin, setStockMin] = useState(String(item.stock_minimo ?? 0));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !precio || !item.id) return;
    setLoading(true);
    const cambios: any = { nombre: nombre.trim(), precio: Number(precio) };
    if (item.tipo === 'producto') { cambios.stock_actual = Number(stock); cambios.stock_minimo = Number(stockMin); }
    await db.servicios_productos.update(item.id, cambios);
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{t('edit')} {item.tipo === 'servicio' ? t('servicio') : t('producto')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>{t('updated')}</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('name')}</label><input className="input-dark" type="text" value={nombre} maxLength={100} onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('price')}</label><input className="input-dark" type="number" min="0" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
            {item.tipo === 'producto' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('currentStock')}</label><input className="input-dark" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('minStock')}</label><input className="input-dark" type="number" min="0" value={stockMin} onChange={e => setStockMin(e.target.value)} /></div>
              </div>
            )}
            <button className="btn-gold" disabled={!nombre.trim() || !precio || loading} onClick={guardar}>{loading ? t('saving') : t('saveChanges')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalFondoCaja({ onClose }: { onClose: () => void }) {
  const { t, lang } = useAppConfig();
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const saldo = useLiveQuery(() => getSaldoFondoCaja(), []);
  const movimientos = useLiveQuery(() => db.fondo_caja.orderBy('fecha').reverse().limit(30).toArray(), []);

  async function guardar() {
    if (!monto || !motivo || !fecha) return;
    setLoading(true);
    const num = Number(monto);
    await db.fondo_caja.add({
      tipo,
      monto: num,
      motivo: motivo.trim(),
      fecha: new Date(fecha + 'T12:00:00')
    });
    setLoading(false);
    setSuccess(true);
    setMonto('');
    setMotivo('');
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">{t('cashFundChicaTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div className="card" style={{ padding: '14px 16px', marginBottom: 16, textAlign: 'center', borderColor: 'rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.03)', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--gray-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('currentFundBalanceLabel')}</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--gold)', marginTop: 4, fontFamily: 'var(--font-display)' }}>
            ${(saldo ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, overflow: 'visible', transform: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => setTipo('ingreso')} style={{ padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === 'ingreso' ? 'var(--success)' : 'var(--black-border)'}`, background: tipo === 'ingreso' ? 'rgba(76,175,130,0.1)' : 'transparent', color: tipo === 'ingreso' ? 'var(--success)' : 'var(--gray-muted)' }}>{t('addFundBtn')}</button>
            <button onClick={() => setTipo('egreso')} style={{ padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === 'egreso' ? 'var(--danger)' : 'var(--black-border)'}`, background: tipo === 'egreso' ? 'rgba(224,82,82,0.1)' : 'transparent', color: tipo === 'egreso' ? 'var(--danger)' : 'var(--gray-muted)' }}>{t('withdrawFundBtn')}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>{t('amountLabelSymbol')}</label>
              <input className="input-dark" type="number" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>{t('dateLabel')}</label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>{t('reasonConceptLabel')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-dark" type="text" placeholder={t('reasonPlaceholderDefault')} value={motivo} onChange={e => setMotivo(e.target.value)} style={{ flex: 1 }} />
                <button className="btn-gold" style={{ minHeight: 40 }} disabled={!monto || !motivo || !fecha || loading} onClick={guardar}>
                  {success ? t('registeredBadge') : tipo === 'ingreso' ? t('addFondoBtnText') : t('withdrawFondoBtnText')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--gray-muted)', marginBottom: 8, fontWeight: 600, flexShrink: 0 }}>{t('lastMovementsLabel')}</p>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(!movimientos || movimientos.length === 0) && <p style={{ fontSize: 12, color: 'var(--gray-muted)', textAlign: 'center', padding: '12px 0' }}>{t('noMovementsRegistered')}</p>}
            {movimientos?.map(m => (
              <div key={m.id} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{m.motivo}</p>
                  <p style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{new Date(m.fecha).toLocaleDateString(lang, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>
                  {m.tipo === 'ingreso' ? '+' : '-'}${m.monto.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalGestionSocios({ onClose }: { onClose: () => void }) {
  const { t } = useAppConfig();
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<Socio | null>(null);
  const [mensaje, setMensaje] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const todosSocios = useLiveQuery(() => db.socios.orderBy('nombre').toArray(), []);
  const socios = todosSocios?.filter(s => mostrarInactivos || s.activo);

  const totalInactivos = todosSocios?.filter(s => !s.activo).length ?? 0;

  function mostrarMensaje(text: string, type: 'success' | 'error') {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 4000);
  }

  async function toggleActivo(socio: Socio) {
    if (!socio.id) return;
    await db.socios.update(socio.id, { activo: !socio.activo });
    mostrarMensaje(t(!socio.activo ? 'partnerActivated' : 'partnerPaused').replace('{name}', socio.nombre), 'success');
  }

  async function eliminar(socio: Socio) {
    if (!socio.id) return;
    const [adelantos, barberoMismoId] = await Promise.all([
      db.Adelantos.where('barbero_id').equals(socio.id).toArray(),
      db.barberos.get(socio.id),
    ]);
    const nombreSocio = socio.nombre.toLowerCase();
    const tienePagos = adelantos.some((a: Adelanto) =>
      a.destinatario_tipo === 'socio' ||
      a.socio_id === socio.id ||
      (!barberoMismoId && a.barbero_id === socio.id) ||
      a.motivo.toLowerCase().includes(nombreSocio)
    );

    if (tienePagos) {
      if (socio.activo) {
        await db.socios.update(socio.id, { activo: false });
        mostrarMensaje(t('partnerHasPaymentsInactive').replace('{name}', socio.nombre), 'success');
      } else {
        mostrarMensaje(t('partnerHasPaymentsCannotDelete').replace('{name}', socio.nombre), 'error');
      }
      return;
    }
    if (!confirm(t('partnerDeleteConfirm').replace('{name}', socio.nombre))) return;
    await db.socios.delete(socio.id);
    mostrarMensaje(t('partnerDeleted').replace('{name}', socio.nombre), 'success');
  }

  const totalPorcentaje = todosSocios?.filter(s => s.activo).reduce((sum, s) => sum + s.porcentaje_utilidad, 0) ?? 0;
  const excede = totalPorcentaje > 1.001;
  const exacto = Math.abs(totalPorcentaje - 1) < 0.001;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">{t('manageSociosTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div className="card" style={{
          marginBottom: 16, padding: '12px 14px',
          borderColor: excede ? 'rgba(224,82,82,0.4)' : exacto ? 'rgba(76,175,130,0.4)' : 'rgba(212,175,55,0.3)',
          background: excede ? 'rgba(224,82,82,0.06)' : exacto ? 'rgba(76,175,130,0.06)' : 'rgba(212,175,55,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--gray-muted)', fontWeight: 600 }}>{t('activeDistributionLabel')}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: excede ? 'var(--danger)' : exacto ? 'var(--success)' : 'var(--gold)', fontFamily: 'var(--font-display)' }}>
              {(totalPorcentaje * 100).toFixed(0)}%
            </p>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--black-border)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.3s ease', width: `${Math.min(totalPorcentaje * 100, 100)}%`, background: excede ? 'var(--danger)' : exacto ? 'var(--success)' : 'linear-gradient(90deg, var(--gold-light), var(--gold))' }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: excede ? 'var(--danger)' : exacto ? 'var(--success)' : 'var(--warning)' }}>
            {exacto ? t('distributionPerfect') : excede ? t('distributionExceeds').replace('{pct}', ((totalPorcentaje - 1) * 100).toFixed(0)) : t('distributionMissing').replace('{pct}', ((1 - totalPorcentaje) * 100).toFixed(0))}
          </p>
        </div>

        {mensaje && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, background: mensaje.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${mensaje.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {mensaje.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span style={{ flex: 1 }}>{mensaje.text}</span>
          </div>
        )}

        <button className="btn-gold" style={{ width: '100%', marginBottom: 10, flexShrink: 0 }} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {t('addNewPartnerBtn')}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {socios?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-muted)' }}>
              <UserCog size={36} style={{ margin: '0 auto 8px', opacity: 0.25 }} />
              <p style={{ fontSize: 13 }}>{t('noPartnersRegistered')}</p>
            </div>
          )}
          {socios?.map(s => (
            <div key={s.id} className="card" style={{ padding: '12px 14px', opacity: s.activo ? 1 : 0.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{s.nombre}</p>
                    {!s.activo && <span className="badge badge-red">{t('inactive')}</span>}
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: 11 }}><Percent size={9} /> {(s.porcentaje_utilidad * 100).toFixed(0)}% {t('ofEarningsLabel')}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-ghost" style={{ minHeight: 30, padding: '0 8px', fontSize: 11, color: 'var(--gold)' }} onClick={() => setEditando(s)}>{t('edit')}</button>
                  <button className="btn-ghost" style={{ minHeight: 30, padding: '0 8px', fontSize: 11, color: s.activo ? 'var(--danger)' : 'var(--success)' }} onClick={() => toggleActivo(s)}>{s.activo ? t('pause') : t('activate')}</button>
                  <button style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '0 4px', cursor: 'pointer' }} onClick={() => eliminar(s)}><X size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalInactivos > 0 && (
          <div style={{ marginTop: 12, textAlign: 'center', flexShrink: 0 }}>
            <button className="btn-ghost" style={{ border: 'none', fontSize: 11, minHeight: 24, padding: '4px 12px' }} onClick={() => setMostrarInactivos(!mostrarInactivos)}>
              {mostrarInactivos ? t('hideInactivePartners') : t('showInactivePartners').replace('{count}', String(totalInactivos))}
            </button>
          </div>
        )}

        {showAdd && <ModalAddSocio onClose={() => setShowAdd(false)} mostrarMensaje={mostrarMensaje} />}
        {editando && <ModalEditarSocio socio={editando} onClose={() => setEditando(null)} mostrarMensaje={mostrarMensaje} />}
      </div>
    </div>
  );
}

function ModalAddSocio({ onClose, mostrarMensaje }: { onClose: () => void; mostrarMensaje: (t: string, ty: 'success' | 'error') => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState('');
  const [porcentaje, setPorcentaje] = useState('25');
  const [loading, setLoading] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setLoading(true);
    const existe = await db.socios.filter(s => s.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) {
      alert(t('partnerAlreadyExists').replace('{name}', nombre.trim()));
      setLoading(false);
      return;
    }
    await db.socios.add({
      nombre: nombre.trim(),
      porcentaje_utilidad: Number(porcentaje) / 100,
      activo: true,
      rol: 'socio'
    } as any);
    mostrarMensaje(t('partnerAddedSuccess'), 'success');
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 className="section-title">{t('newPartnerTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('fullNameLabel')}</label>
            <input className="input-dark" type="text" placeholder="Ej: Carlos Silva" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('profitPercentageLabel')}: <strong style={{ color: 'var(--gold)' }}>{porcentaje}%</strong></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button"
                onPointerDown={e => { e.preventDefault(); setPorcentaje(v => String(Math.max(1, Number(v) - 1))); }}
                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
              >−</button>
              <input
                className="input-dark"
                type="number" inputMode="decimal" min="1" max="100" step="1"
                value={porcentaje}
                onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 100)) setPorcentaje(v); }}
                style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, margin: 0 }}
              />
              <button type="button"
                onPointerDown={e => { e.preventDefault(); setPorcentaje(v => String(Math.min(100, Number(v) + 1))); }}
                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
              >+</button>
            </div>
          </div>
          <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{t('addPartnerBtnText')}</button>
        </div>
      </div>
    </div>
  );
}

function ModalEditarSocio({ socio, onClose, mostrarMensaje }: { socio: Socio; onClose: () => void; mostrarMensaje: (t: string, ty: 'success' | 'error') => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState(socio.nombre);
  const [porcentaje, setPorcentaje] = useState(() => String(Math.round(socio.porcentaje_utilidad * 100)));
  const [loading, setLoading] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !socio.id) return;
    setLoading(true);
    const existe = await db.socios.filter(s => s.id !== socio.id && s.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) {
      alert(t('partnerAnotherAlreadyExists').replace('{name}', nombre.trim()));
      setLoading(false);
      return;
    }
    await db.socios.update(socio.id, {
      nombre: nombre.trim(),
      porcentaje_utilidad: Number(porcentaje) / 100
    });
    mostrarMensaje(t('partnerUpdatedSuccess'), 'success');
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 className="section-title">{t('editPartnerTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('fullNameLabel')}</label>
            <input className="input-dark" type="text" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('profitPercentageLabel')}: <strong style={{ color: 'var(--gold)' }}>{porcentaje}%</strong></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button"
                onPointerDown={e => { e.preventDefault(); setPorcentaje(v => String(Math.max(1, Number(v) - 1))); }}
                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
              >−</button>
              <input
                className="input-dark"
                type="number" inputMode="decimal" min="1" max="100" step="1"
                value={porcentaje}
                onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 1 && Number(v) <= 100)) setPorcentaje(v); }}
                style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, margin: 0 }}
              />
              <button type="button"
                onPointerDown={e => { e.preventDefault(); setPorcentaje(v => String(Math.min(100, Number(v) + 1))); }}
                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
              >+</button>
            </div>
          </div>
          <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{t('saveChangesBtn')}</button>
        </div>
      </div>
    </div>
  );
}

function ModalConfigBarberia({ onClose, onNombreChange }: { onClose: () => void; onNombreChange?: (n: string) => void }) {
  const { t } = useAppConfig();
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>('/Logo.jpg');
  const [logoMsg, setLogoMsg] = useState('');

  useEffect(() => {
    getConfig('nombre_barberia').then(v => { if (v) setNombre(v); });
    getConfig('logo_data').then(v => { if (v) setLogoSrc(v); });
  }, []);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoMsg(t('logoImageOnlyError'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg(t('logoSizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        setLogoMsg(t('logoFormatError'));
        return;
      }

      const commaIndex = dataUrl.indexOf(',');
      const base64Length = dataUrl.length - commaIndex - 1;
      const approxSize = Math.ceil(base64Length * 3 / 4);
      if (approxSize > 2 * 1024 * 1024) {
        setLogoMsg(t('logoSaveError'));
        return;
      }

      setLogoSrc(dataUrl);
      await setConfig('logo_data', dataUrl);
      setLogoMsg(t('savedBadge') + ' ' + t('logoUpdatedMsg'));
      setTimeout(() => setLogoMsg(''), 3000);
      window.dispatchEvent(new CustomEvent('logo-updated', { detail: { src: dataUrl } }));
    };
    reader.readAsDataURL(file);
  }

  async function guardar() {
    if (!nombre.trim()) return;
    setSaving(true);
    await setConfig('nombre_barberia', nombre.trim());
    onNombreChange?.(nombre.trim());
    setSaving(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1200);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{t('configureBarbershopTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, gap: 10 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(212,175,55,0.3)', cursor: 'pointer', position: 'relative' }}
            onClick={() => document.getElementById('logo-file-input')?.click()}>
            <Image src={logoSrc} alt="Logo" fill style={{ objectFit: 'cover' }} onError={() => setLogoSrc('/Logo.jpg')} />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)', opacity: 0, transition: 'opacity 0.2s',
              borderRadius: '50%',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>✏️<br />{t('changeLabel')}</span>
            </div>
          </div>
          <input id="logo-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
          <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 16px', minHeight: 32 }} onClick={() => document.getElementById('logo-file-input')?.click()}>{t('selectLogoDevice')}</button>
          {logoMsg && (
            <p style={{ fontSize: 12, color: logoMsg.startsWith('✓') || logoMsg.startsWith('Saved') || logoMsg.includes('correctamente') ? 'var(--success)' : 'var(--danger)', textAlign: 'center' }}>{logoMsg}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{t('barbershopNameLabel')}</label>
            <input className="input-dark" type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Royal Cuts Barber Shop" />
          </div>
          <button className="btn-gold" disabled={!nombre.trim() || saving} onClick={guardar}>
            {success ? t('savedBadge') : saving ? t('saving') : t('saveChangesBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSeguridad({ onClose }: { onClose: () => void }) {
  const { t } = useAppConfig();
  const [tab, setTab] = useState<'emails' | 'pin' | 'drive'>('emails');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title">{t('securityAccessTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 20 }}>
          {([['emails', t('emailsTab')], ['pin', t('pinTab')], ['drive', t('driveTab')]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '9px 4px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${tab === id ? 'var(--gold)' : 'var(--black-border)'}`,
              background: tab === id ? 'rgba(212,175,55,0.1)' : 'transparent',
              color: tab === id ? 'var(--gold)' : 'var(--gray-muted)',
              fontFamily: 'var(--font-body)',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'emails' && <TabEmails />}
        {tab === 'pin' && <TabPin />}
        {tab === 'drive' && <TabDrive />}
      </div>
    </div>
  );
}

function TabEmails() {
  const { t } = useAppConfig();
  const [emails, setEmails] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      if (cancelled.current) return;
      getConfig('emails_autorizados').then(v => { 
        if (!cancelled.current && v) {
          requestAnimationFrame(() => {
            if (!cancelled.current) setEmails(v);
          });
        }
      });
    }, 0);
    return () => { cancelled.current = true; clearTimeout(t); };
  }, []);

  const lista = emails.split(',').flatMap(e => { const v = e.trim(); return v ? [v] : []; });

  async function agregar() {
    const email = nuevo.trim().toLowerCase();
    if (!email || !email.includes('@')) { setMsg(t('enterValidEmailError')); return; }
    if (lista.includes(email)) { setMsg(t('emailAlreadyInListError')); return; }
    const nueva = [...lista, email].join(', ');
    setSaving(true);
    await setConfig('emails_autorizados', nueva);
    setEmails(nueva);
    setNuevo('');
    setSaving(false);
    setMsg(t('emailAddedSuccess'));
    setTimeout(() => setMsg(''), 3000);
  }

  async function eliminar(email: string) {
    const nueva = lista.filter(e => e !== email).join(', ');
    await setConfig('emails_autorizados', nueva);
    setEmails(nueva);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.6 }}>
        <p>🔐 <strong style={{ color: 'var(--gold)' }}>{t('whiteListEmailsLabel')}</strong></p>
        <p style={{ marginTop: 4 }}>{t('whiteListEmailsDesc')}</p>
        {lista.length === 0 && (
          <p style={{ marginTop: 6, color: 'var(--danger)', fontWeight: 600 }}>{t('whiteListEmptyBlocked')}</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input-dark" type="email" placeholder="email@gmail.com" value={nuevo} onChange={e => { setNuevo(e.target.value); setMsg(''); }} onKeyDown={e => { if (e.key === 'Enter') agregar(); }} style={{ flex: 1 }} />
        <button className="btn-gold" style={{ padding: '0 16px', minHeight: 44, minWidth: 80 }} disabled={saving} onClick={agregar}><Plus size={16} /> {t('add')}</button>
      </div>

      {msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') || msg.startsWith('Email') || msg.startsWith('Added') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-muted)', fontSize: 13 }}>
            <Mail size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>{t('whiteListEmptyAllowAll')}</p>
          </div>
        ) : lista.map(email => (
          <div key={email} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={14} color="var(--gold)" />
              <span style={{ fontSize: 13 }}>{email}</span>
            </div>
            <button onClick={() => eliminar(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}><X size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPin() {
  const { t } = useAppConfig();
  const [hasPin, setHasPin] = useState(() => isPinConfigured());
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function cambiarPin() {
    if (hasPin) {
      try {
        const correcto = await verifyPin(pinActual);
        if (!correcto) { setError(t('pinIncorrectError')); return; }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('pinBlockedError'));
        return;
      }
    }

    if (pinNuevo.length < 4) { setError(t('pinMinDigitsError')); return; }
    if (pinNuevo !== pinConfirm) { setError(t('pinsDoNotMatchError')); return; }

    await savePin(pinNuevo);
    setSuccess(true);
    setHasPin(true);
    setPinActual(''); setPinNuevo(''); setPinConfirm(''); setError('');
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.6 }}>
        {t('pinHelpText')}
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(76,175,130,0.12)', border: '1px solid rgba(76,175,130,0.3)', color: 'var(--success)', fontSize: 13 }}>
          <CheckCircle2 size={16} /> {t('pinUpdatedSuccess')}
        </div>
      )}

      {[
        hasPin ? { label: t('pinActualLabel'), val: pinActual, setter: setPinActual } : null,
        { label: t('pinNuevoLabel'), val: pinNuevo, setter: setPinNuevo },
        { label: t('pinConfirmLabel'), val: pinConfirm, setter: setPinConfirm }
      ].map((item) => {
        if (!item) return null;
        const { label, val, setter } = item;
        return (
          <div key={label}>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
            <input className="input-dark" type="password" inputMode="numeric" maxLength={8} value={val} onChange={e => { setter(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="••••" style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }} />
          </div>
        );
      })}

      {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}
      <button className="btn-gold" onClick={cambiarPin} disabled={(hasPin && !pinActual) || !pinNuevo || !pinConfirm}><KeyRound size={16} /> {hasPin ? t('changePinBtnText') : t('configurePinBtnText')}</button>
    </div>
  );
}

function TabDrive() {
  const { t } = useAppConfig();
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleConfigurado = !!(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PON_TU_CLIENT_ID'));

  if (!googleConfigurado) {
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', fontSize: 13, color: 'var(--danger)', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>{t('googleNotConfiguredTitle')}</p>
          <p>{t('googleNotConfiguredDesc1')} <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> {t('googleNotConfiguredDesc2')} <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>.env.local</code>.</p>
        </div>
      </div>
    );
  }
  return <TabDriveEnabled />;
}

function TabDriveEnabled() {
  const { t } = useAppConfig();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [lastBackup, setLastBackup] = useState<{ date: string; size: number } | null>(null);

  const cargarInfoBackup = useCallback(async () => {
    const info = await getLastBackupInfo();
    setLastBackup(info);
  }, []);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      try {
        const connected = isDriveConnected();
        requestAnimationFrame(() => { if (!cancelled.current) setLoggedIn(connected); });
      } catch (err) { console.warn(err); }
    }, 0);
    return () => { cancelled.current = true; clearTimeout(t); };
  }, []);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      requestAnimationFrame(() => { 
        void (async () => { try { if (!cancelled.current) await cargarInfoBackup(); } catch (err) { console.warn(err); } })(); 
      });
    }, 0);
    return () => { cancelled.current = true; clearTimeout(t); };
  }, [cargarInfoBackup]);

  const login = useGoogleLogin({
    scope: DRIVE_SCOPE,
    onSuccess: res => { setAccessToken(res.access_token); setLoggedIn(true); mostrarMsg(t('savedBadge') + ' ' + t('googleDriveConnectedTitle'), 'success'); cargarInfoBackup(); },
    onError: () => mostrarMsg(t('googleConnectError'), 'error'),
  });

  function mostrarMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function exportar() {
    setLoading('exportar');
    const res = await exportarAGoogleDrive();
    mostrarMsg(res.success ? t('backupSuccess') : res.message, res.success ? 'success' : 'error');
    setLoading('');
    if (res.success) cargarInfoBackup();
  }

  async function restaurar() {
    if (!confirm(t('restoreConfirm'))) return;
    setLoading('restaurar');
    const res = await restaurarDesdeGoogleDrive();
    mostrarMsg(res.success ? t('restoreSuccess') : res.message, res.success ? 'success' : 'error');
    setLoading('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 13, background: msg.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {!loggedIn ? (
        <>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.6 }}>{t('driveHelpText')}</div>
          <button className="btn-gold" style={{ width: '100%' }} onClick={() => login()}><LogIn size={18} /> {t('connectGoogleDriveBtn')}</button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(76,175,130,0.08)', border: '1px solid rgba(76,175,130,0.2)' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>{t('googleDriveConnectedTitle')}</p>
              {lastBackup && <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 2 }}>{t('lastBackupLabel').replace('{date}', lastBackup.date).replace('{size}', String(lastBackup.size))}</p>}
            </div>
          </div>
          <button className="btn-gold" style={{ width: '100%' }} disabled={loading === 'exportar'} onClick={exportar}><Cloud size={18} /> {loading === 'exportar' ? t('saving') : t('backupNowBtnText')}</button>
          <button className="btn-ghost" style={{ width: '100%' }} disabled={loading === 'restaurar'} onClick={restaurar}><CloudDownload size={18} /> {loading === 'restaurar' ? t('saving') : t('restoreFromDriveBtnText')}</button>
          <button className="btn-danger" style={{ width: '100%' }} onClick={() => { clearAccessToken(); setLoggedIn(false); }}><LogOut size={16} /> {t('disconnectDriveBtnText')}</button>
        </>
      )}
    </div>
  );
}

function ModalAparienciaIdioma({ onClose }: { onClose: () => void }) {
  const { t, theme, lang, setTheme, setLang } = useAppConfig();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title">{t('appearance')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <p style={{ marginBottom: 10, fontSize: 13, color: 'var(--gray-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('theme')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['dark', 'light'] as const).map(opt => (
                <button key={opt} onClick={() => setTheme(opt)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 14, cursor: 'pointer', border: `2px solid ${theme === opt ? 'var(--gold)' : 'var(--black-border)'}`, background: theme === opt ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)', color: theme === opt ? 'var(--gold)' : 'var(--gray-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, transition: 'all 0.2s' }}>
                  {opt === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  {opt === 'dark' ? t('darkMode') : t('lightMode')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ marginBottom: 10, fontSize: 13, color: 'var(--gray-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} /> {t('language')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 10 }}>
              {IDIOMAS.map(({ code, label, flag }) => (
                <button key={code} onClick={() => setLang(code)} style={{ padding: '12px 10px', borderRadius: 14, cursor: 'pointer', border: `2px solid ${lang === code ? 'var(--gold)' : 'var(--black-border)'}`, background: lang === code ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)', color: lang === code ? 'var(--gold)' : 'var(--gray-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 20 }}>{flag}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalFinanzas({ onClose }: { onClose: () => void }) {
  const { t } = useAppConfig();
  const [moneda, setMoneda] = useState('USD');
  const [comisionBancaria, setComisionBancaria] = useState('0');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getConfig('moneda_codigo').then(v => { if (v) setMoneda(v); });
    getConfig('porcentaje_comision_bancaria').then(v => { if (v) setComisionBancaria(String(parseFloat(v) || 0)); });
  }, []);

  async function guardar() {
    setSaving(true);
    await setConfig('moneda_codigo', moneda);
    await setConfig('porcentaje_comision_bancaria', String(Number(comisionBancaria)));
    emitirCambioMoneda(moneda);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1200);
  }

  const spinnerStyle = {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    border: '1px solid var(--black-border)', background: 'rgba(255,255,255,0.04)',
    color: 'var(--white-soft)', fontSize: 20, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation',
  } as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">{t('financesCommissionsTitle')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Sección: Moneda ── */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>💱 {t('mainCurrencyLabel')}</p>
            <select className="input-dark" value={moneda} onChange={e => setMoneda(e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
              <option value="USD">{t('currencyUSD')} ($)</option>
              <option value="ARS">{t('currencyARS')} ($)</option>
              <option value="EUR">{t('currencyEUR')} (€)</option>
              <option value="BRL">{t('currencyBRL')} (R$)</option>
              <option value="COP">{t('currencyCOP')} ($)</option>
              <option value="MXN">{t('currencyMXN')} ($)</option>
              <option value="CLP">{t('currencyCLP')} ($)</option>
              <option value="UYU">{t('currencyUYU')} ($)</option>
              <option value="PEN">{t('currencyPEN')} (S/.)</option>
            </select>
          </div>

          {/* ── Sección: Comisión Bancaria ── */}
          <div style={{ borderTop: '1px solid var(--black-border)', paddingTop: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>💸 {t('bankCommissionCardLabel')}</p>
            <p style={{ fontSize: 11, color: 'var(--gray-muted)', lineHeight: 1.5, marginBottom: 10 }}>{t('bankCommissionCardDesc')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button"
                onPointerDown={e => { e.preventDefault(); setComisionBancaria(v => { const n = Math.max(0, parseFloat((Number(v) - 0.1).toFixed(2))); return String(n); }); }}
                style={spinnerStyle}
              >&#x2212;</button>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  className="input-dark"
                  type="number" inputMode="decimal" min="0" max="100" step="0.1"
                  value={comisionBancaria}
                  onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setComisionBancaria(v); }}
                  style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 18, margin: 0 }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--gold)', fontWeight: 700, pointerEvents: 'none' }}>%</span>
              </div>
              <button type="button"
                onPointerDown={e => { e.preventDefault(); setComisionBancaria(v => { const n = Math.min(100, parseFloat((Number(v) + 0.1).toFixed(2))); return String(n); }); }}
                style={spinnerStyle}
              >+</button>
            </div>
            {Number(comisionBancaria) > 0 && (
              <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 8, textAlign: 'center' }}>
                💡 Por cada $100 en banco → se descuenta ${Number(comisionBancaria).toFixed(2)} de comisión
              </p>
            )}
          </div>

          <button className="btn-gold" disabled={saving} onClick={guardar}>
            {success ? t('savedCorrectly') : saving ? t('saving') : t('updateConfigBtnText')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriveSection() {
  const { t } = useAppConfig();
  return (
    <div className="card" style={{ padding: '16px', marginBottom: 24, borderColor: 'rgba(212,175,55,0.15)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
        <Database size={20} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white-soft)', marginBottom: 4 }}>{t('googleDriveBackupLabel')}</p>
          <p style={{ fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.5 }}>
            {t('googleDriveBackupDesc')}
          </p>
        </div>
      </div>
      <TabDrive />
    </div>
  );
}

function AjustesGenerales() {
  const { t } = useAppConfig();
  const [loading, setLoading] = useState(false);

  async function handleExportJSON() {
    setLoading(true);
    try {
      const dataStr = await exportarTodosLosDatos();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_barberia_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(t('exportLocalError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button className="btn-ghost" style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--gray-muted)', marginBottom: 8 }} onClick={handleExportJSON} disabled={loading}>
        <Download size={16} /> {loading ? t('exporting') : t('exportManualBackupBtnText')}
      </button>
      
      <button className="btn-ghost" style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--gray-muted)', marginBottom: 8 }} onClick={async () => {
        if (!confirm(t('clearCacheConfirm'))) return;
        try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); alert(t('cacheClearedSuccess')); window.location.reload(); } catch (_err) { alert(t('cacheClearError')); }
      }}>
        <RefreshCw size={16} /> {t('clearCacheBtnText')}
      </button>

      <button className="btn-danger" style={{ width: '100%' }} onClick={() => {
        if (!confirm(t('logoutDeviceConfirm'))) return;
        logoutAll();
        window.location.reload();
      }}>
        <LogOut size={16} /> {t('logoutDeviceBtnText')}
      </button>

      <p style={{ fontSize: 11, color: 'var(--gray-muted)', textAlign: 'center', marginTop: 10, lineHeight: 1.4 }}>
        {t('systemVersionLabel').replace('{version}', '2.4.0')}
      </p>
    </div>
  );
}