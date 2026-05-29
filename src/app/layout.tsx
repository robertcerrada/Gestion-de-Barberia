import type { Metadata, Viewport } from 'next';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppConfigProvider } from '@/lib/useAppConfig';
import './globals.css';

const APP_NAME = 'Templo Barber Shop';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Sistema de gestión para barbería — control de ingresos, barberos, gastos y utilidades.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,           // ← era 1, Lighthouse penaliza bloquear el zoom
  userScalable: true,        // ← era false, accesibilidad requiere true
  themeColor: '#D4AF37',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleConfigured = !!(clientId && !clientId.includes('PON_TU_CLIENT_ID'));

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Favicon e iconos */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Preconnect para Google Fonts — mejora LCP */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Fuentes con font-display=swap — evita FOIT */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        {/* Service Worker — inline para no bloquear el render */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg) {
                  reg.addEventListener('updatefound', function() {
                    var newSW = reg.installing;
                    if (newSW) {
                      newSW.addEventListener('statechange', function() {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                          newSW.postMessage('SKIP_WAITING');
                        }
                      });
                    }
                  });
                })
                .catch(function() {});
            });
          }
        ` }} />
      </head>
      <body className="bg-noise-texture">
        {/* Script inline para aplicar tema ANTES del primer render — evita flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('barberia_theme') || 'dark';
            var l = localStorage.getItem('barberia_lang') || 'es';
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.setAttribute('lang', l);
            document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
          })()
        ` }} />
        <div className="ambient-glow" />
        <AppConfigProvider>
          {googleConfigured ? (
            <GoogleOAuthProvider clientId={clientId}>
              {children}
            </GoogleOAuthProvider>
          ) : (
            children
          )}
        </AppConfigProvider>
      </body>
    </html>
  );
}
