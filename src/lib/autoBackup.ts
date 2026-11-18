/**
 * Auto backup a Google Drive cada vez que hay una modificación en la base de datos local.
 * Solo se ejecuta si Drive está conectado (token de acceso presente).
 * Usa debounce de 5s para evitar múltiples subidas consecutivas.
 */
'use client';

import { db } from './db';
import { exportarAGoogleDrive, isDriveConnected } from './drive';

let backupTimeout: number | null = null;
const DEBOUNCE_MS = 5000;

async function runBackup() {
  if (!isDriveConnected()) return;
  try {
    await exportarAGoogleDrive();
  } catch (e) {
    // Silencioso: el backup automático no debe bloquear la UI
    console.warn('[autoBackup] Error al respaldar en Drive:', e);
  }
}

function scheduleBackup() {
  if (!isDriveConnected()) return;
  if (backupTimeout) window.clearTimeout(backupTimeout);
  backupTimeout = window.setTimeout(() => {
    runBackup();
  }, DEBOUNCE_MS);
}

// Registrar hooks en todas las tablas de Dexie
// Se ejecuta una sola vez al importar este módulo
if (typeof window !== 'undefined') {
  db.tables.forEach((table) => {
    // Dexie hook API: creating / updating / deleting
    table.hook('creating', () => scheduleBackup());
    table.hook('updating', () => scheduleBackup());
    table.hook('deleting', () => scheduleBackup());
  });
}

// Exportar para poder disparar manualmente si se necesita
export function triggerAutoBackup() {
  scheduleBackup();
}
