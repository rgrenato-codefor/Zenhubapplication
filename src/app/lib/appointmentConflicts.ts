/**
 * appointmentConflicts.ts
 *
 * Utilities for detecting scheduling conflicts before saving a new appointment.
 *
 * Two types of checks:
 *  1. CONFLICT  — therapist already has an active (confirmed/pending) appointment
 *                 that overlaps in time with the requested slot.
 *  2. UNAVAILABLE — the requested day/time is outside the therapist's configured
 *                   availability schedule.
 */

export interface AppointmentSlim {
  id?: string;
  therapistId: string;
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:MM"
  duration: number;   // minutes
  status: string;     // "confirmed" | "pending" | "completed" | "cancelled"
}

// Day-of-week index (0 = Sunday) → key used in the availability schedule
const DOW_KEYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

/** Convert "HH:MM" to total minutes from midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Check whether a new appointment overlaps with any active existing appointment
 * for the same therapist on the same date.
 *
 * Returns the first conflicting appointment found, or null if clear.
 *
 * @param existing    All appointments to check against
 * @param therapistId Target therapist
 * @param date        "YYYY-MM-DD"
 * @param time        "HH:MM"
 * @param duration    Duration of new appointment in minutes
 * @param excludeId   Optional appointment id to skip (useful when editing)
 */
export function findConflict(
  existing: AppointmentSlim[],
  therapistId: string,
  date: string,
  time: string,
  duration: number,
  excludeId?: string,
): AppointmentSlim | null {
  const newStart = timeToMinutes(time);
  const newEnd   = newStart + (duration > 0 ? duration : 60);

  for (const apt of existing) {
    // Only care about the same therapist, same date, active statuses
    if (apt.therapistId !== therapistId) continue;
    if (apt.date !== date) continue;
    if (apt.status === "cancelled" || apt.status === "completed") continue;
    if (excludeId && apt.id === excludeId) continue;

    const aptStart = timeToMinutes(apt.time);
    const aptEnd   = aptStart + (apt.duration > 0 ? apt.duration : 60);

    // Overlap: newStart < aptEnd  AND  aptStart < newEnd
    if (newStart < aptEnd && aptStart < newEnd) {
      return apt;
    }
  }
  return null;
}

/**
 * Check whether a given date + time falls within the therapist's availability.
 *
 * @param schedule  Record<dayKey, string[]> — e.g. { monday: ["09:00","10:00"] }
 * @param date      "YYYY-MM-DD"
 * @param time      "HH:MM"
 *
 * Returns true if the schedule is empty/not set (no restriction) or if the
 * time appears in that day's list.
 */
export function isWithinAvailability(
  schedule: Record<string, string[]> | null | undefined,
  date: string,
  time: string,
): boolean {
  if (!schedule || Object.keys(schedule).length === 0) return true; // no restriction

  const dow = new Date(date + "T12:00:00").getDay(); // 0 = Sunday
  const dayKey = DOW_KEYS[dow];
  const slots = schedule[dayKey];

  if (!slots || slots.length === 0) return false; // day not configured

  // Exact match first
  if (slots.includes(time)) return true;

  // Also accept if the time falls inside a slot range:
  // some stores keep only starting hours, so check if any slot's start ≤ time < slot+60
  const reqMin = timeToMinutes(time);
  for (const slot of slots) {
    const slotMin = timeToMinutes(slot);
    if (reqMin >= slotMin && reqMin < slotMin + 60) return true;
  }

  return false;
}

/**
 * Full pre-save validation for a new appointment.
 *
 * Returns an object with:
 *  - `blocked`  true if the booking must be stopped (hard conflict)
 *  - `warn`     true if the booking can proceed but with a warning
 *  - `message`  human-readable Portuguese message
 */
export function checkAppointmentConflicts(params: {
  existing: AppointmentSlim[];
  availability?: Record<string, string[]> | null;
  therapistId: string;
  date: string;
  time: string;
  duration: number;
  excludeId?: string;
}): { blocked: boolean; warn: boolean; message: string } {
  const { existing, availability, therapistId, date, time, duration, excludeId } = params;

  // 1 — Hard conflict: therapist already has an active overlapping session
  const conflict = findConflict(existing, therapistId, date, time, duration, excludeId);
  if (conflict) {
    return {
      blocked: true,
      warn: false,
      message: `Este terapeuta já possui uma sessão agendada às ${conflict.time} nesta data que conflita com o horário solicitado.`,
    };
  }

  // 2 — Soft warning: outside configured availability
  if (availability && Object.keys(availability).length > 0) {
    if (!isWithinAvailability(availability, date, time)) {
      const dow = new Date(date + "T12:00:00").getDay();
      const dayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
      return {
        blocked: false,
        warn: true,
        message: `O horário ${time} está fora da disponibilidade configurada pelo terapeuta para ${dayNames[dow]}.`,
      };
    }
  }

  return { blocked: false, warn: false, message: "" };
}
