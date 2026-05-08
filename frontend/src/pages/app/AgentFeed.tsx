import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Brain, GitBranch, AlertTriangle, Calendar, BarChart2,
  FileText, Zap, CheckCircle2, XCircle, Clock, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

type FeedItem = {
  id:        string
  type:      'run' | 'alert'
  agentType: string
  title:     string
  summary:   string
  severity:  'info' | 'warning' | 'critical'
  createdAt: string
  metadata:  Record<string, unknown>
}

function AgentIcon({ type, className }: { type: string; className: string }) {
  const props = { className }
  if (type.includes('conflict')) return <AlertTriangle {...props} />
  if (type.includes('brief') || type.includes('meeting')) return <Calendar {...props} />
  if (type.includes('digest') || type.includes('health') || type.includes('report')) return <BarChart2 {...props} />
  if (type.includes('relation')) return <GitBranch {...props} />
  if (type === 'postmortem') return <FileText {...props} />
  if (type.includes('pr')) return <GitBranch {...props} />
  return <Zap {...props} />
}

const SEVERITY_STYLES = {
  info:     'text-primary bg-primary/8 border-primary/15',
  warning:  'text-citation bg-citation/8 border-citation/20',
  critical: 'text-danger bg-red-50 border-red-200',
}

const FILTERS = [
  { label: 'All',        value: 'all'        },
  { label: 'Conflicts',  value: 'conflict'   },
  { label: 'Briefs',     value: 'brief'      },
  { label: 'Digests',    value: 'digest'     },
  { label: 'Relations',  value: 'relation'   },
  { label: 'Health',     value: 'health'     },
]

function relativeTime(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function FeedCard({ item }: { item: FeedItem }) {
  const isRun   = item.type === 'run'
  const success = item.metadata['success'] !== 'false' && item.metadata['success'] !== false
  const iconCls = cn(
    'w-3.5 h-3.5',
    item.severity === 'critical' ? 'text-danger' :
    item.severity === 'warning'  ? 'text-citation' :
    'text-primary',
  )

  return (
    <div className="flex gap-4 px-5 py-4 border-b border-line last:border-0 hover:bg-subtle/60 transition-colors group">
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5',
        item.severity === 'critical' ? 'bg-red-50 border-red-200' :
        item.severity === 'warning'  ? 'bg-citation/8 border-citation/20' :
        'bg-primary/8 border-primary/15',
      )}>
        <AgentIcon type={item.agentType} className={iconCls} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] font-medium text-ink-1 leading-snug">{item.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isRun && (
              success
                ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
            )}
            {item.severity !== 'info' && (
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide',
                SEVERITY_STYLES[item.severity],
              )}>
                {item.severity}
              </span>
            )}
          </div>
        </div>
        <p className="text-[12px] text-ink-3 mt-0.5 leading-relaxed line-clamp-2">{item.summary}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[11px] font-mono text-ink-4">{relativeTime(item.createdAt)}</span>
          {item.metadata['latencyMs'] != null && (
            <span className="text-[11px] text-ink-4">{String(item.metadata['latencyMs'])}ms</span>
          )}
          {item.type === 'run' && (
            <span className="text-[10.5px] text-ink-4 bg-subtle border border-line px-1.5 py-0.5 rounded font-mono">
              {item.agentType.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsBar({ items }: { items: FeedItem[] }) {
  const runs     = items.filter(i => i.type === 'run')
  const alerts   = items.filter(i => i.type === 'alert')
  const warnings = items.filter(i => i.severity !== 'info')
  const success  = runs.filter(i => i.metadata?.success !== 'false').length

  const stats = [
    { label: 'Agent runs',   value: runs.length,   color: 'text-primary',                                         render: () => <Zap className={cn('w-3.5 h-3.5', 'text-primary')} /> },
    { label: 'Alerts',       value: alerts.length, color: 'text-ink-2',                                           render: () => <Brain className="w-3.5 h-3.5 text-ink-2" /> },
    { label: 'Warnings',     value: warnings.length, color: warnings.length > 0 ? 'text-citation' : 'text-ink-3', render: () => <AlertTriangle className={cn('w-3.5 h-3.5', warnings.length > 0 ? 'text-citation' : 'text-ink-3')} /> },
    { label: 'Success rate', value: runs.length > 0 ? `${Math.round((success / runs.length) * 100)}%` : '—', color: 'text-success', render: () => <CheckCircle2 className="w-3.5 h-3.5 text-success" /> },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2 mb-0.5">
            {s.render()}
            <span className={cn('text-[20px] font-semibold -tracking-wide', s.color)}>{s.value}</span>
          </div>
          <p className="text-[11.5px] text-ink-4">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function AgentFeed() {
  const [activeFilter, setActiveFilter] = useState('all')

  const feedQuery = useQuery({
    queryKey: ['agent-feed'],
    queryFn:  () => apiFetch<{ data: FeedItem[] }>('/agent-feed?limit=80'),
    refetchInterval: 30_000,
  })

  const items = feedQuery.data?.data ?? []

  const filtered = activeFilter === 'all' ? items : items.filter(i => {
    const t = i.agentType.toLowerCase()
    if (activeFilter === 'conflict') return t.includes('conflict')
    if (activeFilter === 'brief')    return t.includes('brief') || t.includes('meeting')
    if (activeFilter === 'digest')   return t.includes('digest')
    if (activeFilter === 'relation') return t.includes('relation')
    if (activeFilter === 'health')   return t.includes('health') || t.includes('report')
    return true
  })

  return (
    <div className="px-8 py-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1 -tracking-wide mb-1">Agent Activity</h1>
          <p className="text-[13px] text-ink-3">
            Every action the corporate brain has taken — relationships inferred, conflicts detected, briefs sent.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-ink-4 bg-subtle border border-line px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          Live — refreshes every 30s
        </div>
      </div>

      {/* Stats */}
      <StatsBar items={items} />

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4">
        <Filter className="w-3.5 h-3.5 text-ink-4" />
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all border',
              activeFilter === f.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-line text-ink-3 hover:border-line-strong hover:text-ink-2',
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] font-mono text-ink-4">
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Feed */}
      <div className="bg-white border border-line rounded-xl overflow-hidden shadow-sm">
        {feedQuery.isLoading ? (
          <div className="px-5 py-12 text-center text-[13px] text-ink-3">
            Loading agent activity…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-10 h-10 rounded-xl bg-subtle border border-line flex items-center justify-center mx-auto mb-3">
              <Brain className="w-4 h-4 text-ink-4" />
            </div>
            <p className="text-[13.5px] font-medium text-ink-2 mb-1">No agent activity yet</p>
            <p className="text-[12.5px] text-ink-4">
              Agents activate as decisions are captured, meetings are scheduled, and knowledge is updated.
            </p>
          </div>
        ) : (
          filtered.map(item => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
