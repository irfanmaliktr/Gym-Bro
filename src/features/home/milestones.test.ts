import { describe, expect, it } from 'vitest'
import type { ExerciseCatalogItem, SessionExercise, SetLog, WorkoutSession } from '../../db'
import { deriveMilestones } from './milestones'

function exercise(id: string, type: ExerciseCatalogItem['type']): [string, ExerciseCatalogItem] {
  return [
    id,
    {
      id,
      name: `Exercise ${id}`,
      target_muscle: 'chest',
      secondary_muscles: [],
      equipment: 'barbell',
      type,
      instructions: '',
      is_custom: false,
      is_archived: false,
    },
  ]
}

const catalog = new Map<string, ExerciseCatalogItem>([exercise('ex_a', 'weight_reps'), exercise('ex_b', 'bodyweight_reps')])

function session(id: string, start: number, status: WorkoutSession['status'] = 'completed'): WorkoutSession {
  return {
    id,
    source_routine_id: null,
    workout_name_snap: `Session ${id}`,
    status,
    start_timestamp: start,
    finish_timestamp: status === 'completed' ? start + 3_600_000 : null,
  }
}

function link(id: string, sessionId: string, exerciseId: string): SessionExercise {
  return {
    id,
    session_id: sessionId,
    exercise_id: exerciseId,
    exercise_name_snap: exerciseId === 'ex_a' ? 'Barbell Bench Press' : 'Pull Up',
    equipment_snap: 'barbell',
    display_order: 0,
  }
}

function log(id: string, linkId: string, setNumber: number, weightKg: number, reps: number): SetLog {
  return {
    id,
    session_exercise_id: linkId,
    set_number: setNumber,
    set_type: 'normal',
    weight_kg: weightKg,
    reps,
    is_completed: true,
  }
}

describe('deriveMilestones', () => {
  it('returns nothing without completed history', () => {
    expect(deriveMilestones([], [], [], catalog)).toEqual([])
    expect(deriveMilestones([session('s1', 1, 'in_progress')], [link('l1', 's1', 'ex_a')], [], catalog)).toEqual([])
  })

  it('reports the achievements a set actually beats, newest first', () => {
    const sessions = [session('s1', 1_000), session('s2', 2_000_000)]
    const links = [link('l1', 's1', 'ex_a'), link('l2', 's2', 'ex_a')]
    const logs = [
      log('g1', 'l1', 1, 80, 8), // max weight 80, E1RM 101.33, volume 640
      log('g2', 'l2', 1, 85, 5), // beats max weight only
    ]

    const milestones = deriveMilestones(sessions, links, logs, catalog)

    expect(milestones).toHaveLength(3)
    expect(milestones[0]).toMatchObject({
      kind: 'maxWeight',
      exerciseName: 'Barbell Bench Press',
      value: 85,
      previous: 80,
      weightKg: 85,
      reps: 5,
      routineName: 'Session s2',
    })
    expect(milestones[0].achievedAt).toBe(2_000_000 + 3_600_000)

    // Same session = same timestamp, so the sort is stable and the three
    // achievements of the older session keep the evaluation order.
    const kinds = milestones.map((milestone) => milestone.kind)
    expect(kinds).toEqual(['maxWeight', 'maxVolumeSet', 'e1rm'])
    expect(milestones[1]).toMatchObject({ kind: 'maxVolumeSet', value: 640, previous: 0 })
    expect(milestones[2]).toMatchObject({ kind: 'e1rm', value: 101.33, previous: 0 })
  })

  it('keeps only the newest achievement per exercise and category', () => {
    const sessions = [session('s1', 1_000), session('s2', 2_000_000), session('s3', 3_000_000)]
    const links = [link('l1', 's1', 'ex_a'), link('l2', 's2', 'ex_a'), link('l3', 's3', 'ex_a')]
    const logs = [
      log('g1', 'l1', 1, 60, 5),
      log('g2', 'l2', 1, 70, 5),
      log('g3', 'l3', 1, 75, 5),
    ]

    const milestones = deriveMilestones(sessions, links, logs, catalog)

    const maxWeights = milestones.filter((milestone) => milestone.kind === 'maxWeight')
    expect(maxWeights).toHaveLength(1)
    expect(maxWeights[0].value).toBe(75)
  })

  it('never invents a weight record for an unloaded bodyweight set (PROG-004)', () => {
    const sessions = [session('s1', 1_000)]
    const links = [link('l1', 's1', 'ex_b')]
    const logs = [log('g1', 'l1', 1, 0, 12)]

    const milestones = deriveMilestones(sessions, links, logs, catalog)

    expect(milestones).toHaveLength(1)
    expect(milestones[0]).toMatchObject({ kind: 'maxVolumeSet', value: 12, weightKg: 0, reps: 12 })
  })

  it('honours the limit and ignores incomplete sets', () => {
    const sessions = [session('s1', 1_000)]
    const links = [link('l1', 's1', 'ex_a')]
    const logs = [
      log('g1', 'l1', 1, 60, 5),
      { ...log('g2', 'l1', 2, 200, 1), is_completed: false },
    ]

    const milestones = deriveMilestones(sessions, links, logs, catalog, 1)
    expect(milestones).toHaveLength(1)
    expect(milestones[0].value).toBe(60)
  })
})
