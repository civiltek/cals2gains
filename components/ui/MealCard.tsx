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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Meal } from '../../types';
import Colors from '../../constants/colors';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface MealCardProps {
  meal: Meal;
  onDelete?: (mealId: string) => void;
  onPress?: (meal: Meal) => void;
  compact?: boolean;
}

const MealCard: React.FC<MealCardProps> = ({ meal, onDelete, onPress, compact = false }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'es' ? es : enUS;

  const dishName = i18n.language === 'es' ? meal.dishNameEs : meal.dishNameEn;

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
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => onPress?.(meal)}
        activeOpacity={0.7}
      >
        {meal.photoUri ? (
          <Image source={{ uri: meal.photoUri }} style={styles.compactImage} />
        ) : (
          <View style={[styles.compactImage, styles.imagePlaceholder]}>
            <Ionicons name="fast-food" size={20} color={Colors.textMuted} />
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
          <Text style={styles.compactCalories}>{Math.round(meal.nutrition.calories)}</Text>
          <Text style={styles.compactKcal}>kcal</Text>
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
      {meal.photoUri ? (
        <Image source={{ uri: meal.photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.imagePlaceholder]}>
          <Ionicons name="fast-food-outline" size={32} color={Colors.textMuted} />
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

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* Macro pills */}
        <View style={styles.macroRow}>
          <MacroPill
            value={Math.round(meal.nutrition.calories)}
            unit="kcal"
            color={Colors.calories}
          />
          <MacroPill
            value={Math.round(meal.nutrition.protein)}
            unit="P"
            color={Colors.protein}
          />
          <MacroPill
            value={Math.round(meal.nutrition.carbs)}
            unit="C"
            color={Colors.carbs}
          />
          <MacroPill
            value={Math.round(meal.nutrition.fat)}
            unit="G"
            color={Colors.fat}
          />
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

const MacroPill: React.FC<{ value: number; unit: string; color: string }> = ({
  value,
  unit,
  color,
}) => (
  <View style={[styles.macroPill, { borderColor: color + '40', backgroundColor: color + '15' }]}>
    <Text style={[styles.macroPillText, { color }]}>
      {value}
      <Text style={styles.macroPillUnit}>{unit}</Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginVertical: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photo: {
    width: 90,
    height: 90,
  },
  imagePlaceholder: {
    backgroundColor: Colors.surfaceLight,
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
    color: Colors.text,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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
  macroPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  macroPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  macroPillUnit: {
    fontSize: 10,
    fontWeight: '400',
  },
  notes: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginVertical: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
  },
  compactTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  compactMacros: {
    alignItems: 'flex-end',
  },
  compactCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  compactKcal: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

export default MealCard;
