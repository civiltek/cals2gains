# ANTI-PATTERNS.md — Errores comunes y cómo evitarlos

> Catálogo de patrones dañinos detectados (o previsibles) y la forma correcta de proceder.

---

## AP1. "Estimé el gasto porque faltaba un dato"
**Problema:** inventar importes o sumas parciales para que el reporte "quede bonito".
**Cómo evitar:** R1. Reporta "falta X" en lugar de estimar. Un total con un `⚠️ pendiente [X]` es verdad; un total estimado no.

## AP2. "Regeneré el dashboard pero olvidé la copia en _project-hub"
**Problema:** dashboard en `finances/` actualizado, el de `_project-hub/` desactualizado. Judith ve datos viejos.
**Cómo evitar:** skill `update-dashboard` siempre escribe en **ambas** rutas y verifica tamaños idénticos.

## AP3. "Modifiqué el Excel sin backup"
**Problema:** si algo sale mal, no hay vuelta atrás.
**Cómo evitar:** R2. Primer paso siempre: copia a `Cals2Gains_Finances_pre_update.xlsx`.

## AP4. "Instalé la APK para probar rápido"
**Problema:** instalar `358414d2` crashea al abrir. Gasto de tiempo y frustración.
**Cómo evitar:** R7. Nunca esa APK. Validar build ID > fix 13/04 (p. ej. `c00a412e`+).

## AP5. "Publiqué el post sin que Judith lo aprobara"
**Problema:** R6. Publicación sin revisión puede generar error de brand, typo, promoción de feature que no existe.
**Cómo evitar:** siempre presentar draft y esperar "ok" explícito. Excepción única: respuestas automáticas `instagram-commenter` ya autorizadas.

## AP6. "El build falló y relancé sin leer el log"
**Problema:** probablemente vuelva a fallar por la misma razón.
**Cómo evitar:** leer el log, entender el error, arreglarlo, luego relanzar.

## AP7. "Borré archivos viejos de Downloads para hacer sitio"
**Problema:** puede haber recibos no procesados, assets de marketing, etc.
**Cómo evitar:** R5. Nunca borrar sin autorización. Proponer lista, esperar "ok".

## AP8. "Puse credenciales en CHANGELOG para no olvidarlas"
**Problema:** R4. Secretos en el repositorio son un riesgo permanente.
**Cómo evitar:** nunca. Usar password manager / Judith.

## AP9. "Prometí en un post una feature que aún no existe"
**Problema:** promesa falsa; cuando el usuario descarga y no la encuentra, pierde confianza.
**Cómo evitar:** agente `marketing` valida contra `FEATURES.md` que la feature está activa antes de incluirla en copy.

## AP10. "Traduje el post de EN a ES literalmente"
**Problema:** calcos raros, tono falla, engagement baja.
**Cómo evitar:** adaptar, no traducir. Cada idioma con su voz nativa. Consulta `BRAND.md`.

## AP11. "Le pregunté a otro MCP lo que ya sabía el hub"
**Problema:** gasto de tiempo y a veces de API.
**Cómo evitar:** primero leer `_project-hub/PROJECT_STATUS.md` y archivos del hub. Sólo ir fuera si falta el dato.

## AP12. "Actualicé PROJECT_STATUS.md pero olvidé CHANGELOG"
**Problema:** el histórico queda incompleto; no hay rastro de cuándo pasó algo.
**Cómo evitar:** R11. Siempre cerrar con entrada en CHANGELOG.

## AP13. "Modifiqué eas.json/app.json para desbloquear un build"
**Problema:** R10. Puede romper builds futuros o cambios de configuración no revertibles en tu cabeza.
**Cómo evitar:** escalar a Judith. Explicar qué cambio y por qué, esperar aprobación.

## AP14. "Dejé un ⚠️ en el hub sin describir qué pendiente"
**Problema:** otro Claude (o Judith) no sabe qué hay que hacer.
**Cómo evitar:** siempre formato `⚠️ Pendiente: [acción concreta] — [por qué] — [quién la lleva]`.

## AP15. "Copié texto de un competidor para inspirarme en un post"
**Problema:** riesgo IP + mala señal.
**Cómo evitar:** tomar la idea, reescribir con voz propia. Nunca pegar.
