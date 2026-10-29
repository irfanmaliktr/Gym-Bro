import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../../data/AppDataContext'
import { useI18n } from '../../i18n'
import type { Unit } from '../../lib/units'
import { SegmentedControl } from './SegmentedControl'

/**
 * Screen 1 — first-time onboarding (ONBD-001…005, PRD §7 Flow A).
 *
 * Rendered outside the app shell (the reference is a `mobile_blank` canvas:
 * no header, no bottom nav). Both actions write the `user_profile` row, which is
 * what marks onboarding as done — "Skip" stores the defaults rather than
 * deferring, otherwise the next launch would land back here forever.
 *
 * Three deliberate departures from the reference copy:
 *  1. The CTA's "Preparing Gym Floor…" spinner label is replaced by a real
 *     saving state — the button now awaits the actual IndexedDB write.
 *  2. The micro-feature row keeps only claims that are true today
 *     (local-first / no account / on this device). "Zero Lag" and "100% Offline"
 *     are not verifiable until the PWA work in Phase 7 lands, so they are gone.
 *  3. Muted `text-text-muted` labels (decision A) are rendered in
 *     `text-text-secondary` to stay above WCAG AA.
 */
export function OnboardingPage() {
  const { t, lang, setLang } = useI18n()
  const { profile, actions } = useAppData()
  const showToast = useToast()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<Unit>('kg')
  const [saving, setSaving] = useState(false)

  // A returning user has no business on this screen.
  if (profile) return <Navigate to="/" replace />

  const finish = async (name: string) => {
    if (saving) return
    setSaving(true)
    try {
      await actions.completeOnboarding({ displayName: name, unit: selectedUnit })
      navigate('/', { replace: true })
    } catch (error) {
      console.error('[gymbro] onboarding could not be saved', error)
      showToast(t('onboarding.saveFailed'), 'info')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-margin py-10">
      <div className="w-full max-w-md flex flex-col gap-space-lg">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex items-baseline gap-1 select-none">
            <span className="font-display-mobile text-display-mobile tracking-tight uppercase text-text-primary">
              gymbro
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-neon shadow-lg shadow-accent-neon/30" />
          </span>
        </div>

        <div className="bg-surface-card rounded-xl p-space-md shadow-md flex flex-col gap-space-md">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="font-title-lg text-title-lg text-text-primary tracking-tight">
              {t('onboarding.headline')}
            </h1>
            <p className="font-body-sm text-body-sm text-text-secondary">{t('onboarding.subtitle')}</p>
          </div>

          {/* Display name — ONBD-002, optional */}
          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="display-name"
              className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-wider text-text-secondary"
            >
              <Icon name="person" className="text-text-secondary text-[16px]" />
              <span>
                {t('onboarding.displayName')}{' '}
                <span className="normal-case tracking-normal">{t('onboarding.optional')}</span>
              </span>
            </label>
            <input
              id="display-name"
              name="displayName"
              type="text"
              autoComplete="nickname"
              maxLength={40}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t('onboarding.namePlaceholder')}
              className="w-full bg-bg-canvas text-text-primary font-body-md text-body-md p-3 rounded-lg outline-none transition-all placeholder:text-text-secondary focus:shadow-[0_0_16px_rgba(182,255,0,0.15)]"
            />
          </div>

          {/* Language — ONBD-004 (persisted straight away through `app_settings`) */}
          <SegmentedControl
            label={t('onboarding.language')}
            icon="language"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: t('onboarding.langEn') },
              { value: 'id', label: t('onboarding.langId') },
            ]}
          />

          {/* Unit — ONBD-003 (storage stays kg; this is the display projection) */}
          <SegmentedControl
            label={t('onboarding.unit')}
            icon="fitness_center"
            value={selectedUnit}
            onChange={setSelectedUnit}
            options={[
              { value: 'kg', label: t('onboarding.unitKg') },
              { value: 'lbs', label: t('onboarding.unitLbs') },
            ]}
          />

          <div className="bg-surface-elevated rounded-lg p-3 flex items-center justify-around text-text-secondary mt-1">
            {(['localFirst', 'noAccount', 'onDevice'] as const).map((key, index) => (
              <div key={key} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="w-1 h-1 rounded-full bg-surface-container-high -ml-1.5 mr-1.5" />
                ) : null}
                <Icon
                  name={key === 'localFirst' ? 'bolt' : key === 'noAccount' ? 'shield' : 'devices'}
                  className="text-accent-neon text-[16px]"
                />
                <span className="font-label-sm text-label-sm">{t(`onboarding.${key}`)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => void finish(displayName)}
              disabled={saving}
              className="w-full bg-accent-neon hover:bg-accent-neon-hover active:scale-[0.98] text-text-on-accent font-title-sm text-title-sm min-h-[48px] py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-150 shadow-lg shadow-accent-neon/15 disabled:opacity-70"
            >
              <span>{saving ? t('onboarding.saving') : t('onboarding.start')}</span>
              <Icon name={saving ? 'progress_activity' : 'arrow_forward'} className={`text-xl ${saving ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => void finish('')}
              disabled={saving}
              className="w-full min-h-[44px] py-2.5 flex items-center justify-center text-center font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors duration-150 disabled:opacity-60"
            >
              {t('onboarding.skip')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-text-secondary font-label-sm text-label-sm">
          <Icon name="lock" className="text-sm" />
          <span>{t('onboarding.onDeviceNote')}</span>
        </div>
      </div>
    </div>
  )
}
