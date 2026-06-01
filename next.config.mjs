/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // SEGURIDAD: NO ignorar errores de TypeScript ni ESLint en builds de producción.
  // eslint: { ignoreDuringBuilds: true }  <-- ELIMINADO
  // typescript: { ignoreBuildErrors: true } <-- ELIMINADO

  async headers() {
    // En desarrollo, agregar 'unsafe-eval' para que funcione Fast Refresh
    const isDev = process.env.NODE_ENV === 'development';
    const scriptSrcParts = ["'self'", "'unsafe-inline'", "accounts.google.com", "apis.google.com"];
    if (isDev) {
      scriptSrcParts.push("'unsafe-eval'");
    }
    
    return [
      // ── Seguridad global: aplica a todas las rutas ──────────────────────────
      {
        source: '/(.*)',
        headers: [
          // Content-Security-Policy
          // - 'unsafe-inline' solo en style-src y script-src por los scripts inline
          //   de layout.tsx (tema + SW). Migrar a nonces cuando sea posible.
          // - 'unsafe-eval' solo en DESARROLLO (necesario para Fast Refresh)
          // - accounts.google.com + apis.google.com: OAuth y tokeninfo
          // - fonts.googleapis.com / fonts.gstatic.com: Google Fonts
          // - lh3.googleusercontent.com: avatares de Google
          // - www.googleapis.com / drive.google.com: Google Drive backup
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrcParts.join(' ')}`,
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: lh3.googleusercontent.com",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://apis.google.com",
              "frame-src accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Impide que la app sea embebida en iframes ajenos (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Impide sniffing del tipo MIME
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Habilita protección XSS del navegador (legacy, no reemplaza CSP)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // No enviar Referer a orígenes externos
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Fuerza HTTPS durante 1 año (solo activar si el dominio es 100% HTTPS)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Limita acceso a APIs del navegador (geolocation, cámara, etc.)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // ── Service Worker ────────────────────────────────────────────────────
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // ── Manifest PWA ──────────────────────────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

export default nextConfig;
