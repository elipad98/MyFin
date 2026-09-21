/**
 * Utilidades para manejo seguro de fechas y zonas horarias en MyFin.
 * Previene el problema común donde fechas en formato YYYY-MM-DD se interpretan
 * a medianoche UTC (00:00:00Z) y en zonas horarias negativas (UTC-6 en México)
 * se muestran como las 18:00 del día anterior.
 */

/**
 * Obtiene la fecha actual en formato local YYYY-MM-DD
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea un valor de fecha para guardarlo de manera segura en la base de datos.
 * Si recibe "YYYY-MM-DD", asigna las 12:00:00 UTC para que al mostrarse en
 * cualquier zona horaria entre UTC-11 y UTC+11 se mantenga exactamente en el mismo día de calendario.
 */
export function parseDateSafe(input?: string | Date | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;

  // Si es formato YYYY-MM-DD
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return new Date(`${input.trim()}T12:00:00.000Z`);
  }

  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Formatea una fecha para visualización en español (México) sin desfase de día.
 */
export function formatDateOnly(date: string | Date | null | undefined, locale = 'es-MX'): string {
  if (!date) return '-';

  if (typeof date === 'string') {
    // Si viene como string ISO ("2026-09-20T...") o "YYYY-MM-DD"
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      // Creamos la fecha local directamente con año, mes (0-indexed) y día
      const localDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return localDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
    }
  }

  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(locale);
}

/**
 * Formatea una fecha con mes abreviado (e.g. "20 sep") sin desfase.
 */
export function formatDateShort(date: string | Date | null | undefined, locale = 'es-MX'): string {
  if (!date) return '-';

  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const localDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return localDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
      });
    }
  }

  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
