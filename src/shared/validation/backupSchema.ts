import { z } from 'zod';

const looseRecord = z.record(z.string(), z.unknown());

export const BackupDataSchema = z.object({
  version: z.number().int().positive().optional(),
  fecha_exportacion: z.string().optional(),
  db_version: z.number().int().positive().optional(),
  barberos: z.array(looseRecord).optional(),
  servicios_productos: z.array(looseRecord).optional(),
  registros_diarios: z.array(looseRecord).optional(),
  Adelantos: z.array(looseRecord).optional(),
  gastos_fijos: z.array(looseRecord).optional(),
  historico_cierres: z.array(looseRecord).optional(),
  fondo_caja: z.array(looseRecord).optional(),
  arqueo_caja: z.array(looseRecord).optional(),
  config_barberia: z.array(looseRecord).optional(),
  documentos_barbero: z.array(looseRecord).optional(),
  socios: z.array(looseRecord).optional(),
}).passthrough();

export type BackupData = z.infer<typeof BackupDataSchema>;
