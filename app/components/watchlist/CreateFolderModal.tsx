'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const COLORS = [
  { value: '#C4922A', label: 'Gold' },
  { value: '#0d2a4a', label: 'Navy' },
  { value: '#DC2626', label: 'Red' },
  { value: '#2563EB', label: 'Blue' },
  { value: '#16A34A', label: 'Green' },
  { value: '#9333EA', label: 'Purple' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#0891B2', label: 'Teal' },
]

export interface FolderFormData {
  id?: string
  name: string
  color: string
  description: string
}

interface Props {
  editingFolder?: FolderFormData | null
  onClose: () => void
  onSave: (data: FolderFormData) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export default function CreateFolderModal({ editingFolder, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(editingFolder?.name || '')
  const [color, setColor] = useState(editingFolder?.color || '#C4922A')
  const [description, setDescription] = useState(editingFolder?.description || '')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstInputRef.current?.focus() }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onSave({ id: editingFolder?.id, name: name.trim(), color, description: description.trim() })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingFolder?.id || !onDelete) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleteLoading(true)
    try {
      await onDelete(editingFolder.id)
      onClose()
    } finally {
      setDeleteLoading(false)
    }
  }

  const isEdit = !!editingFolder?.id

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        width: '440px',
        maxWidth: '100%',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h2
            id="folder-modal-title"
            ref={titleRef}
            style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--navy)', margin: 0 }}
          >
            {isEdit ? 'Edit Portfolio' : 'New Portfolio'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1, padding: 'var(--space-1)' }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-2)' }}>
              Name *
            </label>
            <input
              ref={firstInputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Energy Client, Healthcare Bills"
              required
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              className="folder-input"
            />
            <div style={{ marginTop: 'var(--space-1)', fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
              {name.length}/50
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-2)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional context about this portfolio"
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              className="folder-input"
            />
          </div>

          {/* Color */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--space-2)' }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  aria-pressed={color === c.value}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: c.value,
                    border: 'none',
                    cursor: 'pointer',
                    outline: color === c.value ? `3px solid ${c.value}` : 'none',
                    outlineOffset: '2px',
                    transition: 'outline 100ms ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              background: 'var(--navy)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-semibold)',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !name.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Portfolio'}
          </button>

          {/* Delete */}
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{
                display: 'block',
                margin: 'var(--space-4) auto 0',
                background: 'none',
                border: 'none',
                color: confirmDelete ? '#DC2626' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {deleteLoading ? 'Deleting…' : confirmDelete ? 'Confirm delete — this cannot be undone' : 'Delete Portfolio'}
            </button>
          )}
        </form>

        <style>{`
          .folder-input:focus { border-color: var(--navy) !important; box-shadow: 0 0 0 2px rgba(13,42,74,0.1); }
        `}</style>
      </div>
    </div>
  )
}
