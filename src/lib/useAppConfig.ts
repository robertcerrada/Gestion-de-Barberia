'use client';

import React, { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';
export type Lang = 'es' | 'en' | 'pt' | 'de' | 'fr' | 'ar';

// ─── Traducciones ─────────────────────────────────────────────────────────────
const translations: Record<Lang, Record<string, string>> = {
  es: {
    // General
    appearance: 'Apariencia e Idioma',
    theme: 'Tema',
    darkMode: 'Oscuro',
    lightMode: 'Claro',
    language: 'Idioma',
    settings: 'Ajustes',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    loading: 'Cargando...',
    success: 'Guardado correctamente',
    error: 'Ocurrió un error',
    // Navegación
    navHome: 'Inicio',
    navBarbers: 'Barberos',
    navPanel: 'Panel',
    navSettings: 'Ajustes',
    // Ajustes — secciones
    myBarberShop: 'Mi Barbería',
    administration: 'Administración',
    configNameLogo: 'Configurar Nombre y Logo',
    managePartners: 'Gestionar Socios',
    securityAccess: 'Seguridad y Acceso',
    currencyCommission: 'Moneda y Comisión Bancaria',
    manageBarbers: 'Gestionar Barberos',
    manageServices: 'Gestionar Servicios y Productos',
    cashFund: 'Fondo de Caja (Cambio)',
    // Botones comunes
    add: 'Agregar',
    edit: 'Editar',
    delete: 'Eliminar',
    activate: 'Activar',
    pause: 'Pausar',
    saveChanges: 'Guardar Cambios',
    addNew: 'Agregar Nuevo',
    // ScreenInicio
    registerSale: 'Registrar Venta',
    expenses: 'Gastos',
    advancePayment: 'Adelanto / Pago',
    cashAudit: 'Arqueo / Cerrar Caja del Día',
    quickRegister: 'Registro Rápido',
    todaySales: 'Ventas del Día',
    monthClosed: 'El mes está cerrado. Reabrilo en el Panel para agregar registros.',
    // Modales
    registerSaleTitle: 'Registrar Venta',
    registerExpenseTitle: 'Registrar Gasto',
    advanceTitle: 'Adelanto / Pago',
    cashAuditTitle: 'Arqueo de Caja',
  },
  en: {
    appearance: 'Appearance & Language',
    theme: 'Theme',
    darkMode: 'Dark',
    lightMode: 'Light',
    language: 'Language',
    settings: 'Settings',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading...',
    success: 'Saved successfully',
    error: 'An error occurred',
    navHome: 'Home',
    navBarbers: 'Barbers',
    navPanel: 'Panel',
    navSettings: 'Settings',
    myBarberShop: 'My Barber Shop',
    administration: 'Administration',
    configNameLogo: 'Configure Name & Logo',
    managePartners: 'Manage Partners',
    securityAccess: 'Security & Access',
    currencyCommission: 'Currency & Bank Commission',
    manageBarbers: 'Manage Barbers',
    manageServices: 'Manage Services & Products',
    cashFund: 'Cash Fund (Change)',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    activate: 'Activate',
    pause: 'Pause',
    saveChanges: 'Save Changes',
    addNew: 'Add New',
    registerSale: 'Register Sale',
    expenses: 'Expenses',
    advancePayment: 'Advance / Payment',
    cashAudit: 'Cash Audit / Close Day',
    quickRegister: 'Quick Register',
    todaySales: "Today's Sales",
    monthClosed: 'This month is closed. Reopen it in the Panel to add records.',
    registerSaleTitle: 'Register Sale',
    registerExpenseTitle: 'Register Expense',
    advanceTitle: 'Advance / Payment',
    cashAuditTitle: 'Cash Audit',
  },
  pt: {
    appearance: 'Aparência e Idioma',
    theme: 'Tema',
    darkMode: 'Escuro',
    lightMode: 'Claro',
    language: 'Idioma',
    settings: 'Configurações',
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    loading: 'Carregando...',
    success: 'Salvo com sucesso',
    error: 'Ocorreu um erro',
    navHome: 'Início',
    navBarbers: 'Barbeiros',
    navPanel: 'Painel',
    navSettings: 'Ajustes',
    myBarberShop: 'Minha Barbearia',
    administration: 'Administração',
    configNameLogo: 'Configurar Nome e Logo',
    managePartners: 'Gerenciar Sócios',
    securityAccess: 'Segurança e Acesso',
    currencyCommission: 'Moeda e Comissão Bancária',
    manageBarbers: 'Gerenciar Barbeiros',
    manageServices: 'Gerenciar Serviços e Produtos',
    cashFund: 'Fundo de Caixa (Troco)',
    add: 'Adicionar',
    edit: 'Editar',
    delete: 'Excluir',
    activate: 'Ativar',
    pause: 'Pausar',
    saveChanges: 'Salvar Alterações',
    addNew: 'Adicionar Novo',
    registerSale: 'Registrar Venda',
    expenses: 'Despesas',
    advancePayment: 'Adiantamento / Pagamento',
    cashAudit: 'Fechamento de Caixa',
    quickRegister: 'Registro Rápido',
    todaySales: 'Vendas do Dia',
    monthClosed: 'Este mês está fechado. Reabra no Painel para adicionar registros.',
    registerSaleTitle: 'Registrar Venda',
    registerExpenseTitle: 'Registrar Despesa',
    advanceTitle: 'Adiantamento / Pagamento',
    cashAuditTitle: 'Fechamento de Caixa',
  },
  de: {
    appearance: 'Darstellung & Sprache',
    theme: 'Thema',
    darkMode: 'Dunkel',
    lightMode: 'Hell',
    language: 'Sprache',
    settings: 'Einstellungen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    loading: 'Lädt...',
    success: 'Erfolgreich gespeichert',
    error: 'Ein Fehler ist aufgetreten',
    navHome: 'Start',
    navBarbers: 'Friseure',
    navPanel: 'Panel',
    navSettings: 'Einstellungen',
    myBarberShop: 'Mein Friseursalon',
    administration: 'Verwaltung',
    configNameLogo: 'Name & Logo konfigurieren',
    managePartners: 'Partner verwalten',
    securityAccess: 'Sicherheit & Zugang',
    currencyCommission: 'Währung & Bankprovision',
    manageBarbers: 'Friseure verwalten',
    manageServices: 'Dienste & Produkte verwalten',
    cashFund: 'Kassenfonds (Wechselgeld)',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    activate: 'Aktivieren',
    pause: 'Pausieren',
    saveChanges: 'Änderungen speichern',
    addNew: 'Neu hinzufügen',
    registerSale: 'Verkauf erfassen',
    expenses: 'Ausgaben',
    advancePayment: 'Vorschuss / Zahlung',
    cashAudit: 'Kassenabschluss',
    quickRegister: 'Schnellerfassung',
    todaySales: 'Heutige Verkäufe',
    monthClosed: 'Dieser Monat ist gesperrt. Öffne ihn im Panel.',
    registerSaleTitle: 'Verkauf erfassen',
    registerExpenseTitle: 'Ausgabe erfassen',
    advanceTitle: 'Vorschuss / Zahlung',
    cashAuditTitle: 'Kassenabschluss',
  },
  fr: {
    appearance: 'Apparence & Langue',
    theme: 'Thème',
    darkMode: 'Sombre',
    lightMode: 'Clair',
    language: 'Langue',
    settings: 'Paramètres',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    loading: 'Chargement...',
    success: 'Enregistré avec succès',
    error: 'Une erreur est survenue',
    navHome: 'Accueil',
    navBarbers: 'Coiffeurs',
    navPanel: 'Tableau',
    navSettings: 'Paramètres',
    myBarberShop: 'Mon Salon',
    administration: 'Administration',
    configNameLogo: 'Configurer Nom & Logo',
    managePartners: 'Gérer les Associés',
    securityAccess: 'Sécurité & Accès',
    currencyCommission: 'Devise & Commission Bancaire',
    manageBarbers: 'Gérer les Coiffeurs',
    manageServices: 'Gérer les Services & Produits',
    cashFund: 'Fonds de Caisse (Monnaie)',
    add: 'Ajouter',
    edit: 'Modifier',
    delete: 'Supprimer',
    activate: 'Activer',
    pause: 'Mettre en pause',
    saveChanges: 'Enregistrer les modifications',
    addNew: 'Ajouter nouveau',
    registerSale: 'Enregistrer une vente',
    expenses: 'Dépenses',
    advancePayment: 'Avance / Paiement',
    cashAudit: 'Clôture de caisse',
    quickRegister: 'Enregistrement rapide',
    todaySales: "Ventes d'aujourd'hui",
    monthClosed: 'Ce mois est clôturé. Rouvrez-le dans le Panel.',
    registerSaleTitle: 'Enregistrer une vente',
    registerExpenseTitle: 'Enregistrer une dépense',
    advanceTitle: 'Avance / Paiement',
    cashAuditTitle: 'Clôture de caisse',
  },
  ar: {
    appearance: 'المظهر واللغة',
    theme: 'المظهر',
    darkMode: 'داكن',
    lightMode: 'فاتح',
    language: 'اللغة',
    settings: 'الإعدادات',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    loading: 'جارٍ التحميل...',
    success: 'تم الحفظ بنجاح',
    error: 'حدث خطأ',
    navHome: 'الرئيسية',
    navBarbers: 'الحلاقون',
    navPanel: 'لوحة',
    navSettings: 'الإعدادات',
    myBarberShop: 'صالوني',
    administration: 'الإدارة',
    configNameLogo: 'إعداد الاسم والشعار',
    managePartners: 'إدارة الشركاء',
    securityAccess: 'الأمان والوصول',
    currencyCommission: 'العملة وعمولة البنك',
    manageBarbers: 'إدارة الحلاقين',
    manageServices: 'إدارة الخدمات والمنتجات',
    cashFund: 'صندوق النقد (الفكة)',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    activate: 'تفعيل',
    pause: 'إيقاف مؤقت',
    saveChanges: 'حفظ التغييرات',
    addNew: 'إضافة جديد',
    registerSale: 'تسجيل بيع',
    expenses: 'المصروفات',
    advancePayment: 'سلفة / دفعة',
    cashAudit: 'جرد الصندوق',
    quickRegister: 'تسجيل سريع',
    todaySales: 'مبيعات اليوم',
    monthClosed: 'هذا الشهر مغلق. أعد فتحه من اللوحة لإضافة سجلات.',
    registerSaleTitle: 'تسجيل بيع',
    registerExpenseTitle: 'تسجيل مصروف',
    advanceTitle: 'سلفة / دفعة',
    cashAuditTitle: 'جرد الصندوق',
  },
};

const STORAGE_THEME_KEY = 'barberia_theme';
const STORAGE_LANG_KEY = 'barberia_lang';

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
  const [theme, setThemeState] = useState<Theme>('dark');
  const [lang, setLangState] = useState<Lang>('es');

  // Cargar desde localStorage al montar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as Theme | null;
    const savedLang = localStorage.getItem(STORAGE_LANG_KEY) as Lang | null;
    const validThemes: Theme[] = ['dark', 'light'];
    const validLangs: Lang[] = ['es', 'en', 'pt', 'de', 'fr', 'ar'];
    if (savedTheme && validThemes.includes(savedTheme)) setThemeState(savedTheme);
    if (savedLang && validLangs.includes(savedLang)) setLangState(savedLang);
    if (savedLang && validLangs.includes(savedLang)) {
      document.documentElement.setAttribute('lang', savedLang);
      document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
    }
  }, []);

  // Aplicar tema al <html> cada vez que cambia
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('lang', lang);
    // Árabe: dirección RTL
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [theme, lang]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_THEME_KEY, t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_LANG_KEY, l);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[lang]?.[key] ?? translations['es']?.[key] ?? key;
    },
    [lang]
  );

  return React.createElement(
    AppConfigContext.Provider,
    { value: { theme, lang, setTheme, setLang, t } },
    children
  );
}

// ─── Hook para consumir el contexto global ────────────────────────────────────
// USAR ESTE HOOK en todos los componentes (no useAppConfig directamente)
export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    // Fallback si se usa fuera del Provider (no debería ocurrir)
    throw new Error('useAppConfig debe usarse dentro de AppConfigProvider');
  }
  return ctx;
}
