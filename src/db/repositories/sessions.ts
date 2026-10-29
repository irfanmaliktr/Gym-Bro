import { newId } from '../../lib/id'
import { db as defaultDatabase, type GymbroDatabase } from '../database'
import type { SessionExercise, SetLog, SetType, WorkoutSession } from '../types'

/**
 * Session repository (Phase 3: active workout, Phase 4: history editing).
 *
 * Implements the snapshot pattern (§9 PRD): sessions write immutable snapshots
 * for exercise names/equipment and never back-write into routines/catalog.
 */

export interface CreateSessionFromRoutineInput {
  sourceRoutineId: string | null
  workoutName: string
  /** Ordered exercises with their snapshots. */
  exercises: Array<{
    exercise_id: string
    exercise_name_snap: string
    equipment_snap: string
    display_order: number
  }>
}

export interface AddExerciseToSessionInput {
  sessionId: string
  exerciseId: string
  exerciseNameSnap: string
  equipmentSnap: string
  /** Appends to end if omitted. */
  displayOrder?: number
}

export interface AddSetInput {
  sessionExerciseId: string
  /** Defaults to next set number. */
  setNumber?: number
  setType?: SetType
  weightKg?: number
  reps?: number
}

export interface UpdateSetLogInput {
  setLogId: string
  weightKg?: number
  reps?: number
  setType?: SetType
  isCompleted?: boolean
  completedAt?: number | null
}

export interface MoveSessionExerciseInput {
  sessionExerciseId: string
  targetDisplayOrder: number
}

export async function listSessions(database: GymbroDatabase = defaultDatabase): Promise<WorkoutSession[]> {
  return database.workout_sessions.toArray()
}

export async function listSessionExercises(
  database: GymbroDatabase = defaultDatabase,
): Promise<SessionExercise[]> {
  return database.session_exercises.toArray()
}

export async function listSetLogs(database: GymbroDatabase = defaultDatabase): Promise<SetLog[]> {
  return database.set_logs.toArray()
}

/**
 * The open session a relaunch must offer to resume (LOG-008).
 * `status` holds strings, which IndexedDB can index, so this is a real query.
 */
export async function findActiveSession(
  database: GymbroDatabase = defaultDatabase,
): Promise<WorkoutSession | null> {
  const open = await database.workout_sessions.where('status').equals('in_progress').toArray()
  return open[0] ?? null
}

export async function getSession(
  sessionId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<WorkoutSession | null> {
  return (await database.workout_sessions.get(sessionId)) ?? null
}

export async function getSessionExercises(
  sessionId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<SessionExercise[]> {
  const items = await database.session_exercises.where('session_id').equals(sessionId).toArray()
  items.sort((a, b) => a.display_order - b.display_order)
  return items
}

export async function getSetLogsForSessionExercise(
  sessionExerciseId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<SetLog[]> {
  const logs = await database.set_logs.where('session_exercise_id').equals(sessionExerciseId).toArray()
  logs.sort((a, b) => a.set_number - b.set_number)
  return logs
}

export async function getSetLogsForSession(
  sessionId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<SetLog[]> {
  const links = await getSessionExercises(sessionId, database)
  const all: SetLog[] = []
  for (const link of links) {
    const logs = await getSetLogsForSessionExercise(link.id, database)
    all.push(...logs)
  }
  return all
}

/** Completed sessions, newest first (HIST-001 ordering). */
export async function listCompletedSessions(
  database: GymbroDatabase = defaultDatabase,
): Promise<WorkoutSession[]> {
  const completed = await database.workout_sessions.where('status').equals('completed').toArray()
  return completed.sort((a, b) => b.start_timestamp - a.start_timestamp)
}

import type { Equipment } from '../types'

function normaliseEquipment(equipment: string): Equipment {
  const allowed: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'weighted_bodyweight']
  if (allowed.includes(equipment as Equipment)) return equipment as Equipment
  return 'bodyweight'
}

export async function createSessionFromRoutine(
  input: CreateSessionFromRoutineInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const now = Date.now()
  const sessionId = newId()

  const session: WorkoutSession = {
    id: sessionId,
    source_routine_id: input.sourceRoutineId,
    workout_name_snap: input.workoutName.trim() || 'Workout',
    status: 'in_progress',
    start_timestamp: now,
    finish_timestamp: null,
  }

  const links: SessionExercise[] = input.exercises
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((exercise) => ({
      id: newId(),
      session_id: sessionId,
      exercise_id: exercise.exercise_id,
      exercise_name_snap: exercise.exercise_name_snap,
      equipment_snap: normaliseEquipment(exercise.equipment_snap),
      display_order: exercise.display_order,
    }))

  await database.transaction('rw', database.workout_sessions, database.session_exercises, async () => {
    await database.workout_sessions.put(session)
    if (links.length > 0) {
      await database.session_exercises.bulkPut(links)
    }
  })

  return sessionId
}

export async function createEmptySession(
  workoutName?: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const now = Date.now()
  const sessionId = newId()
  const session: WorkoutSession = {
    id: sessionId,
    source_routine_id: null,
    workout_name_snap: (workoutName || '').trim() || 'Empty Workout',
    status: 'in_progress',
    start_timestamp: now,
    finish_timestamp: null,
  }
  await database.workout_sessions.put(session)
  return sessionId
}

export async function renameSession(
  sessionId: string,
  workoutName: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.workout_sessions.get(sessionId)
  if (!existing) return
  if (existing.status !== 'in_progress') return
  const name = workoutName.trim()
  if (name === '') return
  await database.workout_sessions.put({ ...existing, workout_name_snap: name })
}

export async function addExerciseToSession(
  input: AddExerciseToSessionInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const existingLinks = await database.session_exercises.where('session_id').equals(input.sessionId).toArray()
  const displayOrder =
    input.displayOrder !== undefined
      ? input.displayOrder
      : existingLinks.length === 0
        ? 0
        : Math.max(...existingLinks.map((link) => link.display_order)) + 1

  const link: SessionExercise = {
    id: newId(),
    session_id: input.sessionId,
    exercise_id: input.exerciseId,
    exercise_name_snap: input.exerciseNameSnap,
    equipment_snap: normaliseEquipment(input.equipmentSnap),
    display_order: displayOrder,
  }
  await database.session_exercises.put(link)
  return link.id
}

export async function removeExerciseFromSession(
  sessionExerciseId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await database.transaction('rw', database.session_exercises, database.set_logs, async () => {
    await database.set_logs.where('session_exercise_id').equals(sessionExerciseId).delete()
    await database.session_exercises.delete(sessionExerciseId)
  })
}

export async function reorderSessionExercises(
  sessionId: string,
  orderedSessionExerciseIds: string[],
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const links = await database.session_exercises.where('session_id').equals(sessionId).toArray()
  const byId = new Map(links.map((link) => [link.id, link]))
  const updates: SessionExercise[] = []
  orderedSessionExerciseIds.forEach((id, index) => {
    const link = byId.get(id)
    if (link && link.session_id === sessionId) {
      updates.push({ ...link, display_order: index })
    }
  })
  if (updates.length > 0) {
    await database.session_exercises.bulkPut(updates)
  }
}

export async function addSetToSessionExercise(
  input: AddSetInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const existing = await database.set_logs
    .where('session_exercise_id')
    .equals(input.sessionExerciseId)
    .toArray()
  const setNumber =
    input.setNumber !== undefined ? input.setNumber : existing.length === 0 ? 1 : Math.max(...existing.map((log) => log.set_number)) + 1

  const log: SetLog = {
    id: newId(),
    session_exercise_id: input.sessionExerciseId,
    set_number: setNumber,
    set_type: input.setType ?? 'normal',
    weight_kg: input.weightKg ?? 0,
    reps: input.reps ?? 0,
    is_completed: false,
  }
  await database.set_logs.put(log)
  return log.id
}

export async function updateSetLog(
  input: UpdateSetLogInput,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.set_logs.get(input.setLogId)
  if (!existing) return
  const next: SetLog = { ...existing }
  if (input.weightKg !== undefined) next.weight_kg = input.weightKg
  if (input.reps !== undefined) next.reps = input.reps
  if (input.setType !== undefined) next.set_type = input.setType
  if (input.isCompleted !== undefined) {
    next.is_completed = input.isCompleted
    if (input.isCompleted && !next.completed_at) {
      next.completed_at = input.completedAt === undefined ? Date.now() : (input.completedAt ?? undefined)
    }
    if (!input.isCompleted) {
      next.completed_at = undefined
    }
  } else if (input.completedAt !== undefined) {
    next.completed_at = input.completedAt ?? undefined
  }
  await database.set_logs.put(next)
}

export async function removeSetLog(
  setLogId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await database.set_logs.delete(setLogId)
}

export async function getPreviousPerformance(
  exerciseId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<Array<{ weight_kg: number; reps: number }>> {
  const links = await database.session_exercises.where('exercise_id').equals(exerciseId).toArray()
  if (links.length === 0) return []

  const sessions = await database.workout_sessions.toArray()
  const completedSessions = sessions
    .filter((session) => session.status === 'completed' && session.finish_timestamp)
    .sort((a, b) => (b.finish_timestamp ?? 0) - (a.finish_timestamp ?? 0))

  let bestLink: SessionExercise | null = null
  for (const session of completedSessions) {
    const link = links.find((l) => l.session_id === session.id)
    if (link) {
      bestLink = link
      break
    }
  }

  if (!bestLink) return []
  const logs = await database.set_logs.where('session_exercise_id').equals(bestLink.id).toArray()
  return logs
    .filter((log) => log.is_completed)
    .sort((a, b) => a.set_number - b.set_number)
    .map((log) => ({ weight_kg: log.weight_kg, reps: log.reps }))
}

export async function finishSession(
  sessionId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.workout_sessions.get(sessionId)
  if (!existing) return
  if (existing.status === 'completed') return
  const now = Date.now()
  const durationSeconds = Math.max(0, Math.round((now - existing.start_timestamp) / 1000))
  await database.workout_sessions.put({
    ...existing,
    status: 'completed',
    finish_timestamp: now,
    duration_seconds: durationSeconds,
  })
}

export async function discardSession(
  sessionId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.workout_sessions.get(sessionId)
  if (!existing) return
  if (existing.status !== 'in_progress') return
  await database.workout_sessions.put({ ...existing, status: 'discarded', finish_timestamp: Date.now() })
}

export async function deleteCompletedSession(
  sessionId: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.workout_sessions.get(sessionId)
  if (!existing) return
  if (existing.status !== 'completed') return
  const links = await database.session_exercises.where('session_id').equals(sessionId).toArray()
  const linkIds = links.map((l) => l.id)
  await database.transaction(
    'rw',
    database.workout_sessions,
    database.session_exercises,
    database.set_logs,
    async () => {
      for (const lid of linkIds) {
        await database.set_logs.where('session_exercise_id').equals(lid).delete()
      }
      await database.session_exercises.where('session_id').equals(sessionId).delete()
      await database.workout_sessions.delete(sessionId)
    },
  )
}

export async function updateSessionNote(
  sessionId: string,
  notes: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.workout_sessions.get(sessionId)
  if (!existing) return
  await database.workout_sessions.put({ ...existing, notes: notes.trim() || undefined })
}

export async function updateSessionExerciseNote(
  sessionExerciseId: string,
  notes: string,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  const existing = await database.session_exercises.get(sessionExerciseId)
  if (!existing) return
  await database.session_exercises.put({ ...existing, notes: notes.trim() || undefined })
}
