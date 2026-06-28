import type React from 'react'

// Shared input and label style constants
export const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d1a1e',
  border: '1px solid #1a2e34',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem',
  color: '#F2F2F2',
  fontSize: '0.9rem',
  outline: 'none',
}

export const labelBaseStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.375rem',
}

export const cardBaseStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
}
