/**
 * Re-exporta useLanguage con el alias "useTranslation"
 * para que sea más intuitivo de usar en componentes.
 *
 * Uso:
 *   const { t } = useTranslation();
 *   <button>{t('common.save')}</button>
 */
export { useLanguage as useTranslation } from '@/contexts/LanguageContext';
