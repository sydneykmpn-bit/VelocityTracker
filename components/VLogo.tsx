import Link from 'next/link'

interface VLogoProps {
  linkTo?: string
}

const LogoSVG = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <path d="M4 6L16 26L28 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 6L16 18L22 6" stroke="#0877a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function VLogo({ linkTo }: VLogoProps) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <LogoSVG />
      <span style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em', fontSize: '1.1rem', color: 'white' }}>
        VELOCITY <span style={{ color: '#34bac2' }}>PH</span>
      </span>
    </div>
  )

  if (linkTo) {
    return (
      <Link href={linkTo} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 0 }}>
        {content}
      </Link>
    )
  }
  return content
}
