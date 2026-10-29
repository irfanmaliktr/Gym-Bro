import { describe, expect, it } from 'vitest'
import { useTestDatabase } from '../test/database'
import { DB_NAME, GYMBRO_SCHEMA_V1, SCHEMA_VERSION, createDatabase, GymbroDatabase } from './database'

/**
 * Literal transcription of PRD §8.1. Kept separate from the implementation on
 * purpose: if someone edits the schema constant, this test fails and the change
 * has to be justified against the specification.
 */
const PRD_SCHEMA_V1 = {
  user_profile: 'id',
  app_settings: 'key',
  exercise_catalog: 'id, name, target_muscle, equipment, is_custom, is_archived',
  user_routines: 'id, name, is_archived, updated_at',
  routine_exercises: 'id, routine_id, exercise_id, [routine_id+display_order]',
  workout_sessions: 'id, source_routine_id, status, start_timestamp, finish_timestamp',
  session_exercises: 'id, session_id, exercise_id, [session_id+display_order]',
  set_logs: 'id, session_exercise_id, [session_exercise_id+set_number], is_completed',
  bodyweight_logs: 'id, timestamp',
}

describe('gymbro_db schema (PRD §8)', () => {
  it('is named gymbro_db', () => {
    expect(DB_NAME).toBe('gymbro_db')
    expect(createDatabase().name).toBe('gymbro_db')
  })

  it('declares version 1 exactly as specified', () => {
    expect(SCHEMA_VERSION).toBe(1)
    expect(GYMBRO_SCHEMA_V1).toEqual(PRD_SCHEMA_V1)
  })

  it('creates all nine object stores', async () => {
    const database = useTestDatabase()
    await database.open()

    expect([...database.tables.map((table) => table.name)].sort()).toEqual(
      Object.keys(PRD_SCHEMA_V1).sort(),
    )
    expect(await database.tables.length).toBe(9)
  })

  it('parses the declared primary keys and indexes per store', async () => {
    const database = useTestDatabase()
    await database.open()

    const expected: Record<string, string[]> = {
      user_profile: ['id'],
      app_settings: ['key'],
      exercise_catalog: ['id', 'name', 'target_muscle', 'equipment', 'is_custom', 'is_archived'],
      user_routines: ['id', 'name', 'is_archived', 'updated_at'],
      routine_exercises: ['id', 'routine_id', 'exercise_id', '[routine_id+display_order]'],
      workout_sessions: [
        'id',
        'source_routine_id',
        'status',
        'start_timestamp',
        'finish_timestamp',
      ],
      session_exercises: ['id', 'session_id', 'exercise_id', '[session_id+display_order]'],
      set_logs: ['id', 'session_exercise_id', '[session_exercise_id+set_number]', 'is_completed'],
      bodyweight_logs: ['id', 'timestamp'],
    }

    for (const [store, keys] of Object.entries(expected)) {
      const table = database.table(store)
      expect(table.schema.primKey.src, `${store} primary key`).toBe(keys[0])
      expect(
        table.schema.indexes.map((index) => index.src),
        `${store} indexes`,
      ).toEqual(keys.slice(1))
    }
  })

  it('is constructible with an isolated name (used by the test suite)', () => {
    const isolated = new GymbroDatabase('gymbro_name_probe')
    expect(isolated.name).toBe('gymbro_name_probe')
    isolated.close()
  })

  it('stores rows whose indexed boolean/null fields are inert by platform design', async () => {
    // IndexedDB cannot key booleans or null: the records persist and are
    // queried in memory, while their "indexes" stay empty. This test pins that
    // behaviour down so the Phase 2+ queries are never written on a false
    // assumption.
    const database = useTestDatabase()
    await database.open()

    await database.exercise_catalog.put({
      id: 'ex_probe',
      name: 'Probe',
      target_muscle: 'core',
      secondary_muscles: [],
      equipment: 'bodyweight',
      type: 'bodyweight_reps',
      instructions: '',
      is_custom: false,
      is_archived: false,
    })

    expect(await database.exercise_catalog.where('is_custom').equals(0).count()).toBe(0)
    expect(await database.exercise_catalog.where('is_archived').equals(1).count()).toBe(0)
    expect(await database.exercise_catalog.toArray()).toHaveLength(1)
    expect(await database.exercise_catalog.filter((row) => !row.is_archived).count()).toBe(1)
  })
})
