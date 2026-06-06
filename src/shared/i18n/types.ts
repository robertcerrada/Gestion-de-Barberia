// Tipo Lang alineado con useAppConfig.ts (sistema principal de i18n)
export type Lang = 'es' | 'en' | 'pt' | 'de' | 'fr' | 'ar';

// Locale es el subconjunto soportado por LanguageContext (Sistema B)
export type Locale = 'es' | 'en' | 'pt' | 'de' | 'fr' | 'ar';

export const VALID_LOCALES: readonly Locale[] = ['es', 'en', 'pt', 'de', 'fr', 'ar'];

export type Dictionary = Record<string, string>;

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

/** Validar que un valor sea un Locale válido (SEGURIDAD) */
export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && VALID_LOCALES.includes(value as Locale);
}

