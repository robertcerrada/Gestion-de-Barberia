/**
 * infrastructure/repositories/index.ts
 *
 * Barrel export — los servicios y hooks importan desde aquí,
 * no desde los archivos individuales.
 * REGLA: Ningún screen o feature hook importa `db` directamente.
 * Todo acceso a datos pasa por un repository de esta capa.
 */

export { ventasRepository } from './ventas.repository';
export { gastosRepository } from './gastos.repository';
export { adelantosRepository } from './adelantos.repository';
export { barberosRepository } from './barberos.repository';
export { sociosRepository } from './socios.repository';
export { serviciosRepository } from './servicios.repository';
export { fondoCajaRepository } from './fondo-caja.repository';
export { arqueoRepository } from './arqueo.repository';
export { historicoCierresRepository } from './historico-cierres.repository';
export { configRepository } from './config.repository';
