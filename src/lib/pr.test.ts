import { describe, expect, it } from 'vitest'
import { buildPrState, EMPTY_PR_STATE, epley1Rm, evaluateSetPrs, evaluateSetsPrs, mergeSetIntoPrState, type PrAchievement, type PrSetInput } from './pr'

const set = (weight_kg: number, reps: number, extra: Partial<PrSetInput> = {}): PrSetInput => ({
  weight_kg,
  reps,
  is_completed: true,
  ...extra,
})

const kinds = (achievements: PrAchievement[]) => achievements.map((item) => item.kind)

describe('Epley estimated 1RM (PROG-001)', () => {
  it('applies E1RM = w × (1 + r / 30)', () => {
    expect(epley1Rm(100, 10)).toBe(133.33)
    expect(epley1Rm(100, 1)).toBe(103.33)
    expect(epley1Rm(100, 30)).toBe(200)
    expect(epley1Rm(60, 15)).toBe(90)
  })

  it('returns 0 for unloaded or empty sets so bodyweight work never sets a 1RM', () => {
    expect(epley1Rm(0, 10)).toBe(0)
    expect(epley1Rm(100, 0)).toBe(0)
    expect(epley1Rm(-5, 10)).toBe(0)
    expect(epley1Rm(Number.NaN, 10)).toBe(0)
  })
})

describe('evaluateSetPrs against previous performance', () => {
  it('reports every category for a first-ever set (nothing to beat yet)', () => {
    const achievements = evaluateSetPrs(set(100, 5), EMPTY_PR_STATE)
    expect(kinds(achievements)).toEqual(['max_weight', 'max_volume_set', 'e1rm'])
    expect(achievements.every((item) => item.previous === 0)).toBe(true)
    expect(achievements[0]).toMatchObject({ value: 100, weightKg: 100, reps: 5 })
    expect(achievements[1].value).toBe(500)
    expect(achievements[2].value).toBe(116.67)
  })

  it('badges a heavier top set', () => {
    const state = buildPrState([set(100, 5)])
    const achievements = evaluateSetPrs(set(102.5, 5), state)
    expect(kinds(achievements)).toEqual(['max_weight', 'max_volume_set', 'e1rm'])
    expect(achievements[0]).toMatchObject({ value: 102.5, previous: 100 })
    expect(achievements[2].value).toBe(119.58)
  })

  it('badges more reps at the same weight, with the previous count', () => {
    const state = buildPrState([set(100, 5)])
    const achievements = evaluateSetPrs(set(100, 6), state)
    expect(kinds(achievements)).toEqual(['max_reps', 'max_volume_set', 'e1rm'])
    expect(achievements[0]).toMatchObject({ kind: 'max_reps', value: 6, previous: 5, weightKg: 100 })
  })

  it('reports nothing for a set that only matches the records', () => {
    const state = buildPrState([set(100, 5)])
    expect(evaluateSetPrs(set(100, 5), state)).toEqual([])
    expect(evaluateSetPrs(set(90, 4), state)).toEqual([])
  })

  it('still rewards volume and 1RM progress from a lighter, higher-rep set', () => {
    const state = buildPrState([set(100, 5)])
    const achievements = evaluateSetPrs(set(90, 10), state)
    expect(kinds(achievements)).toEqual(['max_volume_set', 'e1rm'])
    expect(achievements[1].value).toBe(120)
  })

  it('ignores sets that were not completed (LOG-004)', () => {
    expect(evaluateSetPrs(set(120, 5, { is_completed: false }), EMPTY_PR_STATE)).toEqual([])
    expect(evaluateSetPrs(set(120, 0), EMPTY_PR_STATE)).toEqual([])
  })

  it('applies PROG-001 literally to warmup sets (the caller decides to filter)', () => {
    const achievements = evaluateSetPrs(set(100, 5, { set_type: 'warmup' }), EMPTY_PR_STATE)
    expect(kinds(achievements)).toEqual(['max_weight', 'max_volume_set', 'e1rm'])
  })
})

describe('max reps records are keyed by weight (PROG-001)', () => {
  it('tracks a separate rep record for each weight', () => {
    const state = buildPrState([set(100, 8), set(90, 10)])
    expect(state.maxRepsByWeight).toEqual({ '100': 8, '90': 10 })
    expect(evaluateSetPrs(set(90, 11), state)).toEqual([
      { kind: 'max_reps', value: 11, previous: 10, weightKg: 90, reps: 11 },
      { kind: 'max_volume_set', value: 990, previous: 900, weightKg: 90, reps: 11 },
    ])
    expect(kinds(evaluateSetPrs(set(100, 9), state))).toEqual(['max_reps', 'e1rm'])
  })

  it('records the baseline at a new weight without badging it', () => {
    const state = mergeSetIntoPrState(EMPTY_PR_STATE, set(102.5, 3))
    expect(state.maxRepsByWeight).toEqual({ '102.5': 3 })
    expect(kinds(evaluateSetPrs(set(102.5, 3), state))).toEqual([])
    expect(kinds(evaluateSetPrs(set(102.5, 4), state))).toEqual(['max_reps', 'max_volume_set', 'e1rm'])
  })
})

describe('bodyweight records (PROG-004)', () => {
  it('uses rep-count volume and skips the 1RM category', () => {
    const achievements = evaluateSetPrs(set(0, 20), EMPTY_PR_STATE, 'bodyweight_reps')
    expect(achievements).toEqual([
      { kind: 'max_volume_set', value: 20, previous: 0, weightKg: 0, reps: 20 },
    ])

    const state = mergeSetIntoPrState(EMPTY_PR_STATE, set(0, 20), 'bodyweight_reps')
    expect(evaluateSetPrs(set(0, 25), state, 'bodyweight_reps')).toEqual([
      { kind: 'max_reps', value: 25, previous: 20, weightKg: 0, reps: 25 },
      { kind: 'max_volume_set', value: 25, previous: 20, weightKg: 0, reps: 25 },
    ])
  })
})

describe('buildPrState', () => {
  it('folds history regardless of the order sets were logged in', () => {
    const chronological = buildPrState([set(100, 5), set(102.5, 3)])
    expect(chronological).toEqual({
      maxWeight: 102.5,
      maxRepsByWeight: { '100': 5, '102.5': 3 },
      maxVolumeSet: 500,
      e1rm: 116.67,
    })
    expect(buildPrState([set(102.5, 3), set(100, 5)])).toEqual(chronological)
  })

  it('accepts an existing state so history can be appended to', () => {
    const state = buildPrState([set(105, 5)], 'weight_reps', buildPrState([set(100, 5)]))
    expect(state.maxWeight).toBe(105)
    expect(state.e1rm).toBe(122.5)
  })

  it('does not mutate the state it is given', () => {
    const state = buildPrState([set(100, 5)])
    const snapshot = structuredClone(state)
    mergeSetIntoPrState(state, set(110, 5))
    evaluateSetPrs(set(110, 5), state)
    expect(state).toEqual(snapshot)
  })
})

describe('evaluateSetsPrs (LOG-010 session evaluation)', () => {
  it('reports each record once, in the order the sets beat them', () => {
    const { achievements, state } = evaluateSetsPrs([set(100, 5), set(100, 6), set(100, 5)])
    expect(kinds(achievements)).toEqual([
      'max_weight',
      'max_volume_set',
      'e1rm',
      'max_reps',
      'max_volume_set',
      'e1rm',
    ])
    expect(state).toMatchObject({ maxWeight: 100, maxVolumeSet: 600, e1rm: 120 })
    expect(state.maxRepsByWeight).toEqual({ '100': 6 })
  })

  it('continues from a caller-supplied baseline', () => {
    const baseline = buildPrState([set(100, 5)])
    const { achievements } = evaluateSetsPrs([set(100, 5)], baseline)
    expect(achievements).toEqual([])
  })

  it('returns the unchanged baseline for an empty session', () => {
    const baseline = buildPrState([set(100, 5)])
    expect(evaluateSetsPrs([], baseline)).toEqual({ achievements: [], state: baseline })
  })
})
