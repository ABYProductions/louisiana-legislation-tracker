'use client'
import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F4EF',
          padding: '40px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '48px',
              fontWeight: 700,
              color: '#0C2340',
              marginBottom: '8px',
            }}>
              Oops
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: '#666',
              lineHeight: 1.7,
              marginBottom: '24px',
            }}>
              Something went wrong loading this page. Please refresh to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#fff',
                background: '#0C2340',
                border: 'none',
                padding: '12px 28px',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
