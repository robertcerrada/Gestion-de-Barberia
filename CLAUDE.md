@AGENTS.md

1\. Piense antes de codificar

No asumas. No ocultes la confusión. Compensaciones superficiales.



Antes de implementar:



Indique sus suposiciones explícitamente. Si no está seguro, pregunte.

Si existen múltiples interpretaciones, preséntelas; no elija en silencio.

Si existe un enfoque más simple, dígalo. Retroceda cuando sea necesario.

Si algo no está claro, detente. Nombra lo que es confuso. Preguntar.

2\. La simplicidad primero

Código mínimo que resuelve el problema. Nada especulativo.



No hay características más allá de lo solicitado.

Sin abstracciones para código de un solo uso.

No hay “flexibilidad” ni “configurabilidad” que no se haya solicitado.

No hay manejo de errores para escenarios imposibles.

Si escribes 200 líneas y podrían ser 50, reescríbelas.

Pregúntese: "¿Un ingeniero senior diría que esto es demasiado complicado?" Si es así, simplifique.



3\. Cambios quirúrgicos

Toca sólo lo que debes. Limpia sólo tu propio desastre.



Al editar código existente:



No "mejore" el código, los comentarios o el formato adyacentes.

No refactorices cosas que no están rotas.

Combina con el estilo existente, incluso si lo harías de manera diferente.

Si nota un código inactivo no relacionado, menciónelo; no lo elimine.

Cuando tus cambios crean huérfanos:



Elimine las importaciones/variables/funciones que SUS cambios no utilizaron.

No elimine código muerto preexistente a menos que se le solicite.

La prueba: cada línea modificada debe rastrear directamente la solicitud del usuario.



4\. Ejecución basada en objetivos

Definir criterios de éxito. Bucle hasta verificar.



Transformar las tareas en objetivos verificables:



"Agregar validación" → "Escribe pruebas para entradas no válidas y luego hazlas pasar"

"Corrige el error" → "Escribe una prueba que lo reproduzca y luego hazlo pasar"

"Refactorizar X" → "Asegúrese de que las pruebas pasen antes y después"

Para tareas de varios pasos, indique un breve plan:



1\. \[Step] → verify: \[check]

2\. \[Step] → verify: \[check]

3\. \[Step] → verify: \[check]

Los sólidos criterios de éxito le permiten realizar bucles de forma independiente. Los criterios débiles ("hacer que funcione") requieren una aclaración constante.





