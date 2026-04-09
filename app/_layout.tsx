// ============================================
// Cals2Gains - Root Layout
// ============================================

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { initializeRevenueCat } from '../services/revenuecat';
import '../i18n'; // Initialize i18n

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initAuth, authInitialized } = useUserStore();

  const [fontsLoaded] = useFonts({
    'Outfit-Bold': require('../brand-assets/fonts/Outfit-Bold.ttf'),
    'Outfit-Regular': require('../brand-assets/fonts/Outfit-Regular.ttf'),
    'InstrumentSans-Regular': require('../brand-assets/fonts/InstrumentSans-Regular.ttf'),
    'InstrumentSans-Bold': require('../brand-assets/fonts/InstrumentSans-Bold.ttf'),
    'InstrumentSans-Italic': require('../brand-assets/fonts/InstrumentSans-Italic.ttf'),
    'InstrumentSans-BoldItalic': require('../brand-assets/fonts/InstrumentSans-BoldItalic.ttf'),
    'GeistMono-Regular': require('../brand-assets/fonts/GeistMono-Regular.ttf'),
    'GeistMono-Bold': require('../brand-assets/fonts/GeistMono-Bold.ttf'),
  });

  useEffect(() => {
    // Initialize RevenueCat
    initializeRevenueCat();

    // Initialize Firebase Auth listener
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded && authInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authInitialized]);

  if (!fontsLoaded || !authInitialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="analysis"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="food-search"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="barcode-scanner"
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="weight-tracker"
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}