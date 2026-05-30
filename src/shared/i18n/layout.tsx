// src/app/layout.tsx  ← SI usas App Router (Next.js 13+)

import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Barbería App',
  description: 'Sistema de gestión para barbería',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {/*
          ✅ LanguageProvider envuelve TODO.
          Cualquier componente hijo puede usar useLanguage() o useTranslation()
          sin importar qué tan anidado esté.
        */}
        <LanguageProvider defaultLocale="es">
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SI usas Pages Router (_app.tsx en lugar de layout.tsx), usa esto:
// ─────────────────────────────────────────────────────────────────────────────
//
// import type { AppProps } from 'next/app';
// import { LanguageProvider } from '@/contexts/LanguageContext';
//
// export default function MyApp({ Component, pageProps }: AppProps) {
//   return (
//     <LanguageProvider defaultLocale="es">
//       <Component {...pageProps} />
//     </LanguageProvider>
//   );
// }
