import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Check, ChevronRight,
  Menu, X, Zap, Shield, Bot, GitPullRequest,
  MessageSquare, FileText, ThumbsUp, ThumbsDown,
  Lock, Quote, BookOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { DysonMark } from '@/components/shared/DysonMark'
import { cn } from '@/lib/utils'

// ════════════════════════════════════════════════════════════════════════════
// HERO BACKGROUND — ambient node graph (the brand metaphor felt, not stated)
// ════════════════════════════════════════════════════════════════════════════
function HeroBg() {
  // Five-node graph rendered very faintly. Lines pulse subtly to suggest
  // "context flowing in" without distracting from the headline.
  const nodes = [
    { x: 12, y: 22 }, { x: 88, y: 18 }, { x: 6, y: 78 },
    { x: 94, y: 72 }, { x: 50, y: 50 },
  ]
  const edges: [number, number][] = [[0, 4], [1, 4], [2, 4], [3, 4], [0, 1], [2, 3]]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Soft top radial */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.10), transparent 55%)' }} />

      {/* Faint dot grid */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:  'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize:   '32px 32px',
          maskImage:        'radial-gradient(ellipse 70% 50% at 50% 35%, black 30%, transparent 100%)',
          WebkitMaskImage:  'radial-gradient(ellipse 70% 50% at 50% 35%, black 30%, transparent 100%)',
        }}
      />

      {/* Ambient graph */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-[0.25]" aria-hidden>
        <defs>
          <linearGradient id="hero-edge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {edges.map(([a, b], i) => {
          const n1 = nodes[a]!, n2 = nodes[b]!
          return (
            <motion.line
              key={i}
              x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke="url(#hero-edge)" strokeWidth="0.18" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.08, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )
        })}
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x} cy={n.y} r="0.55" fill="#A78BFA"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
          />
        ))}
      </svg>

      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#08080E] to-transparent" />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PRODUCT DEMO (hero centerpiece)
// ════════════════════════════════════════════════════════════════════════════
const demoEvents = [
  { date: 'Mar 12', time: '14:32', source: 'slack'   as const, text: 'Rate-limit bug reported in #incidents — session tokens flooding at peak load' },
  { date: 'Mar 13', time: '09:15', source: 'github'  as const, text: 'Issue #4421 opened: "Auth: investigate session token flooding"' },
  { date: 'Mar 14', time: '11:00', source: 'notion'  as const, text: 'RFC drafted: JWT migration proposal by @sarah, @alex, @dev' },
  { date: 'Mar 17', time: '14:00', source: 'meeting' as const, text: 'Decision recorded: swap to JWT, deprecate sessions by Mar 31' },
  { date: 'Mar 19', time: '16:44', source: 'github'  as const, text: 'PR #4502 merged — references RFC and design review decision' },
]

function Demo() {
  const [phase, setPhase]           = useState<'idle' | 'typing' | 'loading' | 'result'>('idle')
  const [typed, setTyped]           = useState('')
  const [visibleEvents, setVisible] = useState(0)
  const ref   = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const query = 'Why did we move from session auth to JWT?'

  useEffect(() => {
    if (!inView || phase !== 'idle') return
    setPhase('typing')
    let i = 0
    const t = setInterval(() => {
      i++
      setTyped(query.slice(0, i))
      if (i >= query.length) {
        clearInterval(t)
        setPhase('loading')
        setTimeout(() => {
          setPhase('result')
          let ev = 0
          const ev_t = setInterval(() => {
            ev++
            setVisible(ev)
            if (ev >= demoEvents.length) clearInterval(ev_t)
          }, 240)
        }, 850)
      }
    }, 28)
    return () => clearInterval(t)
  }, [inView, phase])

  return (
    <div ref={ref} className="relative w-full max-w-[680px] mx-auto">
      <div className="absolute -inset-12 bg-primary/[0.05] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.10] via-white/[0.04] to-transparent pointer-events-none" />

      <div className="relative rounded-2xl bg-[#0C0C14] overflow-hidden shadow-[0_50px_120px_-20px_rgba(0,0,0,0.7)]">

        {/* Window chrome */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] bg-[#08080E]/80">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-1">
              <DysonMark size={11} className="text-primary/70" />
              <span className="text-[11px] font-mono text-white/40">dyson.ai / why-engine</span>
            </div>
          </div>
          <div className="w-[60px]" />
        </div>

        {/* Query input */}
        <div className="px-5 py-4 border-b border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0F0F18] px-4 py-3 focus-within:border-primary/40 transition-colors">
            <Zap className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
            <span className="text-[13px] font-mono text-white/90 flex-1">
              {typed}
              {(phase === 'typing' || phase === 'loading') && (
                <span className="inline-block w-[2px] h-[14px] bg-primary ml-0.5 align-middle animate-pulse" />
              )}
            </span>
            <div className={cn(
              'flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-md transition-all',
              phase === 'loading'
                ? 'text-primary bg-primary/10 border border-primary/20'
                : 'text-white/30 border border-white/[0.08]'
            )}>
              {phase === 'loading' ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />Thinking</>
              ) : (
                'Enter ↵'
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-5 py-5 min-h-[260px]">
          {phase === 'result' && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em]">
                Causal timeline · {demoEvents.length} events
              </span>
              <ConfidenceBadge confidence={0.91} showBar />
            </div>
          )}

          <div className="space-y-0">
            {demoEvents.map((ev, i) => (
              <AnimatePresence key={i}>
                {i < visibleEvents && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-3.5 group cursor-default"
                  >
                    <div className="flex flex-col items-center flex-shrink-0">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.08, type: 'spring', stiffness: 420 }}
                        className="w-[7px] h-[7px] rounded-full bg-citation ring-[3px] ring-citation/15 mt-[5px] flex-shrink-0"
                      />
                      {i < demoEvents.length - 1 && (
                        <div className="w-px flex-1 bg-gradient-to-b from-white/15 to-transparent mt-1.5 mb-0.5 min-h-[18px]" />
                      )}
                    </div>
                    <div className={cn('flex-1 min-w-0', i < demoEvents.length - 1 ? 'pb-3.5' : 'pb-0')}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-[10px] text-white/30 tabular-nums">
                          {ev.date} · {ev.time}
                        </span>
                        <SourcePill source={ev.source} />
                      </div>
                      <p className="text-[12.5px] text-white/55 leading-relaxed group-hover:text-white/85 transition-colors duration-200">
                        {ev.text}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>

          {phase === 'loading' && (
            <div className="space-y-3.5">
              {[100, 75, 88].map((w, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="w-[7px] h-[7px] rounded-full shimmer mt-[5px] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <div className="h-2.5 shimmer rounded-full" style={{ width: `${w * 0.35}%` }} />
                    <div className="h-2.5 shimmer rounded-full" style={{ width: `${w}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Synthesis footer */}
        {phase === 'result' && visibleEvents >= demoEvents.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mx-5 mb-5 rounded-xl border border-citation/20 bg-citation/[0.05] p-4"
          >
            <p className="text-[10px] font-mono text-citation uppercase tracking-[0.15em] mb-2">Synthesis</p>
            <p className="text-[12.5px] text-white/65 leading-relaxed">
              The switch from session auth to JWT was triggered by a{' '}
              <span className="cite text-white">rate-limit incident on Mar 12</span>{' '}
              that exposed session token flooding under load. After formal tracking,{' '}
              <span className="cite text-white">an RFC was drafted</span>{' '}
              and the decision finalised in a{' '}
              <span className="cite text-white">design review on Mar 17</span>.
            </p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                {demoEvents.map((_, i) => (
                  <span key={i} className="w-5 h-5 rounded-md bg-citation/10 border border-citation/20 text-citation text-[10px] font-mono flex items-center justify-center hover:bg-citation/20 transition-colors cursor-pointer">
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-emerald-400 transition-colors" aria-label="Helpful">
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 transition-colors" aria-label="Not helpful">
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GRAPH TRACE — animated cross-source causal linking (the product itself)
// ════════════════════════════════════════════════════════════════════════════
function GraphTrace() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  // Five nodes positioned in a horizontal causal chain with the answer node centered below
  const nodes = [
    { id: 'incident', label: 'Incident',  source: 'slack',   x: 90,  y: 70,  detail: '#incidents · Mar 12' },
    { id: 'issue',    label: 'Issue',     source: 'github',  x: 235, y: 60,  detail: '#4421 · Mar 13' },
    { id: 'rfc',      label: 'RFC',       source: 'notion',  x: 380, y: 75,  detail: 'JWT proposal · Mar 14' },
    { id: 'review',   label: 'Decision',  source: 'meeting', x: 525, y: 60,  detail: 'Design review · Mar 17' },
    { id: 'pr',       label: 'PR',        source: 'github',  x: 670, y: 70,  detail: '#4502 · Mar 19' },
  ] as const

  const edges = [
    { from: 0, to: 1, conf: 0.94 },
    { from: 1, to: 2, conf: 0.88 },
    { from: 2, to: 3, conf: 0.96 },
    { from: 3, to: 4, conf: 0.92 },
  ]

  const sourceFill: Record<string, string> = {
    slack:   '#E01E5A',
    github:  '#8B949E',
    notion:  '#FFFFFF',
    meeting: '#22C55E',
    linear:  '#5E6AD2',
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Hairline frame */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.10] via-white/[0.04] to-transparent pointer-events-none" />
      <div className="relative rounded-2xl bg-[#0C0C14] border border-white/[0.06] overflow-hidden">

        {/* Header strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <DysonMark size={12} className="text-primary/70" />
            <span className="font-mono text-[11px] text-white/40 uppercase tracking-[0.14em]">Context graph · trace</span>
          </div>
          <span className="font-mono text-[11px] text-white/40 tabular-nums">5 events · 4 edges · conf 0.92</span>
        </div>

        {/* SVG graph */}
        <div className="relative px-6 py-9">
          <svg viewBox="0 0 760 200" className="w-full h-[200px]" aria-hidden>
            <defs>
              <linearGradient id="gt-edge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"  stopColor="#F59E0B" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
              </linearGradient>
              <radialGradient id="gt-pulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Edges + confidence labels */}
            {edges.map((e, i) => {
              const a = nodes[e.from], b = nodes[e.to]
              if (!a || !b) return null
              const midX = (a.x + b.x) / 2
              const midY = (a.y + b.y) / 2 - 14
              return (
                <g key={i}>
                  <motion.line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="url(#gt-edge)" strokeWidth={1.6} strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ delay: 0.5 + i * 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ delay: 1.0 + i * 0.25, duration: 0.4 }}
                  >
                    <rect x={midX - 18} y={midY - 9} width={36} height={16} rx={4}
                      fill="#0F0F18" stroke="#F59E0B" strokeOpacity="0.25" strokeWidth={0.8} />
                    <text x={midX} y={midY + 2} textAnchor="middle"
                      fontSize="9.5" fill="#F59E0B" fontFamily="ui-monospace, monospace" fontWeight="500">
                      {(e.conf * 100).toFixed(0)}%
                    </text>
                  </motion.g>
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((n, i) => (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 300, damping: 22 }}
              >
                {/* pulse halo */}
                <circle cx={n.x} cy={n.y} r="22" fill="url(#gt-pulse)" />
                {/* node */}
                <circle cx={n.x} cy={n.y} r="10" fill={sourceFill[n.source]} />
                <circle cx={n.x} cy={n.y} r="10" fill="none"
                  stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="0.8" />
                {/* label */}
                <text x={n.x} y={n.y + 32} textAnchor="middle"
                  fontSize="10.5" fill="#E8E8E8" fontFamily="ui-monospace, monospace" fontWeight="600">
                  {n.label}
                </text>
                <text x={n.x} y={n.y + 48} textAnchor="middle"
                  fontSize="9" fill="#636363" fontFamily="ui-monospace, monospace">
                  {n.detail}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>

        {/* Legend strip */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/[0.06] bg-black/20 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-white/35 uppercase tracking-[0.14em]">Sources</span>
            <SourcePill source="slack"   />
            <SourcePill source="github"  />
            <SourcePill source="notion"  />
            <SourcePill source="meeting" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-white/35 uppercase tracking-[0.14em]">Edge</span>
            <span className="font-mono text-[10px] text-citation">leads_to · confidence</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MINI PRODUCT VISUALS — used inside feature bento cards
// ════════════════════════════════════════════════════════════════════════════

function MiniWhyEngine() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#08080E] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-mono text-[10px] text-white/35 uppercase tracking-[0.12em]">Synthesis</span>
        <ConfidenceBadge confidence={0.91} />
      </div>
      <div className="px-3 py-3">
        <p className="text-[11.5px] text-white/65 leading-relaxed">
          The switch was triggered by a{' '}
          <span className="cite text-white">rate-limit incident</span> and finalised in a{' '}
          <span className="cite text-white">design review</span>.
        </p>
        <div className="flex gap-1 mt-2.5">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className="w-4 h-4 rounded bg-citation/10 border border-citation/20 text-citation text-[9px] font-mono flex items-center justify-center">{i}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniTrustChip() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-[0.12em]">Cited · 92%</span>
          <Check className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="h-1 rounded-full bg-emerald-500/10 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: '92%' }} />
        </div>
      </div>
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] text-white/45 uppercase tracking-[0.12em]">Refused · 0.41</span>
          <X className="w-3 h-3 text-white/45" />
        </div>
        <p className="text-[10.5px] text-white/45 leading-snug">
          Below 0.72 threshold — events returned without interpretation.
        </p>
      </div>
    </div>
  )
}

function MiniSlackBot() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1A1D21] p-3 font-sans">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0">
          <DysonMark size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[12.5px] font-bold text-white">Dyson</span>
            <span className="text-[9.5px] px-1 py-px rounded bg-white/10 text-white/60 font-medium">APP</span>
            <span className="text-[10px] text-white/35">12:08</span>
          </div>
          <p className="text-[12px] text-white/85 leading-snug">
            We moved off Redis rate-limiter after the{' '}
            <span className="cite text-white">Q3 incident</span> showed bucket overflow. Replacement: token-bucket in Postgres.
          </p>
          <div className="flex gap-1 mt-2">
            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">[1]</span>
            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">[2]</span>
            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">[3]</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniPrPanel() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#08080E] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
        <GitPullRequest className="w-3 h-3 text-emerald-400" />
        <span className="font-mono text-[10.5px] text-white/65">PR #4502 · Auth: switch to JWT</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-mono text-white/35 uppercase tracking-[0.12em] mb-1.5">Why this PR exists</p>
        <ul className="space-y-1">
          {[
            { src: 'meeting' as const, t: 'Design review · Mar 17' },
            { src: 'notion'  as const, t: 'RFC · JWT migration' },
            { src: 'slack'   as const, t: '#incidents · Mar 12' },
          ].map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <SourcePill source={r.src} />
              <span className="text-[11px] text-white/60 truncate">{r.t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MiniPack() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#08080E] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
        <BookOpen className="w-3 h-3 text-primary" />
        <span className="font-mono text-[10.5px] text-white/65">Onboarding · Platform team</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <div>
          <p className="text-[10px] font-mono text-white/35 uppercase tracking-[0.12em]">Shaped by</p>
          <p className="text-[11px] text-white/70 leading-snug">
            <span className="cite text-white">JWT migration</span> · <span className="cite text-white">rate-limit redesign</span> · <span className="cite text-white">queue split</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-white/35 uppercase tracking-[0.12em]">Open questions</p>
          <p className="text-[11px] text-white/55 leading-snug">Multi-region replication strategy · still being decided.</p>
        </div>
      </div>
    </div>
  )
}

function MiniAgentCode() {
  const lines = [
    { c: 'gray',   t: '// MCP-compatible · 1 endpoint' },
    { c: 'pink',   t: 'const ctx = await dyson.ask({' },
    { c: 'plain',  t: '  question: "Why is rate-limit',  next: 'in Postgres?",' },
    { c: 'plain',  t: '  workspace: "acme",' },
    { c: 'plain',  t: '})' },
    { c: 'gray',   t: '' },
    { c: 'pink',   t: 'ctx.citations  ' },
    { c: 'comment',t: '// → 5 cited sources' },
    { c: 'pink',   t: 'ctx.confidence ' },
    { c: 'comment',t: '// → 0.91' },
  ]
  const colorClass = (c: string) => c === 'pink' ? 'text-violet-300'
    : c === 'gray' ? 'text-white/30'
    : c === 'comment' ? 'text-emerald-300/80'
    : 'text-white/85'
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#08080E] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-mono text-[10.5px] text-white/45">@dyson/agent</span>
        <span className="font-mono text-[10px] text-white/35">ts</span>
      </div>
      <pre className="px-3 py-2.5 text-[10.5px] leading-[1.55] font-mono whitespace-pre overflow-hidden">
        {lines.map((l, i) => (
          <div key={i} className={cn('flex gap-3', colorClass(l.c))}>
            <span className="text-white/20 select-none w-3 text-right tabular-nums">{i + 1}</span>
            <span>{l.t}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════════════════════
const navLinks: { label: string; href: string }[] = [
  { label: 'Product',      href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing',      href: '#pricing' },
  { label: 'Changelog',    href: '#changelog' },
]

function Nav() {
  const [open, setOpen]     = useState(false)
  const { scrollY }         = useScroll()
  const bg    = useTransform(scrollY, [0, 60], ['rgba(8,8,14,0)', 'rgba(8,8,14,0.72)'])
  const blur  = useTransform(scrollY, [0, 60], ['blur(0px)',       'blur(18px)'])
  const bord  = useTransform(scrollY, [0, 60], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)'])

  return (
    <motion.header
      style={{ backgroundColor: bg, backdropFilter: blur, borderColor: bord }}
      className="fixed inset-x-0 top-0 z-50 border-b"
    >
      <div className="max-w-[1120px] mx-auto px-6 h-[60px] flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2 flex-shrink-0 text-white" aria-label="Dyson home">
          <DysonMark size={20} className="text-white" />
          <span className="font-medium text-[15px] tracking-[-0.015em]">Dyson</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {navLinks.map(item => (
            <a key={item.label} href={item.href}
              className="px-3.5 py-1.5 text-[13.5px] text-white/55 hover:text-white rounded-md hover:bg-white/[0.04] transition-all duration-150">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1">
          <Link to="/login">
            <button className="px-3.5 py-1.5 text-[13px] text-white/55 hover:text-white rounded-md hover:bg-white/[0.04] transition-all duration-150">Log in</button>
          </Link>
          <Link to="/signup">
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium text-[#08080E] bg-white hover:bg-white/90 rounded-md transition-all duration-150">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04]"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu" aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.06] bg-[#0A0A12] px-6 py-4"
          >
            {navLinks.map(item => (
              <a key={item.label} href={item.href} onClick={() => setOpen(false)}
                className="block py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 pt-4 border-t border-white/[0.06] mt-2">
              <Link to="/login" className="flex-1">
                <button className="w-full py-2.5 text-sm text-white/70 border border-white/10 rounded-md hover:border-white/20 hover:text-white transition-all">Log in</button>
              </Link>
              <Link to="/signup" className="flex-1">
                <button className="w-full py-2.5 text-sm font-medium text-[#08080E] bg-white rounded-md hover:bg-white/90 transition-all">Get started</button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED — section label, fade-up, integration logo
// ════════════════════════════════════════════════════════════════════════════
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-4 h-px bg-white/30" />
      <span className="text-[11px] font-mono font-medium text-white/55 uppercase tracking-[0.14em]">{children}</span>
    </div>
  )
}

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

type IntegrationName = 'Slack' | 'GitHub' | 'Notion' | 'Linear' | 'Zoom' | 'Discord'
function IntegrationLogo({ name }: { name: IntegrationName }) {
  const wrap = 'flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200'
  const ico  = 'h-[18px] w-[18px] flex-shrink-0'
  switch (name) {
    case 'Slack':   return <div className={wrap}><svg viewBox="0 0 24 24" className={ico} fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg><span className="text-[14px] font-medium tracking-[-0.005em]">Slack</span></div>
    case 'GitHub':  return <div className={wrap}><svg viewBox="0 0 24 24" className={ico} fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg><span className="text-[14px] font-medium tracking-[-0.005em]">GitHub</span></div>
    case 'Notion':  return <div className={wrap}><svg viewBox="0 0 24 24" className={ico} fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg><span className="text-[14px] font-medium tracking-[-0.005em]">Notion</span></div>
    case 'Linear':  return <div className={wrap}><svg viewBox="0 0 24 24" className={ico} fill="currentColor"><path d="M.403 13.795l9.802 9.803c5.005.992 9.467-1.94 11.225-6.422L7.539 3.282C3.115 5.087.181 9.45.403 13.795zm.836-7.928l16.894 16.893a12.014 12.014 0 0 0 2.726-1.948L3.187 3.142a12.014 12.014 0 0 0-1.948 2.725zM4.65 1.864l17.485 17.486a11.96 11.96 0 0 0 1.343-2.81L7.46.522a11.96 11.96 0 0 0-2.81 1.343zM10.17.058l13.772 13.772C24.79 8.395 20.997.094 14.553.094c-1.495 0-2.95.39-4.383-.036z"/></svg><span className="text-[14px] font-medium tracking-[-0.005em]">Linear</span></div>
    case 'Zoom':    return <div className={wrap}><svg viewBox="0 0 24 24" className={ico} fill="currentColor"><path d="M3.516 6.59A3.516 3.516 0 0 0 0 10.106v7.305A3.516 3.516 0 0 0 3.516 20.93h11.836a3.516 3.516 0 0 0 3.515-3.516v-7.305a3.516 3.516 0 0 0-3.515-3.515zm17.054 1.094-3.985 2.91v3.554l3.987 2.911a.586.586 0 0 0 .858-.519V8.2a.586.586 0 0 0-.86-.516Z"/></svg><span className="text-[14px] font-medium tracking-[-0.005em]">Zoom</span></div>
    case 'Discord': return <div className={wrap}><svg viewBox="0 0 24 24" className={ico} fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg><span className="text-[14px] font-medium tracking-[-0.005em]">Discord</span></div>
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FEATURE CARD — text + inline product visual
// ════════════════════════════════════════════════════════════════════════════
type Feature = {
  icon:    React.ElementType
  tag:     string
  title:   string
  desc:    string
  accent:  'primary' | 'citation'
  visual?: React.ReactNode
}

function FeatureCard({ f, className }: { f: Feature; className?: string }) {
  const Icon = f.icon
  return (
    <FadeUp className={cn('h-full', className)}>
      <div className={cn(
        'relative group rounded-2xl border border-white/[0.08] bg-[#0C0C14] overflow-hidden h-full',
        'hover:border-white/20 transition-all duration-300 flex flex-col'
      )}>
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
          f.accent === 'citation'
            ? 'bg-gradient-to-br from-citation/[0.06] to-transparent'
            : 'bg-gradient-to-br from-primary/[0.06] to-transparent'
        )} />

        <div className="relative flex flex-col h-full p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              f.accent === 'citation' ? 'bg-citation/[0.10] text-citation' : 'bg-white/[0.06] text-white/85'
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-white/35 uppercase tracking-[0.14em]">{f.tag}</span>
          </div>
          <h3 className="font-medium text-white mb-2 tracking-[-0.01em] text-[16px]">{f.title}</h3>
          <p className="text-white/55 leading-[1.65] text-[13px] mb-4">{f.desc}</p>
          {f.visual && <div className="mt-auto">{f.visual}</div>}
        </div>
      </div>
    </FadeUp>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// DATA
// ════════════════════════════════════════════════════════════════════════════
const features: Feature[] = [
  { icon: Zap,            tag: 'Core',       title: 'Time-Travel WHY Engine',   desc: 'Ask any "why did we…?" — get a reconstructed causal timeline grounded in real events. Cited on every claim.', accent: 'primary',  visual: <MiniWhyEngine /> },
  { icon: Shield,         tag: 'Trust',      title: 'Citations or refusal',     desc: 'No sentence without a source. Below the confidence threshold, Dyson refuses to answer rather than guess.', accent: 'citation', visual: <MiniTrustChip /> },
  { icon: MessageSquare,  tag: 'Slack',      title: 'Native Slack bot',         desc: 'Your team already asks WHY in Slack. Dyson answers inline — cited, grounded, instant.',                accent: 'primary',  visual: <MiniSlackBot /> },
  { icon: GitPullRequest, tag: 'GitHub',     title: 'PR context panel',         desc: 'Every PR surfaces the discussions and decisions that led to that code.',                                accent: 'primary',  visual: <MiniPrPanel /> },
  { icon: FileText,       tag: 'Onboarding', title: 'Auto context packs',       desc: 'New hire joins? Auto-generated context pack: decisions, trade-offs, open questions in 30 seconds.',     accent: 'primary',  visual: <MiniPack /> },
  { icon: Bot,            tag: 'Agents',     title: 'Agent context API',        desc: 'MCP-compatible. Every AI copilot queries the same grounded context graph your team trusts.',           accent: 'primary',  visual: <MiniAgentCode /> },
]

const steps = [
  { n: '01', title: 'Connect your stack',       desc: 'Three-click OAuth for Slack and GitHub. Dyson ingests events immediately — no ETL, no config.',    sources: ['slack', 'github'] as const },
  { n: '02', title: 'The graph builds itself',  desc: 'Entity extraction, decision detection, embeddings, cross-source edge linking — all automatic.',     sources: ['notion', 'meeting'] as const },
  { n: '03', title: 'Ask anything, anywhere',   desc: 'WHY Engine, Slack bot, PR panel, or API. Every answer is grounded and cited.',                       sources: ['slack', 'github'] as const },
]

const trustGuarantees = [
  { icon: Quote,  tag: 'Cited',       title: 'Every claim is cited',       desc: 'No sentence without a one-click link to the event that produced it. Uncited claims are suppressed at the system level — not a setting.' },
  { icon: Shield, tag: 'Calibrated',  title: 'Confidence-gated',           desc: 'Below 0.72 confidence, Dyson returns the events without interpretation. "I don\'t know" is a first-class output, not a fallback.' },
  { icon: Lock,   tag: 'Permission',  title: 'Permission-aware retrieval', desc: 'Before any answer, Dyson verifies you can read every source cited. Private channels you\'re not in produce zero claims, never paraphrases.' },
]

const designPartners = [
  'Engineers from teams shipping at scale at Stripe, Vercel, Notion, Anthropic, Linear, and Figma helped shape the product.',
]

const plans = [
  { name: 'Free',     price: '$0',  period: '',          desc: 'For small teams getting started', cta: 'Start free',         highlight: false, features: ['5 users', '90 days history', 'Slack + GitHub', 'WHY Engine'] },
  { name: 'Team',     price: '$25', period: '/user /mo', desc: 'For fast-growing eng teams',      cta: 'Start 14-day trial', highlight: true,  features: ['Up to 50 users', 'Full history', 'All connectors', 'Decision Log', 'Onboarding packs', 'Agent API'] },
  { name: 'Business', price: '$45', period: '/user /mo', desc: 'For teams that need controls',    cta: 'Contact sales',      highlight: false, features: ['Unlimited users', 'SOC 2 Type II', 'SSO + SCIM', 'Custom retention', 'Audit log', 'Priority support'] },
]

// ════════════════════════════════════════════════════════════════════════════
// LANDING
// ════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#08080E] text-white/90 overflow-x-hidden font-sans antialiased">
      <Nav />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative pt-[140px] pb-24 px-6 overflow-hidden">
        <HeroBg />

        <div className="relative max-w-[1120px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-9"
          >
            <a href="#" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm pl-2 pr-3 py-1 text-[12px] text-white/60 hover:border-white/20 hover:text-white transition-all duration-200">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.08em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                Beta
              </span>
              <span>Now in private beta — request access</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-7"
          >
            <h1 className="text-[52px] sm:text-[72px] lg:text-[88px] font-medium leading-[0.98] tracking-[-0.045em] text-white">
              The system of record
              <br />
              <span className="text-white/35">for </span>
              <span className="font-display italic font-normal text-white">why</span>
              <span className="text-white/35">.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[16.5px] sm:text-[17.5px] text-white/55 text-center max-w-[560px] mx-auto leading-[1.6] mb-10"
          >
            Dyson connects Slack, GitHub, Notion and meetings into one queryable
            context graph — and explains the reasoning behind every decision your team ever made.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center gap-2 mb-5 flex-wrap"
          >
            <Link to="/signup">
              <button className="group flex items-center gap-2 px-5 py-3 text-[14px] font-medium text-[#08080E] bg-white hover:bg-white/90 active:scale-[0.98] rounded-lg transition-all duration-150 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.25)]">
                Connect your stack
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <button className="flex items-center gap-2 px-5 py-3 text-[14px] text-white/70 border border-white/10 hover:border-white/20 hover:text-white rounded-lg transition-all duration-150 hover:bg-white/[0.03]">
              Watch 2-min demo
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="text-center text-[12px] text-white/35 mb-20"
          >
            Free for 5 users · No credit card · 3-minute setup
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <Demo />
          </motion.div>
        </div>
      </section>

      {/* ══ INTEGRATIONS BAR ═════════════════════════════════════════════ */}
      <section className="py-14 border-y border-white/[0.06] bg-white/[0.012]">
        <div className="max-w-[1120px] mx-auto px-6">
          <p className="text-center text-[11px] font-mono text-white/35 uppercase tracking-[0.18em] mb-8">
            Plugs into the stack you already use
          </p>
          <div className="flex items-center justify-center gap-x-8 sm:gap-x-10 gap-y-5 flex-wrap">
            {(['Slack', 'GitHub', 'Notion', 'Linear', 'Zoom', 'Discord'] as const).map((name, i, arr) => (
              <div key={name} className="flex items-center gap-x-8 sm:gap-x-10">
                <IntegrationLogo name={name} />
                {i < arr.length - 1 && (
                  <span className="hidden sm:inline-block w-px h-4 bg-white/[0.06]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GRAPH TRACE — "How does Dyson know?" ═════════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-12 max-w-[680px]">
            <SectionLabel>The graph beneath every answer</SectionLabel>
            <h2 className="text-[34px] sm:text-[42px] font-medium tracking-[-0.025em] leading-[1.08] text-white mb-4">
              Cross-source causal linking is the hard problem.
              <br />
              <span className="text-white/40">It&rsquo;s the whole product.</span>
            </h2>
            <p className="text-white/55 text-[15px] leading-[1.65] max-w-[560px]">
              Slack threads cause issues. Issues cause RFCs. RFCs cause decisions. Decisions cause code.
              Dyson links them — and tells you exactly how confident it is in each link.
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <GraphTrace />
          </FadeUp>
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-white/[0.012] border-y border-white/[0.06]">
        <div className="max-w-[980px] mx-auto">
          <FadeUp className="mb-16 max-w-[640px]">
            <SectionLabel>The cost of lost context</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-white">
              Engineering teams lose a quarter of every week to context they already had.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-white/[0.08]">
            {[
              { value: '28%',    label: 'of engineer time spent reconstructing context', sub: 'McKinsey, 2024' },
              { value: '1 day',  label: 'to find the rationale behind a 6-month-old decision', sub: 'Dyson research' },
              { value: '$1.3M',  label: 'annual cost of context loss per 100-person team', sub: 'Dyson estimate' },
            ].map((stat, i, arr) => (
              <FadeUp
                key={i} delay={i * 0.1}
                className={cn(
                  'pt-10 md:pr-10',
                  i < arr.length - 1 && 'md:border-r border-white/[0.08]',
                  i > 0 && 'md:pl-10'
                )}
              >
                <p className="text-[44px] font-medium tracking-[-0.03em] text-white leading-none mb-3 tabular-nums">{stat.value}</p>
                <p className="text-[14px] text-white/65 leading-relaxed mb-1.5">{stat.label}</p>
                <p className="text-[11px] font-mono text-white/30">{stat.sub}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-14">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] max-w-[560px] text-white">
              From fragmented tools to one queryable graph.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="relative rounded-2xl border border-white/[0.08] bg-[#0C0C14] p-7 h-full hover:border-white/20 hover:bg-[#10101A] transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[11px] font-mono font-medium text-white/35 tabular-nums">{step.n}</span>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                        <ChevronRight className="w-4 h-4 text-white/25" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-[16px] font-medium text-white mb-2.5 tracking-[-0.005em]">{step.title}</h3>
                  <p className="text-[13.5px] text-white/55 leading-[1.65] mb-5">{step.desc}</p>
                  <div className="flex gap-2">
                    {step.sources.map(s => <SourcePill key={s} source={s} />)}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES — bento with real product visuals ═══════════════════ */}
      <section id="features" className="py-28 px-6 bg-white/[0.012] border-y border-white/[0.06]">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-14">
            <SectionLabel>Product</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] max-w-[560px] text-white">
              Everything context.
              <br />
              <span className="text-white/40">Nothing you don&rsquo;t need.</span>
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5">
            <FeatureCard f={features[0]!} className="md:col-span-4" />
            <FeatureCard f={features[1]!} className="md:col-span-2" />
            <FeatureCard f={features[2]!} className="md:col-span-2" />
            <FeatureCard f={features[3]!} className="md:col-span-2" />
            <FeatureCard f={features[4]!} className="md:col-span-2" />
            <FeatureCard f={features[5]!} className="md:col-span-3" />
            <div className="md:col-span-3">
              <FadeUp className="h-full">
                <div className="relative h-full rounded-2xl border border-white/[0.08] bg-[#0C0C14] p-7 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 pointer-events-none opacity-60"
                    style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(99,102,241,0.10), transparent 50%)' }} />
                  <div className="relative flex-1 flex flex-col">
                    <span className="text-[10px] font-mono text-white/35 uppercase tracking-[0.14em] mb-2">Phase 2 — coming</span>
                    <h3 className="text-[16px] font-medium text-white mb-2 tracking-[-0.01em]">Decision Log + Search</h3>
                    <p className="text-[13px] text-white/55 leading-[1.65] mb-5">
                      Every decision your team has ever made, organised, searchable, and tied back to the events that produced it.
                    </p>
                    <div className="flex gap-2 mt-auto">
                      {['JWT migration', 'Queue split', 'Multi-region'].map(t => (
                        <span key={t} className="text-[10.5px] font-mono px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/60">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TRUST — three product guarantees ═════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-14 max-w-[640px]">
            <SectionLabel>Trust by design</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-white mb-4">
              A wrong answer shipped fast destroys trust permanently.
            </h2>
            <p className="text-white/55 text-[15px] leading-[1.65]">
              These aren&rsquo;t guidelines. They&rsquo;re enforced at the code level — every response, every time.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {trustGuarantees.map((g, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div className="relative h-full rounded-2xl border border-white/[0.08] bg-[#0C0C14] p-7 hover:border-citation/30 transition-all duration-300 group overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-citation/[0.05] to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-citation/[0.10] text-citation flex items-center justify-center">
                        <g.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-citation/80 uppercase tracking-[0.14em]">{g.tag}</span>
                    </div>
                    <h3 className="text-[16px] font-medium text-white mb-2.5 tracking-[-0.005em]">{g.title}</h3>
                    <p className="text-[13.5px] text-white/55 leading-[1.65]">{g.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DESIGN PARTNERS — honest replacement for fake testimonials ═══ */}
      <section className="py-24 px-6 bg-white/[0.012] border-y border-white/[0.06]">
        <div className="max-w-[920px] mx-auto text-center">
          <FadeUp>
            <SectionLabel>Built with engineers</SectionLabel>
            <p className="text-[24px] sm:text-[30px] font-medium tracking-[-0.02em] leading-[1.3] text-white/80 mb-6">
              <span className="font-display italic font-normal text-white">&ldquo;</span>
              {designPartners[0]}
              <span className="font-display italic font-normal text-white">&rdquo;</span>
            </p>
            <p className="text-[12.5px] font-mono text-white/35 uppercase tracking-[0.12em]">
              Private beta · not public testimonials yet
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-28 px-6">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-14 max-w-[560px]">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] mb-3 text-white">
              Simple, honest pricing.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed">Start free. Upgrade when your team needs more.</p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[920px]">
            {plans.map((plan, i) => (
              <FadeUp key={i} delay={i * 0.08}>
                <div className={cn(
                  'relative rounded-2xl p-7 h-full flex flex-col transition-all duration-300',
                  plan.highlight
                    ? 'border border-white/95 bg-white text-[#08080E] shadow-[0_24px_60px_-12px_rgba(255,255,255,0.18)]'
                    : 'border border-white/[0.08] bg-[#0C0C14] hover:border-white/20'
                )}>
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono font-medium text-white bg-[#08080E] border border-white/15 px-2.5 py-1 rounded-full uppercase tracking-[0.12em] whitespace-nowrap">
                      Most popular
                    </span>
                  )}

                  <div className="mb-6">
                    <p className={cn('text-[13px] font-medium mb-3', plan.highlight ? 'text-[#08080E]/70' : 'text-white/65')}>{plan.name}</p>
                    <div className="flex items-end gap-1 mb-2">
                      <span className="text-[40px] font-medium tracking-[-0.03em] leading-none tabular-nums">{plan.price}</span>
                      {plan.period && <span className={cn('text-[13px] mb-1', plan.highlight ? 'text-[#08080E]/50' : 'text-white/40')}>{plan.period}</span>}
                    </div>
                    <p className={cn('text-[12.5px]', plan.highlight ? 'text-[#08080E]/60' : 'text-white/40')}>{plan.desc}</p>
                  </div>

                  <ul className="space-y-3 mb-7 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check className={cn('w-3.5 h-3.5 flex-shrink-0', plan.highlight ? 'text-[#08080E]' : 'text-white/55')} />
                        <span className={cn('text-[13px]', plan.highlight ? 'text-[#08080E]/85' : 'text-white/65')}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={cn(
                    'w-full py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-150',
                    plan.highlight
                      ? 'bg-[#08080E] text-white hover:bg-[#1a1a26] active:scale-[0.98]'
                      : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white hover:bg-white/[0.03] active:scale-[0.98]'
                  )}>
                    {plan.cta}
                  </button>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp className="mt-8">
            <p className="text-[12px] text-white/35">
              All plans include a 14-day free trial of Team features · No credit card required
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ══ FINAL CTA ═════════════════════════════════════════════════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-[1120px] mx-auto">
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0C0C14] overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(99,102,241,0.10), transparent 55%)' }}
            />
            <div className="relative px-8 py-20 sm:py-24 text-center">
              <DysonMark size={48} variant="linked" animate className="text-white/85 mx-auto mb-8" />
              <h2 className="text-[40px] sm:text-[56px] font-medium tracking-[-0.04em] leading-[1.0] mb-5 text-white">
                Stop losing the <span className="font-display italic font-normal">why</span>.
              </h2>
              <p className="text-[15px] text-white/55 leading-[1.65] mb-9 max-w-[460px] mx-auto">
                Connect your stack in 3 minutes. Ask your first WHY question today.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Link to="/signup">
                  <button className="group flex items-center gap-2 px-5 py-3 text-[14px] font-medium text-[#08080E] bg-white hover:bg-white/90 active:scale-[0.98] rounded-lg transition-all duration-150">
                    Get started
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>
                <button className="flex items-center gap-2 px-5 py-3 text-[14px] text-white/70 border border-white/10 hover:border-white/20 hover:text-white rounded-lg transition-all duration-150 hover:bg-white/[0.03]">
                  Talk to founders
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] py-14 px-6">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4 text-white" aria-label="Dyson home">
                <DysonMark size={20} className="text-white" />
                <span className="font-medium text-[15px] tracking-[-0.015em]">Dyson</span>
              </Link>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[260px]">
                Context infrastructure for modern engineering teams. The system of record for <span className="font-display italic">why</span>.
              </p>
            </div>
            {[
              { title: 'Product',  links: ['WHY Engine', 'Decision Log', 'Onboarding Packs', 'Agent API', 'Changelog'] },
              { title: 'Company',  links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal',    links: ['Privacy', 'Terms', 'Security', 'SOC 2'] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-[11px] font-medium text-white/65 uppercase tracking-[0.12em] mb-4">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-[13px] text-white/40 hover:text-white/85 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.06]">
            <p className="text-[12px] text-white/35">© 2026 Dyson, Inc. All rights reserved.</p>
            <p className="text-[12px] text-white/35 font-mono">The system of record for why.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
