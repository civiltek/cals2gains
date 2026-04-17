// ============================================
// Cals2Gains - Premium Gate Hook
// ============================================
// Redirects to /paywall if the user doesn't have an active subscription.
// Use at the top of any premium-only screen. Returns `isPremium` so the
// screen can optionally render a fallback while the redirect happens.

import { useEffect } from 'react';
import { router } from 'expo-router';
import { useUserStore } from '../store/userStore';

export function usePremiumGate(): boolean {
  const isSubscriptionActive = useUserStore((s) => s.isSubscriptionActive);
  const active = isSubscriptionActive();

  useEffect(() => {
    if (!active) {
      // Use replace so Back doesn't bring them back to the locked screen
      router.replace('/paywall');
    }
  }, [active]);

  return active;
}
