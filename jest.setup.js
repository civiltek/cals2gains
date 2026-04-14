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
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: '/tmp/mock.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
