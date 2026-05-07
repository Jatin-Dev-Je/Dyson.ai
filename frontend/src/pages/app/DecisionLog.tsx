import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Search, X } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { decisionsApi, type Decision } from '@/lib/api'
import { cn } from '@/lib/utils'

function sourceType(source: string): 'slack' | 'github' | 'notion' | 'meeting' | 'linear' {
  const s = source.toLowerCase()
  if (s.includes('slack')) return 'slack'
  if (s.includes('github')) return 'github'
  if (s.includes('notion')) return 'notion'
  if (s.includes('meeting')) return 'meeting'
  return 'linear'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MemoryRow({ decision, expanded, onExpand }: { decision: Decision; expanded: boolean; onExpand: () => void }) {
  const confidence = decision.decisionConfidence ?? 0

  return (
    <>
      <tr onClick={onExpand} className="border-b border-line last:border-0 hover:bg-subtle transition-colors cursor-pointer group">
        <td className="px-5 py-3.5">
          <span className="text-[11px] font-mono text-ink-4">{formatDate(decision.occurredAt)}</span>
        </td>
        <td className="px-3 py-3.5">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn('w-3.5 h-3.5 text-ink-4 transition-transform duration-150 flex-shrink-0', expanded && 'rotate-90 text-primary')} />
            <span className="text-[13px] font-medium text-ink-1">{decision.title}</span>
          </div>
        </td>
        <td className="px-3 py-3.5 hidden sm:table-cell">
          <SourcePill source={sourceType(decision.source)} />
        </td>
        <td className="px-5 py-3.5">
          <ConfidenceBadge confidence={confidence} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-line bg-subtle">
          <td colSpan={4} className="px-12 py-4">
            <p className="text-[13px] text-ink-2 leading-relaxed mb-3">{decision.summary ?? 'No summary available.'}</p>
            {decision.sourceUrl && (
              <a href={decision.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary-hover transition-colors font-medium">
                View source <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

type SourceFilter = 'all' | 'slack' | 'github' | 'notion' | 'meeting'

const SOURCE_FILTERS: { label: string; value: SourceFilter }[] = [
  { label: 'All',     value: 'all'     },
  { label: 'Slack',   value: 'slack'   },
  { label: 'GitHub',  value: 'github'  },
  { label: 'Notion',  value: 'notion'  },
  { label: 'Meeting', value: 'meeting' },
]

export default function MemoryGraph() {
  const [search,       setSearch]       = useState('')
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const decisionsQuery = useQuery({
    queryKey: ['decisions'],
    queryFn: () => decisionsApi.list({ limit: 100 }),
  })

  const decisions = decisionsQuery.data?.items ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return decisions.filter(d => {
      const matchesSearch = !q ||
        d.title.toLowerCase().includes(q) ||
        (d.summary ?? '').toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q)
      const matchesSource = sourceFilter === 'all' || sourceType(d.source) === sourceFilter
      return matchesSearch && matchesSource
    })
  }, [decisions, search, sourceFilter])

  return (
    <div className="px-8 py-7 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1 -tracking-wide mb-1">Memory Graph</h1>
          <p className="text-[13px] text-ink-3">{decisions.length} detected decisions in this workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter decisions..."
            className="w-full h-8 pl-9 pr-3 bg-surface border border-line rounded-lg text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setSourceFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
                sourceFilter === f.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-line text-ink-3 hover:border-line-strong hover:text-ink-2',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-[12px] font-mono text-ink-4 ml-auto">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="bg-surface border border-line rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              {['Date', 'Decision', 'Source', 'Confidence'].map(h => (
                <th key={h} className={cn(
                  'px-3 py-3 text-left text-[10px] font-semibold text-ink-4 uppercase tracking-wider',
                  h === 'Date' && 'pl-5',
                  h === 'Confidence' && 'pr-5',
                  h === 'Source' && 'hidden sm:table-cell',
                )}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {decisionsQuery.isLoading ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-[13px] text-ink-3">Loading decisions...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-[13px] text-ink-3">No decisions match your filters</td></tr>
            ) : (
              filtered.map(d => (
                <MemoryRow key={d.id} decision={d} expanded={expanded === d.id} onExpand={() => setExpanded(expanded === d.id ? null : d.id)} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
