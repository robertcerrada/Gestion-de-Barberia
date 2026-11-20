/**
 * Notificaciones in-app y del navegador para recordatorios de cierre de mes
 * y saldos pendientes de socios/barberos.
 */
'use client';

import { getMesesAbiertosYPendientes, getResumenMes, getIngresosDiariosConGastosMes } from './business';
import { getMesAno } from '@/shared/utils/dates';
import { format } from 'date-fns';
import { isDriveConnected } from './drive';

export type Notificacion = {
  id: string;
  tipo: 'cierre_mes' | 'saldo_pendiente' | 'meses_pendientes' | 'liquidaciones_pendientes' | 'carga_pendiente' | 'drive_desconectado';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
};

const NOTIF_KEY = 'barberia_notificaciones';

export function loadNotificaciones(): Notificacion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotificaciones(notifs: Notificacion[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export function addNotificacion(notif: Omit<Notificacion, 'id' | 'fecha'>) {
  const notifs = loadNotificaciones();
  const nuevo: Notificacion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fecha: new Date().toISOString(),
    ...notif,
  };
  notifs.unshift(nuevo);
  saveNotificaciones(notifs);
  requestBrowserNotification(notif.titulo, notif.mensaje);
}

export async function checkNotificacionesMensuales() {
  const hoy = new Date();
  const esPrimerDia = hoy.getDate() === 1;

  if (!esPrimerDia) return;

  await checkNotificacionesGenerales();
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 12, 0, 0);
  const mesAnoAnterior = getMesAno(mesAnterior);

  // Verificar si mes anterior está cerrado
  const mesesPendientes = await getMesesAbiertosYPendientes();
  const mesPendiente = mesesPendientes.find(m => m.mesAno === mesAnoAnterior);

  if (mesPendiente) {
    const yaExiste = loadNotificaciones().some(n => n.tipo === 'cierre_mes' && n.mensaje.includes(mesPendiente.mes));
    if (!yaExiste) {
      addNotificacion({
        tipo: 'cierre_mes',
        titulo: 'Recordatorio de cierre de mes',
        mensaje: `El mes de ${mesPendiente.mes} está abierto y pendiente de cierre. Ingresos: $${mesPendiente.ingresos.toFixed(2)}`,
        leida: false,
      });
    }
  }

  // Verificar saldos pendientes de socios del mes anterior
  const resumen = await getResumenMes(mesAnterior);
  const sociosPendientes = resumen.pagosPorSocio.filter(s => s.saldoPendiente > 0.01);
  if (sociosPendientes.length > 0) {
    const yaExiste = loadNotificaciones().some(n => n.tipo === 'saldo_pendiente' && n.mensaje.includes(mesAnoAnterior));
    if (!yaExiste) {
      addNotificacion({
        tipo: 'saldo_pendiente',
        titulo: 'Saldos pendientes de socios',
        mensaje: `${sociosPendientes.length} socio(s) con saldo pendiente del mes anterior`,
        leida: false,
      });
    }
  }
}

export async function checkNotificacionesGenerales() {
  const mesesPendientes = await getMesesAbiertosYPendientes();
  let notifs = loadNotificaciones();

  // Meses pendientes de cierre
  const idxMeses = notifs.findIndex(n => n.tipo === 'meses_pendientes');
  if (mesesPendientes.length > 0) {
    const mensaje = `Hay ${mesesPendientes.length} mes(es) sin cerrar: ${mesesPendientes.map(m => m.mes).join(', ')}`;
    if (idxMeses === -1) {
      notifs.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fecha: new Date().toISOString(),
        tipo: 'meses_pendientes',
        titulo: 'Meses pendientes de cierre',
        mensaje,
        leida: false,
      });
    } else if (notifs[idxMeses].mensaje !== mensaje) {
      notifs[idxMeses] = { ...notifs[idxMeses], mensaje, leida: false };
    }
  } else if (idxMeses !== -1) {
    notifs = notifs.filter(n => n.id !== notifs[idxMeses].id);
  }

  // Liquidaciones pendientes
  const idxLiqui = notifs.findIndex(n => n.tipo === 'liquidaciones_pendientes');
  if (mesesPendientes.length > 0) {
    const mensajeLiqui = `Hay liquidaciones pendientes para ${mesesPendientes.length} mes(es)`;
    if (idxLiqui === -1) {
      notifs.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fecha: new Date().toISOString(),
        tipo: 'liquidaciones_pendientes',
        titulo: 'Liquidaciones pendientes',
        mensaje: mensajeLiqui,
        leida: false,
      });
    } else if (notifs[idxLiqui].mensaje !== mensajeLiqui) {
      notifs[idxLiqui] = { ...notifs[idxLiqui], mensaje: mensajeLiqui, leida: false };
    }
  } else if (idxLiqui !== -1) {
    notifs = notifs.filter(n => n.id !== notifs[idxLiqui].id);
  }

  // Carga pendiente de información
  notifs = await checkCargaPendiente(notifs);

  // Google Drive desconectado
  notifs = await checkDriveDesconectado(notifs);

  saveNotificaciones(notifs);
}

async function checkCargaPendiente(notifs: Notificacion[]) {
  const mesesPendientes = await getMesesAbiertosYPendientes();
  if (mesesPendientes.length === 0) {
    // No hay meses abiertos → quitar notificaciones de carga pendiente
    return notifs.filter(n => n.tipo !== 'carga_pendiente');
  }

  const hoy = new Date();
  const mesAnoActual = `${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
  const mesActualAbierto = mesesPendientes.find(m => m.mesAno === mesAnoActual);

  if (!mesActualAbierto) return notifs;

  // Obtener datos diarios del mes actual
  const dias = await getIngresosDiariosConGastosMes(hoy);
  // Buscar último día con movimiento
  let ultimoDiaConInfo = 0;
  for (let i = dias.length - 1; i >= 0; i--) {
    const d = dias[i];
    if (d.ingresos > 0 || d.gastos > 0) {
      ultimoDiaConInfo = Number(d.dia);
      break;
    }
  }

  const diasSinCargar = hoy.getDate() - ultimoDiaConInfo;
  if (diasSinCargar >= 1) {
    const mensaje = `El mes ${mesActualAbierto.mes} está abierto y hace ${diasSinCargar} día(s) no se carga información`;
    const idx = notifs.findIndex(n => n.tipo === 'carga_pendiente');
    if (idx === -1) {
      notifs.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fecha: new Date().toISOString(),
        tipo: 'carga_pendiente',
        titulo: 'Pendiente carga de información',
        mensaje,
        leida: false,
      });
    } else if (notifs[idx].mensaje !== mensaje) {
      notifs[idx] = { ...notifs[idx], mensaje, leida: false };
    }
  } else {
    // Si ya está al día, quitar notificación
    notifs = notifs.filter(n => n.tipo !== 'carga_pendiente');
  }

  return notifs;
}

async function checkDriveDesconectado(notifs: Notificacion[]) {
  const conectado = isDriveConnected();
  const idx = notifs.findIndex(n => n.tipo === 'drive_desconectado');
  if (!conectado) {
    if (idx === -1) {
      notifs.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fecha: new Date().toISOString(),
        tipo: 'drive_desconectado',
        titulo: 'Google Drive desconectado',
        mensaje: 'El respaldo automático a Google Drive no está activo. Configura Drive para mantener los respaldos de seguridad.',
        leida: false,
      });
    } else if (notifs[idx].leida) {
      notifs[idx] = { ...notifs[idx], leida: false };
    }
  } else if (idx !== -1) {
    notifs = notifs.filter(n => n.id !== notifs[idx].id);
  }
  return notifs;
}

function requestBrowserNotification(titulo: string, cuerpo: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(titulo, { body: cuerpo, icon: '/Logo.jpg' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification(titulo, { body: cuerpo, icon: '/Logo.jpg' });
      }
    });
  }
}
