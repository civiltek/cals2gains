// ============================================
// Cals2Gains - Training Plan Store
// ============================================
// Manages training plans: presets, custom plans, and the active plan.
// When a plan is active the home screen shows a banner and each day
// is automatically assigned its type (entreno/descanso/refeed/competicion).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export type TrainingDayType = 'entreno' | 'descanso' | 'refeed' | 'competicion';

export interface MacroPreset {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface TrainingDay {
  type: TrainingDayType;
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  emoji: string;
  // weeks[i][j]: week i, day j (0=Monday … 6=Sunday)
  weeks: TrainingDay[][];
  macroPresets: Record<TrainingDayType, MacroPreset>;
  isPreset: boolean;
  createdAt: string;
}

export interface ActivePlan {
  planId: string;
  startDate: string; // YYYY-MM-DD
}

export interface TodayPlanInfo {
  plan: TrainingPlan;
  dayType: TrainingDayType;
  /** 1-based day number within the full plan */
  dayNumber: number;
  /** Total days in the plan */
  totalDays: number;
  /** Days remaining (0 = last day) */
  daysRemaining: number;
  macros: MacroPreset;
}

// ============================================
// DEFAULT MACRO PRESETS (applied to all plans unless overridden)
// ============================================

export const DEFAULT_MACRO_PRESETS: Record<TrainingDayType, MacroPreset> = {
  entreno:    { calories: 2800, protein: 160, carbs: 380, fat: 65 },
  descanso:   { calories: 2500, protein: 160, carbs: 250, fat: 85 },
  refeed:     { calories: 3100, protein: 150, carbs: 450, fat: 60 },
  competicion:{ calories: 2600, protein: 140, carbs: 350, fat: 60 },
};

// ============================================
// PROPORTIONAL MACRO MULTIPLIERS
// ============================================
// Applied to the user's personal goals so training/refeed/rest days scale with
// their individual TDEE instead of being hardcoded 2800/2500/3100/2600.
// Protein stays roughly constant; carbs cycle up on training/refeed days
// and fat compensates on rest days.

export const DAY_TYPE_MULTIPLIERS: Record<
  TrainingDayType,
  { calories: number; protein: number; carbs: number; fat: number }
> = {
  entreno:     { calories: 1.12, protein: 1.05, carbs: 1.25, fat: 0.90 },
  descanso:    { calories: 0.95, protein: 1.00, carbs: 0.80, fat: 1.10 },
  refeed:      { calories: 1.20, protein: 0.95, carbs: 1.45, fat: 0.85 },
  competicion: { calories: 1.08, protein: 1.00, carbs: 1.20, fat: 0.95 },
};

/** Build proportional macro presets from the user's base goals. */
export function buildPresetsFromGoals(goals: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): Record<TrainingDayType, MacroPreset> {
  const out = {} as Record<TrainingDayType, MacroPreset>;
  (Object.keys(DAY_TYPE_MULTIPLIERS) as TrainingDayType[]).forEach((k) => {
    const m = DAY_TYPE_MULTIPLIERS[k];
    out[k] = {
      calories: Math.round(goals.calories * m.calories),
      protein: Math.round(goals.protein * m.protein),
      carbs: Math.round(goals.carbs * m.carbs),
      fat: Math.round(goals.fat * m.fat),
    };
  });
  return out;
}

/** Spanish TrainingDayType → English DayType (shared with userStore). */
export function trainingDayTypeToEnglish(
  t: TrainingDayType
): 'training' | 'rest' | 'refeed' | 'competition' {
  switch (t) {
    case 'entreno':     return 'training';
    case 'descanso':    return 'rest';
    case 'refeed':      return 'refeed';
    case 'competicion': return 'competition';
  }
}

/** English DayType → Spanish TrainingDayType. */
export function trainingDayTypeFromEnglish(
  d: 'training' | 'rest' | 'refeed' | 'competition'
): TrainingDayType {
  switch (d) {
    case 'training':    return 'entreno';
    case 'rest':        return 'descanso';
    case 'refeed':      return 'refeed';
    case 'competition': return 'competicion';
  }
}

// ============================================
// BUILT-IN PRESET PLANS
// ============================================

const D = (t: TrainingDayType): TrainingDay => ({ type: t });

const PRESET_PLANS: TrainingPlan[] = [
  {
    id: 'preset_fuerza_3',
    name: 'Fuerza 3x semana',
    description: '3 días de entreno, 4 de descanso. Ideal para fuerza/hipertrofia.',
    emoji: '🏋️',
    weeks: [
      // Week 1 (Mon–Sun): entreno Lun/Mié/Vie, descanso el resto
      [D('entreno'), D('descanso'), D('entreno'), D('descanso'), D('entreno'), D('descanso'), D('descanso')],
    ],
    macroPresets: { ...DEFAULT_MACRO_PRESETS },
    isPreset: true,
    createdAt: '2026-04-17',
  },
  {
    id: 'preset_fuerza_5',
    name: 'Fuerza 5x semana',
    description: '5 días de entreno con refeed el sábado y descanso el domingo.',
    emoji: '💪',
    weeks: [
      [D('entreno'), D('entreno'), D('entreno'), D('entreno'), D('entreno'), D('refeed'), D('descanso')],
    ],
    macroPresets: { ...DEFAULT_MACRO_PRESETS },
    isPreset: true,
    createdAt: '2026-04-17',
  },
  {
    id: 'preset_carrera_10k',
    name: 'Preparación 10K (8 semanas)',
    description: 'Plan de 8 semanas para preparar una carrera de 10 km. El último domingo es día de competición.',
    emoji: '🏃',
    weeks: [
      // Semanas 1-7: rodajes Lun/Mié/Vie/Dom, descanso Mar/Jue, refeed Sáb
      ...(Array(7).fill(null).map(() =>
        [D('entreno'), D('descanso'), D('entreno'), D('descanso'), D('entreno'), D('refeed'), D('entreno')]
      )),
      // Semana 8: reducción + competición el domingo
      [D('entreno'), D('descanso'), D('entreno'), D('descanso'), D('descanso'), D('descanso'), D('competicion')],
    ],
    macroPresets: { ...DEFAULT_MACRO_PRESETS },
    isPreset: true,
    createdAt: '2026-04-17',
  },
];

// ============================================
// HELPERS
// ============================================

/** Returns YYYY-MM-DD for a given Date */
function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Parses YYYY-MM-DD as local midnight Date (avoids UTC offset issues) */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days elapsed since startDate (0 = same day) */
function daysElapsed(startDate: string): number {
  const start = parseLocalDate(startDate);
  const now = parseLocalDate(toDateString(new Date()));
  return Math.round((now.getTime() - start.getTime()) / 86400000);
}

// ============================================
// STORE
// ============================================

interface TrainingPlanState {
  plans: TrainingPlan[];
  activePlan: ActivePlan | null;

  // Plan management
  addPlan: (plan: Omit<TrainingPlan, 'id' | 'createdAt'>) => string;
  updatePlan: (id: string, updates: Partial<Omit<TrainingPlan, 'id' | 'isPreset' | 'createdAt'>>) => void;
  deletePlan: (id: string) => void;

  // Activation
  activatePlan: (planId: string) => void;
  deactivatePlan: () => void;

  // Computed info for today (returns null if no active plan or plan ended)
  getTodayInfo: () => TodayPlanInfo | null;
}

export const useTrainingPlanStore = create<TrainingPlanState>()(
  persist(
    (set, get) => ({
      plans: PRESET_PLANS,
      activePlan: null,

      addPlan: (planData) => {
        const id = `custom_${Date.now()}`;
        const plan: TrainingPlan = {
          ...planData,
          id,
          createdAt: toDateString(new Date()),
        };
        set((s) => ({ plans: [...s.plans, plan] }));
        return id;
      },

      updatePlan: (id, updates) => {
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },

      deletePlan: (id) => {
        set((s) => ({
          plans: s.plans.filter((p) => p.id !== id),
          // Deactivate if this was the active plan
          activePlan: s.activePlan?.planId === id ? null : s.activePlan,
        }));
      },

      activatePlan: (planId) => {
        set({ activePlan: { planId, startDate: toDateString(new Date()) } });
        // Clear any stale manual override so the newly activated plan takes effect today.
        // Lazy-require userStore to avoid circular import at module-init time.
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { useUserStore } = require('./userStore');
          useUserStore.setState({
            todayDayTypeOverride: null,
            todayDayTypeOverrideDate: null,
          });
        } catch {
          /* userStore not ready yet — ignored */
        }
      },

      deactivatePlan: () => {
        set({ activePlan: null });
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { useUserStore } = require('./userStore');
          useUserStore.setState({
            todayDayTypeOverride: null,
            todayDayTypeOverrideDate: null,
          });
        } catch {
          /* ignored */
        }
      },

      getTodayInfo: () => {
        const { activePlan, plans } = get();
        if (!activePlan) return null;

        const plan = plans.find((p) => p.id === activePlan.planId);
        if (!plan || plan.weeks.length === 0) return null;

        const elapsed = daysElapsed(activePlan.startDate);
        const totalDays = plan.weeks.length * 7;

        if (elapsed < 0) return null;

        // Plan finished — auto-deactivate
        if (elapsed >= totalDays) {
          // Deactivate asynchronously to avoid updating store during render
          setTimeout(() => get().deactivatePlan(), 0);
          return null;
        }

        const weekIndex = Math.floor(elapsed / 7);
        const dayIndex = elapsed % 7;
        const dayType = plan.weeks[weekIndex]?.[dayIndex]?.type ?? 'descanso';

        return {
          plan,
          dayType,
          dayNumber: elapsed + 1,
          totalDays,
          daysRemaining: totalDays - elapsed - 1,
          macros: plan.macroPresets[dayType],
        };
      },
    }),
    {
      name: 'c2g-training-plans',
      storage: createJSONStorage(() => AsyncStorage),
      // Re-hydrate preset plans with any persisted user edits to macros
      merge: (persisted: any, current) => {
        const p = persisted as Partial<TrainingPlanState>;
        const mergedPlans = current.plans.map((preset) => {
          const saved = p.plans?.find((s: TrainingPlan) => s.id === preset.id);
          // Keep persisted macroPresets edits but refresh other preset fields
          return saved ? { ...preset, macroPresets: saved.macroPresets } : preset;
        });
        // Append any custom (non-preset) plans the user created
        const customPlans = (p.plans ?? []).filter((s: TrainingPlan) => !s.isPreset);
        return {
          ...current,
          plans: [...mergedPlans, ...customPlans],
          activePlan: p.activePlan ?? null,
        };
      },
    }
  )
);
