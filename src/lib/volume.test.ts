import { describe, expect, it } from 'vitest'
import { countCompletedSets, setVolume, totalVolume, workingVolume } from './volume'

describe('single-set volume (LOG-010)', () => {
  it('multiplies weight by reps for loaded sets', () => {
    expect(setVolume({ weight_kg: 100, reps: 5, is_completed: true })).toBe(500)
    expect(setVolume({ weight_kg: 52.5, reps: 10, is_completed: true })).toBe(525)
  })

  it('ignores sets the user has not completed (LOG-004)', () => {
    expect(setVolume({ weight_kg: 100, reps: 5, is_completed: false })).toBe(0)
    expect(setVolume({ weight_kg: 100, reps: 5 })).toBe(0)
  })

  it('ignores empty or invalid rep counts', () => {
    expect(setVolume({ weight_kg: 100, reps: 0, is_completed: true })).toBe(0)
    expect(setVolume({ weight_kg: 100, reps: null, is_completed: true })).toBe(0)
    expect(setVolume({ weight_kg: 100, is_completed: true })).toBe(0)
  })

  it('never returns negative volume', () => {
    expect(setVolume({ weight_kg: -50, reps: 10, is_completed: true })).toBe(0)
  })
})

describe('bodyweight volume (PROG-004)', () => {
  it('falls back to repetitions when there is no added load', () => {
    expect(setVolume({ weight_kg: 0, reps: 12, is_completed: true }, 'bodyweight_reps')).toBe(12)
    expect(setVolume({ reps: 12, is_completed: true }, 'bodyweight_reps')).toBe(12)
  })

  it('uses the added load delta when weight is attached', () => {
    expect(setVolume({ weight_kg: 10, reps: 8, is_completed: true }, 'bodyweight_reps')).toBe(80)
  })

  it('keeps weight-based maths for loaded and assisted movements', () => {
    expect(setVolume({ weight_kg: 50, reps: 10, is_completed: true }, 'assisted_weight')).toBe(500)
    expect(setVolume({ weight_kg: 0, reps: 10, is_completed: true }, 'weight_reps')).toBe(0)
  })
})

describe('volume aggregation', () => {
  const sets = [
    { weight_kg: 100, reps: 5, is_completed: true, set_type: 'normal' as const },
    { weight_kg: 60, reps: 10, is_completed: true, set_type: 'warmup' as const },
    { weight_kg: 100, reps: 6, is_completed: false, set_type: 'normal' as const },
  ]

  it('sums every completed set by default (LOG-010 "total volume")', () => {
    expect(totalVolume(sets)).toBe(1100)
  })

  it('excludes warmups for the Progress working-volume series (PROG-003)', () => {
    expect(workingVolume(sets)).toBe(500)
    expect(totalVolume(sets, 'weight_reps', { includeWarmups: false })).toBe(500)
  })

  it('counts completed sets for the history card (HIST-002)', () => {
    expect(countCompletedSets(sets)).toBe(2)
    expect(countCompletedSets([])).toBe(0)
  })
})
