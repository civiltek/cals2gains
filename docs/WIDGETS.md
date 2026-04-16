# Widgets — Cals2Gains

> Estado: **infraestructura JS lista** — activación pendiente de build nativo

## Resumen

| Plataforma | Widget pequeño (2×2) | Widget mediano (4×2) | Estado |
|------------|---------------------|---------------------|--------|
| Android    | Calorías + barra circular | Cal + P/C/G con barras | Config plugin pendiente |
| iOS        | Calorías + barra circular | Cal + P/C/G con barras | WidgetKit pendiente |

La capa JS (`services/widgetDataService.ts`) ya está implementada y lista.
Sincroniza los datos en `AsyncStorage` bajo la clave `@cals2gains/widget_data`.

---

## Diseño

### Widget pequeño (2×2)
```
┌─────────────────┐
│  [●] Cals2Gains │
│                 │
│   🔥 1.450      │
│   ───────── 72% │
│   de 2.000 kcal │
└─────────────────┘
```
- Fondo: `#17121D` (dark)
- Barra de progreso circular: `#FF6A4D` (coral)
- Texto principal: `#F7F2EA` (bone)

### Widget mediano (4×2)
```
┌──────────────────────────────────┐
│  🔥 Cals2Gains      1.450/2.000  │
│  ████████████░░░░░  72%  kcal    │
│                                  │
│  P  125/150g  ████████░  83%     │
│  C  180/220g  ██████░░░  81%     │
│  G   45/ 65g  █████░░░░  69%     │
└──────────────────────────────────┘
```
- Barras: Proteína `#9C8CFF` (violet), Carbs `#FF9800` (orange), Grasas `#FFD700` (gold)

---

## Activación — Android

### Requisitos
- Expo SDK 54, managed workflow con config plugins
- Siguiente build EAS (no requiere eject)

### Paso 1: Instalar dependencia
```bash
npx expo install react-native-android-widget
```

### Paso 2: Crear el layout del widget

Crear `android/app/src/main/res/layout/widget_small.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#17121D"
    android:padding="12dp">

    <TextView
        android:id="@+id/widget_calories"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="#F7F2EA"
        android:textSize="28sp"
        android:textStyle="bold"
        android:layout_centerHorizontal="true"
        android:layout_centerVertical="true" />

    <TextView
        android:id="@+id/widget_goal"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="#F7F2EA80"
        android:textSize="12sp"
        android:layout_below="@id/widget_calories"
        android:layout_centerHorizontal="true" />

    <ProgressBar
        android:id="@+id/widget_progress"
        style="@style/Widget.AppCompat.ProgressBar.Horizontal"
        android:layout_width="match_parent"
        android:layout_height="8dp"
        android:progressTint="#FF6A4D"
        android:layout_alignParentBottom="true"
        android:layout_margin="8dp" />
</RelativeLayout>
```

### Paso 3: Crear el AppWidgetProvider

Crear `android/app/src/main/java/com/civiltek/cals2gains/CaloriesWidget.kt`:
```kotlin
package com.civiltek.cals2gains

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

class CaloriesWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Leer datos desde SharedPreferences (bridge con AsyncStorage de RN)
        val prefs = context.getSharedPreferences(
            "RCTAsyncLocalStorage_V1", Context.MODE_PRIVATE
        )
        val raw = prefs.getString("@cals2gains/widget_data", null)

        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.widget_small)

            if (raw != null) {
                try {
                    val data = JSONObject(raw)
                    val consumed = data.getJSONObject("consumed")
                    val goals = data.getJSONObject("goals")
                    val progress = data.getJSONObject("progress")

                    val calories = consumed.getInt("calories")
                    val goalCal = goals.getInt("calories")
                    val pct = progress.getInt("calories")

                    views.setTextViewText(R.id.widget_calories, calories.toString())
                    views.setTextViewText(R.id.widget_goal, "de $goalCal kcal")
                    views.setProgressBar(R.id.widget_progress, 100, pct, false)
                } catch (e: Exception) {
                    views.setTextViewText(R.id.widget_calories, "--")
                }
            }

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
```

### Paso 4: Config plugin

Crear `plugins/withAndroidWidget.js`:
```js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidWidget(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    if (!app.receiver) app.receiver = [];

    app.receiver.push({
      $: {
        'android:name': '.CaloriesWidget',
        'android:exported': 'true',
        'android:label': 'Cals2Gains',
      },
      'intent-filter': [{
        action: [{
          $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' }
        }]
      }],
      'meta-data': [{
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/widget_info'
        }
      }]
    });

    return config;
  });
};
```

Añadir en `app.json`:
```json
{
  "expo": {
    "plugins": [
      "./plugins/withAndroidWidget"
    ]
  }
}
```

### Paso 5: Llamar al servicio desde JS

En `store/mealStore.ts`, después de `addMeal` y `deleteMeal`:
```ts
import { widgetDataService } from '../services/widgetDataService';

// Al final de addMeal:
await widgetDataService.sync(
  { calories: todayNutrition.calories, protein: ..., carbs: ..., fat: ... },
  { calories: user.goals.calories, protein: ..., carbs: ..., fat: ... },
  user.language
);
```

---

## Activación — iOS (WidgetKit)

iOS requiere un App Extension target separado. Solo posible tras `expo prebuild` o
con la cuenta Apple Developer activa y un config plugin de WidgetKit.

### Cuando la cuenta Apple Developer esté verificada:

1. Instalar: `npx expo install expo-modules-core`
2. Usar config plugin de WidgetKit (community: `expo-widget-extension`)
3. Crear `widgets/CaloriesWidget.swift` con SwiftUI + WidgetKit
4. Leer datos desde App Group compartido (misma clave que AsyncStorage en iOS)

### Estructura SwiftUI del widget pequeño (referencia):
```swift
import WidgetKit
import SwiftUI

struct CaloriesEntry: TimelineEntry {
    let date: Date
    let calories: Int
    let goal: Int
    let progress: Double
}

struct SmallWidgetView: View {
    var entry: CaloriesEntry

    var body: some View {
        ZStack {
            Color(hex: "17121D")
            VStack(spacing: 4) {
                Text("\(entry.calories)")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(Color(hex: "F7F2EA"))
                Text("de \(entry.goal) kcal")
                    .font(.caption)
                    .foregroundColor(.gray)
                ProgressView(value: entry.progress, total: 100)
                    .tint(Color(hex: "FF6A4D"))
                    .padding(.horizontal, 8)
            }
        }
    }
}
```

---

## Estado actual (2026-04-16)

| Componente | Estado |
|-----------|--------|
| `services/widgetDataService.ts` | ✅ Implementado |
| Android config plugin | ⏳ Pendiente (siguiente build EAS) |
| Android AppWidgetProvider | ⏳ Pendiente |
| iOS WidgetKit extension | ⏳ Pendiente (requiere Apple Developer activa) |
| Integración con mealStore | ⏳ Pendiente (añadir llamada a `widgetDataService.sync`) |

## Próximo paso concreto

Una vez que la cuenta Apple Developer esté verificada y se planifique
el siguiente build EAS, seguir los pasos de Android arriba para tenerlo
en el primer build post-lanzamiento.
