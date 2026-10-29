import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { SideNav } from './SideNav'
import { activeNavKey } from './navItems'

/**
 * Application shell — responsive layout per UI/UX spec §3.1:
 *  - <768px:  fixed top header (56px) + fixed bottom nav (64px),
 *             content padded `pt-14 pb-28` exactly like the Stitch screens.
 *  - >=768px: fixed 240px left sidebar, content max-width 1024px centered.
 *
 * Screen 6 (Workout Summary) is intentionally NOT wrapped in this shell —
 * it renders as a full-screen modal in its feature phase.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const tabKey = activeNavKey(pathname)

  return (
    <>
      <Header tabKey={tabKey} />
      <SideNav />
      {/*
        NOTE: `md:w-auto` (not `w-full`) is required on desktop. With
        `w-full` + `md:ml-60`, main kept 100% width *plus* a 240px margin,
        which pushed the whole content area 240px past the viewport and
        clipped the cards (the "text overflows the content area" bug).
        With `w-auto` the flex column stretches main to the remaining space.
      */}
      <main className="flex-1 flex flex-col relative w-full md:w-auto px-margin pt-14 pb-28 bg-bg-canvas md:ml-60 md:pt-6 md:pb-12">
        <div className="flex flex-col w-full max-w-[1024px] mx-auto gap-space-lg">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </>
  )
}
