import { useState } from 'react'
import { ArrowRight, ThumbsUp, ThumbsDown, Brain, Loader2, AlertCircle } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { recallApi, type RecallResult, type Citation, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const suggestions = [
  'What do we know about our auth system?',
  'What happened during the Q3 incident?',
  'Why did we choose pgvector?',
  'What constraints exist on the payments service?',
]

function sourceFromCitation(c: Citation): 'slack' | 'github' | 'notion' | 'meeting' | 'linear' {
  const s = `${c.sourceUrl ?? ''} ${c.sourceNodeId}`.toLowerCase()
  if (s.includes('slack'))   return 'slack'
  if (s.includes('github'))  return 'github'
  if (s.includes('notion'))  return 'notion'
  if (s.includes('meeting')) return 'meeting'
  return 'linear'
}

export default function Recall() {
  const [query,         setQuery]         = useState('')
  const [result,        setResult]        = useState<RecallResult | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null)

  async function handleQuery(q: string) {
    if (!q.trim()) return
    setQuery(q)
    setLoading(true)
    setResult(null)
    setError(null)
    setFeedbackGiven(null)
    try {
      const res = await recallApi.ask(q)
      setResult(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFeedback(helpful: boolean) {
    if (!result || feedbackGiven) return
    setFeedbackGiven(helpful ? 'up' : 'down')
    try { await recallApi.feedback(result.queryId, helpful) } catch { /* non-critical */ }
  }

  return (
    <div className="max-w-[700px] mx-auto px-8 py-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-ink-1 mb-1">Recall</h1>
        <p className="text-[13px] text-ink-3">Ask anything your company has ever known. Get a cited, confident answer.</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
          <Brain className="w-4 h-4 text-ink-3 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery(query)}
            placeholder="What does the company know about…?"
            className="flex-1 bg-transparent text-[14px] text-ink-1 placeholder:text-ink-4 outline-none"
          />
          <button
            onClick={() => handleQuery(query)}
            disabled={!query.trim() || loading}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-primary text-[12px] font-medium text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!result && !loading && !error && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map(s => (
              <button key={s} onClick={() => handleQuery(s)}
                className="text-[12px] text-ink-2 bg-surface border border-line rounded-full px-3 py-1.5 hover:border-line-strong hover:bg-subtle hover:text-ink-1 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-danger mb-5">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-2 h-2 rounded-full shimmer mt-1.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 shimmer rounded w-1/3" />
                <div className="h-2.5 shimmer rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div>
          {result.cannotAnswer ? (
            <div className="bg-surface border border-line rounded-xl p-5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-ink-4" />
                  <span className="text-[13px] font-medium text-ink-1">Not enough memory to answer</span>
                </div>
                <ConfidenceBadge confidence={result.confidence} showBar />
              </div>
              <p className="text-[13px] text-ink-2 leading-relaxed">
                Found {result.sourceNodes.length} related {result.sourceNodes.length === 1 ? 'memory' : 'memories'} but confidence is below threshold. Connect more sources or rephrase the question.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Memory trail</span>
                <ConfidenceBadge confidence={result.confidence} showBar />
              </div>

              {result.citations.length > 0 && (
                <div className="bg-surface border border-line rounded-xl overflow-hidden mb-4 shadow-sm">
                  {result.citations.map((c, i) => {
                    const node = result.sourceNodes.find(n => n.id === c.sourceNodeId)
                    return (
                    <div key={`${c.sourceNodeId}-${i}`} className={cn('flex gap-4 p-4 row-hover group', i < result.citations.length - 1 && 'border-b border-line')}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-amber mt-1" />
                        {i < result.citations.length - 1 && <div className="w-px flex-1 bg-line mt-1.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1"><SourcePill source={sourceFromCitation(c)} /></div>
                        <p className="text-[13px] font-medium text-ink-1 mb-0.5">{node?.title ?? c.claim}</p>
                        <p className="text-[12px] text-ink-2 leading-relaxed">{c.claim}</p>
                        {c.sourceUrl && (
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer"
                            className="text-[11px] text-primary hover:text-primary-hover mt-1 inline-flex items-center gap-1 transition-colors">
                            View source <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}

              {result.answer && (
                <div className="bg-amber/[0.04] border border-amber/25 rounded-xl p-5 mb-4">
                  <p className="text-[10px] font-semibold text-amber uppercase tracking-wider mb-2.5">Answer</p>
                  <p className="text-[13.5px] text-ink-1 leading-relaxed">{result.answer}</p>
                  {result.citations.length > 0 && (
                    <div className="flex gap-1.5 mt-3.5">
                      {result.citations.map((_, i) => (
                        <button key={i} className="w-5 h-5 rounded bg-amber/10 border border-amber/25 text-amber text-[10px] font-medium hover:bg-amber/20 transition-colors flex items-center justify-center">
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[12px] text-ink-3">Helpful?</span>
            <button onClick={() => handleFeedback(true)} disabled={!!feedbackGiven}
              className={cn('p-1.5 rounded-md transition-all', feedbackGiven === 'up' ? 'text-success bg-green-50' : 'text-ink-4 hover:text-success hover:bg-green-50')}>
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleFeedback(false)} disabled={!!feedbackGiven}
              className={cn('p-1.5 rounded-md transition-all', feedbackGiven === 'down' ? 'text-danger bg-red-50' : 'text-ink-4 hover:text-danger hover:bg-red-50')}>
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            {feedbackGiven && <span className="text-[11px] text-ink-3">Thanks.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
