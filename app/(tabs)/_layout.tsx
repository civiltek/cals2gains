// ============================================
// Cals2Gains - Tab Navigator Layout (Theme-aware)
// ============================================

import { Tabs } from 'expo-router';
import { View, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../store/themeStore';

function CameraTabButton({ onPress, colors, label }: { onPress?: () => void; colors: any; label: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        top: Platform.OS === 'ios' ? -18 : -12,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
          overflow: 'visible',
        }}
      >
        <Ionicons name="camera" size={26} color={colors.white || '#FFFFFF'} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const C = useColors();
  const insets = useSafeAreaInsets();

  // On Android respect the system nav-bar (3-button or gesture) so the tab bar
  // doesn't overlap with Samsung's bottom controls.
  const baseHeight = Platform.OS === 'ios' ? 84 : 68;
  const basePaddingBottom = Platform.OS === 'ios' ? 24 : 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: baseHeight + (Platform.OS === 'android' ? insets.bottom : 0),
          paddingBottom: basePaddingBottom + (Platform.OS === 'android' ? insets.bottom : 0),
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' as const },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.today'),
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: t('history.title'),
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarAccessibilityLabel: t('home.analyzeFood'),
          tabBarButton: (props: any) => (
            <CameraTabButton {...props} colors={C} label={t('home.analyzeFood')} />
          ),
        }}
      />

      <Tabs.Screen
        name="tools"
        options={{
          title: t('common.tools'),
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
