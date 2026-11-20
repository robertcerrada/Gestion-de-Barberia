'use client';

import { useState, useEffect, useRef } from 'react';
import { Home, BarChart3, Settings, Sun, Moon, Bell } from 'lucide-react';
import { seedInitialData, getConfig } from '@/lib/db';
import { getAppToken, setAppToken } from '@/lib/auth';
import { useAppConfig } from '@/lib/useAppConfig';
import { loadNotificaciones, saveNotificaciones, checkNotificacionesGenerales } from '@/lib/notifications';
import '@/lib/autoBackup';
import AppLogo from '@/shared/components/AppLogo';
import ScreenInicio from '@/components/screens/ScreenInicio';
import ScreenBarberos from '@/components/screens/ScreenBarberos';
import ScreenPanel from '@/components/screens/ScreenPanel';
import ScreenAjustes from '@/components/screens/ScreenAjustes';
import ScreenLogin from '@/components/screens/ScreenLogin';
import PremiumNavBar from '@/components/PremiumNavBar';
import LanguageSelector from '@/shared/i18n/LanguageSelector';

type Tab = 'inicio' | 'barberos' | 'panel' | 'ajustes';
const IS_DEV = process.env.NODE_ENV !== 'production';

// ── Ícono máquina cortadora de pelo (clipper) ──
function ClipperIcon({ size = 22, style, className }: { size?: number; style?: React.CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className}>
      {/* Cuerpo principal */}
      <rect x="2" y="7" width="14" height="10" rx="3" />
      {/* Cabezal cortador */}
      <rect x="16" y="9" width="5" height="6" rx="1.5" />
      {/* Dientes de la cuchilla */}
      <line x1="16" y1="10.5" x2="21" y2="10.5" />
      <line x1="16" y1="12" x2="21" y2="12" />
      <line x1="16" y1="13.5" x2="21" y2="13.5" />
      {/* Cable saliendo por la izquierda */}
      <path d="M2 13 Q0 17 3 20" strokeDasharray="1.5 1.5" />
      {/* Botón de encendido */}
      <circle cx="7" cy="12" r="1.4" fill="currentColor" stroke="none" />
      {/* Ranura decorativa */}
      <line x1="10.5" y1="9.5" x2="13.5" y2="9.5" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

// ── Hook de inicialización de la app ──────────────────────────────────────────
// Extraído de page.tsx para separar lógica de carga del componente de presentación
function useAppLoader() {
  const [ready, setReady] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [nombreBarberia, setNombreBarberia] = useState('Gestión de Barberia');
  const [logoSrc, setLogoSrc] = useState('/Logo.jpg');

  useEffect(() => {
    const cancelled = { current: false };
    const safeSetReady = (value: boolean) => {
      if (!cancelled.current) setReady(value);
    };
    const safeSetErrorCarga = (message: string) => {
      if (!cancelled.current) setErrorCarga(message);
    };

    const timeout = setTimeout(() => {
      safeSetErrorCarga('errors.dbTimeout');
      safeSetReady(true);
    }, 10000);

    const iniciar = async () => {
      try {
        if (IS_DEV) console.log('[loader] iniciando seedInitialData...');
        await seedInitialData();
        if (IS_DEV) console.log('[loader] seedInitialData completado');
      } catch (e) {
        const err = e instanceof Error ? e : { name: '', message: String(e) };
        if (IS_DEV) console.error('[loader] Error en seedInitialData:', err);
        // Detectar errores de Dexie por nombre (preciso) y por substring (red de seguridad).
        // Antes el check era solo por substring incluyendo 'blocked', demasiado laxo.
        const isDexieConflict =
          err.name === 'VersionError' ||
          err.name === 'OpenFailedError' ||
          err.name === 'DatabaseClosedError' ||
          err.name === 'AbortError' ||
          /blocked|database opened in (another|other) tab|another version|upgrade transaction/i.test(err.message);
        if (isDexieConflict) {
          safeSetErrorCarga('errors.dbConflict');
          clearTimeout(timeout);
          safeSetReady(true);
          return;
        }
      }

      try {
        if (IS_DEV) console.log('[loader] cargando config...');
        const [nombre, logo] = await Promise.all([
          getConfig('nombre_barberia'),
          getConfig('logo_data'),
        ]);
        if (IS_DEV) console.log('[loader] config cargada:', { nombre, logo: logo ? 'present' : 'null' });
        if (nombre) setNombreBarberia(nombre);
        if (logo) setLogoSrc(logo);
      } catch (e) {
        if (IS_DEV) console.error('[loader] Error cargando configuración:', e);
      } finally {
        if (IS_DEV) console.log('[loader] inicializacion completada, setReady(true)');
        clearTimeout(timeout);
        safeSetReady(true);
      }
    };

    iniciar().catch((error) => {
      if (!cancelled.current) {
        if (IS_DEV) console.error('[loader] Error no capturado en inicializacion:', error);
        safeSetErrorCarga('errors.initUnexpected');
        safeSetReady(true);
      }
    });

    // NOTA: el registro del SW se hace en layout.tsx (con manejo de updatefound).
    // No registrar aquí para evitar doble registro.

    const handleLogoUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src) setLogoSrc(detail.src);
    };
    window.addEventListener('logo-updated', handleLogoUpdate);

    return () => {
      cancelled.current = true;
      clearTimeout(timeout);
      window.removeEventListener('logo-updated', handleLogoUpdate);
    };
  }, []);

  return { ready, errorCarga, nombreBarberia, setNombreBarberia, logoSrc };
}

// ── Splash / Loading screen ───────────────────────────────────────────────────
function SplashScreen({ nombreBarberia, logoSrc, errorCarga }: {
  nombreBarberia: string;
  logoSrc: string;
  errorCarga: string | null;
}) {
  const { t } = useAppConfig();
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-noise-texture relative overflow-hidden"
      style={{ background: 'var(--black-deep)' }}>
      {/* Luces de fondo ambientales */}
      <div className="ambient-glow" style={{ zIndex: 0 }} />

      {/* Contenido principal con animación de entrada */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: '0 24px',
        textAlign: 'center',
        zIndex: 10,
        animation: 'fadeInCascade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        {/* Anillo exterior del Logo */}
        <div style={{
          position: 'relative',
          width: 104,
          height: 104,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 10, 10, 0.6)',
          border: '1.5px solid rgba(212, 175, 55, 0.18)',
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.8)',
          animation: errorCarga ? 'none' : 'luxuryScale 3s ease-in-out infinite',
        }}>
          {/* Anillo interior giratorio o decorativo */}
          <div style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: '1px dashed rgba(212, 175, 55, 0.35)',
            opacity: 0.8,
          }} />

          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--gold)',
            position: 'relative',
            zIndex: 2,
          }}>
            <AppLogo size={80} src={logoSrc} />
          </div>
        </div>

        {/* Bloque de texto */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 className="text-gradient-gold" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: 4
            }}>
              {nombreBarberia}
            </h1>

            {/* Ornamentación clásica */}
            <div className="ornament-separator" style={{ width: 140, margin: '8px auto 0', opacity: 0.5 }}>
              <span style={{ fontSize: 8 }}>♦</span>
              <span style={{ fontSize: 10 }}>✂</span>
              <span style={{ fontSize: 8 }}>♦</span>
            </div>
          </div>

          {errorCarga ? (
            <div style={{ animation: 'fadeInCascade 0.5s ease forwards', marginTop: 8 }}>
              <p style={{ fontSize: 13, color: '#E05252', maxWidth: 280, lineHeight: 1.5, margin: '0 auto 12px' }}>
                ⚠️ {errorCarga.startsWith('errors.') || errorCarga.startsWith('app.') ? t(errorCarga) : errorCarga}
              </p>
              <button type="button"
                onClick={() => window.location.reload()}
                className="btn-gold"
                style={{
                  minHeight: 40,
                  padding: '8px 24px',
                  fontSize: 13,
                  margin: '0 auto',
                }}
              >
                {t('app.reloadApplication')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 12 }}>
              {/* Barra de progreso de lujo */}
              <div style={{
                width: 120,
                height: 2,
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '60%',
                  background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
                  animation: 'premiumShimmer 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }} />
              </div>
              <p style={{
                fontSize: 10,
                color: 'var(--gray-muted)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 600
              }}>
                {t('app.loadingSystem')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [driveConfigOpen, setDriveConfigOpen] = useState(false);
  const { t, theme, setTheme, lang } = useAppConfig();
  const mainRef = useRef<HTMLElement>(null);

  const { ready, errorCarga, nombreBarberia, setNombreBarberia, logoSrc } = useAppLoader();

  // Las etiquetas de navegación ahora usan el sistema de i18n
  const TABS = [
    { id: 'inicio' as Tab, label: t('navHome'), icon: Home },
    { id: 'barberos' as Tab, label: t('navBarbers'), icon: ClipperIcon },
    { id: 'panel' as Tab, label: t('navPanel'), icon: BarChart3 },
    { id: 'ajustes' as Tab, label: t('navSettings'), icon: Settings },
  ];

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setNotificaciones(loadNotificaciones());
      void checkNotificacionesGenerales().then(() => {
        if (!cancelled) setNotificaciones(loadNotificaciones());
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const cancelled = { current: false };
    const t = setTimeout(() => {
      if (cancelled.current) return;
      const token = getAppToken();
      if (token) {
        // Defer actual setState to next frame and use functional updater to avoid unnecessary renders
        if (IS_DEV) console.log('[auth] token found, scheduling auth');
        requestAnimationFrame(() => {
          if (!cancelled.current) setIsAuthenticated(prev => prev || true);
        });
      }
    }, 0);
    return () => {
      cancelled.current = true;
      clearTimeout(t);
    };
  }, []);

  function marcarLeida(id: string) {
    const updated = notificaciones.map(n => n.id === id ? { ...n, leida: true } : n);
    const all = loadNotificaciones();
    const idx = all.findIndex(n => n.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], leida: true };
    saveNotificaciones(all);
    setNotificaciones(updated);
  }
  function eliminar(id: string) {
    const updated = notificaciones.filter(n => n.id !== id);
    const all = loadNotificaciones().filter(n => n.id !== id);
    saveNotificaciones(all);
    setNotificaciones(updated);
  }

  if (!ready) {
    return <SplashScreen nombreBarberia={nombreBarberia} logoSrc={logoSrc} errorCarga={errorCarga} />;
  }

  if (!isAuthenticated) {
    return (
      <ScreenLogin
        nombreBarberia={nombreBarberia}
        logoSrc={logoSrc}
        onLoginSuccess={(token) => {
          setAppToken(token);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <>
    <div style={{
      position: 'relative',
      zIndex: 1,
      height: '100vh',
      maxHeight: '-webkit-fill-available',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--black-deep)'
    }}>
      {/* Header Premium y Sólido (No se transparenta el scroll por detrás) */}
      <header style={{
        position: 'relative',
        zIndex: 50,
        background: 'var(--black-card)',
        borderBottom: '1.5px solid var(--black-border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.02)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottomLeftRadius: '18px',
        borderBottomRightRadius: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo con un marco squircle (superelipse) premium en lugar de círculo simple */}
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1.5px solid var(--gold)',
            boxShadow: '0 2px 8px rgba(212, 175, 55, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <AppLogo size={36} src={logoSrc} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              color: 'var(--gold)',
              fontWeight: 700,
              letterSpacing: '0.01em',
              lineHeight: 1.2
            }}>
              {nombreBarberia}
            </span>

          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span suppressHydrationWarning style={{
            fontSize: 11,
            color: 'var(--gray-text)',
            fontWeight: 500,
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '5px 10px',
            borderRadius: '20px',
            border: '1px solid var(--black-border)'
          }}>
            {new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
          </span>
          <LanguageSelector />
          <button type="button"
            onClick={() => setShowNotifModal(true)}
            style={{
              background: 'rgba(212, 175, 55, 0.05)',
              border: '1.5px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '10px',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}
            aria-label="Notificaciones"
          >
            <Bell size={16} />
            {notificaciones.filter(n => !n.leida).length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: 'white', fontSize: 10, borderRadius: '50%', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {notificaciones.filter(n => !n.leida).length}
              </span>
            )}
          </button>
          <button type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'rgba(212, 175, 55, 0.05)',
              border: '1.5px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '10px',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Área de contenido scrolleable independiente (estilo chats de WhatsApp) */}
      <main
        ref={mainRef}
        className="content-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          paddingBottom: 'calc(160px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {activeTab === 'inicio' && <ScreenInicio />}
        {activeTab === 'barberos' && <ScreenBarberos />}
        {activeTab === 'panel' && <ScreenPanel onNavigateToSettings={() => setActiveTab('ajustes')} />}
        {activeTab === 'ajustes' && <ScreenAjustes onNombreChange={setNombreBarberia} initialDriveTab={driveConfigOpen} onDriveTabOpenHandled={() => setDriveConfigOpen(false)} />}
      </main>

      {/* Tab Bar */}
      <PremiumNavBar
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        items={TABS}
        scrollContainerRef={mainRef}
      />
    </div>

    {/* Modal Notificaciones Global */}
    {showNotifModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowNotifModal(false)}>
        <div style={{ background: 'var(--black-card)', border: '1px solid var(--black-border)', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--black-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--gold)', fontSize: 18 }}>Notificaciones</h3>
            <button onClick={() => setShowNotifModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--gray-text)', cursor: 'pointer' }}>
              <Bell size={20} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
            {notificaciones.length === 0 ? (
              <p style={{ color: 'var(--gray-text)', textAlign: 'center', marginTop: 32 }}>No hay notificaciones</p>
            ) : (
              notificaciones.map(n => (
                <div key={n.id} style={{ padding: 12, borderRadius: 12, background: n.leida ? 'rgba(255,255,255,0.02)' : 'rgba(212,175,55,0.06)', border: '1px solid var(--black-border)', marginBottom: 12, cursor: 'pointer' }} onClick={() => !n.leida && marcarLeida(n.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <strong style={{ color: 'var(--gold)', fontSize: 14 }}>{n.titulo}</strong>
                      <p style={{ margin: '4px 0', color: 'var(--white-soft)', fontSize: 13 }}>{n.mensaje}</p>
                      <span style={{ fontSize: 11, color: 'var(--gray-text)' }}>{new Date(n.fecha).toLocaleString()}</span>
                      {n.tipo === 'drive_desconectado' && (
                        <div style={{ marginTop: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); setShowNotifModal(false); setActiveTab('ajustes'); setDriveConfigOpen(true); }} style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: 'var(--gold)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>Configurar Google Drive</button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!n.leida && (
                        <button onClick={(e) => { e.stopPropagation(); marcarLeida(n.id); }} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>Leída</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); eliminar(n.id); }} style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)', color: 'var(--danger)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>Eliminar</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
