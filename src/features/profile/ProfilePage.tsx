import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Modal, ModalHeader } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../../data/AppDataContext'
import { useI18n } from '../../i18n'
import {
  BACKUP_APP_ID,
  BackupValidationError,
  backupFileName,
  clearAllData,
  exportBackupJson,
  getBodyweightEnabled,
  importBackup,
  parseBackupJson,
  setBodyweightEnabled,
  summariseBackup,
  type BackupSummary,
  type GymbroBackup,
  type ImportMode,
} from '../../db'

/** Hidden `<input type="file">` is triggered from the visible Import button. */
function triggerDownload(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser a tick to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex-1 min-h-[40px] rounded-md px-2 font-label-sm text-label-sm transition-colors ${
        selected
          ? 'bg-accent-neon text-text-on-accent font-body-bold'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}

interface PendingImport {
  backup: GymbroBackup
  summary: BackupSummary
  fileName: string
}

/**
 * Screen 9 — Settings & Data Management (§5.8).
 *
 * Preferences live in `app_settings` and are persisted immediately. Data
 * management implements BACKUP-001…004: export the whole local database to a
 * versioned JSON file, validate + preview an import before choosing merge or
 * overwrite, and clear everything only after the user types `DELETE`.
 */
export function ProfilePage() {
  const { t, lang, setLang } = useI18n()
  const { profile, unit, actions } = useAppData()
  const showToast = useToast()

  const [bodyweightEnabled, setBodyweightEnabledState] = useState<boolean | null>(null)
  const [exporting, setExporting] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [importConfirmText, setImportConfirmText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [clearBusy, setClearBusy] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadBodyweightSetting = useCallback(async () => {
    try {
      setBodyweightEnabledState(await getBodyweightEnabled())
    } catch (error) {
      console.error('[gymbro] failed to read bodyweight setting', error)
      setBodyweightEnabledState(true)
    }
  }, [])

  useEffect(() => {
    void loadBodyweightSetting()
  }, [loadBodyweightSetting])

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const json = await exportBackupJson()
      triggerDownload(backupFileName(), json)
      showToast(t('profile.exportSuccess'))
    } catch (error) {
      console.error('[gymbro] export failed', error)
      showToast(t('common.saveFailed'), 'info')
    } finally {
      setExporting(false)
    }
  }

  const showImportError = (error: unknown) => {
    console.error('[gymbro] import failed', error)
    if (error instanceof BackupValidationError) {
      showToast(t(`profile.${error.key}`), 'info')
      return
    }
    showToast(t('profile.importFailed'), 'info')
  }

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset immediately so choosing the same file twice still fires `change`.
    event.target.value = ''
    if (!file) return

    try {
      const backup = parseBackupJson(await file.text())
      setPendingImport({
        backup,
        summary: summariseBackup(backup),
        fileName: file.name,
      })
      setImportMode('merge')
      setImportConfirmText('')
    } catch (error) {
      showImportError(error)
    }
  }

  const closeImport = () => {
    if (importBusy) return
    setPendingImport(null)
    setImportConfirmText('')
  }

  const handleImport = async () => {
    if (!pendingImport || importBusy) return
    if (importMode === 'overwrite' && importConfirmText !== 'DELETE') return

    setImportBusy(true)
    try {
      await importBackup(pendingImport.backup, importMode)
      await actions.refresh()
      await loadBodyweightSetting()

      // Overwrite replaces `app_settings` too, so mirror a restored language
      // preference instead of showing a UI that no longer matches storage.
      if (importMode === 'overwrite') {
        const restored = pendingImport.backup.data.app_settings.find((row) => row.key === 'language')
        if (restored?.value === 'en' || restored?.value === 'id') setLang(restored.value)
      }

      showToast(t('profile.importSuccess'))
      setPendingImport(null)
      setImportConfirmText('')
      setImportMode('merge')
    } catch (error) {
      showImportError(error)
    } finally {
      setImportBusy(false)
    }
  }

  const closeClear = () => {
    if (clearBusy) return
    setClearOpen(false)
    setClearConfirmText('')
  }

  const handleClear = async () => {
    if (clearBusy || clearConfirmText !== 'DELETE') return
    setClearBusy(true)
    try {
      await clearAllData()
      showToast(t('profile.clearSuccess'))
      setClearOpen(false)
      setClearConfirmText('')
      // No profile row now: `RequireProfile` sends the user to `/welcome`.
      // The UI language stays as-is until reload, but the stored preference is
      // gone with the rest of the data — nothing is silently re-written.
      await actions.refresh()
    } catch (error) {
      console.error('[gymbro] clear failed', error)
      showToast(t('profile.clearFailed'), 'info')
    } finally {
      setClearBusy(false)
    }
  }

  const toggleBodyweight = async () => {
    if (bodyweightEnabled === null) return
    const next = !bodyweightEnabled
    setBodyweightEnabledState(next)
    try {
      await setBodyweightEnabled(next)
    } catch (error) {
      console.error('[gymbro] failed to persist bodyweight setting', error)
      setBodyweightEnabledState(!next)
      showToast(t('common.saveFailed'), 'info')
    }
  }

  const overwriteBlocked = importMode === 'overwrite' && importConfirmText !== 'DELETE'
  const clearBlocked = clearConfirmText !== 'DELETE'

  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <main className="px-margin pb-6 flex flex-col gap-4">
        {/* Identity -------------------------------------------------------- */}
        <section className="bg-surface-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent-neon/15 text-accent-neon flex items-center justify-center shrink-0">
            <Icon name="person" fill className="text-[26px]" />
          </div>
          <div className="min-w-0">
            <p className="font-title-sm text-text-primary truncate">
              {profile?.display_name?.trim() || t('profile.displayName')}
            </p>
            <p className="font-body-sm text-text-secondary">{t('profile.localFirst')}</p>
          </div>
        </section>

        {/* Settings -------------------------------------------------------- */}
        <section className="bg-surface-card rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-title-sm text-text-primary">{t('profile.settings')}</h2>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm text-text-muted uppercase">
              {t('profile.language')}
            </span>
            <div className="flex bg-surface-elevated rounded-lg p-0.5">
              <SegmentButton selected={lang === 'en'} onClick={() => setLang('en')}>
                {t('profile.languageEn')}
              </SegmentButton>
              <SegmentButton selected={lang === 'id'} onClick={() => setLang('id')}>
                {t('profile.languageId')}
              </SegmentButton>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm text-text-muted uppercase">
              {t('profile.unit')}
            </span>
            <div className="flex bg-surface-elevated rounded-lg p-0.5">
              <SegmentButton
                selected={unit === 'kg'}
                onClick={() => void actions.setUnitPreference('kg')}
              >
                {t('profile.unitKg')}
              </SegmentButton>
              <SegmentButton
                selected={unit === 'lbs'}
                onClick={() => void actions.setUnitPreference('lbs')}
              >
                {t('profile.unitLbs')}
              </SegmentButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle/60 pt-4">
            <div className="min-w-0">
              <p className="font-body-bold text-body-bold text-text-primary">
                {t('profile.bodyweightTracker')}
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary">
                {t('profile.bodyweightTrackerHint')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={bodyweightEnabled === true}
              aria-label={t('profile.bodyweightTracker')}
              disabled={bodyweightEnabled === null}
              onClick={() => void toggleBodyweight()}
              className={`relative w-12 h-7 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                bodyweightEnabled ? 'bg-accent-neon' : 'bg-surface-elevated border border-border-subtle'
              }`}
            >
              <span
                className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all ${
                  bodyweightEnabled
                    ? 'right-1 bg-text-on-accent'
                    : 'left-1 bg-text-secondary'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Data management ------------------------------------------------- */}
        <section className="bg-surface-card rounded-xl p-4 flex flex-col gap-4">
          <h2 className="font-title-sm text-text-primary">{t('profile.dataManagement')}</h2>

          <DataRow
            icon="download"
            title={t('profile.exportBackup')}
            hint={t('profile.exportBackupHint')}
            action={
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exporting}
                className="min-h-[44px] px-4 rounded-lg bg-surface-elevated text-text-primary font-body-bold text-body-bold hover:bg-surface-container-high transition-colors disabled:opacity-60"
              >
                {t('profile.download')}
              </button>
            }
          />

          <DataRow
            icon="upload"
            title={t('profile.importBackup')}
            hint={t('profile.importBackupHint')}
            action={
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => void handleFileSelected(event)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-4 rounded-lg bg-surface-elevated text-text-primary font-body-bold text-body-bold hover:bg-surface-container-high transition-colors"
                >
                  {t('profile.importBackup')}
                </button>
              </>
            }
          />

          <div className="border-t border-border-subtle/60 pt-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-status-error/10 text-status-error flex items-center justify-center shrink-0">
                <Icon name="delete_forever" className="text-[20px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-body-bold text-body-bold text-text-primary">
                  {t('profile.clearAllData')}
                </p>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {t('profile.clearAllDataHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setClearConfirmText('')
                setClearOpen(true)
              }}
              className="w-full min-h-[44px] rounded-lg bg-status-error/10 text-status-error border border-status-error/40 font-body-bold text-body-bold hover:bg-status-error/20 transition-colors"
            >
              {t('profile.clearAllData')}
            </button>
          </div>
        </section>
      </main>

      {/* Import preview + mode ------------------------------------------- */}
      <Modal
        open={pendingImport !== null}
        onClose={closeImport}
        label={t('profile.importTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={closeImport}
              disabled={importBusy}
              className="flex-1 min-h-[44px] rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary font-body-bold text-body-bold transition-colors disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importBusy || overwriteBlocked}
              className="flex-1 min-h-[44px] rounded-lg bg-accent-neon text-text-on-accent font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-60"
            >
              {t('profile.importConfirm')}
            </button>
          </>
        }
      >
        <ModalHeader title={t('profile.importTitle')} onClose={closeImport} />
        {pendingImport ? (
          <>
            <div className="bg-surface-elevated rounded-lg p-3 flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">
                {t('profile.importFile')}
              </span>
              <p className="font-body-sm text-body-sm text-text-primary break-all">
                {pendingImport.fileName}
              </p>
              <p className="font-label-sm text-label-sm text-text-muted">
                {t('profile.importAppId')}: {BACKUP_APP_ID} •{' '}
                {t('profile.importSchemaVersion')}: v{pendingImport.backup.schemaVersion}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">
                {t('profile.importSummary')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <SummaryCell label={t('profile.importRoutines')} value={pendingImport.summary.routines} />
                <SummaryCell label={t('profile.importSessions')} value={pendingImport.summary.sessions} />
                <SummaryCell label={t('profile.importExercises')} value={pendingImport.summary.exercises} />
                <SummaryCell label={t('profile.importSetLogs')} value={pendingImport.summary.setLogs} />
                <SummaryCell label={t('profile.importBodyweight')} value={pendingImport.summary.bodyweight} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">
                {t('profile.importMode')}
              </span>
              <div className="flex flex-col gap-2">
                <ModeOption
                  selected={importMode === 'merge'}
                  onSelect={() => setImportMode('merge')}
                  title={t('profile.importModeMerge')}
                  hint={t('profile.importModeMergeHint')}
                />
                <ModeOption
                  selected={importMode === 'overwrite'}
                  onSelect={() => setImportMode('overwrite')}
                  title={t('profile.importModeOverwrite')}
                  hint={t('profile.importModeOverwriteHint')}
                  destructive
                />
              </div>
            </div>

            {importMode === 'overwrite' ? (
              <div className="flex flex-col gap-2 bg-status-error/10 border border-status-error/40 rounded-lg p-3">
                <p className="font-body-bold text-body-bold text-status-error">
                  {t('profile.importConfirmOverwriteTitle')}
                </p>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {t('profile.importConfirmOverwriteBody')}
                </p>
                <label className="font-label-sm text-label-sm text-text-muted uppercase" htmlFor="import-confirm">
                  {t('profile.importConfirmOverwriteType')}
                </label>
                <input
                  id="import-confirm"
                  type="text"
                  value={importConfirmText}
                  onChange={(event) => setImportConfirmText(event.target.value)}
                  placeholder={t('profile.importConfirmOverwritePlaceholder')}
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary placeholder:text-text-muted"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* Clear-all confirmation (BACKUP-004) ----------------------------- */}
      <Modal
        open={clearOpen}
        onClose={closeClear}
        label={t('profile.clearTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={closeClear}
              disabled={clearBusy}
              className="flex-1 min-h-[44px] rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary font-body-bold text-body-bold transition-colors disabled:opacity-60"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={clearBusy || clearBlocked}
              className="flex-1 min-h-[44px] rounded-lg bg-status-error text-text-on-accent font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-60"
            >
              {t('profile.clearConfirm')}
            </button>
          </>
        }
      >
        <ModalHeader title={t('profile.clearTitle')} onClose={closeClear} />
        <p className="font-body-sm text-body-sm text-text-secondary">{t('profile.clearBody')}</p>
        <label className="font-label-sm text-label-sm text-text-muted uppercase" htmlFor="clear-confirm">
          {t('profile.clearTypeLabel')}
        </label>
        <input
          id="clear-confirm"
          type="text"
          value={clearConfirmText}
          onChange={(event) => setClearConfirmText(event.target.value)}
          placeholder={t('profile.clearPlaceholder')}
          autoComplete="off"
          autoCapitalize="characters"
          className="w-full bg-surface-elevated rounded-lg px-3 py-2 font-body-sm text-text-primary placeholder:text-text-muted"
        />
      </Modal>
    </>
  )
}

function DataRow({
  icon,
  title,
  hint,
  action,
}: {
  icon: string
  title: string
  hint: string
  action: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-surface-elevated text-text-secondary flex items-center justify-center shrink-0">
        <Icon name={icon} className="text-[20px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body-bold text-body-bold text-text-primary">{title}</p>
        <p className="font-body-sm text-body-sm text-text-secondary">{hint}</p>
      </div>
      {action}
    </div>
  )
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-elevated rounded-lg p-2">
      <p className="font-label-sm text-label-sm text-text-muted">{label}</p>
      <p className="font-title-sm text-text-primary">{value}</p>
    </div>
  )
}

function ModeOption({
  selected,
  onSelect,
  title,
  hint,
  destructive = false,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  hint: string
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`text-left rounded-lg border p-3 transition-colors ${
        selected
          ? destructive
            ? 'border-status-error bg-status-error/10'
            : 'border-accent-neon bg-accent-neon/10'
          : 'border-border-subtle/60 bg-surface-elevated hover:border-text-muted'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selected
              ? destructive
                ? 'border-status-error'
                : 'border-accent-neon'
              : 'border-text-muted'
          }`}
        >
          {selected ? (
            <span
              className={`w-2 h-2 rounded-full ${destructive ? 'bg-status-error' : 'bg-accent-neon'}`}
            />
          ) : null}
        </span>
        <span
          className={`font-body-bold text-body-bold ${
            destructive ? 'text-status-error' : 'text-text-primary'
          }`}
        >
          {title}
        </span>
      </span>
      <span className="block mt-1 pl-6 font-body-sm text-body-sm text-text-secondary">{hint}</span>
    </button>
  )
}
