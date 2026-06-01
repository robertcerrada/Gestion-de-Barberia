'use client';

import { useLanguage } from '@/shared/i18n/LanguageContext';
import type { Locale } from '@/shared/i18n/types';

export default function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm text-gray-500">
        {t('language.select')}:
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="border rounded px-2 py-1 text-sm"
        aria-label="Seleccionar idioma"
      >
        <option value="es">{t('language.es')}</option>
        <option value="en">{t('language.en')}</option>
      </select>
    </div>
  );
}
