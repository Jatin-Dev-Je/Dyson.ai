import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ThumbsUp, ThumbsDown, AlertCircle, Zap } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

const suggestions = [
  'Why did we move from session auth to JWT?',
  'What caused the Q3 rate limit incident?',
  'Why did we choose pgvector over Pinecone?',
  'Why is payments still in the monolith?',
]

const mockResult = {
  query: 'Why did we move from session auth to JWT?',
  confidence: 0.91,
  events: [
    { id: '1', date: 'Mar 12, 2024', time: '14:32', source: 'slack'   as const, title: 'Rate-limit bug reported', content: 'Rate-limit bug reported by @priya. Session tokens flooding under peak load. "This is going to bite us in prod."', url: '#' },
    { id: '2', date: 'Mar 13, 2024', time: '09:15', source: 'github'  as const, title: 'Issue #4421 opened', content: '@alex opened "Auth: investigate session token flooding". Linked to #incidents thread. Priority: High.', url: '#' },
    { id: '3', date: 'Mar 14, 2024', time: '11:00', source: 'notion'  as const, title: 'JWT Migration RFC', content: 'RFC drafted by @sarah, @alex, @dev. Proposes swap to JWT, deprecate session middleware. 3 contributors, 2 open Qs.', url: '#' },
    { id: '4', date: 'Mar 17, 2024', time: '14:00', source: 'meeting' as const, title: 'Design Review — Decision recorded', content: 'Decision: "Swap to JWT, deprecate sessions by Mar 31." Attendees: @sarah, @alex, @priya, @tom.', url: '#' },
    { id: '5', date: 'Mar 19, 2024', time: '16:44', source: 'github'  as const, title: 'PR #4502 merged', content: '"feat(auth): replace session middleware with JWT" merged by @alex. Cites RFC and design review.', url: '#' },
  ],
  synthesis: 'The shift from session auth to JWT was triggered by a rate-limit incident on Mar 12 that exposed session token flooding under load. After formal tracking and an RFC, the decision was finalized in a design review on Mar 17. PR #4502 shipped the change.',
}

export default function WhyEngine() {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState<typeof mockResult | null>(null)
  const [loading, setLoading] = useState(false)

  function handleQuery(q: string) {
    setQuery(q)
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      setLoading(false)
      setResult({ ...mockResult, query: q })
    }, 1600)
  }

  return (
    <div className="max-w-[720px] mx-auto px-8 py-7">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-text-1 mb-1">WHY Engine</h1>
        <p className="text-[13px] text-text-3">Ask any question about why a decision was made.</p>
      </div>

      {/* Query input */}
      <div className="mb-6">
        <div className="flex items-center gap-3 rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] px-4 py-3 focus-within:border-[#3D3D3D] focus-within:bg-[#212121] transition-all duration-150">
          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && query.trim() && handleQuery(query)}
            placeholder="Why did we…?   What caused…?   Who decided…?"
            className="flex-1 bg-transparent text-[14px] text-text-1 placeholder:text-text-4 outline-none"
          />
          <button
            onClick={() => query.trim() && handleQuery(query)}
            disabled={!query.trim() || loading}
            className="flex items-center gap-1.5 h-7 px-3 rounded bg-primary text-[12px] font-medium text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Suggestions */}
        {!result && !loading && (
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

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {[1,2,3].map(i => (
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
            {/* Timeline header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-text-4 uppercase tracking-wider">Causal timeline</span>
              <ConfidenceBadge confidence={result.confidence} showBar />
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] overflow-hidden mb-4">
              {result.events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={cn(
                    'flex gap-4 p-4 row-hover group',
                    i < result.events.length - 1 && 'border-b border-[#2E2E2E]'
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
                    {i < result.events.length - 1 && <div className="w-px flex-1 bg-[#2E2E2E] mt-1.5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[11px] text-text-4">{event.date} · {event.time}</span>
                      <SourcePill source={event.source} />
                    </div>
                    <p className="text-[13px] font-medium text-text-2 mb-0.5">{event.title}</p>
                    <p className="text-[12px] text-text-3 leading-relaxed">{event.content}</p>
                    <a href={event.url} className="text-[11px] text-primary/60 hover:text-primary mt-1 inline-flex items-center gap-1 transition-colors">
                      view source →
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Synthesis */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-lg border border-citation/15 bg-citation/[0.05] p-4 mb-4"
            >
              <p className="text-[11px] font-mono text-citation uppercase tracking-wider mb-2">Synthesis</p>
              <p className="text-[13px] text-text-2 leading-relaxed">{result.synthesis}</p>
              <div className="flex gap-1.5 mt-3">
                {result.events.map((_, i) => (
                  <button key={i} className="w-5 h-5 rounded bg-citation/10 border border-citation/20 text-citation text-[10px] font-mono hover:bg-citation/20 transition-colors flex items-center justify-center">
                    {i + 1}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Feedback */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-text-4">Was this helpful?</span>
                <button className="p-1.5 rounded hover:bg-white/[0.05] text-text-4 hover:text-success transition-all">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded hover:bg-white/[0.05] text-text-4 hover:text-danger transition-all">
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <button className="flex items-center gap-1 text-[12px] text-text-4 hover:text-text-3 transition-colors">
                <AlertCircle className="w-3 h-3" />
                Flag incorrect link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
