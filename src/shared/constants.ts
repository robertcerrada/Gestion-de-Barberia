// Constantes globales de seguridad y configuración

export const STORAGE_KEYS = {
  LANGUAGE: 'barberia_locale',
  // Agregar más keys aquí siguiendo patrón
} as const;

export const SECURITY = {
  // Validación de tamaño máximo para strings en localStorage
  MAX_LOCALE_LENGTH: 10,

  // Timeout para sincronización cross-tab
  STORAGE_SYNC_TIMEOUT: 100, // ms
} as const;