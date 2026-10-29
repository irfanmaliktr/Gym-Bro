import { NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Icon } from '../ui/Icon'
import { navItems } from './navItems'
import { useAppData } from '../../data/AppDataContext'
import { DEFAULT_DISPLAY_NAME } from '../../db'

/**
 * Desktop left sidebar (>=768px) — required by UI/UX spec §3.1:
 * "Fixed left panel (width: 240px), containing branding logo, 5 primary
 * navigation links with active indicators, and user profile widget at bottom."
 *
 * The Stitch references only contain the mobile bottom bar, so this component
 * is composed from existing design recipes (bg-bg-secondary header surface,
 * accent-neon-dim active state, 44px touch targets, label/body type tokens).
 */
export function SideNav() {
  const { t, lang, toggleLang } = useI18n()
  const { profile } = useAppData()
  const displayName = profile?.display_name?.trim() || DEFAULT_DISPLAY_NAME

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col bg-bg-secondary border-r border-border-subtle">
      <div className="h-14 px-margin flex items-center justify-between border-b border-border-subtle">
        <span className="flex items-baseline gap-1 select-none">
          <span className="font-title-md text-title-md tracking-tight uppercase text-text-primary">
            gymbro
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-neon shadow-lg shadow-accent-neon/30" />
        </span>
        <button
          type="button"
          onClick={toggleLang}
          aria-label={`${lang === 'en' ? 'EN' : 'ID'} — ${t('header.switchLanguage')}`}
          className="flex items-center gap-1 px-2 py-1 rounded bg-surface-elevated text-text-secondary font-label-sm text-label-sm uppercase tracking-wider cursor-pointer transition-colors duration-200 hover:text-text-primary"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-neon" />
          {lang === 'en' ? 'EN' : 'ID'}
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 rounded-lg min-h-[44px] transition-colors duration-200 ${
                isActive
                  ? 'bg-accent-neon-dim text-accent-neon font-body-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} fill={isActive} className="text-[22px]" />
                <span className="font-body-md text-body-md">{t(`nav.${item.key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-border-subtle flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Icon name="person" className="text-on-primary text-[20px]" />
        </div>
        <div className="min-w-0">
          <p className="font-body-bold text-body-bold text-text-primary truncate">
            {displayName}
          </p>
          <p className="font-label-sm text-label-sm text-text-secondary truncate">
            {t('profile.localFirst')}
          </p>
        </div>
      </div>
    </aside>
  )
}
