import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Brain, ArrowRight, Network, Clock, Zap,
  MessageSquare, GitPullRequest, ChevronRight,
  TrendingUp, Users,
} from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Sample data ──────────────────────────────────────────────────────────

const recentRecalls = [
  { id: 1, query: 'What do we know about our auth system?',       confidence: 0.91, sources: 5, time: '2h ago',  canAnswer: true  },
  { id: 2, query: 'What happened during the Q3 incident?',       confidence: 0.87, sources: 4, time: '5h ago',  canAnswer: true  },
  { id: 3, query: 'What constraints exist on payments service?', confidence: 0.74, sources: 3, time: '1d ago',  canAnswer: true  },
]

const recentMemories = [
  { id: 1, title: 'Moved to cursor-based pagination',  team: 'Backend',  source: 'slack'   as const, time: '2d ago', type: 'decision' },
  { id: 2, title: 'Deprecated v1 API by June 2026',    team: 'Platform', source: 'github'  as const, time: '3d ago', type: 'decision' },
  { id: 3, title: 'Adopted pgvector over Pinecone',    team: 'Infra',    source: 'notion'  as const, time: '5d ago', type: 'decision' },
  { id: 4, title: 'JWT auth replaces session tokens',  team: 'Backend',  source: 'meeting' as const, time: '1w ago', type: 'decision' },
]

const activity = [
  { type: 'slack'  as const, text: '#incidents — 3 messages linked to open decisions', time: '10m ago' },
  { type: 'github' as const, text: 'PR #4721 — 2 related past decisions detected',     time: '42m ago' },
  { type: 'slack'  as const, text: '#backend — memory recall answered @alex query',   time: '1h ago'  },
  { type: 'notion' as const, text: 'RFC: payments-v2 — linked to 4 key memories',    time: '3h ago'  },
]

const stats = [
  { label: 'Total memories',    value: '1,247', sub: '+24 today',  icon: Brain,       color: 'bg-primary/10 text-primary'  },
  { label: 'Decisions detected',value: '89',    sub: '+3 this week',icon: Network,    color: 'bg-amber/10 text-amber'      },
  { label: 'Team members',      value: '12',    sub: '3 active today',icon: Users,    color: 'bg-green-100 text-success'   },
  { label: 'Recalls this week', value: '34',    sub: '↑ 12% vs last',icon: TrendingUp,color: 'bg-violet-100 text-violet-600'},
]

// ─── Quick recall box ─────────────────────────────────────────────────────
function RecallBox() {
  const [q, setQ] = useState('')
  const navigate   = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    navigate(`/app/recall?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 bg-[#FAFAF8] border border-[#E8E7E5] rounded-xl px-4 py-3 hover:border-[#D4D3CF] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-white transition-all">
        <Brain className="w-4.5 h-4.5 text-[#9b9b9b] flex-shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ask anything about what your team knows…"
          className="flex-1 bg-transparent text-[15px] text-[#1a1a1a] placeholder:text-[#b0b0b0] outline-none"
        />
        {q.trim() && (
          <button type="submit"
            className="h-7 px-3 rounded-lg bg-primary text-[12px] font-medium text-white hover:bg-primary-hover transition-colors flex-shrink-0">
            Ask
          </button>
        )}
        {!q && (
          <kbd className="text-[11px] text-[#c0c0c0] font-mono flex-shrink-0">↵</kbd>
        )}
      </div>
    </form>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────
function StatPill({ label, value, sub, icon: Icon, color }: typeof stats[number]) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#E8E7E5] rounded-xl px-4 py-3.5 hover:border-[#D4D3CF] transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', color.split(' ')[0])}>
        <Icon className={cn('w-4 h-4', color.split(' ')[1])} />
      </div>
      <div className="min-w-0">
        <p className="text-[20px] font-semibold text-[#1a1a1a] leading-none">{value}</p>
        <p className="text-[11.5px] text-[#9b9b9b] mt-0.5 truncate">{label}</p>
      </div>
      <p className="text-[11px] text-[#b0b0b0] ml-auto flex-shrink-0 hidden lg:block">{sub}</p>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeader({ title, action, to }: { title: string; action?: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold text-[#6b6b6b] uppercase tracking-[0.04em]">{title}</h2>
      {action && to && (
        <Link to={to} className="text-[12.5px] text-[#9b9b9b] hover:text-primary transition-colors flex items-center gap-1">
          {action} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user      = authApi.getUser()
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const emoji     = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙'
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-[900px] mx-auto px-8 py-10">

      {/* ── Greeting ───────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="text-[32px] mb-1">{emoji}</div>
        <h1 className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight leading-tight mb-1.5">
          {greeting}, {firstName}
        </h1>
        <p className="text-[15px] text-[#9b9b9b]">
          Your team has captured <span className="text-[#1a1a1a] font-medium">1,247 memories</span> — here's what's happening.
        </p>
      </div>

      {/* ── Recall box ─────────────────────────────────────────── */}
      <div className="mb-8">
        <RecallBox />
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {[
            'What do we know about our auth system?',
            'Why did we choose pgvector?',
            'What happened in Q3?',
          ].map(q => (
            <Link key={q} to={`/app/recall?q=${encodeURIComponent(q)}`}>
              <span className="inline-flex items-center gap-1 text-[12px] text-[#9b9b9b] bg-[#F7F6F3] border border-[#E8E7E5] rounded-full px-3 py-1 hover:bg-[#F0EFED] hover:text-[#6b6b6b] hover:border-[#D4D3CF] transition-all cursor-pointer">
                {q}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => <StatPill key={i} {...s} />)}
      </div>

      {/* ── Main two-col grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — recent recalls + key memories */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent recalls */}
          <div>
            <SectionHeader title="Recent recalls" action="Open Recall" to="/app/recall" />
            <div className="bg-white border border-[#E8E7E5] rounded-xl overflow-hidden">
              {recentRecalls.map((r, i) => (
                <Link to="/app/recall" key={r.id}>
                  <div className={cn(
                    'flex items-center gap-4 px-4 py-3.5 hover:bg-[#FAFAF8] transition-colors group cursor-pointer',
                    i < recentRecalls.length - 1 && 'border-b border-[#F0EFED]'
                  )}>
                    <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-[#1a1a1a] truncate leading-snug">{r.query}</p>
                      <p className="text-[11.5px] text-[#9b9b9b] mt-0.5">{r.sources} sources · {r.time}</p>
                    </div>
                    <ConfidenceBadge confidence={r.confidence} showBar />
                    <ChevronRight className="w-4 h-4 text-[#d0d0d0] group-hover:text-[#9b9b9b] transition-colors flex-shrink-0" />
                  </div>
                </Link>
              ))}
              <Link to="/app/recall">
                <div className="px-4 py-3 hover:bg-[#FAFAF8] transition-colors cursor-pointer flex items-center gap-2">
                  <span className="text-[13px] text-[#9b9b9b] hover:text-primary transition-colors">Ask a new question…</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Key memories */}
          <div>
            <SectionHeader title="Key memories" action="View all" to="/app/decisions" />
            <div className="bg-white border border-[#E8E7E5] rounded-xl overflow-hidden">
              {recentMemories.map((m, i) => (
                <div key={m.id} className={cn(
                  'flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8] transition-colors group cursor-pointer',
                  i < recentMemories.length - 1 && 'border-b border-[#F0EFED]'
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                  <p className="flex-1 text-[13.5px] text-[#1a1a1a] truncate">{m.title}</p>
                  <span className="text-[11.5px] text-[#b0b0b0] hidden sm:block flex-shrink-0">{m.team}</span>
                  <SourcePill source={m.source} />
                  <span className="text-[11.5px] text-[#b0b0b0] flex-shrink-0">{m.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — activity + quick actions */}
        <div className="space-y-6">

          {/* Live activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-[#6b6b6b] uppercase tracking-[0.04em]">Activity</h2>
              <span className="flex items-center gap-1.5 text-[11px] text-[#9b9b9b]">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live
              </span>
            </div>
            <div className="bg-white border border-[#E8E7E5] rounded-xl overflow-hidden">
              {activity.map((a, i) => (
                <div key={i} className={cn(
                  'px-4 py-3 hover:bg-[#FAFAF8] transition-colors',
                  i < activity.length - 1 && 'border-b border-[#F0EFED]'
                )}>
                  <div className="flex items-start gap-2 mb-1">
                    <SourcePill source={a.type} className="flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-[12.5px] text-[#4a4a4a] leading-snug">{a.text}</p>
                  <p className="text-[11px] text-[#b0b0b0] mt-1">{a.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <SectionHeader title="Get started" />
            <div className="space-y-2">
              {[
                {
                  icon: MessageSquare,
                  label: 'Connect Slack',
                  sub: 'Ingest conversations',
                  to: '/app/settings/sources',
                  dot: 'bg-[#E01E5A]',
                  done: true,
                },
                {
                  icon: GitPullRequest,
                  label: 'Connect GitHub',
                  sub: 'Capture PRs and issues',
                  to: '/app/settings/sources',
                  dot: 'bg-[#656D76]',
                  done: true,
                },
                {
                  icon: Zap,
                  label: 'Invite your team',
                  sub: 'Share company memory',
                  to: '/app/settings/members',
                  dot: 'bg-primary',
                  done: false,
                },
              ].map((a, i) => (
                <Link key={i} to={a.to}>
                  <div className="flex items-center gap-3 px-3.5 py-3 bg-white border border-[#E8E7E5] rounded-xl hover:border-[#D4D3CF] hover:bg-[#FAFAF8] transition-all group cursor-pointer">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', a.done ? 'bg-success/10' : 'bg-[#F0EFED]')}>
                      {a.done
                        ? <span className="text-[11px] text-success">✓</span>
                        : <span className={cn('w-2 h-2 rounded-full', a.dot)} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[13px] font-medium', a.done ? 'text-[#9b9b9b] line-through' : 'text-[#1a1a1a]')}>{a.label}</p>
                      <p className="text-[11.5px] text-[#b0b0b0]">{a.sub}</p>
                    </div>
                    {!a.done && <ChevronRight className="w-4 h-4 text-[#d0d0d0] group-hover:text-[#9b9b9b] flex-shrink-0" />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
