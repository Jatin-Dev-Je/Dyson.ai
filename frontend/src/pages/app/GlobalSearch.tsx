import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Zap, List, FileText, ArrowRight, Clock } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

type ResultType = 'decision' | 'event' | 'query'
type Result = { id: string; type: ResultType; title: string; sub: string; source: 'slack' | 'github' | 'notion' | 'meeting' | null; confidence: number | null; time: string }

const allResults: Result[] = [
  { id: '1', type: 'decision', title: 'JWT auth replaces session tokens',         sub: 'Backend · Mar 19',  source: 'slack',   confidence: 0.91, time: '2w ago' },
  { id: '2', type: 'decision', title: 'Modular monolith before microservices',    sub: 'Eng · Feb 28',      source: 'notion',  confidence: 0.96, time: '2m ago' },
  { id: '3', type: 'event',    title: 'Rate-limit bug reported in #incidents',    sub: 'Slack · Mar 12',    source: 'slack',   confidence: null,  time: '1m ago' },
  { id: '4', type: 'event',    title: 'PR #4502 merged — JWT migration',          sub: 'GitHub · Mar 19',   source: 'github',  confidence: null,  time: '3w ago' },
  { id: '5', type: 'query',    title: 'Why did we move to JWT auth?',             sub: 'WHY Engine query',  source: null,      confidence: 0.91,  time: '2h ago' },
  { id: '6', type: 'decision', title: 'pgvector over Pinecone',                   sub: 'Infra · Apr 18',    source: 'meeting', confidence: 0.85,  time: '1w ago' },
  { id: '7', type: 'event',    title: 'RFC: JWT migration — 3 contributors',      sub: 'Notion · Mar 14',   source: 'notion',  confidence: null,  time: '3w ago' },
  { id: '8', type: 'query',    title: 'What caused the Q3 incident?',             sub: 'WHY Engine query',  source: null,      confidence: 0.87,  time: '5h ago' },
]

const typeIcon: Record<ResultType, React.ElementType> = { decision: List, event: FileText, query: Zap }
const typeLabel: Record<ResultType, string> = { decision: 'Decision', event: 'Event', query: 'Query' }
const typeColor: Record<ResultType, string> = {
  decision: 'text-citation bg-citation/10 border-citation/20',
  event:    'text-white/40 bg-white/[0.04] border-white/[0.08]',
  query:    'text-primary bg-primary/10 border-primary/20',
}

const recent = ['JWT auth migration', 'Q3 rate limit incident', 'pgvector decision', 'payments monolith']

export default function GlobalSearch() {
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<ResultType | 'all'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = allResults.filter(r => {
    const matchQ = !query || r.title.toLowerCase().includes(query.toLowerCase())
    const matchF = filter === 'all' || r.type === filter
    return matchQ && matchF
  })

  return (
    <div className="px-8 py-7 max-w-[860px] mx-auto">
      <h1 className="text-[22px] font-semibold text-white/90 mb-6">Search</h1>

      {/* Search input */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search decisions, events, WHY queries..."
          className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/[0.09] bg-white/[0.03] text-[14px] text-white placeholder:text-white/20 outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">⌘</kbd>
          <kbd className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">K</kbd>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'decision', 'event', 'query'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[12.5px] border transition-all duration-150',
              filter === f
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'border-white/[0.07] text-white/35 hover:text-white/60 hover:border-white/[0.12] hover:bg-white/[0.03]'
            )}
          >
            {f === 'all' ? 'All' : typeLabel[f] + 's'}
          </button>
        ))}
      </div>

      {!query ? (
        /* Recent searches */
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-white/25" />
            <span className="text-[11px] font-mono text-white/25 uppercase tracking-wider">Recent searches</span>
          </div>
          <div className="space-y-1">
            {recent.map((r, i) => (
              <button
                key={i}
                onClick={() => setQuery(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13.5px] text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-all text-left group"
              >
                <Search className="w-3.5 h-3.5 flex-shrink-0" />
                {r}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Results */
        <AnimatePresence>
          {results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] text-white/25">No results for "{query}"</p>
              <p className="text-[12px] text-white/15 mt-1">Try a different keyword or filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-mono text-white/25 uppercase tracking-wider mb-3">{results.length} results</p>
              {results.map((r, i) => {
                const Icon = typeIcon[r.type]
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-[#0F0F17] hover:bg-[#131320] hover:border-white/[0.12] transition-all cursor-pointer group">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.07] transition-colors">
                        <Icon className="w-3.5 h-3.5 text-white/35" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] text-white/75 group-hover:text-white/95 transition-colors truncate mb-1">{r.title}</p>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-full border', typeColor[r.type])}>{typeLabel[r.type]}</span>
                          <span className="text-[11px] text-white/25">{r.sub}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {r.source !== null && <SourcePill source={r.source} />}
                        {r.confidence !== null && <ConfidenceBadge confidence={r.confidence} />}
                        <span className="text-[11px] font-mono text-white/20">{r.time}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
