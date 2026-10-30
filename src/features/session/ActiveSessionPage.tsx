import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'
import { Menu } from '../../components/ui/Menu'
import { Modal, ModalHeader } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../../data/AppDataContext'
import { addExerciseToSession, addSetToSessionExercise, discardSession, finishSession, getPreviousPerformance, getSession, getSessionExercises, getSetLogsForSessionExercise, removeExerciseFromSession, renameSession, reorderSessionExercises, updateSetLog } from '../../db'
import { useI18n } from '../../i18n'
import { formatWeight, kgToLb, parseDecimal, parseWeightInput } from '../../lib/units'
import { ExerciseFormModal } from '../workout/components/ExerciseFormModal'

const REST_PRESETS = [60, 90, 120, 180]

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const r = String(s % 60).padStart(2, '0')
  return `${m}:${r}`
}

export function ActiveSessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { exercises: catalog, catalogById, unit, actions } = useAppData()
  const showToast = useToast()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [links, setLinks] = useState<any[]>([])
  const [logsByLink, setLogsByLink] = useState<Record<string, any[]>>({})
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, Array<{ weight_kg: number; reps: number }>>>({})
  const [elapsed, setElapsed] = useState(0)
  const [restSec, setRestSec] = useState(90)
  const [restRunning, setRestRunning] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [removeOpen, setRemoveOpen] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [restPreset, setRestPreset] = useState(90)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async () => {
    if (!id) return
    try {
      const s = await getSession(id)
      if (!s) {
        setSession(null)
        setLoading(false)
        return
      }
      setSession(s)
      setTitle(s.workout_name_snap)
      const l = await getSessionExercises(id)
      setLinks(l)
      const logs: Record<string, any[]> = {}
      for (const link of l) {
        logs[link.id] = await getSetLogsForSessionExercise(link.id)
      }
      setLogsByLink(logs)
      const prev: Record<string, Array<{ weight_kg: number; reps: number }>> = {}
      for (const link of l) {
        if (!prev[link.exercise_id]) {
          prev[link.exercise_id] = await getPreviousPerformance(link.exercise_id)
        }
      }
      setPreviousByExercise(prev)
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return
    const start = session.start_timestamp
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const tmr = setInterval(tick, 1000)
    return () => clearInterval(tmr)
  }, [session])

  useEffect(() => {
    if (!restRunning || restSec <= 0) return
    const tmr = setInterval(() => {
      setRestSec((s) => {
        if (s <= 1) {
          setRestRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tmr)
  }, [restRunning, restSec])

  const autosave = () => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(() => {
      // DB writes are immediate; autosave is represented by state persistence
    }, 2000)
  }

  useEffect(() => {
    autosave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, logsByLink])

  const completedCount = useMemo(() => {
    let c = 0
    for (const linkId of Object.keys(logsByLink)) {
      c += (logsByLink[linkId] || []).filter((l) => l.is_completed).length
    }
    return c
  }, [logsByLink])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-canvas flex items-center justify-center">
        <p className="font-body-sm text-text-secondary">{t('session.loading')}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-bg-canvas px-margin py-10 flex flex-col items-center justify-center gap-4 text-center">
        <p className="font-body-md text-text-primary">{t('session.notFound')}</p>
        <button onClick={() => navigate('/')} className="min-h-[44px] px-4 rounded-lg bg-surface-elevated text-text-primary">{t('common.back')}</button>
      </div>
    )
  }

  if (session.status === 'completed') {
    navigate(`/session/${session.id}/summary`, { replace: true })
    return null
  }

  if (session.status === 'discarded') {
    return (
      <div className="min-h-screen bg-bg-canvas px-margin py-10 flex flex-col items-center justify-center gap-4 text-center">
        <p className="font-body-md text-text-primary">{t('session.alreadyTitle')}</p>
        <p className="font-body-sm text-text-secondary">{t('session.alreadyBody')}</p>
        <button onClick={() => navigate('/')} className="min-h-[44px] px-4 rounded-lg bg-accent-neon text-text-on-accent">{t('session.backHome')}</button>
      </div>
    )
  }

  const saveTitle = async () => {
    setEditingTitle(false)
    if (!id) return
    await renameSession(id, title)
    await load()
    await actions.refresh()
  }

  const addSet = async (linkId: string) => {
    await addSetToSessionExercise({ sessionExerciseId: linkId })
    await load()
    await actions.refresh()
    showToast(t('session.toastSetAdded'), 'info')
  }

  const toggleComplete = async (log: any) => {
    if (log.is_completed) {
      await updateSetLog({ setLogId: log.id, isCompleted: false })
      await load()
      await actions.refresh()
      return
    }
    await updateSetLog({ setLogId: log.id, isCompleted: true, completedAt: Date.now() })
    setRestSec(restPreset)
    setRestRunning(true)
    await load()
    await actions.refresh()
  }

  const updateSet = async (logId: string, patch: any) => {
    await updateSetLog({ setLogId: logId, ...patch })
    await load()
    await actions.refresh()
  }

  // removeSet removed - not used

  const addExercise = async (ex: any) => {
    if (!id) return
    await addExerciseToSession({
      sessionId: id,
      exerciseId: ex.id,
      exerciseNameSnap: ex.name,
      equipmentSnap: ex.equipment,
    })
    await load()
    await actions.refresh()
    setPickerOpen(false)
  }

  const removeExercise = async (linkId: string) => {
    await removeExerciseFromSession(linkId)
    setRemoveOpen(null)
    await load()
    await actions.refresh()
  }

  const moveExercise = async (idx: number, delta: number) => {
    const target = idx + delta
    if (target < 0 || target >= links.length) return
    const next = [...links]
    const [m] = next.splice(idx, 1)
    next.splice(target, 0, m)
    await reorderSessionExercises(id!, next.map((n) => n.id))
    await load()
    await actions.refresh()
  }

  const finish = async () => {
    if (!id) return
    await finishSession(id)
    await actions.refresh()
    navigate(`/session/${id}/summary`)
  }

  const discard = async () => {
    if (!id) return
    await discardSession(id)
    await actions.refresh()
    showToast(t('session.toastDiscarded'), 'info')
    navigate('/')
  }

  const addedIds = new Set(links.map((l) => l.exercise_id))

  return (
    <div className="min-h-screen bg-bg-canvas">
      <header className="fixed top-0 w-full z-50 pt-safe bg-bg-secondary/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
        <div className="h-14 px-margin flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center text-text-secondary">
            <Icon name="arrow_back" className="text-[24px]" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-neon animate-pulse" />
            <span className="font-numeric-input text-title-sm text-accent-neon">{formatElapsed(elapsed)}</span>
          </div>
          <button onClick={() => setFinishOpen(true)} className="px-3 py-1.5 rounded-full bg-accent-neon text-text-on-accent font-title-sm">
            {t('session.finish')}
          </button>
        </div>
      </header>

      <main className="pt-14 pb-40 px-margin">
        <div className="max-w-[700px] mx-auto flex flex-col gap-4">
          <section className="bg-surface-card rounded-xl p-4 shadow-sm">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 bg-bg-canvas rounded-lg px-3 py-2 font-title-md text-text-primary" />
                <button onClick={saveTitle} className="px-3 py-2 rounded-lg bg-accent-neon text-text-on-accent">{t('common.done')}</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="font-title-lg text-title-lg text-text-primary">{title}</h1>
                  <button onClick={() => setEditingTitle(true)} aria-label={t('session.editTitle')} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary">
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                </div>
                <span className="font-label-sm text-label-sm text-text-secondary">
                  {t('session.exerciseProgress', { done: links.filter((l) => (logsByLink[l.id] || []).some((x) => x.is_completed)).length, total: links.length })}
                </span>
              </div>
            )}
          </section>

          {links.length === 0 ? (
            <section className="bg-surface-card rounded-xl p-6 text-center flex flex-col gap-3">
              <p className="font-body-sm text-text-secondary">{t('session.noExercises')}</p>
            </section>
          ) : (
            links.map((link, idx) => {
              const ex = catalogById.get(link.exercise_id)
              const logs = logsByLink[link.id] || []
              const prev = previousByExercise[link.exercise_id] || []
              const prevText = prev.length === 0 ? t('session.noPrevious') : prev.map((p) => `${formatWeight(p.weight_kg, unit, locale, { decimals: 1 })} ${t(`unit.${unit}`)} × ${p.reps}`).join(', ')
              return (
                <section key={link.id} className="bg-surface-card rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-accent-neon-dim text-accent-neon font-label-sm text-label-sm">
                          {(ex?.target_muscle ? t(`muscle.${ex.target_muscle}`) : '')} {ex?.equipment ? `• ${t(`equipment.${ex.equipment}`)}` : ''}
                        </span>
                      </div>
                      <h2 className="font-title-md text-title-md text-text-primary">{link.exercise_name_snap || ex?.name}</h2>
                    </div>
                    <Menu
                      ariaLabel={link.exercise_name_snap}
                      items={[
                        { icon: 'keyboard_arrow_up', label: t('session.moveUp'), onClick: () => moveExercise(idx, -1) },
                        { icon: 'keyboard_arrow_down', label: t('session.moveDown'), onClick: () => moveExercise(idx, 1) },
                        { icon: 'sticky_note_2', label: t('session.menuNote'), onClick: () => { setNoteOpen(link.id); setNoteText(link.notes || '') } },
                        { icon: 'delete', label: t('session.menuDelete'), onClick: () => setRemoveOpen(link.id), destructive: true },
                      ]}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-text-secondary font-body-sm">
                    <Icon name="history" className="text-[16px]" />
                    <span>{prev.length === 0 ? prevText : t('session.referenceLabel', { list: prevText })}</span>
                  </div>

                  <div className="grid grid-cols-12 gap-1 text-center font-label-sm text-text-muted">
                    <span className="col-span-2 text-left">{t('session.setColumn')}</span>
                    <span className="col-span-3 text-left">{t('session.previousColumn')}</span>
                    <span className="col-span-3">{t(`unit.${unit}`)}</span>
                    <span className="col-span-2">{t('session.repsColumn')}</span>
                    <span className="col-span-2">{t('session.statusColumn')}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {logs.map((log, lidx) => {
                      const p = prev[lidx]
                      const pText = p ? `${formatWeight(p.weight_kg, unit, locale, { decimals: 1 })} × ${p.reps}` : '—'
                      const dispW = unit === 'kg' ? log.weight_kg : kgToLb(log.weight_kg)
                      return (
                        <div key={log.id} className={`grid grid-cols-12 gap-1 items-center rounded-lg p-1.5 ${log.is_completed ? 'bg-surface-container-low' : 'bg-surface-elevated'}`}>
                          <div className="col-span-2 flex items-center gap-1">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-label-sm ${log.is_completed ? 'bg-surface-elevated text-text-secondary' : 'bg-accent-neon text-text-on-accent'}`}>{log.set_number}</span>
                            <button onClick={async () => {
                              const order = ['normal', 'warmup', 'drop', 'failure']
                              const idx = order.indexOf(log.set_type)
                              const next = order[(idx + 1) % order.length]
                              await updateSet(log.id, { setType: next })
                            }} className="px-1 py-0.5 rounded bg-surface-card text-text-secondary font-label-sm">{t(`session.setTypeShort.${log.set_type || 'normal'}`)}</button>
                          </div>
                          <div className="col-span-3 text-text-secondary font-body-sm truncate">{pText}</div>
                          <div className="col-span-3 flex justify-center">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={Number.isFinite(dispW) ? (unit === 'kg' ? log.weight_kg : Number(dispW.toFixed(1))) : ''}
                              onChange={(e) => {
                                const parsed = parseDecimal(e.target.value)
                                if (parsed === null) return
                                const kg = unit === 'kg' ? parsed : parseWeightInput(e.target.value, 'lbs') ?? parsed * 0.45359237
                                updateSet(log.id, { weightKg: Number(kg.toFixed(3)) })
                              }}
                              className="w-full max-w-[64px] h-9 bg-surface-card rounded text-center font-numeric-input text-text-primary"
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              step="1"
                              value={log.reps || ''}
                              onChange={(e) => {
                                const parsed = parseDecimal(e.target.value)
                                if (parsed === null) return
                                updateSet(log.id, { reps: Math.max(0, Math.round(parsed)) })
                              }}
                              className="w-full max-w-[48px] h-9 bg-surface-card rounded text-center font-numeric-input text-text-primary"
                            />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button onClick={() => toggleComplete(log)} aria-label={log.is_completed ? t('session.markIncomplete', { number: log.set_number }) : t('session.markComplete', { number: log.set_number })} className={`w-9 h-9 rounded-lg flex items-center justify-center ${log.is_completed ? 'bg-accent-neon text-text-on-accent' : 'bg-surface-container-highest text-text-muted'}`}>
                              <Icon name="check" className="text-[18px]" fill={log.is_completed} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button onClick={() => addSet(link.id)} className="w-full py-2 rounded-lg bg-surface-elevated flex items-center justify-center gap-1">
                    <Icon name="add" className="text-[18px]" />
                    <span>{t('session.addSet')}</span>
                  </button>
                </section>
              )
            })
          )}

          <section className="flex flex-col items-center gap-3">
            <button onClick={() => setPickerOpen(true)} className="w-full h-12 rounded-xl bg-surface-card flex items-center justify-center gap-2">
              <Icon name="fitness_center" className="text-accent-neon" />
              <span>{t('session.addExercise')}</span>
            </button>
            <button onClick={() => setDiscardOpen(true)} className="text-status-error flex items-center gap-1">
              <Icon name="delete_sweep" className="text-[18px]" />
              <span>{t('session.discard')}</span>
            </button>
          </section>
        </div>
      </main>

      <aside className="fixed bottom-0 left-0 right-0 z-40 px-margin pb-safe">
        <div className="max-w-[500px] mx-auto bg-surface-elevated rounded-t-xl p-3 shadow-2xl flex flex-col gap-2">
          <div className="w-12 h-1 bg-accent-neon rounded-full mx-auto" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-neon-dim flex items-center justify-center text-accent-neon">
                <Icon name="timer" className="text-[18px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">{t('session.restTimer')}</span>
                <span className="font-timer-display text-timer-display text-accent-neon">{formatTime(restSec)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {REST_PRESETS.map((p) => (
                <button key={p} onClick={() => { setRestPreset(p); setRestSec(p); setRestRunning(true) }} className="px-2 py-1 rounded-lg bg-surface-container-high text-text-primary font-label-sm">{p}s</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setRestRunning((r) => !r)} className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
                <Icon name={restRunning ? 'pause' : 'play_arrow'} className="text-[20px]" />
              </button>
              <button onClick={() => { setRestRunning(false); setRestSec(0) }} className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center">
                <Icon name="skip_next" className="text-[20px]" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} label={t('editor.pickerTitle')}>
        <ModalHeader title={t('editor.pickerTitle')} onClose={() => setPickerOpen(false)} />
        <button
          type="button"
          onClick={() => {
            setPickerOpen(false)
            setFormOpen(true)
          }}
          className="w-full min-h-[44px] px-3 rounded-lg bg-surface-elevated hover:bg-surface-container-high text-text-primary font-body-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Icon name="add" className="text-accent-neon text-[18px]" />
          <span>{t('library.newExercise')}</span>
        </button>
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {catalog.filter((c) => !c.is_archived).map((ex) => {
            const added = addedIds.has(ex.id)
            return (
              <button key={ex.id} disabled={added} onClick={() => addExercise(ex)} className={`w-full min-h-[44px] px-3 rounded-lg flex items-center justify-between ${added ? 'bg-surface-container text-text-secondary' : 'bg-surface-elevated'}`}>
                <span className="flex items-center gap-2">
                  <span className="font-body-sm text-text-primary">{ex.name}</span>
                  {ex.is_custom ? <span className="px-1.5 py-0.5 rounded bg-accent-neon/15 font-label-sm text-label-sm text-accent-neon">{t('library.customBadge')}</span> : null}
                </span>
                <Icon name={added ? 'check' : 'add'} className="text-[18px]" />
              </button>
            )
          })}
        </div>
      </Modal>

      <Modal open={noteOpen !== null} onClose={() => setNoteOpen(null)} label={t('session.menuNote')}>
        <ModalHeader title={t('session.noteTitle')} onClose={() => setNoteOpen(null)} />
        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} className="w-full bg-bg-canvas rounded-lg p-3 font-body-sm text-text-primary" rows={4} />
        <button onClick={() => { setNoteOpen(null); showToast(t('session.addNoteToast'), 'info') }} className="w-full min-h-[44px] rounded-lg bg-accent-neon text-text-on-accent">{t('common.save')}</button>
      </Modal>

      <ExerciseFormModal
        open={formOpen}
        exercise={null}
        onClose={() => setFormOpen(false)}
        onSaved={(name, created) => {
          setFormOpen(false)
          showToast(t(created ? 'library.toastCreated' : 'library.toastUpdated', { name }))
          void load()
        }}
      />

      <ConfirmDialog open={removeOpen !== null} title={t('session.removeTitle', { name: links.find((l) => l.id === removeOpen)?.exercise_name_snap || '' })} body={t('session.removeBody')} confirmLabel={t('session.removeConfirm')} cancelLabel={t('common.cancel')} destructive onConfirm={() => removeExercise(removeOpen!)} onCancel={() => setRemoveOpen(null)} />
      <ConfirmDialog open={finishOpen} title={t('session.finishConfirmTitle')} body={completedCount === 0 ? t('session.finishConfirmBodyEmpty') : t('session.finishConfirmBody', { sets: completedCount })} confirmLabel={t('session.finish')} cancelLabel={t('session.keepGoing')} onConfirm={() => finish()} onCancel={() => setFinishOpen(false)} />
      <ConfirmDialog open={discardOpen} title={t('session.discardConfirmTitle')} body={t('session.discardConfirmBody')} confirmLabel={t('session.discard')} cancelLabel={t('session.keepGoing')} destructive onConfirm={() => discard()} onCancel={() => setDiscardOpen(false)} />
    </div>
  )
}
