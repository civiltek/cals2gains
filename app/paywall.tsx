// ============================================
// Cals2Gains - Paywall / Subscription Screen
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Colors from '../constants/colors';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/revenuecat';
import { useUserStore } from '../store/userStore';
import { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { user, loadUserData } = useUserStore();

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
        colors={['#1a0a3e', Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>🔬</Text>
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
              <ActivityIndicator color={Colors.primary} />
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
                          <Ionicons name="checkmark" size={16} color={Colors.white} />
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
                          €49,99<Text style={styles.planPeriod}>{t('paywall.perYear')}</Text>
                        </Text>
                      </View>
                      <View style={styles.planRadioSelected}>
                        <Ionicons name="checkmark" size={16} color={Colors.white} />
                      </View>
                    </View>
                    <Text style={styles.annualSavings}>{t('paywall.savePercent', { percent: '58' })}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.planCard} activeOpacity={0.8}>
                    <View style={styles.planHeader}>
                      <View>
                        <Text style={styles.planTitle}>{t('paywall.monthly')}</Text>
                        <Text style={styles.planPrice}>
                          €9,99<Text style={styles.planPeriod}>{t('paywall.perMonth')}</Text>
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
              <Ionicons name="gift-outline" size={16} color={Colors.accent} />
              <Text style={styles.trialInfoText}>{t('paywall.trialInfo')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.subscribeButton, (isPurchasing || !selectedPackage) && styles.subscribeButtonDisabled]}
              onPress={handlePurchase}
              disabled={isPurchasing || !selectedPackage || isLoading}
            >
              {isPurchasing ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={Colors.white} />
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
                <ActivityIndicator color={Colors.textMuted} size="small" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  plansContainer: {
    marginHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  planCardAnnual: {
    borderColor: Colors.primaryLight,
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
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
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  planTitleSelected: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  planRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  annualSavings: {
    fontSize: 13,
    color: Colors.accent,
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
    backgroundColor: Colors.accent + '15',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  trialInfoText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
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
    color: Colors.white,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});
