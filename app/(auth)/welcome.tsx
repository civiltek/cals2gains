// ============================================
// Cals2Gains - Welcome / Login Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useTranslation } from 'react-i18next';
import Colors from '../../constants/colors';
import { signInWithGoogle, signInWithApple } from '../../services/firebase';
import { useUserStore } from '../../store/userStore';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { loadUserData } = useUserStore();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error('No ID token received from Google');

      const user = await signInWithGoogle(idToken);
      await loadUserData(user.uid);
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('errors.authFailed'), error.message || t('errors.generic'));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identity token from Apple');

      // Generate a nonce for security (in production, use a proper crypto library)
      const nonce = Math.random().toString(36).substring(2);

      const user = await signInWithApple(credential.identityToken, nonce);
      await loadUserData(user.uid);
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('errors.authFailed'), error.message || t('errors.generic'));
      }
    } finally {
      setLoading(null);
    }
  };

  const features = [
    { icon: '📸', text: t('paywall.feature1') },
    { icon: '🎯', text: t('paywall.feature2') },
    { icon: '📊', text: t('paywall.feature3') },
    { icon: '💪', text: t('paywall.feature4') },
  ];

  return (
    <LinearGradient
      colors={[Colors.background, '#1a1040', Colors.background]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + Title */}
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🔬</Text>
            </View>
            <Text style={styles.appName}>{t('appName')}</Text>
            <Text style={styles.tagline}>{t('auth.welcome')}</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Trial info badge */}
          <View style={styles.trialBadge}>
            <Ionicons name="gift-outline" size={16} color={Colors.accent} />
            <Text style={styles.trialText}>{t('auth.trialInfo')}</Text>
          </View>

          {/* Auth buttons */}
          <View style={styles.authButtons}>
            {/* Google Sign-In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading !== null}
              activeOpacity={0.8}
            >
              {loading === 'google' ? (
                <ActivityIndicator color={Colors.black} size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>{t('auth.signInGoogle')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Sign-In (iOS only) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignIn}
                disabled={loading !== null}
                activeOpacity={0.8}
              >
                {loading === 'apple' ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color={Colors.white} />
                    <Text style={styles.appleButtonText}>{t('auth.signInApple')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Legal */}
          <Text style={styles.legalText}>
            {t('auth.bySigningIn')}{' '}
            <Text style={styles.legalLink}>{t('auth.termsOfService')}</Text>
            {' '}{t('auth.and')}{' '}
            <Text style={styles.legalLink}>{t('auth.privacyPolicy')}</Text>
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 20,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primaryLight,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 14,
  },
  featureIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent + '15',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  trialText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  authButtons: {
    gap: 12,
    marginBottom: 20,
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
  },
  appleButton: {
    backgroundColor: Colors.black,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  legalText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  legalLink: {
    color: Colors.primaryLight,
    textDecorationLine: 'underline',
  },
});
