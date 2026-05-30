'use client';

// src/components/LanguageSelector.tsx
import { useLanguage, Locale } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{t('language.select')}:</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="es">{t('language.es')}</option>
        <option value="en">{t('language.en')}</option>
      </select>
    </div>
  );
}
