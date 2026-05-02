import { Link } from 'react-router-dom'
import { Brain, Network, ArrowRight, Zap, TrendingUp, Clock, MessageSquare, GitPullRequest } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const stats = [
  { label: 'Recalls this week',   value: '24',  delta: '+12%',  icon: Brain,       color: 'text-primary'   },
  { label: 'Memories captured',   value: '1.2k',delta: 'today', icon: TrendingUp,  color: 'text-success'   },
  { label: 'Decisions detected',  value: '8',   delta: '+3',    icon: Network,     color: 'text-amber'     },
  { label: 'Avg recall time',     value: '1.4s',delta: '-0.3s', icon: Clock,       color: 'text-ink-2'     },
]

const recentRecalls = [
  { query: 'What do we know about our auth system?',       confidence: 0.91, sources: 5, time: '2h ago' },
  { query: 'What happened during the Q3 incident?',       confidence: 0.87, sources: 4, time: '5h ago' },
  { query: 'What constraints exist on payments service?', confidence: 0.74, sources: 3, time: '1d ago' },
]

const recentMemories = [
  { title: 'Moved to cursor-based pagination',  team: 'Backend',  source: 'slack'   as const, time: '2d ago' },
  { title: 'Deprecated v1 API by June 2026',    team: 'Platform', source: 'github'  as const, time: '3d ago' },
  { title: 'Adopted pgvector over Pinecone',    team: 'Infra',    source: 'notion'  as const, time: '5d ago' },
  { title: 'JWT auth replaces session tokens',  team: 'Backend',  source: 'meeting' as const, time: '1w ago' },
]

const recentActivity = [
  { type: 'slack'  as const, text: '#incidents — 3 messages linked to open decisions',   time: '10m' },
  { type: 'github' as const, text: 'PR #4721 — 2 related past decisions detected',       time: '42m' },
  { type: 'slack'  as const, text: '#backend — memory recall answered @alex query',     time: '1h'  },
  { type: 'notion' as const, text: 'RFC: payments-v2 — linked to 4 key memories',      time: '3h'  },
]

const quickActions = [
  { icon: Brain,          label: 'Search memory',   sub: 'Cited answer from company memory',    to: '/app/recall',             accent: 'hover:border-primary/30 hover:bg-primary/[0.02]' },
  { icon: MessageSquare,  label: 'Connect Slack',    sub: 'Start ingesting conversations',       to: '/app/settings/sources',   accent: 'hover:border-[#E01E5A]/20 hover:bg-[#E01E5A]/[0.02]' },
  { icon: GitPullRequest, label: 'Connect GitHub',   sub: 'Capture PRs, issues and reviews',    to: '/app/settings/sources',   accent: 'hover:border-line-strong' },
]

function StatCard({ label, value, delta, icon: Icon, color }: typeof stats[number]) {
  return (
    <div className="bg-surface border border-line rounded-lg p-5 hover:border-line-strong transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-md bg-subtle border border-line flex items-center justify-center">
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <span className="text-[11px] font-mono text-ink-3">{delta}</span>
      </div>
      <p className="text-[26px] font-semibold text-ink-1 tracking-tight mb-0.5">{value}</p>
      <p className="text-[12px] text-ink-3">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const user      = authApi.getUser()
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-8 py-7 max-w-[1080px] mx-auto">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-ink-1 mb-1">{greeting}, {firstName}</h1>
        <p className="text-[13px] text-ink-3">Here's what's in your company memory.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent recalls */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-[13px] font-medium text-ink-1">Recent recalls</span>
            </div>
            <Link to="/app/recall" className="text-[12px] text-ink-3 hover:text-primary transition-colors flex items-center gap-1">
              Ask <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentRecalls.map((q, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-0 row-hover cursor-pointer group">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink-1 truncate mb-1">{q.query}</p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-ink-3">
                    <span>{q.sources} sources</span>
                    <span>·</span>
                    <span>{q.time}</span>
                  </div>
                </div>
                <ConfidenceBadge confidence={q.confidence} showBar />
                <ArrowRight className="w-3.5 h-3.5 text-ink-4 group-hover:text-ink-2 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Live activity */}
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-ink-3" />
              <span className="text-[13px] font-medium text-ink-1">Live activity</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
          <div>
            {recentActivity.map((a, i) => (
              <div key={i} className="flex gap-3 px-5 py-3 border-b border-line last:border-0 row-hover">
                <SourcePill source={a.type} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-ink-2 leading-relaxed">{a.text}</p>
                  <p className="text-[10px] font-mono text-ink-4 mt-1">{a.time} ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key memories */}
        <div className="lg:col-span-3 bg-surface border border-line rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
            <div className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-amber" />
              <span className="text-[13px] font-medium text-ink-1">Key memories</span>
            </div>
            <Link to="/app/decisions" className="text-[12px] text-ink-3 hover:text-primary transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentMemories.map((d, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-0 row-hover cursor-pointer group">
                <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                <p className="flex-1 text-[13px] text-ink-1">{d.title}</p>
                <span className="text-[11px] font-mono text-ink-3 hidden sm:block">{d.team}</span>
                <SourcePill source={d.source} />
                <span className="text-[11px] font-mono text-ink-3">{d.time}</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-4 group-hover:text-ink-2 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((a, i) => (
            <Link key={i} to={a.to}>
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-lg border border-line bg-surface transition-all cursor-pointer group',
                a.accent
              )}>
                <div className="w-8 h-8 rounded-md bg-subtle border border-line flex items-center justify-center flex-shrink-0 group-hover:border-line-strong transition-colors">
                  <a.icon className="w-4 h-4 text-ink-2" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-1">{a.label}</p>
                  <p className="text-[11px] text-ink-3">{a.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-ink-4 group-hover:text-ink-2 transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
