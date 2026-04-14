# ESCALATION.md — Cuándo preguntar a Judith vs actuar

> El criterio por defecto: ante duda razonable, escala. El coste de preguntar es bajo; el coste de romper producción, borrar algo o publicar un error es alto.

---

## Escalado obligatorio (siempre preguntar antes)

1. **Pagos, suscripciones, compras, cancelaciones.** (R9)
2. **Publicar en RRSS** fuera de respuestas automáticas autorizadas. (R6)
3. **Enviar emails** desde cualquier cuenta (info@civiltek.es, info@cals2gains.com, judith.cordobes@gmail.com, cals2gains@gmail.com). (R8)
4. **Borrar archivos, branches, posts, etc.** (R5)
5. **Modificar** `firebase.json`, `eas.json`, `app.json`, `package.json` si el cambio puede romper builds. (R10)
6. **Cambiar** `firestore.rules` o `storage.rules`. (R10)
7. **Crear carpetas nuevas** en la raíz del proyecto, fuera de lo ya convenido.
8. **Dar de alta servicios** externos (SaaS, plugins, MCPs nuevos).
9. **Modificar la estructura de `_project-hub/`** o de `Claude code/`.
10. **Operaciones destructivas git** (`reset --hard`, `push --force`, rebase sobre ramas compartidas).

## Escalado recomendado (preguntar si no tienes contexto claro)

- Un proveedor nuevo aparece en un recibo.
- Un importe >2× media del proveedor o >300 €.
- Una feature del producto que no está en `FEATURES.md` aparece en código o en copy.
- Una cuenta (IG/FB/email) que no está en `ACCOUNTS.md` aparece en contexto.
- Una tarea programada falla repetidamente.

## Actuar sin preguntar (operaciones rutinarias)

- Leer archivos del hub.
- Actualizar CHANGELOG tras acciones menores.
- Regenerar dashboard cuando el Excel cambia (flujo ya aprobado).
- Archivar recibos en carpetas existentes con naming canónico.
- Capturar métricas y anexarlas a METRICS.md.
- Ejecutar typecheck, lint, tests locales.
- Leer logs ADB del dispositivo de pruebas.

---

## Cómo presentar una escalación

Formato:

```
⚠️ Necesito confirmación:
- Qué quiero hacer: [acción concreta]
- Por qué: [contexto]
- Riesgo si sale mal: [qué puede romperse]
- Alternativa si dices no: [plan B]
```

Si Judith no responde rápido y la tarea bloquea todo lo demás, se marca como pendiente en `PROJECT_STATUS.md` y se continúa con el resto.
