'use client'

import Link from 'next/link'

const VLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 6L16 26L28 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 6L16 18L22 6" stroke="#0877a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em', fontSize: '1.25rem', color: 'white' }}>
      VELOCITY <span style={{ color: '#34bac2' }}>FITNESS</span>
    </span>
  </div>
)

const features = [
  { icon: '💪', title: 'Log Workouts', desc: 'Track every session with detailed exercise logs — sets, reps, weight, and duration.' },
  { icon: '🏀', title: 'Basketball Training', desc: 'Specialized tracking for basketball-specific drills, conditioning, and skill work.' },
  { icon: '📈', title: 'Track Progress', desc: 'Monitor your improvements over time with full workout history and progression.' },
  { icon: '👨‍💼', title: 'Coach Dashboard', desc: 'Coaches can view member progress and assign personalized training plans.' },
  { icon: '📋', title: 'Workout Plans', desc: 'Receive structured training programs designed specifically for your goals.' },
  { icon: '⚡', title: 'Fast & Simple', desc: 'Clean, minimal interface designed to stay out of your way so you can focus on training.' },
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#000000',
        borderBottom: '1px solid var(--border)',
        padding: '0 2rem',
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <VLogo />
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.875rem' }}>Home</Link>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</Link>
          <Link href="/login" style={{
            color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.875rem',
            border: '1px solid var(--text-primary)', padding: '0.375rem 1.125rem',
            borderRadius: '999px',
          }}>Login / Sign Up</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', paddingTop: '64px', background: '#0a1a1f',
      }}>
        {/* background image (replace /hero-bg.jpg later) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: '#0a1a1f',
        }} />
        {/* dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.78))',
        }} />
        {/* diagonal slash */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '-20%', right: '-20%',
            height: '1px', background: 'rgba(8,119,160,0.45)',
            transform: 'rotate(15deg)', transformOrigin: 'center',
          }} />
        </div>
        {/* radial teal glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(8,119,160,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* VELOCITY watermark */}
        <div style={{
          position: 'absolute',
          fontFamily: 'var(--font-bebas)',
          fontSize: 'clamp(5rem, 22vw, 18rem)',
          letterSpacing: '0.05em',
          color: 'rgba(255,255,255,0.03)',
          userSelect: 'none', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>VELOCITY</div>

        {/* content */}
        <div
          className="fade-in-up"
          style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 1.5rem', maxWidth: '820px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)',
            borderRadius: '999px', padding: '0.375rem 1.125rem',
            fontSize: '0.75rem', color: '#34bac2', marginBottom: '2rem',
            letterSpacing: '0.1em',
          }}>
            ⚡ Sports · Conditioning · Basketball
          </div>

          <h1 style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: 'clamp(3.5rem, 11vw, 8.5rem)',
            lineHeight: 0.93, letterSpacing: '0.03em', marginBottom: '1.5rem',
          }}>
            TRAIN HARDER.<br />
            <span style={{ color: '#34bac2' }}>TRACK EVERYTHING.</span>
          </h1>

          <p style={{
            color: 'var(--text-secondary)', fontSize: '1.1rem',
            lineHeight: 1.65, marginBottom: '2.5rem',
            maxWidth: '480px', margin: '0 auto 2.5rem',
          }}>
            Your performance dashboard for Velocity Fitness PH. Log workouts, track progress, and dominate your training.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/register"
              className="glow-pulse"
              style={{
                background: 'var(--teal-primary)', color: 'white',
                padding: '0.9rem 2.25rem', borderRadius: '0.5rem',
                textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
                display: 'inline-block',
              }}
            >
              Get Started Free
            </Link>
            <Link href="/login" style={{
              background: 'transparent', color: 'var(--text-primary)',
              padding: '0.9rem 2.25rem', borderRadius: '0.5rem',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
              border: '1px solid var(--border)', display: 'inline-block',
            }}>
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Features
          </p>
          <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', letterSpacing: '0.03em' }}>
            EVERYTHING YOU NEED
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '0.75rem', padding: '1.75rem',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'
                ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.5rem' }}>
                {f.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Strip ── */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(8,119,160,0.1) 0%, rgba(8,14,16,1) 50%, rgba(52,186,194,0.05) 100%)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        padding: '5rem 2rem', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.03em', marginBottom: '1rem' }}>
          READY TO <span style={{ color: '#34bac2' }}>LEVEL UP?</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Join Velocity Fitness PH and start tracking your performance today.
        </p>
        <Link href="/register" style={{
          background: 'var(--teal-primary)', color: 'white',
          padding: '0.9rem 2.5rem', borderRadius: '0.5rem',
          textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
          display: 'inline-block',
        }}>
          Start Training Now
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <VLogo />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1rem' }}>
          © 2026 Velocity Fitness PH. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
