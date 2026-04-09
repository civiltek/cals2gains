﻿// ============================================
// Cals2Gains - Home / Dashboard Screen
// ============================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import Colors from '../../constants/colors';
import MacroRing from '../../components/ui/MacroRing';
import MacroBar from '../../components/ui/MacroBar';
import MealCard from '../../components/ui/MealCard';
import { useUserStore } from '../../store/userStore';
import { useMealStore } from '../../store/mealStore';
import { useWaterStore } from '../../store/waterStore';
import { useWeightStore } from '../../store/weightStore';
import { useTemplateStore } from '../../store/templateStore';
import * as Haptics from 'expo-haptics';