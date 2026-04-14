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

  // Check if user needs onboarding
  if (user && !user.onboardingCompleted) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
