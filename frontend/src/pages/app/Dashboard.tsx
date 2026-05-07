import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Brain, Network, Users, TrendingUp,
  ChevronRight, ArrowUpRight, Check,
} from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { authApi } from '@/lib/api'

// ─── Static data (dashboard wiring in progress) ───────────────────────────────
const STATS = [
  { label: 'Total memories',     value: '1,247', trend: '+24 today',    color: '#5B5BD6', Icon: Brain      },
  { label: 'Decisions detected', value: '89',    trend: '+3 this week', color: '#D97706', Icon: Network    },
  { label: 'Recalls this week',  value: '34',    trend: '↑ 12% vs last',color: '#7C3AED', Icon: TrendingUp },
  { label: 'Active members',     value: '12',    trend: '3 online now', color: '#16A34A', Icon: Users      },
]

const MEMORIES = [
  { id: 'm1', title: 'Moved to cursor-based pagination',  team: 'Backend',  source: 'slack'  as const, time: '2d ago' },
  { id: 'm2', title: 'Deprecated v1 API by June 2026',    team: 'Platform', source: 'github' as const, time: '3d ago' },
  { id: 'm3', title: 'Adopted pgvector over Pinecone',    team: 'Infra',    source: 'notion' as const, time: '5d ago' },
  { id: 'm4', title: 'JWT auth replaces session tokens',  team: 'Backend',  source: 'slack'  as const, time: '1w ago' },
  { id: 'm5', title: 'Retry budget capped at 3 for jobs', team: 'Infra',    source: 'github' as const, time: '1w ago' },
]

const RECALLS = [
  { id: 1, query: 'What do we know about our auth system?',           confidence: 0.91, sources: 5, time: '2h ago' },
  { id: 2, query: 'What happened during the Q3 incident?',            confidence: 0.87, sources: 4, time: '5h ago' },
  { id: 3, query: 'What constraints exist on the payments service?',  confidence: 0.74, sources: 3, time: '1d ago' },
]

const ACTIVITY = [
  { source: 'slack'  as const, text: '#incidents — 3 messages linked to open decisions', time: '10m ago' },
  { source: 'github' as const, text: 'PR #4721 — 2 related past decisions detected',     time: '42m ago' },
  { source: 'slack'  as const, text: '#backend — recall answered @alex query',           time: '1h ago'  },
  { source: 'notion' as const, text: 'RFC: payments-v2 — linked to 4 key memories',     time: '3h ago'  },
]

const SUGGESTIONS = [
  'Why did we choose pgvector?',
  'What happened in Q3?',
  'What constraints exist on auth?',
]

const SETUP = [
  { label: 'Connect Slack',    sub: 'Ingest conversations',   done: true,  to: '/app/settings/sources' },
  { label: 'Connect GitHub',   sub: 'Capture PRs and issues', done: true,  to: '/app/settings/sources' },
  { label: 'Invite your team', sub: 'Share company memory',   done: false, to: '/app/settings/members' },
]

const NAV_ITEMS = [
  { icon: Brain,   label: 'Recall',         sub: "Ask your team's memory",  to: '/app/recall'           },
  { icon: Network, label: 'Memory Graph',   sub: 'Explore decisions',       to: '/app/decisions'        },
  { icon: Users,   label: 'Team Briefings', sub: 'Onboarding packs',        to: '/app/onboarding-packs' },
]

// ─── Recall box ───────────────────────────────────────────────────────────────
function RecallBox({ onAsk }: { onAsk: (q: string) => void }) {
  const [q,     setQ]     = useState('')
  const [focus, setFocus] = useState(false)

  return (
    <form onSubmit={e => { e.preventDefault(); if (q.trim()) onAsk(q) }}>
      <div className={`flex items-center gap-3 rounded-xl px-5 py-3.5 transition-all border ${
        focus
          ? 'bg-white border-primary/40 shadow-[0_0_0_3px_rgba(91,91,214,0.10)]'
          : 'bg-subtle border-line'
      }`}>
        <Brain className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${focus ? 'text-primary' : 'text-ink-4'}`} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Ask anything your team has ever decided, discussed, or documented…"
          className="flex-1 bg-transparent text-[14.5px] text-ink-1 placeholder:text-ink-4 outline-none"
        />
        {q.trim() ? (
          <button type="submit"
            className="h-7 px-3.5 rounded-lg bg-primary text-[12px] font-medium text-white hover:bg-primary/90 transition-colors flex-shrink-0">
            Ask
          </button>
        ) : (
          <kbd className="text-[10.5px] text-ink-4 font-mono flex-shrink-0">↵</kbd>
        )}
      </div>
    </form>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate()
  const user      = authApi.getUser()
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today     = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const doneCount = SETUP.filter(s => s.done).length

  return (
    <div className="max-w-[1000px] mx-auto px-9 py-9 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-ink-1 -tracking-wide leading-tight mb-1.5">
            {greeting}, {firstName}
          </h1>
          <p className="text-[13.5px] text-ink-3">
            Your workspace has{' '}
            <span className="text-ink-1 font-medium">1,247 memories</span>
            {' '}across{' '}
            <span className="text-ink-1 font-medium">2 connected sources</span>
            . 24 captured today.
          </p>
        </div>
        <span className="text-[12px] text-ink-4 flex-shrink-0 pt-1">{today}</span>
      </div>

      {/* ── Recall box ─────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <RecallBox onAsk={q => navigate(`/app/recall?q=${encodeURIComponent(q)}`)} />
      </div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {SUGGESTIONS.map(s => (
          <button key={s}
            onClick={() => navigate(`/app/recall?q=${encodeURIComponent(s)}`)}
            className="text-[12px] text-ink-3 bg-white border border-line px-3 py-1.5 rounded-full hover:border-primary/30 hover:text-primary transition-all">
            {s}
          </button>
        ))}
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {STATS.map((s, i) => (
          <div key={i}
            className="bg-white border border-line rounded-xl p-4"
            style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}14` }}>
                <s.Icon size={14} style={{ color: s.color }} />
              </div>
              <span className="text-[11px] text-ink-4 -tracking-tight">{s.trend}</span>
            </div>
            <p className="text-[24px] font-bold text-ink-1 -tracking-wide leading-none mb-1">{s.value}</p>
            <p className="text-[12px] text-ink-3">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_332px] gap-7 items-start">

        {/* Left column */}
        <div className="space-y-6">

          {/* Recent memories */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.08em]">Recent memories</h2>
              <Link to="/app/decisions"
                className="flex items-center gap-1 text-[12px] text-ink-4 hover:text-primary transition-colors">
                Memory graph <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              {MEMORIES.map((m, i) => (
                <div key={m.id}
                  onClick={() => navigate('/app/decisions')}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-subtle transition-colors cursor-pointer ${i < MEMORIES.length - 1 ? 'border-b border-line/60' : ''}`}>
                  <SourcePill source={m.source} />
                  <p className="flex-1 text-[13px] text-ink-1 -tracking-tight truncate">{m.title}</p>
                  <span className="text-[11px] text-ink-4 bg-subtle border border-line px-2 py-0.5 rounded-full flex-shrink-0">{m.team}</span>
                  <span className="text-[11.5px] text-ink-4 flex-shrink-0 w-10 text-right">{m.time}</span>
                  <ChevronRight size={13} className="text-line flex-shrink-0" />
                </div>
              ))}
            </div>
          </section>

          {/* Recent recalls */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.08em]">Recent recalls</h2>
              <Link to="/app/recall"
                className="flex items-center gap-1 text-[12px] text-ink-4 hover:text-primary transition-colors">
                Open Recall <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              {RECALLS.map((r, i) => {
                const dotColor = r.confidence >= 0.85 ? 'bg-success' : r.confidence >= 0.72 ? 'bg-citation' : 'bg-danger'
                return (
                  <div key={r.id}
                    onClick={() => navigate(`/app/recall?q=${encodeURIComponent(r.query)}`)}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-subtle transition-colors cursor-pointer ${i < RECALLS.length - 1 ? 'border-b border-line/60' : ''}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-ink-1 -tracking-tight truncate">{r.query}</p>
                      <p className="text-[11px] text-ink-4 mt-0.5">{r.sources} sources · {r.time}</p>
                    </div>
                    <ConfidenceBadge confidence={r.confidence} showBar />
                    <ChevronRight size={13} className="text-line flex-shrink-0" />
                  </div>
                )
              })}
              <div onClick={() => navigate('/app/recall')}
                className="flex items-center px-4 py-2.5 border-t border-line/60 cursor-pointer hover:bg-subtle transition-colors">
                <span className="text-[12.5px] text-ink-4">Ask a new question…</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Live activity */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.08em]">Activity</h2>
              <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <span className="w-1.5 h-1.5 rounded-full bg-success" style={{ boxShadow: '0 0 0 3px rgba(22,163,74,0.15)' }} />
                Live
              </span>
            </div>
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              {ACTIVITY.map((a, i) => (
                <div key={i} className={`flex gap-3 px-4 py-3 ${i < ACTIVITY.length - 1 ? 'border-b border-line/60' : ''}`}>
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-line" />
                    {i < ACTIVITY.length - 1 && <span className="w-px flex-1 bg-line/50 mt-1.5" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="mb-1"><SourcePill source={a.source} /></div>
                    <p className="text-[12.5px] text-ink-2 leading-snug">{a.text}</p>
                    <p className="text-[11px] text-ink-4 mt-1">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Setup checklist */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.08em]">Setup</h2>
              <span className="text-[11px] text-ink-4">{doneCount}/{SETUP.length} complete</span>
            </div>
            <div className="h-1 bg-line rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(doneCount / SETUP.length) * 100}%` }} />
            </div>
            <div className="space-y-2">
              {SETUP.map((item, i) => (
                <div key={i}
                  onClick={() => navigate(item.to)}
                  className="flex items-center gap-3 px-3.5 py-2.5 bg-white border border-line rounded-xl cursor-pointer hover:border-primary/25 hover:bg-subtle/50 transition-all">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
                    item.done
                      ? 'bg-success/10 border-success/40'
                      : 'bg-white border-line'
                  }`}>
                    {item.done && <Check size={11} className="text-success" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[12.5px] font-medium -tracking-tight ${item.done ? 'text-ink-4 line-through' : 'text-ink-1'}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-ink-4">{item.sub}</p>
                  </div>
                  {!item.done && <ChevronRight size={13} className="text-ink-4 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </section>

          {/* Quick navigate */}
          <section>
            <h2 className="text-[10.5px] font-bold text-ink-3 uppercase tracking-[0.08em] mb-2.5">Navigate</h2>
            <div className="space-y-2">
              {NAV_ITEMS.map(item => (
                <Link key={item.to} to={item.to} className="block">
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white border border-line rounded-xl hover:border-primary/25 hover:bg-subtle/50 transition-all cursor-pointer group">
                    <div className="w-7 h-7 rounded-lg bg-primary/[0.07] flex items-center justify-center flex-shrink-0">
                      <item.icon size={13} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[12.5px] font-medium text-ink-1 -tracking-tight">{item.label}</p>
                      <p className="text-[11px] text-ink-4">{item.sub}</p>
                    </div>
                    <ArrowUpRight size={13} className="text-ink-4 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
