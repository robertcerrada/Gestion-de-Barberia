/* eslint-disable @next/next/no-img-element */
'use client';

/**
 * AppLogo.tsx — Componente reutilizable para el logo de la barbería.
 * Usa un elemento <img> para evitar fallos de runtime cuando la fuente
 * del logo es dinámica (base64, URL externa o valores cargados desde DB).
 */

interface AppLogoProps {
  size?: number;
  className?: string;
  src?: string;
}

export default function AppLogo({ size = 32, className = '', src }: AppLogoProps) {
  const imgSrc = src || '/Logo.jpg';
  return (
    <img
      src={imgSrc}
      alt="Logo"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }}
    />
  );
}
