import Link from 'next/link'

interface VLogoProps {
  linkTo?: string
  height?: number
}

export default function VLogo({ linkTo, height = 36 }: VLogoProps) {
  const content = (
    <img
      src="/velocitylogo.png"
      alt="Velocity PH"
      style={{ display: 'block', height, width: 'auto' }}
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
