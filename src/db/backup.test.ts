import { describe, expect, it, vi } from 'vitest'
import { useTestDatabase } from '../test/database'
import {
  BACKUP_APP_ID,
  BACKUP_FORMAT,
  BACKUP_TABLES,
  BackupValidationError,
  backupFileName,
  buildBackup,
  clearAllData,
  createBackup,
  exportBackupJson,
  importBackup,
  parseBackupJson,
  summariseBackup,
  validateBackup,
  type BackupData,
  type GymbroBackup,
} from './backup'
import { SCHEMA_VERSION } from './database'
import type {
  BodyweightLog,
  ExerciseCatalogItem,
  RoutineExercise,
  SessionExercise,
  SetLog,
  UserProfile,
  UserRoutine,
  WorkoutSession,
} from './types'

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const profileRow = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'default_user',
  display_name: 'Lifter',
  created_at: 1_000,
  updated_at: 2_000,
  ...overrides,
})

const exerciseRow = (overrides: Partial<ExerciseCatalogItem> = {}): ExerciseCatalogItem => ({
  id: 'ex1',
  name: 'Bench Press',
  target_muscle: 'chest',
  secondary_muscles: ['arms'],
  equipment: 'barbell',
  type: 'weight_reps',
  instructions: 'Press the bar.',
  is_custom: false,
  is_archived: false,
  ...overrides,
})

const routineRow = (overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id: 'r1',
  name: 'Push Day',
  assigned_days: [1],
  is_archived: false,
  created_at: 1_000,
  updated_at: 2_000,
  ...overrides,
})

const routineExerciseRow = (overrides: Partial<RoutineExercise> = {}): RoutineExercise => ({
  id: 're1',
  routine_id: 'r1',
  exercise_id: 'ex1',
  display_order: 0,
  target_sets: 3,
  target_reps_min: 8,
  target_reps_max: 12,
  ...overrides,
})

const sessionRow = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1',
  source_routine_id: null,
  workout_name_snap: 'Push Day',
  status: 'completed',
  start_timestamp: 1_000,
  finish_timestamp: 2_000,
  ...overrides,
})

const sessionExerciseRow = (overrides: Partial<SessionExercise> = {}): SessionExercise => ({
  id: 'se1',
  session_id: 's1',
  exercise_id: 'ex1',
  exercise_name_snap: 'Bench Press',
  equipment_snap: 'barbell',
  display_order: 0,
  ...overrides,
})

const setLogRow = (overrides: Partial<SetLog> = {}): SetLog => ({
  id: 'sl1',
  session_exercise_id: 'se1',
  set_number: 1,
  set_type: 'normal',
  weight_kg: 60,
  reps: 8,
  is_completed: true,
  completed_at: 1_500,
  ...overrides,
})

const bodyweightRow = (overrides: Partial<BodyweightLog> = {}): BodyweightLog => ({
  id: 'bw1',
  weight_kg: 75,
  timestamp: 1_000,
  ...overrides,
})

const emptyData = (): BackupData => ({
  user_profile: [],
  app_settings: [],
  exercise_catalog: [],
  user_routines: [],
  routine_exercises: [],
  workout_sessions: [],
  session_exercises: [],
  set_logs: [],
  bodyweight_logs: [],
})

/** A complete, internally consistent backup with one row per table. */
function fullBackup(): GymbroBackup {
  return buildBackup(
    {
      user_profile: [profileRow()],
      app_settings: [{ key: 'language', value: 'en' }],
      exercise_catalog: [exerciseRow()],
      user_routines: [routineRow()],
      routine_exercises: [routineExerciseRow()],
      workout_sessions: [sessionRow()],
      session_exercises: [sessionExerciseRow()],
      set_logs: [setLogRow()],
      bodyweight_logs: [bodyweightRow()],
    },
    12_345,
  )
}

async function seedEverything(database: ReturnType<typeof useTestDatabase>): Promise<void> {
  await database.user_profile.put(profileRow())
  await database.app_settings.put({ key: 'language', value: 'en' })
  await database.exercise_catalog.put(exerciseRow())
  await database.user_routines.put(routineRow())
  await database.routine_exercises.put(routineExerciseRow())
  await database.workout_sessions.put(sessionRow())
  await database.session_exercises.put(sessionExerciseRow())
  await database.set_logs.put(setLogRow())
  await database.bodyweight_logs.put(bodyweightRow())
}

function expectValidationError(fn: () => unknown, key: string) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(BackupValidationError)
    expect((error as BackupValidationError).key).toBe(key)
    return
  }
  throw new Error('expected validateBackup to throw')
}

/* ------------------------------------------------------------------ */
/* Export (BACKUP-001)                                                 */
/* ------------------------------------------------------------------ */

describe('backup export (BACKUP-001)', () => {
  it('writes app identity and schema metadata', async () => {
    const database = useTestDatabase()
    const backup = await createBackup(database)

    expect(backup.appId).toBe(BACKUP_APP_ID)
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION)
    expect(typeof backup.exportedAt).toBe('number')
  })

  it('includes every table, even when empty', async () => {
    const database = useTestDatabase()
    const backup = await createBackup(database)

    expect(Object.keys(backup.data).sort()).toEqual([...BACKUP_TABLES].sort())
    for (const table of BACKUP_TABLES) {
      expect(backup.data[table]).toEqual([])
    }
  })

  it('round-trips every row, relationship, timestamp and nullable field', async () => {
    const database = useTestDatabase()
    await seedEverything(database)
    await database.workout_sessions.put(
      sessionRow({ id: 's2', status: 'in_progress', finish_timestamp: null }),
    )

    const backup = await createBackup(database)

    expect(backup.data.user_profile).toEqual(await database.user_profile.toArray())
    expect(backup.data.app_settings).toEqual(await database.app_settings.toArray())
    expect(backup.data.exercise_catalog).toEqual(await database.exercise_catalog.toArray())
    expect(backup.data.user_routines).toEqual(await database.user_routines.toArray())
    expect(backup.data.routine_exercises).toEqual(await database.routine_exercises.toArray())
    expect(backup.data.workout_sessions).toEqual(await database.workout_sessions.toArray())
    expect(backup.data.session_exercises).toEqual(await database.session_exercises.toArray())
    expect(backup.data.set_logs).toEqual(await database.set_logs.toArray())
    expect(backup.data.bodyweight_logs).toEqual(await database.bodyweight_logs.toArray())

    const inProgress = backup.data.workout_sessions.find((row) => row.id === 's2')
    expect(inProgress?.finish_timestamp).toBeNull()
    expect(inProgress?.source_routine_id).toBeNull()
  })

  it('does not mutate stored data while exporting', async () => {
    const database = useTestDatabase()
    await seedEverything(database)
    const before = await Promise.all(BACKUP_TABLES.map((table) => database.table(table).toArray()))

    await createBackup(database)
    await exportBackupJson(database)

    const after = await Promise.all(BACKUP_TABLES.map((table) => database.table(table).toArray()))
    expect(after).toEqual(before)
  })

  it('serialises valid, pretty-printed JSON that parses back', async () => {
    const database = useTestDatabase()
    await seedEverything(database)

    const json = await exportBackupJson(database)
    expect(json).toContain('\n  "appId"')

    const parsed = parseBackupJson(json)
    expect(parsed.appId).toBe(BACKUP_APP_ID)
    expect(parsed.data.set_logs).toEqual([setLogRow()])
  })

  it('names files gymbro_backup_YYYYMMDD_HHMM.json', () => {
    expect(backupFileName(new Date(2026, 9, 23, 7, 5))).toBe('gymbro_backup_20261023_0705.json')
    expect(backupFileName(new Date(2026, 0, 2, 23, 59))).toBe('gymbro_backup_20260102_2359.json')
  })

  it('summarises counts for the import preview (BACKUP-002)', () => {
    expect(summariseBackup(fullBackup())).toEqual({
      routines: 1,
      sessions: 1,
      exercises: 1,
      setLogs: 1,
      bodyweight: 1,
    })
  })
})

/* ------------------------------------------------------------------ */
/* Import validation (BACKUP-002)                                      */
/* ------------------------------------------------------------------ */

describe('backup validation (BACKUP-002)', () => {
  it('accepts a well-formed backup', () => {
    expect(validateBackup(fullBackup()).appId).toBe(BACKUP_APP_ID)
  })

  it('normalises omitted empty tables to arrays', () => {
    const backup = validateBackup({
      appId: BACKUP_APP_ID,
      format: BACKUP_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: 1,
      data: { user_profile: [profileRow()] },
    })

    expect(backup.data.user_profile).toHaveLength(1)
    expect(backup.data.set_logs).toEqual([])
  })

  it('rejects malformed JSON as an invalid format', () => {
    expectValidationError(() => parseBackupJson('{ nope'), 'importInvalidFormat')
  })

  it('rejects a non-object payload', () => {
    expectValidationError(() => validateBackup([]), 'importInvalidFormat')
  })

  it('rejects a backup from another app', () => {
    const backup = { ...fullBackup(), appId: 'other-app' }
    expectValidationError(() => validateBackup(backup), 'importInvalidAppId')
  })

  it('rejects missing or unsupported schema versions', () => {
    expectValidationError(
      () => validateBackup({ ...fullBackup(), schemaVersion: SCHEMA_VERSION + 1 }),
      'importInvalidVersion',
    )
    const { schemaVersion: _ignored, ...withoutVersion } = fullBackup()
    expectValidationError(() => validateBackup(withoutVersion), 'importInvalidVersion')
  })

  it('rejects a missing data object and non-array tables', () => {
    expectValidationError(
      () => validateBackup({ ...fullBackup(), data: undefined }),
      'importInvalidData',
    )
    expectValidationError(
      () => validateBackup({ ...fullBackup(), data: { ...emptyData(), set_logs: {} } }),
      'importInvalidData',
    )
  })

  it('rejects rows with missing required fields or wrong types', () => {
    const missingId = fullBackup()
    missingId.data.user_routines[0] = { ...routineRow(), id: '' }
    expectValidationError(() => validateBackup(missingId), 'importInvalidData')

    const wrongType = fullBackup()
    wrongType.data.set_logs[0] = { ...setLogRow(), reps: 'eight' as never }
    expectValidationError(() => validateBackup(wrongType), 'importInvalidData')

    const missingBoolean = fullBackup()
    missingBoolean.data.exercise_catalog[0] = {
      ...exerciseRow(),
      is_custom: 'no' as never,
    }
    expectValidationError(() => validateBackup(missingBoolean), 'importInvalidData')
  })

  it('rejects dangling relationships inside the file', () => {
    const danglingSet = fullBackup()
    danglingSet.data.set_logs[0] = setLogRow({ session_exercise_id: 'missing' })
    expectValidationError(() => validateBackup(danglingSet), 'importMissingReference')

    const danglingSessionExercise = fullBackup()
    danglingSessionExercise.data.session_exercises[0] = sessionExerciseRow({ session_id: 'missing' })
    expectValidationError(() => validateBackup(danglingSessionExercise), 'importMissingReference')

    const danglingRoutineExercise = fullBackup()
    danglingRoutineExercise.data.routine_exercises[0] = routineExerciseRow({ exercise_id: 'missing' })
    expectValidationError(() => validateBackup(danglingRoutineExercise), 'importMissingReference')
  })

  it('refuses an invalid import before touching existing data', async () => {
    const database = useTestDatabase()
    await seedEverything(database)

    const invalid = fullBackup()
    invalid.data.set_logs[0] = setLogRow({ session_exercise_id: 'missing' })

    await expect(importBackup(invalid, 'overwrite', database)).rejects.toBeInstanceOf(
      BackupValidationError,
    )
    expect(await database.user_profile.toArray()).toEqual([profileRow()])
    expect(await database.bodyweight_logs.toArray()).toEqual([bodyweightRow()])
  })
})

/* ------------------------------------------------------------------ */
/* Merge import (BACKUP-003)                                           */
/* ------------------------------------------------------------------ */

describe('import backup — merge mode (BACKUP-003)', () => {
  it('appends records whose IDs are new', async () => {
    const database = useTestDatabase()
    await database.user_profile.put(profileRow({ id: 'existing', updated_at: 2_000 }))

    const backup = buildBackup({
      ...emptyData(),
      user_profile: [profileRow({ id: 'incoming', updated_at: 1_000 })],
    })
    await importBackup(backup, 'merge', database)

    const ids = (await database.user_profile.toArray()).map((row) => row.id).sort()
    expect(ids).toEqual(['existing', 'incoming'])
  })

  it('updates an existing record only when the incoming timestamp is newer', async () => {
    const database = useTestDatabase()
    await database.user_profile.put(profileRow({ updated_at: 5_000, display_name: 'Current' }))
    await database.user_routines.put(routineRow({ updated_at: 5_000, name: 'Current routine' }))

    const older = buildBackup({
      ...emptyData(),
      user_profile: [profileRow({ updated_at: 4_000, display_name: 'Older' })],
      user_routines: [routineRow({ updated_at: 4_000, name: 'Older routine' })],
    })
    await importBackup(older, 'merge', database)

    expect((await database.user_profile.get('default_user'))?.display_name).toBe('Current')
    expect((await database.user_routines.get('r1'))?.name).toBe('Current routine')

    const newer = buildBackup({
      ...emptyData(),
      user_profile: [profileRow({ updated_at: 6_000, display_name: 'Newer' })],
      user_routines: [routineRow({ updated_at: 6_000, name: 'Newer routine' })],
    })
    await importBackup(newer, 'merge', database)

    expect((await database.user_profile.get('default_user'))?.display_name).toBe('Newer')
    expect((await database.user_routines.get('r1'))?.name).toBe('Newer routine')
  })

  it('keeps the existing settings value and adds only missing keys', async () => {
    const database = useTestDatabase()
    await database.app_settings.put({ key: 'language', value: 'id' })

    const backup = buildBackup({
      ...emptyData(),
      app_settings: [
        { key: 'language', value: 'en' },
        { key: 'unit', value: 'lbs' },
      ],
    })
    await importBackup(backup, 'merge', database)

    expect(await database.app_settings.get('language')).toEqual({ key: 'language', value: 'id' })
    expect(await database.app_settings.get('unit')).toEqual({ key: 'unit', value: 'lbs' })
  })

  it('does not overwrite an existing exercise, set log or join row', async () => {
    const database = useTestDatabase()
    await database.exercise_catalog.put(exerciseRow({ name: 'Existing name' }))
    await database.workout_sessions.put(sessionRow())
    await database.session_exercises.put(sessionExerciseRow())
    await database.set_logs.put(setLogRow({ reps: 10 }))
    await database.routine_exercises.put(routineExerciseRow({ target_sets: 5 }))

    const backup = fullBackup()
    backup.data.exercise_catalog[0] = exerciseRow({ name: 'Imported name' })
    backup.data.set_logs[0] = setLogRow({ reps: 1 })
    backup.data.session_exercises[0] = sessionExerciseRow({ display_order: 9 })
    backup.data.routine_exercises[0] = routineExerciseRow({ target_sets: 1 })

    await importBackup(backup, 'merge', database)

    expect((await database.exercise_catalog.get('ex1'))?.name).toBe('Existing name')
    expect((await database.set_logs.get('sl1'))?.reps).toBe(10)
    expect((await database.session_exercises.get('se1'))?.display_order).toBe(0)
    expect((await database.routine_exercises.get('re1'))?.target_sets).toBe(5)
  })

  it('uses the session start timestamp and bodyweight timestamp for conflict checks', async () => {
    const database = useTestDatabase()
    await database.workout_sessions.put(sessionRow({ start_timestamp: 5_000, notes: 'current' }))
    await database.bodyweight_logs.put(bodyweightRow({ timestamp: 5_000, weight_kg: 80 }))

    const backup = buildBackup({
      ...emptyData(),
      workout_sessions: [sessionRow({ start_timestamp: 4_000, notes: 'older' })],
      bodyweight_logs: [bodyweightRow({ timestamp: 4_000, weight_kg: 70 })],
    })
    await importBackup(backup, 'merge', database)

    expect((await database.workout_sessions.get('s1'))?.notes).toBe('current')
    expect((await database.bodyweight_logs.get('bw1'))?.weight_kg).toBe(80)

    const newer = buildBackup({
      ...emptyData(),
      workout_sessions: [sessionRow({ start_timestamp: 5_000, notes: 'older' })],
      bodyweight_logs: [bodyweightRow({ timestamp: 6_000, weight_kg: 78 })],
    })
    // Same session timestamp is not "newer", so the existing note stays.
    await importBackup(newer, 'merge', database)

    expect((await database.workout_sessions.get('s1'))?.notes).toBe('current')
    expect((await database.bodyweight_logs.get('bw1'))?.weight_kg).toBe(78)
  })

  it('keeps unrelated existing data intact', async () => {
    const database = useTestDatabase()
    await seedEverything(database)

    const backup = buildBackup({
      ...emptyData(),
      user_routines: [routineRow({ id: 'r2', name: 'Pull Day', updated_at: 9_000 })],
    })
    await importBackup(backup, 'merge', database)

    expect(await database.set_logs.count()).toBe(1)
    expect(await database.bodyweight_logs.count()).toBe(1)
    expect((await database.user_routines.toArray()).map((row) => row.id).sort()).toEqual(['r1', 'r2'])
  })
})

/* ------------------------------------------------------------------ */
/* Overwrite import (BACKUP-003) + rollback                            */
/* ------------------------------------------------------------------ */

describe('import backup — overwrite mode (BACKUP-003)', () => {
  it('purges current data and hydrates exactly the file contents', async () => {
    const database = useTestDatabase()
    await seedEverything(database)
    await database.user_routines.put(routineRow({ id: 'stale', name: 'Stale routine' }))

    const backup = buildBackup({
      ...emptyData(),
      user_profile: [profileRow({ display_name: 'Restored' })],
      exercise_catalog: [exerciseRow()],
      user_routines: [routineRow({ name: 'Restored routine' })],
      routine_exercises: [routineExerciseRow()],
      workout_sessions: [sessionRow({ id: 'restored-session' })],
      session_exercises: [sessionExerciseRow({ session_id: 'restored-session' })],
      set_logs: [setLogRow({ reps: 12 })],
      bodyweight_logs: [bodyweightRow({ weight_kg: 72 })],
    })

    await importBackup(backup, 'overwrite', database)

    expect(await database.user_profile.count()).toBe(1)
    expect(await database.app_settings.count()).toBe(0)
    expect((await database.user_profile.get('default_user'))?.display_name).toBe('Restored')
    expect((await database.user_routines.toArray()).map((row) => row.id)).toEqual(['r1'])
    expect((await database.workout_sessions.toArray()).map((row) => row.id)).toEqual([
      'restored-session',
    ])
    expect((await database.set_logs.get('sl1'))?.reps).toBe(12)
    expect((await database.bodyweight_logs.get('bw1'))?.weight_kg).toBe(72)
  })

  it('rolls back every table when hydration fails mid-transaction', async () => {
    const database = useTestDatabase()
    await seedEverything(database)
    const before = await Promise.all(BACKUP_TABLES.map((table) => database.table(table).toArray()))

    const backup = buildBackup({
      ...emptyData(),
      user_profile: [profileRow({ display_name: 'Should not persist' })],
      bodyweight_logs: [bodyweightRow({ weight_kg: 99 })],
    })

    const spy = vi
      .spyOn(database.user_profile, 'bulkPut')
      .mockRejectedValueOnce(new Error('simulated failure'))

    await expect(importBackup(backup, 'overwrite', database)).rejects.toThrow('simulated failure')
    spy.mockRestore()

    const after = await Promise.all(BACKUP_TABLES.map((table) => database.table(table).toArray()))
    expect(after).toEqual(before)
  })

  it('rolls back merge writes when a later table fails', async () => {
    const database = useTestDatabase()
    await database.app_settings.put({ key: 'language', value: 'id' })

    const backup = buildBackup({
      ...emptyData(),
      user_profile: [profileRow({ id: 'new-profile' })],
      app_settings: [{ key: 'unit', value: 'lbs' }],
      exercise_catalog: [exerciseRow({ id: 'new-ex' })],
    })

    const spy = vi
      .spyOn(database.exercise_catalog, 'put')
      .mockRejectedValueOnce(new Error('simulated failure'))

    await expect(importBackup(backup, 'merge', database)).rejects.toThrow('simulated failure')
    spy.mockRestore()

    // Nothing from the failed import remains; the original row is untouched.
    expect(await database.user_profile.count()).toBe(0)
    expect(await database.app_settings.get('unit')).toBeUndefined()
    expect(await database.exercise_catalog.count()).toBe(0)
    expect(await database.app_settings.get('language')).toEqual({ key: 'language', value: 'id' })
  })
})

/* ------------------------------------------------------------------ */
/* Clear all data (BACKUP-004)                                         */
/* ------------------------------------------------------------------ */

describe('clear all data (BACKUP-004)', () => {
  it('empties every table', async () => {
    const database = useTestDatabase()
    await seedEverything(database)

    await clearAllData(database)

    for (const table of BACKUP_TABLES) {
      expect(await database.table(table).count()).toBe(0)
    }
    expect(await database.user_profile.get('default_user')).toBeUndefined()
  })

  it('keeps the database, its stores and its schema version', async () => {
    const database = useTestDatabase()
    await seedEverything(database)

    await clearAllData(database)

    expect(database.isOpen()).toBe(true)
    expect(database.verno).toBe(SCHEMA_VERSION)
    expect(database.tables.map((table) => table.name).sort()).toEqual([...BACKUP_TABLES].sort())
  })

  it('can be followed by a fresh import', async () => {
    const database = useTestDatabase()
    await seedEverything(database)
    await clearAllData(database)

    await importBackup(fullBackup(), 'merge', database)

    expect(await database.user_profile.count()).toBe(1)
    expect(await database.set_logs.count()).toBe(1)
  })
})
