import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'
import { DysonMark } from '@/components/shared/DysonMark'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'

const quotes = [
  { text: 'We used to spend half a day on incident timelines. Dyson does it in 10 minutes — fully cited.', name: 'Sarah Chen', role: 'VP Engineering · Acme Corp', source: 'slack' as const },
  { text: 'Onboarding our last 3 engineers was 40% faster. Context packs replaced two weeks of archaeology.', name: 'Alex Kumar', role: 'Head of Platform · Verex', source: 'github' as const },
  { text: "The WHY Engine is the first AI tool my team actually trusts — because it shows its work.", name: 'Priya Nair', role: 'Staff Engineer · Orbit Labs', source: 'notion' as const },
]

const preview = [
  { date: 'Mar 12', source: 'slack'   as const, text: 'Rate-limit bug reported in #incidents' },
  { date: 'Mar 14', source: 'notion'  as const, text: 'RFC drafted: JWT migration proposal' },
  { date: 'Mar 17', source: 'meeting' as const, text: 'Decision: swap to JWT by Mar 31' },
  { date: 'Mar 19', source: 'github'  as const, text: 'PR #4502 merged — cites RFC + meeting' },
]

function RightPanel() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(v => (v + 1) % quotes.length), 4000)
    return () => clearInterval(t)
  }, [])
  const q = quotes[active] ?? quotes[0]!

  return (
    <div className="hidden lg:flex flex-col justify-between h-full px-10 py-10">
      {/* Mini product preview */}
      <div>
        <div className="flex items-center gap-2 text-text-4 mb-10">
          <DysonMark size={14} className="text-primary/40" />
          <span className="text-[11px] font-mono uppercase tracking-[0.12em]">dyson · why engine</span>
        </div>
        <div className="rounded-lg border border-[#2E2E2E] bg-[#141414] overflow-hidden mb-6">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2E2E2E]">
            <div className="flex gap-1.5">
              {['bg-white/10','bg-white/10','bg-white/10'].map((c,i) => <div key={i} className={`w-2 h-2 rounded-full ${c}`} />)}
            </div>
            <span className="text-[10px] font-mono text-text-4 mx-auto">WHY Engine</span>
          </div>
          <div className="px-4 py-2.5 border-b border-[#2E2E2E]">
            <p className="text-[11px] font-mono text-primary/60">› Why did we move to JWT auth?</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            {preview.map((ev, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-citation/50 mt-1.5 flex-shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-text-4">{ev.date}</span>
                  <SourcePill source={ev.source} className="text-[9px]" />
                  <span className="text-[10px] text-text-4 truncate">{ev.text}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-[#2E2E2E] flex justify-between items-center">
            <span className="text-[9px] font-mono text-text-4">4 sources</span>
            <ConfidenceBadge confidence={0.91} />
          </div>
        </div>
      </div>

      {/* Testimonial */}
      <div>
        <div className="flex gap-0.5 mb-3">
          {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-citation text-citation" />)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
            <p className="text-[14px] text-text-2 leading-[1.7] mb-4">"{q.text}"</p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-primary">{q.name[0]}</span>
              </div>
              <div>
                <p className="text-[12px] font-medium text-text-1">{q.name}</p>
                <p className="text-[11px] text-text-3">{q.role}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-1.5 mt-5">
          {quotes.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={`h-0.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-primary' : 'w-1.5 bg-text-4'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-[#141414] flex">
      {/* Form */}
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#2E2E2E]">
          <Link to="/" className="flex items-center gap-2 text-text-1 hover:opacity-80 transition-opacity">
            <DysonMark size={20} className="text-primary" />
            <span className="font-semibold text-[14px]">Dyson</span>
          </Link>
          <span className="text-[11px] font-mono text-text-4 hidden sm:block">The system of record for why.</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[380px]">
            <div className="mb-7">
              <h1 className="text-[24px] font-semibold tracking-tight text-text-1 mb-1.5">{title}</h1>
              <p className="text-[13px] text-text-3">{subtitle}</p>
            </div>
            {children}
          </motion.div>
        </div>
        <div className="px-8 py-5 border-t border-[#2E2E2E] text-center">
          <p className="text-[11px] text-text-4">
            © 2026 Dyson ·{' '}
            <a href="#" className="hover:text-text-3 transition-colors">Privacy</a>
            {' · '}
            <a href="#" className="hover:text-text-3 transition-colors">Terms</a>
          </p>
        </div>
      </div>

      {/* Visual panel */}
      <div className="hidden lg:block w-[440px] flex-shrink-0 border-l border-[#2E2E2E] bg-[#191919] relative">
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
        <div className="relative h-full"><RightPanel /></div>
      </div>
    </div>
  )
}
