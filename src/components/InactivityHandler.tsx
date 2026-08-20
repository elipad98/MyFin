'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export default function InactivityHandler() {
  const pathname = usePathname();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(Date.now());

  const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname === '/verify-email';

  const handleLogoutDueToInactivity = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar errores
    } finally {
      window.location.href = '/login?reason=inactivity';
    }
  };

  const tryRefreshSession = async () => {
    const now = Date.now();
    if (now - lastRefreshTimeRef.current >= REFRESH_INTERVAL_MS) {
      lastRefreshTimeRef.current = now;
      try {
        await fetch('/api/auth/refresh', { method: 'POST' });
      } catch {
        // Ignorar
      }
    }
  };

  const resetInactivityTimer = () => {
    if (isPublicRoute) return;

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    tryRefreshSession();

    inactivityTimerRef.current = setTimeout(() => {
      handleLogoutDueToInactivity();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    if (isPublicRoute) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    resetInactivityTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    let throttleTimeout: NodeJS.Timeout | null = null;
    const onUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          resetInactivityTimer();
        }, 1000);
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, onUserActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      events.forEach((event) => {
        window.removeEventListener(event, onUserActivity);
      });
    };
  }, [pathname]);

  return null;
}
