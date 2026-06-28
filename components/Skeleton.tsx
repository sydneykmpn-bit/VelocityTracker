interface SkeletonProps {
  height?: number | string
  width?: string
  className?: string
}

export function Skeleton({ height = 20, width = '100%', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  )
}

export function WorkoutCardSkeleton() {
  return (
    <div className="card-vel" style={{ padding: '1.25rem' }} aria-hidden="true">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Skeleton height={40} width="40px" />
        <div style={{ flex: 1 }}>
          <Skeleton height={16} width="55%" />
          <div style={{ marginTop: '0.5rem' }}>
            <Skeleton height={12} width="40%" />
          </div>
        </div>
        <Skeleton height={22} width="70px" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card-vel" style={{ padding: '1.25rem', textAlign: 'center' }} aria-hidden="true">
      <Skeleton height={40} width="50%" className="mx-auto" style={{ margin: '0 auto 0.5rem' }} />
      <Skeleton height={12} width="70%" style={{ margin: '0 auto' }} />
    </div>
  )
}
