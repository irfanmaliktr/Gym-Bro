import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Icon } from '../ui/Icon'
import type { NavKey } from './navItems'

interface HeaderProps {
  /** Currently active navigation key, used for the "| <Tab>" label. */
  tabKey: NavKey
}

/**
 * Mobile top app bar — derived verbatim from design-reference screen 2/3
 * `<header>` markup, with three deliberate adaptations:
 *  1. The Stitch-hosted logo <img> (lh3.googleusercontent.com) is replaced
 *     by the local text wordmark + neon dot from Screen 1 (offline mandate).
 *  2. "| Home" is dynamic per route (fixes the hardcoded label bug).
 *  3. The static "EN" pill becomes a working language toggle (I18N-002).
 */
export function Header({ tabKey }: HeaderProps) {
  const { t, lang, toggleLang } = useI18n()

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-bg-secondary/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)] md:hidden">
      <div className="h-14 px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          <Link to="/" className="flex items-baseline gap-1 select-none" aria-label="gymbro">
            <span className="font-title-md text-title-md tracking-tight uppercase text-text-primary">
              gymbro
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-neon shadow-lg shadow-accent-neon/30" />
          </Link>
          <span className="font-title-sm text-title-sm text-text-secondary font-medium ml-1 truncate">
            | {t(`nav.${tabKey}`)}
          </span>
        </div>
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            type="button"
            onClick={toggleLang}
            aria-label={`${lang === 'en' ? 'EN' : 'ID'} — ${t('header.switchLanguage')}`}
            className="flex items-center gap-1 px-2 py-1 rounded bg-surface-elevated text-text-secondary font-label-sm text-label-sm uppercase tracking-wider cursor-pointer transition-colors duration-200 hover:text-text-primary"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-neon" />
            {lang === 'en' ? 'EN' : 'ID'}
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Icon name="person" className="text-on-primary text-[18px]" />
          </div>
        </div>
      </div>
    </header>
  )
}
