export type NavKey = 'home' | 'workout' | 'history' | 'progress' | 'profile'

export interface NavItem {
  path: string
  key: NavKey
  icon: string
  /** Exact match only (used for the "/" route). */
  end?: boolean
}

/** The 5 primary navigation destinations (UI/UX spec §3.1). */
export const navItems: NavItem[] = [
  { path: '/', key: 'home', icon: 'home', end: true },
  { path: '/workout', key: 'workout', icon: 'fitness_center' },
  { path: '/history', key: 'history', icon: 'calendar_today' },
  { path: '/progress', key: 'progress', icon: 'trending_up' },
  { path: '/profile', key: 'profile', icon: 'person' },
]

/** Maps a pathname to its active navigation key (longest match wins). */
export function activeNavKey(pathname: string): NavKey {
  const sorted = [...navItems].sort((a, b) => b.path.length - a.path.length)
  const match = sorted.find((item) =>
    item.end ? pathname === item.path : pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
  return match?.key ?? 'home'
}
