'use client';

import { useState, useEffect, useRef } from 'react';
import { Home, BarChart3, Settings, Sun, Moon } from 'lucide-react';
import { seedInitialData, getConfig } from '@/lib/db';
import { getAppToken, setAppToken } from '@/lib/auth';
import { useAppConfig } from '@/lib/useAppConfig';
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
      safeSetErrorCarga('La base de datos tardó demasiado en cargar. Intentá recargar la página.');
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
          safeSetErrorCarga('Hubo un conflicto en la base de datos. Recargá la página o limpiá el caché del navegador.');
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
        safeSetErrorCarga('Ocurrió un error inesperado al iniciar la app. Recargá la página.');
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
                ⚠️ {errorCarga}
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
                🔄 Recargar Aplicación
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
                Cargando Sistema
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
  const { t, theme, setTheme } = useAppConfig();
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
    <div style={{
      position: 'relative',
      zIndex: 1,
      height: '100dvh',
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
            {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <LanguageSelector />
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
          paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {activeTab === 'inicio' && <ScreenInicio />}
        {activeTab === 'barberos' && <ScreenBarberos />}
        {activeTab === 'panel' && <ScreenPanel />}
        {activeTab === 'ajustes' && <ScreenAjustes onNombreChange={setNombreBarberia} />}
      </main>

      {/* Tab Bar */}
      <PremiumNavBar
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        items={TABS}
        scrollContainerRef={mainRef}
      />
    </div>
  );
}
