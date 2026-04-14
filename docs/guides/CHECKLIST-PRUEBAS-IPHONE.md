# Checklist de Pruebas — iPhone

**App:** Cals2Gains  
**Fecha:** 11 de abril de 2026  
**Cambios en esta sesión:** Headers de marca en todas las pestañas, i18n completo (ES/EN), búsqueda de alimentos en español, limpieza de duplicados.

---

## 1. Iniciar la app

- [ ] Ejecutar `npx expo start` y escanear el QR con Expo Go en el iPhone
- [ ] La app arranca sin crashes ni pantallas en blanco
- [ ] La splash screen se muestra correctamente

---

## 2. Header de marca (todas las pestañas)

- [ ] **Pestaña Hoy:** Logo C2G (32×32) + "Cals2Gains" (violeta/coral) + campana de notificaciones
- [ ] **Pestaña Historial:** Mismo header de marca idéntico al de Hoy
- [ ] **Pestaña Herramientas:** Mismo header de marca idéntico al de Hoy
- [ ] **Pestaña Perfil:** Mismo header de marca idéntico al de Hoy
- [ ] **Pestaña Cámara:** Sin header de marca (pantalla completa de cámara — correcto)
- [ ] En modo oscuro, los textos y el logo se ven bien sobre fondo oscuro
- [ ] En modo claro, los textos y el logo se ven bien sobre fondo claro

---

## 3. Idioma — Español (por defecto)

Navegar por TODAS las pantallas y comprobar que **no hay textos en inglés mezclados**:

### Pestañas principales
- [ ] Hoy — todos los textos en español
- [ ] Historial — todos los textos en español
- [ ] Herramientas — todos los textos en español
- [ ] Perfil — todos los textos en español

### Pantallas secundarias (acceder desde Herramientas/Perfil)
- [ ] Configuración nutricional — textos en español
- [ ] Seguimiento de peso — textos en español
- [ ] Seguimiento de agua — textos en español
- [ ] Ayuno intermitente — textos en español
- [ ] Recetas — textos en español
- [ ] Lista de la compra — textos en español
- [ ] Qué comer — textos en español
- [ ] Fotos de progreso — textos en español
- [ ] Analíticas — textos en español
- [ ] Adherencia — textos en español
- [ ] Coach semanal — textos en español
- [ ] Ajustes — textos en español
- [ ] Editar perfil — textos en español
- [ ] Exportar datos — textos en español
- [ ] Acerca de — textos en español
- [ ] Ayuda — textos en español

### Títulos de navegación (barra superior)
- [ ] Al entrar en cada pantalla, el título de la barra de navegación aparece en español (no en inglés)

---

## 4. Idioma — Cambiar a Inglés

- [ ] Ir a Perfil → Ajustes → cambiar idioma a English
- [ ] Los textos de la app cambian a inglés inmediatamente
- [ ] Navegar por 4-5 pantallas y comprobar que están en inglés
- [ ] Volver a cambiar a Español y confirmar que todo vuelve al español

---

## 5. Búsqueda de alimentos en español

- [ ] Buscar "pollo" → aparecen resultados en español (de la base de datos local española)
- [ ] Buscar "arroz" → aparecen resultados en español
- [ ] Buscar "manzana" → aparecen resultados en español
- [ ] Buscar un producto por nombre en inglés (ej. "chicken breast") → el nombre se traduce al español
- [ ] Buscar un producto de marca (ej. "Coca-Cola") → aparecen resultados de OpenFoodFacts con datos en español
- [ ] Los resultados muestran calorías y macros correctamente

---

## 6. Escáner de código de barras

- [ ] Abrir el escáner de código de barras
- [ ] Escanear un producto → el nombre aparece en español (si está disponible)
- [ ] Los datos nutricionales se cargan correctamente

---

## 7. Configuración nutricional (sin duplicados)

- [ ] **Perfil** → "Configuración nutricional" está disponible ✓
- [ ] **Herramientas** → "Configuración nutricional" ya NO aparece (fue eliminada)

---

## 8. Onboarding (si se puede probar)

- [ ] Los 7 pasos del onboarding muestran textos en español
- [ ] Las opciones de género, objetivo, ritmo, actividad y experiencia se ven en español
- [ ] El resumen final (paso 7) muestra los datos seleccionados correctamente

---

## 9. Cámara y análisis AI

- [ ] La cámara se abre correctamente
- [ ] Tomar foto de un plato → el análisis devuelve resultados
- [ ] Los resultados del análisis se muestran en español

---

## 10. Modo oscuro / claro

- [ ] Cambiar entre modo oscuro y claro en Ajustes
- [ ] Todas las pantallas respetan el tema seleccionado
- [ ] No hay textos invisibles (texto blanco sobre fondo blanco, o negro sobre negro)

---

## Notas

- Los 119 warnings de TypeScript son pre-existentes (tipos de Zustand stores) y no afectan al funcionamiento de la app.
- Si algo falla al buscar alimentos, verificar conexión a internet (OpenFoodFacts requiere red).
- Para probar el onboarding desde cero, puede ser necesario borrar los datos de la app en Expo Go.
