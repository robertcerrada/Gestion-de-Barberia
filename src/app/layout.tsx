import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import ClientProviders from '@/components/ClientProviders';
import Script from 'next/script';
import { AppConfigProvider } from '@/lib/useAppConfig';
import { LanguageProvider } from '@/shared/i18n/LanguageContext';

import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-display',
});

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
  maximumScale: 5,
  userScalable: true,
  themeColor: '#D4AF37',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const googleConfigured = !!(clientId && !clientId.includes('PON_TU_CLIENT_ID'));

  return (
    <html lang="es" className={`${playfairDisplay.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        {/* Favicon e iconos */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192" />
        {/* Apple touch icon — usa 512 para mejor calidad en iOS */}
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />


        {/* Service Worker — inline para no bloquear el render */}
        <Script strategy="afterInteractive" id="sw-register">
          {`
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
`}
        </Script>
      </head>
      <body className="bg-noise-texture">
        {/* Script inline para aplicar tema ANTES del primer render — evita flash */}
        {/* SEGURIDAD: validar valores de localStorage contra lista blanca antes de usarlos como atributos DOM */}
        <Script id="theme-init" strategy="beforeInteractive">
{`
(function(){
  var TEMAS = ['dark', 'light'];
  var LANGS = ['es', 'en', 'pt', 'de', 'fr', 'ar'];
  var t = localStorage.getItem('barberia_theme');
  var l = localStorage.getItem('barberia_lang');
  if (!TEMAS.includes(t)) t = 'dark';
  if (!LANGS.includes(l)) l = 'es';
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('lang', l);
  document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
})();
`}
</Script>
        <div className="ambient-glow" />
          <LanguageProvider>
            <AppConfigProvider>
              <ClientProviders clientId={clientId} googleConfigured={googleConfigured}>
                {children}
              </ClientProviders>
            </AppConfigProvider>
          </LanguageProvider>
      </body>
    </html>
  );
}
