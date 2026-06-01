# ANÁLISIS DE ARQUITECTURA LIMPIA
## APP Barbería — Auditoría Senior

---

## 1. DIAGNÓSTICO: Estado Actual

### ✅ Lo que ya está bien (conservar)
- `domain/types.ts` — única fuente de verdad para entidades. Correcto.
- `infrastructure/repositories/` — capa de repositorios existe y tiene buena forma.
- `features/*/useXxx.ts` — separación de lógica de formularios iniciada.
- `lib/db.ts` — schema de Dexie aislado correctamente.
- `shared/utils/` — utilidades puras sin dependencias de UI.

### ❌ Problemas Críticos de Arquitectura

#### A) VIOLACIÓN DE CAPAS — `lib/business.ts` es un god-object
- **1 solo archivo con ~700 líneas** maneja: comisiones, backup/restore, arqueos, meses,
  cálculos de socios, exportación, fondo de caja. Mezcla capas de aplicación, dominio e infraestructura.
- Importa `db` directamente → acoplamiento alto a Dexie.
- Re-exporta utilidades de `shared/` → dependencia circular latente.

#### B) DOBLE SISTEMA DE INTERNACIONALIZACIÓN
- `lib/useAppConfig.ts` tiene ~400 líneas solo de traducciones hardcodeadas en 6 idiomas.
- `shared/i18n/` tiene su propio `LanguageContext`, `useTranslation`, archivos JSON.
- Los dos sistemas coexisten sin integrarse → duplicación total, inconsistencias.

#### C) FEATURES HOOKS IMPORTAN `db` DIRECTAMENTE
- `useVenta.ts`, `useAdelanto.ts`, `useDashboard.ts` importan `db` directamente.
- Esto bypasea los repositorios que ya existen en `infrastructure/`.
- La regla "ningún screen importa db" está documentada pero no se cumple en features.

#### D) `page.tsx` MEZCLA RESPONSABILIDADES
- Tiene lógica de autenticación, carga de DB, splash screen, configuración y navegación.
- El `useAppLoader` hook está definido inline en el mismo archivo.

#### E) ARCHIVOS HUÉRFANOS / DUPLICADOS
- `src/components/screens/ScreenBarberos.tsx` tenía código de `BarberoDetalle` mezclado (ya corregido).
- `src/components/ui/` y `src/components/screens/` tienen modales (`ModalAddBarbero`, `ModalGestionItems`,
  `BarberoDetalle`) que no siempre tienen archivo propio — algunos vivían inline.
- `ModalAddBarbero.tsx`, `PrecioItem.tsx`, `ModalGestionItems.tsx` se importan en `ScreenBarberos`
  pero sus archivos pueden no existir como módulos separados.

#### F) TRADUCCIONES INCRUSTADAS EN LÓGICA
- `useAppConfig.ts` mezcla: Context Provider, hook de tema, hook de idioma, Y ~400 líneas de traducciones.
- Las traducciones deben vivir en archivos JSON, no en código TypeScript.

---

## 2. ARQUITECTURA LIMPIA PROPUESTA

```
src/
├── app/                          # Next.js App Router (solo routing)
│   ├── layout.tsx
│   ├── page.tsx                  # Solo composición de pantallas
│   └── globals.css
│
├── domain/                       # ✅ YA CORRECTO — sin dependencias externas
│   ├── types.ts                  # Entidades, Value Objects, DTOs
│   └── index.ts
│
├── application/                  # Casos de uso puros (NUEVA CAPA)
│   ├── comisiones/
│   │   └── calcularComisiones.ts
│   ├── meses/
│   │   ├── cerrarMes.ts
│   │   ├── reabrirMes.ts
│   │   └── getMesesPendientes.ts
│   ├── resumen/
│   │   └── getResumenMes.ts
│   ├── backup/
│   │   ├── exportarDatos.ts
│   │   └── restaurarDatos.ts
│   └── arqueo/
│       └── guardarArqueo.ts
│
├── infrastructure/               # ✅ YA EXISTE — ampliar
│   ├── db/
│   │   ├── schema.ts             # Solo definición Dexie (extraer de lib/db.ts)
│   │   └── seed.ts               # seedInitialData separado
│   └── repositories/             # ✅ YA EXISTEN — hacer que todos los features los usen
│       ├── ventas.repository.ts
│       ├── adelantos.repository.ts
│       └── ...
│
├── features/                     # ✅ YA EXISTE — completar migración
│   ├── ventas/
│   │   └── useVenta.ts           # Debe usar ventasRepository, NO db
│   ├── adelantos/
│   │   └── useAdelanto.ts        # Debe usar adelantosRepository, NO db
│   └── dashboard/
│       └── useDashboard.ts       # Debe usar repositorios, NO db
│
├── components/
│   ├── screens/                  # Solo presentación + estado local
│   │   ├── ScreenInicio/
│   │   │   ├── index.tsx
│   │   │   └── ScreenInicio.module.css
│   │   └── ...
│   ├── modals/                   # Modales extraídos de screens
│   │   ├── ModalVenta.tsx
│   │   ├── ModalAdelanto.tsx
│   │   └── ModalGestionItems.tsx
│   └── ui/                       # ✅ YA EXISTE
│
├── config/                       # NUEVA — configuración de la app
│   ├── AppConfigContext.tsx      # Solo tema e idioma (sin traducciones)
│   └── useAppConfig.ts
│
├── shared/
│   ├── i18n/                     # UN solo sistema de i18n
│   │   ├── translations/
│   │   │   ├── es.json           # ÚNICA fuente de traducciones
│   │   │   ├── en.json
│   │   │   └── ...
│   │   └── useTranslation.ts
│   ├── components/
│   └── utils/
│
└── lib/                          # SOLO re-exports de compatibilidad
    ├── db.ts                     # Re-export de infrastructure/db
    └── business.ts               # Re-export de application/ (deprecar gradualmente)
```

---

## 3. REGLAS DE CAPAS (Dependency Rule)

```
UI (components/screens)
    ↓ usa
features/ (hooks de estado)
    ↓ usa
application/ (casos de uso)
    ↓ usa
infrastructure/repositories/
    ↓ usa
infrastructure/db/
    ↓ usa
domain/types (sin dependencias)
```

**PROHIBIDO:** cualquier capa superior saltando a una inferior.
Ejemplo: `features/useVenta.ts` NO puede importar `db` directamente.
Debe usar `ventasRepository.save()`.

---

## 4. MEJORAS PRIORITARIAS (por impacto)

| Prioridad | Problema | Solución | Esfuerzo |
|-----------|----------|----------|----------|
| 🔴 ALTA   | `business.ts` god-object 700 líneas | Separar en `application/` por dominio | Medio |
| 🔴 ALTA   | Doble sistema i18n | Eliminar traducciones de `useAppConfig.ts`, unificar en JSON | Bajo |
| 🟡 MEDIA  | Features importan `db` directo | Hacer que usen repositorios | Bajo |
| 🟡 MEDIA  | `useAppConfig.ts` mezcla tema + idioma + traducciones | Separar en 3 archivos | Bajo |
| 🟢 BAJA   | `page.tsx` con lógica inline | Extraer `useAppLoader` a `features/app/` | Bajo |
| 🟢 BAJA   | Modales sin archivos propios | Crear `components/modals/` | Bajo |

---

## 5. CONVENCIONES A SEGUIR

1. **Naming**: `useXxx.ts` para hooks, `Xxx.repository.ts` para repos, `xxxUseCase.ts` para casos de uso.
2. **Imports**: siempre por alias `@/`, nunca rutas relativas entre capas distintas.
3. **Tipado**: todos los parámetros y retornos tipados con tipos de `@/domain/types`.
4. **No `any`**: prohibido en capas de dominio, aplicación e infraestructura.
5. **Barrel exports**: cada carpeta tiene `index.ts` que re-exporta lo público.
