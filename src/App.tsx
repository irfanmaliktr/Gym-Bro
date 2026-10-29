import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireProfile } from './components/shell/RequireProfile'
import { AppShell } from './components/shell/AppShell'
import { HistoryPage } from './features/history/HistoryPage'
import { HomePage } from './features/home/HomePage'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ProgressPage } from './features/progress/ProgressPage'
import { RoutineEditorPage } from './features/routines/RoutineEditorPage'
import { WorkoutPage } from './features/workout/WorkoutPage'
import { ActiveSessionPage } from './features/session/ActiveSessionPage'
import { SessionSummaryPage } from './features/session/SessionSummaryPage'

/**
 * Route map:
 *   /welcome                     Onboarding       (Screen 1, outside the shell)
 *   /                            Home             (Screen 2)
 *   /workout                     Workout          (Screen 3)
 *   /routines/new                Routine editor   (Screen 4, outside the shell)
 *   /routines/:routineId/edit    Routine editor   (Screen 4, outside the shell)
 *   /session/:id                 Active workout   (Screen 5, Phase 3)
 *   /session/:id/summary         Workout summary  (Screen 6, Phase 3)
 *   /history                     History          (Screen 7)
 *   /progress                    Progress         (Screen 8)
 *   /profile                     Profile          (Screen 9)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<OnboardingPage />} />

        <Route element={<RequireProfile />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Unknown paths inside the shell keep the nav chrome and land on Home. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="/routines/new" element={<RoutineEditorPage />} />
          <Route path="/routines/:routineId/edit" element={<RoutineEditorPage />} />
          <Route path="/session/:id" element={<ActiveSessionPage />} />
          <Route path="/session/:id/summary" element={<SessionSummaryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
