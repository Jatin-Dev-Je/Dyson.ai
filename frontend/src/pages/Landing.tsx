import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Check, ChevronRight,
  Menu, X, Zap, Shield, Bot, GitPullRequest,
  MessageSquare, FileText, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { cn } from '@/lib/utils'

// ─── Brand mark ───────────────────────────────────────────────────────────
// Dyson-sphere lattice: a central source captured by an orbital shell.
// The mark IS the metaphor — Dyson captures every signal of "why".
function DysonMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(16 16)" stroke="currentColor" strokeWidth="1.1" fill="none">
        <circle r="11" />
        <ellipse rx="11" ry="3.6" />
        <ellipse rx="11" ry="3.6" transform="rotate(60)" />
        <ellipse rx="11" ry="3.6" transform="rotate(-60)" />
      </g>
      <circle cx="16" cy="16" r="1.7" fill="currentColor" />
    </svg>
  )
}

// ─── Hero background — one quiet radial, nothing more ─────────────────────
function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08), transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse 70% 50% at 50% 35%, black 30%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 50% at 50% 35%, black 30%, transparent 100%)',
        }}
      />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#08080E] to-transparent" />
    </div>
  )
}

// ─── Animated demo (the product, front-and-centre) ────────────────────────
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
      {/* Halo */}
      <div className="absolute -inset-12 bg-primary/[0.05] rounded-full blur-3xl pointer-events-none" />
      {/* Hairline gradient border */}
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
                <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-emerald-400 transition-colors">
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-red-400 transition-colors">
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

// ─── Nav ──────────────────────────────────────────────────────────────────
const navLinks: { label: string; href: string }[] = [
  { label: 'Product',    href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing',    href: '#pricing' },
  { label: 'Changelog',  href: '#changelog' },
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

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 text-white">
          <DysonMark size={22} className="text-white" />
          <span className="font-medium text-[15px] tracking-[-0.01em]">Dyson</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          {navLinks.map(item => (
            <a
              key={item.label}
              href={item.href}
              className="px-3.5 py-1.5 text-[13.5px] text-white/55 hover:text-white rounded-md hover:bg-white/[0.04] transition-all duration-150"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/login">
            <button className="px-3.5 py-1.5 text-[13px] text-white/55 hover:text-white rounded-md hover:bg-white/[0.04] transition-all duration-150">
              Log in
            </button>
          </Link>
          <Link to="/signup">
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium text-[#08080E] bg-white hover:bg-white/90 rounded-md transition-all duration-150">
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04]"
          onClick={() => setOpen(v => !v)}
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
                <button className="w-full py-2.5 text-sm text-white/70 border border-white/10 rounded-md hover:border-white/20 hover:text-white transition-all">
                  Log in
                </button>
              </Link>
              <Link to="/signup" className="flex-1">
                <button className="w-full py-2.5 text-sm font-medium text-[#08080E] bg-white rounded-md hover:bg-white/90 transition-all">
                  Get started
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

// ─── Inline components ────────────────────────────────────────────────────

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

// ─── Integration brand glyphs (real, not "Acme Corp") ─────────────────────
function IntegrationLogo({ name }: { name: 'Slack' | 'GitHub' | 'Notion' | 'Linear' | 'Zoom' | 'Granola' }) {
  const common = 'h-5 w-auto opacity-60 hover:opacity-100 transition-opacity'
  switch (name) {
    case 'Slack':
      return (
        <div className={`flex items-center gap-2 ${common}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
          <span className="text-[14px] font-medium">Slack</span>
        </div>
      )
    case 'GitHub':
      return (
        <div className={`flex items-center gap-2 ${common}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          <span className="text-[14px] font-medium">GitHub</span>
        </div>
      )
    case 'Notion':
      return (
        <div className={`flex items-center gap-2 ${common}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>
          <span className="text-[14px] font-medium">Notion</span>
        </div>
      )
    case 'Linear':
      return (
        <div className={`flex items-center gap-2 ${common}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M.403 13.795l9.802 9.803c5.005.992 9.467-1.94 11.225-6.422L7.539 3.282C3.115 5.087.181 9.45.403 13.795zm.836-7.928l16.894 16.893a12.014 12.014 0 0 0 2.726-1.948L3.187 3.142a12.014 12.014 0 0 0-1.948 2.725zM4.65 1.864l17.485 17.486a11.96 11.96 0 0 0 1.343-2.81L7.46.522a11.96 11.96 0 0 0-2.81 1.343zM10.17.058l13.772 13.772C24.79 8.395 20.997.094 14.553.094c-1.495 0-2.95.39-4.383-.036z"/></svg>
          <span className="text-[14px] font-medium">Linear</span>
        </div>
      )
    case 'Zoom':
      return (
        <div className={`flex items-center gap-2 ${common}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.07 6.357v3.214l3.214-2.143v6.43H6.86V8.357h4.07z"/></svg>
          <span className="text-[14px] font-medium">Zoom</span>
        </div>
      )
    case 'Granola':
      return (
        <div className={`flex items-center gap-2 ${common}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          <span className="text-[14px] font-medium">Granola</span>
        </div>
      )
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────
const features = [
  { icon: Zap,            tag: 'Core',       title: 'Time-Travel WHY Engine',   desc: 'Ask any "why did we…?" and get a reconstructed causal timeline — grounded in real events, cited on every claim. Never a hallucination.', accent: 'primary' as const,  size: 'wide' as const },
  { icon: Shield,         tag: 'Trust',      title: 'Citations on every claim', desc: 'No sentence without a source. Confidence scores on every causal link. "I don\'t know" is a first-class output.', accent: 'citation' as const, size: 'tall' as const },
  { icon: MessageSquare,  tag: 'Slack',      title: 'Native Slack bot',         desc: 'Your team already asks WHY in Slack. Dyson answers inline — cited, grounded, instant.', accent: 'primary' as const,  size: 'small' as const },
  { icon: GitPullRequest, tag: 'GitHub',     title: 'PR context panel',         desc: 'Every PR surfaces the discussions and decisions that led to that code.', accent: 'primary' as const,  size: 'small' as const },
  { icon: FileText,       tag: 'Onboarding', title: 'Auto context packs',       desc: 'New hire joins? Auto-generated context pack: decisions, trade-offs, open questions in 30 seconds.', accent: 'primary' as const, size: 'small' as const },
  { icon: Bot,            tag: 'Agents',     title: 'Agent context API',        desc: 'MCP-compatible. Every AI copilot queries the same grounded context graph your team trusts.', accent: 'primary' as const, size: 'small' as const },
]

const steps = [
  { n: '01', title: 'Connect your stack',       desc: 'Three-click OAuth for Slack and GitHub. Dyson ingests events immediately — no ETL, no config.',    sources: ['slack', 'github'] as const },
  { n: '02', title: 'The graph builds itself',  desc: 'Entity extraction, decision detection, embeddings, cross-source edge linking — all automatic.',     sources: ['notion', 'meeting'] as const },
  { n: '03', title: 'Ask anything, anywhere',   desc: 'WHY Engine, Slack bot, PR panel, or API. Every answer is grounded and cited.',                       sources: ['slack', 'github'] as const },
]

const testimonials = [
  { q: 'We used to spend half a day on incident timelines. Dyson does it in 10 minutes — fully cited.', name: 'Sarah Chen',  role: 'VP Engineering',   co: 'Acme Corp' },
  { q: 'Onboarding our last 3 engineers was 40% faster. Context packs replaced two weeks of Slack archaeology.', name: 'Alex Kumar', role: 'Head of Platform', co: 'Verex' },
  { q: 'The WHY Engine is the first AI tool my team actually trusts — because it shows its work.', name: 'Priya Nair', role: 'Staff Engineer', co: 'Orbit Labs' },
]

const plans = [
  { name: 'Free',     price: '$0',  period: '',          desc: 'For small teams getting started', cta: 'Start free',         highlight: false, features: ['5 users', '90 days history', 'Slack + GitHub', 'WHY Engine'] },
  { name: 'Team',     price: '$25', period: '/user /mo', desc: 'For fast-growing eng teams',      cta: 'Start 14-day trial', highlight: true,  features: ['Up to 50 users', 'Full history', 'All connectors', 'Decision Log', 'Onboarding packs', 'Agent API'] },
  { name: 'Business', price: '$45', period: '/user /mo', desc: 'For teams that need controls',    cta: 'Contact sales',      highlight: false, features: ['Unlimited users', 'SOC 2 Type II', 'SSO + SCIM', 'Custom retention', 'Audit log', 'Priority support'] },
]

// ─── Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#08080E] text-white/90 overflow-x-hidden font-sans antialiased">
      <Nav />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative pt-[140px] pb-20 px-6 overflow-hidden">
        <HeroBg />

        <div className="relative max-w-[1120px] mx-auto">

          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-9"
          >
            <a href="#" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm px-3.5 py-1.5 text-[12px] text-white/60 hover:border-white/20 hover:text-white transition-all duration-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <span>Now in private beta — request access</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-6"
          >
            <h1 className="text-[56px] sm:text-[72px] lg:text-[88px] font-medium leading-[0.98] tracking-[-0.045em] text-white">
              The system of record
              <br />
              <span className="text-white/35">for </span><span className="italic font-serif">why</span><span className="text-white/35">.</span>
            </h1>
          </motion.div>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[17px] text-white/55 text-center max-w-[540px] mx-auto leading-[1.6] mb-9"
          >
            Dyson connects Slack, GitHub, Notion and meetings into one queryable
            context graph — and explains the reasoning behind every decision your team ever made.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center gap-2 mb-6 flex-wrap"
          >
            <Link to="/signup">
              <button className="flex items-center gap-2 px-5 py-3 text-[14px] font-medium text-[#08080E] bg-white hover:bg-white/90 active:scale-[0.98] rounded-lg transition-all duration-150">
                Connect your stack
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <button className="flex items-center gap-2 px-5 py-3 text-[14px] text-white/70 border border-white/10 hover:border-white/20 hover:text-white rounded-lg transition-all duration-150 hover:bg-white/[0.03]">
              Watch 2-min demo
            </button>
          </motion.div>

          {/* Single trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="text-center text-[12px] text-white/35 mb-20"
          >
            Free for 5 users · No credit card · 3-minute setup
          </motion.p>

          {/* Product demo — the centrepiece */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <Demo />
          </motion.div>
        </div>
      </section>

      {/* ══ INTEGRATIONS BAR ═════════════════════════════════════════════ */}
      <section className="py-12 border-y border-white/[0.06] bg-white/[0.012]">
        <div className="max-w-[1120px] mx-auto px-6">
          <p className="text-center text-[11px] font-mono text-white/35 uppercase tracking-[0.18em] mb-7">
            Plugs into the stack you already use
          </p>
          <div className="flex items-center justify-center gap-x-12 gap-y-6 flex-wrap text-white">
            <IntegrationLogo name="Slack" />
            <IntegrationLogo name="GitHub" />
            <IntegrationLogo name="Notion" />
            <IntegrationLogo name="Linear" />
            <IntegrationLogo name="Zoom" />
            <IntegrationLogo name="Granola" />
          </div>
        </div>
      </section>

      {/* ══ STATS ═════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6">
        <div className="max-w-[980px] mx-auto">
          <FadeUp className="mb-16 max-w-[640px]">
            <SectionLabel>The cost of lost context</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] text-white">
              Engineering teams lose a quarter of every week to context they already had.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8 border-t border-white/[0.08] pt-10">
            {[
              { value: '28%',    label: 'of engineer time spent reconstructing context', sub: 'McKinsey, 2024' },
              { value: '1 day',  label: 'to find the rationale behind a 6-month-old decision', sub: 'Dyson research' },
              { value: '$1.3M',  label: 'annual cost of context loss per 100-person team', sub: 'Dyson estimate' },
            ].map((stat, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <p className="text-[44px] font-medium tracking-[-0.03em] text-white leading-none mb-3">{stat.value}</p>
                <p className="text-[14px] text-white/65 leading-relaxed mb-1.5">{stat.label}</p>
                <p className="text-[11px] font-mono text-white/30">{stat.sub}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28 px-6 bg-white/[0.012] border-y border-white/[0.06]">
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
                <div className="relative rounded-xl border border-white/[0.08] bg-[#0C0C14] p-7 h-full hover:border-white/20 hover:bg-[#10101A] transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[11px] font-mono font-medium text-white/35">{step.n}</span>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                        <ChevronRight className="w-4 h-4 text-white/25" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-[16px] font-medium text-white mb-2.5">{step.title}</h3>
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

      {/* ══ FEATURES (real bento) ═════════════════════════════════════════ */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-14">
            <SectionLabel>Product</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] max-w-[560px] text-white">
              Everything context.
              <br />
              <span className="text-white/40">Nothing you don't need.</span>
            </h2>
          </FadeUp>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 md:auto-rows-[230px]">
            {features[0] && <FeatureCard f={features[0]} className="md:col-span-2" />}
            {features[1] && <FeatureCard f={features[1]} className="md:row-span-2" />}
            {features[2] && <FeatureCard f={features[2]} />}
            {features[3] && <FeatureCard f={features[3]} />}
            {features[4] && <FeatureCard f={features[4]} className="md:col-span-1" />}
            {features[5] && <FeatureCard f={features[5]} className="md:col-span-2" />}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 bg-white/[0.012] border-y border-white/[0.06]">
        <div className="max-w-[1120px] mx-auto">
          <FadeUp className="mb-14">
            <SectionLabel>Teams using Dyson</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-medium tracking-[-0.025em] leading-[1.1] max-w-[640px] text-white">
              The first AI tool engineering leaders <span className="text-white/40">actually trust</span>.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="rounded-xl border border-white/[0.08] bg-[#0C0C14] p-7 h-full hover:border-white/20 transition-all duration-300 flex flex-col">
                  <p className="text-[14.5px] text-white/80 leading-[1.7] mb-7 flex-1">"{t.q}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[12px] font-medium text-white/80">{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">{t.name}</p>
                      <p className="text-[11.5px] text-white/40">{t.role} · {t.co}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
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
                  'relative rounded-xl p-7 h-full flex flex-col transition-all duration-300',
                  plan.highlight
                    ? 'border border-white bg-white text-[#08080E]'
                    : 'border border-white/[0.08] bg-[#0C0C14] hover:border-white/20'
                )}>
                  {plan.highlight && (
                    <span className="absolute -top-2.5 left-7 text-[10px] font-mono font-medium text-white bg-[#08080E] border border-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-[0.1em]">
                      Recommended
                    </span>
                  )}

                  <div className="mb-6">
                    <p className={cn('text-[13px] font-medium mb-3', plan.highlight ? 'text-[#08080E]/70' : 'text-white/65')}>{plan.name}</p>
                    <div className="flex items-end gap-1 mb-2">
                      <span className="text-[40px] font-medium tracking-[-0.03em] leading-none">{plan.price}</span>
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
                      ? 'bg-[#08080E] text-white hover:bg-[#1a1a26]'
                      : 'border border-white/10 text-white/80 hover:border-white/25 hover:text-white hover:bg-white/[0.03]'
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

      {/* ══ FINAL CTA — distinct treatment ════════════════════════════════ */}
      <section className="px-6 pb-24">
        <div className="max-w-[1120px] mx-auto">
          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0C0C14] overflow-hidden">
            {/* Subtle radial only */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 100%, rgba(99,102,241,0.10), transparent 55%)',
              }}
            />
            <div className="relative px-8 py-20 sm:py-24 text-center">
              <DysonMark size={44} className="text-white/85 mx-auto mb-8" />
              <h2 className="text-[40px] sm:text-[56px] font-medium tracking-[-0.04em] leading-[1.0] mb-5 text-white">
                Stop losing the why.
              </h2>
              <p className="text-[15px] text-white/55 leading-[1.65] mb-9 max-w-[460px] mx-auto">
                Connect your stack in 3 minutes. Ask your first WHY question today.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Link to="/signup">
                  <button className="flex items-center gap-2 px-5 py-3 text-[14px] font-medium text-[#08080E] bg-white hover:bg-white/90 active:scale-[0.98] rounded-lg transition-all duration-150">
                    Get started
                    <ArrowRight className="w-4 h-4" />
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
              <Link to="/" className="flex items-center gap-2 mb-4 text-white">
                <DysonMark size={20} className="text-white" />
                <span className="font-medium text-[15px]">Dyson</span>
              </Link>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[260px]">
                Context infrastructure for modern engineering teams. The system of record for why.
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

// ─── Bento card ───────────────────────────────────────────────────────────
type Feature = (typeof featuresType)[number]
const featuresType = [
  { icon: Zap, tag: '', title: '', desc: '', accent: 'primary' as const, size: 'wide' as const },
] as const

function FeatureCard({ f, className }: { f: typeof features[number]; className?: string }) {
  const Icon = f.icon
  return (
    <FadeUp className={cn('h-full', className)}>
      <div className={cn(
        'relative group rounded-xl border border-white/[0.08] bg-[#0C0C14] p-6 overflow-hidden h-full',
        'hover:border-white/20 transition-all duration-300 flex flex-col'
      )}>
        {/* Hover glow */}
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
          f.accent === 'citation'
            ? 'bg-gradient-to-br from-citation/[0.06] to-transparent'
            : 'bg-gradient-to-br from-primary/[0.06] to-transparent'
        )} />

        <div className="relative flex flex-col h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              f.accent === 'citation'
                ? 'bg-citation/[0.10] text-citation'
                : 'bg-white/[0.06] text-white/85'
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-white/35 uppercase tracking-[0.14em]">{f.tag}</span>
          </div>
          <h3 className={cn(
            'font-medium text-white mb-2 tracking-[-0.01em]',
            f.size === 'wide' || f.size === 'tall' ? 'text-[18px]' : 'text-[15px]'
          )}>
            {f.title}
          </h3>
          <p className={cn(
            'text-white/55 leading-[1.65]',
            f.size === 'wide' || f.size === 'tall' ? 'text-[14px]' : 'text-[13px]'
          )}>
            {f.desc}
          </p>
          {(f.size === 'wide' || f.size === 'tall') && (
            <div className={cn(
              'mt-auto pt-6 inline-flex items-center gap-1 text-[12.5px] font-medium group-hover:gap-2 transition-all duration-200',
              f.accent === 'citation' ? 'text-citation' : 'text-white/85'
            )}>
              Learn more <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  )
}
