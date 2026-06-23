'use client';

import { useLanguage } from './LanguageContext';
import { Locale, VALID_LOCALES } from './types';

// Etiquetas nativas de cada idioma (se muestran en su propia escritura).
const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  de: 'Deutsch',
  fr: 'Français',
  ar: 'العربية',
};

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        style={{
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1.5px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '10px',
          padding: '0 8px',
          height: 34,
          color: 'var(--gold)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
        }}
        aria-label={t('language.select')}
      >
        {VALID_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}