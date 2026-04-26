import { cn } from '@/lib/utils'

type Source = 'slack' | 'github' | 'notion' | 'linear' | 'meeting'

const config: Record<Source, { label: string; dot: string; style: string }> = {
  slack:   { label: 'Slack',   dot: 'bg-[#E01E5A]', style: 'text-[#E01E5A] bg-[#E01E5A]/8 border-[#E01E5A]/20' },
  github:  { label: 'GitHub',  dot: 'bg-[#8B949E]', style: 'text-[#8B949E] bg-white/[0.04] border-[#2E2E2E]'   },
  notion:  { label: 'Notion',  dot: 'bg-white/60',  style: 'text-text-3 bg-white/[0.03] border-[#2E2E2E]'      },
  linear:  { label: 'Linear',  dot: 'bg-[#5E6AD2]', style: 'text-[#5E6AD2] bg-[#5E6AD2]/8 border-[#5E6AD2]/20' },
  meeting: { label: 'Meeting', dot: 'bg-success',   style: 'text-success bg-green-500/8 border-green-500/20'    },
}

export function SourcePill({ source, className }: { source: Source; className?: string }) {
  const { label, dot, style } = config[source]
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded border', style, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {label}
    </span>
  )
}
