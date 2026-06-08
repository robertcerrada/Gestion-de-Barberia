---
name: creador-habilidades
description: Crea y configura nuevas habilidades (skills) en español para el agente en este espacio de trabajo. Utiliza esta habilidad cuando el usuario te pida crear una nueva habilidad, guía de estilo o rol especializado.
---

# Creador de Habilidades (Skills)

Esta habilidad te permite diseñar, estructurar y generar nuevas habilidades para el agente de IA dentro del espacio de trabajo, asegurando que sigan el formato estándar oficial, estén redactadas en español y estén optimizadas para su descubrimiento y uso.

## Cuándo usar esta habilidad

- Cuando el usuario solicite crear una nueva habilidad, rol, agente especializado o manual de estilo en el espacio de trabajo.
- Cuando necesites automatizar o documentar un conjunto de instrucciones repetitivas en un recurso reutilizable por la IA.
- Cuando sea necesario traducir, adaptar o mejorar habilidades existentes para el entorno en español.

## Estructura de una Habilidad

Las habilidades deben crearse en el siguiente directorio del espacio de trabajo:
`d:/Proyecto Web/APP Barberia/.agents/skills/<nombre-de-la-habilidad>/`

Cada habilidad debe contar, como mínimo, con el archivo principal de instrucciones:
- `SKILL.md` (Obligatorio)

Opcionalmente, puede incluir:
- `scripts/` (Scripts de ayuda o herramientas)
- `examples/` (Ejemplos de implementación de referencia)
- `resources/` (Plantillas, assets y otros recursos adicionales)

---

## Cómo crear una nueva habilidad (Paso a Paso)

### 1. Definir el nombre y propósito
- El nombre de la carpeta y del archivo debe ser representativo, en minúsculas y separado por guiones (ej. `mi-nueva-habilidad`).
- Identifica claramente qué problema resuelve y en qué casos debe activarse.

### 2. Estructura del archivo `SKILL.md`
El archivo `SKILL.md` debe comenzar estrictamente con un bloque YAML Frontmatter, seguido del contenido en Markdown en español:

```markdown
---
name: nombre-de-la-habilidad
description: Descripción clara en tercera persona que explique qué hace la habilidad y cuándo debe activarse. Debe incluir palabras clave para que el agente la descubra.
---

# Nombre de la Habilidad

Descripción general y detallada del rol o la capacidad que aporta esta habilidad.

## Cuándo usar esta habilidad
- Lista de situaciones o tipos de tareas en las que se debe activar esta habilidad.
- Casos específicos de uso.

## Cómo usarla / Instrucciones
Instrucciones detalladas paso a paso, convenciones, reglas de código, patrones de diseño y flujos de trabajo que el agente debe seguir obligatoriamente cuando esta habilidad esté activa.
```

### 3. Buenas Prácticas para la redacción
- **Claridad e imperativos:** Usa un tono claro, profesional e instrucciones directas para el modelo de lenguaje.
- **Evitar la sobrecarga:** Cada habilidad debe estar enfocada en un único propósito o dominio.
- **Palabras clave en la descripción:** Asegúrate de incluir los términos exactos y sinónimos en la `description` del frontmatter para facilitar que el sistema la cargue automáticamente cuando sea relevante.
- **Idioma:** Toda la documentación interna, instrucciones y descripciones deben redactarse en español neutro y profesional.
