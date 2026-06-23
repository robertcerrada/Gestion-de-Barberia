/**
 * Abstracción de persistencia de idioma
 *
 * RESPONSABILIDAD ÚNICA:
 * - Manejo seguro de localStorage
 * - Validación de datos
 * - Sincronización cross-tab
 */

import { Locale, isValidLocale } from './types';
import { STORAGE_KEYS, SECURITY } from '../constants';

export class LanguageStorageManager {
  private static isStorageAvailable(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      const test = '__storage_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Carga el idioma guardado de forma segura
   * @returns Locale válido o null si no hay guardado
   */
  static loadLocale(): Locale | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    try {
      let saved = window.localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      
      // Fallback a la clave legacy de useAppConfig
      if (!saved) {
        saved = window.localStorage.getItem('barberia_lang');
      }

      // SEGURIDAD: Validar tipo y longitud
      if (
        !saved ||
        saved.length > SECURITY.MAX_LOCALE_LENGTH ||
        !isValidLocale(saved)
      ) {
        return null;
      }

      return saved;
    } catch (error) {
      // localStorage puede fallar en modos privados, iframes, etc.
      console.warn('[i18n] Error al leer localStorage:', error);
      return null;
    }
  }

  /**
   * Guarda idioma de forma segura
   * @param locale Idioma a guardar
   */
  static saveLocale(locale: Locale): void {
    if (!this.isStorageAvailable() || !isValidLocale(locale)) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEYS.LANGUAGE, locale);
    } catch (error) {
      console.warn('[i18n] Error al guardar en localStorage:', error);
      // Silencioso: no romper la app si localStorage no funciona
    }
  }

  /**
   * Limpia el idioma guardado
   */
  static clearLocale(): void {
    if (!this.isStorageAvailable()) return;

    try {
      window.localStorage.removeItem(STORAGE_KEYS.LANGUAGE);
    } catch (error) {
      console.warn('[i18n] Error al limpiar localStorage:', error);
    }
  }

  /**
   * Escucha cambios de localStorage desde otras pestañas/ventanas
   * Permite sincronización cross-tab
   */
  static onStorageChange(callback: (locale: Locale | null) => void): () => void {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.LANGUAGE) return;

      const newValue = event.newValue;
      if (!newValue || !isValidLocale(newValue)) {
        callback(null);
      } else {
        callback(newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Retorna función para desuscribirse
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}
