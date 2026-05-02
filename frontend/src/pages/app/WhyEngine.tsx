import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ThumbsUp, ThumbsDown, AlertCircle, Zap } from 'lucide-react'
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
  const s = c.source.toLowerCase()
  if (s.includes('slack'))   return 'slack'
  if (s.includes('github'))  return 'github'
  if (s.includes('notion'))  return 'notion'
  if (s.includes('meeting')) return 'meeting'
  return 'linear'
}

export default function WhyEngine() {
  const [query,      setQuery]      = useState('')
  const [result,     setResult]     = useState<RecallResult | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
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
      setError(err instanceof ApiError ? err.message : 'Something went wrong â€” please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFeedback(helpful: boolean) {
    if (!result || feedbackGiven) return
    setFeedbackGiven(helpful ? 'up' : 'down')
    try {
      await recallApi.feedback(result.queryId, helpful)
    } catch { /* non-critical */ }
  }

  return (
    <div className="max-w-[720px] mx-auto px-8 py-7">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-text-1 mb-1">Recall</h1>
        <p className="text-[13px] text-text-3">Ask anything your company has ever known. Get a cited, confident answer from real memory.</p>
      </div>

      {/* Query input */}
      <div className="mb-6">
        <div className="flex items-center gap-3 rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] px-4 py-3 focus-within:border-[#3D3D3D] focus-within:bg-[#212121] transition-all duration-150">
          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery(query)}
            placeholder="Why did weâ€¦?   What causedâ€¦?   Who decidedâ€¦?"
            className="flex-1 bg-transparent text-[14px] text-text-1 placeholder:text-text-4 outline-none"
          />
          <button
            onClick={() => handleQuery(query)}
            disabled={!query.trim() || loading}
            className="flex items-center gap-1.5 h-7 px-3 rounded bg-primary text-[12px] font-medium text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Suggestions */}
        {!result && !loading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => handleQuery(s)}
                className="text-[12px] text-text-3 border border-[#2E2E2E] rounded px-3 py-1.5 hover:text-text-2 hover:border-[#3D3D3D] hover:bg-white/[0.03] transition-all">
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400 mb-4">
          {error}
        </motion.div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full shimmer mt-1.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 shimmer rounded w-1/3" />
                  <div className="h-2.5 shimmer rounded w-3/4" />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

            {/* Cannot answer */}
            {result.cannotAnswer ? (
              <div className="rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-text-4" />
                  <span className="text-[13px] font-medium text-text-2">Not enough context</span>
                  <ConfidenceBadge confidence={result.confidence} showBar />
                </div>
                <p className="text-[13px] text-text-3">
                  Dyson found {result.sourceNodes.length} related events but confidence is below the
                  threshold to compose a trustworthy answer. Source events are shown below.
                </p>
              </div>
            ) : (
              <>
                {/* Timeline header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-text-4 uppercase tracking-wider">Memory trail</span>
                  <ConfidenceBadge confidence={result.confidence} showBar />
                </div>

                {/* Citations timeline */}
                {result.citations.length > 0 && (
                  <div className="rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] overflow-hidden mb-4">
                    {result.citations.map((c, i) => (
                      <motion.div
                        key={c.nodeId}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={cn(
                          'flex gap-4 p-4 row-hover group',
                          i < result.citations.length - 1 && 'border-b border-[#2E2E2E]'
                        )}
                      >
                        {/* Dot + line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.07 + 0.1, type: 'spring', stiffness: 400 }}
                            className="w-2 h-2 rounded-full bg-citation mt-1 flex-shrink-0"
                          />
                          {i < result.citations.length - 1 && (
                            <div className="w-px flex-1 bg-[#2E2E2E] mt-1.5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <SourcePill source={sourceFromCitation(c)} />
                          </div>
                          <p className="text-[13px] font-medium text-text-2 mb-0.5">{c.title}</p>
                          {c.snippet && (
                            <p className="text-[12px] text-text-3 leading-relaxed">{c.snippet}</p>
                          )}
                          {c.externalUrl && (
                            <a
                              href={c.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary/60 hover:text-primary mt-1 inline-flex items-center gap-1 transition-colors"
                            >
                              view source â†’
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Synthesis */}
                {result.answer && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-lg border border-citation/15 bg-citation/[0.05] p-4 mb-4"
                  >
                    <p className="text-[11px] font-mono text-citation uppercase tracking-wider mb-2">Synthesis</p>
                    <p className="text-[13px] text-text-2 leading-relaxed">{result.answer}</p>
                    {result.citations.length > 0 && (
                      <div className="flex gap-1.5 mt-3">
                        {result.citations.map((_, i) => (
                          <button
                            key={i}
                            className="w-5 h-5 rounded bg-citation/10 border border-citation/20 text-citation text-[10px] font-mono hover:bg-citation/20 transition-colors flex items-center justify-center"
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-4">Was this helpful?</span>
                <button
                  onClick={() => handleFeedback(true)}
                  disabled={!!feedbackGiven}
                  className={cn(
                    'p-1.5 rounded hover:bg-white/[0.05] transition-all',
                    feedbackGiven === 'up' ? 'text-success' : 'text-text-4 hover:text-success'
                  )}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  disabled={!!feedbackGiven}
                  className={cn(
                    'p-1.5 rounded hover:bg-white/[0.05] transition-all',
                    feedbackGiven === 'down' ? 'text-danger' : 'text-text-4 hover:text-danger'
                  )}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                {feedbackGiven && (
                  <span className="text-[11px] text-text-4">Thanks for the feedback.</span>
                )}
              </div>
              <button className="flex items-center gap-1 text-[12px] text-text-4 hover:text-text-3 transition-colors">
                <AlertCircle className="w-3 h-3" />
                Flag incorrect
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



