import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ArrowRight, Users, Clock, Zap } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { cn } from '@/lib/utils'

const packs = [
  { id: '1', name: 'Alex Kumar',      team: 'Backend',  joined: '2 days ago', decisions: 7, sources: 3, status: 'ready',      initials: 'AK', color: 'from-primary/30 to-violet-500/30' },
  { id: '2', name: 'Sarah Chen',      team: 'Platform', joined: '1 week ago', decisions: 12,sources: 4, status: 'ready',      initials: 'SC', color: 'from-green-500/30 to-emerald-500/30' },
  { id: '3', name: 'Priya Nair',      team: 'Infra',    joined: '3 days ago', decisions: 5, sources: 3, status: 'generating', initials: 'PN', color: 'from-orange-500/30 to-amber-500/30' },
  { id: '4', name: 'Marcus Rodriguez',team: 'Frontend', joined: '2 weeks ago',decisions: 9, sources: 5, status: 'ready',      initials: 'MR', color: 'from-pink-500/30 to-rose-500/30' },
]

export default function OnboardingPacks() {
  const [generating, setGenerating] = useState(false)

  return (
    <div className="px-8 py-7 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-white/90 mb-1">Onboarding Packs</h1>
          <p className="text-[13.5px] text-white/35">Auto-generated context packs for new team members.</p>
        </div>
        <button
          onClick={() => setGenerating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Generate pack
        </button>
      </div>

      {/* Generate modal */}
      {generating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setGenerating(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/[0.10] bg-[#131320] p-7 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
          >
            <h3 className="text-[17px] font-semibold text-white mb-1.5">Generate context pack</h3>
            <p className="text-[13px] text-white/40 mb-6">Dyson will build a personalised context pack for a new team member.</p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-[12px] font-medium text-white/50 mb-1.5">New hire name</label>
                <input placeholder="Jordan Lee" className="w-full h-10 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/20 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-white/50 mb-1.5">Team</label>
                <select className="w-full h-10 px-3.5 rounded-xl border border-white/[0.08] bg-[#131320] text-[13px] text-white/70 outline-none focus:border-primary/50 transition-all appearance-none">
                  {['Backend', 'Platform', 'Infra', 'Frontend', 'Data'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setGenerating(false)} className="flex-1 h-10 rounded-xl border border-white/[0.08] text-[13px] text-white/40 hover:text-white/70 hover:border-white/[0.14] transition-all">
                Cancel
              </button>
              <button onClick={() => setGenerating(false)} className="flex-1 h-10 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Generate
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Packs generated', value: '4' },
          { label: 'Avg decisions per pack', value: '8.3' },
          { label: 'Time saved per hire', value: '~2 weeks' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-[#0F0F17] px-5 py-4">
            <p className="text-[22px] font-semibold text-white mb-0.5">{s.value}</p>
            <p className="text-[12px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Packs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packs.map((pack, i) => (
          <motion.div
            key={pack.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link to={`/app/onboarding-packs/${pack.id}`}>
              <motion.div
                whileHover={{ y: -2 }}
                className={cn(
                  'rounded-xl border border-white/[0.07] bg-[#0F0F17] p-6 cursor-pointer group',
                  'hover:border-white/[0.14] hover:bg-[#131320] transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                )}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br border border-white/[0.08] flex items-center justify-center flex-shrink-0', pack.color)}>
                      <span className="text-[12px] font-bold text-white">{pack.initials}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-white/85 group-hover:text-white transition-colors">{pack.name}</p>
                      <p className="text-[12px] text-white/35">{pack.team} team</p>
                    </div>
                  </div>
                  {pack.status === 'generating' ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-citation bg-citation/10 border border-citation/20 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-citation animate-pulse" />
                      Generating…
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Ready
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-5 mb-5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-white/25" />
                    <span className="text-[12px] text-white/35">{pack.decisions} decisions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/25" />
                    <span className="text-[12px] text-white/35">Joined {pack.joined}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {(['slack', 'github', 'notion'] as const).slice(0, pack.sources - 1).map(s => (
                      <SourcePill key={s} source={s} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-white/25 group-hover:text-primary transition-colors">
                    View pack <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
