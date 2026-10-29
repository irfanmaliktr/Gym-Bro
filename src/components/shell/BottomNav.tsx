import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Icon } from '../ui/Icon'
import { navItems } from './navItems'

/**
 * Mobile bottom navigation — markup derived verbatim from the design
 * references (byte-identical across screens 2, 3, 7, 8, 9):
 *
 *   <nav class="fixed bottom-0 w-full z-50 pb-safe bg-bg-secondary/95 ...">
 *
 * Adaptations:
 *  - `<a href="#">` replaced by router-aware <NavLink>.
 *  - Active state unified per UI spec: neon color + FILL 1 icon
 *    (the design references disagreed: screen 7 set FILL, screens 8/9 did not).
 *  - Labels localized (I18N-001).
 */
export function BottomNav() {
  const { t } = useI18n()

  return (
    <nav
      className="fixed bottom-0 w-full z-50 pb-safe bg-bg-secondary/95 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.5)] md:hidden"
      data-active-classes="text-accent-neon"
    >
      <div className="h-16 flex items-stretch justify-around px-space-xs">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                // Inactive tabs are interactive, so they use the AA-contrast
                // secondary token instead of `text-text-muted` (decision A).
                isActive ? 'text-accent-neon' : 'text-text-secondary hover:text-text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Routed through <Icon> so the 1em FOUT guard applies here too:
                    before the icon font loads, the raw ligature name would
                    otherwise widen the viewport on mobile. */}
                <Icon name={item.icon} fill={isActive} className="text-[24px]" />
                <span className="font-label-sm text-label-sm">{t(`nav.${item.key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
