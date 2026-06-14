import { entities } from "@/api/entities";

const MAX_NUDGE_MINUTES = 15;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Sort barbers for "Any Barber" selection.
 * When the optimizer is enabled, least-booked-today barbers come first.
 * Otherwise barbers are sorted alphabetically by name.
 */
export function sortBarbersForBooking(barbers, todaysBookings, optimizerEnabled) {
  if (!optimizerEnabled) {
    return [...barbers].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  const counts = new Map();
  for (const booking of todaysBookings) {
    if (booking.status === "cancelled") continue;
    counts.set(booking.barber_id, (counts.get(booking.barber_id) || 0) + 1);
  }

  return [...barbers].sort((a, b) => {
    const diff = (counts.get(a.id) || 0) - (counts.get(b.id) || 0);
    if (diff !== 0) return diff;
    return (a.name || "").localeCompare(b.name || "");
  });
}

/**
 * After a booking is created, close small gaps in a barber's schedule by
 * nudging the appointment after a gap later (never earlier, never by more
 * than 15 minutes, never to a different barber).
 */
export async function runGapMinimization(barberId, dateStr) {
  const appointments = (await entities.Booking.filter({ barber_id: barberId, date: dateStr }))
    .filter((b) => b.status !== "cancelled")
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  for (let i = 1; i < appointments.length; i++) {
    const prev = appointments[i - 1];
    const curr = appointments[i];

    const prevEnd = toMinutes(prev.end_time);
    const currStart = toMinutes(curr.start_time);
    const gap = currStart - prevEnd;
    if (gap <= 0) continue;

    const currEnd = toMinutes(curr.end_time);
    const next = appointments[i + 1];
    const roomBeforeNext = next ? toMinutes(next.start_time) - currEnd : Infinity;

    const nudge = Math.min(gap, MAX_NUDGE_MINUTES, roomBeforeNext);
    if (nudge <= 0) continue;

    const newStart = toHHMM(currStart + nudge);
    const newEnd = toHHMM(currEnd + nudge);

    await entities.Booking.update(curr.id, { start_time: newStart, end_time: newEnd });
    curr.start_time = newStart;
    curr.end_time = newEnd;
  }
}
