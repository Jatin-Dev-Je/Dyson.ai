import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ChevronDown, ChevronRight, ArrowRight, X } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

type Status = 'active' | 'shipped' | 'superseded'
type Decision = {
  id: string; date: string; title: string; team: string
  source: 'slack' | 'github' | 'notion' | 'meeting'
  status: Status; events: number; confidence: number
  summary: string
}

const decisions: Decision[] = [
  { id: '1', date: 'Apr 24', title: 'Move to cursor-based pagination',          team: 'Backend',  source: 'slack',   status: 'active',     events: 3, confidence: 0.88, summary: 'Offset pagination was causing inconsistent results during concurrent inserts. Decision made in #backend after issue #3821.' },
  { id: '2', date: 'Apr 21', title: 'Deprecate v1 API by June 2026',            team: 'Platform', source: 'notion',  status: 'active',     events: 5, confidence: 0.92, summary: 'v1 API usage dropped to 3% of traffic. Deprecation approved in platform RFC after 2 quarters of migration support.' },
  { id: '3', date: 'Apr 18', title: 'Use pgvector over Pinecone',               team: 'Infra',    source: 'meeting', status: 'active',     events: 4, confidence: 0.85, summary: 'Cost analysis showed 60% savings with pgvector at current scale. Decision finalized in infra review meeting Apr 18.' },
  { id: '4', date: 'Mar 30', title: 'JWT auth replaces session tokens',         team: 'Backend',  source: 'slack',   status: 'shipped',    events: 6, confidence: 0.91, summary: 'Rate-limit incident on Mar 12 exposed session flooding. JWT migration shipped via PR #4502.' },
  { id: '5', date: 'Mar 15', title: 'In-memory rate limiter replaces Redis',    team: 'API',      source: 'github',  status: 'shipped',    events: 3, confidence: 0.83, summary: 'Redis latency spikes at p99 were affecting API response times. In-memory token bucket shipped in v2.4.' },
  { id: '6', date: 'Feb 28', title: 'Modular monolith before microservices',    team: 'Eng',      source: 'notion',  status: 'active',     events: 8, confidence: 0.96, summary: 'Architectural decision to ship as modular monolith and extract services only at proven scale thresholds.' },
  { id: '7', date: 'Feb 10', title: 'Drizzle ORM over Prisma',                 team: 'Backend',  source: 'slack',   status: 'shipped',    events: 4, confidence: 0.79, summary: 'Performance benchmarks and TypeScript-native design preferred. Drizzle adopted after a 2-week evaluation.' },
  { id: '8', date: 'Jan 22', title: 'Dropped Kafka for Pub/Sub',               team: 'Infra',    source: 'meeting', status: 'superseded', events: 5, confidence: 0.87, summary: 'Initial Kafka plan superseded after GCP Pub/Sub proved sufficient and reduced operational overhead.' },
]

const statusConfig: Record<Status, { label: string; dot: string; badge: string }> = {
  active:     { label: 'Active',     dot: 'bg-primary',    badge: 'text-primary/80 bg-primary/10 border-primary/20' },
  shipped:    { label: 'Shipped',    dot: 'bg-green-400',  badge: 'text-green-400 bg-green-500/10 border-green-500/20' },
  superseded: { label: 'Superseded', dot: 'bg-white/25',   badge: 'text-white/35 bg-white/[0.04] border-white/10 line-through' },
}

const teams = ['All teams', 'Backend', 'Platform', 'Infra', 'API', 'Eng']
const statuses: Status[] = ['active', 'shipped', 'superseded']

function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border', cfg.badge)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function DecisionRow({ d, onExpand, expanded }: { d: Decision; onExpand: () => void; expanded: boolean }) {
  return (
    <>
      <motion.tr
        onClick={onExpand}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
        className="group cursor-pointer transition-colors border-b border-white/[0.04] last:border-0"
      >
        <td className="px-5 py-3.5">
          <span className="text-[11px] font-mono text-white/25">{d.date}</span>
        </td>
        <td className="px-3 py-3.5">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn(
              'w-3.5 h-3.5 text-white/20 transition-transform duration-200 flex-shrink-0',
              expanded && 'rotate-90 text-primary'
            )} />
            <span className={cn(
              'text-[13px] font-medium transition-colors',
              d.status === 'superseded' ? 'text-white/30 line-through' : 'text-white/75 group-hover:text-white/95'
            )}>
              {d.title}
            </span>
          </div>
        </td>
        <td className="px-3 py-3.5 hidden md:table-cell">
          <span className="text-[12px] font-mono text-white/30">{d.team}</span>
        </td>
        <td className="px-3 py-3.5 hidden sm:table-cell">
          <SourcePill source={d.source} />
        </td>
        <td className="px-3 py-3.5 hidden lg:table-cell">
          <span className="text-[11px] font-mono text-white/25">{d.events} events</span>
        </td>
        <td className="px-3 py-3.5">
          <StatusBadge status={d.status} />
        </td>
        <td className="px-5 py-3.5">
          <ConfidenceBadge confidence={d.confidence} />
        </td>
      </motion.tr>

      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <td colSpan={7} className="px-0 py-0 border-b border-white/[0.06]">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-12 py-4 bg-white/[0.015]">
                  <p className="text-[13px] text-white/50 leading-relaxed mb-3">{d.summary}</p>
                  <button className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors font-medium">
                    View full timeline <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  )
}

export default function DecisionLog() {
  const [search,    setSearch]    = useState('')
  const [team,      setTeam]      = useState('All teams')
  const [status,    setStatus]    = useState<Status | 'all'>('all')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [teamOpen,  setTeamOpen]  = useState(false)
  const [statOpen,  setStatOpen]  = useState(false)

  const filtered = decisions.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.team.toLowerCase().includes(search.toLowerCase())
    const matchTeam   = team === 'All teams' || d.team === team
    const matchStatus = status === 'all' || d.status === status
    return matchSearch && matchTeam && matchStatus
  })

  return (
    <div className="px-8 py-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-white/90 mb-1">Decision Log</h1>
          <p className="text-[13.5px] text-white/35">{decisions.length} decisions detected across your stack</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search decisions..."
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white/70 placeholder:text-white/20 outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Team filter */}
        <div className="relative">
          <button
            onClick={() => { setTeamOpen(v => !v); setStatOpen(false) }}
            className="flex items-center gap-2 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white/50 hover:text-white/80 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            {team}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', teamOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {teamOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-1 z-30 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#131320] shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-1.5"
              >
                {teams.map(t => (
                  <button
                    key={t}
                    onClick={() => { setTeam(t); setTeamOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {t}
                    {t === team && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => { setStatOpen(v => !v); setTeamOpen(false) }}
            className="flex items-center gap-2 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[13px] text-white/50 hover:text-white/80 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all"
          >
            Status: {status === 'all' ? 'All' : statusConfig[status].label}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', statOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {statOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-1 z-30 min-w-[150px] rounded-xl border border-white/[0.08] bg-[#131320] shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-1.5"
              >
                <button
                  onClick={() => { setStatus('all'); setStatOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  All statuses
                  {status === 'all' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setStatOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig[s].dot)} />
                      {statusConfig[s].label}
                    </div>
                    {status === s && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="text-[12px] font-mono text-white/20 ml-auto">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0F0F17] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Date', 'Decision', 'Team', 'Source', 'Events', 'Status', 'Confidence'].map(h => (
                <th key={h} className={cn(
                  'px-3 py-3 text-left text-[10px] font-mono text-white/25 uppercase tracking-wider font-medium',
                  h === 'Date' && 'pl-5',
                  h === 'Confidence' && 'pr-5',
                  h === 'Team' && 'hidden md:table-cell',
                  h === 'Source' && 'hidden sm:table-cell',
                  h === 'Events' && 'hidden lg:table-cell',
                )}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-white/25">
                    No decisions match your filters
                  </td>
                </tr>
              ) : (
                filtered.map(d => (
                  <DecisionRow
                    key={d.id}
                    d={d}
                    expanded={expanded === d.id}
                    onExpand={() => setExpanded(expanded === d.id ? null : d.id)}
                  />
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
