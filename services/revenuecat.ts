// ============================================
// Cals2Gains - RevenueCat Subscription Service
// ============================================

import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PURCHASES_ERROR_CODE,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { updateSubscriptionStatus } from './firebase';

// Product identifiers (must match App Store Connect and Google Play)
export const PRODUCT_IDS = {
  MONTHLY: 'cals2gains_monthly_999',    // €9.99/month
  ANNUAL: 'cals2gains_annual_4999',      // €49.99/year
};

export const ENTITLEMENT_ID = 'premium'; // Configured in RevenueCat dashboard

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isConfigured) return;

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY!
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY!;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.WARN);
  await Purchases.configure({ apiKey });

  if (userId) {
    await Purchases.logIn(userId);
  }

  isConfigured = true;
}

/**
 * Get available subscription packages
 */
export async function getOfferings(): Promise<PurchasesPackage[]> {
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
  pkg: PurchasesPackage,
  userId: string
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
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
): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
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
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
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
export function checkEntitlement(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

/**
 * Get subscription expiration date
 */
function getExpirationDate(customerInfo: CustomerInfo): Date | null {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement?.expirationDate) return null;
  return new Date(entitlement.expirationDate);
}

/**
 * Determine subscription type from customer info
 */
function determineSubType(customerInfo: CustomerInfo): 'monthly' | 'annual' {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement) return 'monthly';

  const productId = entitlement.productIdentifier || '';
  return productId.includes('annual') ? 'annual' : 'monthly';
}

/**
 * Log in user to RevenueCat (for cross-device sync)
 */
export async function loginRevenueCat(userId: string): Promise<void> {
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
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('RevenueCat logout error:', error);
  }
}
