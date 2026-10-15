// Calendar dates as "YYYY-MM-DD" keys. Days are always the *viewer's* local day (sent from
// the browser), stored in Postgres DATE columns, so "worn today" means today where the user is.

export type DateKey = string;

const MS_PER_DAY = 86_400_000;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

// DATE columns come back from Prisma as UTC midnight.
export function dbDateToKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function keyToDbDate(key: DateKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(key: DateKey, days: number): DateKey {
  return dbDateToKey(new Date(keyToDbDate(key).getTime() + days * MS_PER_DAY));
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((keyToDbDate(to).getTime() - keyToDbDate(from).getTime()) / MS_PER_DAY);
}

// "today", "yesterday", "5 days ago", or a short date for anything older than two weeks.
export function formatLastWorn(key: DateKey, today: DateKey = todayKey()): string {
  const days = daysBetween(key, today);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return keyToDbDate(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
