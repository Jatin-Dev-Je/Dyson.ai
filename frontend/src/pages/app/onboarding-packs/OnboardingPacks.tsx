import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Users, Clock, Zap, X } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { cn } from '@/lib/utils'

type Pack = {
  id:        string
  name:      string
  team:      string
  joined:    string
  decisions: number
  sources:   number
  status:    'ready' | 'generating'
  initials:  string
  color:     string
}

const PACKS: Pack[] = [
  { id: '1', name: 'Alex Kumar',       team: 'Backend',  joined: '2 days ago',  decisions: 7,  sources: 3, status: 'ready',      initials: 'AK', color: 'from-primary/20 to-violet-400/20' },
  { id: '2', name: 'Sarah Chen',       team: 'Platform', joined: '1 week ago',  decisions: 12, sources: 4, status: 'ready',       initials: 'SC', color: 'from-green-400/20 to-emerald-400/20' },
  { id: '3', name: 'Priya Nair',       team: 'Infra',    joined: '3 days ago',  decisions: 5,  sources: 3, status: 'generating',  initials: 'PN', color: 'from-orange-400/20 to-amber-400/20' },
  { id: '4', name: 'Marcus Rodriguez', team: 'Frontend', joined: '2 weeks ago', decisions: 9,  sources: 5, status: 'ready',       initials: 'MR', color: 'from-pink-400/20 to-rose-400/20' },
]

const STATS = [
  { label: 'Packs generated',       value: '4'        },
  { label: 'Avg decisions per pack', value: '8.3'      },
  { label: 'Time saved per hire',    value: '~2 weeks' },
]

export default function OnboardingPacks() {
  const [generating, setGenerating] = useState(false)
  const [name,       setName]       = useState('')
  const [team,       setTeam]       = useState('Backend')

  return (
    <div className="px-8 py-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1 -tracking-wide mb-1">Team Briefings</h1>
          <p className="text-[13px] text-ink-3">Context packs generated for every new team member.</p>
        </div>
        <button
          onClick={() => setGenerating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Generate pack
        </button>
      </div>

      {/* Generate modal */}
      {generating && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setGenerating(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-white p-7 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[16px] font-semibold text-ink-1">Generate context pack</h3>
                <p className="text-[12.5px] text-ink-3 mt-0.5">Dyson builds a personalised pack from company memory.</p>
              </div>
              <button onClick={() => setGenerating(false)} className="text-ink-3 hover:text-ink-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[12px] font-medium text-ink-2 mb-1.5">New hire name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jordan Lee"
                  className="w-full h-10 px-3.5 rounded-xl border border-line bg-subtle text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Team</label>
                <select
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-line bg-white text-[13px] text-ink-2 outline-none focus:border-primary/50 transition-all appearance-none"
                >
                  {['Backend', 'Platform', 'Infra', 'Frontend', 'Data'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setGenerating(false)}
                className="flex-1 h-10 rounded-xl border border-line text-[13px] text-ink-3 hover:text-ink-2 hover:border-line-strong hover:bg-subtle transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!name.trim()}
                onClick={() => setGenerating(false)}
                className="flex-1 h-10 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" /> Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {STATS.map((s, i) => (
          <div key={i} className="rounded-xl border border-line bg-white px-5 py-4">
            <p className="text-[22px] font-semibold text-ink-1 -tracking-wide mb-0.5">{s.value}</p>
            <p className="text-[12px] text-ink-3">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Packs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PACKS.map(pack => (
          <Link key={pack.id} to={`/app/onboarding-packs/${pack.id}`} className="block group">
            <div className="rounded-xl border border-line bg-white p-6 hover:border-line-strong hover:shadow-md transition-all duration-200 cursor-pointer">

              {/* Top row */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br border border-line flex items-center justify-center flex-shrink-0', pack.color)}>
                    <span className="text-[12px] font-bold text-ink-1">{pack.initials}</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink-1 leading-tight">{pack.name}</p>
                    <p className="text-[12px] text-ink-3">{pack.team} team</p>
                  </div>
                </div>

                {pack.status === 'generating' ? (
                  <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-citation bg-citation/10 border border-citation/20 px-2.5 py-1 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-citation animate-pulse" />
                    Generating…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Ready
                  </span>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-5 mb-5">
                <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Users className="w-3.5 h-3.5" />
                  {pack.decisions} decisions
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Clock className="w-3.5 h-3.5" />
                  Joined {pack.joined}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {(['slack', 'github', 'notion'] as const).slice(0, Math.min(pack.sources - 1, 3)).map(s => (
                    <SourcePill key={s} source={s} />
                  ))}
                </div>
                <span className="flex items-center gap-1 text-[12px] text-ink-3 group-hover:text-primary transition-colors">
                  View pack <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
