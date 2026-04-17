// ============================================
// Cals2Gains - RevenueCat Subscription Service
// ============================================

import { Platform } from 'react-native';
import { updateSubscriptionStatus } from './firebase';

// Dynamic import to avoid crash in Expo Go (native module not available)
let Purchases: any = null;
let PURCHASES_ERROR_CODE: any = {};
let LOG_LEVEL: any = {};
let _nativeAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const rnp = require('react-native-purchases');
    Purchases = rnp.default;
    PURCHASES_ERROR_CODE = rnp.PURCHASES_ERROR_CODE;
    LOG_LEVEL = rnp.LOG_LEVEL;
    _nativeAvailable = true;
  } catch (e) {
    console.warn('[RevenueCat] Native module not available (Expo Go mode)');
  }
}

// Type stubs for when native module is unavailable
type PurchasesPackageType = any;
type CustomerInfoType = any;

// Product identifiers (must match App Store Connect and Google Play)
export const PRODUCT_IDS = {
  MONTHLY: 'cals2gains_monthly_999',    // €8.90/month (price updated, ID kept for store compatibility)
  ANNUAL: 'cals2gains_annual_4999',      // €59.90/year (price updated, ID kept for store compatibility)
};

export const ENTITLEMENT_ID = 'premium'; // Configured in RevenueCat dashboard

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (Platform.OS === 'web') {
    console.warn('[RevenueCat] Skipping init — not supported on web');
    return;
  }
  if (!_nativeAvailable) {
    console.warn('[RevenueCat] Skipping init — native module not available');
    return;
  }
  if (isConfigured) return;

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY!
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY!;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured');
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    await Purchases.configure({ apiKey });

    if (userId) {
      await Purchases.logIn(userId);
    }

    isConfigured = true;
  } catch (error) {
    console.warn('[RevenueCat] Init failed:', error);
  }
}

/**
 * Get available subscription packages
 */
export async function getOfferings(): Promise<PurchasesPackageType[]> {
  if (!_nativeAvailable || !isConfigured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return [];
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackageType,
  userId: string
): Promise<{ success: boolean; customerInfo?: CustomerInfoType; error?: string }> {
  if (!_nativeAvailable || !isConfigured) {
    return { success: false, error: 'RevenueCat not available in Expo Go' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = checkEntitlement(customerInfo);

    if (isActive) {
      const expiresAt = getExpirationDate(customerInfo);
      const subType = pkg.packageType === 'ANNUAL' ? 'annual' : 'monthly';
      await updateSubscriptionStatus(userId, true, subType, expiresAt);
    }

    return { success: isActive, customerInfo };
  } catch (error: any) {
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(
  userId: string
): Promise<{ success: boolean; customerInfo?: CustomerInfoType }> {
  if (!_nativeAvailable || !isConfigured) {
    return { success: false };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = checkEntitlement(customerInfo);

    if (isActive) {
      const expiresAt = getExpirationDate(customerInfo);
      const subType = determineSubType(customerInfo);
      await updateSubscriptionStatus(userId, true, subType, expiresAt);
    }

    return { success: isActive, customerInfo };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false };
  }
}

/**
 * Get current customer info (subscription status)
 */
export async function getCustomerInfo(): Promise<CustomerInfoType | null> {
  if (!_nativeAvailable || !isConfigured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}

/**
 * Check if user has active premium entitlement
 */
export function checkEntitlement(customerInfo: CustomerInfoType): boolean {
  if (!customerInfo?.entitlements?.active) return false;
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

/**
 * Get subscription expiration date
 */
function getExpirationDate(customerInfo: CustomerInfoType): Date | null {
  const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!entitlement?.expirationDate) return null;
  return new Date(entitlement.expirationDate);
}

/**
 * Determine subscription type from customer info
 */
function determineSubType(customerInfo: CustomerInfoType): 'monthly' | 'annual' {
  const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  if (!entitlement) return 'monthly';

  const productId = entitlement.productIdentifier || '';
  return productId.includes('annual') ? 'annual' : 'monthly';
}

/**
 * Log in user to RevenueCat (for cross-device sync)
 */
export async function loginRevenueCat(userId: string): Promise<void> {
  if (!_nativeAvailable || !isConfigured) {
    console.warn('[RevenueCat] Skipping login — native module not available');
    return;
  }
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error('RevenueCat login error:', error);
  }
}

/**
 * Log out from RevenueCat
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!_nativeAvailable || !isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('RevenueCat logout error:', error);
  }
}
