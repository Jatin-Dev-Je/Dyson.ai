import { useState } from 'react'
import { Search, ChevronRight, ArrowRight, X, Filter, ChevronDown } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

type Status = 'active' | 'shipped' | 'superseded'
type Memory = {
  id: string; date: string; title: string; team: string
  source: 'slack' | 'github' | 'notion' | 'meeting'
  status: Status; events: number; confidence: number; summary: string
}

const memories: Memory[] = [
  { id:'1', date:'Apr 24', title:'Move to cursor-based pagination',         team:'Backend',  source:'slack',   status:'active',     events:3, confidence:0.88, summary:'Offset pagination was causing inconsistent results. Decision made in #backend after issue #3821.' },
  { id:'2', date:'Apr 21', title:'Deprecate v1 API by June 2026',           team:'Platform', source:'notion',  status:'active',     events:5, confidence:0.92, summary:'v1 API usage dropped to 3% of traffic. Deprecation approved after 2 quarters of migration support.' },
  { id:'3', date:'Apr 18', title:'Use pgvector over Pinecone',              team:'Infra',    source:'meeting', status:'active',     events:4, confidence:0.85, summary:'Cost analysis showed 60% savings with pgvector at current scale.' },
  { id:'4', date:'Mar 30', title:'JWT auth replaces session tokens',        team:'Backend',  source:'slack',   status:'shipped',    events:6, confidence:0.91, summary:'Rate-limit incident on Mar 12 exposed session flooding. JWT migration shipped via PR #4502.' },
  { id:'5', date:'Mar 15', title:'In-memory rate limiter replaces Redis',   team:'API',      source:'github',  status:'shipped',    events:3, confidence:0.83, summary:'Redis latency spikes at p99 were affecting API response times.' },
  { id:'6', date:'Feb 28', title:'Modular monolith before microservices',   team:'Eng',      source:'notion',  status:'active',     events:8, confidence:0.96, summary:'Architectural decision to ship as modular monolith and extract only at proven scale thresholds.' },
  { id:'7', date:'Feb 10', title:'Drizzle ORM over Prisma',                 team:'Backend',  source:'slack',   status:'shipped',    events:4, confidence:0.79, summary:'Performance benchmarks and TypeScript-native design preferred.' },
  { id:'8', date:'Jan 22', title:'Dropped Kafka for Pub/Sub',              team:'Infra',    source:'meeting', status:'superseded', events:5, confidence:0.87, summary:'Initial Kafka plan superseded after GCP Pub/Sub proved sufficient.' },
]

const statusCfg: Record<Status, { label: string; dot: string; style: string }> = {
  active:     { label:'Active',     dot:'bg-primary',  style:'text-primary bg-primary/[0.06] border-primary/20' },
  shipped:    { label:'Shipped',    dot:'bg-success',  style:'text-success bg-green-50 border-green-200' },
  superseded: { label:'Superseded', dot:'bg-ink-4',    style:'text-ink-3 bg-subtle border-line line-through' },
}

const teams = ['All teams', 'Backend', 'Platform', 'Infra', 'API', 'Eng']

function StatusBadge({ status }: { status: Status }) {
  const { label, dot, style } = statusCfg[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border', style)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  )
}

function MemoryRow({ m, expanded, onExpand }: { m: Memory; expanded: boolean; onExpand: () => void }) {
  return (
    <>
      <tr onClick={onExpand}
        className="border-b border-line last:border-0 hover:bg-subtle transition-colors cursor-pointer group">
        <td className="px-5 py-3.5">
          <span className="text-[11px] font-mono text-ink-4">{m.date}</span>
        </td>
        <td className="px-3 py-3.5">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn('w-3.5 h-3.5 text-ink-4 transition-transform duration-150 flex-shrink-0', expanded && 'rotate-90 text-primary')} />
            <span className={cn('text-[13px] font-medium', m.status === 'superseded' ? 'text-ink-3 line-through' : 'text-ink-1')}>
              {m.title}
            </span>
          </div>
        </td>
        <td className="px-3 py-3.5 hidden md:table-cell">
          <span className="text-[12px] font-mono text-ink-3">{m.team}</span>
        </td>
        <td className="px-3 py-3.5 hidden sm:table-cell">
          <SourcePill source={m.source} />
        </td>
        <td className="px-3 py-3.5 hidden lg:table-cell">
          <span className="text-[11px] font-mono text-ink-4">{m.events} events</span>
        </td>
        <td className="px-3 py-3.5">
          <StatusBadge status={m.status} />
        </td>
        <td className="px-5 py-3.5">
          <ConfidenceBadge confidence={m.confidence} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-line bg-subtle">
          <td colSpan={7} className="px-12 py-4">
            <p className="text-[13px] text-ink-2 leading-relaxed mb-3">{m.summary}</p>
            <button className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary-hover transition-colors font-medium">
              View full memory trail <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </td>
        </tr>
      )}
    </>
  )
}

export default function MemoryGraph() {
  const [search,   setSearch]   = useState('')
  const [team,     setTeam]     = useState('All teams')
  const [status,   setStatus]   = useState<Status | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [teamOpen, setTeamOpen] = useState(false)

  const filtered = memories.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase())
    const matchTeam   = team === 'All teams' || m.team === team
    const matchStatus = status === 'all' || m.status === status
    return matchSearch && matchTeam && matchStatus
  })

  return (
    <div className="px-8 py-7 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1 mb-1">Memory Graph</h1>
          <p className="text-[13px] text-ink-3">{memories.length} decisions captured across your stack</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-4" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter memories…"
            className="w-full h-8 pl-9 pr-3 bg-surface border border-line rounded-md text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Team filter */}
        <div className="relative">
          <button onClick={() => setTeamOpen(v => !v)}
            className="flex items-center gap-2 h-8 px-3 bg-surface border border-line rounded-md text-[13px] text-ink-2 hover:border-line-strong hover:bg-subtle transition-all">
            <Filter className="w-3.5 h-3.5 text-ink-4" />
            {team}
            <ChevronDown className={cn('w-3.5 h-3.5 text-ink-4 transition-transform', teamOpen && 'rotate-180')} />
          </button>
          {teamOpen && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-surface border border-line rounded-lg shadow-md py-1 min-w-[140px] animate-fade-in">
              {teams.map(t => (
                <button key={t} onClick={() => { setTeam(t); setTeamOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-[6px] text-[13px] text-ink-2 hover:bg-subtle hover:text-ink-1 transition-colors">
                  {t}
                  {t === team && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-subtle border border-line rounded-md p-0.5">
          {(['all', 'active', 'shipped', 'superseded'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn('px-3 py-1 rounded text-[12px] font-medium transition-all',
                status === s ? 'bg-surface text-ink-1 shadow-sm border border-line' : 'text-ink-3 hover:text-ink-2')}>
              {s === 'all' ? 'All' : statusCfg[s].label}
            </button>
          ))}
        </div>

        <span className="text-[12px] font-mono text-ink-4 ml-auto">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface border border-line rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              {['Date', 'Memory', 'Team', 'Source', 'Events', 'Status', 'Confidence'].map(h => (
                <th key={h} className={cn(
                  'px-3 py-3 text-left text-[10px] font-semibold text-ink-4 uppercase tracking-wider',
                  h === 'Date' && 'pl-5',
                  h === 'Confidence' && 'pr-5',
                  h === 'Team'   && 'hidden md:table-cell',
                  h === 'Source' && 'hidden sm:table-cell',
                  h === 'Events' && 'hidden lg:table-cell',
                )}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-ink-3">No memories match your filters</td></tr>
            ) : (
              filtered.map(m => (
                <MemoryRow key={m.id} m={m} expanded={expanded === m.id} onExpand={() => setExpanded(expanded === m.id ? null : m.id)} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
