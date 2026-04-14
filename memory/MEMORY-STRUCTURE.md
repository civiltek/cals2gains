# MEMORY-STRUCTURE.md — Cómo se organiza la memoria

## Dos tipos de memoria

### 1. Memoria del proyecto (en el repositorio)
Vive en `_project-hub/` y en `Claude code/`. Es versionable, compartible, reproducible.
- **Estado**: `PROJECT_STATUS.md`, `FEATURES.md`, `FINANCES.md`, `METRICS.md`.
- **Log**: `CHANGELOG.md`.
- **Reglas**: `Claude code/guardrails/*`.
- **Contexto**: `Claude code/context/*`.

Esta memoria es la **fuente de verdad**. Si hay discrepancia con otra memoria, gana esta.

### 2. Memoria persistente de Cowork
Vive en `/sessions/*/mnt/.auto-memory/` — fuera del repositorio, específica de la máquina de Judith. Contiene insights acumulados que pueden ser útiles entre sesiones.

Categorías típicas:
- `user/` — preferencias de Judith (cómo le gusta recibir los updates, horarios, tolerancia a detalle).
- `feedback/` — correcciones que ha dado ("no me gusta que uses emojis en informes", "prefiero bullets cortos").
- `project/` — detalles del proyecto que no caben limpiamente en el hub (contexto de una conversación, una decisión matizada).
- `reference/` — datos de referencia útiles (IDs, URLs, patrones).

---

## Qué guardar y qué NO

### Sí guardar
- Preferencias explícitas de Judith.
- Correcciones recurrentes (evitar repetir el mismo error).
- Contexto de decisiones importantes (el "por qué" de algo que ya está en el hub).
- Patrones observados que ayudan a operar más rápido.

### No guardar
- Credenciales, tokens, API keys (R4).
- Duplicados de lo que ya está en el hub (mejor un link al hub).
- Rumores o suposiciones sin base.
- Texto muy largo o transcripts completos (resumir).

---

## Convenciones

1. **Una entrada = un insight**. No mezclar varios temas en un solo archivo.
2. **Fechar** cada entrada (ISO: `2026-04-14`).
3. **Citar la fuente**: "dicho por Judith el X", "observado en sesión del Y".
4. **Contradicciones**: si una entrada nueva contradice una antigua, la nueva gana pero se anota en la nueva "sustituye a <entrada antigua>". No borrar la antigua silenciosamente.
5. **R14**: borrado sólo con confirmación.

---

## Ejemplo de entrada útil

```
# feedback/2026-04-14_formato-informes.md
Judith prefiere informes en prosa corta, no bullets largos. Excepción:
tablas de números en finanzas (sí tablas). No usar emojis en reportes
ejecutivos; sí ok en mensajes rápidos. Fuente: sesión 14/04.
```

---

## Plantillas

### Para `user/`
```
Preferencia: [frase clara]
Contexto: [cuándo aplica]
Fuente: [sesión, fecha]
```

### Para `feedback/`
```
Corrección: [qué hice mal]
Ajuste: [cómo hacerlo bien]
Fecha: [ISO]
```

### Para `project/`
```
Decisión: [qué se decidió]
Por qué: [razón]
Alternativa descartada: [si aplica]
Fecha: [ISO]
```

### Para `reference/`
```
Dato: [nombre]
Valor: [valor]
Dónde vive: [fuente canónica]
```
