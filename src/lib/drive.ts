'use client';

import { exportarTodosLosDatos, restaurarDesdeDatos } from './business';
import { getGoogleToken, setGoogleToken, clearGoogleToken } from './auth';

const BACKUP_FILE_NAME = 'barberia_backup.json';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function getAccessToken(): string | null {
  return getGoogleToken();
}

export function setAccessToken(token: string) {
  setGoogleToken(token);
}

export function clearAccessToken() {
  clearGoogleToken();
}

export function isDriveConnected(): boolean {
  const token = getAccessToken();
  return !!token;
}

export async function getLastBackupInfo(): Promise<{ date: string; size: number } | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name,createdTime,size)&orderBy=createdTime desc&pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const file = data.files?.[0];
    if (!file) return null;

    return {
      date: new Date(file.createdTime).toLocaleString('es-ES'),
      size: Math.round(parseInt(file.size || '0') / 1024),
    };
  } catch {
    return null;
  }
}

async function findBackupFile(token: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function exportarAGoogleDrive(): Promise<{ success: boolean; message: string }> {
  const token = getAccessToken();
  if (!token) return { success: false, message: 'No hay sesión de Google activa. Por favor, inicia sesión.' };

  try {
    const jsonContent = await exportarTodosLosDatos();
    const blob = new Blob([jsonContent], { type: 'application/json' });

    const existingFileId = await findBackupFile(token);

    let url: string;
    let method: string;

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      method = 'POST';
    }

    const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Error al subir a Drive');
    }

    return { success: true, message: `✓ Copia de seguridad guardada en Google Drive (${new Date().toLocaleString()})` };
  } catch (err) {
    return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Desconocido'}` };
  }
}

export async function restaurarDesdeGoogleDrive(): Promise<{ success: boolean; message: string }> {
  const token = getAccessToken();
  if (!token) return { success: false, message: 'No hay sesión de Google activa. Por favor, inicia sesión.' };

  try {
    const fileId = await findBackupFile(token);
    if (!fileId) return { success: false, message: 'No se encontró ningún archivo de respaldo en Google Drive.' };

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error('Error al descargar el archivo de Drive');

    const jsonStr = await res.text();
    await restaurarDesdeDatos(jsonStr);

    return { success: true, message: '✓ Base de datos restaurada correctamente desde Google Drive.' };
  } catch (err) {
    return { success: false, message: `Error: ${err instanceof Error ? err.message : 'Desconocido'}` };
  }
}

