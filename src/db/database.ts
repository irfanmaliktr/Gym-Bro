import Dexie, { type Table } from 'dexie'
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

/** PRD §8: "The database name is `gymbro_db`." */
export const DB_NAME = 'gymbro_db'

/**
 * Version 1 index declarations — copied **verbatim** from PRD §8.1.
 *
 * Kept as an exported constant so `database.test.ts` can assert that the
 * runtime schema still matches the specification character-for-character.
 *
 * Platform caveat (documented, not a bug): IndexedDB cannot use booleans or
 * `null` as keys, so the `is_custom`, `is_archived`, `is_completed` and
 * `finish_timestamp`/`source_routine_id` indexes are declared for spec parity
 * but hold no entries. Rows are still stored, and filtering those fields is
 * done in memory — which is negligible at single-user data volumes, and keeps
 * the schema exactly as the PRD prescribes.
 */
export const GYMBRO_SCHEMA_V1: Record<string, string> = {
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

/** Version of the Dexie schema currently shipped (see §11 backup `version`). */
export const SCHEMA_VERSION = 1

export class GymbroDatabase extends Dexie {
  user_profile!: Table<UserProfile, string>
  app_settings!: Table<AppSetting, string>
  exercise_catalog!: Table<ExerciseCatalogItem, string>
  user_routines!: Table<UserRoutine, string>
  routine_exercises!: Table<RoutineExercise, string>
  workout_sessions!: Table<WorkoutSession, string>
  session_exercises!: Table<SessionExercise, string>
  set_logs!: Table<SetLog, string>
  bodyweight_logs!: Table<BodyweightLog, string>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(SCHEMA_VERSION).stores(GYMBRO_SCHEMA_V1)
  }
}

/**
 * Creates an isolated database instance.
 * Tests pass a unique name so parallel files never share IndexedDB state; the
 * app uses the default `gymbro_db` via the `db` singleton below.
 */
export function createDatabase(name: string = DB_NAME): GymbroDatabase {
  return new GymbroDatabase(name)
}

/** Application-wide singleton (DATA-001: everything lives in local IndexedDB). */
export const db = createDatabase()
