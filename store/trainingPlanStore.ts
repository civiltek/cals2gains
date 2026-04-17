/**
 * Training Plan Store (Zustand)
 * Estado global de planes de entrenamiento del usuario.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrainingPlan,
  TrainingSession,
  TrainingWeek,
  TrainingPlanEngine,
} from '../services/trainingPlanEngine';

interface TrainingPlanState {
  plans: TrainingPlan[];
  activePlanId: string | null;

  // Acciones
  addPlan: (plan: TrainingPlan) => void;
  removePlan: (planId: string) => void;
  setActivePlan: (planId: string | null) => void;
  updatePlan: (planId: string, updates: Partial<Omit<TrainingPlan, 'id'>>) => void;

  addSession: (planId: string, weekNumber: number, session: TrainingSession) => void;
  updateSession: (planId: string, weekNumber: number, sessionId: string, updates: Partial<TrainingSession>) => void;
  removeSession: (planId: string, weekNumber: number, sessionId: string) => void;

  syncCurrentWeek: (planId: string) => void;

  // Selectors
  getActivePlan: () => TrainingPlan | null;
  getPlanById: (planId: string) => TrainingPlan | null;
}

export const useTrainingPlanStore = create<TrainingPlanState>()(
  persist(
    (set, get) => ({
      plans: [],
      activePlanId: null,

      addPlan: (plan) =>
        set((state) => ({
          plans: [...state.plans, plan],
          activePlanId: state.activePlanId ?? plan.id,
        })),

      removePlan: (planId) =>
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== planId),
          activePlanId: state.activePlanId === planId ? null : state.activePlanId,
        })),

      setActivePlan: (planId) => set({ activePlanId: planId }),

      updatePlan: (planId, updates) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === planId ? { ...p, ...updates } : p
          ),
        })),

      addSession: (planId, weekNumber, session) =>
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.id !== planId) return plan;
            const weeks = plan.weeks.map((week) => {
              if (week.weekNumber !== weekNumber) return week;
              // Reemplazar si ya existe sesión en ese día, si no añadir
              const exists = week.sessions.some((s) => s.dayOfWeek === session.dayOfWeek);
              const sessions = exists
                ? week.sessions.map((s) => (s.dayOfWeek === session.dayOfWeek ? session : s))
                : [...week.sessions, session];
              return { ...week, sessions };
            });
            // Crear semana si no existe
            const weekExists = weeks.some((w) => w.weekNumber === weekNumber);
            if (!weekExists) {
              weeks.push({ weekNumber, sessions: [session] });
            }
            return { ...plan, weeks: weeks.sort((a, b) => a.weekNumber - b.weekNumber) };
          }),
        })),

      updateSession: (planId, weekNumber, sessionId, updates) =>
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.id !== planId) return plan;
            return {
              ...plan,
              weeks: plan.weeks.map((week) => {
                if (week.weekNumber !== weekNumber) return week;
                return {
                  ...week,
                  sessions: week.sessions.map((s) =>
                    s.id === sessionId ? { ...s, ...updates } : s
                  ),
                };
              }),
            };
          }),
        })),

      removeSession: (planId, weekNumber, sessionId) =>
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.id !== planId) return plan;
            return {
              ...plan,
              weeks: plan.weeks.map((week) => {
                if (week.weekNumber !== weekNumber) return week;
                return {
                  ...week,
                  sessions: week.sessions.filter((s) => s.id !== sessionId),
                };
              }),
            };
          }),
        })),

      syncCurrentWeek: (planId) =>
        set((state) => ({
          plans: state.plans.map((plan) => {
            if (plan.id !== planId) return plan;
            const currentWeek = TrainingPlanEngine.calculateCurrentWeek(plan);
            return { ...plan, currentWeek };
          }),
        })),

      getActivePlan: () => {
        const { plans, activePlanId } = get();
        return plans.find((p) => p.id === activePlanId) ?? null;
      },

      getPlanById: (planId) => {
        return get().plans.find((p) => p.id === planId) ?? null;
      },
    }),
    {
      name: 'training-plan-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
