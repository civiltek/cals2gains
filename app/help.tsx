/**
 * Help / FAQ Screen
 * Cals2Gains React Native app
 */

import React, { useState } from 'react';
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
import { useColors } from '../store/themeStore';

// ============================================================================
// FAQ DATA
// ============================================================================

interface FAQItem {
  question: string;
  answer: string;
  icon: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'help.faq1.q',
    answer: 'help.faq1.a',
    icon: 'restaurant-outline',
  },
  {
    question: 'help.faq2.q',
    answer: 'help.faq2.a',
    icon: 'camera-outline',
  },
  {
    question: 'help.faq3.q',
    answer: 'help.faq3.a',
    icon: 'barcode-outline',
  },
  {
    question: 'help.faq4.q',
    answer: 'help.faq4.a',
    icon: 'flag-outline',
  },
  {
    question: 'help.faq5.q',
    answer: 'help.faq5.a',
    icon: 'sparkles-outline',
  },
  {
    question: 'help.faq6.q',
    answer: 'help.faq6.a',
    icon: 'school-outline',
  },
  {
    question: 'help.faq7.q',
    answer: 'help.faq7.a',
    icon: 'scale-outline',
  },
  {
    question: 'help.faq8.q',
    answer: 'help.faq8.a',
    icon: 'share-social-outline',
  },
  {
    question: 'help.faq9.q',
    answer: 'help.faq9.a',
    icon: 'bag-handle-outline',
  },
  {
    question: 'help.faq10.q',
    answer: 'help.faq10.a',
    icon: 'shield-checkmark-outline',
  },
];

// ============================================================================
// SCREEN
// ============================================================================

export default function HelpScreen() {
  const C = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:info@civiltek.es?subject=Soporte%20Cals2Gains');
  };

  const handleVisitWeb = () => {
    Linking.openURL('https://cals2gains.com');
  };

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
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('help.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* INTRO */}
      <View style={[styles.introCard, { backgroundColor: C.card }]}>
        <Ionicons name="help-buoy" size={32} color={C.primary} />
        <Text style={[styles.introTitle, { color: C.text }]}>{t('help.intro')}</Text>
        <Text style={[styles.introText, { color: C.textSecondary }]}>
          {t('help.introDesc')}
        </Text>
      </View>

      {/* FAQ LIST */}
      <View style={styles.faqSection}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('help.faq')}</Text>

        {FAQ_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.faqItem, { backgroundColor: C.card }]}
            onPress={() => toggleFAQ(index)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <View style={[styles.faqIconContainer, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons name={item.icon as any} size={20} color={C.primary} />
              </View>
              <Text style={[styles.faqQuestion, { color: C.text }]}>{t(item.question)}</Text>
              <Ionicons
                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={C.textSecondary}
              />
            </View>
            {expandedIndex === index && (
              <Text style={[styles.faqAnswer, { color: C.textSecondary }]}>{t(item.answer)}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTACT */}
      <View style={styles.contactSection}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('help.contactSection')}</Text>

        <TouchableOpacity style={[styles.contactButton, { backgroundColor: C.card }]} onPress={handleContactSupport} activeOpacity={0.7}>
          <Ionicons name="mail-outline" size={22} color={C.primary} />
          <View style={styles.contactButtonContent}>
            <Text style={[styles.contactButtonTitle, { color: C.text }]}>{t('help.contactSupport')}</Text>
            <Text style={[styles.contactButtonSubtitle, { color: C.textSecondary }]}>info@civiltek.es</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.contactButton, { backgroundColor: C.card }]} onPress={handleVisitWeb} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={22} color={C.primary} />
          <View style={styles.contactButtonContent}>
            <Text style={[styles.contactButtonTitle, { color: C.text }]}>{t('help.visitWeb')}</Text>
            <Text style={[styles.contactButtonSubtitle, { color: C.textSecondary }]}>cals2gains.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
        </TouchableOpacity>
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

  // INTRO
  introCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // FAQ
  faqSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  faqItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    marginLeft: 42,
  },

  // CONTACT
  contactSection: {
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  contactButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  contactButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactButtonSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
