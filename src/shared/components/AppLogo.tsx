'use client';

/**
 * AppLogo.tsx — Componente reutilizable para el logo de la barbería.
 *
 * Extraído de page.tsx donde estaba definido inline.
 * Puede usarse en el header, splash screen, y ScreenLogin.
 */

interface AppLogoProps {
  size?: number;
  className?: string;
  src?: string;
}

export default function AppLogo({ size = 32, className = '', src }: AppLogoProps) {
  return (
    <img
      src={src || '/Logo.jpg'}
      alt="Logo"
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
}
