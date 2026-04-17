// Cals2Gains - Type Definitions

export type GoalMode = 'lose_fat' | 'gain_muscle' | 'recomp' | 'maintain' | 'mini_cut' | 'lean_bulk';
export type NutritionMode = 'simple' | 'advanced';

// ============================================
// Medical screening (RGPD Art. 9.2.a — datos de salud)
// ============================================
// UI conservadora: NO usar términos clínicos ("TCA", "anorexia", "bulimia").
// "eating_sensitive" = "relación sensible con la comida".
// Ver INFORME_LEGAL_v1.md §7 Acción 7 y METODOLOGIA_NUTRICIONAL.md §8.4.
export type MedicalFlag =
  | 'pregnancy_lactation'
  | 'eating_sensitive'
  | 'diabetes'
  | 'kidney_disease';

// Cómo se presentan las cifras de calorías/macros al usuario.
// 'hidden' se activa cuando el usuario marca `eating_sensitive` — oculta números
// en UI (dashboard, plan, captura). Los cálculos internos NO cambian.
export type NumericDisplayMode = 'visible' | 'hidden';

/**
 * Registro de eventos de consentimiento para Art. 9.2.a RGPD.
 * Se guarda en local (AsyncStorage) y opcionalmente se sincroniza con backend.
 * `action`: 'granted' = el usuario acepta; 'withdrawn' = retira consentimiento.
 */
export interface ConsentEvent {
  timestamp: string; // ISO 8601
  action: 'granted' | 'withdrawn';
  scope: 'medical_flags_art_9_2_a';
  flagsSnapshot?: MedicalFlag[]; // snapshot al momento del evento
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  trialStartDate: Date;
  isSubscribed: boolean;
  subscriptionType: 'trial' | 'monthly' | 'annual' | 'none';
  subscriptionExpiresAt: Date | null;
  goals: UserGoals;
  profile: UserProfile;
  onboardingCompleted?: boolean;
  language: 'es' | 'en';

  // Goal mode & nutrition mode
  goalMode?: GoalMode;
  nutritionMode?: NutritionMode;
  adaptiveMode?: boolean;
  tdee?: number;
  bmr?: number;
  weight?: number;

  // Health integration
  healthEnabled?: boolean;      // HealthKit / Health Connect authorized
  dynamicTDEEEnabled?: boolean; // Use real activity data for TDEE
  // Allergies & intolerances (safety feature)
  allergies?: string[];
  intolerances?: string[];

  // ---- Fase B (compliance) ----
  // Fecha de nacimiento ISO yyyy-mm-dd. NO guardamos la edad calculada — se
  // deriva on-read con `calculateAgeFromDateOfBirth` para evitar que quede
  // obsoleta.
  dateOfBirth?: string;
  // Condiciones de salud declaradas por el usuario (opcional). Base legal:
  // RGPD Art. 9.2.a. Consentimiento registrado en `consentHistory`.
  medicalFlags?: MedicalFlag[];
  // Modo de visualización numérica — 'hidden' si declara "eating_sensitive".
  numericDisplayMode?: NumericDisplayMode;
  // Toggle AI Act Art. 50 / RGPD Art. 22: decide si los ajustes del coach se
  // aplican solos o solo se muestran como sugerencia. Default true.
  autoAdaptEnabled?: boolean;
  // Historial local de consentimientos Art. 9.2.a.
  consentHistory?: ConsentEvent[];
}

// ============================================
// Age helpers — edad se calcula on-read, nunca se persiste
// ============================================

/**
 * Calcula la edad (años completos) a partir de fecha de nacimiento ISO.
 * Devuelve null si la fecha está mal formada o es futura.
 */
export function calculateAgeFromDateOfBirth(
  dateOfBirthIso: string | undefined | null,
): number | null {
  if (!dateOfBirthIso) return null;
  const dob = new Date(dateOfBirthIso);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  if (dob.getTime() > now.getTime()) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

/** true si edad < 18. Conservador: si no hay fecha válida, devuelve false. */
export function isMinor(dateOfBirthIso: string | undefined | null): boolean {
  const age = calculateAgeFromDateOfBirth(dateOfBirthIso);
  if (age == null) return false;
  return age < 18;
}

/** true si edad < 16. Bloqueo absoluto de uso. */
export function isUnder16(dateOfBirthIso: string | undefined | null): boolean {
  const age = calculateAgeFromDateOfBirth(dateOfBirthIso);
  if (age == null) return false;
  return age < 16;
}

export interface UserProfile {
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  // Optional extended profile fields
  name?: string;
  bio?: string;
  avatarType?: string;
}

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export type FitnessGoal =
  | 'lose_weight'
  | 'maintain_weight'
  | 'gain_muscle'
  | 'improve_health';

export interface UserGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
}

export interface Meal {
  id: string;
  userId: string;
  timestamp: Date;
  photoUri: string;
  photoUrl?: string; // Firebase Storage public URL (works on web & cross-device)
  dishName: string;
  dishNameEs: string;
  dishNameEn: string;
  ingredients: string[];
  portionDescription: string;
  estimatedWeight: number;
  nutrition: Nutrition;
  notes?: string;
  mealType: MealType;
  aiConfidence: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DailyLog {
  date: string;
  userId: string;
  meals: Meal[];
  totalNutrition: Nutrition;
  goals: UserGoals;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  questionEs: string;
  questionEn: string;
  options: string[];
  type: 'choice' | 'quantity' | 'text';
}

export interface FoodAnalysisResult {
  dishName: string;
  dishNameEs: string;
  dishNameEn: string;
  confidence: number;
  estimatedWeight: number;
  estimatedWeightRange?: string; // e.g. "220-280g"
  ingredients: string[];
  clarifyingQuestions: ClarifyingQuestion[];
  nutritionPer100g: Nutrition;
  totalNutrition: Nutrition;
  portionDescription: string;
  mealType: MealType;
  allergenWarnings?: string[]; // Detected allergens matching user's list
}

export type AnalysisAnswers = Record<string, string>;

// ============================================
// Weight Tracking
// ============================================

export interface WeightEntry {
  id: string;
  userId: string;
  weight: number; // kg
  date: Date;
  note?: string;
}

// ============================================
// Water Tracking
// ============================================

export interface WaterLog {
  userId: string;
  date: string; // yyyy-MM-dd
  glasses: number; // each glass = 250ml
  goal: number; // glasses goal (default 8)
}

// ============================================
// Food Database / Barcode
// ============================================

export interface FoodItem {
  id: string;
  barcode?: string;
  name: string;
  nameEs?: string;
  nameEn?: string;
  brand?: string;
  servingSize: number; // grams
  servingUnit: string;
  nutritionPer100g: Nutrition;
  nutritionPerServing: Nutrition;
  source: 'openfoodfacts' | 'usda' | 'custom' | 'ai' | 'local';
  verified: boolean;
}

// ============================================
// Meal Templates (Favorites)
// ============================================

export interface MealTemplate {
  id: string;
  userId: string;
  name: string;
  dishName: string;
  dishNameEs: string;
  dishNameEn: string;
  nutrition: Nutrition;
  estimatedWeight: number;
  mealType: MealType;
  ingredients: string[];
  portionDescription: string;
  photoUri?: string;
  timesUsed: number;
  lastUsed: Date;
  createdAt: Date;
}

// ============================================
// Macro Presets
// ============================================

export type MacroPreset = 'balanced' | 'high_protein' | 'keto' | 'low_fat' | 'custom';

export interface MacroPresetConfig {
  id: MacroPreset;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  icon: string;
}

// ============================================
// Quick Add (Manual Entry)
// ============================================

export interface QuickAddEntry {
  id: string;
  userId: string;
  timestamp: Date;
  name: string;
  nutrition: Nutrition;
  mealType: MealType;
  source: 'quick_add';
}

// ============================================
// Recipes
// ============================================

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  nutrition: Nutrition;
  isOptional?: boolean;
}

export interface Recipe {
  id: string;
  userId: string;
  name: string;
  nameEs: string;
  nameEn: string;
  description?: string;
  ingredients: RecipeIngredient[];
  servings: number;
  prepTime?: number;
  cookTime?: number;
  instructions?: string[];
  totalNutrition: Nutrition;
  nutritionPerServing: Nutrition;
  photoUri?: string;
  tags: string[];
  source: 'manual' | 'url_import' | 'ai';
  sourceUrl?: string;
  isFavorite: boolean;
  timesUsed: number;
  createdAt: Date;
  updatedAt: Date;
  allergenWarnings?: string[]; // Allergen IDs found matching user's declared allergies
}

// ============================================
// Training / Rest Day Goals
// ============================================

export type DayType = 'training' | 'rest' | 'refeed' | 'competition';

export interface DayTypeGoals {
  training: UserGoals;
  rest: UserGoals;
  refeed?: UserGoals;
  competition?: UserGoals;
  enabled: boolean;
}

// ============================================
// Intermittent Fasting
// ============================================

export type FastingProtocol = '16:8' | '18:6' | '20:4' | '5:2' | 'custom';

export interface FastingConfig {
  enabled: boolean;
  protocol: FastingProtocol;
  eatingWindowStart: string; // HH:mm
  eatingWindowEnd: string;   // HH:mm
  fastingDays?: number[];    // for 5:2 — day indices (0=Mon)
}

export interface FastingSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  targetHours: number;
  completed: boolean;
  date: string; // yyyy-MM-dd
}

// ============================================
// Body Measurements
// ============================================

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  neck?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicepLeft?: number;
  bicepRight?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
  bodyFat?: number;
  muscleMass?: number;
  note?: string;
}

// ============================================
// Progress Photos
// ============================================

export type PhotoAngle = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  userId: string;
  date: Date;
  angle: PhotoAngle;
  photoUri: string;
  weight?: number;
  bodyFat?: number;
  note?: string;
}

// ============================================
// Analytics / Streaks
// ============================================

export interface WeeklyDigest {
  weekStart: string;
  weekEnd: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysLogged: number;
  adherenceScore: number;
  calorieGoalHits: number;
  proteinGoalHits: number;
  weightChange?: number;
  streak: number;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string;
  totalDaysLogged: number;
}

// ============================================
// Meal Planning
// ============================================

export interface PlannedMeal {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  recipeId?: string;
  templateId?: string;
  customName?: string;
  nutrition: Nutrition;
  servings: number;
  completed: boolean;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: PlannedMeal[];
  createdAt: Date;
}

// ============================================
// Grocery List
// ============================================

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
  recipeId?: string;
  mealPlanId?: string;
}

export type GroceryCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'grains'
  | 'canned'
  | 'frozen'
  | 'snacks'
  | 'beverages'
  | 'condiments'
  | 'other';

export interface GroceryList {
  id: string;
  userId: string;
  name: string;
  items: GroceryItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Reminders
// ============================================

export type ReminderType =
  | 'meal_log'
  | 'water'
  | 'weight'
  | 'fasting_start'
  | 'fasting_end'
  | 'meal_plan';

export interface Reminder {
  id: string;
  userId: string;
  type: ReminderType;
  enabled: boolean;
  time: string;
  days: number[];
  title: string;
  body: string;
}

// ============================================
// Data Export
// ============================================

export type ExportFormat = 'csv' | 'pdf';
export type ExportScope = 'week' | 'month' | 'custom';

export interface ExportRequest {
  userId: string;
  format: ExportFormat;
  scope: ExportScope;
  startDate: string;
  endDate: string;
  includeWeight: boolean;
  includeMeasurements: boolean;
  includeWater: boolean;
  includeFasting: boolean;
}