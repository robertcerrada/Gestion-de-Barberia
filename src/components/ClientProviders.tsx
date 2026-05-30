import React, { ReactNode } from 'react';
import { AppConfigProvider } from '@/lib/useAppConfig';
import { LanguageProvider } from '@/shared/i18n/LanguageContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

interface ClientProvidersProps {
  clientId: string;
  googleConfigured: boolean;
  children: ReactNode;
}

/**
 * Centraliza todos los proveedores globales de la aplicación.
 * - AppConfigProvider: gestión de tema y idioma persistido.
 * - LanguageProvider: contexto de traducciones (i18n).
 * - GoogleOAuthProvider: opcional, solo si se configuró el clientId.
 */
export default function ClientProviders({
  clientId,
  googleConfigured,
  children,
}: ClientProvidersProps) {
  return (
    <AppConfigProvider>
      <LanguageProvider>
        {googleConfigured ? (
          <GoogleOAuthProvider clientId={clientId}>
            {children}
          </GoogleOAuthProvider>
        ) : (
          children
        )}
      </LanguageProvider>
    </AppConfigProvider>
  );
}
