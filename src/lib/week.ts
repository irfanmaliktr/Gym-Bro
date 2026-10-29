/**
 * Calendar helpers shared by the Home dashboard (weekly consistency) and the
 * routine editor (target weekdays, ROUTINE-006).
 *
 * Everything is *local time*: a workout logged at 23:30 belongs to that day, and
 * `Date.toISOString()` would shift it into the next UTC day. Hence `isoDateKey`
 * builds the key from local parts.
 */

/** 1 = Monday … 7 = Sunday (ISO-8601, matching `assigned_days` in §8.2). */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const ISO_WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]

export function isoWeekday(date: Date): IsoWeekday {
  return (((date.getDay() + 6) % 7) + 1) as IsoWeekday
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Midnight at the start of `date`'s local day. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Monday 00:00 of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const start = startOfDay(date)
  start.setDate(start.getDate() - (isoWeekday(date) - 1))
  return start
}

/** Local day key, e.g. `"2026-10-20"`. */
export function isoDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The seven dates (Mon → Sun) of `date`'s ISO week. */
export function isoWeekDates(date: Date = new Date()): Date[] {
  const monday = startOfIsoWeek(date)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return day
  })
}

function dateForWeekday(locale: string, isoDay: IsoWeekday, now: Date, style: 'narrow' | 'short'): string {
  const monday = startOfIsoWeek(now)
  const date = new Date(monday)
  date.setDate(monday.getDate() + (isoDay - 1))
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(date)
}

/** Single-letter weekday label for the editor's day chips (e.g. `M`, `S`). */
export function weekdayNarrowLabel(locale: string, isoDay: IsoWeekday, now: Date = new Date()): string {
  return dateForWeekday(locale, isoDay, now, 'narrow')
}

/** Short weekday label for routine cards (e.g. `Mon`, `Thu`). */
export function weekdayShortLabel(locale: string, isoDay: IsoWeekday, now: Date = new Date()): string {
  return dateForWeekday(locale, isoDay, now, 'short')
}

/** Localized long date for the Home greeting (e.g. `Tuesday, Oct 20`). */
export function formatLongDate(locale: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/** Localized short date (e.g. `Oct 16`) used by history/milestone footers. */
export function formatShortDate(locale: string, date: Date): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
}

/**
 * Consecutive training days ending today (the Home streak badge).
 *
 * A day counts when it holds at least one completed session. Two semantics are
 * deliberate:
 *  - today is *optional*: an empty today does not reset the streak until the day
 *    is over, so the badge does not drop to zero every morning before training;
 *  - rest days break the streak, matching the "consecutive training days" wording
 *    the badge uses (`{days}d`).
 *
 * Returns 0 when neither today nor yesterday was trained.
 */
export function countDayStreak(completedDays: ReadonlySet<string>, now: Date = new Date()): number {
  const cursor = startOfDay(now)
  if (!completedDays.has(isoDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (completedDays.has(isoDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export type DayStatus = 'done' | 'today' | 'rest'

export interface WeekSlot {
  /** Stable React key + the day the slot represents. */
  iso: string
  /** Single-letter localized weekday label. */
  label: string
  status: DayStatus
  /** Local midnight of the slot, for date formatting. */
  date: Date
}

/**
 * Builds the Monday→Sunday strip for the Weekly Consistency card.
 *
 * @param completedDays local day keys (`isoDateKey`) that hold at least one
 *        completed workout session — real data, never assumed.
 */
export function buildWeekStrip(
  locale: string,
  completedDays: ReadonlySet<string>,
  now: Date = new Date(),
): WeekSlot[] {
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  return isoWeekDates(now).map((date) => {
    const isToday = isSameDay(date, now)
    const status: DayStatus = isToday
      ? 'today'
      : completedDays.has(isoDateKey(date))
        ? 'done'
        : 'rest'
    return { iso: isoDateKey(date), label: narrow.format(date), status, date }
  })
}
