import { useState } from 'react'
import { Search, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogEntry = {
  id: string; action: string; actor: string; detail: string; time: string
  source: 'slack' | 'github' | 'notion' | 'system'
}

const LOGS: LogEntry[] = [
  { id: '1', action: 'memory.recall',      actor: 'Jatin Dev',   detail: 'Query: "Why JWT auth?"',            time: '2m ago',  source: 'slack'  },
  { id: '2', action: 'decision.detected',  actor: 'Dyson',       detail: 'Decision: JWT replaces sessions',   time: '4h ago',  source: 'slack'  },
  { id: '3', action: 'source.connected',   actor: 'Jatin Dev',   detail: 'GitHub connected',                  time: '1d ago',  source: 'github' },
  { id: '4', action: 'member.invited',     actor: 'Jatin Dev',   detail: 'Invited alex@acme.com',             time: '1d ago',  source: 'system' },
  { id: '5', action: 'memory.recall',      actor: 'Alex Kumar',  detail: 'Query: "Why pgvector?"',            time: '2d ago',  source: 'github' },
  { id: '6', action: 'pack.generated',     actor: 'Dyson',       detail: 'Team briefing for Alex Kumar',      time: '2d ago',  source: 'system' },
  { id: '7', action: 'decision.flagged',   actor: 'Sarah Chen',  detail: 'Flagged: JWT decision link',        time: '3d ago',  source: 'slack'  },
  { id: '8', action: 'source.synced',      actor: 'Dyson',       detail: 'Slack sync complete (124 events)',  time: '3d ago',  source: 'slack'  },
]

const ACTION_STYLE: Record<string, string> = {
  'memory.recall':     'text-primary bg-primary/[0.08] border-primary/20',
  'decision.detected': 'text-amber-600 bg-amber-50 border-amber-200',
  'source.connected':  'text-green-600 bg-green-50 border-green-200',
  'member.invited':    'text-violet-600 bg-violet-50 border-violet-200',
  'pack.generated':    'text-blue-600 bg-blue-50 border-blue-200',
  'decision.flagged':  'text-orange-600 bg-orange-50 border-orange-200',
  'source.synced':     'text-ink-3 bg-subtle border-line',
}

export default function AuditLog() {
  const [query, setQuery] = useState('')

  const filtered = LOGS.filter(l =>
    !query || l.action.includes(query.toLowerCase()) || l.detail.toLowerCase().includes(query.toLowerCase()) || l.actor.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="px-7 py-7">

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[19px] font-semibold text-ink-1 mb-1">Audit log</h1>
          <p className="text-[13px] text-ink-3">All actions across your workspace.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter logs…"
            className="h-8 pl-9 pr-3.5 rounded-xl border border-line bg-white text-[12.5px] text-ink-2 placeholder:text-ink-4 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all w-44"
          />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[136px_1fr_120px_72px] gap-4 px-5 py-3 border-b border-line bg-subtle">
          {['Action', 'Detail', 'Actor', 'Time'].map(h => (
            <span key={h} className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Activity className="w-5 h-5 text-ink-4" />
            <p className="text-[13px] text-ink-3">No logs match your filter</p>
          </div>
        ) : (
          filtered.map((log, i) => (
            <div
              key={log.id}
              className={cn(
                'grid grid-cols-[136px_1fr_120px_72px] gap-4 items-center px-5 py-3.5 hover:bg-subtle transition-colors',
                i < filtered.length - 1 && 'border-b border-line',
              )}
            >
              <span className={cn(
                'text-[10px] font-mono px-2 py-0.5 rounded-full border truncate',
                ACTION_STYLE[log.action] ?? 'text-ink-3 bg-subtle border-line',
              )}>
                {log.action}
              </span>
              <span className="text-[12.5px] text-ink-2 truncate">{log.detail}</span>
              <span className="text-[12px] text-ink-3 truncate">{log.actor}</span>
              <span className="text-[11px] font-mono text-ink-4">{log.time}</span>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-ink-4 text-center mt-5">
        Showing last 30 days · <span className="text-primary cursor-pointer hover:underline">Upgrade to Business</span> for full history export
      </p>
    </div>
  )
}
