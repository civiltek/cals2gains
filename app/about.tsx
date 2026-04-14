/**
 * About Screen
 * Cals2Gains React Native app
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS } from '../theme';
import { useColors } from '../store/themeStore';

// ============================================================================
// SCREEN
// ============================================================================

export default function AboutScreen() {
  const C = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const appVersion = '1.0.0';
  const buildNumber = '1';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('about.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* APP BRANDING */}
      <View style={[styles.brandCard, { backgroundColor: C.card }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            <Text style={{ color: C.primary }}>Cals</Text>
            <Text style={{ color: C.accent }}>2</Text>
            <Text style={{ color: C.primary }}>Gains</Text>
          </Text>
        </View>
        <Text style={[styles.tagline, { color: C.textSecondary }]}>{t('about.tagline')}</Text>
        <Text style={[styles.versionText, { color: C.textTertiary, backgroundColor: `${C.primary}15` }]}>
          {t('about.version')} {appVersion} ({buildNumber})
        </Text>
      </View>

      {/* DESCRIPTION */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('about.whatIs')}</Text>
        <Text style={[styles.bodyText, { color: C.textSecondary }]}>
          {t('about.description')}
        </Text>
        <Text style={[styles.bodyText, { color: C.textSecondary }]}>
          {t('about.description2')}
        </Text>
      </View>

      {/* LINKS */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('about.links')}</Text>

        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: C.card }]}
          onPress={() => Linking.openURL('https://cals2gains.com')}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={20} color={C.primary} />
          <Text style={[styles.linkText, { color: C.text }]}>{t('about.website')}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: C.card }]}
          onPress={() => Linking.openURL('https://cals2gains.com/terms')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={20} color={C.primary} />
          <Text style={[styles.linkText, { color: C.text }]}>{t('about.termsOfService')}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: C.card }]}
          onPress={() => Linking.openURL('https://cals2gains.com/privacy')}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={C.primary} />
          <Text style={[styles.linkText, { color: C.text }]}>{t('about.privacyPolicy')}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: C.card }]}
          onPress={() => Linking.openURL('mailto:info@civiltek.es?subject=Contacto%20Cals2Gains')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={20} color={C.primary} />
          <Text style={[styles.linkText, { color: C.text }]}>{t('about.contact')}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* CREDITS */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('about.credits')}</Text>
        <Text style={[styles.bodyText, { color: C.textSecondary }]}>
          {t('about.developedBy')}
        </Text>
        <Text style={[styles.bodyText, { color: C.textSecondary }]}>
          {t('about.poweredBy')}
        </Text>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: C.textTertiary }]}>{t('about.copyright')}</Text>
        <Text style={[styles.footerText, { color: C.textTertiary }]}>{t('about.allRights')}</Text>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },

  // BRAND
  brandCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  tagline: {
    fontSize: 14,
    marginBottom: 12,
  },
  versionText: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // SECTIONS
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  // LINKS
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
});
