# ACCOUNTS.md — Mapa de cuentas (sin credenciales)

> NO se guardan contraseñas, tokens ni API keys aquí. Sólo el mapa de qué cuenta sirve para qué. Para login, Judith usa su password manager.

---

## Emails operativos
| Cuenta | Uso principal |
|--------|---------------|
| `info@civiltek.es` | Facturación Anthropic (Claude Team), empresa CIVILTEK |
| `info@cals2gains.com` | ⚠️ pendiente (Microsoft no reconoce el dominio aún) |
| `judith.cordobes@gmail.com` | Apple (iCloud, Meta Verified, Apple Developer) |
| `cals2gains@gmail.com` | Google Play Console, Firebase |

## Redes sociales
| Handle | Plataforma | Idioma | Rol | Seguidores (13/04) |
|--------|-----------|--------|-----|-------------------|
| `@cals2gains` | Instagram | EN | Principal EN, verif. pendiente | 868 |
| `@cals2gains_es` | Instagram | ES | Principal ES | 11 |
| `@calstogains` | Instagram | EN | Antigua (renombrada) | 8 |
| "Cals2Gains - AI Nutrition" | Facebook | EN | Activa | 1 |
| "Cals2Gains" (ES) | Facebook | ES | Activa | 1 |

## Plataformas de desarrollo
| Servicio | Detalle |
|---------|---------|
| Expo / EAS | Owner `civiltek`, project `381120d5-3866-4b97-af00-4c6840768327`, slug `cals2gains` |
| Firebase | Proyecto `cals2gains`; Auth (Email, Google, Apple), Firestore, Storage, Hosting |
| Apple Developer | ⚠️ En verificación. Bundle `com.civiltek.cals2gains` |
| Google Play Console | Package `com.civiltek.cals2gains`. Login con cals2gains@gmail.com |
| RevenueCat | Integrado vía `react-native-purchases` |

## Servicios de pago activos
| Servicio | Cuenta facturación | Frecuencia | Importe |
|---------|-------------------|-----------|---------|
| Anthropic Claude Team | info@civiltek.es | Mensual | ~170 € |
| iCloud+ 2TB | judith.cordobes@gmail.com | Mensual | 9,99 € |
| Meta Verified For Business | judith.cordobes@gmail.com | Mensual | 16,99 € |
| OpenAI API (CIVILTEK org) | — | Pay-as-you-go | Variable (saldo ~$99,66) |

## Dominio / Web
- **Firebase Hosting:** `cals2gains.web.app`.
- **Landing:** `website/index.html` + `public/index.html`.
- **Privacy:** `website/privacy.html`.
- **Terms:** `website/terms.html`.
- **Dominio custom:** cals2gains.com (⚠️ verificar apunte DNS a Firebase).

## Analytics
- **GA4**: tag `G-WMHZQ52NS2`, property `macrolens-ai-4c482` (⚠️ tag no instalado).
- **Meta Business Suite**: la mayoría vinculadas, excepto @cals2gains principal (vinculación pendiente).

---

*No almacenar contraseñas, API keys ni tokens aquí. (R4)*
