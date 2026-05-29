/**
 * auth.ts — Gestión de autenticación Google + PIN
 *
 * La lista de emails autorizados se guarda en config_barberia (clave: 'authorized_emails')
 * como JSON array. Si está vacía, cualquier cuenta de Google puede entrar
 * (útil para el primer acceso; luego el dueño la restringe desde Ajustes).
 */

import { getConfig, setConfig } from './db';

export const AUTH_TOKEN_KEY      = 'barberia_auth_token';
export const GOOGLE_TOKEN_KEY    = 'google_access_token';
export const GOOGLE_USER_KEY     = 'google_user_info';
export const PIN_HASH_KEY        = 'barberia_pin_hash';
export const PIN_SALT_KEY        = 'barberia_pin_salt';
export const DEFAULT_PIN         = '1234';

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
  sub?: string;         // Google ID único (opcional cuando el token sólo se usa para sesión local)
}

// ── Emails autorizados ──────────────────────────────────────────
export async function getAuthorizedEmails(): Promise<string[]> {
  const raw = await getConfig('authorized_emails');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function setAuthorizedEmails(emails: string[]): Promise<void> {
  await setConfig('authorized_emails', JSON.stringify(emails.map(e => e.toLowerCase().trim()).filter(Boolean)));
}

export async function isEmailAuthorized(email: string): Promise<boolean> {
  const list = await getAuthorizedEmails();
  if (list.length === 0) return true; // lista vacía = acceso abierto (primer setup)
  return list.includes(email.toLowerCase().trim());
}

// ── Sesión de app ───────────────────────────────────────────────
function getStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.sessionStorage : null;
}

function getStoredValue(key: string): string | null {
  const storage = getStorage();
  return storage?.getItem(key) ?? null;
}

function setStoredValue(key: string, value: string): void {
  const storage = getStorage();
  storage?.setItem(key, value);
}

function removeStoredValue(key: string): void {
  const storage = getStorage();
  storage?.removeItem(key);
}

export function getAppToken(): string | null {
  return getStoredValue(AUTH_TOKEN_KEY);
}

export function setAppToken(token: string): void {
  setStoredValue(AUTH_TOKEN_KEY, token);
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

async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
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

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = getPinHash();
  const salt = getPinSalt();

  if (hash && salt) {
    return await hashValue(`${salt}:${pin}`) === hash;
  }

  const legacy = getLegacyPin();
  if (legacy) {
    const valid = legacy === pin;
    if (valid) await savePin(pin);
    if (typeof window !== 'undefined') window.localStorage.removeItem('barberia_pin');
    return valid;
  }

  return pin === DEFAULT_PIN;
}

export async function savePin(pin: string): Promise<void> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const hash = await hashValue(`${salt}:${pin}`);
  setStoredValue(PIN_HASH_KEY, hash);
  setStoredValue(PIN_SALT_KEY, salt);
}
