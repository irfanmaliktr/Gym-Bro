/**
 * Domain model — mirrors PRD §8.2 "Detailed Table Schemas" field-for-field.
 *
 * Naming is deliberately kept in `snake_case` so the in-memory objects are
 * byte-identical to the IndexedDB rows and to the backup JSON format (§11.1),
 * which keeps export/import and debugging free of mapping layers.
 *
 * Two platform notes that apply to the whole model:
 *  - IndexedDB only accepts `number | string | Date | ArrayBuffer | Array` as
 *    keys. Booleans (`is_custom`, `is_archived`, `is_completed`) and `null`
 *    (`finish_timestamp`, `source_routine_id`) are stored but never appear in
 *    their index, so those indexes are declared for spec parity and queries on
 *    them must filter in memory (see README note in `database.ts`).
 *  - All weights are stored in kilograms; `lbs` exists only as a display/input
 *    projection (ONBD-003). See `lib/units.ts`.
 */

/** Primary muscle groups (EXER-001). */
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core'

/**
 * Equipment. PRD §8.2 lists `barbell | dumbbell | machine | cable | bodyweight`;
 * EXER-002 additionally allows `weighted_bodyweight` for custom exercises, so
 * the union covers both documents.
 */
export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'weighted_bodyweight'

/** Input mode of an exercise (§8.2 `type`). */
export type ExerciseType = 'weight_reps' | 'bodyweight_reps' | 'assisted_weight'

/** Session lifecycle (§8.2 `status`, LOG-008). */
export type SessionStatus = 'in_progress' | 'completed' | 'discarded'

/** Set flavours (LOG-006). */
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure'

/** §8.2 table 1 — single row, fixed primary key `'default_user'`. */
export interface UserProfile {
  id: string
  display_name?: string
  starting_weight_kg?: number
  created_at: number
  updated_at: number
}

/** §8.2 table 2 — key/value store (`'language'`, `'unit'`, `'theme'`, …). */
export interface AppSetting {
  key: string
  value: unknown
}

/** §8.2 table 3 — pre-seeded + custom exercise library. */
export interface ExerciseCatalogItem {
  id: string
  name: string
  target_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  equipment: Equipment
  type: ExerciseType
  instructions: string
  /** `false` for the built-in catalog (EXER-003: built-ins cannot be deleted). */
  is_custom: boolean
  is_archived: boolean
}

/** §8.2 table 4 — routine templates (ROUTINE-001). */
export interface UserRoutine {
  id: string
  name: string
  description?: string
  /** ISO weekdays, 1 = Monday (ROUTINE-006). */
  assigned_days: number[]
  is_archived: boolean
  created_at: number
  updated_at: number
}

/** §8.2 table 5 — routine → exercise links with planned targets (ROUTINE-003). */
export interface RoutineExercise {
  id: string
  routine_id: string
  exercise_id: string
  display_order: number
  target_sets?: number
  target_reps_min?: number
  target_reps_max?: number
  target_weight_kg?: number
  rest_seconds?: number
  notes?: string
}

/**
 * §8.2 table 6 — workout sessions.
 * `source_routine_id` and `finish_timestamp` are nullable: the session snapshot
 * stays valid even if the routine is later deleted (ROUTINE-007).
 */
export interface WorkoutSession {
  id: string
  source_routine_id: string | null
  workout_name_snap: string
  status: SessionStatus
  start_timestamp: number
  finish_timestamp: number | null
  duration_seconds?: number
  notes?: string
}

/** §8.2 table 7 — immutable per-session exercise snapshot (§9). */
export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string
  exercise_name_snap: string
  equipment_snap: Equipment
  display_order: number
  notes?: string
}

/** §8.2 table 8 — the actual logged sets. */
export interface SetLog {
  id: string
  session_exercise_id: string
  set_number: number
  set_type: SetType
  weight_kg: number
  reps: number
  is_completed: boolean
  completed_at?: number
}

/** §8.2 table 9 — optional bodyweight entries (BODY-002). */
export interface BodyweightLog {
  id: string
  weight_kg: number
  timestamp: number
  notes?: string
}

/** Every store of `gymbro_db`, in PRD §8.1 declaration order. */
export type GymbroStoreName =
  | 'user_profile'
  | 'app_settings'
  | 'exercise_catalog'
  | 'user_routines'
  | 'routine_exercises'
  | 'workout_sessions'
  | 'session_exercises'
  | 'set_logs'
  | 'bodyweight_logs'
