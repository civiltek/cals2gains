# SECURITY-WORKFLOWS.md — Flujos de seguridad

> Workflows específicos de los agentes de ciberseguridad. Complementan a `WORKFLOWS.md`. Si un paso falla, se para y se informa — no se salta.

---

## SW1. Escaneo semanal de dependencias

**Disparador:** tarea programada `security-dependency-scan` (lunes), o manual.

1. **security** ejecuta `npm audit --json` en la raíz del proyecto.
2. Clasifica hallazgos por severidad (critical / high / moderate / low).
3. Para cada hallazgo **critical** o **high**:
   - Verifica si hay versión parcheada disponible (`npm audit fix --dry-run`).
   - Si hay fix automático sin breaking changes → propone a `app-dev`.
   - Si requiere actualización mayor → documenta y escala a Judith.
4. **security** actualiza `_project-hub/SECURITY_STATUS.md` — sección de dependencias.
5. **ops** → CHANGELOG (descripción genérica, sin detallar CVEs).
6. Si 0 hallazgos critical/high → solo actualiza estado, no escala.

**Criterio de cierre:** `SECURITY_STATUS.md` refleja el scan actual con fecha.

---

## SW2. Escaneo diario de secretos

**Disparador:** tarea programada `security-secret-scan` (diaria), o manual.

1. **security** ejecuta grep de patrones sensibles en archivos modificados en las últimas 24h:
   ```
   Patrones: sk-[a-zA-Z0-9], AIza[a-zA-Z0-9], AKIA[A-Z0-9], ghp_[a-zA-Z0-9],
   password\s*=\s*["'], token\s*=\s*["'], secret\s*=\s*["'], private_key
   ```
2. Excluye: `node_modules/`, `.git/`, archivos en `.gitignore`, `*.md` (documentación), `SECURITY-BASELINE.md`.
3. Si encuentra coincidencia:
   - **Crítico** (API key real expuesta): avisar a Judith inmediatamente. NO pegar el valor.
   - **Info** (falso positivo, pattern en ejemplo/docs): documentar y descartar.
4. Verifica que `google-services.json` y `GoogleService-Info.plist` siguen en `.gitignore` (o alerta si no).
5. Actualiza `SECURITY_STATUS.md` si hay cambios.

**Criterio de cierre:** scan completado, hallazgos clasificados, Judith avisada si es necesario.

---

## SW3. Auditoría mensual completa

**Disparador:** 1er lunes del mes, o `/security-audit` manual.

1. **security** coordina la auditoría delegando en paralelo:
   - **→ appsec**: auditoría de código y dependencias de la app.
   - **→ infrasec**: auditoría de Firebase rules, hosting y configuración cloud.

2. **appsec** ejecuta su checklist completo:
   - `npm audit`.
   - Grep de API keys / tokens en código fuente (`app/`, `services/`, `utils/`, `components/`).
   - Revisión de uso de AsyncStorage vs SecureStore.
   - Verificación de flujo de auth.
   - Revisión de permisos en `app.json`.
   - Verificación de HTTPS en llamadas a APIs.
   - Revisión de logs sensibles.
   - Revisión de configuración de builds.

3. **infrasec** ejecuta su checklist completo:
   - Auditoría de `firestore.rules` — auth, owner, schema.
   - Auditoría de `storage.rules` — tamaño, MIME, acceso.
   - Verificación de headers en `firebase.json`.
   - Revisión de restricciones de API keys en GCP.
   - Verificación de SSL/TLS.

4. Ambos entregan hallazgos a **security** con formato:
   ```
   | ID | Severidad | Descripción | Archivo/Recurso | Fix propuesto |
   ```

5. **security** consolida en `docs/security/YYYY-MM-DD_audit.md`.
6. **security** actualiza `_project-hub/SECURITY_STATUS.md`.
7. **security** presenta resumen ejecutivo a Judith:
   - Total de hallazgos por severidad.
   - Cambios respecto al mes anterior (Δ).
   - Top 3 acciones prioritarias.
8. **ops** → CHANGELOG.

**Criterio de cierre:** informe publicado, SECURITY_STATUS actualizado, Judith informada.

---

## SW4. Respuesta a incidente de seguridad

**Disparador:** secreto expuesto, vulnerabilidad explotada, acceso no autorizado, alerta de GitHub.

1. **security** evalúa la severidad:
   - **Crítica**: secreto público, RCE, datos de usuario expuestos.
   - **Alta**: vulnerabilidad con exploit conocido, misconfiguration explotable.
   - **Media/Baja**: riesgo teórico, no explotado.

2. **Contención inmediata** (si es crítica/alta):
   - Secreto expuesto → recomendar revocación a Judith (R9 — ella ejecuta).
   - Regla Firebase permisiva → proponer fix (R10 — Judith aprueba).
   - Dependencia vulnerable → proponer actualización a `app-dev`.

3. **Documentar** en `_project-hub/SECURITY_STATUS.md`:
   - Fecha, hora, descripción.
   - Vector de ataque.
   - Impacto estimado.
   - Acciones tomadas.
   - Estado: Abierto / Mitigado / Resuelto.

4. **Remediar**: delegar fix al agente correspondiente:
   - Código app → `appsec` → `app-dev`.
   - Infra/cloud → `infrasec` → `web-dev` o Judith.
   - Secreto → Judith directamente.

5. **Verificar**: confirmar que la remediación funciona.

6. **Prevenir**: proponer medida preventiva (regla, check, scan).

7. **ops** → CHANGELOG (descripción genérica).

**Criterio de cierre:** incidente en estado "Resuelto" en SECURITY_STATUS, medida preventiva implementada.

---

## SW5. Revisión de seguridad pre-build

**Disparador:** antes de cada build EAS de producción (no preview).

1. **security** ejecuta checks rápidos:
   - `npm audit` — ¿hay critical/high?
   - Grep rápido de secretos en archivos staged (`git diff --cached`).
   - Verificación de que `.env` no está en staged files.
   - Verificación de que `google-services.json` no se modificó.

2. Si hay bloqueo (secreto staged, vuln crítica):
   - **Bloquea el build** (informa a `app-dev` y a Judith).
   - No se lanza `eas build` hasta resolver.

3. Si todo OK:
   - Marca check de seguridad como passed.
   - `app-dev` procede con el build.

**Criterio de cierre:** check de seguridad passed o blocker resuelto.

---

## SW6. Revisión de seguridad pre-deploy web

**Disparador:** antes de cada `firebase deploy --only hosting`.

1. **security** / **infrasec** verifica:
   - Headers de seguridad en `firebase.json` presentes.
   - No hay secretos en archivos de `public/` o `website/`.
   - Meta tags no exponen información sensible.
   - GA4 tag es el correcto (`G-WMHZQ52NS2`).

2. **web-dev** procede con el deploy si el check pasa.

**Criterio de cierre:** check passed, deploy ejecutado.

---

## Tareas programadas de seguridad

| Tarea | Frecuencia | Workflow | Agente principal |
|-------|-----------|----------|-----------------|
| `security-dependency-scan` | Semanal (lunes) | SW1 | security |
| `security-secret-scan` | Diaria | SW2 | security |
| `security-full-audit` | Mensual (1er lunes) | SW3 | security + appsec + infrasec |
| `security-pre-build` | Antes de build prod | SW5 | security |
| `security-pre-deploy` | Antes de deploy web | SW6 | security / infrasec |
