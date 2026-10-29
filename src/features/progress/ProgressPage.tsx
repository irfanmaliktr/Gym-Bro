import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAppData } from '../../data/AppDataContext'
import { useI18n } from '../../i18n'
import { getSessionExercises, getSetLogsForSession, listCompletedSessions, listBodyweightLogs, upsertBodyweightLog, deleteBodyweightLog, getBodyweightEnabled } from '../../db'
import { kgToLb, formatWeight } from '../../lib/units'
import type { ExerciseCatalogItem, BodyweightLog } from '../../db'
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useToast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'

interface Point {
  date: number
  value: number
  sessionId: string
  weight: number
  reps: number
  label: string
  displayValue: number
}

function filterByRange(points: Point[], range: string) {
  if (range === 'all') return points
  const now = Date.now()
  const days = range === '1m' ? 30 : range === '3m' ? 90 : 180
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return points.filter((p) => p.date >= cutoff)
}

function filterByMonth(points: Point[], year: number, month: number) {
  return points.filter((p) => {
    const d = new Date(p.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
}

function formatDate(ts: number, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(ts))
  } catch {
    return ''
  }
}

function formatValue(val: number, unit: string) {
  const v = unit === 'kg' ? val : kgToLb(val)
  if (Math.abs(v) >= 100) return v.toFixed(0)
  return v.toFixed(1)
}

export function ProgressPage() {
  const { t, locale } = useI18n()
  const { unit, exercises: catalog, catalogById, actions } = useAppData()
  const showToast = useToast()

  const [exerciseId, setExerciseId] = useState<string>('all')
  const [metric, setMetric] = useState<'maxWeight' | 'volume'>('maxWeight')
  const [range, setRange] = useState<'1m' | '3m' | '6m' | 'all'>('3m')
  const [viewMode, setViewMode] = useState<'range' | 'month'>('range')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [availableIds, setAvailableIds] = useState<Set<string>>(new Set())
  const [allPoints, setAllPoints] = useState<Record<string, Point[]>>({})

  /** `null` until the stored preference is read, so disabled users never see a flash of the tracker. */
  const [bodyweightEnabled, setBodyweightEnabled] = useState<boolean | null>(null)
  const [bodyweightLogs, setBodyweightLogs] = useState<BodyweightLog[]>([])
  const [bwWeight, setBwWeight] = useState('')
  const [bwDate, setBwDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [editingBwId, setEditingBwId] = useState<string | null>(null)
  const [pendingDeleteBw, setPendingDeleteBw] = useState<BodyweightLog | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const sessions = await listCompletedSessions()
        const byEx: Record<string, Point[]> = {}
        const ids = new Set<string>()
        for (const s of sessions) {
          const links = await getSessionExercises(s.id)
          for (const link of links) {
            ids.add(link.exercise_id)
            const logs = (await getSetLogsForSession(s.id)).filter((l) => l.session_exercise_id === link.id && l.is_completed)
            if (logs.length === 0) continue
            if (!byEx[link.exercise_id]) byEx[link.exercise_id] = []
            for (const log of logs) {
              const ts = s.finish_timestamp || s.start_timestamp
              byEx[link.exercise_id].push({ date: ts, value: 0, sessionId: s.id, weight: log.weight_kg || 0, reps: log.reps || 0, label: '', displayValue: 0 })
            }
          }
        }
        Object.keys(byEx).forEach((k) => byEx[k].sort((a, b) => a.date - b.date))
        setAllPoints(byEx)
        setAvailableIds(ids)
        // Disabling the tracker only hides it; the logs stay in the database
        // (BODY-002) and reappear when it is enabled again.
        const enabled = await getBodyweightEnabled()
        setBodyweightEnabled(enabled)
        if (enabled) {
          const bw = await listBodyweightLogs()
          setBodyweightLogs(bw)
        }
        await actions.refresh()
      } catch (e) {
        console.error('[gymbro] progress load failed', e)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exercisesWithData = useMemo(() => {
    return Array.from(availableIds)
      .map((id) => ({ id, name: (catalogById.get(id) as ExerciseCatalogItem | undefined)?.name || id }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [availableIds, catalogById])

  const pointsFor = (id: string) => {
    const raw = allPoints[id] || []
    const mapped = raw.map((p) => {
      const metricValue = metric === 'maxWeight' ? p.weight : p.weight * p.reps
      return {
        ...p,
        value: metricValue,
        label: formatDate(p.date, locale),
        displayValue: unit === 'kg' ? metricValue : kgToLb(metricValue),
      }
    })
    if (viewMode === 'month') {
      return filterByMonth(mapped, selectedYear, selectedMonth)
    }
    return filterByRange(mapped, range)
  }

  const unitLabel = unit === 'kg' ? 'kg' : 'lbs'
  const monthNames = locale === 'id' 
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const years = [2024, 2025, 2026, 2027]

  const bodyweightChart = useMemo(() => {
    if (bodyweightLogs.length === 0) return []
    return bodyweightLogs
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((log) => {
        const v = unit === 'kg' ? log.weight_kg : kgToLb(log.weight_kg)
        return {
          date: log.timestamp,
          label: formatDate(log.timestamp, locale),
          value: v,
          display: v,
          log,
        }
      })
  }, [bodyweightLogs, unit, locale])

  const bodyweightStats = useMemo(() => {
    if (bodyweightLogs.length === 0) return { current: null, change: null }
    const sorted = bodyweightLogs.slice().sort((a, b) => a.timestamp - b.timestamp)
    const current = sorted[sorted.length - 1]
    const first = sorted[0]
    const currentV = unit === 'kg' ? current.weight_kg : kgToLb(current.weight_kg)
    const firstV = unit === 'kg' ? first.weight_kg : kgToLb(first.weight_kg)
    return { current: currentV, change: currentV - firstV }
  }, [bodyweightLogs, unit])

  return (
    <>
      <PageHeader title={t('progress.title') as string} subtitle={t('progress.subtitle') as string} />
      <main className="px-margin pb-6 flex flex-col gap-4">
        <section className="bg-surface-card rounded-xl p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-text-muted uppercase">{t('progress.exercise') as string}</span>
            <select
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
            >
              <option value="all">{t('progress.allExercises') as string}</option>
              {(catalog as ExerciseCatalogItem[])
                .filter((c: ExerciseCatalogItem) => !c.is_archived && availableIds.has(c.id))
                .sort((a: ExerciseCatalogItem, b: ExerciseCatalogItem) => a.name.localeCompare(b.name))
                .map((c: ExerciseCatalogItem) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-text-muted uppercase">{t('progress.metric') as string}</span>
            <div className="flex bg-surface-elevated rounded-lg p-0.5">
              <button onClick={() => setMetric('maxWeight')} className={`flex-1 py-1 rounded-md font-label-sm ${metric === 'maxWeight' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                {t('progress.maxWeight') as string}
              </button>
              <button onClick={() => setMetric('volume')} className={`flex-1 py-1 rounded-md font-label-sm ${metric === 'volume' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                {t('progress.totalVolume') as string}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-text-muted uppercase">View</span>
            <div className="flex bg-surface-elevated rounded-lg p-0.5">
              <button onClick={() => setViewMode('range')} className={`flex-1 py-1 rounded-md font-label-sm ${viewMode === 'range' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                {t('progress.timeRange') as string}
              </button>
              <button onClick={() => setViewMode('month')} className={`flex-1 py-1 rounded-md font-label-sm ${viewMode === 'month' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                {locale === 'id' ? 'Bulanan' : 'Monthly'}
              </button>
            </div>
          </div>
          {viewMode === 'range' ? (
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-text-muted uppercase">{t('progress.timeRange') as string}</span>
              <div className="flex bg-surface-elevated rounded-lg p-0.5">
                <button onClick={() => setRange('1m')} className={`flex-1 py-1 rounded-md font-label-sm ${range === '1m' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                  {t('progress.range1m') as string}
                </button>
                <button onClick={() => setRange('3m')} className={`flex-1 py-1 rounded-md font-label-sm ${range === '3m' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                  {t('progress.range3m') as string}
                </button>
                <button onClick={() => setRange('6m')} className={`flex-1 py-1 rounded-md font-label-sm ${range === '6m' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                  {t('progress.range6m') as string}
                </button>
                <button onClick={() => setRange('all')} className={`flex-1 py-1 rounded-md font-label-sm ${range === 'all' ? 'bg-accent-neon text-text-on-accent' : 'text-text-secondary'}`}>
                  {t('progress.rangeAll') as string}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-text-muted uppercase">{locale === 'id' ? 'Bulan & Tahun' : 'Month & Year'}</span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <p className="font-label-sm text-text-secondary">{monthNames[selectedMonth]} {selectedYear}</p>
            </div>
          )}
        </section>

        {exerciseId !== 'all' ? (
          <section className="bg-surface-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-title-sm text-text-primary">{(catalogById.get(exerciseId) as ExerciseCatalogItem | undefined)?.name || (t('progress.exercise') as string)}</h2>
            </div>
            {(() => {
              const pts = pointsFor(exerciseId)
              if (pts.length === 0) {
                return (
                  <div className="py-8 flex flex-col items-center text-center gap-2">
                    <p className="font-title-sm text-text-primary">{t('progress.noData') as string}</p>
                    <p className="font-body-sm text-text-secondary">{t('progress.noDataBody') as string}</p>
                  </div>
                )
              }
              const chartData = pts.map((p) => ({ ...p, display: p.displayValue }))
              return (
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 30, right: 32, left: 24, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.4)' }} tickLine={false} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={48} unit={unitLabel} />
                      <Line
                        type="monotone"
                        dataKey="display"
                        stroke="#a3e635"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#0b0f0a', stroke: '#a3e635', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#0b0f0a', stroke: '#a3e635', strokeWidth: 2 }}
                        isAnimationActive={false}
                      >
                        <LabelList
                          dataKey="display"
                          position="top"
                          offset={12}
                          formatter={(v: any) => typeof v === 'number' ? formatValue(v, unit) : (v != null ? String(v) : '')}
                          style={{ fill: '#9CA3AF', fontSize: 9 }}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })()}
          </section>
        ) : (
          <div className="flex flex-col gap-3">
            {exercisesWithData.length === 0 ? (
              <section className="bg-surface-card rounded-xl p-4 text-center">
                <p className="font-body-sm text-text-secondary">{t('progress.noDataBody') as string}</p>
              </section>
            ) : (
              exercisesWithData.map((ex) => {
                const pts = pointsFor(ex.id)
                if (pts.length === 0) {
                  return (
                    <section key={ex.id} className="bg-surface-card rounded-xl p-4">
                      <h2 className="font-title-sm text-text-primary mb-2">{ex.name}</h2>
                      <p className="font-body-sm text-text-secondary">{t('progress.noData') as string}</p>
                    </section>
                  )
                }
                const chartData = pts.map((p) => ({ ...p, display: p.displayValue }))
                return (
                  <section key={ex.id} className="bg-surface-card rounded-xl p-4">
                    <h2 className="font-title-sm text-text-primary mb-3">{ex.name}</h2>
                    <div className="w-full h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 30, right: 28, left: 24, bottom: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.4)' }} tickLine={false} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={48} unit={unitLabel} />
                          <Line
                            type="monotone"
                            dataKey="display"
                            stroke="#a3e635"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#0b0f0a', stroke: '#a3e635', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#0b0f0a', stroke: '#a3e635', strokeWidth: 2 }}
                            isAnimationActive={false}
                          >
                            <LabelList
                              dataKey="display"
                              position="top"
                              offset={12}
                              formatter={(v: any) => typeof v === 'number' ? formatValue(v, unit) : (v != null ? String(v) : '')}
                              style={{ fill: '#9CA3AF', fontSize: 9 }}
                            />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                )
              })
            )}
          </div>
        )}

        {bodyweightEnabled === true ? (
        <section className="bg-surface-card rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-title-sm text-text-primary">{t('progress.bodyweightTitle') as string}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-text-muted uppercase">{t('progress.bodyweightDate') as string}</span>
              <input
                type="date"
                value={bwDate}
                onChange={(e) => setBwDate(e.target.value)}
                className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-text-muted uppercase">{t('progress.bodyweightWeight') as string} ({unitLabel})</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={bwWeight}
                onChange={(e) => setBwWeight(e.target.value)}
                placeholder={t('progress.bodyweightPlaceholder') as string}
                className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              const parsed = Number(bwWeight)
              if (isNaN(parsed) || parsed <= 0) {
                showToast(t('progress.bodyweightInvalid') as string)
                return
              }
              const d = new Date(bwDate + 'T00:00:00')
              const ts = d.getTime()
              // store in kg
              const kg = unit === 'kg' ? parsed : (parsed * 0.45359237)
              await upsertBodyweightLog({ id: editingBwId || undefined, weightKg: kg, timestamp: ts })
              const bw = await listBodyweightLogs()
              setBodyweightLogs(bw)
              setBwWeight('')
              setEditingBwId(null)
              setBwDate(new Date().toISOString().slice(0, 10))
              showToast(t('progress.bodyweightSaved') as string)
              await actions.refresh()
            }}
            className="w-full min-h-[44px] rounded-lg bg-accent-neon text-text-on-accent font-title-sm"
          >
            {t('progress.bodyweightSave') as string}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-elevated rounded-lg p-2">
              <p className="font-label-sm text-text-muted">{t('progress.bodyweightCurrent') as string}</p>
              <p className="font-title-sm text-text-primary">{bodyweightStats.current != null ? formatWeight(bodyweightStats.current, unit, locale) : (t('progress.bodyweightNoData') as string)}</p>
            </div>
            <div className="bg-surface-elevated rounded-lg p-2">
              <p className="font-label-sm text-text-muted">{t('progress.bodyweightChange') as string}</p>
              <p className={`font-title-sm ${bodyweightStats.change != null && bodyweightStats.change < 0 ? 'text-status-success' : bodyweightStats.change != null && bodyweightStats.change > 0 ? 'text-status-error' : 'text-text-primary'}`}>
                {bodyweightStats.change != null ? `${bodyweightStats.change >= 0 ? '+' : ''}${(unit === 'kg' ? bodyweightStats.change : kgToLb(bodyweightStats.change)).toFixed(1)} ${unitLabel}` : (t('progress.bodyweightNoData') as string)}
              </p>
            </div>
          </div>
          {bodyweightChart.length === 0 ? (
            <div className="py-6 flex flex-col items-center text-center gap-1">
              <p className="font-body-sm text-text-secondary">{t('progress.bodyweightEmpty') as string}</p>
            </div>
          ) : (
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bodyweightChart} margin={{ top: 30, right: 28, left: 24, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={{ stroke: 'rgba(148,163,184,0.4)' }} tickLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={48} unit={unitLabel} />
                  <Line
                    type="monotone"
                    dataKey="display"
                    stroke="#a3e635"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#0b0f0a', stroke: '#a3e635', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#0b0f0a', stroke: '#a3e635', strokeWidth: 2 }}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="display"
                      position="top"
                      offset={12}
                      formatter={(v: any) => typeof v === 'number' ? v.toFixed(1) : (v != null ? String(v) : '')}
                      style={{ fill: '#9CA3AF', fontSize: 9 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {bodyweightLogs.length > 0 && (
            <div className="flex flex-col gap-2">
              {bodyweightLogs
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((log) => (
                  <div key={log.id} className="flex items-center justify-between bg-surface-elevated rounded-lg p-2">
                    <div>
                      <p className="font-body-sm text-text-primary">{formatWeight(log.weight_kg, unit, locale)}</p>
                      <p className="font-label-sm text-text-muted">{new Date(log.timestamp).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBwId(log.id)
                          setBwDate(new Date(log.timestamp).toISOString().slice(0, 10))
                          setBwWeight((unit === 'kg' ? log.weight_kg : kgToLb(log.weight_kg)).toString())
                        }}
                        className="text-text-secondary"
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteBw(log)}
                        className="text-status-error"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
        ) : null}
      </main>
      <ConfirmDialog
        open={pendingDeleteBw !== null}
        title={t('common.delete') as string}
        body={t('progress.bodyweightDelete') as string}
        confirmLabel={t('common.delete') as string}
        cancelLabel={t('common.cancel') as string}
        destructive
        onConfirm={async () => {
          if (!pendingDeleteBw) return
          await deleteBodyweightLog(pendingDeleteBw.id)
          const bw = await listBodyweightLogs()
          setBodyweightLogs(bw)
          showToast(t('progress.bodyweightDeleted') as string)
          setPendingDeleteBw(null)
          await actions.refresh()
        }}
        onCancel={() => setPendingDeleteBw(null)}
      />
    </>
  )
}
