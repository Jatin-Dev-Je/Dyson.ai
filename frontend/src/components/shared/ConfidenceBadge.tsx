import { cn, getConfidenceLevel } from '@/lib/utils'

type Props = { confidence: number; showBar?: boolean }

const styles = {
  high:   { text: 'text-[#16A34A]', bar: 'bg-[#16A34A]', track: 'bg-[#DCFCE7]' },
  medium: { text: 'text-[#D97706]', bar: 'bg-[#D97706]', track: 'bg-[#FEF3C7]' },
  low:    { text: 'text-[#DC2626]', bar: 'bg-[#DC2626]', track: 'bg-[#FEE2E2]' },
}

export function ConfidenceBadge({ confidence, showBar = false }: Props) {
  const level = getConfidenceLevel(confidence)
  const s = styles[level]
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className={cn('font-mono text-[11px] tabular-nums font-medium', s.text)}>
        {(confidence * 100).toFixed(0)}%
      </span>
      {showBar && (
        <div className={cn('w-12 h-1 rounded-full overflow-hidden', s.track)}>
          <div className={cn('h-full rounded-full transition-all', s.bar)} style={{ width: `${confidence * 100}%` }} />
        </div>
      )}
    </div>
  )
}
