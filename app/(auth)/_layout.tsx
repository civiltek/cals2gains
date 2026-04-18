import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="age-gate" />
      <Stack.Screen name="screening" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
