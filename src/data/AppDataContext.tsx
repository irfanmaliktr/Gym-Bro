import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createExercise as insertExercise,
  createRoutine as insertRoutine,
  deleteExercise as removeExercise,
  deleteRoutine as removeRoutine,
  duplicateRoutine as copyRoutine,
  getProfile,
  getUnit,
  listExercises,
  listRoutineBundles,
  listSessionExercises,
  listSessions,
  listSetLogs,
  saveProfile,
  setExerciseArchived as persistExerciseArchived,
  setRoutineArchived as persistRoutineArchived,
  setUnit as persistUnit,
  updateExercise as replaceExercise,
  updateRoutine as replaceRoutine,
  type ExerciseDeleteOutcome,
  type ExerciseInput,
  type RoutineBundle,
  type RoutineInput,
} from '../db'
import type { ExerciseCatalogItem, SessionExercise, SetLog, UserProfile, WorkoutSession } from '../db'
import type { Unit } from '../lib/units'
import { AppBootScreen } from '../components/ui/AppBootScreen'

/**
 * Single source of truth for everything the UI reads out of IndexedDB.
 *
 * Volumes here are single-user (a handful of routines, a few thousand log rows),
 * so the provider loads once and re-reads after every mutation. That trades a
 * few milliseconds for one property that matters more: the screens can never
 * show stale or optimistic-but-unwritten data. When Phase 4/5 grow the history
 * the load can be narrowed per feature without touching callers.
 */

export interface AppDataActions {
  /** Creates the `user_profile` row (ONBD-002/ONBD-005) and stores the unit. */
  completeOnboarding(input: { displayName: string; unit: Unit }): Promise<void>
  setUnitPreference(unit: Unit): Promise<void>
  /** Passing `null` creates a routine; otherwise the routine is replaced. */
  saveRoutine(id: string | null, input: RoutineInput): Promise<string>
  duplicateRoutineById(id: string, copyLabel: string): Promise<string | null>
  setRoutineArchivedById(id: string, archived: boolean): Promise<void>
  deleteRoutineById(id: string): Promise<void>
  saveExercise(id: string | null, input: ExerciseInput): Promise<string>
  setExerciseArchivedById(id: string, archived: boolean): Promise<void>
  deleteExerciseById(id: string): Promise<ExerciseDeleteOutcome>
  refresh(): Promise<void>
}

interface AppDataValue {
  ready: boolean
  profile: UserProfile | null
  unit: Unit
  /** Active routines, most recently edited first. */
  routines: RoutineBundle[]
  archivedRoutines: RoutineBundle[]
  /** Active catalog. */
  exercises: ExerciseCatalogItem[]
  archivedExercises: ExerciseCatalogItem[]
  /** Every catalog row, archived included — routine links may point at hidden ones. */
  catalogById: Map<string, ExerciseCatalogItem>
  sessions: WorkoutSession[]
  sessionExercises: SessionExercise[]
  setLogs: SetLog[]
  actions: AppDataActions
}

interface Snapshot {
  profile: UserProfile | null
  unit: Unit
  routines: RoutineBundle[]
  archivedRoutines: RoutineBundle[]
  exercises: ExerciseCatalogItem[]
  archivedExercises: ExerciseCatalogItem[]
  sessions: WorkoutSession[]
  sessionExercises: SessionExercise[]
  setLogs: SetLog[]
}

const EMPTY_SNAPSHOT: Snapshot = {
  profile: null,
  unit: 'kg',
  routines: [],
  archivedRoutines: [],
  exercises: [],
  archivedExercises: [],
  sessions: [],
  sessionExercises: [],
  setLogs: [],
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const [profile, unit, allRoutines, allExercises, sessions, sessionExercises, setLogs] =
      await Promise.all([
        getProfile(),
        getUnit(),
        listRoutineBundles({ includeArchived: true }),
        listExercises({ includeArchived: true }),
        listSessions(),
        listSessionExercises(),
        listSetLogs(),
      ])

    setSnapshot({
      profile,
      unit,
      routines: allRoutines.filter((bundle) => !bundle.routine.is_archived),
      archivedRoutines: allRoutines.filter((bundle) => bundle.routine.is_archived),
      exercises: allExercises.filter((exercise) => !exercise.is_archived),
      archivedExercises: allExercises.filter((exercise) => exercise.is_archived),
      sessions,
      sessionExercises,
      setLogs,
    })
    setReady(true)
  }, [])

  useEffect(() => {
    void load().catch((error: unknown) => {
      console.error('[gymbro] failed to load local data', error)
      // Still become "ready" so the shell renders instead of hanging on the
      // boot screen; the failure stays visible in the console.
      setReady(true)
    })
  }, [load])

  const actions = useMemo<AppDataActions>(
    () => ({
      async completeOnboarding({ displayName, unit }) {
        await saveProfile({ displayName })
        await persistUnit(unit)
        await load()
      },
      async setUnitPreference(unit) {
        await persistUnit(unit)
        await load()
      },
      async saveRoutine(id, input) {
        const routineId = id === null ? await insertRoutine(input) : (await replaceRoutine(id, input), id)
        await load()
        return routineId
      },
      async duplicateRoutineById(id, copyLabel) {
        const copyId = await copyRoutine(id, { copyLabel })
        await load()
        return copyId
      },
      async setRoutineArchivedById(id, archived) {
        await persistRoutineArchived(id, archived)
        await load()
      },
      async deleteRoutineById(id) {
        await removeRoutine(id)
        await load()
      },
      async saveExercise(id, input) {
        const exerciseId = id === null ? await insertExercise(input) : (await replaceExercise(id, input), id)
        await load()
        return exerciseId
      },
      async setExerciseArchivedById(id, archived) {
        await persistExerciseArchived(id, archived)
        await load()
      },
      async deleteExerciseById(id) {
        const outcome = await removeExercise(id)
        await load()
        return outcome
      },
      refresh: load,
    }),
    [load],
  )

  const value = useMemo<AppDataValue>(() => {
    const catalogById = new Map<string, ExerciseCatalogItem>()
    for (const exercise of [...snapshot.exercises, ...snapshot.archivedExercises]) {
      catalogById.set(exercise.id, exercise)
    }
    return { ready: true, ...snapshot, catalogById, actions }
  }, [snapshot, actions])

  if (!ready) return <AppBootScreen />

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used within <AppDataProvider>')
  return context
}
