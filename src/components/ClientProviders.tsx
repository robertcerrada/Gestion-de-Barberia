import React, { ReactNode } from 'react';
import { LanguageProvider } from '@/shared/i18n/LanguageContext';
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
 *
 * - LanguageProvider: contexto de traducciones del Sistema B (i18n anidado).
 * - GoogleOAuthProvider: opcional, solo si se configuró el clientId.
 */
export default function ClientProviders({
  clientId,
  googleConfigured,
  children,
}: ClientProvidersProps) {
  return (
    <LanguageProvider>
      {googleConfigured ? (
        <GoogleOAuthProvider clientId={clientId}>
          {children}
        </GoogleOAuthProvider>
      ) : (
        children
      )}
    </LanguageProvider>
  );
}
