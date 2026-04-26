import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RefreshCw, Trash2, Plus, AlertCircle, Github, MessageSquare, FileText, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'connected' | 'error' | 'disconnected'
type Source = { id: string; name: string; status: Status; detail: string; lastSync: string; events: string; icon: React.ElementType; color: string }

const sources: Source[] = [
  { id: 'slack',   name: 'Slack',   status: 'connected',    detail: 'acme-corp.slack.com · 24 channels',    lastSync: '2 min ago',  events: '12.4k',  icon: MessageSquare, color: '#E01E5A' },
  { id: 'github',  name: 'GitHub',  status: 'connected',    detail: 'acme-corp · 8 repositories',           lastSync: '4 min ago',  events: '8.1k',   icon: Github,        color: '#8B949E' },
  { id: 'notion',  name: 'Notion',  status: 'error',        detail: 'Token expired — reconnect required',    lastSync: '3 days ago', events: '2.3k',   icon: FileText,      color: '#ffffff' },
  { id: 'linear',  name: 'Linear',  status: 'disconnected', detail: 'Not connected',                        lastSync: '—',          events: '—',       icon: Calendar,      color: '#5E6AD2' },
]

const statusCfg: Record<Status, { badge: string; dot: string; label: string }> = {
  connected:    { badge: 'text-green-400 bg-green-500/10 border-green-500/20',  dot: 'bg-green-400',  label: 'Connected'    },
  error:        { badge: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400 animate-pulse', label: 'Error' },
  disconnected: { badge: 'text-white/30 bg-white/[0.04] border-white/[0.08]',  dot: 'bg-white/20',   label: 'Not connected' },
}

export default function ConnectedSources() {
  const [statuses, setStatuses] = useState<Record<string, Status>>(Object.fromEntries(sources.map(s => [s.id, s.status])))
  const [syncing,  setSyncing]  = useState<string | null>(null)

  function handleSync(id: string) {
    setSyncing(id)
    setTimeout(() => setSyncing(null), 2000)
  }

  function handleDisconnect(id: string) {
    setStatuses(v => ({ ...v, [id]: 'disconnected' }))
  }

  function handleConnect(id: string) {
    setStatuses(v => ({ ...v, [id]: 'connected' }))
  }

  return (
    <div className="px-10 py-8 max-w-[720px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-white/90 mb-1">Connected sources</h1>
        <p className="text-[13px] text-white/35">Manage which tools Dyson ingests events from.</p>
      </div>

      <div className="space-y-3">
        {sources.map((source, i) => {
          const status = statuses[source.id] ?? source.status
          const cfg = statusCfg[status]
          const Icon = source.icon
          const isSyncing = syncing === source.id

          return (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-white/[0.07] bg-[#0F0F17] p-5 hover:border-white/[0.11] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" style={{ color: source.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[14px] font-medium text-white/85">{source.name}</span>
                    <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border', cfg.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/30 truncate">{source.detail}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'connected' && (
                    <>
                      <div className="text-right mr-2">
                        <p className="text-[11px] font-mono text-white/20">{source.events} events</p>
                        <p className="text-[10px] text-white/15">synced {source.lastSync}</p>
                      </div>
                      <button
                        onClick={() => handleSync(source.id)}
                        className="p-2 rounded-lg hover:bg-white/[0.05] text-white/25 hover:text-primary transition-all"
                        title="Sync now"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin text-primary')} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(source.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-all"
                        title="Disconnect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {status === 'error' && (
                    <button
                      onClick={() => handleConnect(source.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-orange-500/30 text-[12px] text-orange-400 hover:bg-orange-500/10 transition-all"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Reconnect
                    </button>
                  )}
                  {status === 'disconnected' && (
                    <button
                      onClick={() => handleConnect(source.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-white/40 hover:text-white hover:border-primary/40 hover:bg-primary/10 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {isSyncing && (
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: 'linear' }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/25">Syncing…</span>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-white/35 leading-relaxed">
          Dyson only ingests events you have access to. Private channels and private repos are never read without explicit access grant.
        </p>
      </div>
    </div>
  )
}
