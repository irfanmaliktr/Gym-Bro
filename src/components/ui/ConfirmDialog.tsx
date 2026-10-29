import { Modal, ModalHeader } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Consequence copy — say what will actually happen. */
  body: string
  confirmLabel: string
  cancelLabel: string
  /** Red confirm button for irreversible actions. */
  destructive?: boolean
  /** Disables both buttons while the action runs. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation used by every destructive/irreversible action
 * (ROUTINE-005 permanent delete, EXER-003 delete, discarding editor changes).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      label={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 min-h-[44px] rounded-lg bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container-high font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 min-h-[44px] rounded-lg font-body-bold text-body-bold transition-all active:scale-95 disabled:opacity-60 ${
              destructive
                ? 'bg-status-error text-text-on-accent hover:brightness-110'
                : 'bg-accent-neon text-text-on-accent hover:bg-accent-neon-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <ModalHeader title={title} onClose={() => (busy ? undefined : onCancel())} />
      <p className="font-body-sm text-body-sm text-text-secondary">{body}</p>
    </Modal>
  )
}
