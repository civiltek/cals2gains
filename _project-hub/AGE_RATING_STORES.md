# Age Rating en stores — instrucciones para Judith

> **Fecha:** 2026-04-17 · **Owner:** Judith (requiere acceso a App Store Connect + Google Play Console)
> **Estado:** Pendiente de ejecución antes del primer submission público.
> **Base:** Fase B (edad mínima 16+ general / 18+ modos con déficit) + auditoría marketing (Age Rating actual App Store = 4+).

Cals2Gains trata datos de salud, incluye recomendaciones nutricionales con adaptación automática, y permite objetivos con déficit calórico. Apple y Google exigen una clasificación por edad acorde al contenido — **el rating actual de 4+ en App Store es incorrecto**.

---

## Apple — App Store Connect

**Objetivo: pasar Age Rating a 17+.**

Ruta:

1. https://appstoreconnect.apple.com → tu app Cals2Gains.
2. En el menú lateral: **App Information** (Información de la app).
3. Bajar a la sección **Age Rating** → clic en **Edit** junto al rating actual (4+).
4. Se abre el cuestionario **Age Rating Questionnaire** (Frequency Rating System, dos opciones por pregunta: *None / Infrequent or Mild / Frequent or Intense*).

Responder así:

| Sección | Pregunta | Respuesta |
|---------|----------|-----------|
| Apple Media Ratings | All | None |
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content and Nudity | None |
| Profanity or Crude Humor | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| **Medical/Treatment Information** | **Infrequent/Mild** ✅ |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| **Simulated Gambling** | None |
| Sexual Content or Nudity | None |
| Graphic Sexual Content or Nudity | None |
| Unrestricted Web Access | No |
| Gambling and Contests | No |

Justificación registrada (por si App Review pregunta):

> Cals2Gains provides general nutrition and wellness recommendations. It is not a medical device and does not diagnose, treat, or prevent disease. Content includes references to nutrition, calorie targets, and lifestyle goals. We answered "Medical/Treatment Information: Infrequent/Mild" because the app orients users on nutrition in an informational and non-prescriptive manner and explicitly directs users with medical conditions to consult healthcare professionals.

Resultado esperado: **17+**.

5. Guardar. Los cambios de Age Rating requieren una nueva submission para aparecer, pero el dato queda actualizado en la ficha.

---

## Google Play — Play Console

**Objetivo: clasificación Teen (13+) o Mature 17+ dependiendo del resultado del cuestionario. La intención es que salga Teen con recomendación "supervisión parental" o Mature 17+.**

Ruta:

1. https://play.google.com/console → tu app Cals2Gains.
2. Menú lateral: **Policy** → **App content** → **Content ratings**.
3. Clic en **Start questionnaire** (si ya hay un rating, **Start a new rating**).
4. Categoría: seleccionar **Utility, Productivity, Communication, or Other** (Cals2Gains NO es "Reference/News/Educational" según IARC para evitar ambigüedad; es utility de salud/bienestar).

**Nota importante:** el cuestionario IARC de Google Play no tiene una pregunta específica sobre "nutrición / dietas restrictivas". Responder con conservadurismo:

| Pregunta | Respuesta |
|----------|-----------|
| Violence | No |
| Sexuality | No |
| Profanity | No |
| Controlled Substance | No |
| Gambling | No |
| User Interaction — does the app have user-generated content? | No (no hay UGC público; los datos son privados del usuario) |
| User Interaction — shares user location? | No |
| User Interaction — allows users to interact or exchange content? | No |
| Does the app contain health, medical, or treatment information? | **Yes** |
| Is the app intended for or appealing to children under 13? | **No** |
| Unrestricted Internet access? | No (usa APIs controladas) |
| Digital purchases? | Yes (suscripciones) |

Resultado esperado: **Teen (13+)** o **Mature 17+** según la puntuación automática del IARC. Si Google Play devuelve **Everyone / Everyone 10+**, **NO aceptar** — ir a **App content → Target age and content → Target age** y subir manualmente el rango objetivo a 18+ con justificación.

5. **Target age** (sección separada, obligatoria desde 2024):
   - "App's target audience" → **Ages 18 and over**.
   - Justificación:
     > "Cals2Gains provides calorie- and macro-tracking functionality, including goal modes with caloric deficit. While the app enforces a minimum age of 16 in-product, caloric-deficit modes are restricted to 18+ per our internal methodology and regulatory assessment. This app is not directed at children and is designed for healthy adults."

6. **Families Policy**: marcar **"No, this app is NOT primarily directed at children."**

---

## Dentro de la app (ya implementado por Fase B)

- Pedir fecha de nacimiento como primer paso del onboarding.
- Bloquear completamente el uso si <16 años.
- Deshabilitar modos `lose_fat` y `mini_cut` si 16-17 años.
- Persistir `dateOfBirth` en userStore (no edad calculada).

Estas medidas in-app son **complementarias**, no sustituyen el rating de la store. Un rating incorrecto en la store es causa de rechazo en App Review o suspensión posterior.

---

## Checklist de ejecución

- [ ] App Store Connect → Age Rating → nuevo cuestionario → 17+ confirmado.
- [ ] Google Play Console → Content Rating → nuevo cuestionario → Teen o Mature 17+.
- [ ] Google Play Console → Target age → 18 and over.
- [ ] Google Play Console → Families Policy → "Not directed at children".
- [ ] Revisar que los metadatos de la ficha (descripción, capturas, vídeo promo) no contengan imágenes o texto dirigido a menores.
- [ ] Nuevo build + submission para que los cambios se publiquen (los ratings sin submission pendiente se muestran pero no se propagan a stores).

---

## Evidencia documental

Este documento se archiva como justificación. En caso de que App Review o Google pregunten por qué el rating es 17+/18+, la respuesta es:

> "The app includes medical/treatment-related information, nutritional adaptation logic, and caloric-deficit goal modes. Per our internal assessment (DPIA v1 + Methodology v1), we restrict these modes to 18+ and set the overall minimum age in-product to 16, consistent with health and wellness apps guidelines (Apple App Store Review Guideline 1.4 and Google Play Families Policy)."

Archivos de referencia:
- `_project-hub/METODOLOGIA_NUTRICIONAL.md` §8.4 (poblaciones excluidas / derivación).
- `_project-hub/INFORME_LEGAL_v1.md` §7 Acción 12 (política de edad).
- `_project-hub/DPIA_v1.md` §1 (interesados 16+) + §4 (medida de producto P5).
- `_project-hub/RAT_v1.md` T2 (base legal Art. 9.2.a para medicalFlags incluyendo edad).
