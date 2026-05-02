import { cn } from '@/lib/utils'

type Source = 'slack' | 'github' | 'notion' | 'linear' | 'meeting' | 'agent' | 'manual'

const config: Record<Source, { label: string; dot: string; style: string }> = {
  slack:   { label: 'Slack',   dot: 'bg-[#E01E5A]', style: 'text-[#C41548] bg-[#FDF2F5] border-[#F5C2CF]' },
  github:  { label: 'GitHub',  dot: 'bg-[#656D76]', style: 'text-[#4A5568] bg-[#F6F8FA] border-[#D1D9E0]' },
  notion:  { label: 'Notion',  dot: 'bg-[#37352F]', style: 'text-[#37352F] bg-[#F7F6F3] border-[#E3E2DE]' },
  linear:  { label: 'Linear',  dot: 'bg-[#5E6AD2]', style: 'text-[#4A53B0] bg-[#F0F0FC] border-[#CACBE8]' },
  meeting: { label: 'Meeting', dot: 'bg-[#16A34A]', style: 'text-[#166534] bg-[#F0FDF4] border-[#BBF7D0]' },
  agent:   { label: 'Agent',   dot: 'bg-[#5B5BD6]', style: 'text-[#4A4AAF] bg-[#F0F0FC] border-[#CACBE8]' },
  manual:  { label: 'Manual',  dot: 'bg-[#8B8985]', style: 'text-[#575553] bg-[#F7F6F3] border-[#E3E2DE]' },
}

export function SourcePill({ source, className }: { source: Source; className?: string }) {
  const cfg = config[source] ?? config.manual
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-mono text-[10px] font-medium px-1.5 py-0.5 rounded border',
      cfg.style, className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
