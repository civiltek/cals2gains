# Data Safety Section — Google Play Console

> Documento preparatorio para rellenar la Data Safety Section en Google Play Console.
> Última actualización: 14 de abril de 2026

---

## Resumen de respuestas

### ¿Tu app recopila o comparte datos de usuario?
**Sí**

### ¿Todos los datos de usuario recopilados están cifrados en tránsito?
**Sí** (HTTPS/TLS en todas las comunicaciones)

### ¿Proporcionas una forma para que los usuarios soliciten la eliminación de sus datos?
**Sí** (Ajustes → Eliminar cuenta)

---

## Tipos de datos recopilados

### Información personal
| Dato | Recopilado | Compartido | Propósito | Opcional |
|------|-----------|-----------|-----------|----------|
| Nombre | Sí | No | Funcionalidad de la app | No |
| Email | Sí | No | Gestión de cuenta | No |
| Foto de perfil | Sí | No | Personalización | Sí |

### Información de salud y fitness
| Dato | Recopilado | Compartido | Propósito | Opcional |
|------|-----------|-----------|-----------|----------|
| Información de salud (peso, medidas corporales) | Sí | No | Funcionalidad de la app | Sí |
| Información de fitness (pasos, ejercicio, calorías activas) | Sí | No | Funcionalidad de la app | Sí (solo si conecta wearable) |
| Información nutricional (comidas, macros) | Sí | No | Funcionalidad de la app | No |

### Fotos y vídeos
| Dato | Recopilado | Compartido | Propósito | Opcional |
|------|-----------|-----------|-----------|----------|
| Fotos (comida para análisis) | Sí | Sí (OpenAI — análisis IA) | Funcionalidad de la app | No |
| Fotos (progreso corporal) | Sí | No | Funcionalidad de la app | Sí |

### Audio
| Dato | Recopilado | Compartido | Propósito | Opcional |
|------|-----------|-----------|-----------|----------|
| Grabaciones de voz | Sí | Sí (OpenAI Whisper — transcripción) | Funcionalidad de la app | Sí |

### Información financiera
| Dato | Recopilado | Compartido | Propósito | Opcional |
|------|-----------|-----------|-----------|----------|
| Historial de compras (suscripción) | Sí | Sí (RevenueCat) | Gestión de suscripciones | No (para premium) |

### Identificadores
| Dato | Recopilado | Compartido | Propósito | Opcional |
|------|-----------|-----------|-----------|----------|
| ID de usuario (Firebase UID) | Sí | No | Funcionalidad de la app | No |

---

## Prácticas de seguridad

- **Cifrado en tránsito:** Sí (HTTPS/TLS)
- **Cifrado en reposo:** Sí (Firebase maneja cifrado del lado del servidor)
- **Mecanismo de eliminación de datos:** Sí (eliminación de cuenta in-app + solicitud por email a info@civiltek.es)

---

## Servicios de terceros que procesan datos

| Servicio | Datos que recibe | Propósito |
|----------|-----------------|-----------|
| Firebase (Google) | Todos los datos de usuario | Backend, autenticación, almacenamiento |
| OpenAI | Fotos de comida, audio de voz, datos de perfil (para coaching) | Análisis nutricional con IA, transcripción |
| RevenueCat | ID de usuario, estado de suscripción | Gestión de suscripciones |
| Terra API | ID de usuario | Conexión con wearables (solo si el usuario lo activa) |
| InBody API | ID de usuario | Composición corporal (solo si el usuario lo activa) |

---

## Notas para rellenar en Play Console

1. **Sección "Data collected"**: Marcar todos los tipos de arriba.
2. **Sección "Data shared"**: Solo marcar OpenAI (fotos, audio) y RevenueCat (compras).
3. **Sección "Data handling"**: Los datos se eliminan cuando el usuario lo solicita. No se venden datos. No se usan datos para publicidad personalizada.
4. **Privacy policy URL**: `https://cals2gains.com/privacy.html`
5. **Account deletion URL**: In-app (Ajustes → Eliminar cuenta) o email info@civiltek.es

---

## Checklist antes de enviar

- [ ] Privacy policy URL funcional y accesible.
- [ ] Eliminación de cuenta implementada y funcional.
- [ ] Todos los tipos de datos marcados correctamente.
- [ ] Datos compartidos con terceros declarados.
- [ ] Judith ha revisado antes de enviar.
