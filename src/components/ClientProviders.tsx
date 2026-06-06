import React, { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface ClientProvidersProps {
  clientId: string;
  googleConfigured: boolean;
  children: ReactNode;
}

/**
 * Centraliza todos los proveedores globales de la aplicación.
 * NOTA: AppConfigProvider NO se incluye aquí — ya está en app/layout.tsx.
 * Incluirlo aquí causaría un contexto duplicado donde el exterior nunca
 * recibiría las actualizaciones del interior.
 */
export default function ClientProviders({
  clientId,
  googleConfigured,
  children,
}: ClientProvidersProps) {
  return googleConfigured ? (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  ) : (
    <>{children}</>
  );
}
