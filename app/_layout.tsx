// ============================================
// Cals2Gains - Root Layout
// ============================================

import { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useThemeStore } from '../store/themeStore';
import { useReminderStore } from '../store/reminderStore';
import { initializeRevenueCat } from '../services/revenuecat';
import '../i18n'; // Initialize i18n
import i18n from 'i18next';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync().catch(() => {
  // Silences "No native splash screen registered" warning in dev mode
});

// Modal screens — no header (they have their own close button)
const modalOptions = {
  animation: 'slide_from_bottom' as const,
  presentation: 'modal' as const,
  headerShown: false,
};

export default function RootLayout() {
  const { initAuth, authInitialized } = useUserStore();
  const { colors, loadSavedTheme } = useThemeStore();

  // Custom back button — uses theme-aware text color
  const CustomBackButton = () => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ paddingRight: 12 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </TouchableOpacity>
  );

  // Shared header style for feature screens — theme-aware
  const featureScreenOptions = {
    animation: 'slide_from_right' as const,
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
    headerBackTitle: ' ',
    headerBackTitleVisible: false,
    headerBackVisible: false,
    headerShadowVisible: false,
    headerLeft: () => <CustomBackButton />,
  };

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
    loadSavedTheme();
    initializeRevenueCat();
    const unsubscribe = initAuth();

    // Re-schedule persisted reminders on app startup
    const t = i18n.t.bind(i18n);
    useReminderStore.getState().rehydrateReminders(t).catch(() => {});

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded && authInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, authInitialized]);

  if (!fontsLoaded || !authInitialized) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colors.statusBarStyle} backgroundColor={colors.background} />
        <Stack screenOptions={{ headerShown: false, headerBackTitle: ' ', headerBackTitleVisible: false }}>
          {/* Core screens — no header */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', headerBackTitle: '' }} />

          {/* Modal screens — own close button */}
          <Stack.Screen name="analysis" options={modalOptions} />
          <Stack.Screen name="paywall" options={modalOptions} />
          <Stack.Screen name="food-search" options={{ ...modalOptions, title: i18n.t('foodSearch.searchPlaceholder') }} />
          <Stack.Screen name="barcode-scanner" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="fast-relog" options={{ ...modalOptions, title: i18n.t('home.addFirstMeal') }} />
          <Stack.Screen name="quick-add" options={{ ...modalOptions, title: i18n.t('home.addFirstMeal') }} />
          <Stack.Screen name="export-data" options={{ ...modalOptions, title: i18n.t('exportData.title') }} />
          <Stack.Screen name="coach-share" options={{ ...modalOptions, title: i18n.t('coachShare.title') }} />
          <Stack.Screen name="capture-hub" options={{ ...modalOptions, title: i18n.t('camera.title') }} />
          <Stack.Screen name="label-scanner" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="food-verification" options={{ ...modalOptions, title: i18n.t('foodVerification.title') }} />
          <Stack.Screen name="edit-meal" options={{ ...modalOptions, title: i18n.t('analysis.title') }} />

          {/* Feature screens — header with back button */}
          <Stack.Screen name="weight-tracker" options={{ ...featureScreenOptions, headerShown: false, title: i18n.t('weightTracker.title') }} />
          <Stack.Screen name="water-tracker" options={{ ...featureScreenOptions, title: i18n.t('waterTracker.title') }} />
          <Stack.Screen name="fasting" options={{ ...featureScreenOptions, title: i18n.t('fasting.title') }} />
          <Stack.Screen name="weekly-coach" options={{ ...featureScreenOptions, title: i18n.t('weeklyCoach.title') }} />
          <Stack.Screen name="analytics" options={{ ...featureScreenOptions, title: i18n.t('analytics.title') }} />
          <Stack.Screen name="recipes" options={{ ...featureScreenOptions, title: i18n.t('recipes.title') }} />
          <Stack.Screen name="meal-plan" options={{ ...featureScreenOptions, title: i18n.t('profile.mealPlan') }} />
          <Stack.Screen name="measurements" options={{ ...featureScreenOptions, headerShown: false, title: i18n.t('measurements.title') }} />
          <Stack.Screen name="progress-photos" options={{ ...featureScreenOptions, headerShown: false, title: i18n.t('progressPhotos.title') }} />
          <Stack.Screen name="protein-dashboard" options={{ ...featureScreenOptions, title: i18n.t('profile.proteinDashboard') }} />
          <Stack.Screen name="training-day" options={{ ...featureScreenOptions, title: i18n.t('trainingDay.title') }} />
          <Stack.Screen name="goal-modes" options={{ ...featureScreenOptions, title: i18n.t('goalModes.title') }} />
          <Stack.Screen name="grocery-list" options={{ ...featureScreenOptions, title: i18n.t('profile.shoppingList') }} />
          <Stack.Screen name="shopping-list" options={{ ...featureScreenOptions, title: i18n.t('profile.shoppingList') }} />
          <Stack.Screen name="what-to-eat" options={{ ...featureScreenOptions, title: i18n.t('whatToEat.title') }} />
          <Stack.Screen name="settings" options={{ ...featureScreenOptions, title: i18n.t('profile.settings') }} />
          <Stack.Screen name="help" options={{ ...featureScreenOptions, title: i18n.t('help.title') }} />
          <Stack.Screen name="about" options={{ ...featureScreenOptions, title: i18n.t('about.title') }} />
          <Stack.Screen name="edit-profile" options={{ ...modalOptions, title: i18n.t('editProfile.title') }} />
          <Stack.Screen name="ai-review" options={{ ...featureScreenOptions, title: i18n.t('profile.aiReview') }} />
          <Stack.Screen name="adherence" options={{ ...featureScreenOptions, title: i18n.t('adherence.title') }} />
          <Stack.Screen name="nutrition-mode" options={{ ...featureScreenOptions, headerShown: false, title: i18n.t('nutritionMode.title') }} />
          <Stack.Screen name="nutrition-settings" options={{ ...featureScreenOptions, headerShown: false, title: i18n.t('nutritionSettings.title') }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
