import Link from 'next/link'

interface VLogoProps {
  linkTo?: string
}

export default function VLogo({ linkTo }: VLogoProps) {
  const content = (
    <img
      src="/velocitylogo.png"
      alt="Velocity PH"
      style={{ display: 'block', height: '36px', width: 'auto' }}
    />
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
