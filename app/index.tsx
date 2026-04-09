// ============================================
// Cals2Gains - Index (Route Guard)
// ============================================

import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { View, ActivityIndicator } from 'react-native';
import Colors from '../constants/colors';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useUserStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Check if user has completed onboarding (has a real age set)
  if (user && user.profile.age === 30 && !user.profile.weight) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
