import { Navigate, Outlet } from 'react-router-dom'
import { useAppData } from '../../data/AppDataContext'

/**
 * Flow A gate (PRD §7): onboarding is "not done" exactly when `user_profile`
 * has no row — that is how a brand-new install is detected, and it is why the
 * repository never writes a default profile at bootstrap.
 *
 * `AppDataProvider` already blocks on `AppBootScreen` until the first IndexedDB
 * read resolves, so the decision here is always made against real stored data
 * and a returning user is never bounced to `/welcome` during startup.
 *
 * The editor routes (`/routines/...`) sit behind this same gate: they render
 * outside the shell, so without it a direct URL would open a routine editor for
 * a user who has never completed onboarding.
 */
export function RequireProfile() {
  const { profile } = useAppData()

  if (!profile) return <Navigate to="/welcome" replace />

  return <Outlet />
}
