import { cn, getConfidenceLevel } from '@/lib/utils'

type Props = { confidence: number; showBar?: boolean }

const colors = {
  high:   { text: 'text-success',   bar: 'bg-success'   },
  medium: { text: 'text-citation',  bar: 'bg-citation'  },
  low:    { text: 'text-danger',    bar: 'bg-danger'     },
}

export function ConfidenceBadge({ confidence, showBar = false }: Props) {
  const level = getConfidenceLevel(confidence)
  const { text, bar } = colors[level]
  return (
    <div className="flex items-center gap-2">
      <span className={cn('font-mono text-[11px] tabular-nums', text)}>
        {(confidence * 100).toFixed(0)}%
      </span>
      {showBar && (
        <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className={cn('h-full rounded-full', bar)} style={{ width: `${confidence * 100}%` }} />
        </div>
      )}
    </div>
  )
}
