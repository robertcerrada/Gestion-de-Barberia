# Instrucciones de Desarrollo y Arquitectura

Este proyecto sigue las reglas de Clean Architecture y Domain-Driven Design (DDD). Cualquier agente de IA que trabaje en este repositorio debe cumplir estrictamente las siguientes directrices:

## Checklist de Oro para Modificaciones

1. **Principio de Responsabilidad Única:** 
   - Un componente visual (`src/components/`) solo dibuja la UI.
   - un hook (`src/features/.../useX.ts`) solo gestiona estados de pantalla y lógica de negocio visual.
   - Un archivo de aplicación (`src/application/`) solo ejecuta las reglas del caso de uso puro.

2. **Chequeo de Tipos Estricto:** 
   - Está prohibido el uso del tipo `any` en TypeScript. 
   - Si falta un tipo de dato, se debe modelar primero en `src/domain/types.ts`.

3. **Flujo de Modificación Unidireccional:** 
   - Si se necesita cambiar la estructura de un dato, empieza modificando el Dominio, luego la Aplicación, luego los Hooks y finalmente la UI. Jamás al revés.

4. **Prueba de Impacto Inverso:** 
   - Antes de dar por finalizado un cambio en un archivo compartido (`src/shared/` o `src/components/ui/`), realiza un escaneo de referencias para confirmar que ninguna otra funcionalidad paralela fue afectada.