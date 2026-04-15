# LEGAL-OVERVIEW.md — Sistema legal y de cumplimiento

> Vista de arquitectura del sistema legal. Para estado actual → `_project-hub/LEGAL.md`. Para operaciones → agente `legal` y skill `legal-audit`.

---

## Componentes

```
Documentos legales publicados:
├── public/privacy.html                    ← fuente para deploy
├── public/terms.html                      ← fuente para deploy
├── public/cals2gains/privacy.html         ← copia (debe ser idéntica)
├── public/cals2gains/terms.html           ← copia (debe ser idéntica)
├── website/privacy.html                   ← copia
├── website/terms.html                     ← copia
├── website/cals2gains/privacy.html        ← copia
└── website/cals2gains/terms.html          ← copia

Documentación legal interna:
├── _project-hub/LEGAL.md                  ← estado legal del proyecto
├── docs/legal/                            ← informes, DPIAs, checklists
│   ├── store-compliance-checklist.md      ← (por crear)
│   └── YYYY-MM-DD_dpia_*.md              ← evaluaciones de impacto
```

## Marco normativo aplicable

### Obligatorio (jurisdicción española + UE)
- **RGPD** (Reglamento UE 2016/679) — tratamiento de datos personales.
- **LOPD-GDD** (Ley Orgánica 3/2018) — adaptación española del RGPD.
- **LSSI-CE** (Ley 34/2002) — servicios de la sociedad de la información (aviso legal, cookies).
- **AI Act** (Reglamento UE 2024/1689) — aplicable a sistemas de IA. Cals2Gains usa IA para análisis nutricional → clasificación de riesgo por determinar.

### Requisitos de plataforma
- **Apple App Store Review Guidelines** — privacy, data collection, in-app purchases.
- **Google Play Developer Policy** — data safety, account deletion, privacy policy.

### Contractual
- **DPA** (Data Processing Agreement) con procesadores:
  - Firebase/Google Cloud — DPA estándar de Google.
  - OpenAI — DPA para uso de API (fotos de comida → GPT-4o Vision).
  - RevenueCat — DPA para gestión de suscripciones.

## Responsable del tratamiento

- **Entidad**: CivilTek (Judith Cordobés)
- **Email de contacto**: info@civiltek.es
- **Dirección**: [pendiente de confirmar dirección fiscal]
- **NIF/CIF**: [pendiente — necesario para Impressum]

## Datos personales tratados por la app

| Categoría | Datos | Base legal | Retención | Procesador |
|-----------|-------|-----------|-----------|------------|
| Cuenta | Email, nombre, foto perfil | Contrato | Mientras cuenta activa | Firebase Auth |
| Perfil | Peso, altura, edad, género, actividad | Contrato | Mientras cuenta activa | Firestore |
| Nutrición | Comidas, macros, historial | Contrato | Mientras cuenta activa | Firestore |
| Salud | Peso, medidas, fotos progreso, ayuno | Consentimiento explícito | Mientras cuenta activa | Firestore, Storage |
| Fotos comida | Imágenes temporales | Contrato | Temporal (análisis) | OpenAI API |
| Voz | Audio de voice logging | Consentimiento explícito | Temporal (transcripción) | OpenAI Whisper |
| Pagos | Info suscripción (no tarjeta) | Contrato | Según stores | RevenueCat |
| Analytics | Eventos, pantallas, errores | Interés legítimo | 14 meses (GA4 default) | Google Analytics |

## Flujo de datos

```
Usuario → App (React Native)
  ├── Firebase Auth (Google Cloud, EU/US)      → cuenta
  ├── Firestore (Google Cloud, EU)             → perfil, comidas, tracking
  ├── Firebase Storage (Google Cloud, EU)       → fotos progreso
  ├── OpenAI API (US)                          → fotos comida, voice → análisis
  ├── RevenueCat (US)                          → suscripciones
  └── GA4 (Google, EU/US)                      → analytics

Web (cals2gains.com)
  └── GA4 (Google, EU/US)                      → analytics web
```

## Transferencias internacionales

- **OpenAI**: datos enviados a servidores en EEUU. Requiere verificar que hay DPA vigente con cláusulas contractuales tipo (SCCs) o marco de adecuación.
- **RevenueCat**: servidores EEUU. Verificar DPA.
- **Google/Firebase**: configuración de region disponible, verificar que Firestore está en `europe-west1`.
- **GA4**: datos procesados según configuración de Google (puede incluir EEUU).

## Derechos del usuario (ARCO+)

El usuario debe poder ejercer:
1. **Acceso**: ver todos sus datos → feature export data (existe).
2. **Rectificación**: modificar datos de perfil → settings (existe).
3. **Supresión/Olvido**: eliminar cuenta y todos sus datos → **pendiente implementar**.
4. **Oposición**: oponerse a tratamiento → necesita mecanismo.
5. **Portabilidad**: exportar en formato interoperable → PDF/CSV export (existe parcialmente).
6. **Limitación**: restringir tratamiento → necesita mecanismo.

## Pendientes legales críticos (bloquean lanzamiento)

1. ⚠️ **Eliminación de cuenta in-app** — requisito de ambas stores desde 2024.
2. ⚠️ **Aviso legal / Impressum** en web — obligatorio LSSI España.
3. ⚠️ **Banner de cookies** con consentimiento — obligatorio con GA4.
4. ⚠️ **Data Safety Section** en Play Console — obligatorio para publicar.
5. ⚠️ **Actualizar privacy.html** con todos los datos actuales (fasting, voice, training, measurements).
6. ⚠️ **Disclamer nutricional** en terms.html — "no sustituye asesoramiento médico".
