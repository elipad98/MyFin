'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 1 hora de inactividad en milisegundos
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora (3,600,000 ms)
// Frecuencia mínima para renovar token en el servidor (cada 10 minutos si hay interacción)
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export default function InactivityHandler() {
  const pathname = usePathname();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(Date.now());

  // Rutas públicas que no requieren verificación de inactividad
  const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname === '/verify-email';

  const handleLogoutDueToInactivity = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar errores de red en logout
    } finally {
      window.location.href = '/login?reason=inactivity';
    }
  };

  const tryRefreshSession = async () => {
    const now = Date.now();
    // Refrescar en el servidor sólo si han pasado al menos 10 mins desde la última renovación
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

    // Probar refrescar el token si ha habido actividad
    tryRefreshSession();

    // Establecer nuevo temporizador de 1 hora
    inactivityTimerRef.current = setTimeout(() => {
      handleLogoutDueToInactivity();
    }, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    if (isPublicRoute) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      return;
    }

    // Inicializar el temporizador al cargar
    resetInactivityTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Usar throttling ligero para evitar llamadas excesivas en mousemove
    let throttleTimeout: NodeJS.Timeout | null = null;
    const onUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          resetInactivityTimer();
        }, 1000); // Throttle de 1s para reiniciar temporizador
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
