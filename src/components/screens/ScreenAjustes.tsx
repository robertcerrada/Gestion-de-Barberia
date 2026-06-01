'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useGoogleLogin } from '@react-oauth/google';
import { exportarAGoogleDrive, restaurarDesdeGoogleDrive, setAccessToken, clearAccessToken, DRIVE_SCOPE, getLastBackupInfo, isDriveConnected } from '@/lib/drive';
import { exportarTodosLosDatos, getSaldoDisponibleBarbero, getSaldoFondoCaja } from '@/lib/business';
import { getGoogleUser, verifyPin, savePin, logoutAll, isPinConfigured } from '@/lib/auth';
import { Cloud, CloudDownload, LogIn, LogOut, Shield, Download, CheckCircle2, AlertCircle, Scissors, Database, Users, Plus, Wallet, Package, X, Store, UserCog, Percent, Edit2, FolderOpen, KeyRound, Mail, RefreshCw, Sun, Moon, Globe } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getConfig, setConfig, type Socio, type Adelanto } from '@/lib/db';
import { ModalDocumentosBarbero } from '@/components/ui/ModalDocumentosBarbero';
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
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Falta Configurar Google</p>
              <p style={{ fontSize: 13, color: 'var(--gray-muted)', lineHeight: 1.5 }}>
                Asegúrate de poner tu verdadero <code style={{ background: 'var(--black-surface)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en <code style={{ background: 'var(--black-surface)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>.env.local</code>.
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

// Lista de idiomas disponibles con banderas y etiquetas
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

  // Info del usuario logueado
  const googleUser = typeof window !== 'undefined' ? getGoogleUser() : null;
  const userName = googleUser?.name ?? null;
  const userEmail = googleUser?.email ?? null;
  // SEGURIDAD: solo mostrar avatares de lh3.googleusercontent.com
  const rawPicture = googleUser?.picture ?? null;
  const userPicture = rawPicture?.startsWith('https://lh3.googleusercontent.com/') ? rawPicture : null;
  const [showUserPicture, setShowUserPicture] = useState(true);

  return (
    <div style={{ padding: 16, direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <p className="section-title" style={{ marginBottom: 20 }}>{t('settings')}</p>

      {/* Usuario activo */}
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
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--white-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || 'Usuario'}</p>
              <p style={{ fontSize: 11, color: 'var(--gray-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail || 'Acceso por PIN'}</p>
            </div>
            <span className="badge badge-green" style={{ fontSize: 10, flexShrink: 0 }}>● Activo</span>
          </div>
        </div>
      )}

      {/* Configuración de la Barbería */}
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

      {/* Administración */}
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
      {showBarberos && (
        <div className="modal-overlay" onClick={() => setShowBarberos(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ padding: 16 }}>
              <p className="section-title" style={{ marginBottom: 10 }}>Gestión de Barberos</p>
              <p style={{ fontSize: 13, color: 'var(--gray-muted)', lineHeight: 1.5 }}>
                Modal “Gestionar barberos” no disponible en esta versión (componentes faltantes / sin exportar).
              </p>
              <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => setShowBarberos(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showServicios && (
        <div className="modal-overlay" onClick={() => setShowServicios(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ padding: 16 }}>
              <p className="section-title" style={{ marginBottom: 10 }}>Gestión de Servicios</p>
              <p style={{ fontSize: 13, color: 'var(--gray-muted)', lineHeight: 1.5 }}>
                Modal de servicios no disponible en esta versión (componentes faltan/exportados no existen).
              </p>
              <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => setShowServicios(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showFondo && <ModalFondoCaja onClose={() => setShowFondo(false)} />}
      {showSocios && <ModalGestionSocios onClose={() => setShowSocios(false)} />}
      {showConfigBarberia && <ModalConfigBarberia onClose={() => setShowConfigBarberia(false)} onNombreChange={onNombreChange} />}
      {showSeguridad && <ModalSeguridad onClose={() => setShowSeguridad(false)} />}
      {showApariencia && <ModalAparienciaIdioma onClose={() => setShowApariencia(false)} />}
      {showFinanzas && <ModalFinanzas onClose={() => setShowFinanzas(false)} />}
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
                <button
                  key={opt}
                  onClick={() => setTheme(opt)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px', borderRadius: 14, cursor: 'pointer',
                    border: `2px solid ${theme === opt ? 'var(--gold)' : 'var(--black-border)'}`,
                    background: theme === opt ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)',
                    color: theme === opt ? 'var(--gold)' : 'var(--gray-muted)',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                >
                  {opt === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                  {opt === 'dark' ? t('darkMode') : t('lightMode')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ marginBottom: 10, fontSize: 13, color: 'var(--gray-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} /> {t('language')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))', gap: 10 }}>
              {IDIOMAS.map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  style={{
                    padding: '12px 10px', borderRadius: 14, cursor: 'pointer',
                    border: `2px solid ${lang === code ? 'var(--gold)' : 'var(--black-border)'}`,
                    background: lang === code ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)',
                    color: lang === code ? 'var(--gold)' : 'var(--gray-muted)',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                    transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{flag}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {lang === 'ar' && (
              <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 10, textAlign: 'right' }}>
                ✓ تم تفعيل اللغة العربية — الواجهة ستتحول إلى الاتجاه من اليمين لليسار
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Seguridad y Acceso ─────────────────────────────────────────────────
function ModalSeguridad({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'emails' | 'pin' | 'drive'>('emails');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="section-title">Seguridad y Acceso</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 20 }}>
          {([['emails', '📧 Emails'], ['pin', '🔢 PIN'], ['drive', '☁️ Drive']] as const).map(([id, label]) => (
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
    return () => { 
      cancelled.current = true; 
      clearTimeout(t); 
    };
  }, []);

  const lista = emails.split(',').map(e => e.trim()).filter(Boolean);

  async function agregar() {
    const email = nuevo.trim().toLowerCase();
    if (!email || !email.includes('@')) { setMsg('Ingresá un email válido.'); return; }
    if (lista.includes(email)) { setMsg('Ese email ya está en la lista.'); return; }
    const nueva = [...lista, email].join(', ');
    setSaving(true);
    await setConfig('emails_autorizados', nueva);
    setEmails(nueva);
    setNuevo('');
    setSaving(false);
    setMsg('✓ Email agregado.');
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
        <p>🔐 <strong style={{ color: 'var(--gold)' }}>Lista blanca de emails</strong></p>
        <p style={{ marginTop: 4 }}>Solo las cuentas de Google que estén aquí podrán iniciar sesión.</p>
        {lista.length === 0 && (
          <p style={{ marginTop: 6, color: 'var(--danger)', fontWeight: 600 }}>
            ⚠️ Lista vacía — el acceso con Google está BLOQUEADO. Agregá al menos un email.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input-dark" type="email" placeholder="email@gmail.com"
          value={nuevo} onChange={e => { setNuevo(e.target.value); setMsg(''); }}
          onKeyDown={e => { if (e.key === 'Enter') agregar(); }}
          style={{ flex: 1 }} />
        <button className="btn-gold" style={{ padding: '0 16px', minHeight: 44, minWidth: 80 }}
          disabled={saving} onClick={agregar}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-muted)', fontSize: 13 }}>
            <Mail size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Lista vacía — cualquier Google puede entrar</p>
          </div>
        ) : lista.map(email => (
          <div key={email} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={14} color="var(--gold)" />
              <span style={{ fontSize: 13 }}>{email}</span>
            </div>
            <button onClick={() => eliminar(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPin() {
  const [hasPin, setHasPin] = useState(() => isPinConfigured());
  const [pinActual, setPinActual] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Removed redundant effect – hasPin is initialized via useState

  async function cambiarPin() {
    if (hasPin) {
      try {
        const correcto = await verifyPin(pinActual);
        if (!correcto) {
          setError('El PIN actual es incorrecto.');
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'PIN bloqueado temporalmente.');
        return;
      }
    }

    if (pinNuevo.length < 4) {
      setError('El nuevo PIN debe tener al menos 4 dígitos.');
      return;
    }
    if (pinNuevo !== pinConfirm) {
      setError('Los PINs nuevos no coinciden.');
      return;
    }

    await savePin(pinNuevo);
    setSuccess(true);
    setHasPin(true);
    setPinActual(''); setPinNuevo(''); setPinConfirm(''); setError('');
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.6 }}>
        🔢 El PIN es el método de acceso alternativo cuando no hay conexión a internet. Mínimo 4 dígitos.
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(76,175,130,0.12)', border: '1px solid rgba(76,175,130,0.3)', color: 'var(--success)', fontSize: 13 }}>
          <CheckCircle2 size={16} /> PIN actualizado correctamente
        </div>
      )}

      {[
        hasPin ? { label: 'PIN Actual', val: pinActual, setter: setPinActual } : null,
        { label: 'PIN Nuevo', val: pinNuevo, setter: setPinNuevo },
        { label: 'Confirmar PIN', val: pinConfirm, setter: setPinConfirm }
      ].map((item) => {
        if (!item) return null;
        const { label, val, setter } = item;
        return (
          <div key={label}>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
            <input className="input-dark" type="password" inputMode="numeric" maxLength={8}
              value={val} onChange={e => { setter(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="••••"
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }} />
          </div>
        );
      })}

      {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}

      <button className="btn-gold" onClick={cambiarPin}
        disabled={(hasPin && !pinActual) || !pinNuevo || !pinConfirm}>
        <KeyRound size={16} /> {hasPin ? 'Cambiar PIN' : 'Configurar PIN'}
      </button>
    </div>
  );
}

function TabDrive() {
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleConfigurado = !!(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PON_TU_CLIENT_ID'));

  if (!googleConfigurado) {
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', fontSize: 13, color: 'var(--danger)', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>⚠ Google no está configurado</p>
          <p>Para activar Google Drive y el login con Google, necesitás configurar tu <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en el archivo <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>.env.local</code>.</p>
          <p style={{ marginTop: 8, color: 'var(--gray-muted)' }}>Ve a <strong style={{ color: 'var(--gold)' }}>console.cloud.google.com</strong>, crea un proyecto, habilita la API de Google Drive y obtén tu Client ID.</p>
        </div>
      </div>
    );
  }

  return <TabDriveEnabled />;
}

function TabDriveEnabled() {
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
        // compute value then update in next frame using functional updater to avoid sync setState
        const connected = isDriveConnected();
        requestAnimationFrame(() => { 
          if (!cancelled.current) setLoggedIn(prev => (prev === connected ? prev : connected)); 
        });
      } catch (err) {
        console.warn('[TabDrive] isDriveConnected failed:', err);
      }
    }, 0);
    return () => { 
      cancelled.current = true; 
      clearTimeout(t); 
    };
  }, []);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      // Defer the async work to the next animation frame to avoid synchronous setState in effect
      requestAnimationFrame(() => { 
        void (async () => {
          try {
            if (!cancelled.current) await cargarInfoBackup();
          } catch (err) {
            console.warn('[TabDrive] cargarInfoBackup failed:', err);
          }
        })(); 
      });
    }, 0);
    return () => { 
      cancelled.current = true; 
      clearTimeout(t); 
    };
  }, [cargarInfoBackup]);

  const login = useGoogleLogin({
    scope: DRIVE_SCOPE,
    onSuccess: res => { setAccessToken(res.access_token); setLoggedIn(true); mostrarMsg('✓ Conectado a Google Drive', 'success'); cargarInfoBackup(); },
    onError: () => mostrarMsg('Error al conectar con Google', 'error'),
  });

  function mostrarMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function exportar() {
    setLoading('exportar');
    const res = await exportarAGoogleDrive();
    mostrarMsg(res.message, res.success ? 'success' : 'error');
    setLoading('');
    if (res.success) cargarInfoBackup();
  }

  async function restaurar() {
    if (!confirm('¿Estás seguro? Esto reemplazará TODOS los datos locales con la copia de Drive.')) return;
    setLoading('restaurar');
    const res = await restaurarDesdeGoogleDrive();
    mostrarMsg(res.message, res.success ? 'success' : 'error');
    setLoading('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 13,
          background: msg.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`,
          color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
        }}>
          {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {!loggedIn ? (
        <>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.6 }}>
            ☁️ Conectá tu cuenta de Google para hacer copias de seguridad automáticas al cerrar cada mes.
          </div>
          <button className="btn-gold" style={{ width: '100%' }} onClick={() => login()}>
            <LogIn size={18} /> Conectar Google Drive
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(76,175,130,0.08)', border: '1px solid rgba(76,175,130,0.2)' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>Conectado a Google Drive</p>
              {lastBackup && (
                <p style={{ fontSize: 11, color: 'var(--gray-muted)', marginTop: 2 }}>
                  Último backup: {lastBackup.date} ({lastBackup.size} KB)
                </p>
              )}
            </div>
          </div>
          <button className="btn-gold" style={{ width: '100%' }} disabled={loading === 'exportar'} onClick={exportar}>
            <Cloud size={18} /> {loading === 'exportar' ? 'Subiendo...' : 'Hacer copia ahora'}
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} disabled={loading === 'restaurar'} onClick={restaurar}>
            <CloudDownload size={18} /> {loading === 'restaurar' ? 'Restaurando...' : 'Restaurar desde Drive'}
          </button>
          <button className="btn-danger" style={{ width: '100%' }} onClick={() => { clearAccessToken(); setLoggedIn(false); }}>
            <LogOut size={16} /> Desconectar Drive
          </button>
        </>
      )}
    </div>
  );
}

// ─── Modal Configuración Barbería ──────────────────────────────────────────────
function ModalConfigBarberia({ onClose, onNombreChange }: { onClose: () => void; onNombreChange?: (n: string) => void }) {
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
      setLogoMsg('Solo se admiten archivos de imagen.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg('El archivo es demasiado grande (máx. 2 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        setLogoMsg('Formato de logo no válido.');
        return;
      }

      const commaIndex = dataUrl.indexOf(',');
      const base64Length = dataUrl.length - commaIndex - 1;
      const approxSize = Math.ceil(base64Length * 3 / 4);
      if (approxSize > 2 * 1024 * 1024) {
        setLogoMsg('El logo es demasiado grande para guardar. Usa una imagen menor a 2 MB.');
        return;
      }

      setLogoSrc(dataUrl);
      await setConfig('logo_data', dataUrl);
      setLogoMsg('✓ Logo actualizado correctamente');
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
          <h2 className="section-title">Configurar Barbería</h2>
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
              <span style={{ color: 'white', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>✏️<br />Cambiar</span>
            </div>
          </div>
          <input
            id="logo-file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: '6px 16px', minHeight: 32 }}
            onClick={() => document.getElementById('logo-file-input')?.click()}
          >
            📷 Seleccionar Logo desde el Dispositivo
          </button>
          {logoMsg && (
            <p style={{ fontSize: 12, color: logoMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)', textAlign: 'center' }}>{logoMsg}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Nombre de la Barbería</label>
            <input
              className="input-dark"
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Royal Cuts Barber Shop"
            />
          </div>
          <button className="btn-gold" disabled={!nombre.trim() || saving} onClick={guardar}>
            {success ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Gestión de Socios ────────────────────────────────────────────────────
function ModalGestionSocios({ onClose }: { onClose: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<Socio | null>(null);
  const [mensaje, setMensaje] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const todosSocios = useLiveQuery(() => db.socios.orderBy('nombre').toArray(), []);
  const socios = todosSocios?.filter(s => mostrarInactivos || s.activo);
  const totalActivos = todosSocios?.filter(s => s.activo).length ?? 0;
  const totalInactivos = todosSocios?.filter(s => !s.activo).length ?? 0;

  function mostrarMensaje(text: string, type: 'success' | 'error') {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 4000);
  }

  async function toggleActivo(socio: Socio) {
    if (!socio.id) return;
    await db.socios.update(socio.id, { activo: !socio.activo });
    mostrarMensaje(`${socio.nombre} ${!socio.activo ? 'activado' : 'pausado'}.`, 'success');
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
        mostrarMensaje(`${socio.nombre} tiene pagos/adelantos registrados. Se marcó como inactivo.`, 'success');
      } else {
        mostrarMensaje(`${socio.nombre} tiene pagos/adelantos registrados y no se puede eliminar.`, 'error');
      }
      return;
    }

    if (!confirm(`¿Eliminar a ${socio.nombre} definitivamente?`)) return;
    await db.socios.delete(socio.id);
    mostrarMensaje(`${socio.nombre} eliminado.`, 'success');
  }

  const totalPorcentaje = todosSocios?.filter(s => s.activo).reduce((sum, s) => sum + s.porcentaje_utilidad, 0) ?? 0;
  const excede = totalPorcentaje > 1.001;
  const exacto = Math.abs(totalPorcentaje - 1) < 0.001;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">Gestión de Socios</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>

        <div className="card" style={{
          marginBottom: 16, padding: '12px 14px',
          borderColor: excede ? 'rgba(224,82,82,0.4)' : exacto ? 'rgba(76,175,130,0.4)' : 'rgba(212,175,55,0.3)',
          background: excede ? 'rgba(224,82,82,0.06)' : exacto ? 'rgba(76,175,130,0.06)' : 'rgba(212,175,55,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--gray-muted)', fontWeight: 600 }}>DISTRIBUCIÓN ACTIVA</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: excede ? 'var(--danger)' : exacto ? 'var(--success)' : 'var(--gold)', fontFamily: 'var(--font-display)' }}>
              {(totalPorcentaje * 100).toFixed(0)}%
            </p>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--black-border)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 0.3s ease',
              width: `${Math.min(totalPorcentaje * 100, 100)}%`,
              background: excede ? 'var(--danger)' : exacto ? 'var(--success)' : 'linear-gradient(90deg, var(--gold-light), var(--gold))'
            }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: excede ? 'var(--danger)' : exacto ? 'var(--success)' : 'var(--warning)' }}>
            {exacto ? '✓ Distribución perfecta al 100%'
              : excede ? `⚠ Excede por ${((totalPorcentaje - 1) * 100).toFixed(0)}%`
              : `Falta asignar ${((1 - totalPorcentaje) * 100).toFixed(0)}% de la utilidad`}
          </p>
        </div>

        {mensaje && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13,
            background: mensaje.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)',
            border: `1px solid ${mensaje.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`,
            color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)',
          }}>
            {mensaje.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span style={{ flex: 1 }}>{mensaje.text}</span>
          </div>
        )}

        <button className="btn-gold" style={{ width: '100%', marginBottom: 10, flexShrink: 0 }} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Agregar Nuevo Socio
        </button>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setMostrarInactivos(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `2px solid ${!mostrarInactivos ? 'var(--success)' : 'var(--black-border)'}`, background: !mostrarInactivos ? 'rgba(76,175,130,0.1)' : 'var(--black-surface)', color: !mostrarInactivos ? 'var(--success)' : 'var(--gray-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, transition: 'all 0.2s' }}>● Activos ({totalActivos})</button>
          <button onClick={() => setMostrarInactivos(true)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `2px solid ${mostrarInactivos ? 'var(--gold)' : 'var(--black-border)'}`, background: mostrarInactivos ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)', color: mostrarInactivos ? 'var(--gold)' : 'var(--gray-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, transition: 'all 0.2s' }}>Todos ({(todosSocios?.length ?? 0)}) · Inactivos ({totalInactivos})</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {socios?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-muted)' }}>
              <UserCog size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>{mostrarInactivos ? 'No hay socios registrados' : 'No hay socios activos'}</p>
            </div>
          )}
          {socios?.map(s => (
            <div key={s.id} className="card" style={{ padding: '12px 14px', opacity: s.activo ? 1 : 0.55, borderColor: s.activo && excede ? 'rgba(224,82,82,0.3)' : 'var(--black-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nombre}</p>
                    <span className={`badge ${s.activo ? 'badge-green' : 'badge-red'}`} style={{ flexShrink: 0 }}>{s.activo ? '● Activo' : '● Pausado'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="badge badge-gold" style={{ fontSize: 11 }}><Percent size={9} /> {(s.porcentaje_utilidad * 100).toFixed(0)}%</span>
                    <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{s.rol}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                  <button onClick={() => setEditando(s)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: 'rgba(212,175,55,0.4)', color: 'var(--gold)' }}><Edit2 size={12} /> Editar</button>
                  <button onClick={() => toggleActivo(s)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: s.activo ? 'rgba(224,82,82,0.4)' : 'rgba(76,175,130,0.4)', color: s.activo ? 'var(--danger)' : 'var(--success)' }}>{s.activo ? 'Pausar' : 'Activar'}</button>
                  <button onClick={() => eliminar(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px' }}><X size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
        {showAdd && <ModalAddSocio onClose={() => setShowAdd(false)} />}
        {editando && <ModalEditarSocio socio={editando} onClose={() => { setEditando(null); mostrarMensaje('Socio actualizado correctamente.', 'success'); }} />}
      </div>
    </div>
  );
}

function ModalEditarSocio({ socio, onClose }: { socio: Socio; onClose: () => void }) {
  const [nombre, setNombre] = useState(socio.nombre);
  const [porcentaje, setPorcentaje] = useState(String(Math.round(socio.porcentaje_utilidad * 100)));
  const [rol, setRol] = useState(socio.rol);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const otrosSocios = useLiveQuery(() => db.socios.filter(s => s.id !== socio.id && s.activo).toArray(), [socio.id]);
  const totalOtros = otrosSocios?.reduce((sum, s) => sum + s.porcentaje_utilidad, 0) ?? 0;
  const porcentajeNum = Number(porcentaje);
  const nuevoTotal = totalOtros + porcentajeNum / 100;
  const excede = nuevoTotal > 1.001;

  async function guardar() {
    if (!nombre.trim() || !socio.id) return;
    const existe = await db.socios.filter(s => s.id !== socio.id && s.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) { alert(`Ya existe un socio llamado "${nombre.trim()}".`); return; }
    setLoading(true);
    await db.socios.update(socio.id, { nombre: nombre.trim(), porcentaje_utilidad: porcentajeNum / 100, rol: rol.trim() || 'Socio' });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">Editar Socio</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Socio actualizado!</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Nombre</label><input className="input-dark" type="text" value={nombre} maxLength={100} autoComplete="off" onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} placeholder="Nombre del socio" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Rol / Cargo</label><select className="input-dark" value={rol} onChange={e => setRol(e.target.value)}><option value="Dueño">Dueño</option><option value="Socio">Socio</option><option value="Inversor">Inversor</option><option value="Administrador">Administrador</option><option value="Otro">Otro</option></select></div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Porcentaje: <strong style={{ color: excede ? 'var(--danger)' : 'var(--gold)' }}>{porcentaje}%</strong></label>
              <input type="range" min="5" max="100" step="5" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} style={{ width: '100%', accentColor: excede ? '#E05252' : 'var(--gold)', height: 6, cursor: 'pointer' }} />
            </div>
            <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalAddSocio({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState('');
  const [porcentaje, setPorcentaje] = useState('50');
  const [rol, setRol] = useState('Dueño');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    const existe = await db.socios.filter(s => s.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) { alert(`Ya existe un socio llamado "${nombre.trim()}".`); return; }
    setLoading(true);
    await db.socios.add({ nombre: nombre.trim(), porcentaje_utilidad: Number(porcentaje) / 100, activo: true, rol: rol.trim() || 'Socio' });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 900);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">Nuevo Socio</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Socio agregado!</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Nombre Completo</label><input className="input-dark" type="text" value={nombre} maxLength={100} autoComplete="off" onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} placeholder="Ej: María García" /></div>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Rol / Cargo</label><select className="input-dark" value={rol} onChange={e => setRol(e.target.value)}><option value="Dueño">Dueño</option><option value="Socio">Socio</option><option value="Inversor">Inversor</option><option value="Administrador">Administrador</option><option value="Otro">Otro</option></select></div>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Porcentaje: <strong style={{ color: 'var(--gold)' }}>{porcentaje}%</strong></label><input type="range" min="5" max="100" step="5" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} style={{ width: '100%', accentColor: 'var(--gold)', height: 6, cursor: 'pointer' }} /></div>
            <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Agregar Socio'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DriveSection() {
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleConfigurado = !!(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('PON_TU_CLIENT_ID'));
  if (!googleConfigurado) {
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', fontSize: 13, color: 'var(--danger)', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>⚠ Google no está configurado</p>
          <p>Para habilitar Google Drive, agregá tu <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>.env.local</code>.</p>
        </div>
      </div>
    );
  }
  return <DriveSectionEnabled />;
}

function DriveSectionEnabled() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState('');
  const [mensaje, setMensaje] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setLoggedIn(isDriveConnected());
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const login = useGoogleLogin({
    scope: DRIVE_SCOPE,
    onSuccess: (res) => { setAccessToken(res.access_token); setLoggedIn(true); mostrarMensaje('✓ Conectado a Google Drive', 'success'); },
    onError: () => mostrarMensaje('Error al conectar con Google', 'error'),
  });

  function logout() { clearAccessToken(); setLoggedIn(false); mostrarMensaje('Sesión de Google cerrada', 'success'); }

  function mostrarMensaje(text: string, type: 'success' | 'error') {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 4000);
  }

  async function exportar() {
    setLoading('exportar');
    const res = await exportarAGoogleDrive();
    mostrarMensaje(res.message, res.success ? 'success' : 'error');
    setLoading('');
  }

  async function restaurar() {
    if (!confirm('¿Estás seguro? Esto reemplazará TODOS los datos locales con la copia de Drive.')) return;
    setLoading('restaurar');
    const res = await restaurarDesdeGoogleDrive();
    mostrarMensaje(res.message, res.success ? 'success' : 'error');
    setLoading('');
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Cloud size={18} color="var(--gold)" />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>Google Drive Backup</p>
      </div>
      {mensaje && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, background: mensaje.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${mensaje.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {mensaje.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {mensaje.text}
        </div>
      )}
      {!loggedIn ? (
        <button id="btn-login-google" className="btn-gold" style={{ width: '100%' }} onClick={() => login()}><LogIn size={18} /> Iniciar sesión con Google</button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(76,175,130,0.08)', border: '1px solid rgba(76,175,130,0.2)' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <p style={{ fontSize: 13, color: 'var(--success)' }}>Conectado a Google Drive</p>
          </div>
          <button id="btn-exportar-drive" className="btn-gold" style={{ width: '100%' }} disabled={loading === 'exportar'} onClick={exportar}><Cloud size={18} /> {loading === 'exportar' ? 'Subiendo...' : 'Exportar a Google Drive'}</button>
          <button id="btn-restaurar-drive" className="btn-ghost" style={{ width: '100%' }} disabled={loading === 'restaurar'} onClick={restaurar}><CloudDownload size={18} /> {loading === 'restaurar' ? 'Restaurando...' : 'Restaurar Copia desde Drive'}</button>
          <button id="btn-logout-google" className="btn-danger" style={{ width: '100%' }} onClick={logout}><LogOut size={16} /> Cerrar sesión de Google</button>
        </div>
      )}
    </div>
  );
}

function AjustesGenerales() {
  const { t } = useAppConfig();
  const [exportStatus, setExportStatus] = useState('');
  const [excelExportStatus, setExcelExportStatus] = useState('');
  const [excelImporting, setExcelImporting] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/Logo.jpg');

  useEffect(() => {
    getConfig('logo_data').then(v => { if (v) setLogoSrc(v); });
    const handler = (e: Event) => { const detail = (e as CustomEvent).detail; if (detail?.src) setLogoSrc(detail.src); };
    window.addEventListener('logo-updated', handler);
    return () => window.removeEventListener('logo-updated', handler);
  }, []);

  async function exportarLocal() {
    const json = await exportarTodosLosDatos();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barberia_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('✓ Archivo descargado');
    setTimeout(() => setExportStatus(''), 3000);
  }

  async function importarLocal(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('¿Restaurar datos? Esto borrará todos los datos actuales.')) return;
    const text = await file.text();
    const { restaurarDesdeDatos } = await import('@/lib/business');
    await restaurarDesdeDatos(text);
    alert('✓ Datos restaurados correctamente');
  }

  async function exportarExcel() {
    setExcelExportStatus('Generando...');
    try {
      const { exportToExcel } = await import('@/lib/excel');
      await exportToExcel();
      setExcelExportStatus('✓ Archivo Excel descargado');
      setTimeout(() => setExcelExportStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setExcelExportStatus('Error al exportar');
      setTimeout(() => setExcelExportStatus(''), 3000);
    }
  }

  async function importarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('¿Importar datos desde Excel?')) return;
    setExcelImporting(true);
    try {
      const { importFromExcel } = await import('@/lib/excel');
      const res = await importFromExcel(file);
      alert(`✓ Datos importados:\n- ${res.importedVentas} Ventas\n- ${res.importedPagos} Pagos/Adelantos\n- ${res.importedGastos} Gastos`);
    } catch (err) {
      console.error(err);
      alert('Error al importar Excel. Revisa el formato del archivo.');
    }
    setExcelImporting(false);
    e.target.value = '';
  }

  return (
    <div>
      <div className="divider-barber" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Database size={18} color="var(--gold)" />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>Copia Local (JSON)</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <button id="btn-exportar-local" className="btn-ghost" style={{ width: '100%' }} onClick={exportarLocal}><Download size={18} /> {exportStatus || 'Descargar Backup JSON'}</button>
        <label id="btn-importar-local" className="btn-ghost" style={{ width: '100%', cursor: 'pointer' }}><CloudDownload size={18} /> Importar Backup JSON<input type="file" accept=".json" style={{ display: 'none' }} onChange={importarLocal} /></label>
      </div>
      <div className="divider-barber" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Database size={18} color="var(--gold)" />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--white-soft)' }}>Histórico (Excel)</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <button className="btn-ghost" style={{ width: '100%', borderColor: 'rgba(76,175,130,0.3)', color: 'var(--success)' }} onClick={exportarExcel}><Download size={18} /> {excelExportStatus || 'Exportar Plantilla Excel'}</button>
        <label className="btn-ghost" style={{ width: '100%', cursor: excelImporting ? 'default' : 'pointer', borderColor: 'rgba(76,175,130,0.3)', color: 'var(--success)' }}><CloudDownload size={18} /> {excelImporting ? 'Importando...' : 'Importar Datos Excel'}<input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={importarExcel} disabled={excelImporting} /></label>
      </div>
      <div className="divider-barber" />
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-muted)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', position: 'relative' }}>
          <Image src={logoSrc} alt="Logo" fill style={{ objectFit: 'cover' }} onError={() => setLogoSrc('/Logo.jpg')} />
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold)', marginBottom: 4 }}>Gestión de Barberia</p>
        <p style={{ fontSize: 12 }}>{t('version')} 1.0.0 — Sistema de Gestión</p>
        <p style={{ fontSize: 11, marginTop: 4, marginBottom: 20 }}>{t('localSystem')}</p>
        <button className="btn-danger" style={{ width: '100%', marginBottom: 10 }} onClick={async () => {
          if (!confirm('Esto borra el caché del navegador pero NO tus datos. ¿Continuar?')) return;
          try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); alert('✓ Caché limpiado.'); window.location.reload(); }
          catch { alert('No se pudo limpiar el caché automáticamente.'); }
        }}><RefreshCw size={18} /> Limpiar Caché del Navegador</button>
        <button className="btn-danger" style={{ width: '100%' }} onClick={() => { logoutAll(); window.location.reload(); }}><LogOut size={18} /> Cerrar Sesión de la App</button>
      </div>
    </div>
  );
}

const MONEDAS = [
  { symbol: '€', label: 'Euro (€)' }, { symbol: '$', label: 'Dólar ($)' }, { symbol: '£', label: 'Libra (£)' },
  { symbol: 'ARS', label: 'Peso Argentino' }, { symbol: 'R$', label: 'Real Brasileño' }, { symbol: 'CLP', label: 'Peso Chileno' },
  { symbol: 'MXN', label: 'Peso Mexicano' }, { symbol: 'COP', label: 'Peso Colombiano' }, { symbol: 'UYU', label: 'Peso Uruguayo' },
];

// ─── Modal Finanzas ───────────────────────────────────────────────────────────
function ModalFinanzas({ onClose }: { onClose: () => void }) {
  const [comision, setComision] = useState('0');
  const [moneda, setMoneda] = useState('€');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getConfig('porcentaje_comision_bancaria'), getConfig('moneda')]).then(([c, m]) => {
      if (c) setComision(c);
      if (m) setMoneda(m);
    });
  }, []);

  async function guardar() {
    const valor = Number(comision);
    if (Number.isNaN(valor) || valor < 0 || valor > 100) { setError('Ingresá un porcentaje válido entre 0 y 100.'); return; }
    setSaving(true);
    await Promise.all([setConfig('porcentaje_comision_bancaria', String(valor)), setConfig('moneda', moneda)]);
    emitirCambioMoneda(moneda);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onClose(); }, 1200);
  }

  const ejemploComision = Number(comision) > 0 ? Number(comision) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">Moneda y Finanzas</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Configuración guardada!</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Símbolo de Moneda</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MONEDAS.map(m => (
                  <button key={m.symbol} type="button" onClick={() => setMoneda(m.symbol)} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: '1.5px solid', borderColor: moneda === m.symbol ? 'var(--gold)' : 'var(--black-border)', background: moneda === m.symbol ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)', color: moneda === m.symbol ? 'var(--gold)' : 'var(--gray-muted)', fontFamily: 'var(--font-body)', transition: 'all 0.15s', minWidth: 52 }}>{m.symbol}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comisión Bancaria (%)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="input-dark" type="number" min="0" max="100" step="0.001" value={comision} onKeyDown={e => { if (['-','e','E','+'].includes(e.key)) e.preventDefault(); }} onChange={e => { setComision(e.target.value); setError(''); }} style={{ flex: 1 }} />
                <span style={{ fontSize: 18, color: 'var(--white-soft)', fontWeight: 700, width: 20 }}>%</span>
              </div>
              <div style={{ marginTop: 12, padding: '14px', borderRadius: 10, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', fontSize: 12, color: 'var(--gray-muted)', lineHeight: 1.6 }}>
                <p style={{ fontWeight: 600, color: 'var(--gold)', marginBottom: 8 }}>💳 ¿Cómo funciona?</p>
                <p>Esta comisión se aplica solo a los ingresos por banco/transferencia.</p>
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                    <div><p style={{ fontSize: 10, color: 'var(--gray-muted)' }}>Bruto banco</p><p style={{ fontSize: 15, fontWeight: 700, color: 'var(--white-soft)' }}>{moneda}100</p></div>
                    <div><p style={{ fontSize: 10, color: 'var(--gray-muted)' }}>Comisión</p><p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>-{moneda}{ejemploComision.toFixed(3)}</p></div>
                    <div><p style={{ fontSize: 10, color: 'var(--gray-muted)' }}>Ganancia neta</p><p style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{moneda}{(100 - ejemploComision).toFixed(2)}</p></div>
                  </div>
                </div>
              </div>
            </div>
            {error && <p style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
            <button className="btn-gold" disabled={saving} onClick={guardar}>{saving ? 'Guardando...' : 'Guardar Configuración'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalGestionBarberos({ onClose }: { onClose: () => void }) {
  const { simbolo } = useMoneda();
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [docsBarbero, setDocsBarbero] = useState<{ id: number; nombre: string } | null>(null);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [mensaje, setMensaje] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const todosBarberos = useLiveQuery(() => db.barberos.orderBy('nombre').toArray(), []);
  const barberos = todosBarberos?.filter(b => {
    const coincideEstado = mostrarInactivos ? true : b.activo;
    const coincideNombre = busqueda.trim() === '' || b.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideNombre;
  });

  const totalActivos = todosBarberos?.filter(b => b.activo).length ?? 0;

  useEffect(() => {
    async function cargarSaldos() {
      if (!todosBarberos) return;
      const mapa: Record<number, number> = {};
      await Promise.all(todosBarberos.map(async (b) => { if (b.id) { mapa[b.id] = await getSaldoDisponibleBarbero(b.id); } }));
      setBalances(mapa);
    }
    cargarSaldos();
  }, [todosBarberos]);

  async function toggleActivo(barbero: any) {
    if (barbero.activo) {
      const saldo = balances[barbero.id] || 0;
      if (saldo !== 0) {
        setMensaje({ text: `No se puede desactivar a ${barbero.nombre} porque tiene un saldo pendiente de ${simbolo}${saldo.toFixed(2)}.`, type: 'error' });
        setTimeout(() => setMensaje(null), 5000);
        return;
      }
    }
    await db.barberos.update(barbero.id, { activo: !barbero.activo });
    setMensaje({ text: `${barbero.nombre} ha sido ${!barbero.activo ? 'activado' : 'desactivado'}.`, type: 'success' });
    setTimeout(() => setMensaje(null), 3000);
  }

  async function eliminar(barbero: any) {
    if (!barbero.id) return;
    const [registros, adelantos] = await Promise.all([db.registros_diarios.where('barbero_id').equals(barbero.id).toArray(), db.Adelantos.where('barbero_id').equals(barbero.id).toArray()]);
    const tieneData = registros.length > 0 || adelantos.length > 0;
    if (tieneData) {
      if (barbero.activo) { await db.barberos.update(barbero.id, { activo: false }); setMensaje({ text: `${barbero.nombre} tiene servicios asociados. Se marcó como inactivo.`, type: 'success' }); }
      else { setMensaje({ text: `${barbero.nombre} tiene servicios asociados y no se puede eliminar.`, type: 'error' }); }
      setTimeout(() => setMensaje(null), 4000);
      return;
    }
    if (!confirm(`¿Eliminar a ${barbero.nombre} definitivamente?`)) return;
    await db.barberos.delete(barbero.id);
    setMensaje({ text: `${barbero.nombre} eliminado.`, type: 'success' });
    setTimeout(() => setMensaje(null), 4000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 className="section-title">Gestionar Barberos</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        <div style={{ position: 'relative', marginBottom: 10, flexShrink: 0 }}>
          <input className="input-dark" type="text" placeholder="🔍 Buscar barbero por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', paddingRight: busqueda ? 36 : 12 }} />
          {busqueda && <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)', padding: 0, display: 'flex' }}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => setMostrarInactivos(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `2px solid ${!mostrarInactivos ? 'var(--success)' : 'var(--black-border)'}`, background: !mostrarInactivos ? 'rgba(76,175,130,0.1)' : 'var(--black-surface)', color: !mostrarInactivos ? 'var(--success)' : 'var(--gray-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, transition: 'all 0.2s' }}>● Activos ({totalActivos})</button>
          <button onClick={() => setMostrarInactivos(true)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: `2px solid ${mostrarInactivos ? 'var(--gold)' : 'var(--black-border)'}`, background: mostrarInactivos ? 'rgba(212,175,55,0.1)' : 'var(--black-surface)', color: mostrarInactivos ? 'var(--gold)' : 'var(--gray-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, transition: 'all 0.2s' }}>👥 Todos ({(todosBarberos?.length ?? 0)})</button>
        </div>
        {mensaje && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '10px 14px', borderRadius: 10, marginBottom: 10, fontSize: 13, background: mensaje.type === 'success' ? 'rgba(76,175,130,0.12)' : 'rgba(224,82,82,0.12)', border: `1px solid ${mensaje.type === 'success' ? 'rgba(76,175,130,0.3)' : 'rgba(224,82,82,0.3)'}`, color: mensaje.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {mensaje.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span style={{ flex: 1 }}>{mensaje.text}</span>
          </div>
        )}
        <button className="btn-gold" style={{ width: '100%', marginBottom: 10, flexShrink: 0 }} onClick={() => setShowAdd(true)}><Plus size={18} /> Agregar Nuevo Barbero</button>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {barberos?.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray-muted)' }}><p style={{ fontSize: 13 }}>{busqueda ? `Sin resultados para "${busqueda}"` : 'No hay barberos en este filtro'}</p></div>}
            {barberos?.map(b => {
              const saldo = balances[b.id!] ?? 0;
              return (
                <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', opacity: b.activo ? 1 : 0.65 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>{b.nombre}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <span className={`badge ${b.activo ? 'badge-green' : 'badge-red'}`}>{b.activo ? '● Activo' : '● Inactivo'}</span>
                      <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>Comisión: {(b.porcentaje_comision * 100).toFixed(0)}%</span>
                    </div>
                    <p style={{ fontSize: 12, marginTop: 4, color: saldo === 0 ? 'var(--gray-muted)' : saldo > 0 ? 'var(--success)' : 'var(--danger)' }}>Saldo: <strong>{simbolo}{saldo.toFixed(2)}</strong></p>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => setDocsBarbero({ id: b.id!, nombre: b.nombre })} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: 'rgba(82,136,224,0.4)', color: '#5288E0' }} title="Documentos"><FolderOpen size={12} /></button>
                    <button onClick={() => setEditando(b)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: 'rgba(212,175,55,0.4)', color: 'var(--gold)' }}><Edit2 size={12} /> Editar</button>
                    <button onClick={() => toggleActivo(b)} className="btn-ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 11, borderColor: b.activo ? 'rgba(224,82,82,0.4)' : 'rgba(76,175,130,0.4)', color: b.activo ? 'var(--danger)' : 'var(--success)' }}>{b.activo ? 'Pausar' : 'Activar'}</button>
                    <button onClick={() => eliminar(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px' }}><X size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {showAdd && (
          <div className="modal-overlay" onClick={() => setShowAdd(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div style={{ padding: 16 }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Nuevo Barbero</p>
                <p style={{ fontSize: 13, color: 'var(--gray-muted)', lineHeight: 1.5 }}>
                  Modal “Agregar barbero” no disponible en esta versión (componente faltante).
                </p>
                <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => setShowAdd(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
        {editando && <ModalEditarBarbero barbero={editando} onClose={() => { setEditando(null); setMensaje({ text: 'Barbero actualizado correctamente.', type: 'success' }); setTimeout(() => setMensaje(null), 3000); }} />}
        {docsBarbero && <ModalDocumentosBarbero barberoId={docsBarbero.id} barberoNombre={docsBarbero.nombre} onClose={() => setDocsBarbero(null)} />}
      </div>
    </div>
  );
}

function ModalEditarBarbero({ barbero, onClose }: { barbero: any; onClose: () => void }) {
  const [nombre, setNombre] = useState(barbero.nombre);
  const [porcentaje, setPorcentaje] = useState(String(Math.round(barbero.porcentaje_comision * 100)));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function guardar() {
    if (!nombre.trim() || !barbero.id) return;
    const existe = await db.barberos.filter(b => b.id !== barbero.id && b.nombre.toLowerCase() === nombre.trim().toLowerCase()).first();
    if (existe) { alert(`Ya existe un barbero llamado "${nombre.trim()}".`); return; }
    setLoading(true);
    await db.barberos.update(barbero.id, { nombre: nombre.trim(), porcentaje_comision: Number(porcentaje) / 100 });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="section-title">Editar Barbero</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--success)' }}><CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /><p style={{ fontSize: 16, fontWeight: 600 }}>¡Barbero actualizado!</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Nombre Completo</label><input className="input-dark" type="text" value={nombre} maxLength={100} autoComplete="off" onChange={e => setNombre(e.target.value.replace(/[<>"'`]/g, ''))} placeholder="Ej: Juan Pérez" /></div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray-muted)', display: 'block', marginBottom: 6 }}>Porcentaje de Comisión: <strong style={{ color: 'var(--gold)' }}>{porcentaje}%</strong></label>
              <input type="range" min="0" max="100" step="5" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} style={{ width: '100%', accentColor: 'var(--gold)', height: 6, cursor: 'pointer' }} />
            </div>
            <button className="btn-gold" disabled={!nombre.trim() || loading} onClick={guardar}>{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalFondoCaja({ onClose }: { onClose: () => void }) {
  const { simbolo } = useMoneda();
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fecha, setFecha] = useState<string>(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  });

  const saldo = useLiveQuery(() => getSaldoFondoCaja(), []);
  const movimientos = useLiveQuery(() => db.fondo_caja.orderBy('fecha').reverse().limit(15).toArray(), []);

  async function guardar() {
    if (!monto || !motivo || !fecha) return;
    const valMonto = Number(monto);
    if (valMonto <= 0) return;
    if (tipo === 'egreso' && saldo !== undefined && valMonto > saldo) { alert(`No hay fondos suficientes. Saldo: ${simbolo}${saldo.toFixed(2)}`); return; }
    setLoading(true);
    const [y, m, d] = fecha.split('-').map(Number);
    await db.fondo_caja.add({ fecha: new Date(y, m - 1, d, 12, 0, 0), monto: valMonto, tipo, motivo });
    setMonto(''); setMotivo('');
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-handle" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
          <h2 className="section-title">Fondo de Caja</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-muted)' }}><X size={22} /></button>
        </div>
        <div className="card-gold pulse-gold" style={{ marginBottom: 12, textAlign: 'center', flexShrink: 0 }}>
          <p className="stat-label" style={{ marginBottom: 6 }}>💰 Saldo del Fondo de Caja</p>
          <p className="stat-value gold" style={{ fontSize: 32 }}>{simbolo}{(saldo ?? 0).toFixed(2)}</p>
        </div>
        <div className="card" style={{ marginBottom: 12, padding: 14, flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 12 }}>+ Nuevo Movimiento</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setTipo('ingreso')} style={{ padding: '10px', borderRadius: 10, border: `2px solid ${tipo === 'ingreso' ? 'var(--success)' : 'var(--black-border)'}`, background: tipo === 'ingreso' ? 'rgba(76,175,130,0.1)' : 'var(--black-surface)', color: tipo === 'ingreso' ? 'var(--success)' : 'var(--gray-text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, transition: 'all 0.2s' }}>📥 Agregar Cambio</button>
              <button onClick={() => setTipo('egreso')} style={{ padding: '10px', borderRadius: 10, border: `2px solid ${tipo === 'egreso' ? 'var(--danger)' : 'var(--black-border)'}`, background: tipo === 'egreso' ? 'rgba(224,82,82,0.1)' : 'var(--black-surface)', color: tipo === 'egreso' ? 'var(--danger)' : 'var(--gray-text)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 12, transition: 'all 0.2s' }}>📤 Retirar / Robo</button>
            </div>
            <div><label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>Fecha</label><DatePicker value={fecha} onChange={setFecha} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 8 }}>
              <div><label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>Monto</label><input type="number" inputMode="decimal" className="input-dark" placeholder="0.00" min="0.01" max="99999" step="0.01" value={monto} onKeyDown={e => { if (['-','e','E','+'].includes(e.key)) e.preventDefault(); }} onChange={e => { const v = e.target.value; if (v === '' || (Number(v) >= 0 && Number(v) <= 99999)) setMonto(v); }} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--gray-muted)', display: 'block', marginBottom: 4 }}>Motivo</label><input type="text" className="input-dark" placeholder="Ej: Cambio mañana" maxLength={200} autoComplete="off" value={motivo} onChange={e => setMotivo(e.target.value.replace(/[<>"'`]/g, ''))} /></div>
            </div>
            <button className="btn-gold" style={{ minHeight: 40 }} disabled={!monto || !motivo || !fecha || loading} onClick={guardar}>{success ? '✓ Registrado' : tipo === 'ingreso' ? 'Agregar Fondo' : 'Descontar del Fondo'}</button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-muted)', marginBottom: 8, fontWeight: 600, flexShrink: 0 }}>Últimos Movimientos</p>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(!movimientos || movimientos.length === 0) && <p style={{ fontSize: 12, color: 'var(--gray-muted)', textAlign: 'center', padding: '12px 0' }}>Sin movimientos registrados</p>}
            {movimientos?.map(m => (
              <div key={m.id} className="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{m.motivo}</p>
                  <p style={{ fontSize: 11, color: 'var(--gray-muted)' }}>{new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>{m.tipo === 'ingreso' ? '+' : '-'}{simbolo}{m.monto.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
