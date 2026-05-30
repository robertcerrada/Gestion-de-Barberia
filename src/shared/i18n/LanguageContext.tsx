'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

import es from '@/locales/es.json';
import en from '@/locales/en.json';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Locale = 'es' | 'en';

// Tipo recursivo que refleja la forma anidada del JSON
type NestedMessages = {
  [key: string]: string | NestedMessages;
};

// Acceso por ruta con puntos: "appointments.status.pending"
type DotPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends object
    ? DotPath<T[K], `${Prefix}${K}.`>
    : never;
}[keyof T & string];

export type TranslationKey = DotPath<typeof es>;

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

// ─── Diccionarios ─────────────────────────────────────────────────────────────

const dictionaries: Record<Locale, NestedMessages> = { es, en };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Navega el objeto anidado usando una clave con puntos.
 * t("appointments.status.pending") → "Pendiente"
 */
function resolvePath(obj: NestedMessages, path: string): string | undefined {
  const parts = path.split('.');
  let current: string | NestedMessages | undefined = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as NestedMessages)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

const STORAGE_KEY = 'barberia_locale';

// ─── Context ─────────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface LanguageProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function LanguageProvider({
  children,
  defaultLocale = 'es',
}: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Restaurar idioma guardado en localStorage (solo en cliente)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === 'es' || saved === 'en')) {
        setLocaleState(saved);
      }
    } catch {
      // localStorage no disponible (SSR o modo privado)
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // silencioso
    }
  }, []);

  /**
   * Función de traducción principal.
   * Usa la clave con puntos para acceder al diccionario del idioma activo.
   * Si no encuentra la clave, devuelve el fallback o la clave misma.
   */
  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const dict = dictionaries[locale];
      const value = resolvePath(dict, key);

      if (value !== undefined) return value;

      // Si falla en el idioma activo, intenta con español como base
      if (locale !== 'es') {
        const fallbackValue = resolvePath(dictionaries['es'], key);
        if (fallbackValue !== undefined) return fallbackValue;
      }

      // Último recurso: fallback manual o la clave misma
      return fallback ?? key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook para usar en cualquier componente:
 *
 * const { t, locale, setLocale } = useLanguage();
 * <h1>{t('appointments.title')}</h1>
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de <LanguageProvider>');
  }
  return context;
}
