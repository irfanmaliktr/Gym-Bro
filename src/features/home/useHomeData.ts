import { useMemo } from 'react'
import { useAppData } from '../../data/AppDataContext'
import { DEFAULT_DISPLAY_NAME, type RoutineBundle, type WorkoutSession } from '../../db'
import { countDayStreak, isoDateKey, isoWeekDates } from '../../lib/week'
import { deriveMilestones, type Milestone } from './milestones'

/**
 * Everything the Home dashboard needs, derived from stored data.
 *
 * The Phase 0 placeholder values are gone: the name comes from `user_profile`,
 * the streak and the weekly count are computed from *completed* sessions, the
 * routines are the real templates and the milestones are replayed PR history.
 * Nothing here is a stand-in, so an empty database produces empty sections
 * instead of a convincing-looking fake.
 */
export interface HomeDashboard {
  displayName: string
  /** Consecutive training days ending today; 0 hides the badge. */
  streakDays: number
  activeSession: WorkoutSession | null
  routines: RoutineBundle[]
  /** Completed *sessions* inside the current ISO week. */
  completedThisWeek: number
  /** Local day keys (`isoDateKey`) that hold at least one completed session. */
  completedDays: ReadonlySet<string>
  milestones: Milestone[]
}

export function useHomeData(): HomeDashboard {
  const { profile, routines, sessions, sessionExercises, setLogs, catalogById } = useAppData()

  const completedDays = useMemo(() => {
    const keys = new Set<string>()
    for (const session of sessions) {
      if (session.status === 'completed') keys.add(isoDateKey(new Date(session.start_timestamp)))
    }
    return keys
  }, [sessions])

  const completedThisWeek = useMemo(() => {
    const weekKeys = new Set(isoWeekDates().map(isoDateKey))
    return sessions.filter(
      (session) =>
        session.status === 'completed' && weekKeys.has(isoDateKey(new Date(session.start_timestamp))),
    ).length
  }, [sessions])

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === 'in_progress') ?? null,
    [sessions],
  )

  const milestones = useMemo(
    () => deriveMilestones(sessions, sessionExercises, setLogs, catalogById),
    [sessions, sessionExercises, setLogs, catalogById],
  )

  const streakDays = useMemo(() => countDayStreak(completedDays), [completedDays])

  return {
    displayName: profile?.display_name ?? DEFAULT_DISPLAY_NAME,
    streakDays,
    activeSession,
    routines,
    completedThisWeek,
    completedDays,
    milestones,
  }
}
