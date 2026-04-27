/**
 * Dyson product mark — three connected nodes that form a causal triangle.
 * The metaphor: every "why" is the linking of events. The mark is the graph.
 *
 * Variants
 *   • default  — three solid dots (favicon, sidebar, navbar)
 *   • linked   — dots + faint connecting strokes (hero, brand surfaces)
 *   • traced   — soft Bezier "trace" through the dots (animated marketing surface)
 */

type Variant = 'default' | 'linked' | 'traced'

type Props = {
  size?:    number
  className?: string
  variant?: Variant
  /** When true, the connection strokes draw on mount. Only meaningful for `linked`/`traced`. */
  animate?: boolean
}

export function DysonMark({
  size      = 24,
  className,
  variant   = 'default',
  animate   = false,
}: Props) {
  const stroke = 'currentColor'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {variant === 'linked' && (
        <g stroke={stroke} strokeWidth={2.4} strokeLinecap="round" opacity={0.32}>
          <line x1="38" y1="42" x2="82" y2="42"
            style={animate ? { strokeDasharray: 50, strokeDashoffset: 50, animation: 'dyson-draw 1.1s ease-out 0.15s forwards' } : undefined} />
          <line x1="38" y1="42" x2="60" y2="80"
            style={animate ? { strokeDasharray: 50, strokeDashoffset: 50, animation: 'dyson-draw 1.1s ease-out 0.30s forwards' } : undefined} />
          <line x1="82" y1="42" x2="60" y2="80"
            style={animate ? { strokeDasharray: 50, strokeDashoffset: 50, animation: 'dyson-draw 1.1s ease-out 0.45s forwards' } : undefined} />
        </g>
      )}

      {variant === 'traced' && (
        <path
          d="M 38 42 Q 50 60 60 80 Q 70 60 82 42"
          fill="none"
          stroke={stroke}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.28}
          style={animate ? { strokeDasharray: 120, strokeDashoffset: 120, animation: 'dyson-draw 1.4s ease-out 0.2s forwards' } : undefined}
        />
      )}

      <g fill={stroke}>
        <circle cx="38" cy="42" r="9" />
        <circle cx="82" cy="42" r="9" />
        <circle cx="60" cy="80" r="9" />
      </g>
    </svg>
  )
}

/**
 * Wordmark — mark + "Dyson" type, locked-up. Use in marketing surfaces only.
 * In the app sidebar/nav we pair the mark with separately-styled type so the
 * type can match surrounding hierarchy.
 */
export function DysonWordmark({ height = 24, className }: { height?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`} style={{ height }}>
      <DysonMark size={height * 0.86} />
      <span
        className="font-medium tracking-[-0.02em] leading-none"
        style={{ fontSize: height * 0.78 }}
      >
        Dyson
      </span>
    </span>
  )
}
