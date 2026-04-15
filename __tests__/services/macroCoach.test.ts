import { estimateBodyComposition } from '../../services/macroCoach';

// ============================================================================
// estimateBodyComposition — Navy method estimation
// ============================================================================

describe('estimateBodyComposition', () => {
  it('estimates body fat for a typical male', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    expect(result.source).toBe('estimate');
    expect(result.bodyFatPct).toBeGreaterThan(5);
    expect(result.bodyFatPct).toBeLessThan(40);
  });

  it('estimates body fat for a typical female', () => {
    const result = estimateBodyComposition(65, 165, 28, 'female');
    expect(result.source).toBe('estimate');
    expect(result.bodyFatPct).toBeGreaterThanOrEqual(10);
    expect(result.bodyFatPct).toBeLessThan(45);
  });

  it('males have lower body fat floor (5%) than females (10%)', () => {
    // Very lean, tall person
    const male = estimateBodyComposition(60, 190, 20, 'male');
    const female = estimateBodyComposition(60, 190, 20, 'female');
    expect(male.bodyFatPct).toBeGreaterThanOrEqual(5);
    expect(female.bodyFatPct).toBeGreaterThanOrEqual(10);
  });

  it('caps body fat at 50%', () => {
    // Very heavy, short person
    const result = estimateBodyComposition(150, 150, 50, 'male');
    expect(result.bodyFatPct).toBeLessThanOrEqual(50);
  });

  it('calculates muscle mass as 85% of lean mass', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    const fatMass = 80 * (result.bodyFatPct / 100);
    const leanMass = 80 - fatMass;
    const expectedMuscle = Math.round(leanMass * 0.85 * 10) / 10;
    expect(result.muscleMass).toBeCloseTo(expectedMuscle, 0);
  });

  it('calculates body water as 73% of lean mass', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    const fatMass = 80 * (result.bodyFatPct / 100);
    const leanMass = 80 - fatMass;
    const expectedWater = Math.round(leanMass * 0.73 * 10) / 10;
    expect(result.bodyWater).toBeCloseTo(expectedWater, 0);
  });

  it('calculates BMR using Mifflin-St Jeor', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    // BMR = 10 * 80 + 6.25 * 178 - 5 * 30 + 5 = 800 + 1112.5 - 150 + 5 = 1767.5
    expect(result.bmr).toBeCloseTo(1767.5);
  });

  it('sets visceral fat to 0 (placeholder)', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    expect(result.viscFat).toBe(0);
  });

  it('rounds bodyFatPct to 1 decimal', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    const decimals = result.bodyFatPct.toString().split('.')[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });

  it('rounds muscleMass to 1 decimal', () => {
    const result = estimateBodyComposition(80, 178, 30, 'male');
    const decimals = result.muscleMass.toString().split('.')[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });

  it('treats "other" gender same as female formula', () => {
    const other = estimateBodyComposition(70, 170, 30, 'other');
    const female = estimateBodyComposition(70, 170, 30, 'female');
    expect(other.bodyFatPct).toBe(female.bodyFatPct);
  });

  it('heavier person has higher body fat estimate', () => {
    const light = estimateBodyComposition(60, 175, 30, 'male');
    const heavy = estimateBodyComposition(100, 175, 30, 'male');
    expect(heavy.bodyFatPct).toBeGreaterThan(light.bodyFatPct);
  });

  it('taller person has lower body fat estimate (at same weight)', () => {
    const short = estimateBodyComposition(80, 160, 30, 'male');
    const tall = estimateBodyComposition(80, 190, 30, 'male');
    expect(tall.bodyFatPct).toBeLessThan(short.bodyFatPct);
  });
});
