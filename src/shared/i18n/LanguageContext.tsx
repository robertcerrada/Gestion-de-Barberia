'use client';

import React, {
  createContext,
  use,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

import es from './dictionaries/es.json';
import en from './dictionaries/en.json';
import pt from './dictionaries/pt.json';
import de from './dictionaries/de.json';
import fr from './dictionaries/fr.json';
import ar from './dictionaries/ar.json';
import { Locale, isValidLocale } from './types';
import { LanguageStorageManager } from './LanguageStorage';

// ─── Types ───────────────────────────────────────────────────────────────────

// Tipo recursivo que refleja la forma anidada del JSON
type NestedMessages = {
  [key: string]: string | NestedMessages;
};

export type TranslationKey = string;

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

// ─── Diccionarios ─────────────────────────────────────────────────────────────

const dictionaries: Record<Locale, NestedMessages> = { es, en, pt, de, fr, ar };

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
  // REFACTOR CRÍTICO: Usar inicializador de función en useState
  // Esto se ejecuta UNA SOLA VEZ durante el montaje, NO genera setState en effect
  // Patrón recomendado por React docs para inicialización compleja
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = LanguageStorageManager.loadLocale();
    return saved && isValidLocale(saved) ? saved : defaultLocale;
  });

  // Effect SOLO para sincronización cross-tab
  // No modifica estado directamente, solo escucha cambios externos
  useEffect(() => {
    const unsubscribe = LanguageStorageManager.onStorageChange((newLocale) => {
      if (newLocale && isValidLocale(newLocale)) {
        setLocaleState(newLocale);
      }
    });

    return unsubscribe;
  }, []);

  // Aplicar atributos al <html> cada vez que cambia el idioma
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, [locale]);

  // Callback para cambiar idioma
  const setLocale = useCallback((newLocale: Locale) => {
    if (!isValidLocale(newLocale)) {
      console.warn('[i18n] Intento de establecer idioma inválido:', newLocale);
      return;
    }

    setLocaleState(newLocale);
    LanguageStorageManager.saveLocale(newLocale);

    // Emitir evento custom para sincronización manual si es necesario
    window.dispatchEvent(
      new CustomEvent('languagechange', { detail: { locale: newLocale } })
    );
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

  const value: LanguageContextValue = {
    locale,
    setLocale,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
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
  const context = use(LanguageContext);
  if (!context) {
    throw new Error('useLanguage debe usarse dentro de <LanguageProvider>');
  }
  return context;
}
