import { useEffect } from 'react'

const LABELS = {
  add: 'Added',
  edit: 'Updated',
  delete: 'Deleted',
  success: 'Done',
}

export default function ActionToast({ toast, onDone }) {
  useEffect(() => {
    if (!toast?.message) return undefined
    const timer = window.setTimeout(() => onDone?.(), 3400)
    return () => window.clearTimeout(timer)
  }, [toast, onDone])

  if (!toast?.message) return null

  const tone = toast.tone || 'success'
  const label = LABELS[tone] || LABELS.success

  return (
    <div
      key={toast.id}
      className={`action-toast action-toast-${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="action-toast-mark" aria-hidden="true" />
      <div className="action-toast-copy">
        <strong>{label}</strong>
        <p>{toast.message}</p>
      </div>
    </div>
  )
}
