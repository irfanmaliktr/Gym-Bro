import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Icon } from '../../../components/ui/Icon'
import { useToast } from '../../../components/ui/Toast'
import { useAppData } from '../../../data/AppDataContext'
import { discardSession } from '../../../db'
import type { WorkoutSession } from '../../../db'
import { useI18n } from '../../../i18n'

interface ActiveSessionBannerProps {
  /** The open session from `workout_sessions`, or `null` when none is running. */
  session: WorkoutSession | null
}

/**
 * Section 2 of design-reference/screen_2 — "In-Progress Workout Detected".
 *
 * Phase 0 faked this banner from mock data; it is now driven by the real
 * `in_progress` row (LOG-008) and renders nothing when there is none, which is
 * always the case until workout logging ships in Phase 3.
 *
 * The elapsed time and exercise count are computed from that session's
 * `start_timestamp` and its own `session_exercises`. "Discard" does not pretend
 * to delete anything: discarding a session is part of the Phase 3 screen, so the
 * button reports that honestly instead of silently hiding a real row (the Phase 0
 * version merely hid the banner, which would have orphaned the session).
 */
export function ActiveSessionBanner({ session }: ActiveSessionBannerProps) {
  const { t } = useI18n()
  const { sessionExercises, actions } = useAppData()
  const navigate = useNavigate()
  const showToast = useToast()
  const [discardOpen, setDiscardOpen] = useState(false)

  if (!session) return null

  const startedMinutesAgo = Math.max(
    0,
    Math.round((Date.now() - session.start_timestamp) / 60_000),
  )
  const loggedExercises = sessionExercises.filter((link) => link.session_id === session.id).length

  return (
    <section
      id="in-progress-alert"
      className="relative overflow-hidden rounded-xl bg-status-warning-dim p-4 shadow-md transition-all duration-300"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-status-warning" />
      <div className="flex items-start gap-3 pl-1">
        <div className="w-9 h-9 rounded-lg bg-status-warning/20 flex items-center justify-center shrink-0 text-status-warning mt-0.5">
          <Icon name="timer" className="text-[22px] animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-status-warning font-bold flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-status-warning animate-ping shrink-0" />
              <span className="truncate">{t('home.inProgress.label')}</span>
            </span>
            <span className="font-label-sm text-label-sm text-status-warning font-semibold shrink-0">
              {t('home.inProgress.elapsed', { minutes: startedMinutesAgo })}
            </span>
          </div>
          <p className="font-title-sm text-title-sm text-text-primary font-semibold truncate mt-0.5">
            {session.workout_name_snap}
          </p>
          <p className="font-body-sm text-body-sm text-text-secondary">
            {t('home.inProgress.startedAgo', {
              minutes: startedMinutesAgo,
              exercises: loggedExercises,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3.5">
            {/*
             * At 390px the content column is 274px wide while "Resume Workout"
             * (191.6px) + "Discard" (105.2px) + gap need ~309px, and the
             * Indonesian labels are longer still. Squeezing both onto one line
             * only worked with unreadable padding, so on mobile each action
             * takes a full row (large, thumb-friendly targets, nothing clipped)
             * and from `md` up — where the sidebar frees 240px — they sit side
             * by side exactly as designed.
             */}
            <button
              type="button"
              onClick={() => navigate(`/session/${session.id}`)}
              className="w-full md:w-auto min-h-[44px] px-4 py-2 bg-status-warning hover:bg-status-warning/90 active:scale-95 text-text-on-accent font-title-sm text-title-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Icon name="play_arrow" fill className="text-[20px]" />
              <span>{t('home.inProgress.resume')}</span>
            </button>
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              className="w-full md:w-auto min-h-[44px] px-3 py-2 text-text-secondary hover:text-status-error active:scale-95 font-title-sm text-title-sm transition-colors flex items-center justify-center gap-1"
            >
              <Icon name="delete" className="text-[18px]" />
              <span>{t('home.inProgress.discard')}</span>
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={discardOpen}
        title={t('home.inProgress.discardConfirmTitle')}
        body={t('home.inProgress.discardConfirmBody')}
        confirmLabel={t('home.inProgress.discardConfirm')}
        cancelLabel={t('home.inProgress.keepWorkout')}
        destructive
        onConfirm={async () => {
          await discardSession(session.id)
          await actions.refresh()
          showToast(t('session.toastDiscarded'), 'info')
          setDiscardOpen(false)
          navigate('/')
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </section>
  )
}
