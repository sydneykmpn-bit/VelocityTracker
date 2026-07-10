'use client'

export default function ConfirmModal({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', onConfirm, onCancel,
  secondaryLabel, onSecondary,
}: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
  /** Optional third action (e.g. "Delete Entire Series") rendered alongside Cancel/Confirm — same destructive styling as the primary action. */
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  const confirmStyle = variant === 'destructive'
    ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
    : { background: 'var(--teal-primary)', border: 'none', color: 'white' }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ width: '100%', maxWidth: '400px', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>{title}</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>{message}</p>
        <div style={{ display: 'flex', flexDirection: secondaryLabel ? 'column' : 'row', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onCancel}
              style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              style={{ flex: 1, borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', ...confirmStyle }}
            >
              {confirmLabel}
            </button>
          </div>
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              style={{ borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', ...confirmStyle }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
