// ============================================
// Cals2Gains - Firebase Service
// ============================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  createUserWithEmailAndPassword as firebaseCreateWithEmail,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
// getReactNativePersistence is available in the React Native bundle at runtime but not in the
// browser-targeted TypeScript type definitions for firebase v10.14. Use require to access it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => any;
};
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  runTransaction,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Meal, DailyLog, UserGoals, UserProfile, ProgressPhoto, PhotoAngle, Recipe, Nutrition, FastingConfig, FastingSession, BodyMeasurement } from '../types';
import { emptyNutrition, addNutrition } from '../utils/nutrition';
import { format } from 'date-fns';

// Firebase configuration - loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Already initialized (hot reload) — use existing instance
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db };

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Sign in with Google credential
 */
export async function signInWithGoogle(idToken: string): Promise<FirebaseUser> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user);
  return result.user;
}

/**
 * Sign in with Apple credential
 */
export async function signInWithApple(
  identityToken: string,
  nonce: string
): Promise<FirebaseUser> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user);
  return result.user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const result = await firebaseSignInWithEmail(auth, email, password);
  await ensureUserDocument(result.user);
  return result.user;
}

/**
 * Create account with email and password
 */
export async function createAccountWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<FirebaseUser> {
  const result = await firebaseCreateWithEmail(auth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  await ensureUserDocument(result.user);
  return result.user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ============================================
// USER FUNCTIONS
// ============================================

/**
 * Create or update user document if it doesn't exist
 */
async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<void> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user - create document with trial period
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newUser: Omit<User, 'uid'> = {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      createdAt: now,
      trialStartDate: now,
      isSubscribed: true, // Trial counts as subscribed
      subscriptionType: 'trial',
      subscriptionExpiresAt: trialEnd,
      onboardingCompleted: false,
      language: 'es', // Default to Spanish
      goals: {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
      },
      profile: {
        age: 30,
        weight: 70,
        height: 170,
        gender: 'female',
        activityLevel: 'moderately_active',
        goal: 'maintain_weight',
      },
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: Timestamp.fromDate(now),
      trialStartDate: Timestamp.fromDate(now),
      subscriptionExpiresAt: Timestamp.fromDate(trialEnd),
    });
  }
}

/**
 * Get user data from Firestore
 */
export async function getUserData(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return {
      uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: data.createdAt?.toDate() || new Date(),
      trialStartDate: data.trialStartDate?.toDate() || new Date(),
      isSubscribed: data.isSubscribed || false,
      subscriptionType: data.subscriptionType || 'none',
      subscriptionExpiresAt: data.subscriptionExpiresAt?.toDate() || null,
      goals: data.goals || { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 },
      profile: data.profile || {},
      onboardingCompleted: data.onboardingCompleted || false,
      language: data.language || 'es',
      // Optional fields — persisted by updateUserGoalsAndMode / updateUserAllergies / etc.
      // Missing these on load caused settings toggles and allergy chips to reset
      // every cold start (tester feedback 2026-04-17).
      goalMode: data.goalMode,
      nutritionMode: data.nutritionMode,
      adaptiveMode: data.adaptiveMode,
      tdee: data.tdee,
      bmr: data.bmr,
      weight: data.weight,
      healthEnabled: data.healthEnabled,
      dynamicTDEEEnabled: data.dynamicTDEEEnabled,
      allergies: data.allergies || [],
      intolerances: data.intolerances || [],
      // Fase B — compliance fields (RGPD Art. 9.2.a, AI Act Art. 50)
      dateOfBirth: data.dateOfBirth,
      medicalFlags: data.medicalFlags,
      numericDisplayMode: data.numericDisplayMode,
      autoAdaptEnabled: data.autoAdaptEnabled,
      consentHistory: data.consentHistory,
    } as User;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

/**
 * Update user profile and goals
 */
export async function updateUserProfile(
  uid: string,
  profile: Partial<UserProfile>,
  goals: Partial<UserGoals>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...(Object.keys(profile).length > 0 && { profile }),
    ...(Object.keys(goals).length > 0 && { goals }),
  });
}

/**
 * Update user allergies and intolerances
 */
export async function updateUserAllergies(
  uid: string,
  allergies: string[],
  intolerances: string[]
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { allergies, intolerances });
}

/**
 * Update user goals, goal mode, and related fields
 */
export async function updateUserGoalsAndMode(
  uid: string,
  data: {
    goals?: Partial<{ calories: number; protein: number; carbs: number; fat: number; fiber: number }>;
    goalMode?: string;
    nutritionMode?: string;
    adaptiveMode?: boolean;
    tdee?: number;
    bmr?: number;
    weight?: number;
    healthEnabled?: boolean;
    dynamicTDEEEnabled?: boolean;
    autoAdaptEnabled?: boolean;
    numericDisplayMode?: string;
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const update: Record<string, any> = {};

  if (data.goals) update.goals = data.goals;
  if (data.goalMode !== undefined) update.goalMode = data.goalMode;
  if (data.nutritionMode !== undefined) update.nutritionMode = data.nutritionMode;
  if (data.adaptiveMode !== undefined) update.adaptiveMode = data.adaptiveMode;
  if (data.tdee !== undefined) update.tdee = data.tdee;
  if (data.bmr !== undefined) update.bmr = data.bmr;
  if (data.weight !== undefined) update.weight = data.weight;
  if (data.healthEnabled !== undefined) update.healthEnabled = data.healthEnabled;
  if (data.dynamicTDEEEnabled !== undefined) update.dynamicTDEEEnabled = data.dynamicTDEEEnabled;
  if (data.autoAdaptEnabled !== undefined) update.autoAdaptEnabled = data.autoAdaptEnabled;
  if (data.numericDisplayMode !== undefined) update.numericDisplayMode = data.numericDisplayMode;

  if (Object.keys(update).length > 0) {
    await updateDoc(userRef, update);
  }
}

/**
 * Persist medical/compliance fields (RGPD Art. 9.2.a, AI Act).
 * Separado de `updateUserGoalsAndMode` intencionadamente: datos de salud Art. 9
 * y consentimientos tienen que poder auditarse y eliminarse de forma aislada.
 */
export async function updateUserMedicalProfile(
  uid: string,
  data: {
    dateOfBirth?: string | null;
    medicalFlags?: string[];
    numericDisplayMode?: string;
    consentHistoryAppend?: {
      timestamp: string;
      action: 'granted' | 'withdrawn';
      scope: 'medical_flags_art_9_2_a';
      flagsSnapshot?: string[];
    };
    consentHistoryReplace?: Array<{
      timestamp: string;
      action: 'granted' | 'withdrawn';
      scope: 'medical_flags_art_9_2_a';
      flagsSnapshot?: string[];
    }>;
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const update: Record<string, any> = {};

  if (data.dateOfBirth !== undefined) update.dateOfBirth = data.dateOfBirth;
  if (data.medicalFlags !== undefined) update.medicalFlags = data.medicalFlags;
  if (data.numericDisplayMode !== undefined) update.numericDisplayMode = data.numericDisplayMode;

  // Append-only register by reading current doc first (Firestore has no atomic
  // arrayUnion for complex objects keeping order). Conservador: si falla la
  // lectura, guardamos al menos el último evento.
  if (data.consentHistoryAppend || data.consentHistoryReplace) {
    try {
      const snap = await getDoc(userRef);
      const existing: any[] =
        (snap.exists() && Array.isArray(snap.data()?.consentHistory))
          ? snap.data()!.consentHistory
          : [];
      if (data.consentHistoryReplace) {
        update.consentHistory = data.consentHistoryReplace;
      } else if (data.consentHistoryAppend) {
        update.consentHistory = [...existing, data.consentHistoryAppend];
      }
    } catch {
      if (data.consentHistoryReplace) update.consentHistory = data.consentHistoryReplace;
      else if (data.consentHistoryAppend) update.consentHistory = [data.consentHistoryAppend];
    }
  }

  if (Object.keys(update).length > 0) {
    await updateDoc(userRef, update);
  }
}

/**
 * Upload profile photo to Firebase Storage and update user document
 */
export async function uploadProfilePhoto(userId: string, uri: string): Promise<string> {
  try {
    // Convert local URI to blob using XMLHttpRequest (more reliable on RN than fetch)
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = (e) => reject(new Error('Failed to convert image to blob'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const storageRef = ref(storage, `users/${userId}/profile/avatar.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // Update Firestore user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { photoURL: downloadURL });

    // Also update Firebase Auth profile
    const currentUser = auth.currentUser;
    if (currentUser) {
      await updateProfile(currentUser, { photoURL: downloadURL });
    }

    return downloadURL;
  } catch (error: any) {
    console.error('uploadProfilePhoto error:', error?.code, error?.message);
    // If Storage fails (not configured, rules, etc.), save photo URI locally in Firestore only
    if (error?.code?.includes('storage/') || error?.message?.includes('storage')) {
      console.warn('Firebase Storage unavailable, saving photo URI to Firestore only');
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { photoURL: uri });
      return uri;
    }
    throw error;
  }
}

/**
 * Update user display name in both Firestore and Auth
 */
export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { displayName });

  const currentUser = auth.currentUser;
  if (currentUser) {
    await updateProfile(currentUser, { displayName });
  }
}

/**
 * Update subscription status (called by RevenueCat webhook or client)
 */
export async function updateSubscriptionStatus(
  uid: string,
  isSubscribed: boolean,
  subscriptionType: User['subscriptionType'],
  expiresAt: Date | null
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    isSubscribed,
    subscriptionType,
    subscriptionExpiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
  });
}

/**
 * Redeem a promotional code.
 * Master codes: unlimited reuse.
 * Friend codes: single-use — enforced via a Firestore transaction on
 * `promoCodesRedeemed/{code}`. Returns the expiry date that was applied.
 */
export async function redeemPromoCodeInFirestore(params: {
  uid: string;
  code: string;
  type: 'master' | 'friend';
  durationDays: number;
}): Promise<Date> {
  const { uid, code, type, durationDays } = params;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const userRef = doc(db, 'users', uid);
  const subscriptionType = type === 'master' ? 'lifetime' : 'promo';

  if (type === 'friend') {
    // Atomically check-and-claim the code
    const codeRef = doc(db, 'promoCodesRedeemed', code);
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(codeRef);
      if (existing.exists()) {
        throw new Error('CODE_ALREADY_REDEEMED');
      }
      tx.set(codeRef, {
        redeemedBy: uid,
        redeemedAt: Timestamp.fromDate(new Date()),
        type,
      });
      tx.update(userRef, {
        isSubscribed: true,
        subscriptionType,
        subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
      });
    });
  } else {
    // Master code — just update the subscription
    await updateDoc(userRef, {
      isSubscribed: true,
      subscriptionType,
      subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
    });
  }

  return expiresAt;
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingCompleted(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { onboardingCompleted: true });
}

/**
 * Update user language preference
 */
export async function updateUserLanguage(uid: string, language: 'es' | 'en'): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { language });
}

// ============================================
// MEAL FUNCTIONS
// ============================================

/**
 * Save a meal to Firestore
 */
export async function saveMeal(meal: Omit<Meal, 'id'>): Promise<string> {
  const mealsRef = collection(db, 'meals');
  const docRef = await addDoc(mealsRef, {
    ...meal,
    timestamp: Timestamp.fromDate(meal.timestamp),
  });

  // Update daily log — best-effort. If this fails the meal is already
  // persisted; a future saveMeal or the dashboard aggregator will rebuild
  // the totals, so don't bubble the error up and confuse the user.
  try {
    await updateDailyLog(meal.userId, meal.timestamp, meal);
  } catch (err) {
    console.warn('[saveMeal] updateDailyLog failed (meal saved OK):', err);
  }

  return docRef.id;
}

/**
 * Get meals for a specific date
 */
export async function getMealsForDate(userId: string, date: Date): Promise<Meal[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const mealsRef = collection(db, 'meals');
  const q = query(
    mealsRef,
    where('userId', '==', userId),
    where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
    where('timestamp', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('timestamp', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as Meal[];
}

/**
 * Get meals for the last N days (for history)
 */
export async function getRecentMeals(userId: string, days: number = 7): Promise<Meal[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  sinceDate.setHours(0, 0, 0, 0);

  const mealsRef = collection(db, 'meals');
  const q = query(
    mealsRef,
    where('userId', '==', userId),
    where('timestamp', '>=', Timestamp.fromDate(sinceDate)),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as Meal[];
}

/**
 * Delete a meal
 */
export async function deleteMeal(mealId: string): Promise<void> {
  if (!mealId || typeof mealId !== 'string') {
    throw new Error('deleteMeal: mealId is required');
  }
  const mealRef = doc(db, 'meals', mealId);
  await deleteDoc(mealRef);
}

/**
 * Update an existing meal (for post-hoc editing)
 */
export async function updateMeal(mealId: string, updates: Partial<Omit<Meal, 'id'>>): Promise<void> {
  if (!mealId || typeof mealId !== 'string') {
    throw new Error('updateMeal: mealId is required');
  }

  // Build a Firestore-safe update object — strip undefined/NaN
  const data: Record<string, any> = {};

  if (updates.dishName != null) data.dishName = updates.dishName;
  if (updates.dishNameEs != null) data.dishNameEs = updates.dishNameEs;
  if (updates.dishNameEn != null) data.dishNameEn = updates.dishNameEn;
  if (updates.estimatedWeight != null && !isNaN(updates.estimatedWeight)) {
    data.estimatedWeight = updates.estimatedWeight;
  }
  if (updates.portionDescription != null) data.portionDescription = updates.portionDescription;
  if (updates.mealType != null) data.mealType = updates.mealType;
  if (updates.notes !== undefined) data.notes = updates.notes || '';
  if (updates.ingredients != null) data.ingredients = updates.ingredients;

  // Nutrition — merge sub-fields safely
  if (updates.nutrition) {
    const n = updates.nutrition;
    data.nutrition = {
      calories: Math.round(n.calories || 0),
      protein: Math.round((n.protein || 0) * 10) / 10,
      carbs: Math.round((n.carbs || 0) * 10) / 10,
      fat: Math.round((n.fat || 0) * 10) / 10,
      fiber: Math.round((n.fiber || 0) * 10) / 10,
    };
  }

  data.editedAt = Timestamp.now();

  const mealRef = doc(db, 'meals', mealId);
  await updateDoc(mealRef, data);
}

// ============================================
// DAILY LOG FUNCTIONS
// ============================================

/**
 * Update or create daily log when a meal is added
 */
async function updateDailyLog(userId: string, date: Date, newMeal: Omit<Meal, 'id'>): Promise<void> {
  const dateKey = format(date, 'yyyy-MM-dd');
  const logRef = doc(db, 'dailyLogs', `${userId}_${dateKey}`);
  const logSnap = await getDoc(logRef);

  if (logSnap.exists()) {
    const existing = logSnap.data();
    const currentTotal = existing.totalNutrition || emptyNutrition();
    const newTotal = addNutrition(currentTotal as any, newMeal.nutrition);

    await updateDoc(logRef, {
      totalNutrition: newTotal,
      lastUpdated: Timestamp.now(),
    });
  } else {
    await setDoc(logRef, {
      date: dateKey,
      userId,
      totalNutrition: newMeal.nutrition,
      lastUpdated: Timestamp.now(),
    });
  }
}

// ============================================
// WEIGHT TRACKING FUNCTIONS
// ============================================

/**
 * Save a weight entry
 */
export async function saveWeightEntry(entry: Omit<import('../types').WeightEntry, 'id'>): Promise<string> {
  const weightRef = collection(db, 'weightEntries');
  const docRef = await addDoc(weightRef, {
    ...entry,
    date: Timestamp.fromDate(entry.date),
  });
  return docRef.id;
}

/**
 * Get weight history for the last N days
 */
export async function getWeightHistory(userId: string, days: number = 90): Promise<import('../types').WeightEntry[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const weightRef = collection(db, 'weightEntries');
  const q = query(
    weightRef,
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(sinceDate)),
    orderBy('date', 'desc'),
    limit(365)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate() || new Date(),
  })) as import('../types').WeightEntry[];
}

/**
 * Delete a weight entry
 */
export async function deleteWeightEntry(entryId: string): Promise<void> {
  const ref = doc(db, 'weightEntries', entryId);
  await deleteDoc(ref);
}

// ============================================
// WATER TRACKING FUNCTIONS
// ============================================

/**
 * Save/update water log for a day
 */
export async function saveWaterLog(log: import('../types').WaterLog): Promise<void> {
  const logRef = doc(db, 'waterLogs', `${log.userId}_${log.date}`);
  await setDoc(logRef, log, { merge: true });
}

/**
 * Get water log for a specific day
 */
export async function getWaterLog(userId: string, date: string): Promise<import('../types').WaterLog | null> {
  const logRef = doc(db, 'waterLogs', `${userId}_${date}`);
  const snap = await getDoc(logRef);
  if (!snap.exists()) return null;
  return snap.data() as import('../types').WaterLog;
}

// ============================================
// MEAL TEMPLATE FUNCTIONS
// ============================================

/**
 * Save a meal template
 */
export async function saveMealTemplate(template: Omit<import('../types').MealTemplate, 'id'>): Promise<string> {
  const templatesRef = collection(db, 'mealTemplates');
  const docRef = await addDoc(templatesRef, {
    ...template,
    lastUsed: Timestamp.fromDate(template.lastUsed),
    createdAt: Timestamp.fromDate(template.createdAt),
  });
  return docRef.id;
}

/**
 * Get all meal templates for a user
 */
export async function getMealTemplates(userId: string): Promise<import('../types').MealTemplate[]> {
  const templatesRef = collection(db, 'mealTemplates');
  const q = query(
    templatesRef,
    where('userId', '==', userId),
    orderBy('timesUsed', 'desc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    lastUsed: doc.data().lastUsed?.toDate() || new Date(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as import('../types').MealTemplate[];
}

/**
 * Delete a meal template
 */
export async function deleteMealTemplate(templateId: string): Promise<void> {
  const ref = doc(db, 'mealTemplates', templateId);
  await deleteDoc(ref);
}

/**
 * Update template usage count
 */
export async function updateTemplateUsage(templateId: string): Promise<void> {
  const ref = doc(db, 'mealTemplates', templateId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const current = snap.data().timesUsed || 0;
    await updateDoc(ref, {
      timesUsed: current + 1,
      lastUsed: Timestamp.now(),
    });
  }
}

/**
 * Get daily log summary
 */
export async function getDailyLog(userId: string, date: Date): Promise<DailyLog | null> {
  const dateKey = format(date, 'yyyy-MM-dd');
  const logRef = doc(db, 'dailyLogs', `${userId}_${dateKey}`);
  const logSnap = await getDoc(logRef);

  if (!logSnap.exists()) return null;

  const meals = await getMealsForDate(userId, date);
  const userData = await getUserData(userId);

  return {
    date: dateKey,
    userId,
    meals,
    totalNutrition: logSnap.data().totalNutrition || emptyNutrition(),
    goals: userData?.goals || { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 },
  };
}

// ============================================
// Meal Photo Upload
// ============================================

/**
 * Save a meal photo as base64 data URI directly in the Firestore document.
 * No Firebase Storage needed — works on Spark plan.
 *
 * @param mealId  Firestore document ID
 * @param source  Either { base64: '...' } or { uri: 'file://...' }
 * @returns       The data URI string saved, or '' on failure
 */
export async function saveMealPhotoBase64(
  mealId: string,
  source: { uri?: string; base64?: string },
): Promise<string> {
  let b64: string | null = null;

  if (source.base64) {
    b64 = source.base64;
  } else if (source.uri && Platform.OS !== 'web') {
    // Native: read local file → base64
    const info = await FileSystem.getInfoAsync(source.uri);
    if (!info.exists) {
      throw new Error(`File missing: ${source.uri.substring(source.uri.lastIndexOf('/') + 1)}`);
    }
    b64 = await FileSystem.readAsStringAsync(source.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else if (source.uri && source.uri.startsWith('data:')) {
    b64 = source.uri.split(',')[1] || null;
  }

  if (!b64 || b64.length < 100) {
    throw new Error(`Photo data too short (${b64?.length || 0})`);
  }

  const dataUri = `data:image/jpeg;base64,${b64}`;

  // Save directly into the meal Firestore document
  const mealRef = doc(db, 'meals', mealId);
  await updateDoc(mealRef, { photoUrl: dataUri });

  return dataUri;
}

/**
 * Migrate existing meals: read local photos → base64 → save in Firestore.
 * Run this from the iPhone (where the local files exist).
 * No Firebase Storage required.
 */
export interface MigrationResult {
  total: number;
  alreadySynced: number;
  noPhoto: number;
  migrated: number;
  failed: number;
  errors: string[];
}

export async function migrateMealPhotosToFirestore(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0, alreadySynced: 0, noPhoto: 0,
    migrated: 0, failed: 0, errors: [],
  };

  try {
    const mealsRef = collection(db, 'meals');
    const q = query(mealsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    result.total = snapshot.size;

    for (const mealDoc of snapshot.docs) {
      const data = mealDoc.data();

      // Already synced
      if (data.photoUrl) {
        result.alreadySynced++;
        continue;
      }

      // No photo
      if (!data.photoUri || data.photoUri.length === 0) {
        result.noPhoto++;
        continue;
      }

      // Already a data URI or http — just copy to photoUrl
      if (data.photoUri.startsWith('data:') || data.photoUri.startsWith('http')) {
        try {
          const mealRef = doc(db, 'meals', mealDoc.id);
          await updateDoc(mealRef, { photoUrl: data.photoUri });
          result.migrated++;
        } catch {
          result.failed++;
        }
        continue;
      }

      // Local file:// URI — read with FileSystem and save base64
      try {
        await saveMealPhotoBase64(mealDoc.id, { uri: data.photoUri });
        result.migrated++;
      } catch (err: any) {
        result.failed++;
        if (result.errors.length < 3) {
          result.errors.push(`${mealDoc.id}: ${err?.message || 'unknown'}`);
        }
      }
    }
  } catch (error: any) {
    result.errors.push(`Query: ${error?.message || 'unknown'}`);
  }
  return result;
}

// ============================================
// Progress Photos
// ============================================

/**
 * Save a progress photo to Firestore
 * The photoUri is stored as a local file path (not uploaded to Storage in MVP)
 */
export async function saveProgressPhoto(photo: Omit<ProgressPhoto, 'id'>): Promise<string> {
  const photosRef = collection(db, 'progressPhotos');
  const data: any = {
    userId: photo.userId,
    date: photo.date instanceof Date ? Timestamp.fromDate(photo.date) : Timestamp.fromDate(new Date(photo.date)),
    angle: photo.angle || 'front',
    photoUri: photo.photoUri || '',
  };
  // Only add optional fields if they have values (Firestore rejects undefined)
  if (photo.weight != null && !isNaN(photo.weight)) data.weight = photo.weight;
  if (photo.bodyFat != null && !isNaN(photo.bodyFat)) data.bodyFat = photo.bodyFat;
  if (photo.note && photo.note.trim()) data.note = photo.note.trim();

  const docRef = await addDoc(photosRef, data);
  return docRef.id;
}

/**
 * Get progress photos for a user
 */
export async function getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  if (!userId) return [];
  const photosRef = collection(db, 'progressPhotos');
  const q = query(
    photosRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate() || new Date(),
  })) as ProgressPhoto[];
}

/**
 * Delete a progress photo
 */
export async function deleteProgressPhoto(photoId: string): Promise<void> {
  await deleteDoc(doc(db, 'progressPhotos', photoId));
}

// ============================================
// Recipes
// ============================================

/**
 * Save a recipe to Firestore
 */
export async function saveRecipe(recipe: Omit<Recipe, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'recipes'), {
    ...recipe,
    createdAt: Timestamp.fromDate(recipe.createdAt instanceof Date ? recipe.createdAt : new Date()),
    updatedAt: Timestamp.fromDate(recipe.updatedAt instanceof Date ? recipe.updatedAt : new Date()),
  });
  return docRef.id;
}

/**
 * Get all recipes for a user
 */
export async function getRecipes(userId: string): Promise<Recipe[]> {
  const q = query(
    collection(db, 'recipes'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Recipe;
  });
}

/**
 * Update a recipe
 */
export async function updateRecipe(recipeId: string, updates: Partial<Recipe>): Promise<void> {
  const safeUpdates: Record<string, any> = { ...updates, updatedAt: Timestamp.now() };
  delete safeUpdates.id;
  delete safeUpdates.userId;
  if (safeUpdates.createdAt instanceof Date) {
    safeUpdates.createdAt = Timestamp.fromDate(safeUpdates.createdAt);
  }
  await updateDoc(doc(db, 'recipes', recipeId), safeUpdates);
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(recipeId: string): Promise<void> {
  await deleteDoc(doc(db, 'recipes', recipeId));
}

/**
 * Update recipe favorite status
 */
export async function updateRecipeFavorite(recipeId: string, isFavorite: boolean): Promise<void> {
  await updateDoc(doc(db, 'recipes', recipeId), { isFavorite, updatedAt: Timestamp.now() });
}

/**
 * Log a recipe as a meal
 */
export async function logRecipeAsMealFb(
  userId: string,
  recipeId: string,
  servings: number,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  nutrition: Nutrition,
  recipeName: string
): Promise<string> {
  const now = new Date();
  const roundedNutrition = {
    calories: Math.round(nutrition.calories),
    protein: Math.round(nutrition.protein * 10) / 10,
    carbs: Math.round(nutrition.carbs * 10) / 10,
    fat: Math.round(nutrition.fat * 10) / 10,
    fiber: Math.round((nutrition.fiber || 0) * 10) / 10,
    sugar: nutrition.sugar ? Math.round(nutrition.sugar * 10) / 10 : 0,
    saturatedFat: nutrition.saturatedFat ? Math.round(nutrition.saturatedFat * 10) / 10 : 0,
    sodium: nutrition.sodium ? Math.round(nutrition.sodium * 10) / 10 : 0,
  };
  const mealDoc = await addDoc(collection(db, 'meals'), {
    userId,
    dishName: recipeName,
    mealType,
    // Nested nutrition object (primary — used by MealCard/store)
    nutrition: roundedNutrition,
    // Flat fields (legacy compat)
    calories: roundedNutrition.calories,
    protein: roundedNutrition.protein,
    carbs: roundedNutrition.carbs,
    fat: roundedNutrition.fat,
    fiber: roundedNutrition.fiber,
    notes: `Receta: ${recipeName} (${servings} porciones)`,
    recipeId,
    ingredients: [],
    timestamp: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
  });
  return mealDoc.id;
}

// ============================================
// FASTING
// ============================================

export async function saveFastingConfig(userId: string, config: FastingConfig): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'config', 'fasting'), config);
}

export async function getFastingConfig(userId: string): Promise<FastingConfig | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'config', 'fasting'));
  return snap.exists() ? (snap.data() as FastingConfig) : null;
}

export async function saveFastingSession(
  session: Omit<FastingSession, 'id'> | FastingSession
): Promise<string> {
  const s = session as FastingSession;
  if (s.id) {
    await setDoc(doc(db, 'fastingSessions', s.id), session);
    return s.id;
  }
  const ref = await addDoc(collection(db, 'fastingSessions'), session);
  return ref.id;
}

export async function getFastingSessions(
  userId: string,
  limitCount: number = 30
): Promise<FastingSession[]> {
  const q = query(
    collection(db, 'fastingSessions'),
    where('userId', '==', userId),
    orderBy('startTime', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FastingSession));
}

// ============================================
// BODY MEASUREMENTS
// ============================================

export async function saveMeasurement(
  measurement: Omit<BodyMeasurement, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'measurements'), measurement);
  return ref.id;
}

export async function getMeasurements(userId: string): Promise<BodyMeasurement[]> {
  const q = query(
    collection(db, 'measurements'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as BodyMeasurement));
}

export async function deleteMeasurement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'measurements', id));
}
