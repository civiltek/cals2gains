// Cals2Gains - Type Definitions

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
  language: 'es' | 'en';
}

export interface UserProfile {
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
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
  ingredients: string[];
  clarifyingQuestions: ClarifyingQuestion[];
  nutritionPer100g: Nutrition;
  totalNutrition: Nutrition;
  portionDescription: string;
  mealType: MealType;
}

export type AnalysisAnswers = Record<string, string>;
