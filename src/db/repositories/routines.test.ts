import { describe, expect, it } from 'vitest'
import { newId } from '../../lib/id'
import { useTestDatabase } from '../../test/database'
import { countRoutineUsages } from './exercises'
import {
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  getRoutineBundle,
  isRoutineNameTaken,
  listRoutineBundles,
  normaliseRoutineName,
  RoutineValidationError,
  sanitiseAssignedDays,
  setRoutineArchived,
  updateRoutine,
} from './routines'

describe('sanitiseAssignedDays', () => {
  it('drops invalid days, de-duplicates and sorts ascending', () => {
    expect(sanitiseAssignedDays([4, 1, 1, 9, 0, -2, 3.5])).toEqual([1, 4])
  })

  it('returns an empty array for missing days', () => {
    expect(sanitiseAssignedDays(undefined)).toEqual([])
  })
})

describe('normaliseRoutineName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normaliseRoutineName('  Push   Day  ')).toBe('Push Day')
  })
})

describe('createRoutine', () => {
  it('stores targets, fills defaults and orders exercises by insertion', async () => {
    const database = useTestDatabase()

    const id = await createRoutine(
      {
        name: 'Push Day',
        description: '  Chest focus  ',
        assigned_days: [4, 1, 1, 9],
        exercises: [
          {
            exercise_id: 'ex_bench_press',
            target_sets: 4,
            target_reps_min: 5,
            target_reps_max: 8,
            target_weight_kg: 80,
            rest_seconds: 120,
          },
          { exercise_id: 'ex_overhead_press' },
        ],
      },
      database,
    )

    const bundle = await getRoutineBundle(id, database)
    expect(bundle).not.toBeNull()
    expect(bundle?.routine).toMatchObject({
      name: 'Push Day',
      description: 'Chest focus',
      assigned_days: [1, 4],
      is_archived: false,
    })
    expect(bundle?.routine.created_at).toBe(bundle?.routine.updated_at)

    expect(bundle?.exercises.map((link) => link.exercise_id)).toEqual([
      'ex_bench_press',
      'ex_overhead_press',
    ])
    expect(bundle?.exercises.map((link) => link.display_order)).toEqual([0, 1])
    expect(bundle?.exercises[0]).toMatchObject({
      routine_id: id,
      target_sets: 4,
      target_reps_min: 5,
      target_reps_max: 8,
      target_weight_kg: 80,
      rest_seconds: 120,
    })
    expect(bundle?.exercises[1]).toMatchObject({ target_sets: 3, target_reps_min: 8, target_reps_max: 12 })
    expect(bundle?.exercises[1].target_weight_kg).toBeUndefined()
    expect(bundle?.exercises[1].rest_seconds).toBeUndefined()
  })

  it('clamps nonsense targets instead of storing them', async () => {
    const database = useTestDatabase()
    const id = await createRoutine(
      {
        name: 'Odd Day',
        exercises: [
          {
            exercise_id: 'ex_squat',
            target_sets: -5,
            target_reps_min: 20,
            target_reps_max: 5, // max below min → lifted up to min
            target_weight_kg: 0, // 0 means "no target"
            rest_seconds: 90.4,
          },
        ],
      },
      database,
    )

    const bundle = await getRoutineBundle(id, database)
    const link = bundle?.exercises[0]
    expect(link).toMatchObject({ target_sets: 1, target_reps_min: 20, target_reps_max: 20, rest_seconds: 90 })
    expect(link?.target_weight_kg).toBeUndefined()
  })

  it('creates a routine without exercises or days', async () => {
    const database = useTestDatabase()
    const id = await createRoutine({ name: 'Empty Day' }, database)
    const bundle = await getRoutineBundle(id, database)
    expect(bundle?.exercises).toEqual([])
    expect(bundle?.routine.assigned_days).toEqual([])
  })

  it('rejects a blank name (ROUTINE-001)', async () => {
    const database = useTestDatabase()
    await expect(createRoutine({ name: '   ' }, database)).rejects.toBeInstanceOf(RoutineValidationError)
    await expect(createRoutine({ name: '   ' }, database)).rejects.toMatchObject({ code: 'name-required' })
  })

  it('rejects a duplicate title, ignoring case and padding (ROUTINE-001)', async () => {
    const database = useTestDatabase()
    await createRoutine({ name: 'Leg Day' }, database)

    expect(await isRoutineNameTaken('  leg day ', undefined, database)).toBe(true)
    await expect(createRoutine({ name: 'LEG DAY' }, database)).rejects.toMatchObject({ code: 'name-taken' })
  })
})

describe('updateRoutine', () => {
  it('rewrites name, days and links while preserving created_at', async () => {
    const database = useTestDatabase()
    const id = await createRoutine(
      { name: 'Push Day', assigned_days: [1], exercises: [{ exercise_id: 'ex_bench_press' }] },
      database,
    )
    const before = await getRoutineBundle(id, database)

    await updateRoutine(
      id,
      {
        name: 'Push Day A',
        assigned_days: [1, 4],
        exercises: [
          { exercise_id: 'ex_overhead_press', target_sets: 5 },
          { exercise_id: 'ex_dip', target_sets: 2 },
        ],
      },
      database,
    )

    const after = await getRoutineBundle(id, database)
    expect(after?.routine.name).toBe('Push Day A')
    expect(after?.routine.assigned_days).toEqual([1, 4])
    expect(after?.routine.created_at).toBe(before?.routine.created_at)
    expect(after?.routine.updated_at).toBeGreaterThanOrEqual(before?.routine.updated_at ?? 0)
    expect(after?.exercises.map((link) => link.exercise_id)).toEqual(['ex_overhead_press', 'ex_dip'])
    expect(after?.exercises.map((link) => link.display_order)).toEqual([0, 1])
  })

  it('clears a description that was emptied', async () => {
    const database = useTestDatabase()
    const id = await createRoutine({ name: 'Pull Day', description: 'Back' }, database)
    await updateRoutine(id, { name: 'Pull Day', description: '   ' }, database)
    const bundle = await getRoutineBundle(id, database)
    expect(bundle?.routine.description).toBeUndefined()
  })

  it('allows keeping its own name but not taking another routine’s', async () => {
    const database = useTestDatabase()
    const first = await createRoutine({ name: 'Day A' }, database)
    await createRoutine({ name: 'Day B' }, database)

    await expect(updateRoutine(first, { name: 'day a' }, database)).resolves.toBeUndefined()
    await expect(updateRoutine(first, { name: 'Day B' }, database)).rejects.toMatchObject({ code: 'name-taken' })
  })

  it('keeps the archived flag intact', async () => {
    const database = useTestDatabase()
    const id = await createRoutine({ name: 'Rest Day' }, database)
    await setRoutineArchived(id, true, database)
    await updateRoutine(id, { name: 'Rest Day', exercises: [{ exercise_id: 'ex_plank' }] }, database)
    const bundle = await getRoutineBundle(id, database)
    expect(bundle?.routine.is_archived).toBe(true)
  })
})

describe('archiving (ROUTINE-005)', () => {
  it('hides the routine from the active list but keeps it restorable', async () => {
    const database = useTestDatabase()
    const id = await createRoutine({ name: 'Push Day', exercises: [{ exercise_id: 'ex_bench_press' }] }, database)

    await setRoutineArchived(id, true, database)
    expect(await listRoutineBundles({}, database)).toHaveLength(0)

    const withArchived = await listRoutineBundles({ includeArchived: true }, database)
    expect(withArchived).toHaveLength(1)
    expect(withArchived[0].routine.is_archived).toBe(true)
    expect(withArchived[0].exercises).toHaveLength(1)

    await setRoutineArchived(id, false, database)
    expect(await listRoutineBundles({}, database)).toHaveLength(1)
  })

  it('does not bump updated_at, so a restored routine keeps its place', async () => {
    const database = useTestDatabase()
    const id = await createRoutine({ name: 'Push Day' }, database)
    const before = await getRoutineBundle(id, database)

    await setRoutineArchived(id, true, database)
    await setRoutineArchived(id, false, database)

    const after = await getRoutineBundle(id, database)
    expect(after?.routine.updated_at).toBe(before?.routine.updated_at)
  })
})

describe('deleteRoutine', () => {
  it('removes the routine and its links', async () => {
    const database = useTestDatabase()
    const id = await createRoutine({ name: 'Push Day', exercises: [{ exercise_id: 'ex_bench_press' }] }, database)

    await deleteRoutine(id, database)

    expect(await database.user_routines.count()).toBe(0)
    expect(await database.routine_exercises.count()).toBe(0)
  })

  it('ROUTINE-007: never touches completed workout sessions', async () => {
    const database = useTestDatabase()
    const routineId = await createRoutine(
      { name: 'Pull Day', exercises: [{ exercise_id: 'ex_pull_up' }] },
      database,
    )

    const sessionId = newId()
    const sessionExerciseId = newId()
    await database.workout_sessions.put({
      id: sessionId,
      source_routine_id: routineId,
      workout_name_snap: 'Pull Day',
      status: 'completed',
      start_timestamp: 1,
      finish_timestamp: 2,
    })
    await database.session_exercises.put({
      id: sessionExerciseId,
      session_id: sessionId,
      exercise_id: 'ex_pull_up',
      exercise_name_snap: 'Pull Up',
      equipment_snap: 'bodyweight',
      display_order: 0,
    })
    await database.set_logs.put({
      id: newId(),
      session_exercise_id: sessionExerciseId,
      set_number: 1,
      set_type: 'normal',
      weight_kg: 0,
      reps: 10,
      is_completed: true,
    })

    await deleteRoutine(routineId, database)

    expect(await database.workout_sessions.get(sessionId)).toMatchObject({
      workout_name_snap: 'Pull Day',
      source_routine_id: routineId,
      status: 'completed',
    })
    expect(await database.session_exercises.get(sessionExerciseId)).toBeDefined()
    expect(await database.set_logs.count()).toBe(1)
  })
})

describe('duplicateRoutine (ROUTINE-004)', () => {
  it('copies the template under a fresh id and a free title', async () => {
    const database = useTestDatabase()
    const source = await createRoutine(
      {
        name: 'Push Day',
        description: 'Chest',
        assigned_days: [1, 4],
        exercises: [
          { exercise_id: 'ex_bench_press', target_sets: 4 },
          { exercise_id: 'ex_overhead_press', target_sets: 3 },
        ],
      },
      database,
    )

    const copyId = await duplicateRoutine(source, {}, database)
    expect(copyId).not.toBeNull()
    expect(copyId).not.toBe(source)

    const copy = await getRoutineBundle(copyId as string, database)
    expect(copy?.routine.name).toBe('Push Day (copy)')
    expect(copy?.routine.description).toBe('Chest')
    expect(copy?.routine.assigned_days).toEqual([1, 4])
    expect(copy?.routine.is_archived).toBe(false)
    expect(copy?.exercises.map((link) => link.exercise_id)).toEqual(['ex_bench_press', 'ex_overhead_press'])
    expect(copy?.exercises.map((link) => link.target_sets)).toEqual([4, 3])

    // Fresh link ids so editing the copy cannot leak into the original.
    const original = await getRoutineBundle(source, database)
    expect(copy?.exercises.map((link) => link.id)).not.toEqual(original?.exercises.map((link) => link.id))
    expect(original?.routine.name).toBe('Push Day')
  })

  it('counts up when the default copy title is taken, and localizes the label', async () => {
    const database = useTestDatabase()
    const source = await createRoutine({ name: 'Leg Day' }, database)

    const first = (await duplicateRoutine(source, { copyLabel: 'salinan' }, database)) as string
    const second = (await duplicateRoutine(source, { copyLabel: 'salinan' }, database)) as string

    expect((await getRoutineBundle(first, database))?.routine.name).toBe('Leg Day (salinan)')
    expect((await getRoutineBundle(second, database))?.routine.name).toBe('Leg Day (salinan 2)')
  })

  it('returns null for an unknown routine', async () => {
    const database = useTestDatabase()
    expect(await duplicateRoutine('missing', {}, database)).toBeNull()
  })
})

describe('listRoutineBundles', () => {
  it('orders by most recently edited first and pairs links with their routine', async () => {
    const database = useTestDatabase()
    const older = await createRoutine({ name: 'Older', exercises: [{ exercise_id: 'ex_squat' }] }, database)
    const newer = await createRoutine({ name: 'Newer' }, database)

    await database.user_routines.update(older, { updated_at: 1000 })
    await database.user_routines.update(newer, { updated_at: 2000 })

    const bundles = await listRoutineBundles({}, database)
    expect(bundles.map((bundle) => bundle.routine.name)).toEqual(['Newer', 'Older'])
    expect(bundles[1].exercises.map((link) => link.exercise_id)).toEqual(['ex_squat'])
  })
})

describe('deleting an exercise that a routine uses', () => {
  it('is counted so the UI can warn before removing it from routines', async () => {
    const database = useTestDatabase()
    await createRoutine({ name: 'A', exercises: [{ exercise_id: 'ex_squat' }] }, database)
    const other = await createRoutine({ name: 'B', exercises: [{ exercise_id: 'ex_squat' }] }, database)
    expect(await countRoutineUsages('ex_squat', database)).toBe(2)
    await deleteRoutine(other, database)
    expect(await countRoutineUsages('ex_squat', database)).toBe(1)
  })
})
