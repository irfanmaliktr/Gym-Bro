import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { useAppData } from '../../data/AppDataContext'
import { getSession, getSessionExercises, getSetLogsForSession, listCompletedSessions } from '../../db'
import { useI18n } from '../../i18n'
import { formatVolume, formatWeight } from '../../lib/units'
import { evaluateSetsPrs, type PrAchievement } from '../../lib/pr'
import { totalVolume } from '../../lib/volume'

export function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { unit, catalogById, actions } = useAppData()

  const [session, setSession] = useState<any>(null)
  const [links, setLinks] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prs, setPrs] = useState<PrAchievement[]>([])

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const s = await getSession(id)
        setSession(s)
        const l = await getSessionExercises(id)
        setLinks(l)
        const lg = await getSetLogsForSession(id)
        setLogs(lg)
        if (s?.status === 'completed') {
          // compute PRs simply from this session vs history
          const completed = await listCompletedSessions()
          // build state by replaying history up to before this session
          const { buildPrState } = await import('../../lib/pr')
          const states = new Map<string, any>()
          for (const cs of completed) {
            if (cs.id === id) continue
            const cLinks = await getSessionExercises(cs.id)
            const cLogs = await getSetLogsForSession(cs.id)
            for (const cl of cLinks) {
              const sets = cLogs.filter((sl: any) => sl.session_exercise_id === cl.id && sl.is_completed).map((sl: any) => ({ weight_kg: sl.weight_kg, reps: sl.reps, is_completed: true }))
              const type = catalogById.get(cl.exercise_id)?.type || 'weight_reps'
              states.set(cl.exercise_id, buildPrState(sets, type, states.get(cl.exercise_id)))
            }
          }
          const allAchievements: PrAchievement[] = []
          for (const cl of l) {
            const sets = lg.filter((sl: any) => sl.session_exercise_id === cl.id && sl.is_completed).map((sl: any) => ({ weight_kg: sl.weight_kg, reps: sl.reps, is_completed: true }))
            const type = catalogById.get(cl.exercise_id)?.type || 'weight_reps'
            const ev = evaluateSetsPrs(sets, states.get(cl.exercise_id), type)
            allAchievements.push(...ev.achievements)
            states.set(cl.exercise_id, ev.state)
          }
          setPrs(allAchievements)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
        await actions.refresh()
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const completedSets = useMemo(() => logs.filter((l) => l.is_completed), [logs])
  const durationMin = session?.duration_seconds ? Math.round(session.duration_seconds / 60) : 0
  const totalVol = useMemo(() => {
    let v = 0
    for (const cl of links) {
      const type = catalogById.get(cl.exercise_id)?.type || 'weight_reps'
      v += totalVolume(logs.filter((sl) => sl.session_exercise_id === cl.id), type, { includeWarmups: true })
    }
    return v
  }, [links, logs, catalogById])

  if (loading) {
    return <div className="min-h-screen bg-bg-canvas flex items-center justify-center"><p className="text-text-secondary">{t('common.loading')}</p></div>
  }

  return (
    <div className="min-h-screen bg-bg-canvas px-margin py-6">
      <div className="max-w-[700px] mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-mobile text-display-mobile text-text-primary">{t('summary.title')}</h1>
            <p className="font-body-sm text-text-secondary mt-1">{t('summary.tagline', { name: session?.workout_name_snap || '' })}</p>
          </div>
          <button onClick={() => navigate('/')} className="w-11 h-11 rounded-full bg-surface-elevated flex items-center justify-center">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('summary.duration')}</p>
            <p className="font-numeric-input text-text-primary mt-1">{t('summary.minutes', { count: durationMin })}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('summary.volume')}</p>
            <p className="font-numeric-input text-text-primary mt-1">{formatVolume(totalVol, unit, locale, { decimals: 0, unitLabel: t(`unit.${unit}`) })}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('summary.sets')}</p>
            <p className="font-numeric-input text-text-primary mt-1">{t('summary.setsValue', { count: completedSets.length })}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('summary.milestones')}</p>
            <p className="font-numeric-input text-accent-neon mt-1">{prs.length === 0 ? t('summary.prsNone') : prs.length === 1 ? t('summary.prsCountOne') : t('summary.prsCount', { count: prs.length })}</p>
          </div>
        </div>

        {prs.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-title-sm text-title-sm text-text-primary">{t('summary.recordsTitle')}</h2>
              <span className="px-2 py-0.5 rounded-full bg-accent-neon text-text-on-accent font-label-sm">{prs.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {prs.map((pr, idx) => (
                <div key={idx} className="bg-surface-elevated rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-body-bold text-text-primary">{t(`summary.prKind.${pr.kind}` as any)}</p>
                    <p className="font-title-sm text-accent-neon mt-0.5">{pr.kind === 'max_reps' ? `${pr.value} ${t('home.milestones.reps')}` : `${formatWeight(pr.kind === 'max_volume_set' ? pr.value : pr.value, unit, locale, { decimals: 1 })} ${t(`unit.${unit}`)}`}</p>
                    {pr.previous > 0 && <p className="font-body-sm text-text-secondary">{t('summary.previousValue', { value: pr.kind === 'max_reps' ? pr.previous : formatWeight(pr.kind === 'max_volume_set' ? pr.previous : pr.previous, unit, locale, { decimals: 1 }) })}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-accent-neon-dim text-accent-neon font-label-sm">{t('summary.allTimeBest')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-title-sm text-title-sm text-text-primary">{t('summary.exerciseSummary')}</h2>
            <span className="font-label-sm text-text-muted">{t('summary.movements', { count: links.length })}</span>
          </div>
          <div className="bg-surface-card rounded-xl overflow-hidden">
            {links.map((cl, idx) => {
              const lgs = logs.filter((sl) => sl.session_exercise_id === cl.id && sl.is_completed)
              const top = lgs.sort((a, b) => b.weight_kg - a.weight_kg)[0]
              return (
                <div key={cl.id} className={`flex items-center justify-between p-3 ${idx % 2 === 0 ? 'bg-surface-card' : 'bg-surface-container-low'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center font-label-sm text-text-muted">{idx + 1}</span>
                    <div>
                      <p className="font-body-bold text-text-primary">{cl.exercise_name_snap}</p>
                      <p className="font-body-sm text-text-secondary">{t('summary.setsCompleted', { count: lgs.length })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {top ? <p className="font-body-bold text-text-primary">{formatWeight(top.weight_kg, unit, locale, { decimals: 1 })} {t(`unit.${unit}`)} × {top.reps}</p> : <p className="font-body-sm text-text-secondary">—</p>}
                    <p className="font-label-sm text-text-muted">{t('summary.topSet')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <button onClick={() => navigate('/')} className="w-full h-[52px] rounded-full bg-accent-neon text-text-on-accent font-title-sm font-bold flex items-center justify-center gap-2">
          <Icon name="check" className="text-[20px]" fill />
          <span>{t('summary.saveHome')}</span>
        </button>
      </div>
    </div>
  )
}
