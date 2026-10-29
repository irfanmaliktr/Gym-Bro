import { describe, expect, it } from 'vitest'
import { newId } from '../../lib/id'
import { useTestDatabase } from '../../test/database'
import { SEEDED_EXERCISES } from '../exercises.seed'
import { seedExerciseCatalog } from '../seed'
import {
  countRoutineUsages,
  createExercise,
  deleteExercise,
  type ExerciseInput,
  ExerciseValidationError,
  isReferencedInSessions,
  listExercises,
  sanitiseSecondaryMuscles,
  setExerciseArchived,
  updateExercise,
} from './exercises'
import { createRoutine } from './routines'

const CUSTOM: ExerciseInput = {
  name: 'Reverse Hyper',
  target_muscle: 'back',
  secondary_muscles: ['legs', 'back'],
  equipment: 'machine',
  type: 'weight_reps',
  instructions: '  Hinge at the hips.  ',
}

async function seed(database: ReturnType<typeof useTestDatabase>) {
  await seedExerciseCatalog(database)
}

describe('sanitiseSecondaryMuscles', () => {
  it('drops the primary muscle and de-duplicates, keeping PRD order', () => {
    expect(sanitiseSecondaryMuscles(['legs', 'back', 'legs', 'shoulders'], 'back')).toEqual([
      'legs',
      'shoulders',
    ])
    expect(sanitiseSecondaryMuscles(undefined, 'back')).toEqual([])
  })
})

describe('listExercises', () => {
  it('sorts by muscle group order then name, hiding archived rows by default', async () => {
    const database = useTestDatabase()
    await seed(database)

    const exercises = await listExercises({}, database)
    expect(exercises.length).toBe(SEEDED_EXERCISES.length)

    const muscles = exercises.map((exercise) => exercise.target_muscle)
    const firstBack = muscles.indexOf('back')
    const lastChest = muscles.lastIndexOf('chest')
    expect(lastChest).toBeLessThan(firstBack)

    const chestNames = exercises.filter((e) => e.target_muscle === 'chest').map((e) => e.name)
    expect(chestNames).toEqual([...chestNames].sort((a, b) => a.localeCompare(b)))
  })
})

describe('custom exercises (EXER-002)', () => {
  it('creates a custom exercise with trimmed text', async () => {
    const database = useTestDatabase()
    const id = await createExercise(CUSTOM, database)

    const stored = await database.exercise_catalog.get(id)
    expect(stored).toMatchObject({
      name: 'Reverse Hyper',
      target_muscle: 'back',
      secondary_muscles: ['legs'],
      equipment: 'machine',
      type: 'weight_reps',
      instructions: 'Hinge at the hips.',
      is_custom: true,
      is_archived: false,
    })
  })

  it('rejects a blank name', async () => {
    const database = useTestDatabase()
    await expect(createExercise({ ...CUSTOM, name: '  ' }, database)).rejects.toMatchObject({
      code: 'name-required',
    })
  })

  it('can be edited', async () => {
    const database = useTestDatabase()
    const id = await createExercise(CUSTOM, database)
    await updateExercise(id, { ...CUSTOM, name: 'Reverse Hyper 2', equipment: 'cable' }, database)

    const stored = await database.exercise_catalog.get(id)
    expect(stored).toMatchObject({ name: 'Reverse Hyper 2', equipment: 'cable' })
  })

  it('EXER-003: built-ins refuse to be edited', async () => {
    const database = useTestDatabase()
    await seed(database)
    await expect(updateExercise('ex_bench_press', CUSTOM, database)).rejects.toBeInstanceOf(
      ExerciseValidationError,
    )
    await expect(updateExercise('ex_bench_press', CUSTOM, database)).rejects.toMatchObject({
      code: 'built-in-immutable',
    })
  })
})

describe('archiving exercises', () => {
  it('hides the row from the default list but keeps it available', async () => {
    const database = useTestDatabase()
    await seed(database)
    await setExerciseArchived('ex_bench_press', true, database)

    expect((await listExercises({}, database)).some((e) => e.id === 'ex_bench_press')).toBe(false)
    expect(
      (await listExercises({ includeArchived: true }, database)).some((e) => e.id === 'ex_bench_press'),
    ).toBe(true)
  })
})

describe('deleting exercises (EXER-003)', () => {
  it('refuses to delete a built-in', async () => {
    const database = useTestDatabase()
    await seed(database)
    await expect(deleteExercise('ex_bench_press', database)).rejects.toMatchObject({
      code: 'built-in-immutable',
    })
    expect(await database.exercise_catalog.get('ex_bench_press')).toBeDefined()
  })

  it('deletes an unused custom exercise and cleans up routine links', async () => {
    const database = useTestDatabase()
    const id = await createExercise(CUSTOM, database)
    await createRoutine({ name: 'Posterior', exercises: [{ exercise_id: id }] }, database)
    expect(await countRoutineUsages(id, database)).toBe(1)

    expect(await deleteExercise(id, database)).toBe('deleted')

    expect(await database.exercise_catalog.get(id)).toBeUndefined()
    expect(await countRoutineUsages(id, database)).toBe(0)
  })

  it('archives instead of deleting once a session references it', async () => {
    const database = useTestDatabase()
    const id = await createExercise(CUSTOM, database)

    const sessionId = newId()
    await database.workout_sessions.put({
      id: sessionId,
      source_routine_id: null,
      workout_name_snap: 'Freestyle',
      status: 'in_progress',
      start_timestamp: 1,
      finish_timestamp: null,
    })
    await database.session_exercises.put({
      id: newId(),
      session_id: sessionId,
      exercise_id: id,
      exercise_name_snap: 'Reverse Hyper',
      equipment_snap: 'machine',
      display_order: 0,
    })

    expect(await isReferencedInSessions(id, database)).toBe(true)
    expect(await deleteExercise(id, database)).toBe('archived')

    const stored = await database.exercise_catalog.get(id)
    expect(stored).toBeDefined()
    expect(stored?.is_archived).toBe(true)
  })
})
