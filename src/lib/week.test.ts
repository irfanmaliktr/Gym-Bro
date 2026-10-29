import { describe, expect, it } from 'vitest'
import {
  buildWeekStrip,
  countDayStreak,
  formatLongDate,
  formatShortDate,
  isoDateKey,
  isoWeekDates,
  isoWeekday,
  isSameDay,
  startOfDay,
  startOfIsoWeek,
  weekdayNarrowLabel,
  weekdayShortLabel,
} from './week'

// 2026-10-20 is a Tuesday; 2026-10-19 is the Monday of that ISO week.
const TUESDAY = new Date(2026, 9, 20, 15, 30)
const MONDAY = new Date(2026, 9, 19, 6, 0)
const SUNDAY = new Date(2026, 9, 25, 23, 59)

describe('isoWeekday', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(isoWeekday(MONDAY)).toBe(1)
    expect(isoWeekday(TUESDAY)).toBe(2)
    expect(isoWeekday(SUNDAY)).toBe(7)
  })
})

describe('startOfDay / isSameDay', () => {
  it('zeroes the clock and compares local days', () => {
    expect(startOfDay(TUESDAY).getHours()).toBe(0)
    expect(isSameDay(TUESDAY, new Date(2026, 9, 20, 0, 1))).toBe(true)
    expect(isSameDay(TUESDAY, MONDAY)).toBe(false)
  })
})

describe('startOfIsoWeek', () => {
  it('returns Monday 00:00 of the containing week', () => {
    const start = startOfIsoWeek(TUESDAY)
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(19)
    expect(start.getHours()).toBe(0)
  })

  it('treats Sunday as the end of the week that started on Monday', () => {
    expect(startOfIsoWeek(SUNDAY).getDate()).toBe(19)
  })
})

describe('isoDateKey', () => {
  it('uses local calendar parts, not UTC', () => {
    expect(isoDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(isoDateKey(new Date(2026, 11, 31, 0, 5))).toBe('2026-12-31')
  })
})

describe('isoWeekDates', () => {
  it('lists seven consecutive days from Monday to Sunday', () => {
    const dates = isoWeekDates(TUESDAY)
    expect(dates).toHaveLength(7)
    expect(dates.map(isoDateKey)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })
})

describe('weekday labels', () => {
  it('localizes narrow and short weekday names', () => {
    expect(weekdayNarrowLabel('en-US', 1, TUESDAY)).toBe('M')
    expect(weekdayShortLabel('en-US', 4, TUESDAY)).toBe('Thu')
    expect(weekdayNarrowLabel('id-ID', 3, TUESDAY)).toBe('R') // Rabu
    expect(weekdayShortLabel('id-ID', 3, TUESDAY)).toBe('Rab')
  })
})

describe('date formatting', () => {
  it('formats long and short dates per locale', () => {
    expect(formatLongDate('en-US', TUESDAY)).toBe('Tuesday, Oct 20')
    expect(formatShortDate('en-US', TUESDAY)).toBe('Oct 20')
    expect(formatShortDate('id-ID', TUESDAY)).toBe('20 Okt')
  })
})

describe('buildWeekStrip', () => {
  it('marks completed, today and rest days from real data', () => {
    const completed = new Set(['2026-10-19', '2026-10-23'])
    const strip = buildWeekStrip('en-US', completed, TUESDAY)

    expect(strip).toHaveLength(7)
    expect(strip.map((slot) => slot.status)).toEqual([
      'done', // Mon — completed workout
      'today', // Tue — today wins over "rest"
      'rest',
      'rest',
      'done', // Fri — completed workout
      'rest',
      'rest',
    ])
    expect(strip[0].iso).toBe('2026-10-19')
    expect(strip[6].iso).toBe('2026-10-25')
  })

  it('ignores completion keys outside the current week', () => {
    const strip = buildWeekStrip('en-US', new Set(['2020-01-01']), TUESDAY)
    expect(strip.every((slot) => slot.status !== 'done')).toBe(true)
  })
})

describe('countDayStreak', () => {
  it('counts consecutive days up to and including today', () => {
    const completed = new Set(['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-16'])
    expect(countDayStreak(completed, TUESDAY)).toBe(3)
  })

  it('keeps yesterday’s streak alive while today is still untrained', () => {
    const completed = new Set(['2026-10-19', '2026-10-18'])
    expect(countDayStreak(completed, TUESDAY)).toBe(2)
  })

  it('is zero when neither today nor yesterday was trained', () => {
    expect(countDayStreak(new Set(['2026-10-17']), TUESDAY)).toBe(0)
    expect(countDayStreak(new Set(), TUESDAY)).toBe(0)
  })

  it('counts a single training day as 1', () => {
    expect(countDayStreak(new Set(['2026-10-20']), TUESDAY)).toBe(1)
  })
})
