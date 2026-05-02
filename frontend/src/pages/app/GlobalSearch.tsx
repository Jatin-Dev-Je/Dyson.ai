import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, ArrowRight, Clock, Loader2, FileText } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { searchApi, type SearchResult } from '@/lib/api'

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
      setResults(await searchApi.search(q))
    } catch {
      setError('Search failed — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    <div className="max-w-[760px] mx-auto px-8 py-8">
      <h1 className="text-[22px] font-semibold text-ink-1 mb-6">Search</h1>

      {/* Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          placeholder="Search memories, decisions, events…"
          className="w-full h-11 pl-10 pr-12 bg-surface border border-line rounded-lg text-[14px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {loading
            ? <Loader2 className="w-4 h-4 text-ink-4 animate-spin" />
            : <span className="text-[11px] font-mono text-ink-4">⌘K</span>}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-[13px] text-danger">
          {error}
        </div>
      )}

      {!query ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-ink-4" />
            <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-[0.06em]">Recent searches</span>
          </div>
          <div className="space-y-0.5">
            {recent.map((r, i) => (
              <button key={i} onClick={() => setQuery(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-ink-2 hover:bg-subtle hover:text-ink-1 transition-all text-left group">
                <Search className="w-3.5 h-3.5 text-ink-4 group-hover:text-ink-3 flex-shrink-0" />
                {r}
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 text-ink-4 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ) : results !== null ? (
        results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-ink-2">No results for "{query}"</p>
            <p className="text-[12px] text-ink-4 mt-1">Try a different keyword or connect more sources</p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-[0.06em] mb-3">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1.5">
              {results.map(r => (
                <a key={r.nodeId} href={r.url ?? '#'} target={r.url ? '_blank' : undefined} rel="noreferrer"
                  className="flex items-center gap-4 px-4 py-3.5 bg-surface border border-line rounded-lg hover:border-line-strong hover:shadow-sm transition-all group cursor-pointer">
                  <div className="w-8 h-8 rounded-md bg-subtle border border-line flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-ink-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium text-ink-1 truncate mb-0.5">{r.title}</p>
                    {r.summary && <p className="text-[12px] text-ink-3 truncate">{r.summary}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <SourcePill source={sourceType(r.source)} />
                    {r.confidence != null && <ConfidenceBadge confidence={r.confidence} />}
                    <ArrowRight className="w-3.5 h-3.5 text-ink-4 group-hover:text-primary transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}
