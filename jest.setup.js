// Global mocks for Cals2Gains test environment

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase service
jest.mock('./services/firebase', () => ({
  db: {},
  getMealsForDate: jest.fn(() => Promise.resolve([])),
  saveMeal: jest.fn(() => Promise.resolve('mock-meal-id')),
  deleteMeal: jest.fn(() => Promise.resolve()),
  updateMeal: jest.fn(() => Promise.resolve()),
  getRecentMeals: jest.fn(() => Promise.resolve([])),
  saveMealPhotoBase64: jest.fn(() => Promise.resolve(null)),
  saveWeightEntry: jest.fn(() => Promise.resolve('mock-weight-id')),
  getWeightHistory: jest.fn(() => Promise.resolve([])),
  deleteWeightEntry: jest.fn(() => Promise.resolve()),
  saveFastingConfig: jest.fn(() => Promise.resolve()),
  getFastingConfig: jest.fn(() => Promise.resolve(null)),
  saveFastingSession: jest.fn(() => Promise.resolve('mock-session-id')),
  getFastingSessions: jest.fn(() => Promise.resolve([])),
  saveWaterLog: jest.fn(() => Promise.resolve()),
  getWaterLog: jest.fn(() => Promise.resolve(null)),
  getUserData: jest.fn(() => Promise.resolve(null)),
  updateUserProfile: jest.fn(() => Promise.resolve()),
  updateUserLanguage: jest.fn(() => Promise.resolve()),
  updateUserGoalsAndMode: jest.fn(() => Promise.resolve()),
  onAuthStateChange: jest.fn(() => () => {}),
  signOut: jest.fn(() => Promise.resolve()),
  // Measurement store
  saveMeasurement: jest.fn(() => Promise.resolve('mock-measurement-id')),
  getMeasurements: jest.fn(() => Promise.resolve([])),
  deleteMeasurement: jest.fn(() => Promise.resolve()),
  // Progress photo store
  saveProgressPhoto: jest.fn(() => Promise.resolve('mock-photo-id')),
  getProgressPhotos: jest.fn(() => Promise.resolve([])),
  deleteProgressPhoto: jest.fn(() => Promise.resolve()),
  // Recipe store
  saveRecipe: jest.fn(() => Promise.resolve('mock-recipe-id')),
  getRecipes: jest.fn(() => Promise.resolve([])),
  deleteRecipe: jest.fn(() => Promise.resolve()),
  updateRecipe: jest.fn(() => Promise.resolve()),
  updateRecipeFavorite: jest.fn(() => Promise.resolve()),
  logRecipeAsMealFb: jest.fn(() => Promise.resolve('mock-logged-meal-id')),
  // Template store
  saveMealTemplate: jest.fn(() => Promise.resolve('mock-template-id')),
  getMealTemplates: jest.fn(() => Promise.resolve([])),
  deleteMealTemplate: jest.fn(() => Promise.resolve()),
  updateTemplateUsage: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase Firestore (for shoppingListStore)
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  Timestamp: { fromDate: jest.fn((d) => ({ toDate: () => d })) },
  writeBatch: jest.fn(() => ({ delete: jest.fn(), commit: jest.fn(() => Promise.resolve()) })),
}));

// Mock RevenueCat
jest.mock('./services/revenuecat', () => ({
  loginRevenueCat: jest.fn(() => Promise.resolve()),
  logoutRevenueCat: jest.fn(() => Promise.resolve()),
}));

// Mock reminder service
jest.mock('./services/reminderService', () => ({
  requestNotificationPermissions: jest.fn(() => Promise.resolve(true)),
  getNotificationPermissions: jest.fn(() => Promise.resolve(true)),
  scheduleDailyReminder: jest.fn(() => Promise.resolve('mock-notif-id')),
  cancelReminder: jest.fn(() => Promise.resolve()),
  cancelAllReminders: jest.fn(() => Promise.resolve()),
  getScheduledNotifications: jest.fn(() => Promise.resolve([])),
  getReminderContent: jest.fn((key) => ({
    title: `Title for ${key}`,
    body: `Body for ${key}`,
  })),
}));

// Mock theme sync function
jest.mock('./theme', () => ({
  COLORS: {
    primary: '#9C8CFF',
    accent: '#FF6A4D',
    background: '#17121D',
    text: '#F7F2EA',
    surface: '#1F1A28',
    surfaceLight: '#2A2335',
    border: '#2A2335',
    violet: '#9C8CFF',
    coral: '#FF6A4D',
    bone: '#F7F2EA',
    carbon: '#17121D',
  },
  BRAND_COLORS: {},
  BRAND_FONTS: {},
  _syncThemeColors: jest.fn(),
}));

// Mock expo modules
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  deleteAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  moveAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('base64data')),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: '/tmp/mock.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
