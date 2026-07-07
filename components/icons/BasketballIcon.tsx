import { forwardRef } from 'react'

// lucide-react (^1.21.0) has no "Basketball" icon — this hand-drawn stand-in matches its
// convention (24x24 viewBox, currentColor stroke, strokeWidth 2, round caps/joins) so it drops
// into the same <Icon size={N} /> call sites as any real lucide icon.
const BasketballIcon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement> & { size?: number | string }>(
  ({ size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c-4.2 3-4.2 17 0 20" />
      <path d="M2 12c3-4.2 17-4.2 20 0" />
    </svg>
  )
)
BasketballIcon.displayName = 'BasketballIcon'

export default BasketballIcon
