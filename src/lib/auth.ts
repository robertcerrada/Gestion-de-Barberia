/**
 * auth.ts — Gestión de autenticación Google + PIN
 *
 * SEGURIDAD:
 * - La lista de emails autorizados se guarda en config_barberia (clave: 'emails_autorizados').
 *   Si está vacía, el acceso Google está DENEGADO (excepto durante el primer setup).
 * - El PIN usa PBKDF2 con 200.000 iteraciones + salt de 16 bytes (Web Crypto API).
 * - Límite de intentos de PIN: 5 → bloqueo 15 min → 1h → 24h (exponential backoff).
 * - Google access token NO se persiste entre operaciones.
 */

import { getConfig, setConfig } from './db';

export const AUTH_TOKEN_KEY      = 'barberia_auth_token';
export const GOOGLE_TOKEN_KEY    = 'google_access_token';
export const GOOGLE_USER_KEY     = 'google_user_info';
export const PIN_HASH_KEY        = 'barberia_pin_hash';
export const PIN_SALT_KEY        = 'barberia_pin_salt';

// ── Comprobación de si el PIN ya fue configurado por el usuario ──────────────
export function isPinConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.localStorage.getItem(PIN_HASH_KEY) && window.localStorage.getItem(PIN_SALT_KEY));
}

// ── Rate limiting de intentos de PIN ─────────────────────────────────────────
const PIN_ATTEMPTS_KEY   = 'barberia_pin_attempts';
const PIN_LOCKOUT_KEY    = 'barberia_pin_lockout_until';
const MAX_ATTEMPTS       = 5;
// Tiempos de bloqueo en ms según número de ciclos de bloqueo
const LOCKOUT_DURATIONS  = [15 * 60_000, 60 * 60_000, 24 * 60 * 60_000];

export function getPinAttempts(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(window.localStorage.getItem(PIN_ATTEMPTS_KEY) ?? '0', 10);
}

export function getPinLockoutUntil(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(window.localStorage.getItem(PIN_LOCKOUT_KEY) ?? '0', 10);
}

export function isPinLocked(): boolean {
  return Date.now() < getPinLockoutUntil();
}

export function getPinLockoutRemainingMs(): number {
  return Math.max(0, getPinLockoutUntil() - Date.now());
}

function recordPinFailure(): void {
  if (typeof window === 'undefined') return;
  const attempts = getPinAttempts() + 1;
  window.localStorage.setItem(PIN_ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    // Calcular nivel de bloqueo: cuántas veces se ha llegado al límite
    const lockoutCycles = Math.floor(attempts / MAX_ATTEMPTS) - 1;
    const duration = LOCKOUT_DURATIONS[Math.min(lockoutCycles, LOCKOUT_DURATIONS.length - 1)];
    const until = Date.now() + duration;
    window.localStorage.setItem(PIN_LOCKOUT_KEY, String(until));
  }
}

function resetPinAttempts(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PIN_ATTEMPTS_KEY);
  window.localStorage.removeItem(PIN_LOCKOUT_KEY);
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
  sub?: string;         // Google ID único (opcional cuando el token sólo se usa para sesión local)
}

// ── Emails autorizados ──────────────────────────────────────────
export async function getAuthorizedEmails(): Promise<string[]> {
  // Soportamos ambas claves por compatibilidad con versiones anteriores

  const emailsConfig = (await getConfig('emails_autorizados')) ?? (await getConfig('authorized_emails'));
  if (!emailsConfig) return [];
  // Puede estar guardado como CSV (clave 'emails_autorizados') o JSON (legacy)
  const trimmed = emailsConfig.trim();
  if (trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { return []; }
  }
  return emailsConfig.split(',').flatMap(e => { const t = e.trim().toLowerCase(); return t ? [t] : []; });
}

export async function setAuthorizedEmails(emails: string[]): Promise<void> {
  const clean = emails.flatMap(e => { const t = e.toLowerCase().trim(); return t ? [t] : []; });
  await setConfig('emails_autorizados', clean.join(', '));
}

/**
 * SECURITY: lista vacía = ACCESO DENEGADO.
 * Solo se permite acceso abierto si explícitamente está en modo primer-setup
 * (parámetro allowEmptyList = true), que solo se usa durante el onboarding.
 */
export async function isEmailAuthorized(email: string, allowEmptyList = false): Promise<boolean> {
  const list = await getAuthorizedEmails();
  if (list.length === 0) return allowEmptyList;
  return list.includes(email.toLowerCase().trim());
}

// ── Sesión de app ───────────────────────────────────────────────
// Tokens de sesión: sessionStorage (se borran al cerrar el navegador — correcto).
// Hash/salt del PIN: localStorage (deben sobrevivir entre sesiones).
const SESSION_KEYS = new Set([AUTH_TOKEN_KEY, GOOGLE_TOKEN_KEY, GOOGLE_USER_KEY]);

function getStorageFor(key: string): Storage | null {
  if (typeof window === 'undefined') return null;
  return SESSION_KEYS.has(key) ? window.sessionStorage : window.localStorage;
}

function getStoredValue(key: string): string | null {
  return getStorageFor(key)?.getItem(key) ?? null;
}

function setStoredValue(key: string, value: string): void {
  getStorageFor(key)?.setItem(key, value);
}

function removeStoredValue(key: string): void {
  getStorageFor(key)?.removeItem(key);
}

export function getAppToken(): string | null {
  return getStoredValue(AUTH_TOKEN_KEY);
}

export function setAppToken(token: string): void {
  setStoredValue(AUTH_TOKEN_KEY, token);
}

export function createAppSessionToken(source: 'pin' | 'google'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const random = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${source}_${Date.now().toString(36)}_${random}`;
}

export function clearAppToken(): void {
  removeStoredValue(AUTH_TOKEN_KEY);
}

// ── Sesión de Google (Drive + Login) ────────────────────────────
export function getGoogleToken(): string | null {
  return getStoredValue(GOOGLE_TOKEN_KEY);
}

export function setGoogleToken(token: string): void {
  setStoredValue(GOOGLE_TOKEN_KEY, token);
}

export function clearGoogleToken(): void {
  removeStoredValue(GOOGLE_TOKEN_KEY);
}

export function getGoogleUser(): GoogleUserInfo | null {
  const raw = getStoredValue(GOOGLE_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setGoogleUser(user: GoogleUserInfo): void {
  setStoredValue(GOOGLE_USER_KEY, JSON.stringify(user));
}

export function clearGoogleUser(): void {
  removeStoredValue(GOOGLE_USER_KEY);
}

// ── Obtener info del usuario desde Google ───────────────────────
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('No se pudo obtener la información del usuario de Google.');
  const data = await res.json();
  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
    sub: data.sub,
  };
}

// ── Logout completo ─────────────────────────────────────────────
export function logoutAll(): void {
  clearAppToken();
  clearGoogleToken();
  clearGoogleUser();
}

// ── Derivación de clave con PBKDF2 (200.000 iteraciones) ────────────────────
async function derivePinKey(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)!.map(h => parseInt(h, 16))
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getPinHash(): string | null {
  return getStoredValue(PIN_HASH_KEY);
}

function getPinSalt(): string | null {
  return getStoredValue(PIN_SALT_KEY);
}

function getLegacyPin(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('barberia_pin');
}

/**
 * Verifica el PIN con rate limiting.
 * Lanza un error si está bloqueado para que el caller pueda mostrar el tiempo restante.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  if (isPinLocked()) {
    throw new Error(`PIN bloqueado. Intentá en ${Math.ceil(getPinLockoutRemainingMs() / 60_000)} minutos.`);
  }

  const hash = getPinHash();
  const salt = getPinSalt();

  let valid = false;

  if (hash && salt) {
    // Verificar si el hash tiene formato PBKDF2 (longitud 64 hex = 256 bits)
    // o SHA-256 legacy (también 64 hex, pero distinguimos por prefijo en salt)
    const isPbkdf2 = salt.startsWith('pbkdf2:');
    if (isPbkdf2) {
      const realSalt = salt.slice(7);
      valid = (await derivePinKey(pin, realSalt)) === hash;
    } else {
      // Legacy SHA-256: migrar en caliente si el PIN es correcto
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}:${pin}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const legacyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      valid = legacyHash === hash;
      if (valid) {
        // Migrar a PBKDF2 silenciosamente
        await savePin(pin);
      }
    }
  } else {
    // PIN de texto plano legacy
    const legacy = getLegacyPin();
    if (legacy) {
      valid = legacy === pin;
      if (valid) {
        await savePin(pin);
        if (typeof window !== 'undefined') window.localStorage.removeItem('barberia_pin');
      }
    }
    // Sin ningún PIN configurado: no hay PIN por defecto — forzar configuración
  }

  if (valid) {
    resetPinAttempts();
  } else {
    recordPinFailure();
  }

  return valid;
}

export async function savePin(pin: string): Promise<void> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = await derivePinKey(pin, saltHex);
  setStoredValue(PIN_HASH_KEY, hash);
  // Prefijo 'pbkdf2:' para distinguir del hash SHA-256 legacy
  setStoredValue(PIN_SALT_KEY, `pbkdf2:${saltHex}`);
}
