import { motion } from 'framer-motion'
import { ArrowRight, Zap, List, TrendingUp, Clock, MessageSquare, GitPullRequest } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const stats = [
  { label: 'WHY queries this week', value: '24', delta: '+12%', icon: Zap,         color: 'text-primary' },
  { label: 'Decisions detected',    value: '8',  delta: '+3',   icon: List,        color: 'text-citation' },
  { label: 'Events ingested',       value: '1.2k',delta: 'today',icon: TrendingUp, color: 'text-success' },
  { label: 'Avg response time',     value: '1.4s',delta: '-0.3s',icon: Clock,      color: 'text-violet-400' },
]

const recentQueries = [
  { query: 'Why did we move from session auth to JWT?',  confidence: 0.91, sources: 5, time: '2h ago' },
  { query: 'What caused the Q3 rate limit incident?',    confidence: 0.87, sources: 4, time: '5h ago' },
  { query: 'Why is payments still in the monolith?',     confidence: 0.74, sources: 3, time: '1d ago' },
]

const recentDecisions = [
  { title: 'Moved to cursor-based pagination',  team: 'Backend',  source: 'slack'   as const, time: '2d ago' },
  { title: 'Deprecated v1 API by June 2026',    team: 'Platform', source: 'github'  as const, time: '3d ago' },
  { title: 'Adopted pgvector over Pinecone',    team: 'Infra',    source: 'notion'  as const, time: '5d ago' },
  { title: 'JWT auth replaces session tokens',  team: 'Backend',  source: 'meeting' as const, time: '1w ago' },
]

const recentActivity = [
  { type: 'slack'  as const, text: '#incidents — 3 messages linked to open decisions', time: '10m' },
  { type: 'github' as const, text: 'PR #4721 — 2 related past decisions detected',     time: '42m' },
  { type: 'slack'  as const, text: '#backend — WHY Engine answered @alex query',       time: '1h'  },
  { type: 'notion' as const, text: 'RFC: payments-v2 — linked to 4 decisions',         time: '3h'  },
]

const quickActions = [
  { icon: Zap,           label: 'Ask a WHY question',  sub: 'Get a cited causal timeline',   to: '/app/why',             accent: 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'  },
  { icon: MessageSquare, label: 'Connect Slack',        sub: 'Start ingesting messages',      to: '/app/settings/sources', accent: 'border-[#E01E5A]/20 hover:border-[#E01E5A]/40 hover:bg-[#E01E5A]/5' },
  { icon: GitPullRequest,label: 'Connect GitHub',       sub: 'Start ingesting PR context',   to: '/app/settings/sources', accent: 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]' },
]

// ─── Stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, icon: Icon, color }: typeof stats[number]) {
  return (
    <div className="rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] p-5 hover:border-[#3D3D3D] hover:bg-[#212121] transition-all duration-150 cursor-default group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-[#2E2E2E] flex items-center justify-center group-hover:bg-white/[0.06] transition-colors">
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <span className="text-[11px] font-mono text-text-3">{delta}</span>
      </div>
      <p className="text-[28px] font-semibold tracking-tight text-text-1 mb-0.5">{value}</p>
      <p className="text-[12px] text-text-3">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const user      = authApi.getUser()
  const firstName = user?.name.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-8 py-7 max-w-[1080px] mx-auto">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-text-1 mb-1">{greeting}, {firstName}</h1>
        <p className="text-[13px] text-text-3">Here's what's happening in your context graph.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent queries */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2E2E2E]">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[13px] font-medium text-text-2">Recent WHY queries</span>
            </div>
            <Link to="/app/why" className="text-[12px] text-text-3 hover:text-primary transition-colors flex items-center gap-1">
              Ask <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentQueries.map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-[#2E2E2E] last:border-0 row-hover cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-text-2 group-hover:text-text-1 transition-colors truncate mb-1">
                    {q.query}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-text-4">
                    <span>{q.sources} sources</span>
                    <span>·</span>
                    <span>{q.time}</span>
                  </div>
                </div>
                <ConfidenceBadge confidence={q.confidence} showBar />
                <ArrowRight className="w-3.5 h-3.5 text-text-4 group-hover:text-text-3 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2E2E2E]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-text-3" />
              <span className="text-[13px] font-medium text-text-2">Live activity</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
          </div>
          <div>
            {recentActivity.map((a, i) => (
              <div key={i} className="flex gap-3 px-5 py-3 border-b border-[#2E2E2E] last:border-0 row-hover cursor-default">
                <SourcePill source={a.type} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-3 leading-relaxed">{a.text}</p>
                  <p className="text-[10px] font-mono text-text-4 mt-1">{a.time} ago</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent decisions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 rounded-lg border border-[#2E2E2E] bg-[#1C1C1C] overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2E2E2E]">
            <div className="flex items-center gap-2">
              <List className="w-3.5 h-3.5 text-citation" />
              <span className="text-[13px] font-medium text-text-2">Recent decisions</span>
            </div>
            <Link to="/app/decisions" className="text-[12px] text-text-3 hover:text-primary transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div>
            {recentDecisions.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-[#2E2E2E] last:border-0 row-hover cursor-pointer group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-citation/50 flex-shrink-0" />
                <p className="flex-1 text-[13px] text-text-2 group-hover:text-text-1 transition-colors">{d.title}</p>
                <span className="text-[11px] font-mono text-text-4 hidden sm:block">{d.team}</span>
                <SourcePill source={d.source} />
                <span className="text-[11px] font-mono text-text-4">{d.time}</span>
                <ArrowRight className="w-3.5 h-3.5 text-text-4 group-hover:text-text-3 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {quickActions.map((a, i) => (
            <Link key={i} to={a.to}>
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-lg border bg-[#1C1C1C] transition-all duration-150 cursor-pointer group',
                a.accent
              )}>
                <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-[#2E2E2E] flex items-center justify-center group-hover:bg-white/[0.07] transition-colors flex-shrink-0">
                  <a.icon className="w-4 h-4 text-text-3 group-hover:text-text-2 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-2 group-hover:text-text-1 transition-colors">{a.label}</p>
                  <p className="text-[11px] text-text-4">{a.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-4 group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
