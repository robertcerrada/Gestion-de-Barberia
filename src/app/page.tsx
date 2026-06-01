'use client';

import { useState, useEffect } from 'react';
import { Home, BarChart3, Settings } from 'lucide-react';
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

type Tab = 'inicio' | 'barberos' | 'panel' | 'ajustes';

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
    const timeout = setTimeout(() => {
      setErrorCarga('La base de datos tardó demasiado en cargar. Intentá recargar la página.');
      setReady(true);
    }, 10000);

    const iniciar = async () => {
      try {
        await seedInitialData();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('VersionError') || msg.includes('blocked') || msg.includes('version')) {
          setErrorCarga('Hubo un conflicto en la base de datos. Recargá la página o limpiá el caché del navegador.');
          clearTimeout(timeout);
          setReady(true);
          return;
        }
        console.error('Error en seedInitialData:', e);
      }

      try {
        const [nombre, logo] = await Promise.all([
          getConfig('nombre_barberia'),
          getConfig('logo_data'),
        ]);
        if (nombre) setNombreBarberia(nombre);
        if (logo) setLogoSrc(logo);
      } catch (e) {
        console.error('Error cargando configuración:', e);
      }

      clearTimeout(timeout);
      setReady(true);
    };

    iniciar();

    // NOTA: el registro del SW se hace en layout.tsx (con manejo de updatefound).
    // No registrar aquí para evitar doble registro.

    const handleLogoUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src) setLogoSrc(detail.src);
    };
    window.addEventListener('logo-updated', handleLogoUpdate);

    return () => {
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
    <div className="flex flex-col items-center justify-center min-h-dvh gap-6"
      style={{ background: 'var(--black-deep)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 24px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(212,175,55,0.4)',
          animation: errorCarga ? 'none' : 'goldPulse 2s ease infinite',
        }}>
          <AppLogo size={72} src={logoSrc} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold)', letterSpacing: '-0.01em' }}>
            {nombreBarberia}
          </p>
          {errorCarga ? (
            <>
              <p style={{ fontSize: 13, color: '#E05252', marginTop: 10, maxWidth: 280, lineHeight: 1.5 }}>
                ⚠️ {errorCarga}
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: 16, padding: '10px 24px', borderRadius: 10,
                  background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
                  color: 'var(--gold)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                🔄 Recargar
              </button>
            </>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--gray-muted)', marginTop: 4 }}>Cargando sistema...</p>
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
  const { t } = useAppConfig();

  const { ready, errorCarga, nombreBarberia, setNombreBarberia, logoSrc } = useAppLoader();

  // Las etiquetas de navegación ahora usan el sistema de i18n
  const TABS = [
    { id: 'inicio' as Tab, label: t('navHome'), icon: Home },
    { id: 'barberos' as Tab, label: t('navBarbers'), icon: ClipperIcon },
    { id: 'panel' as Tab, label: t('navPanel'), icon: BarChart3 },
    { id: 'ajustes' as Tab, label: t('navSettings'), icon: Settings },
  ];

  useEffect(() => {
    const token = getAppToken();
    if (token) setIsAuthenticated(true);
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
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--black-border)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppLogo size={34} src={logoSrc} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold)', fontWeight: 600 }}>
            {nombreBarberia}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--gray-muted)' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </header>

      {/* Screen Content */}
      <main className="content-area">
        {activeTab === 'inicio'   && <ScreenInicio />}
        {activeTab === 'barberos' && <ScreenBarberos />}
        {activeTab === 'panel'    && <ScreenPanel />}
        {activeTab === 'ajustes'  && <ScreenAjustes onNombreChange={setNombreBarberia} />}
      </main>

      {/* Tab Bar */}
      <PremiumNavBar
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        items={TABS}
      />
    </div>
  );
}
