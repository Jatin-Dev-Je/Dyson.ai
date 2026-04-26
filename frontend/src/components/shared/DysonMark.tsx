type Props = { size?: number; className?: string }

export function DysonMark({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(16 16)" stroke="currentColor" strokeWidth="1.1" fill="none">
        <circle r="11" />
        <ellipse rx="11" ry="3.6" />
        <ellipse rx="11" ry="3.6" transform="rotate(60)" />
        <ellipse rx="11" ry="3.6" transform="rotate(-60)" />
      </g>
      <circle cx="16" cy="16" r="1.7" fill="currentColor" />
    </svg>
  )
}
