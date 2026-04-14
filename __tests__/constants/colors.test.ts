/**
 * Tests for constants/colors.ts
 * Verifies the proxy re-export from theme.ts works correctly.
 */
import { Colors } from '../../constants/colors';

describe('Colors proxy', () => {
  it('exposes primary color from theme', () => {
    expect(Colors.primary).toBeTruthy();
  });

  it('exposes accent color from theme', () => {
    expect(Colors.accent).toBeTruthy();
  });

  it('exposes background color from theme', () => {
    expect(Colors.background).toBeTruthy();
  });

  it('exposes text color from theme', () => {
    expect(Colors.text).toBeTruthy();
  });

  it('maps alias "carbon" to background', () => {
    expect(Colors.carbon).toBe(Colors.background);
  });

  it('maps alias "gradientStart" to violet', () => {
    expect(Colors.gradientStart).toBe(Colors.violet);
  });

  it('maps alias "gradientEnd" to coral', () => {
    expect(Colors.gradientEnd).toBe(Colors.coral);
  });
});
