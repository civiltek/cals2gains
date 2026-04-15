/**
 * Tests for smaller stores: themeStore, analysisStore, measurementStore,
 * progressPhotoStore, recipeStore, templateStore, reminderStore
 */
import { useThemeStore, DARK_COLORS, LIGHT_COLORS, useColors } from '../../store/themeStore';
import { useAnalysisStore } from '../../store/analysisStore';
import { useMeasurementStore } from '../../store/measurementStore';
import { useProgressPhotoStore } from '../../store/progressPhotoStore';
import { useRecipeStore } from '../../store/recipeStore';
import { useTemplateStore } from '../../store/templateStore';
import { useReminderStore } from '../../store/reminderStore';
import {
  saveMeasurement, getMeasurements, deleteMeasurement,
  saveProgressPhoto, getProgressPhotos, deleteProgressPhoto,
  saveRecipe, getRecipes, deleteRecipe, updateRecipe, updateRecipeFavorite,
  saveMealTemplate, getMealTemplates, deleteMealTemplate, updateTemplateUsage,
} from '../../services/firebase';
import {
  requestNotificationPermissions, scheduleDailyReminder, cancelReminder,
  getReminderContent,
} from '../../services/reminderService';

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// themeStore
// ============================================================================

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'dark', colors: DARK_COLORS, isDark: true });
  });

  it('defaults to dark mode', () => {
    expect(useThemeStore.getState().isDark).toBe(true);
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('switches to light mode', async () => {
    await useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().isDark).toBe(false);
    expect(useThemeStore.getState().colors).toBe(LIGHT_COLORS);
  });

  it('switches back to dark mode', async () => {
    await useThemeStore.getState().setMode('light');
    await useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().isDark).toBe(true);
    expect(useThemeStore.getState().colors).toBe(DARK_COLORS);
  });

  it('DARK_COLORS has expected brand values', () => {
    expect(DARK_COLORS.primary).toBe('#9C8CFF');
    expect(DARK_COLORS.accent).toBe('#FF6A4D');
    expect(DARK_COLORS.background).toBe('#17121D');
  });

  it('LIGHT_COLORS has distinct background', () => {
    expect(LIGHT_COLORS.background).toBe('#F5F2ED');
    expect(LIGHT_COLORS.background).not.toBe(DARK_COLORS.background);
  });
});

// ============================================================================
// analysisStore
// ============================================================================

describe('analysisStore', () => {
  beforeEach(() => {
    useAnalysisStore.setState({ imageUri: null, imageBase64: null });
  });

  it('stores image data', () => {
    useAnalysisStore.getState().setImage('file:///photo.jpg', 'base64data');
    expect(useAnalysisStore.getState().imageUri).toBe('file:///photo.jpg');
    expect(useAnalysisStore.getState().imageBase64).toBe('base64data');
  });

  it('clears image data', () => {
    useAnalysisStore.getState().setImage('file:///photo.jpg', 'base64data');
    useAnalysisStore.getState().clear();
    expect(useAnalysisStore.getState().imageUri).toBeNull();
    expect(useAnalysisStore.getState().imageBase64).toBeNull();
  });
});

// ============================================================================
// measurementStore
// ============================================================================

describe('measurementStore', () => {
  beforeEach(() => {
    useMeasurementStore.setState({ measurements: [], isLoading: false });
  });

  it('loads measurements from Firebase', async () => {
    const data = [
      { id: 'm1', userId: 'u1', date: new Date(), waist: 80, chest: 100 },
      { id: 'm2', userId: 'u1', date: new Date(Date.now() - 86400000), waist: 81 },
    ];
    (getMeasurements as jest.Mock).mockResolvedValueOnce(data);

    await useMeasurementStore.getState().loadMeasurements('u1');

    expect(useMeasurementStore.getState().measurements).toHaveLength(2);
  });

  it('adds measurement and sorts by date descending', async () => {
    (saveMeasurement as jest.Mock).mockResolvedValueOnce('new-id');

    await useMeasurementStore.getState().addMeasurement({
      userId: 'u1', date: new Date(), waist: 79,
    });

    expect(useMeasurementStore.getState().measurements).toHaveLength(1);
  });

  it('removes measurement', async () => {
    useMeasurementStore.setState({
      measurements: [
        { id: 'm1', userId: 'u1', date: new Date(), waist: 80 },
        { id: 'm2', userId: 'u1', date: new Date(), waist: 81 },
      ],
    });

    await useMeasurementStore.getState().deleteMeasurement('m1');

    expect(useMeasurementStore.getState().measurements).toHaveLength(1);
  });

  it('getLatest returns most recent', () => {
    const recent = { id: 'm1', userId: 'u1', date: new Date(), waist: 79 };
    useMeasurementStore.setState({ measurements: [recent] });
    expect(useMeasurementStore.getState().getLatest()).toEqual(recent);
  });

  it('getLatest returns null when empty', () => {
    expect(useMeasurementStore.getState().getLatest()).toBeNull();
  });

  it('getChanges returns difference in field over time', () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    useMeasurementStore.setState({
      measurements: [
        { id: 'm1', userId: 'u1', date: now, waist: 78 },
        { id: 'm2', userId: 'u1', date: weekAgo, waist: 80 },
      ],
    });
    expect(useMeasurementStore.getState().getChanges('waist', 30)).toBe(-2);
  });

  it('getChanges returns null with < 2 measurements', () => {
    expect(useMeasurementStore.getState().getChanges('waist')).toBeNull();
  });
});

// ============================================================================
// progressPhotoStore
// ============================================================================

describe('progressPhotoStore', () => {
  beforeEach(() => {
    useProgressPhotoStore.setState({ photos: [], isLoading: false });
  });

  it('loads photos from Firebase', async () => {
    (getProgressPhotos as jest.Mock).mockResolvedValueOnce([
      { id: 'p1', userId: 'u1', date: new Date(), angle: 'front', photoUri: 'uri1' },
    ]);

    await useProgressPhotoStore.getState().loadPhotos('u1');
    expect(useProgressPhotoStore.getState().photos).toHaveLength(1);
  });

  it('adds photo', async () => {
    (saveProgressPhoto as jest.Mock).mockResolvedValueOnce('new-photo');

    await useProgressPhotoStore.getState().addPhoto({
      userId: 'u1', date: new Date(), angle: 'front', photoUri: 'uri',
    });
    expect(useProgressPhotoStore.getState().photos).toHaveLength(1);
  });

  it('deletes photo', async () => {
    useProgressPhotoStore.setState({
      photos: [{ id: 'p1', userId: 'u1', date: new Date(), angle: 'front', photoUri: 'uri' }],
    });

    await useProgressPhotoStore.getState().deletePhoto('p1');
    expect(useProgressPhotoStore.getState().photos).toHaveLength(0);
  });

  it('getByAngle filters correctly', () => {
    useProgressPhotoStore.setState({
      photos: [
        { id: 'p1', userId: 'u1', date: new Date(), angle: 'front', photoUri: 'a' },
        { id: 'p2', userId: 'u1', date: new Date(), angle: 'side', photoUri: 'b' },
        { id: 'p3', userId: 'u1', date: new Date(), angle: 'front', photoUri: 'c' },
      ],
    });
    expect(useProgressPhotoStore.getState().getByAngle('front')).toHaveLength(2);
    expect(useProgressPhotoStore.getState().getByAngle('back')).toHaveLength(0);
  });

  it('getComparison returns first and latest', () => {
    const old = new Date(Date.now() - 30 * 86400000);
    const recent = new Date();
    useProgressPhotoStore.setState({
      photos: [
        { id: 'p1', userId: 'u1', date: recent, angle: 'front', photoUri: 'new' },
        { id: 'p2', userId: 'u1', date: old, angle: 'front', photoUri: 'old' },
      ],
    });

    const comp = useProgressPhotoStore.getState().getComparison('front');
    expect(comp.latest!.id).toBe('p1');
    expect(comp.first!.id).toBe('p2');
  });
});

// ============================================================================
// recipeStore
// ============================================================================

describe('recipeStore', () => {
  beforeEach(() => {
    useRecipeStore.setState({ recipes: [], isLoading: false, isSaving: false });
  });

  it('loads recipes from Firebase', async () => {
    (getRecipes as jest.Mock).mockResolvedValueOnce([
      { id: 'r1', name: 'Pollo', tags: [], isFavorite: false },
    ]);

    await useRecipeStore.getState().loadRecipes('u1');
    expect(useRecipeStore.getState().recipes).toHaveLength(1);
  });

  it('adds recipe', async () => {
    (saveRecipe as jest.Mock).mockResolvedValueOnce('new-recipe');

    const id = await useRecipeStore.getState().addRecipe(
      { name: 'Test', nameEs: 'Test', nameEn: 'Test', ingredients: [], servings: 2, totalNutrition: { calories: 500, protein: 30, carbs: 50, fat: 15, fiber: 3 }, nutritionPerServing: { calories: 250, protein: 15, carbs: 25, fat: 7.5, fiber: 1.5 }, tags: [], source: 'manual', isFavorite: false, timesUsed: 0, createdAt: new Date(), updatedAt: new Date() } as any,
      'u1',
    );
    expect(id).toBe('new-recipe');
    expect(useRecipeStore.getState().recipes).toHaveLength(1);
  });

  it('toggles favorite', async () => {
    useRecipeStore.setState({
      recipes: [{ id: 'r1', name: 'Test', isFavorite: false, tags: [] } as any],
    });
    (updateRecipeFavorite as jest.Mock).mockResolvedValueOnce(undefined);

    await useRecipeStore.getState().toggleFavorite('r1');
    expect(useRecipeStore.getState().recipes[0].isFavorite).toBe(true);
  });

  it('getFavorites filters correctly', () => {
    useRecipeStore.setState({
      recipes: [
        { id: 'r1', isFavorite: true, tags: [] } as any,
        { id: 'r2', isFavorite: false, tags: [] } as any,
      ],
    });
    expect(useRecipeStore.getState().getFavorites()).toHaveLength(1);
  });

  it('searchRecipes matches name', () => {
    useRecipeStore.setState({
      recipes: [
        { id: 'r1', name: 'Pollo con arroz', nameEs: 'Pollo con arroz', nameEn: 'Chicken with rice', tags: [] } as any,
        { id: 'r2', name: 'Ensalada', nameEs: 'Ensalada', nameEn: 'Salad', tags: [] } as any,
      ],
    });
    expect(useRecipeStore.getState().searchRecipes('pollo')).toHaveLength(1);
    expect(useRecipeStore.getState().searchRecipes('xyz')).toHaveLength(0);
  });

  it('getByTag filters by tag', () => {
    useRecipeStore.setState({
      recipes: [
        { id: 'r1', tags: ['high-protein', 'quick'], isFavorite: false } as any,
        { id: 'r2', tags: ['vegan'], isFavorite: false } as any,
      ],
    });
    expect(useRecipeStore.getState().getByTag('protein')).toHaveLength(1);
  });
});

// ============================================================================
// templateStore
// ============================================================================

describe('templateStore', () => {
  beforeEach(() => {
    useTemplateStore.setState({ templates: [], isLoading: false });
  });

  it('loads templates from Firebase', async () => {
    (getMealTemplates as jest.Mock).mockResolvedValueOnce([
      { id: 't1', name: 'Pollo', timesUsed: 5, lastUsed: new Date() },
    ]);

    await useTemplateStore.getState().loadTemplates('u1');
    expect(useTemplateStore.getState().templates).toHaveLength(1);
  });

  it('skips load with empty userId', async () => {
    await useTemplateStore.getState().loadTemplates('');
    expect(getMealTemplates).not.toHaveBeenCalled();
  });

  it('saves meal as template', async () => {
    (saveMealTemplate as jest.Mock).mockResolvedValueOnce('new-tpl');

    const meal = {
      id: 'm1', userId: 'u1', dishName: 'Pollo', dishNameEs: 'Pollo', dishNameEn: 'Chicken',
      nutrition: { calories: 300, protein: 40, carbs: 0, fat: 8, fiber: 0 },
      estimatedWeight: 150, mealType: 'lunch' as const, ingredients: ['chicken'],
      portionDescription: '150g', photoUri: '', timestamp: new Date(), aiConfidence: 0.9,
    };

    await useTemplateStore.getState().saveAsTemplate(meal as any);
    expect(useTemplateStore.getState().templates).toHaveLength(1);
  });

  it('removes template', async () => {
    useTemplateStore.setState({
      templates: [{ id: 't1', name: 'Pollo', timesUsed: 0, lastUsed: new Date() } as any],
    });

    await useTemplateStore.getState().removeTemplate('t1');
    expect(useTemplateStore.getState().templates).toHaveLength(0);
  });

  it('useTemplate increments timesUsed', async () => {
    const now = new Date();
    useTemplateStore.setState({
      templates: [{ id: 't1', name: 'Pollo', timesUsed: 3, lastUsed: now } as any],
    });

    const result = await useTemplateStore.getState().useTemplate('t1');
    expect(result).toBeTruthy();
    expect(useTemplateStore.getState().templates[0].timesUsed).toBe(4);
  });

  it('getFrequentTemplates returns sorted by timesUsed', () => {
    useTemplateStore.setState({
      templates: [
        { id: 't1', name: 'A', timesUsed: 2, lastUsed: new Date() } as any,
        { id: 't2', name: 'B', timesUsed: 10, lastUsed: new Date() } as any,
        { id: 't3', name: 'C', timesUsed: 5, lastUsed: new Date() } as any,
      ],
    });
    const frequent = useTemplateStore.getState().getFrequentTemplates(2);
    expect(frequent).toHaveLength(2);
    expect(frequent[0].id).toBe('t2');
    expect(frequent[1].id).toBe('t3');
  });
});

// ============================================================================
// reminderStore
// ============================================================================

describe('reminderStore', () => {
  const mockT = (k: string) => `translated:${k}`;

  beforeEach(() => {
    useReminderStore.setState({
      reminders: {
        meals: { key: 'meals', enabled: false, time: '08:00' },
        water: { key: 'water', enabled: false, time: '10:00' },
        weight: { key: 'weight', enabled: false, time: '07:00' },
        fasting: { key: 'fasting', enabled: false, time: '20:00' },
      },
      permissionGranted: false,
    });
  });

  it('toggleReminder enables and schedules notification', async () => {
    const result = await useReminderStore.getState().toggleReminder('meals', mockT);

    expect(result).toBe(true);
    expect(useReminderStore.getState().reminders.meals.enabled).toBe(true);
    expect(useReminderStore.getState().reminders.meals.notificationId).toBe('mock-notif-id');
    expect(useReminderStore.getState().permissionGranted).toBe(true);
  });

  it('toggleReminder disables and cancels notification', async () => {
    useReminderStore.setState({
      reminders: {
        ...useReminderStore.getState().reminders,
        meals: { key: 'meals', enabled: true, time: '08:00', notificationId: 'notif-123' },
      },
      permissionGranted: true,
    });

    await useReminderStore.getState().toggleReminder('meals', mockT);

    expect(useReminderStore.getState().reminders.meals.enabled).toBe(false);
    expect(cancelReminder).toHaveBeenCalledWith('notif-123');
  });

  it('setReminderTime reschedules if enabled', async () => {
    useReminderStore.setState({
      reminders: {
        ...useReminderStore.getState().reminders,
        water: { key: 'water', enabled: true, time: '10:00', notificationId: 'old-id' },
      },
      permissionGranted: true,
    });

    await useReminderStore.getState().setReminderTime('water', '14:00', mockT);

    expect(useReminderStore.getState().reminders.water.time).toBe('14:00');
    expect(cancelReminder).toHaveBeenCalledWith('old-id');
    expect(scheduleDailyReminder).toHaveBeenCalled();
  });
});
