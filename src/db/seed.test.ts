import { describe, expect, it } from 'vitest'
import { useTestDatabase } from '../test/database'
import { SEEDED_EXERCISES } from './exercises.seed'
import { seedExerciseCatalog } from './seed'

const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'weighted_bodyweight']
const TYPES = ['weight_reps', 'bodyweight_reps', 'assisted_weight']
const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

describe('built-in exercise catalog (EXER-001)', () => {
  it('ships at least 30 standard exercises', () => {
    expect(SEEDED_EXERCISES.length).toBeGreaterThanOrEqual(30)
  })

  it('uses stable, unique ids', () => {
    const ids = SEEDED_EXERCISES.map((exercise) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^ex_[a-z0-9_]+$/.test(id))).toBe(true)
  })

  it('covers every major muscle group generically (Chest, Back, Legs, Shoulders, Arms, Core)', () => {
    const targets = new Set(SEEDED_EXERCISES.map((exercise) => exercise.target_muscle))
    expect([...targets].sort()).toEqual([...MUSCLES].sort())
  })

  it('only uses values the PRD allows', () => {
    for (const exercise of SEEDED_EXERCISES) {
      expect(EQUIPMENT).toContain(exercise.equipment)
      expect(TYPES).toContain(exercise.type)
      expect(MUSCLES).toContain(exercise.target_muscle)
      for (const muscle of exercise.secondary_muscles) expect(MUSCLES).toContain(muscle)
      expect(exercise.instructions.length).toBeGreaterThan(10)
      expect(exercise.name.length).toBeGreaterThan(2)
    }
  })

  it('flags every entry as a built-in so EXER-003 can protect them', () => {
    expect(SEEDED_EXERCISES.every((exercise) => exercise.is_custom === false)).toBe(true)
    expect(SEEDED_EXERCISES.every((exercise) => exercise.is_archived === false)).toBe(true)
  })
})

describe('seedExerciseCatalog', () => {
  it('inserts the whole catalog into an empty database', async () => {
    const database = useTestDatabase()

    expect(await seedExerciseCatalog(database)).toBe(SEEDED_EXERCISES.length)
    expect(await database.exercise_catalog.count()).toBe(SEEDED_EXERCISES.length)
    expect(await database.exercise_catalog.get('ex_bench_press')).toMatchObject({
      name: 'Barbell Bench Press',
      target_muscle: 'chest',
    })
  })

  it('is idempotent, so it can run on every app start', async () => {
    const database = useTestDatabase()

    await seedExerciseCatalog(database)
    expect(await seedExerciseCatalog(database)).toBe(0)
    expect(await database.exercise_catalog.count()).toBe(SEEDED_EXERCISES.length)
  })

  it('never overwrites a row the user archived (EXER-003)', async () => {
    const database = useTestDatabase()
    await seedExerciseCatalog(database)

    await database.exercise_catalog.update('ex_deadlift', { is_archived: true })
    expect(await seedExerciseCatalog(database)).toBe(0)
    expect((await database.exercise_catalog.get('ex_deadlift'))?.is_archived).toBe(true)
  })

  it('leaves custom exercises and their edits untouched', async () => {
    const database = useTestDatabase()
    await seedExerciseCatalog(database)

    await database.exercise_catalog.put({
      id: 'ex_custom_belt_squat',
      name: 'Belt Squat',
      target_muscle: 'legs',
      secondary_muscles: [],
      equipment: 'machine',
      type: 'weight_reps',
      instructions: 'Hip belt squat machine.',
      is_custom: true,
      is_archived: false,
    })
    await database.exercise_catalog.update('ex_bench_press', {
      instructions: 'Custom cue the user typed.',
    })

    expect(await seedExerciseCatalog(database)).toBe(0)
    expect(await database.exercise_catalog.count()).toBe(SEEDED_EXERCISES.length + 1)
    expect((await database.exercise_catalog.get('ex_bench_press'))?.instructions).toBe(
      'Custom cue the user typed.',
    )
  })

  it('picks up exercises added to the catalog in a later version', async () => {
    const database = useTestDatabase()
    await database.exercise_catalog.bulkAdd(SEEDED_EXERCISES.slice(0, 10))

    expect(await seedExerciseCatalog(database)).toBe(SEEDED_EXERCISES.length - 10)
    expect(await database.exercise_catalog.count()).toBe(SEEDED_EXERCISES.length)
  })
})
