import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <div className="fade-in-up" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 6L16 26L28 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 6L16 18L22 6" stroke="#0877a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em', fontSize: '1.5rem' }}>
            VELOCITY <span style={{ color: '#34bac2' }}>FITNESS</span>
          </span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
            RESET PASSWORD
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.75, marginBottom: '2rem' }}>
            To reset your password, please message us on Instagram{' '}
            <strong style={{ color: '#34bac2' }}>@velocityfitness.ph</strong>{' '}
            or contact your coach directly.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', background: 'var(--teal-primary)',
            color: 'white', padding: '0.75rem 2rem', borderRadius: '0.5rem',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
          }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
