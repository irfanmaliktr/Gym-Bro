import { useI18n } from '../../i18n'
import { formatLongDate } from '../../lib/week'
import { ActiveSessionBanner } from './components/ActiveSessionBanner'
import { HomeGreeting } from './components/HomeGreeting'
import { QuickStart } from './components/QuickStart'
import { RecentMilestones } from './components/RecentMilestones'
import { WeeklyActivity } from './components/WeeklyActivity'
import { useHomeData } from './useHomeData'

/**
 * Home dashboard — visual implementation of design-reference/screen_2
 * (sections 1–5 of the reference, same order and same utility classes).
 *
 * Phase 2 removed the last of the Phase 0 placeholder data: every section is
 * fed by `useHomeData`, which reads the local database. On a fresh install that
 * means a greeting with the stored name, an empty routine strip with a real
 * "create your first routine" action, a zero-count week and an empty milestone
 * card — honest emptiness rather than a convincing mock.
 */
export function HomePage() {
  const { locale } = useI18n()
  const { displayName, streakDays, activeSession, routines, completedThisWeek, completedDays, milestones } =
    useHomeData()

  return (
    <>
      <HomeGreeting
        dateLabel={formatLongDate(locale)}
        displayName={displayName}
        streakDays={streakDays}
      />
      <ActiveSessionBanner session={activeSession} />
      <QuickStart routines={routines} />
      <WeeklyActivity completedDays={completedDays} completedThisWeek={completedThisWeek} />
      <RecentMilestones milestones={milestones} />
    </>
  )
}
