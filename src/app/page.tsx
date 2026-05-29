'use client';

import { useState, useEffect } from 'react';
import { Home, Users, BarChart3, Settings } from 'lucide-react';
import { seedInitialData } from '@/lib/db';
import { getConfig } from '@/lib/db';
import { getAppToken, setAppToken } from '@/lib/auth';
import ScreenInicio from '@/components/screens/ScreenInicio';
import ScreenBarberos from '@/components/screens/ScreenBarberos';
import ScreenPanel from '@/components/screens/ScreenPanel';
import ScreenAjustes from '@/components/screens/ScreenAjustes';
import ScreenLogin from '@/components/screens/ScreenLogin';
import PremiumNavBar from '@/components/PremiumNavBar';

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'barberos', label: 'Barberos', icon: Users },
  { id: 'panel', label: 'Panel', icon: BarChart3 },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
] as const;

type Tab = typeof TABS[number]['id'];

function AppLogo({ size = 32, className = '', src }: { size?: number; className?: string; src?: string }) {
  return (
    <img
      src={src || '/Logo.jpg'}
      alt="Logo"
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
    />
  );
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nombreBarberia, setNombreBarberia] = useState('Gestión de Barberia');
  const [logoSrc, setLogoSrc] = useState('/Logo.jpg');
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    const token = getAppToken();
    if (token) setIsAuthenticated(true);

    const iniciar = async () => {
      // Timeout de seguridad: si en 10s no cargó, mostrar error
      const timeout = setTimeout(() => {
        setErrorCarga('La base de datos tardó demasiado en cargar. Intentá recargar la página.');
        setReady(true);
      }, 10000);

      try {
        await seedInitialData();
      } catch (e) {
        console.error('Error en seedInitialData:', e);
        // Si falla la DB (ej: versión bloqueada), intentar recuperar
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('VersionError') || msg.includes('blocked') || msg.includes('version')) {
          setErrorCarga('Hubo un conflicto en la base de datos. Recargá la página o limpiá el caché del navegador.');
          clearTimeout(timeout);
          setReady(true);
          return;
        }
      }
      try {
        const nombre = await getConfig('nombre_barberia');
        if (nombre) setNombreBarberia(nombre);
      } catch (e) {
        console.error('Error cargando nombre:', e);
      }
      try {
        const logo = await getConfig('logo_data');
        if (logo) setLogoSrc(logo);
      } catch (e) {
        console.error('Error cargando logo:', e);
      }
      clearTimeout(timeout);
      setReady(true);
    };

    iniciar();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handleLogoUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src) setLogoSrc(detail.src);
    };
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-6" style={{ background: 'var(--black-deep)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 24px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
            boxShadow: '0 0 40px rgba(212,175,55,0.4)',
            animation: errorCarga ? 'none' : 'goldPulse 2s ease infinite'
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
                    color: 'var(--gold)', fontSize: 14, fontWeight: 600, cursor: 'pointer'
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

  if (!isAuthenticated) {
    return (
      <ScreenLogin
        nombreBarberia={nombreBarberia}
        logoSrc={logoSrc}
        onLoginSuccess={(token, email) => {
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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
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
        {activeTab === 'inicio' && <ScreenInicio />}
        {activeTab === 'barberos' && <ScreenBarberos />}
        {activeTab === 'panel' && <ScreenPanel />}
        {activeTab === 'ajustes' && <ScreenAjustes onNombreChange={setNombreBarberia} />}
      </main>

      {/* Tab Bar - Premium Navigation */}
      <PremiumNavBar
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        items={TABS}
      />
    </div>
  );
}
