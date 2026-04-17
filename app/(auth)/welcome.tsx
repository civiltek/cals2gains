// ============================================
// Cals2Gains - Welcome / Login Screen
// ============================================

import React, { useState, useMemo } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { useColors } from '../../store/themeStore';

const LOGO_MARK = require('../../brand-assets/C2G-Mark-512.png');
import { signInWithGoogle, signInWithApple, signInWithEmail, createAccountWithEmail } from '../../services/firebase';
import { useUserStore } from '../../store/userStore';

// Conditional import — native module not available in Expo Go
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
} catch (e) {
  console.warn('[GoogleSignIn] Native module not available (Expo Go mode)');
}

export default function WelcomeScreen() {
  const C = useColors();
  const { t } = useTranslation();
  const { loadUserData } = useUserStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const styles = useMemo(() => createStyles(C), [C]);

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Alert.alert(t('errors.error'), t('errors.googleUnavailable'));
      return;
    }
    setLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error('No ID token received from Google');

      const user = await signInWithGoogle(idToken);
      await loadUserData(user.uid);
      router.replace('/');
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

      // Generate a cryptographically secure nonce
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36) + Date.now().toString()
      );

      const user = await signInWithApple(credential.identityToken, nonce);
      await loadUserData(user.uid);
      router.replace('/');
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('errors.authFailed'), error.message || t('errors.generic'));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('errors.error'), t('errors.emailRequired'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('errors.error'), t('errors.passwordTooShort'));
      return;
    }
    setLoading('email');
    try {
      let user;
      if (isCreatingAccount) {
        user = await createAccountWithEmail(email.trim(), password);
      } else {
        user = await signInWithEmail(email.trim(), password);
      }
      await loadUserData(user.uid);
      router.replace('/');
    } catch (error: any) {
      let message = error.message || t('errors.unknown');
      if (error.code === 'auth/user-not-found') {
        message = t('errors.userNotFound');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = t('errors.wrongPassword');
      } else if (error.code === 'auth/email-already-in-use') {
        message = t('errors.emailInUse');
      } else if (error.code === 'auth/invalid-email') {
        message = t('errors.invalidEmail');
      } else if (error.code === 'auth/weak-password') {
        message = t('errors.weakPassword');
      }
      Alert.alert(t('errors.error'), message);
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
      colors={[C.background, '#1a1040', C.background]}
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
              <Image source={LOGO_MARK} style={{ width: 56, height: 56 }} resizeMode="contain" />
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
            <Ionicons name="gift-outline" size={16} color={C.accent} />
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
              accessibilityRole="button"
              accessibilityLabel={t('auth.signInGoogle')}
              accessibilityState={{ disabled: loading !== null, busy: loading === 'google' }}
            >
              {loading === 'google' ? (
                <ActivityIndicator color={C.text} size="small" />
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
                accessibilityRole="button"
                accessibilityLabel={t('auth.signInApple')}
                accessibilityState={{ disabled: loading !== null, busy: loading === 'apple' }}
              >
                {loading === 'apple' ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                    <Text style={styles.appleButtonText}>{t('auth.signInApple')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Password form */}
          <View style={styles.emailSection}>
            <TextInput
              style={styles.emailInput}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={loading === null}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('auth.password')}
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={loading === null}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                }
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={handleEmailAuth}
              disabled={loading !== null}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isCreatingAccount ? t('auth.createAccount') : t('auth.signInEmail')}
              accessibilityState={{ disabled: loading !== null, busy: loading === 'email' }}
            >
              {loading === 'email' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emailButtonText}>
                    {isCreatingAccount ? t('auth.createAccount') : t('auth.signInEmail')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsCreatingAccount(!isCreatingAccount)}
              disabled={loading !== null}
            >
              <Text style={styles.toggleAuthText}>
                {isCreatingAccount
                  ? t('auth.alreadyHaveAccount')
                  : t('auth.noAccount')}
              </Text>
            </TouchableOpacity>
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

function createStyles(C: any) {
  return StyleSheet.create({
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
      backgroundColor: C.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.primary + '40',
    },
    logoEmoji: {
      fontSize: 40,
    },
    appName: {
      fontSize: 32,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    tagline: {
      fontSize: 16,
      fontWeight: '500',
      color: C.primaryLight,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
      includeFontPadding: false,
    },
    featuresContainer: {
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.border,
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
      color: C.text,
      lineHeight: 20,
      includeFontPadding: false,
    },
    trialBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.accent + '15',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: C.accent + '30',
    },
    trialText: {
      fontSize: 14,
      color: C.accent,
      fontWeight: '500',
    },
    authButtons: {
      gap: 12,
      marginBottom: 20,
    },
    googleButton: {
      backgroundColor: '#FFFFFF',
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
      color: '#000000',
    },
    appleButton: {
      backgroundColor: '#000000',
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    appleButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.border,
    },
    dividerText: {
      fontSize: 13,
      color: C.textMuted,
    },
    emailSection: {
      gap: 10,
      marginBottom: 20,
    },
    emailInput: {
      backgroundColor: C.surface,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: C.text,
    },
    eyeButton: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    emailButton: {
      backgroundColor: C.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 4,
    },
    emailButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    toggleAuthText: {
      fontSize: 13,
      color: C.primaryLight,
      textAlign: 'center',
      marginTop: 4,
    },
    legalText: {
      fontSize: 12,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 20,
      includeFontPadding: false,
    },
    legalLink: {
      color: C.primaryLight,
      textDecorationLine: 'underline',
    },
  });
}
