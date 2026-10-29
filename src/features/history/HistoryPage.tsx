import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAppData } from '../../data/AppDataContext'
import { useI18n } from '../../i18n'
import { formatVolume, formatWeight, kgToLb, parseDecimal, parseWeightInput } from '../../lib/units'
import { totalVolume } from '../../lib/volume'
import type { SessionExercise, SetLog, WorkoutSession } from '../../db'
import {
  deleteCompletedSession,
  getSessionExercises,
  getSetLogsForSession,
  listCompletedSessions,
  updateSetLog,
  updateSessionNote,
} from '../../db'
import { evaluateSetsPrs, type PrAchievement } from '../../lib/pr'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'

interface HistoryEntry {
  session: WorkoutSession
  exercises: SessionExercise[]
  logs: SetLog[]
}

function formatDurationSec(sec?: number | null) {
  const s = Math.max(0, Math.floor(sec ?? 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return { h, m }
}

function formatDate(ts: number, locale: string) {
  try {
    const d = new Date(ts)
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return ''
  }
}

export function HistoryPage() {
  const { t, locale } = useI18n()
  const { unit, catalogById, actions } = useAppData()
  const navigate = useNavigate()
  const showToast = useToast()

  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'thisWeek' | 'thisMonth' | 'month'>('all')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null)
  const [prsBySession, setPrsBySession] = useState<Record<string, PrAchievement[]>>({})
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const sessions = await listCompletedSessions()
      const list: HistoryEntry[] = []
      for (const s of sessions) {
        const exercises = await getSessionExercises(s.id)
        const logs = await getSetLogsForSession(s.id)
        list.push({ session: s, exercises, logs })
      }
      setEntries(list)

      const map: Record<string, PrAchievement[]> = {}
      const stateMap = new Map<string, any>()
      for (const e of list) {
        const completedSets = (exId: string) =>
          e.logs
            .filter((l) => l.session_exercise_id === exId && l.is_completed)
            .map((l) => ({ weight_kg: l.weight_kg, reps: l.reps, is_completed: true }))
        const ach: PrAchievement[] = []
        for (const ex of e.exercises) {
          const type = catalogById.get(ex.exercise_id)?.type || 'weight_reps'
          const ev = evaluateSetsPrs(completedSets(ex.id), stateMap.get(ex.exercise_id), type)
          ach.push(...ev.achievements)
          stateMap.set(ex.exercise_id, ev.state)
        }
        map[e.session.id] = ach
      }
      setPrsBySession(map)

      const notesMap: Record<string, string> = {}
      for (const e of list) notesMap[e.session.id] = e.session.notes || ''
      setSessionNotes(notesMap)
    } catch (e) {
      console.error('[gymbro] failed to load history', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (filter === 'thisWeek') {
        const now = new Date()
        const start = new Date(now)
        start.setDate(now.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        if (new Date(e.session.start_timestamp) < start) return false
      } else if (filter === 'thisMonth') {
        const now = new Date()
        const d = new Date(e.session.start_timestamp)
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false
      } else if (filter === 'month') {
        const d = new Date(e.session.start_timestamp)
        if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return false
      }
      if (!q) return true
      if (e.session.workout_name_snap.toLowerCase().includes(q)) return true
      if ((e.session.notes || '').toLowerCase().includes(q)) return true
      for (const ex of e.exercises) {
        if (ex.exercise_name_snap.toLowerCase().includes(q)) return true
        if ((ex.notes || '').toLowerCase().includes(q)) return true
      }
      return false
    })
  }, [entries, search, filter, selectedMonth, selectedYear])

  const stats = useMemo(() => {
    let sessionsCount = filtered.length
    let totalVol = 0
    let totalSets = 0
    let gymSec = 0
    for (const e of filtered) {
      for (const ex of e.exercises) {
        const type = catalogById.get(ex.exercise_id)?.type || 'weight_reps'
        const exLogs = e.logs.filter((l) => l.session_exercise_id === ex.id)
        totalVol += totalVolume(exLogs, type, { includeWarmups: true })
      }
      totalSets += e.logs.filter((l) => l.is_completed).length
      gymSec += e.session.duration_seconds ?? 0
    }
    const { h, m } = formatDurationSec(gymSec)
    const gymTimeStr = h > 0 ? `${h}h ${m}m` : `${m}m`
    return { sessions: sessionsCount, totalVol, totalSets, gymTime: gymTimeStr }
  }, [filtered, catalogById])

  const toggle = (id: string) => setExpanded((v) => (v === id ? null : id))

  const saveSet = async (logId: string, patch: any) => {
    await updateSetLog({ setLogId: logId, ...patch })
    await load()
    await actions.refresh()
    showToast(t('common.saved') as string, 'info')
  }

  const saveSessionNote = async (id: string, text: string) => {
    await updateSessionNote(id, text)
    setSessionNotes((m) => ({ ...m, [id]: text }))
    await load()
    await actions.refresh()
    showToast(t('common.saved') as string, 'info')
  }

  const remove = async () => {
    if (!pendingDelete) return
    await deleteCompletedSession(pendingDelete.session.id)
    setPendingDelete(null)
    await load()
    await actions.refresh()
    showToast(t('common.deleted') as string, 'info')
  }

  return (
    <>
      <PageHeader title={t('history.title') as string} subtitle={t('history.subtitle') as string} />
      <main className="px-margin pb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-surface-card rounded-xl px-3 py-2 shadow-sm">
            <Icon name="search" className="text-text-muted text-[18px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('history.searchPlaceholder') as string}
              className="flex-1 bg-transparent py-2 font-body-sm text-text-primary outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="w-8 h-8 rounded-full flex items-center justify-center">
                <Icon name="close" className="text-text-muted text-[18px]" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-full font-label-sm whitespace-nowrap ${filter === 'all' ? 'bg-accent-neon text-text-on-accent' : 'bg-surface-elevated text-text-secondary'}`}
              >
                {t('history.filterAll') as string}
              </button>
              <button
                onClick={() => setFilter('thisWeek')}
                className={`px-3 py-1.5 rounded-full font-label-sm whitespace-nowrap ${filter === 'thisWeek' ? 'bg-accent-neon text-text-on-accent' : 'bg-surface-elevated text-text-secondary'}`}
              >
                {(t('history.filterThisWeek') as string) || 'This Week'}
              </button>
              <button
                onClick={() => setFilter('thisMonth')}
                className={`px-3 py-1.5 rounded-full font-label-sm whitespace-nowrap ${filter === 'thisMonth' ? 'bg-accent-neon text-text-on-accent' : 'bg-surface-elevated text-text-secondary'}`}
              >
                {(t('history.filterThisMonth') as string) || 'This Month'}
              </button>
              <button
                onClick={() => setFilter('month')}
                className={`px-3 py-1.5 rounded-full font-label-sm whitespace-nowrap ${filter === 'month' ? 'bg-accent-neon text-text-on-accent' : 'bg-surface-elevated text-text-secondary'}`}
              >
                {locale === 'id' ? 'Bulan/Tahun' : 'Month/Year'}
              </button>
            </div>
            {filter === 'month' && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
                >
                  {(locale === 'id' ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']).map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('history.sessions') as string}</p>
            <p className="font-numeric-input text-text-primary mt-1">{stats.sessions}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('history.volume') as string}</p>
            <p className="font-numeric-input text-text-primary mt-1">{formatVolume(stats.totalVol, unit, locale, { decimals: 0, unitLabel: t(`unit.${unit}`) as string })}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('history.sets') as string}</p>
            <p className="font-numeric-input text-text-primary mt-1">{stats.totalSets}</p>
          </div>
          <div className="bg-surface-card rounded-xl p-3">
            <p className="font-label-sm text-text-muted uppercase">{t('history.gymTime') as string}</p>
            <p className="font-numeric-input text-text-primary mt-1">{stats.gymTime}</p>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <p className="font-body-sm text-text-secondary">{t('common.loading') as string}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-card rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3">
            <Icon name="history" className="text-[40px] text-text-muted" />
            <p className="font-title-sm text-text-primary">{t('history.emptyTitle') as string}</p>
            <p className="font-body-sm text-text-secondary">{t('history.emptyBody') as string}</p>
            <button onClick={() => navigate('/workout')} className="min-h-[44px] px-4 rounded-lg bg-accent-neon text-text-on-accent">
              {t('workout.startWorkout') as string}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((e) => {
              const isOpen = expanded === e.session.id
              const isEdit = editing === e.session.id
              const d = formatDurationSec(e.session.duration_seconds)
              const exCount = e.exercises.length
              const setsDone = e.logs.filter((l) => l.is_completed).length
              const vol = e.exercises.reduce((acc, ex) => {
                const type = catalogById.get(ex.exercise_id)?.type || 'weight_reps'
                const exLogs = e.logs.filter((l) => l.session_exercise_id === ex.id)
                return acc + totalVolume(exLogs, type, { includeWarmups: true })
              }, 0)
              const prs = prsBySession[e.session.id] || []
              return (
                <div key={e.session.id} className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
                  <button onClick={() => toggle(e.session.id)} className="w-full text-left p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-label-sm text-text-muted uppercase">{formatDate(e.session.start_timestamp, locale)}</p>
                        <h3 className="font-title-md text-text-primary mt-0.5">{e.session.workout_name_snap}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        {prs.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-accent-neon text-text-on-accent font-label-sm">PR × {prs.length}</span>
                        )}
                        <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-text-secondary text-[20px]" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body-sm text-text-secondary">
                      <span>{d.h > 0 ? `${d.h}h ${d.m}m` : `${d.m}m`}</span>
                      <span>•</span>
                      <span>{t('history.exerciseSummary', { count: exCount }) as string}</span>
                      <span>•</span>
                      <span>{t('history.workingSets', { count: setsDone }) as string}</span>
                      <span>•</span>
                      <span>{formatVolume(vol, unit, locale, { decimals: 0, unitLabel: t(`unit.${unit}`) as string })}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-4 border-t border-surface-container-low">
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditing((v) => (v === e.session.id ? null : e.session.id))} className="min-h-[36px] px-3 rounded-lg bg-surface-elevated flex items-center gap-1">
                            <Icon name="edit" className="text-[16px]" />
                            <span>{t('history.editLog') as string}</span>
                          </button>
                          <button onClick={() => setPendingDelete(e)} className="min-h-[36px] px-3 rounded-lg bg-surface-elevated text-status-error flex items-center gap-1">
                            <Icon name="delete" className="text-[16px]" />
                            <span>{t('history.delete') as string}</span>
                          </button>
                        </div>
                        <button onClick={() => setExpanded(null)} className="text-text-secondary font-label-sm">
                          {t('history.collapse') as string}
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-label-sm text-text-muted uppercase">{t('history.notes') as string}</label>
                        <textarea
                          value={sessionNotes[e.session.id] || ''}
                          onChange={(ev) => setSessionNotes((m) => ({ ...m, [e.session.id]: ev.target.value }))}
                          placeholder={t('history.addNote') as string}
                          rows={2}
                          className="w-full bg-bg-canvas rounded-lg p-2 font-body-sm text-text-primary"
                        />
                        <div className="flex justify-end">
                          <button onClick={() => saveSessionNote(e.session.id, sessionNotes[e.session.id] || '')} className="px-3 py-1.5 rounded-lg bg-accent-neon text-text-on-accent">
                            {t('common.save') as string}
                          </button>
                        </div>
                      </div>

                      {e.exercises.length === 0 ? (
                        <p className="text-center text-text-secondary py-4">{t('history.noExercises') as string}</p>
                      ) : (
                        e.exercises.map((ex) => {
                          const logsEx = e.logs.filter((l) => l.session_exercise_id === ex.id).sort((a, b) => a.set_number - b.set_number)
                          return (
                            <section key={ex.id} className="flex flex-col gap-2">
                              <h4 className="font-title-sm text-text-primary">{ex.exercise_name_snap}</h4>
                              <div className="grid grid-cols-12 gap-1 text-center font-label-sm text-text-muted">
                                <span className="col-span-2 text-left">{t('session.setColumn') as string}</span>
                                <span className="col-span-4">{t(`unit.${unit}`) as string}</span>
                                <span className="col-span-3">{t('session.repsColumn') as string}</span>
                                <span className="col-span-3">{t('session.statusColumn') as string}</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                {logsEx.map((log) => {
                                  const dispW = unit === 'kg' ? log.weight_kg : kgToLb(log.weight_kg)
                                  return (
                                    <div key={log.id} className="grid grid-cols-12 gap-1 items-center rounded-lg p-1.5 bg-surface-elevated">
                                      <div className="col-span-2">
                                        <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-xs">{log.set_number}</span>
                                      </div>
                                      <div className="col-span-4 flex justify-center">
                                        {isEdit ? (
                                          <input
                                            defaultValue={Number.isFinite(dispW) ? (unit === 'kg' ? log.weight_kg : Number(dispW.toFixed(1))) : ''}
                                            onBlur={(ev) => {
                                              const p = parseDecimal(ev.target.value)
                                              if (p === null) return
                                              const kg = unit === 'kg' ? p : parseWeightInput(ev.target.value, 'lbs') ?? p * 0.45359237
                                              void saveSet(log.id, { weightKg: Number(kg.toFixed(3)) })
                                            }}
                                            className="w-full max-w-[64px] h-8 bg-surface-card rounded text-center text-xs"
                                          />
                                        ) : (
                                          <span>{formatWeight(log.weight_kg, unit, locale, { decimals: 1 })}</span>
                                        )}
                                      </div>
                                      <div className="col-span-3 flex justify-center">
                                        {isEdit ? (
                                          <input
                                            defaultValue={log.reps || ''}
                                            onBlur={(ev) => {
                                              const p = parseDecimal(ev.target.value)
                                              if (p === null) return
                                              void saveSet(log.id, { reps: Math.max(0, Math.round(p)) })
                                            }}
                                            className="w-full max-w-[48px] h-8 bg-surface-card rounded text-center text-xs"
                                          />
                                        ) : (
                                          <span>{log.reps}</span>
                                        )}
                                      </div>
                                      <div className="col-span-3 flex items-center justify-center">
                                        <button onClick={() => saveSet(log.id, { isCompleted: !log.is_completed })} className="text-accent-neon">
                                          {log.is_completed ? '✓' : '○'}
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </section>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('history.deleteConfirmTitle') as string}
        body={t('history.deleteConfirmBody') as string}
        confirmLabel={t('history.delete') as string}
        cancelLabel={t('common.cancel') as string}
        destructive
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
