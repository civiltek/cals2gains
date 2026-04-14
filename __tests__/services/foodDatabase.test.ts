/**
 * Tests for foodDatabase.ts
 * Tests pure helper functions and mocked API calls.
 */

// We need to mock language before importing foodDatabase
jest.mock('../../utils/language', () => ({
  getAppLanguage: jest.fn(() => 'es'),
}));

import { lookupBarcode, searchFoods } from '../../services/foodDatabase';
import { getAppLanguage } from '../../utils/language';

const mockGetAppLanguage = getAppLanguage as jest.Mock;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAppLanguage.mockReturnValue('es');
});

describe('foodDatabase', () => {
  describe('lookupBarcode', () => {
    it('returns FoodItem for valid barcode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 1,
          product: {
            product_name: 'Cola Cao',
            product_name_es: 'Cola Cao Original',
            product_name_en: 'Cola Cao Original',
            brands: 'Cola Cao',
            nutriments: {
              'energy-kcal_100g': 380,
              proteins_100g: 5,
              carbohydrates_100g: 78,
              fat_100g: 3.5,
              fiber_100g: 7.5,
              sugars_100g: 70,
            },
            serving_size: '25g',
          },
        }),
      });

      const result = await lookupBarcode('8410014445');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('off_8410014445');
      expect(result!.barcode).toBe('8410014445');
      expect(result!.nutritionPer100g.calories).toBe(380);
      expect(result!.nutritionPer100g.protein).toBe(5);
      expect(result!.servingSize).toBe(25); // parsed from "25g"
      expect(result!.source).toBe('openfoodfacts');
    });

    it('returns null for product not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 0, product: null }),
      });

      const result = await lookupBarcode('0000000000');
      expect(result).toBeNull();
    });

    it('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await lookupBarcode('1234567890');
      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await lookupBarcode('1234567890');
      expect(result).toBeNull();
    });

    it('calculates per-serving nutrition from serving_size', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 1,
          product: {
            product_name: 'Test Food',
            nutriments: {
              'energy-kcal_100g': 200,
              proteins_100g: 10,
              carbohydrates_100g: 30,
              fat_100g: 5,
              fiber_100g: 2,
            },
            serving_size: '50g',
          },
        }),
      });

      const result = await lookupBarcode('test');
      expect(result!.nutritionPerServing.calories).toBe(100); // 200 * 0.5
      expect(result!.nutritionPerServing.protein).toBe(5);    // 10 * 0.5
    });

    it('uses English name when language is en', async () => {
      mockGetAppLanguage.mockReturnValue('en');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 1,
          product: {
            product_name: 'Milk',
            product_name_es: 'Leche',
            product_name_en: 'Whole Milk',
            nutriments: {
              'energy-kcal_100g': 61,
              proteins_100g: 3.2,
              carbohydrates_100g: 4.8,
              fat_100g: 3.3,
              fiber_100g: 0,
            },
          },
        }),
      });

      const result = await lookupBarcode('milk-barcode');
      expect(result!.name).toBe('Whole Milk');
    });
  });

  describe('searchFoods', () => {
    it('returns local + API results merged for Spanish', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          products: [
            {
              code: '123',
              product_name: 'Arroz Largo',
              nutriments: {
                'energy-kcal_100g': 350,
                proteins_100g: 7,
                carbohydrates_100g: 77,
                fat_100g: 1,
                fiber_100g: 1.3,
              },
            },
          ],
          count: 1,
        }),
      });

      const result = await searchFoods('arroz');

      // Should include local Spanish food matches + API results
      expect(result.items.length).toBeGreaterThan(0);
      // Local results should come first
      const localItems = result.items.filter((i) => i.source === 'local');
      expect(localItems.length).toBeGreaterThan(0);
    });

    it('falls back to local database on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchFoods('pollo');

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((i) => i.source === 'local')).toBe(true);
    });

    it('returns empty on API failure with no local match', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchFoods('xyznonexistent');

      expect(result.items).toHaveLength(0);
    });

    it('deduplicates results by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          products: [],
          count: 0,
        }),
      });

      const result = await searchFoods('huevo');

      const ids = result.items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
