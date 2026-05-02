import { FileText, Search } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'

const logs = [
  { id:'1', action:'why_engine.query',     actor:'Jatin Dev',    detail:'Query: "Why JWT auth?"',           time:'2m ago',  source:'slack' as const },
  { id:'2', action:'decision.detected',    actor:'Dyson',        detail:'Decision: JWT replaces sessions',  time:'4h ago',  source:'slack' as const },
  { id:'3', action:'source.connected',     actor:'Jatin Dev',    detail:'GitHub connected',                 time:'1d ago',  source:'github' as const },
  { id:'4', action:'member.invited',       actor:'Jatin Dev',    detail:'Invited alex@acme.com',            time:'1d ago',  source:'notion' as const },
  { id:'5', action:'why_engine.query',     actor:'Alex Kumar',   detail:'Query: "Why pgvector?"',           time:'2d ago',  source:'notion' as const },
  { id:'6', action:'pack.generated',       actor:'Dyson',        detail:'Onboarding pack for Alex Kumar',   time:'2d ago',  source:'github' as const },
  { id:'7', action:'decision.flagged',     actor:'Sarah Chen',   detail:'Flagged: JWT decision link',       time:'3d ago',  source:'meeting' as const },
  { id:'8', action:'source.synced',        actor:'Dyson',        detail:'Slack sync complete (124 events)', time:'3d ago',  source:'slack' as const },
]

const actionColor: Record<string, string> = {
  'why_engine.query':   'text-primary bg-primary/10 border-primary/20',
  'decision.detected':  'text-citation bg-citation/10 border-citation/20',
  'source.connected':   'text-green-400 bg-green-500/10 border-green-500/20',
  'member.invited':     'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'pack.generated':     'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'decision.flagged':   'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'source.synced':      'text-ink-3 bg-subtle border-line',
}

export default function AuditLog() {
  return (
    <div className="px-10 py-8 max-w-[820px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[20px] font-semibold text-ink-1 mb-1">Audit log</h1>
          <p className="text-[13px] text-ink-3">A record of all actions in your workspace.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
          <input placeholder="Filter logs..." className="h-8 pl-9 pr-3 rounded-xl border border-line bg-subtle text-[13px] text-ink-2 placeholder:text-ink-4 outline-none focus:border-primary/40 transition-all w-48" />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <div className="grid grid-cols-[130px_1fr_140px_80px] gap-4 px-5 py-3 border-b border-line">
          {['Action', 'Detail', 'Actor', 'Time'].map(h => (
            <span key={h} className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-white/[0.04]">
          {logs.map((log, i) => (
            <div key={log.id} className="grid grid-cols-[130px_1fr_140px_80px] gap-4 items-center px-5 py-3.5 hover:bg-subtle transition-colors">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${actionColor[log.action] ?? 'text-ink-3 bg-subtle border-line'}`}>
                {log.action.replace('.', ' ')}
              </span>
              <span className="text-[12.5px] text-ink-2 truncate">{log.detail}</span>
              <span className="text-[12px] text-ink-3 truncate">{log.actor}</span>
              <span className="text-[11px] font-mono text-ink-4">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11.5px] text-ink-4 text-center mt-5">Showing last 30 days Â· Upgrade to Business for full history export</p>
    </div>
  )
}



