# Cals2Gains — Análisis de cobertura de tests

**Fecha:** 2026-04-14
**Estado inicial:** 0% cobertura (sin framework de tests, sin tests, sin scripts)
**Estado final:** 35% statements, 307 tests pasando en 18 suites

---

## 1. Resumen ejecutivo

El proyecto Cals2Gains tenía **cero infraestructura de testing automatizado**. Se ha instalado Jest con el preset de Expo y se han creado tests iniciales para los módulos más críticos como punto de partida. Este documento prioriza las áreas donde añadir tests aportará mayor valor.

### Inventario del código testeable

| Capa | Archivos | Funciones exportadas | Tests existentes |
|------|----------|---------------------|------------------|
| **utils/** | 3 | ~10 | nutrition.ts: 100% ✅ |
| **constants/** | 2 | ~4 | macroPresets.ts: 100% ✅ |
| **services/** | 15 | ~50+ | adaptiveMacroEngine.ts: 94% ✅ |
| **store/** | 15 | ~100+ | 0% ❌ |
| **hooks/** | 1 | 1 | 0% ❌ |
| **data/** | 1 | ~5 | 0% ❌ |

---

## 2. Áreas prioritarias para mejorar tests

### Prioridad 1 — Lógica de negocio pura (impacto alto, esfuerzo bajo)

Estos módulos contienen funciones puras sin dependencias externas. Son los más fáciles de testear y los más críticos porque calculan las macros y recomendaciones del usuario.

#### 2.1 `services/memoryEngine.ts`
- **Qué hace:** Analiza patrones alimentarios, sugiere comidas basadas en historial, calcula "macro fit score"
- **Funciones clave:** `analyzeEatingPatterns()`, `getSuggestions()`, `getWhatToEatNext()`
- **Por qué es prioritario:** Alimenta las recomendaciones personalizadas — un error aquí da consejos incorrectos al usuario
- **Tests sugeridos:**
  - Extracción de alimentos frecuentes con frecuencias correctas
  - Cálculo de hora promedio de comidas
  - Detección de pares de alimentos (food pairing)
  - Scoring de "macro fit" con diferentes perfiles de macros restantes
  - Comportamiento con arrays vacíos y datos mínimos

#### 2.2 `services/personalEngine.ts`
- **Qué hace:** Genera sugerencias personalizadas, auto-ajusta calorías según tendencia de peso, sugiere acciones según hora del día
- **Funciones clave:** `getPersonalizedSuggestions()`, `generateAutoAdjustments()`, `getGymFlowSuggestions()`
- **Por qué es prioritario:** Controla los auto-ajustes de calorías — un bug puede subir o bajar las calorías del usuario sin motivo
- **Tests sugeridos:**
  - Auto-ajuste cuando se pierde peso más rápido de lo esperado
  - Auto-ajuste cuando se gana peso más rápido de lo esperado
  - Sin ajuste cuando el cambio de peso está dentro del rango esperado
  - Preservación de ratios de macros al ajustar calorías
  - Sugerencias basadas en hora del día (mañana, tarde, noche)

#### 2.3 `services/macroCoach.ts` (función pura: `estimateBodyComposition`)
- **Qué hace:** Estima composición corporal con el método Navy
- **Por qué es prioritario:** Se usa para estimar grasa corporal y ajustar recomendaciones
- **Tests sugeridos:**
  - Estimación para diferentes combinaciones de medidas
  - Validación de rangos fisiológicos razonables (5-50% BF)
  - Diferencia entre cálculos masculinos y femeninos

#### 2.4 `services/recipeService.ts` (funciones puras: `scaleRecipe`, `calculateRecipeNutrition`, `generateGroceryFromRecipe`)
- **Qué hace:** Escala ingredientes por porciones, agrega nutrición total, genera lista de compra
- **Por qué es prioritario:** Errores de escalado generan cantidades incorrectas en recetas y listas de compra
- **Tests sugeridos:**
  - Escalado correcto al doble / mitad de porciones
  - Escalado de micronutrientes opcionales (sugar, saturatedFat, sodium)
  - Agregación de nutrición con múltiples ingredientes
  - Categorización de ingredientes en lista de compra

### Prioridad 2 — Utilidades y datos (impacto medio, esfuerzo bajo)

#### 2.5 `utils/imageUtils.ts`
- **Qué hace:** Verifica si un URI se puede mostrar en la plataforma actual
- **Tests sugeridos:** URIs de tipo `data:`, `https://`, `file://`, `null`, `undefined`

#### 2.6 `utils/language.ts`
- **Qué hace:** Devuelve el idioma activo de la app
- **Tests sugeridos:** Mock de i18n con 'es' y 'en', fallback por defecto

#### 2.7 `data/spanishFoods.ts`
- **Qué hace:** Base de datos local de 167+ alimentos con nutrición por 100g y por porción
- **Tests sugeridos:**
  - Integridad de datos: todos los items tienen nombre, nutrición, porción > 0
  - Función de búsqueda: encuentra alimentos por nombre en español/inglés
  - Búsqueda insensible a acentos
  - `translateFoodName()` devuelve nombres correctos
  - `looksEnglish()` detecta correctamente idioma

#### 2.8 `constants/colors.ts`
- **Qué hace:** Define la paleta de colores
- **Tests sugeridos:** Validar que los colores exportados son strings hex válidos

### Prioridad 3 — Stores con Zustand (impacto alto, esfuerzo medio)

Los stores requieren mocking de Firebase pero contienen lógica de negocio importante. Para testearlos se necesita:
1. Mock de `services/firebase.ts`
2. Mock de `@react-native-async-storage/async-storage`
3. Patrón de test: crear store, ejecutar acción, verificar estado

#### 2.9 `store/mealStore.ts`
- **Funciones clave:** `addMeal`, `removeMeal`, `getTodayCalories`, `getMealsByType`, `copyMealsToDate`
- **Tests sugeridos:**
  - Agregar comida actualiza totales correctamente
  - `getTodayCalories` suma calorías del día
  - `getMealsByType` filtra correctamente por tipo
  - Copiar comidas a otra fecha duplica nutrición

#### 2.10 `store/weightStore.ts`
- **Funciones clave:** `getLatestWeight`, `getWeightChange`, `getTrend`
- **Tests sugeridos:**
  - Trend calcula media móvil correctamente
  - `getWeightChange` compara pesos en el rango de fechas correcto
  - Ordenamiento por fecha

#### 2.11 `store/fastingStore.ts`
- **Funciones clave:** `isCurrentlyFasting`, `getElapsedHours`, `getRemainingHours`, `getProgress`
- **Tests sugeridos:**
  - Cálculo correcto de horas para cada protocolo (16:8, 18:6, 20:4)
  - Progreso se calcula como porcentaje del tiempo transcurrido
  - Manejo de protocolos custom con ventanas personalizadas

#### 2.12 `store/mealPlanStore.ts`
- **Funciones clave:** `getDayNutrition`, `getWeekNutrition`, `generateGroceryList`
- **Tests sugeridos:**
  - Nutrición diaria agrega correctamente las comidas del día
  - Lista de compra deduplica ingredientes por nombre
  - Cantidades se suman al combinar ingredientes repetidos

### Prioridad 4 — Servicios con APIs externas (impacto alto, esfuerzo alto)

Requieren mocking de APIs (OpenAI, Open Food Facts, Firebase). Más costosos de implementar pero protegen integraciones críticas.

#### 2.13 `services/foodDatabase.ts`
- **Funciones a testear (puras):** `parseServingSize()`, búsqueda local de alimentos, transformaciones de nutrición
- **Funciones a testear (con mock):** `lookupBarcode()` con response mockeada de Open Food Facts, `searchFoods()` con fallback a BD local
- **Tests sugeridos:**
  - Parsing de serving sizes: "100g", "1 rebanada (30g)", "250ml"
  - Conversión de energía kJ a kcal
  - Fallback a BD local cuando la API falla
  - Deduplicación de resultados entre API y local

#### 2.14 `services/exportService.ts`
- **Funciones a testear:** Generación de CSV (formato, encoding UTF-8 BOM), cálculos estadísticos, validación de backup
- **Tests sugeridos:**
  - CSV contiene headers correctos
  - Estadísticas (media de calorías, macros) calculan correctamente
  - Validación de estructura de backup rechaza datos malformados

---

## 3. Infraestructura instalada

```
Dependencias añadidas:
  jest-expo      - Preset de Jest para Expo/React Native
  jest           - Framework de testing
  @types/jest    - Tipos TypeScript para Jest

Archivos creados:
  jest.config.js                                    - Configuración de Jest
  jest.setup.js                                     - Mocks globales (Firebase, AsyncStorage, expo-*)
  __tests__/utils/nutrition.test.ts                 - 31 tests
  __tests__/utils/imageUtils.test.ts                - 14 tests
  __tests__/utils/language.test.ts                  - 5 tests
  __tests__/constants/macroPresets.test.ts           - 29 tests
  __tests__/services/adaptiveMacroEngine.test.ts    - 21 tests
  __tests__/services/memoryEngine.test.ts           - 27 tests
  __tests__/services/personalEngine.test.ts         - 24 tests
  __tests__/services/macroCoach.test.ts             - 13 tests
  __tests__/services/recipeService.test.ts          - 28 tests
  __tests__/services/foodDatabase.test.ts           - 14 tests
  __tests__/services/exportService.test.ts          - 17 tests
  __tests__/data/spanishFoods.test.ts               - 22 tests
  __tests__/store/mealStore.test.ts                 - 17 tests
  __tests__/store/weightStore.test.ts               - 17 tests
  __tests__/store/fastingStore.test.ts              - 18 tests
  __tests__/store/waterStore.test.ts                - 14 tests
  __tests__/store/mealPlanStore.test.ts             - 11 tests
  __tests__/store/adaptiveStore.test.ts             - 15 tests

Scripts añadidos a package.json:
  npm test              - Ejecutar todos los tests
  npm run test:watch    - Modo watch durante desarrollo
  npm run test:coverage - Reporte de cobertura
```

---

## 4. Cobertura actual

```
-------------------------|---------|----------|---------|---------|
File                     | % Stmts | % Branch | % Funcs | % Lines |
-------------------------|---------|----------|---------|---------|
All files                |   34.79 |    25.54 |   40.88 |   35.37 |
 utils/ (3 archivos)     |     100 |      100 |     100 |     100 |  ✅
 data/spanishFoods.ts    |   96.36 |    85.18 |     100 |     100 |  ✅
 constants/macroPresets   |     100 |      100 |     100 |     100 |  ✅
 services/personalEngine |     100 |      100 |     100 |     100 |  ✅
 services/memoryEngine   |   98.29 |    89.18 |     100 |     100 |  ✅
 services/adaptiveMacro  |   93.87 |    83.01 |     100 |   94.62 |  ✅
 store/weightStore       |   94.73 |      100 |   92.85 |   93.47 |  ✅
 store/fastingStore      |   86.66 |    73.91 |     100 |   88.57 |  ✅
 store/adaptiveStore     |   82.45 |       40 |   92.85 |      84 |  ✅
 store/waterStore        |   81.63 |       50 |   88.88 |   81.81 |  ✅
 services/exportService  |    72.6 |    82.53 |   82.75 |   72.53 |  ⚠️
 services/foodDatabase   |   71.95 |    53.91 |   71.42 |   73.61 |  ⚠️
 store/mealPlanStore     |   56.33 |       50 |   78.57 |   60.93 |  ⚠️
 store/mealStore         |   55.08 |    42.85 |   54.83 |   54.46 |  ⚠️
 services/recipeService  |   40.35 |    34.28 |   61.53 |   37.73 |  ⚠️
 (demás archivos)        |       0 |        0 |       0 |       0 |  ❌
-------------------------|---------|----------|---------|---------|
```

---

## 5. Archivos sin cobertura (0%)

Estos archivos no tienen tests. Los más impactantes para cubrir a continuación:

| Archivo | Motivo | Esfuerzo estimado |
|---------|--------|-------------------|
| `store/userStore.ts` | Gestiona auth, perfil, suscripciones | Alto (mock auth + RevenueCat) |
| `store/shoppingListStore.ts` | CRUD con Firestore directo | Alto (mock Firestore batch) |
| `services/reminderService.ts` | Notificaciones push | Medio (mock expo-notifications) |
| `hooks/useAdaptiveEngines.ts` | Orquesta engines al abrir app | Medio (React Testing Library) |
| `services/firebase.ts` | Capa de acceso a datos | Alto (mock completo Firestore) |
| `store/recipeStore.ts` | CRUD recetas | Medio |
| `store/templateStore.ts` | CRUD templates | Medio |
| `services/openai.ts` | Llamadas a GPT | Alto (mock fetch) |

---

## 6. Recomendaciones técnicas

1. **CI:** Añadir `npm test` al pipeline de EAS Build (via `eas-build-pre-install` script) para que los tests se ejecuten antes de cada build
2. **Usar `jest.useFakeTimers()`** en tests que dependen de `new Date()` para eliminar flakiness
3. **Considerar extraer funciones puras** de los stores a archivos `utils/` para facilitar el testing sin mocks
4. **Añadir React Testing Library** (`@testing-library/react-native`) para testear hooks y componentes
5. **Añadir umbral de cobertura** en `jest.config.js` para evitar regresiones:
   ```js
   coverageThreshold: { global: { statements: 30, branches: 20, functions: 35, lines: 30 } }
   ```
