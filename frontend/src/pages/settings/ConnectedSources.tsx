import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Trash2, Plus, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'connected' | 'error' | 'disconnected'

type Source = {
  id: string; name: string; status: Status; detail: string
  lastSync: string; events: string; logo: React.ReactNode
}

// Real brand SVGs inline for correctness
function SlackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 54 54">
      <path d="M19.712 28.14a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h3.853v3.853zM21.59 28.14a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v9.647a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853V28.14z" fill="#E01E5A"/>
      <path d="M25.443 19.712a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v3.853h-3.853zM25.443 21.59a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853h-9.647a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h9.647z" fill="#36C5F0"/>
      <path d="M34.288 25.443a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853h-3.853v-3.853zM32.41 25.443a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853v-9.647a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v9.647z" fill="#2EB67D"/>
      <path d="M28.557 34.288a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853v-3.853h3.853zM28.557 32.41a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h9.647a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853H28.557z" fill="#ECB22E"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#24292f">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
    </svg>
  )
}

function NotionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M4.46 1.93 17.4.93c1.59-.13 2-.04 3 .68l4.13 2.91c.69.5.92.65.92 1.2v16.31c0 1.01-.36 1.61-1.64 1.7l-15.04.91c-.97.05-1.43-.09-1.94-.74L3.78 19.09c-.55-.74-.78-1.29-.78-1.94V3.59c0-.83.36-1.52 1.46-1.66z" fill="#fff" stroke="#e0dfdc" strokeWidth=".5"/>
      <path d="M3.34 4.55v13.74c0 .69.36 1.01 1.16 1.01l16.49-1c.83-.05 1.01-.55 1.01-1.15V4.59c0-.6-.23-.92-.74-.87l-17.27 1c-.55.04-.65.32-.65.83Zm15.39 1.6c.09.42 0 .83-.42.88l-.79.16v11.6c-.69.37-1.33.6-1.85.6-.83 0-1.05-.27-1.66-1.04L9.06 11.2v6.86l1.65.37s0 .96-1.34 1.01l-3.69.21c-.11-.21 0-.74.36-.83l.97-.27V8.13l-1.34-.11c-.11-.42.13-1.01.78-1.06l3.97-.27 5.46 8.36V8.05l-1.39-.16c-.11-.51.27-.87.74-.92l3.51-.21Z" fill="#37352F"/>
    </svg>
  )
}

function LinearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="lgrad-cs" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5E6AD2"/>
          <stop offset="100%" stopColor="#3F4ABE"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#lgrad-cs)"/>
      <path d="M16 53 47 84M16 36 64 84M22 24 76 78M37 18 82 63M52 16 84 48M70 19 81 30" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".95"/>
    </svg>
  )
}

const SOURCES: Source[] = [
  { id: 'slack',  name: 'Slack',  status: 'connected',    detail: 'acme-corp.slack.com · 24 channels',  lastSync: '2 min ago',  events: '12.4k', logo: <SlackIcon /> },
  { id: 'github', name: 'GitHub', status: 'connected',    detail: 'acme-corp · 8 repositories',         lastSync: '4 min ago',  events: '8.1k',  logo: <GitHubIcon /> },
  { id: 'notion', name: 'Notion', status: 'error',        detail: 'Token expired — reconnect required', lastSync: '3 days ago', events: '2.3k',  logo: <NotionIcon /> },
  { id: 'linear', name: 'Linear', status: 'disconnected', detail: 'Not connected',                     lastSync: '—',          events: '—',      logo: <LinearIcon /> },
]

const statusCfg: Record<Status, { badge: string; dot: string; label: string }> = {
  connected:    { badge: 'text-green-600 bg-green-50 border-green-200',    dot: 'bg-green-500',                 label: 'Connected'     },
  error:        { badge: 'text-amber-600 bg-amber-50 border-amber-200',    dot: 'bg-amber-500 animate-pulse',   label: 'Error'         },
  disconnected: { badge: 'text-ink-3 bg-subtle border-line',               dot: 'bg-ink-4',                     label: 'Not connected' },
}

export default function ConnectedSources() {
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(SOURCES.map(s => [s.id, s.status])),
  )
  const [syncing, setSyncing] = useState<string | null>(null)

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
    <div className="px-7 py-7 max-w-[680px]">

      <div className="mb-7">
        <h1 className="text-[19px] font-semibold text-ink-1 mb-1">Connected sources</h1>
        <p className="text-[13px] text-ink-3">Manage which tools Dyson ingests events from.</p>
      </div>

      <div className="space-y-2.5">
        {SOURCES.map((source, i) => {
          const status    = statuses[source.id] ?? source.status
          const cfg       = statusCfg[status]
          const isSyncing = syncing === source.id

          return (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-line bg-white p-4 hover:border-line-strong hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Brand logo box */}
                <div className={cn(
                  'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all',
                  status === 'disconnected'
                    ? 'bg-subtle border-line opacity-50 grayscale'
                    : 'bg-white border-line',
                )}>
                  {source.logo}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <span className="text-[13.5px] font-semibold text-ink-1">{source.name}</span>
                    <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border', cfg.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-3 truncate">{source.detail}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'connected' && (
                    <>
                      <div className="text-right mr-1">
                        <p className="text-[11px] font-mono text-ink-3">{source.events} events</p>
                        <p className="text-[10px] text-ink-4">synced {source.lastSync}</p>
                      </div>
                      <button
                        onClick={() => handleSync(source.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-primary hover:bg-primary/10 transition-all"
                        title="Sync now"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin text-primary')} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(source.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-danger hover:bg-red-500/[0.08] opacity-0 group-hover:opacity-100 transition-all"
                        title="Disconnect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {status === 'error' && (
                    <button
                      onClick={() => handleConnect(source.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-amber-200 text-[12px] text-amber-600 hover:bg-amber-50 transition-all"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Reconnect
                    </button>
                  )}
                  {status === 'disconnected' && (
                    <button
                      onClick={() => handleConnect(source.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-line text-[12px] text-ink-3 hover:text-ink-1 hover:border-primary/40 hover:bg-primary/[0.06] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Sync progress */}
              <AnimatePresence>
                {isSyncing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-line"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-subtle rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2, ease: 'linear' }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-ink-3">Syncing…</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Notice */}
      <div className="mt-5 p-4 rounded-xl border border-line bg-subtle flex items-start gap-3">
        <AlertCircle className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-3 leading-relaxed">
          Dyson only ingests events you have access to. Private channels and private repos are never read without explicit access grant.
        </p>
      </div>
    </div>
  )
}
