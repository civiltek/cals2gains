// ============================================
// Cals2Gains - Firebase Service
// ============================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
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
  Timestamp,
  limit,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Meal, DailyLog, UserGoals, UserProfile } from '../types';
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

// Initialize Auth with React Native persistence
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

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
      language: data.language || 'es',
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

  // Update daily log
  await updateDailyLog(meal.userId, meal.timestamp, meal);

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
  const mealRef = doc(db, 'meals', mealId);
  await deleteDoc(mealRef);
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
