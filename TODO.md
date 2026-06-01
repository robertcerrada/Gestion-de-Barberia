# TODO — Refactor Clean Architecture (sin cambiar comportamiento)

## Fase 1: Preparación (estructura)
- [x] Crear directorios nuevos: `src/application/**`, `src/features/app/**`, `src/config/i18n/**` (o donde aplique), `src/infrastructure/services/**`.
- [x] Definir facades de compatibilidad para no romper imports existentes.


## Fase 2: Extraer casos de uso desde `src/lib/business.ts`
- [x] Extraer BACKUP: `exportarTodosLosDatos` y `restaurarDesdeDatos` a `src/application/backup/*` y/o `src/infrastructure/services/backupService.ts`.
- [x] Extraer CIERRES: `cerrarMes` y `reabrirMes` a `src/application/cierres/*`.
- [x] Extraer ARQUEO: `guardarArqueo`, `getArqueoDia`.


## Fase 3: Reducir `src/lib/business.ts` a facade
- [ ] Implementar `src/lib/business.ts` como re-exports/forwarders hacia los use-cases.
- [ ] Mantener firmas/retornos exactamente iguales.

## Fase 4: i18n y bootstrap
- [ ] Separar `src/lib/useAppConfig.ts` en Provider + motor de traducciones.
- [ ] Mover `useAppLoader` de `src/app/page.tsx` a `src/features/app/useAppLoader.ts`.
- [ ] Simplificar `src/app/page.tsx` a composición.

## Fase 5: Validación
- [ ] `npm run build`
- [ ] `npm run lint` (si existe)
- [ ] Verificación funcional manual: ventas/adelantos/panel, cierre/reapertura, backup/restore, RTL árabe.

