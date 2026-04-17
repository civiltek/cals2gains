# Cals2Gains - Features

> Última actualización: 2026-04-17
> Fuente: pantallas en `app/`, componentes en `components/`, servicios en `services/`

## Estado: ✅ = Implementado | 🔧 = Bug conocido | 🚧 = En progreso | ⏳ = Pendiente

### Onboarding y Autenticación
| Feature | Archivo | Estado |
|---------|---------|--------|
| Smart Onboarding | `app/smart-onboarding.tsx` | ✅ |
| Login (Email, Google, Apple) | `app/(auth)/` | ✅ |
| Goal Modes (5 modos) | `app/goal-modes.tsx` | ✅ |
| Nutrition Settings | `app/nutrition-settings.tsx` | ✅ |
| Nutrition Mode selector | `app/nutrition-mode.tsx` | ✅ |

### Core - Registro de Comidas
| Feature | Archivo | Estado |
|---------|---------|--------|
| Capture Hub (entrada principal) | `app/capture-hub.tsx` | ✅ |
| Cámara IA (foto → macros) | `app/(tabs)/` + camera | ✅ |
| Barcode Scanner | `app/barcode-scanner.tsx` | ✅ |
| Label Scanner (etiquetas) | `app/label-scanner.tsx` | ✅ |
| Food Search (base de datos) | `app/food-search.tsx` | ✅ |
| Quick Add (registro rápido) | `app/quick-add.tsx` | ✅ |
| Fast Re-log (repetir comidas) | `app/fast-relog.tsx` | ✅ |
| Edit Meal | `app/edit-meal.tsx` | ✅ |
| AI Review / Food Verification | `app/ai-review.tsx`, `app/food-verification.tsx` | ✅ |

### Tracking y Métricas
| Feature | Archivo | Estado |
|---------|---------|--------|
| Dashboard principal (macros) | `app/(tabs)/` | ✅ |
| Water Tracker | `app/water-tracker.tsx` | 🔧 Firebase permissions |
| Weight Tracker | `app/weight-tracker.tsx` | ✅ |
| Measurements (medidas corporales) | `app/measurements.tsx` | ✅ |
| Progress Photos | `app/progress-photos.tsx` | 🔧 Firebase Storage upload |
| Fasting Tracker | `app/fasting.tsx` | ✅ |
| Training Day (ajuste macros) | `app/training-day.tsx` | ✅ |
| **Training Plan adaptativo** | `app/training-plan.tsx` | ✅ nuevo |
| Adherence | `app/adherence.tsx` | ✅ |
| Analytics | `app/analytics.tsx` | ✅ |
| Protein Dashboard | `app/protein-dashboard.tsx` | ✅ |

### UX Educativa
| Feature | Archivo | Estado |
|---------|---------|--------|
| InfoButton (modal educativo) | `components/ui/InfoButton.tsx` | ✅ nuevo |
| Tooltip ayuno intermitente | `app/fasting.tsx` | ✅ nuevo |
| Tooltip modo objetivo + macros | `app/goal-modes.tsx` | ✅ nuevo |
| Tooltip calorías + macros | `app/analysis.tsx` | ✅ nuevo |

### IA y Coaching
| Feature | Archivo | Estado |
|---------|---------|--------|
| Weekly Coach (recap IA) | `app/weekly-coach.tsx` | ✅ |
| Analysis (análisis nutricional) | `app/analysis.tsx` | ✅ |
| What to Eat (sugerencias IA) | `app/what-to-eat.tsx` | ✅ |
| Recipes (generación IA) | `app/recipes.tsx` | ✅ |
| Meal Plan (plan semanal) | `app/meal-plan.tsx` | ✅ |
| Coach Share | `app/coach-share.tsx` | ✅ |

### Utilidades
| Feature | Archivo | Estado |
|---------|---------|--------|
| Grocery List | `app/grocery-list.tsx` | ✅ |
| Shopping List | `app/shopping-list.tsx` | ✅ |
| Export Data (PDF/CSV) | `app/export-data.tsx` | ✅ |
| Settings | `app/settings.tsx` | ✅ |
| Edit Profile | `app/edit-profile.tsx` | ✅ |
| Help / About | `app/help.tsx`, `app/about.tsx` | ✅ |
| Paywall (RevenueCat) | `app/paywall.tsx` | ✅ |

### Infraestructura
| Feature | Estado |
|---------|--------|
| i18n (EN + ES) | ✅ Auditado |
| Tema claro/oscuro | ✅ Auditado |
| Firebase Auth | ✅ |
| Firebase Firestore | ✅ |
| Firebase Storage | 🔧 Upload issue |
| RevenueCat Subscriptions | ✅ |
| Expo Router (typed) | ✅ |
| Zustand State Management | ✅ |

---
*35+ pantallas implementadas. Para actualizar, revisa los archivos en `app/` y actualiza esta tabla.*
