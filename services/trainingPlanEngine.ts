/**
 * Training Plan Engine
 * Ajusta macros diarios según el tipo de sesión de entrenamiento del día.
 * Pensado para deportistas de alto rendimiento: crossfit, carrera, competición.
 */

// ============================================================================
// Types
// ============================================================================

export type TrainingSessionType =
  | 'rest'        // Descanso completo
  | 'easy'        // Cardio suave / rodaje recuperación
  | 'tempo'       // Series medias / tempo
  | 'intervals'   // Series velocidad / HIIT
  | 'long_run'    // Tirada larga (>75 min)
  | 'strength'    // Fuerza / pesas
  | 'crossfit'    // WOD CrossFit
  | 'competition' // Día de carrera / competición
  | 'recovery';   // Día de recuperación activa (yoga, movilidad)

export type SportCategory = 'running' | 'crossfit' | 'cycling' | 'swimming' | 'triathlon' | 'general';

export interface TrainingSession {
  id: string;
  type: TrainingSessionType;
  name: string;
  nameEs: string;
  durationMinutes: number;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = lunes
  notes?: string;
}

export interface TrainingWeek {
  weekNumber: number;
  sessions: TrainingSession[];
  label?: string;     // ej. "Semana de carga", "Semana de descarga"
  labelEs?: string;
}

export interface TrainingPlan {
  id: string;
  name: string;
  nameEs: string;
  sport: SportCategory;
  totalWeeks: number;
  currentWeek: number;
  startDate: string; // ISO date string
  goalEvent?: string; // ej. "Maratón Valencia 2026"
  weeks: TrainingWeek[];
}

export interface DailyMacroAdjustment {
  calories: number;    // calorías objetivo ajustadas
  protein: number;     // g de proteína
  carbs: number;       // g de carbohidratos
  fat: number;         // g de grasa
  caloriesDelta: number;  // diferencia vs macros base (+/-)
  carbsDelta: number;
  proteinDelta: number;
  sessionType: TrainingSessionType;
  rationale: string;
  rationaleEs: string;
}

export interface BaseGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SessionTypeConfig {
  emoji: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  // Factores multiplicadores sobre macros base
  calorieFactor: number;   // multiplicador total calorías
  carbsFactor: number;     // multiplicador carbohidratos
  proteinFactor: number;   // multiplicador proteína
  fatFactor: number;       // multiplicador grasa
  // Para razonamiento
  rationaleEn: string;
  rationaleEs: string;
}

// ============================================================================
// Session Type Configurations
// Basado en evidencia científica de nutrición deportiva (Jeukendrup, Burke et al.)
// ============================================================================

const SESSION_CONFIGS: Record<TrainingSessionType, SessionTypeConfig> = {
  rest: {
    emoji: '😴',
    nameEn: 'Rest day',
    nameEs: 'Descanso',
    descriptionEn: 'Full rest — let your body recover',
    descriptionEs: 'Descanso total — deja recuperarse a tu cuerpo',
    calorieFactor: 0.90,   // ligero déficit en descanso
    carbsFactor: 0.75,     // menos carbs (no hay que cargar glucógeno)
    proteinFactor: 1.05,   // proteína alta para reparar músculo
    fatFactor: 1.15,
    rationaleEn: 'Rest day: reduced carbs (lower glycogen demand), maintained protein for muscle repair.',
    rationaleEs: 'Día de descanso: menos carbos (menos demanda de glucógeno), proteína mantenida para reparación muscular.',
  },
  easy: {
    emoji: '🏃',
    nameEn: 'Easy run / cardio',
    nameEs: 'Cardio suave',
    descriptionEn: 'Low intensity — aerobic base or recovery run',
    descriptionEs: 'Baja intensidad — base aeróbica o rodaje de recuperación',
    calorieFactor: 1.00,
    carbsFactor: 0.90,
    proteinFactor: 1.00,
    fatFactor: 1.10,
    rationaleEn: 'Easy session: slight fat adaptation benefit, no major carb loading needed.',
    rationaleEs: 'Sesión suave: beneficio de adaptación a grasas, no se requiere carga de carbos.',
  },
  tempo: {
    emoji: '⚡',
    nameEn: 'Tempo / threshold',
    nameEs: 'Series medias / tempo',
    descriptionEn: 'Moderate-high intensity sustained effort',
    descriptionEs: 'Esfuerzo sostenido a intensidad media-alta',
    calorieFactor: 1.10,
    carbsFactor: 1.20,
    proteinFactor: 1.05,
    fatFactor: 0.90,
    rationaleEn: 'Tempo session: increased carbs to fuel sustained intensity and replenish glycogen.',
    rationaleEs: 'Sesión de tempo: más carbos para sostener la intensidad y reponer glucógeno.',
  },
  intervals: {
    emoji: '🔥',
    nameEn: 'Intervals / HIIT',
    nameEs: 'Series / HIIT',
    descriptionEn: 'High-intensity intervals — max effort bursts',
    descriptionEs: 'Intervalos de alta intensidad — esfuerzos máximos',
    calorieFactor: 1.15,
    carbsFactor: 1.30,
    proteinFactor: 1.10,
    fatFactor: 0.85,
    rationaleEn: 'Interval training: high carb demand for repeated sprints, extra protein for muscle damage repair.',
    rationaleEs: 'Entrenamiento de intervalos: alta demanda de carbos para sprints repetidos, más proteína para reparación muscular.',
  },
  long_run: {
    emoji: '🏅',
    nameEn: 'Long run',
    nameEs: 'Tirada larga',
    descriptionEn: 'Endurance run >75 min — glycogen is critical',
    descriptionEs: 'Carrera de fondo >75 min — el glucógeno es clave',
    calorieFactor: 1.20,
    carbsFactor: 1.40,
    proteinFactor: 1.05,
    fatFactor: 0.85,
    rationaleEn: 'Long run: significantly higher carbs to maintain glycogen, slight calorie surplus for sustained energy.',
    rationaleEs: 'Tirada larga: carbos notablemente más altos para mantener glucógeno, ligero superávit calórico para energía sostenida.',
  },
  strength: {
    emoji: '💪',
    nameEn: 'Strength training',
    nameEs: 'Fuerza / pesas',
    descriptionEn: 'Resistance training — hypertrophy or strength focus',
    descriptionEs: 'Entrenamiento de resistencia — hipertrofia o fuerza',
    calorieFactor: 1.10,
    carbsFactor: 1.15,
    proteinFactor: 1.20,
    fatFactor: 0.90,
    rationaleEn: 'Strength session: high protein for muscle protein synthesis, moderate carbs for training fuel.',
    rationaleEs: 'Sesión de fuerza: alta proteína para síntesis muscular, carbos moderados como combustible.',
  },
  crossfit: {
    emoji: '🏋️',
    nameEn: 'CrossFit WOD',
    nameEs: 'CrossFit WOD',
    descriptionEn: 'High-intensity functional training',
    descriptionEs: 'Entrenamiento funcional de alta intensidad',
    calorieFactor: 1.20,
    carbsFactor: 1.35,
    proteinFactor: 1.15,
    fatFactor: 0.80,
    rationaleEn: 'CrossFit: combines strength and conditioning — needs both high carbs and high protein for performance and recovery.',
    rationaleEs: 'CrossFit: combina fuerza y acondicionamiento — necesita carbos y proteína altos para rendimiento y recuperación.',
  },
  competition: {
    emoji: '🏆',
    nameEn: 'Race / Competition',
    nameEs: 'Carrera / Competición',
    descriptionEn: 'Race day — fuel to perform at your peak',
    descriptionEs: 'Día de carrera — combustible para tu mejor rendimiento',
    calorieFactor: 1.30,
    carbsFactor: 1.50,
    proteinFactor: 1.00,
    fatFactor: 0.70,
    rationaleEn: 'Competition day: maximum carb loading to top up glycogen stores. Reduced fat for faster gastric emptying.',
    rationaleEs: 'Día de competición: carga máxima de carbos para llenar depósitos de glucógeno. Menos grasa para vaciado gástrico más rápido.',
  },
  recovery: {
    emoji: '🧘',
    nameEn: 'Active recovery',
    nameEs: 'Recuperación activa',
    descriptionEn: 'Yoga, mobility or light activity',
    descriptionEs: 'Yoga, movilidad o actividad ligera',
    calorieFactor: 0.95,
    carbsFactor: 0.85,
    proteinFactor: 1.10,
    fatFactor: 1.05,
    rationaleEn: 'Recovery session: modest calorie reduction, extra protein for ongoing muscle repair.',
    rationaleEs: 'Sesión de recuperación: ligera reducción calórica, proteína extra para reparación muscular continua.',
  },
};

// ============================================================================
// Predefined Plan Templates
// ============================================================================

export const PLAN_TEMPLATES: Omit<TrainingPlan, 'id' | 'startDate' | 'currentWeek'>[] = [
  {
    name: '12-Week Marathon Plan',
    nameEs: 'Plan Maratón 12 Semanas',
    sport: 'running',
    totalWeeks: 12,
    goalEvent: 'Marathon',
    weeks: [
      // Week 1 — base
      {
        weekNumber: 1,
        label: 'Base week',
        labelEs: 'Semana de base',
        sessions: [
          { id: 'w1d1', type: 'easy', name: 'Easy run 45min', nameEs: 'Rodaje suave 45min', durationMinutes: 45, dayOfWeek: 0 },
          { id: 'w1d2', type: 'rest', name: 'Rest', nameEs: 'Descanso', durationMinutes: 0, dayOfWeek: 1 },
          { id: 'w1d3', type: 'tempo', name: 'Tempo 40min', nameEs: 'Tempo 40min', durationMinutes: 40, dayOfWeek: 2 },
          { id: 'w1d4', type: 'easy', name: 'Easy run 30min', nameEs: 'Rodaje suave 30min', durationMinutes: 30, dayOfWeek: 3 },
          { id: 'w1d5', type: 'rest', name: 'Rest', nameEs: 'Descanso', durationMinutes: 0, dayOfWeek: 4 },
          { id: 'w1d6', type: 'long_run', name: 'Long run 90min', nameEs: 'Tirada larga 90min', durationMinutes: 90, dayOfWeek: 5 },
          { id: 'w1d7', type: 'recovery', name: 'Recovery walk/yoga', nameEs: 'Paseo/yoga recuperación', durationMinutes: 30, dayOfWeek: 6 },
        ],
      },
    ],
  },
  {
    name: '8-Week CrossFit Plan',
    nameEs: 'Plan CrossFit 8 Semanas',
    sport: 'crossfit',
    totalWeeks: 8,
    goalEvent: 'CrossFit Competition',
    weeks: [
      {
        weekNumber: 1,
        label: 'Foundation week',
        labelEs: 'Semana de fundamentos',
        sessions: [
          { id: 'cf1d1', type: 'crossfit', name: 'WOD + Strength', nameEs: 'WOD + Fuerza', durationMinutes: 60, dayOfWeek: 0 },
          { id: 'cf1d2', type: 'crossfit', name: 'WOD Metcon', nameEs: 'WOD Metcon', durationMinutes: 50, dayOfWeek: 1 },
          { id: 'cf1d3', type: 'recovery', name: 'Mobility & stretching', nameEs: 'Movilidad y estiramientos', durationMinutes: 30, dayOfWeek: 2 },
          { id: 'cf1d4', type: 'crossfit', name: 'WOD Olympic lifting', nameEs: 'WOD Halterofilia', durationMinutes: 60, dayOfWeek: 3 },
          { id: 'cf1d5', type: 'crossfit', name: 'WOD Gymnastics', nameEs: 'WOD Gimnasia', durationMinutes: 55, dayOfWeek: 4 },
          { id: 'cf1d6', type: 'rest', name: 'Rest', nameEs: 'Descanso', durationMinutes: 0, dayOfWeek: 5 },
          { id: 'cf1d7', type: 'rest', name: 'Rest', nameEs: 'Descanso', durationMinutes: 0, dayOfWeek: 6 },
        ],
      },
    ],
  },
  {
    name: '6-Week 10K Running Plan',
    nameEs: 'Plan 10K 6 Semanas',
    sport: 'running',
    totalWeeks: 6,
    goalEvent: '10K Race',
    weeks: [
      {
        weekNumber: 1,
        label: 'Base week',
        labelEs: 'Semana de base',
        sessions: [
          { id: '10k1d1', type: 'easy', name: 'Easy 30min', nameEs: 'Suave 30min', durationMinutes: 30, dayOfWeek: 0 },
          { id: '10k1d2', type: 'intervals', name: 'Intervals 5x400m', nameEs: 'Series 5x400m', durationMinutes: 40, dayOfWeek: 2 },
          { id: '10k1d3', type: 'tempo', name: 'Tempo 25min', nameEs: 'Tempo 25min', durationMinutes: 35, dayOfWeek: 4 },
          { id: '10k1d4', type: 'long_run', name: 'Long run 60min', nameEs: 'Tirada larga 60min', durationMinutes: 60, dayOfWeek: 6 },
        ],
      },
    ],
  },
];

// ============================================================================
// Training Plan Engine
// ============================================================================

export class TrainingPlanEngine {
  /**
   * Devuelve la config visual/textual de un tipo de sesión
   */
  static getSessionConfig(type: TrainingSessionType): SessionTypeConfig {
    return SESSION_CONFIGS[type];
  }

  /**
   * Calcula macros ajustados para un día con sesión de entrenamiento
   * @param session  La sesión del día
   * @param base     Macros base del usuario (sin ajuste de entrenamiento)
   */
  static adjustMacrosForSession(
    session: TrainingSession,
    base: BaseGoals
  ): DailyMacroAdjustment {
    const config = SESSION_CONFIGS[session.type];

    // Factor de duración: ajuste proporcional para sesiones largas (>90min)
    const durationFactor = session.durationMinutes > 90
      ? 1 + (session.durationMinutes - 90) * 0.0015  // +0.15% por min extra
      : 1;

    const adjustedCalories = Math.round(base.calories * config.calorieFactor * durationFactor);

    // Recalcular macros manteniendo las proporciones relativas ajustadas
    const carbsCalories = adjustedCalories * 0.4 * config.carbsFactor;
    const proteinCalories = adjustedCalories * 0.3 * config.proteinFactor;
    const fatCalories = adjustedCalories - carbsCalories - proteinCalories;

    const carbs = Math.round(Math.max(carbsCalories / 4, base.carbs * 0.5));  // mínimo 50% base
    const protein = Math.round(Math.max(proteinCalories / 4, base.protein * 0.9));
    const fat = Math.round(Math.max(fatCalories / 9, base.fat * 0.6));

    // Recalcular calorías reales con los gramos redondeados
    const actualCalories = carbs * 4 + protein * 4 + fat * 9;

    return {
      calories: actualCalories,
      protein,
      carbs,
      fat,
      caloriesDelta: actualCalories - base.calories,
      carbsDelta: carbs - base.carbs,
      proteinDelta: protein - base.protein,
      sessionType: session.type,
      rationale: config.rationaleEn,
      rationaleEs: config.rationaleEs,
    };
  }

  /**
   * Obtiene la sesión del día actual del plan activo (si existe)
   * @param plan      Plan de entrenamiento activo
   * @param date      Fecha a consultar (default: hoy)
   */
  static getSessionForDate(plan: TrainingPlan, date: Date = new Date()): TrainingSession | null {
    const startDate = new Date(plan.startDate);
    const diffMs = date.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;

    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex >= plan.weeks.length) return null;

    const week = plan.weeks[weekIndex];
    const dayOfWeek = diffDays % 7 as TrainingSession['dayOfWeek'];

    return week.sessions.find(s => s.dayOfWeek === dayOfWeek) ?? null;
  }

  /**
   * Obtiene macros ajustados para una fecha del plan
   */
  static getMacrosForDate(
    plan: TrainingPlan,
    base: BaseGoals,
    date: Date = new Date()
  ): DailyMacroAdjustment {
    const session = this.getSessionForDate(plan, date);
    if (!session) {
      // Sin sesión asignada → tratar como descanso
      return this.adjustMacrosForSession(
        { id: 'default', type: 'rest', name: 'Rest', nameEs: 'Descanso', durationMinutes: 0, dayOfWeek: 0 },
        base
      );
    }
    return this.adjustMacrosForSession(session, base);
  }

  /**
   * Devuelve las sesiones de la semana actual del plan
   */
  static getCurrentWeekSessions(plan: TrainingPlan): TrainingSession[] {
    const currentWeek = plan.weeks.find(w => w.weekNumber === plan.currentWeek);
    return currentWeek?.sessions ?? [];
  }

  /**
   * Genera un ID único para sesiones
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Genera un ID único para planes
   */
  static generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Crea un plan desde una plantilla
   */
  static createPlanFromTemplate(
    template: typeof PLAN_TEMPLATES[number],
    startDate: Date
  ): TrainingPlan {
    return {
      ...template,
      id: this.generatePlanId(),
      startDate: startDate.toISOString().split('T')[0],
      currentWeek: 1,
    };
  }

  /**
   * Calcula la semana actual del plan basándose en la fecha de inicio
   */
  static calculateCurrentWeek(plan: TrainingPlan): number {
    const start = new Date(plan.startDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, plan.totalWeeks));
  }
}

export default TrainingPlanEngine;
