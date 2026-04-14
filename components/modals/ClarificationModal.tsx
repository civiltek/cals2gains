// ============================================
// Cals2Gains - Ingredient Clarification Modal
// ============================================
// Asks the user clarifying questions about ingredients in their food

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ClarifyingQuestion, AnalysisAnswers } from '../../types';
import { useColors } from '../../store/themeStore';

interface ClarificationModalProps {
  visible: boolean;
  questions: ClarifyingQuestion[];
  dishName: string;
  onConfirm: (answers: AnalysisAnswers) => void;
  onSkip: () => void;
  isRefining?: boolean;
}

const ClarificationModal: React.FC<ClarificationModalProps> = ({
  visible,
  questions,
  dishName,
  onConfirm,
  onSkip,
  isRefining = false,
}) => {
  const { t, i18n } = useTranslation();
  const C = useColors();
  const styles = useMemo(() => createStyles(C), [C]);
  const [answers, setAnswers] = useState<AnalysisAnswers>({});

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const handleSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleConfirm = () => {
    onConfirm(answers);
    setAnswers({});
  };

  const handleSkip = () => {
    setAnswers({});
    onSkip();
  };

  const getQuestionText = (question: ClarifyingQuestion) => {
    return i18n.language === 'es' ? question.questionEs : question.questionEn;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle" size={32} color={C.primary} />
            </View>
            <Text style={styles.title}>{t('analysis.clarifyTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('analysis.clarifySubtitle')}
            </Text>
            <Text style={styles.dishName}>{dishName}</Text>
          </View>

          {/* Questions */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {questions.map((question, index) => (
              <View key={question.id} style={styles.questionContainer}>
                <Text style={styles.questionNumber}>
                  {index + 1}/{questions.length}
                </Text>
                <Text style={styles.questionText}>
                  {getQuestionText(question)}
                </Text>

                <View style={styles.optionsContainer}>
                  {question.options.map((option) => {
                    const isSelected = answers[question.id] === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                        onPress={() => handleSelect(question.id, option)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.optionCheck,
                          isSelected && styles.optionCheckSelected,
                        ]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isRefining}
            >
              <Text style={styles.skipText}>
                {t('common.skip')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!allAnswered || isRefining) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!allAnswered || isRefining}
            >
              {isRefining ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.confirmText}>
                    {t('common.confirm')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
    textAlign: 'center',
  },
  scrollView: {
    paddingHorizontal: 24,
    maxHeight: 400,
  },
  questionContainer: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  questionNumber: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 12,
  },
  optionButtonSelected: {
    borderColor: C.primary,
    backgroundColor: C.primary + '15',
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCheckSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  optionText: {
    fontSize: 15,
    color: C.textSecondary,
    flex: 1,
  },
  optionTextSelected: {
    color: C.text,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ClarificationModal;
