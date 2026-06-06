'use client';

import React, { useState, useEffect, useCallback, createContext, use, type ReactNode } from 'react';
import { useLanguage } from '@/shared/i18n/LanguageContext';


// Removed stray i18n integration; using internal translations
// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';
export type Lang = 'es' | 'en' | 'pt' | 'de' | 'fr' | 'ar';

const STORAGE_THEME_KEY = 'barberia_theme';

// ─── Tipos del contexto ───────────────────────────────────────────────────────
type AppConfigValue = {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AppConfigContext = createContext<AppConfigValue | null>(null);

// ─── Provider — gestiona el estado GLOBAL de tema e idioma ───────────────────
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as Theme | null;
    const validThemes: Theme[] = ['dark', 'light'];
    return savedTheme && validThemes.includes(savedTheme) ? savedTheme : 'dark';
  });
  const { locale, setLocale, t } = useLanguage();

  // Aplicar tema al <html> cada vez que cambia
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_THEME_KEY, t);
  }, []);

  return React.createElement(
    AppConfigContext.Provider,
    { value: { theme, lang: locale, setTheme, setLang: setLocale, t } },
    children
  );
}

// ─── Hook para consumir el contexto global ────────────────────────────────────
// USAR ESTE HOOK en todos los componentes (no useAppConfig directamente)
export function useAppConfig() {
  const ctx = use(AppConfigContext);
  if (!ctx) {
    // Fallback si se usa fuera del Provider (no debería ocurrir)
    throw new Error('useAppConfig debe usarse dentro de AppConfigProvider');
  }
  return ctx;
}

