// ============================================
// Cals2Gains - Index (Route Guard)
// ============================================

import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useColors } from '../store/themeStore';

export default function Index() {
  const C = useColors();
  const { isAuthenticated, isLoading, user } = useUserStore();

  // Web demo mode: skip loading state and auth check
  if (Platform.OS === 'web') {
    return <Redirect href="/(tabs)" />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // --- Fase B compliance gates ---
  // 1) Age gate (dateOfBirth) debe completarse antes de nada.
  if (user && !user.dateOfBirth) {
    return <Redirect href="/(auth)/age-gate" />;
  }

  // 2) Screening médico — se considera completado cuando existe la clave
  //    `medicalFlags` en el usuario (array, puede estar vacía = "ninguna").
  if (user && user.medicalFlags === undefined) {
    return <Redirect href="/(auth)/screening" />;
  }

  // 3) Onboarding clásico.
  if (user && !user.onboardingCompleted) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
