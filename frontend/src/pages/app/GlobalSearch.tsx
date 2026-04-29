import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, ArrowRight, Clock, Loader2 } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { searchApi, type SearchResult } from '@/lib/api'
import { cn } from '@/lib/utils'

const recent = ['JWT auth migration', 'Q3 rate limit incident', 'pgvector decision', 'payments monolith']

export default function GlobalSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    setError(null)
    try {
      const res = await searchApi.search(q)
      setResults(res)
    } catch {
      setError('Search failed — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search as user types
  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    const t = setTimeout(() => { void doSearch(query) }, 350)
    return () => clearTimeout(t)
  }, [query, doSearch])

  function sourceType(source: string): 'slack' | 'github' | 'notion' | 'meeting' | 'linear' {
    const s = source.toLowerCase()
    if (s.includes('slack'))   return 'slack'
    if (s.includes('github'))  return 'github'
    if (s.includes('notion'))  return 'notion'
    if (s.includes('meeting')) return 'meeting'
    return 'linear'
  }

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
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          placeholder="Search decisions, events, WHY queries..."
          className="w-full h-12 pl-11 pr-12 rounded-xl border border-white/[0.09] bg-white/[0.03] text-[14px] text-white placeholder:text-white/20 outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading
            ? <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
            : (
              <>
                <kbd className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">⌘</kbd>
                <kbd className="text-[10px] font-mono text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">K</kbd>
              </>
            )
          }
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {!query ? (
        /* Recent searches */
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-white/25" />
            <span className="text-[11px] font-mono text-white/25 uppercase tracking-wider">Recent searches</span>
          </div>
          <div className="space-y-1">
            {recent.map((r, i) => (
              <button key={i} onClick={() => setQuery(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13.5px] text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-all text-left group">
                <Search className="w-3.5 h-3.5 flex-shrink-0" />
                {r}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ) : results !== null ? (
        /* Results */
        <AnimatePresence>
          {results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] text-white/25">No results for "{query}"</p>
              <p className="text-[12px] text-white/15 mt-1">Try a different keyword or check your connectors</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-mono text-white/25 uppercase tracking-wider mb-3">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((r, i) => (
                <motion.div
                  key={r.nodeId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <a
                    href={r.url ?? '#'}
                    target={r.url ? '_blank' : undefined}
                    rel="noreferrer"
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.06] bg-[#0F0F17] hover:bg-[#131320] hover:border-white/[0.12] transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.07] transition-colors">
                      <FileText className="w-3.5 h-3.5 text-white/35" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-white/75 group-hover:text-white/95 transition-colors truncate mb-1">{r.title}</p>
                      {r.summary && (
                        <p className="text-[12px] text-white/30 truncate">{r.summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <SourcePill source={sourceType(r.source)} />
                      {r.confidence != null && <ConfidenceBadge confidence={r.confidence} />}
                      <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-primary transition-colors" />
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      ) : null}

    </div>
  )
}
