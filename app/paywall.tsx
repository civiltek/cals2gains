// ============================================
// Cals2Gains - Paywall / Subscription Screen
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';

const LOGO_MARK = require('../brand-assets/C2G-Mark-512.png');
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useColors } from '../store/themeStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/revenuecat';
import { useUserStore } from '../store/userStore';

// Use `any` type to avoid importing native module directly (crashes in Expo Go)
type PurchasesPackage = any;

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { user, loadUserData } = useUserStore();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const available = await getOfferings();
      setPackages(available);

      // Pre-select annual as default (best value)
      const annual = available.find(
        (p) => p.packageType === 'ANNUAL' || p.identifier.includes('annual')
      );
      setSelectedPackage(annual || available[0] || null);
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;
    setIsPurchasing(true);

    try {
      const result = await purchasePackage(selectedPackage, user.uid);

      if (result.success) {
        await loadUserData(user.uid);
        Alert.alert(
          '🎉',
          t('common.done'),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      } else if (result.error !== 'cancelled') {
        Alert.alert(t('errors.generic'), result.error);
      }
    } catch (error: any) {
      Alert.alert(t('errors.generic'), error.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    setIsRestoring(true);

    try {
      const result = await restorePurchases(user.uid);

      if (result.success) {
        await loadUserData(user.uid);
        Alert.alert(
          '✅',
          t('profile.restorePurchases'),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      } else {
        Alert.alert(t('errors.generic'));
      }
    } catch (error) {
      Alert.alert(t('errors.generic'));
    } finally {
      setIsRestoring(false);
    }
  };

  const getPackagePrice = (pkg: PurchasesPackage) => {
    return pkg.product?.priceString || '—';
  };

  const getPackagePeriod = (pkg: PurchasesPackage) => {
    if (pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual')) {
      return t('paywall.annual');
    }
    return t('paywall.monthly');
  };

  const isAnnual = (pkg: PurchasesPackage) => {
    return pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual');
  };

  const features = [
    { icon: '📸', text: t('paywall.feature1') },
    { icon: '🧮', text: t('paywall.feature2') },
    { icon: '📊', text: t('paywall.feature3') },
    { icon: '🎯', text: t('paywall.feature4') },
    { icon: '🔄', text: t('paywall.feature5') },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[C.background, C.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Image source={LOGO_MARK} style={styles.heroLogo} resizeMode="contain" />
            <Text style={styles.brandWordmark}>
              <Text style={{ color: C.violet }}>Cals</Text>
              <Text style={{ color: C.coral, fontSize: 24, fontFamily: 'Outfit-Bold' }}>2</Text>
              <Text style={{ color: C.violet }}>Gains</Text>
            </Text>
            <Text style={styles.heroTitle}>{t('paywall.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('paywall.subtitle')}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Pricing plans */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.loadingText}>{t('paywall.loading')}</Text>
            </View>
          ) : (
            <View style={styles.plansContainer}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const annual = isAnnual(pkg);

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      annual && styles.planCardAnnual,
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.8}
                  >
                    {annual && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>{t('paywall.bestValue')}</Text>
                      </View>
                    )}

                    <View style={styles.planHeader}>
                      <View>
                        <Text style={[styles.planTitle, isSelected && styles.planTitleSelected]}>
                          {getPackagePeriod(pkg)}
                        </Text>
                        <Text style={styles.planPrice}>
                          {getPackagePrice(pkg)}
                          <Text style={styles.planPeriod}>
                            {annual ? t('paywall.perYear') : t('paywall.perMonth')}
                          </Text>
                        </Text>
                      </View>

                      <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    </View>

                    {annual && (
                      <Text style={styles.annualSavings}>
                        {t('paywall.savePercent', { percent: '58' })}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Fallback if no packages loaded (development) */}
              {packages.length === 0 && (
                <>
                  <TouchableOpacity
                    style={[styles.planCard, styles.planCardAnnual, styles.planCardSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>{t('paywall.bestValue')}</Text>
                    </View>
                    <View style={styles.planHeader}>
                      <View>
                        <Text style={styles.planTitleSelected}>{t('paywall.annual')}</Text>
                        <Text style={styles.planPrice}>
                          €59,90<Text style={styles.planPeriod}>{t('paywall.perYear')}</Text>
                        </Text>
                      </View>
                      <View style={styles.planRadioSelected}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={styles.annualSavings}>{t('paywall.savePercent', { percent: '44' })}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.planCard} activeOpacity={0.8}>
                    <View style={styles.planHeader}>
                      <View>
                        <Text style={styles.planTitle}>{t('paywall.monthly')}</Text>
                        <Text style={styles.planPrice}>
                          €8,90<Text style={styles.planPeriod}>{t('paywall.perMonth')}</Text>
                        </Text>
                      </View>
                      <View style={styles.planRadio} />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* CTA */}
          <View style={styles.ctaContainer}>
            {/* Trial info */}
            <View style={styles.trialInfo}>
              <Ionicons name="gift-outline" size={16} color={C.accent} />
              <Text style={styles.trialInfoText}>{t('paywall.trialInfo')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.subscribeButton, (isPurchasing || !selectedPackage) && styles.subscribeButtonDisabled]}
              onPress={handlePurchase}
              disabled={isPurchasing || !selectedPackage || isLoading}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.subscribeButtonText}>{t('paywall.subscribe')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color={C.textMuted} size="small" />
              ) : (
                <Text style={styles.restoreText}>{t('paywall.restorePurchases')}</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>{t('paywall.terms')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(C: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    closeButton: {
      position: 'absolute',
      top: 56,
      right: 20,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hero: {
      alignItems: 'center',
      paddingTop: 60,
      paddingBottom: 24,
      paddingHorizontal: 24,
    },
    heroLogo: {
      width: 72,
      height: 72,
      marginBottom: 12,
    },
    brandWordmark: {
      fontSize: 30,
      fontWeight: '800',
      fontFamily: 'Outfit-Bold',
      letterSpacing: -0.5,
      marginBottom: 14,
      textAlign: 'center',
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: C.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 16,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    featuresContainer: {
      marginHorizontal: 20,
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 20,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      gap: 14,
    },
    featureIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureEmoji: {
      fontSize: 18,
    },
    featureText: {
      flex: 1,
      fontSize: 14,
      color: C.text,
      lineHeight: 20,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: C.textSecondary,
    },
    plansContainer: {
      marginHorizontal: 20,
      gap: 12,
      marginBottom: 20,
    },
    planCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 2,
      borderColor: C.border,
      position: 'relative',
      overflow: 'hidden',
    },
    planCardSelected: {
      borderColor: C.primary,
      backgroundColor: C.primary + '10',
    },
    planCardAnnual: {
      borderColor: C.primaryLight,
    },
    bestValueBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: C.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderBottomLeftRadius: 12,
    },
    bestValueText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    planTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 4,
    },
    planTitleSelected: {
      color: C.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    planPrice: {
      fontSize: 28,
      fontWeight: '800',
      color: C.text,
    },
    planPeriod: {
      fontSize: 14,
      fontWeight: '400',
      color: C.textSecondary,
    },
    planRadio: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: C.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    planRadioSelected: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.primary,
      borderWidth: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    annualSavings: {
      fontSize: 13,
      color: C.accent,
      fontWeight: '600',
      marginTop: 6,
    },
    ctaContainer: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 12,
    },
    trialInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.accent + '15',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: C.accent + '30',
    },
    trialInfoText: {
      fontSize: 14,
      color: C.accent,
      fontWeight: '500',
    },
    subscribeButton: {
      backgroundColor: C.primary,
      borderRadius: 16,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    subscribeButtonDisabled: {
      opacity: 0.5,
    },
    subscribeButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    restoreText: {
      fontSize: 14,
      color: C.textMuted,
      textDecorationLine: 'underline',
    },
    termsText: {
      fontSize: 11,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 16,
      paddingHorizontal: 8,
    },
  });
}
