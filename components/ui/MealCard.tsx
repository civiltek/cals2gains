// ============================================
// Cals2Gains - Meal Card Component
// ============================================

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Meal } from '../../types';
import { useColors } from '../../store/themeStore';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface MealCardProps {
  meal: Meal;
  onDelete?: (mealId: string) => void;
  onEdit?: (meal: Meal) => void;
  onPress?: (meal: Meal) => void;
  compact?: boolean;
  nutritionMode?: 'simple' | 'advanced';
}

const MealCard: React.FC<MealCardProps> = ({ meal, onDelete, onEdit, onPress, compact = false, nutritionMode = 'simple' }) => {
  const { t, i18n } = useTranslation();
  const C = useColors();
  const styles = createStyles(C);
  const locale = i18n.language === 'es' ? es : enUS;

  const dishName = i18n.language === 'es' ? meal.dishNameEs : meal.dishNameEn;

  // Prefer cloud URL (works everywhere), fall back to local URI (mobile only)
  const photoSource = meal.photoUrl || meal.photoUri;
  const canShowPhoto = photoSource && (
    Platform.OS !== 'web' ||
    photoSource.startsWith('data:') ||
    photoSource.startsWith('http')
  );

  const handleDelete = () => {
    Alert.alert(
      t('history.deleteConfirm'),
      t('history.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(meal.id),
        },
      ]
    );
  };

  if (compact) {
    const calories = Math.round(meal.nutrition?.calories ?? 0);
    const protein = Math.round(meal.nutrition?.protein ?? 0);

    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => onPress?.(meal)}
        activeOpacity={0.7}
      >
        {canShowPhoto ? (
          <Image source={{ uri: photoSource }} style={styles.compactImage} />
        ) : (
          <View style={[styles.compactImage, styles.imagePlaceholder]}>
            <Ionicons name="fast-food" size={20} color={C.textMuted} />
          </View>
        )}

        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {dishName || meal.dishName}
          </Text>
          <Text style={styles.compactTime}>
            {format(meal.timestamp, 'HH:mm', { locale })}
          </Text>
        </View>

        <View style={styles.compactMacros}>
          <Text style={styles.compactMacroText}>
            {calories} kcal <Text style={styles.compactMacroDot}>·</Text> {protein}g P <Text style={styles.compactMacroDot}>·</Text> {Math.round(meal.nutrition?.carbs ?? 0)}g C <Text style={styles.compactMacroDot}>·</Text> {Math.round(meal.nutrition?.fat ?? 0)}g G
            {nutritionMode === 'advanced' && (meal.nutrition?.fiber ?? 0) > 0 && (
              <Text style={styles.compactMacroDot}> · {Math.round(meal.nutrition?.fiber ?? 0)}g F</Text>
            )}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(meal)}
      activeOpacity={0.7}
    >
      {/* Photo */}
      {canShowPhoto ? (
        <Image source={{ uri: photoSource }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.imagePlaceholder]}>
          <Ionicons name="fast-food-outline" size={32} color={C.textMuted} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.dishName} numberOfLines={2}>
              {dishName || meal.dishName}
            </Text>
            <Text style={styles.time}>
              {format(meal.timestamp, 'HH:mm', { locale })} · {meal.estimatedWeight}g
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {onEdit && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onEdit(meal)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil-outline" size={16} color={C.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color={C.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Macro pills */}
        <View style={styles.macroRow}>
          <MacroPill
            value={Math.round(meal.nutrition?.calories ?? 0)}
            unit="kcal"
            color={C.calories || C.accent}
            C={C}
          />
          <MacroPill
            value={Math.round(meal.nutrition?.protein ?? 0)}
            unit="P"
            color={C.protein || '#4ADE80'}
            C={C}
          />
          <MacroPill
            value={Math.round(meal.nutrition?.carbs ?? 0)}
            unit="C"
            color={C.carbs || '#FBBF24'}
            C={C}
          />
          <MacroPill
            value={Math.round(meal.nutrition?.fat ?? 0)}
            unit="G"
            color={C.fat || '#FF6A4D'}
            C={C}
          />
          {nutritionMode === 'advanced' && (meal.nutrition?.fiber ?? 0) > 0 && (
            <MacroPill
              value={Math.round(meal.nutrition?.fiber ?? 0)}
              unit="F"
              color={C.fiber || '#4ADE80'}
              C={C}
            />
          )}
        </View>

        {/* Notes */}
        {meal.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            📝 {meal.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const MacroPill: React.FC<{ value: number; unit: string; color: string; C: any }> = ({
  value,
  unit,
  color,
  C,
}) => (
  <View style={[{
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color + '40',
    backgroundColor: color + '15',
  }]}>
    <Text style={[{ fontSize: 12, fontWeight: '600', color }]}>
      {value}
      <Text style={{ fontSize: 10, fontWeight: '400' }}>{unit}</Text>
    </Text>
  </View>
);

function createStyles(C: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card || C.surface,
      borderRadius: 16,
      marginVertical: 6,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.border,
    },
    photo: {
      width: 90,
      height: 90,
    },
    imagePlaceholder: {
      backgroundColor: C.surfaceLight || C.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      padding: 12,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    titleContainer: {
      flex: 1,
      marginRight: 8,
    },
    dishName: {
      fontSize: 15,
      fontWeight: '600',
      color: C.text,
      lineHeight: 20,
    },
    time: {
      fontSize: 12,
      color: C.textSecondary,
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editButton: {
      padding: 4,
    },
    deleteButton: {
      padding: 4,
    },
    macroRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
      flexWrap: 'wrap',
    },
    notes: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 6,
      fontStyle: 'italic',
    },

    // Compact styles
    compactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card || C.surface,
      borderRadius: 12,
      marginVertical: 4,
      padding: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    compactImage: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    compactContent: {
      flex: 1,
      marginHorizontal: 12,
    },
    compactTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
    },
    compactTime: {
      fontSize: 12,
      color: C.textSecondary,
      marginTop: 2,
    },
    compactMacros: {
      alignItems: 'flex-end',
    },
    compactCalories: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
    },
    compactKcal: {
      fontSize: 11,
      color: C.textSecondary,
    },
    compactMacroText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.text,
    },
    compactMacroDot: {
      color: C.textSecondary,
      fontWeight: '400',
    },
  });
}

export default MealCard;
