import type { Table } from 'dexie'
import { db as defaultDatabase, SCHEMA_VERSION, type GymbroDatabase } from './database'
import type {
  AppSetting,
  BodyweightLog,
  ExerciseCatalogItem,
  RoutineExercise,
  SessionExercise,
  SetLog,
  UserProfile,
  UserRoutine,
  WorkoutSession,
} from './types'

/**
 * JSON backup / restore (BACKUP-001…003).
 *
 * The on-disk row shapes are used verbatim (`snake_case`, kg storage) so the
 * export is byte-for-byte what lives in IndexedDB: IDs, relationships,
 * timestamps, snapshots and nullable fields all round-trip unchanged.
 */

export const BACKUP_APP_ID = 'gymbro'
export const BACKUP_FORMAT = 'gymbro_backup'
export const BACKUP_FILE_PREFIX = 'gymbro_backup_'

/** The tables a backup carries, in dependency order. */
export const BACKUP_TABLES = [
  'user_profile',
  'app_settings',
  'exercise_catalog',
  'user_routines',
  'routine_exercises',
  'workout_sessions',
  'session_exercises',
  'set_logs',
  'bodyweight_logs',
] as const

export type BackupTableName = (typeof BACKUP_TABLES)[number]

export interface BackupData {
  user_profile: UserProfile[]
  app_settings: AppSetting[]
  exercise_catalog: ExerciseCatalogItem[]
  user_routines: UserRoutine[]
  routine_exercises: RoutineExercise[]
  workout_sessions: WorkoutSession[]
  session_exercises: SessionExercise[]
  set_logs: SetLog[]
  bodyweight_logs: BodyweightLog[]
}

export interface GymbroBackup {
  appId: string
  format: string
  schemaVersion: number
  exportedAt: number
  data: BackupData
}

/** Counts shown in the import preview modal (BACKUP-002). */
export interface BackupSummary {
  routines: number
  sessions: number
  exercises: number
  setLogs: number
  bodyweight: number
}

/** Localised error *keys*; the UI maps them through `t()` (I18N-001). */
export type BackupErrorKey =
  | 'importInvalidFormat'
  | 'importInvalidAppId'
  | 'importInvalidVersion'
  | 'importInvalidData'
  | 'importMissingReference'

export class BackupValidationError extends Error {
  readonly key: BackupErrorKey

  constructor(key: BackupErrorKey) {
    super(key)
    this.name = 'BackupValidationError'
    this.key = key
  }
}

export type ImportMode = 'merge' | 'overwrite'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** Reads every table without mutating anything (BACKUP-001 is read-only). */
export async function collectBackupData(
  database: GymbroDatabase = defaultDatabase,
): Promise<BackupData> {
  const [
    user_profile,
    app_settings,
    exercise_catalog,
    user_routines,
    routine_exercises,
    workout_sessions,
    session_exercises,
    set_logs,
    bodyweight_logs,
  ] = await Promise.all([
    database.user_profile.toArray(),
    database.app_settings.toArray(),
    database.exercise_catalog.toArray(),
    database.user_routines.toArray(),
    database.routine_exercises.toArray(),
    database.workout_sessions.toArray(),
    database.session_exercises.toArray(),
    database.set_logs.toArray(),
    database.bodyweight_logs.toArray(),
  ])

  return {
    user_profile,
    app_settings,
    exercise_catalog,
    user_routines,
    routine_exercises,
    workout_sessions,
    session_exercises,
    set_logs,
    bodyweight_logs,
  }
}

export function buildBackup(data: BackupData, exportedAt = Date.now()): GymbroBackup {
  return {
    appId: BACKUP_APP_ID,
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    data,
  }
}

export async function createBackup(
  database: GymbroDatabase = defaultDatabase,
): Promise<GymbroBackup> {
  return buildBackup(await collectBackupData(database))
}

/** Serialised backup ready for download. */
export async function exportBackupJson(
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  return JSON.stringify(await createBackup(database), null, 2)
}

/** `gymbro_backup_YYYYMMDD_HHMM.json` (BACKUP-001). */
export function backupFileName(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}`
  return `${BACKUP_FILE_PREFIX}${stamp}.json`
}

export function summariseBackup(backup: GymbroBackup): BackupSummary {
  return {
    routines: backup.data.user_routines.length,
    sessions: backup.data.workout_sessions.length,
    exercises: backup.data.exercise_catalog.length,
    setLogs: backup.data.set_logs.length,
    bodyweight: backup.data.bodyweight_logs.length,
  }
}

/**
 * Structural validation before anything touches the database:
 * format, app identity, schema version, table shapes, per-row required
 * fields/types, and cross-table references (BACKUP-002).
 */
export function validateBackup(raw: unknown): GymbroBackup {
  if (!isRecord(raw)) throw new BackupValidationError('importInvalidFormat')
  if (raw.appId !== BACKUP_APP_ID) throw new BackupValidationError('importInvalidAppId')
  if (!isFiniteNumber(raw.schemaVersion)) throw new BackupValidationError('importInvalidVersion')
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new BackupValidationError('importInvalidVersion')
  if (!isRecord(raw.data)) throw new BackupValidationError('importInvalidData')

  const candidate = raw as unknown as GymbroBackup
  const data = candidate.data as unknown as Record<string, unknown>

  for (const table of BACKUP_TABLES) {
    const rows = data[table]
    if (rows === undefined) continue
    if (!Array.isArray(rows)) throw new BackupValidationError('importInvalidData')
  }

  const value = (table: BackupTableName): Record<string, unknown>[] =>
    (data[table] as Record<string, unknown>[] | undefined) ?? []

  // Required fields and primitive types per table (§8.2).
  for (const row of value('user_profile')) {
    if (!isNonEmptyString(row.id) || !isFiniteNumber(row.created_at) || !isFiniteNumber(row.updated_at)) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('app_settings')) {
    if (!isNonEmptyString(row.key) || !('value' in row)) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('exercise_catalog')) {
    if (
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.name) ||
      !isNonEmptyString(row.target_muscle) ||
      !isNonEmptyString(row.equipment) ||
      !isNonEmptyString(row.type) ||
      !isStringArray(row.secondary_muscles) ||
      typeof row.is_custom !== 'boolean' ||
      typeof row.is_archived !== 'boolean'
    ) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('user_routines')) {
    if (
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.name) ||
      !Array.isArray(row.assigned_days) ||
      !row.assigned_days.every((day) => isFiniteNumber(day)) ||
      typeof row.is_archived !== 'boolean' ||
      !isFiniteNumber(row.created_at) ||
      !isFiniteNumber(row.updated_at)
    ) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('routine_exercises')) {
    if (
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.routine_id) ||
      !isNonEmptyString(row.exercise_id) ||
      !isFiniteNumber(row.display_order)
    ) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('workout_sessions')) {
    if (
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.workout_name_snap) ||
      !isNonEmptyString(row.status) ||
      !isFiniteNumber(row.start_timestamp)
    ) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('session_exercises')) {
    if (
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.session_id) ||
      !isNonEmptyString(row.exercise_name_snap) ||
      !isNonEmptyString(row.equipment_snap) ||
      !isFiniteNumber(row.display_order)
    ) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('set_logs')) {
    if (
      !isNonEmptyString(row.id) ||
      !isNonEmptyString(row.session_exercise_id) ||
      !isFiniteNumber(row.set_number) ||
      !isFiniteNumber(row.weight_kg) ||
      !isFiniteNumber(row.reps) ||
      typeof row.is_completed !== 'boolean'
    ) {
      throw new BackupValidationError('importInvalidData')
    }
  }
  for (const row of value('bodyweight_logs')) {
    if (!isNonEmptyString(row.id) || !isFiniteNumber(row.weight_kg) || !isFiniteNumber(row.timestamp)) {
      throw new BackupValidationError('importInvalidData')
    }
  }

  // Referential integrity inside the file itself: a set must belong to a
  // session exercise in the same file, and so on.
  const routineIds = new Set(value('user_routines').map((row) => row.id as string))
  const exerciseIds = new Set(value('exercise_catalog').map((row) => row.id as string))
  for (const row of value('routine_exercises')) {
    if (!routineIds.has(row.routine_id as string) || !exerciseIds.has(row.exercise_id as string)) {
      throw new BackupValidationError('importMissingReference')
    }
  }

  const sessionIds = new Set(value('workout_sessions').map((row) => row.id as string))
  const sessionExerciseIds = new Set<string>()
  for (const row of value('session_exercises')) {
    if (!sessionIds.has(row.session_id as string)) {
      throw new BackupValidationError('importMissingReference')
    }
    sessionExerciseIds.add(row.id as string)
  }
  for (const row of value('set_logs')) {
    if (!sessionExerciseIds.has(row.session_exercise_id as string)) {
      throw new BackupValidationError('importMissingReference')
    }
  }

  // Normalise: every table present, even when the file omitted an empty one,
  // so callers never have to null-check `data.<table>`.
  const normalisedData = {} as BackupData
  for (const table of BACKUP_TABLES) {
    ;(normalisedData as unknown as Record<string, unknown[]>)[table] = value(table)
  }

  return {
    appId: BACKUP_APP_ID,
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: isFiniteNumber(raw.exportedAt) ? raw.exportedAt : Date.now(),
    data: normalisedData,
  }
}

export function parseBackupJson(text: string): GymbroBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupValidationError('importInvalidFormat')
  }
  return validateBackup(parsed)
}

/** Timestamp used to decide whether a merge should replace an existing row. */
function rowTimestamp(row: object): number {
  const record = row as Record<string, unknown>
  for (const key of ['updated_at', 'finish_timestamp', 'start_timestamp', 'timestamp']) {
    const value = record[key]
    if (isFiniteNumber(value)) return value
  }
  return 0
}

/**
 * Merge rows by primary key: new IDs are appended, existing IDs are only
 * replaced when the incoming timestamp is strictly newer.
 */
async function mergeRows<T extends { id: string }>(
  table: Table<T, string>,
  rows: T[],
  compareTimestamps: boolean,
): Promise<void> {
  for (const row of rows) {
    const existing = await table.get(row.id)
    if (!existing || (compareTimestamps && rowTimestamp(row) > rowTimestamp(existing))) {
      await table.put(row)
    }
  }
}

/**
 * Restores a validated backup inside one Dexie transaction: any failure rolls
 * the whole import back, so the database is never left half-written.
 *
 * `merge` appends rows whose ID is new and only replaces an existing row when
 * the incoming timestamp is strictly newer (BACKUP-003). `overwrite` clears the
 * tables first and hydrates them with the file contents.
 */
export async function importBackup(
  backup: GymbroBackup,
  mode: ImportMode,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const validated = validateBackup(backup)

  await database.transaction(
    'rw',
    [
      database.user_profile,
      database.app_settings,
      database.exercise_catalog,
      database.user_routines,
      database.routine_exercises,
      database.workout_sessions,
      database.session_exercises,
      database.set_logs,
      database.bodyweight_logs,
    ],
    async () => {
      if (mode === 'overwrite') {
        await Promise.all([
          database.user_profile.clear(),
          database.app_settings.clear(),
          database.exercise_catalog.clear(),
          database.user_routines.clear(),
          database.routine_exercises.clear(),
          database.workout_sessions.clear(),
          database.session_exercises.clear(),
          database.set_logs.clear(),
          database.bodyweight_logs.clear(),
        ])
        await database.user_profile.bulkPut(validated.data.user_profile)
        await database.app_settings.bulkPut(validated.data.app_settings)
        await database.exercise_catalog.bulkPut(validated.data.exercise_catalog)
        await database.user_routines.bulkPut(validated.data.user_routines)
        await database.routine_exercises.bulkPut(validated.data.routine_exercises)
        await database.workout_sessions.bulkPut(validated.data.workout_sessions)
        await database.session_exercises.bulkPut(validated.data.session_exercises)
        await database.set_logs.bulkPut(validated.data.set_logs)
        await database.bodyweight_logs.bulkPut(validated.data.bodyweight_logs)
        return
      }

      // Merge: `app_settings` and the join tables are keyed by ID, everything
      // else compares its most meaningful timestamp.
      for (const row of validated.data.app_settings) {
        const existing = await database.app_settings.get(row.key)
        if (!existing) await database.app_settings.put(row)
      }
      await mergeRows(database.user_profile, validated.data.user_profile, true)
      await mergeRows(database.exercise_catalog, validated.data.exercise_catalog, false)
      await mergeRows(database.user_routines, validated.data.user_routines, true)
      await mergeRows(database.routine_exercises, validated.data.routine_exercises, false)
      await mergeRows(database.workout_sessions, validated.data.workout_sessions, true)
      await mergeRows(database.session_exercises, validated.data.session_exercises, false)
      await mergeRows(database.set_logs, validated.data.set_logs, false)
      await mergeRows(database.bodyweight_logs, validated.data.bodyweight_logs, true)
    },
  )
}

/**
 * Clears every table but leaves the database itself in place: schema version,
 * store definitions and the onboarding "has profile?" signal all stay intact
 * (clearing `user_profile` is what sends the user back to `/welcome`).
 */
export async function clearAllData(database: GymbroDatabase = defaultDatabase): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.user_profile,
      database.app_settings,
      database.exercise_catalog,
      database.user_routines,
      database.routine_exercises,
      database.workout_sessions,
      database.session_exercises,
      database.set_logs,
      database.bodyweight_logs,
    ],
    async () => {
      await Promise.all([
        database.user_profile.clear(),
        database.app_settings.clear(),
        database.exercise_catalog.clear(),
        database.user_routines.clear(),
        database.routine_exercises.clear(),
        database.workout_sessions.clear(),
        database.session_exercises.clear(),
        database.set_logs.clear(),
        database.bodyweight_logs.clear(),
      ])
    },
  )
}
