import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Zap, List, Plug, Users, FileText,
  AlertCircle, Check, X, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NType = 'decision' | 'query' | 'source' | 'member' | 'pack' | 'error'

type Notification = {
  id: string
  type: NType
  title: string
  body: string
  time: string
  read: boolean
}

const icons: Record<NType, React.ElementType> = {
  decision: List,
  query:    Zap,
  source:   Plug,
  member:   Users,
  pack:     FileText,
  error:    AlertCircle,
}

const iconColors: Record<NType, string> = {
  decision: 'text-citation bg-citation/10',
  query:    'text-primary bg-primary/10',
  source:   'text-green-400 bg-green-500/10',
  member:   'text-violet-400 bg-violet-500/10',
  pack:     'text-blue-400 bg-blue-500/10',
  error:    'text-red-400 bg-red-500/10',
}

const initialNotifications: Notification[] = [
  { id: '1', type: 'decision', title: 'New decision detected',     body: 'Dyson detected a decision in #backend: cursor-based pagination adopted.',        time: '2m ago',  read: false },
  { id: '2', type: 'query',    title: 'WHY query answered',        body: 'Your query "Why JWT auth?" returned 5 cited sources with 91% confidence.',        time: '14m ago', read: false },
  { id: '3', type: 'source',   title: 'GitHub sync complete',      body: '142 new events ingested from 3 repositories. Graph updated.',                     time: '1h ago',  read: false },
  { id: '4', type: 'pack',     title: 'Onboarding pack ready',     body: 'Context pack for Alex Kumar (Backend team) is ready to review.',                  time: '2h ago',  read: true  },
  { id: '5', type: 'member',   title: 'Team member joined',        body: 'Priya Nair accepted your invite and joined the workspace.',                        time: '3h ago',  read: true  },
  { id: '6', type: 'decision', title: 'Decision flagged',          body: 'Sarah Chen flagged the JWT auth link as potentially incorrect. Review requested.', time: '5h ago',  read: true  },
  { id: '7', type: 'error',    title: 'Notion connection error',   body: 'OAuth token expired. Reconnect Notion to resume ingestion.',                       time: '1d ago',  read: true  },
]

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

export function NotificationPanel() {
  const [open, setOpen]                   = useState(false)
  const [notifs, setNotifs]               = useState(initialNotifications)
  const [filter, setFilter]               = useState<'all' | 'unread'>('all')
  const ref                               = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  const unread    = notifs.filter(n => !n.read).length
  const visible   = filter === 'unread' ? notifs.filter(n => !n.read) : notifs

  function markAll() { setNotifs(v => v.map(n => ({ ...n, read: true }))) }
  function markOne(id: string) { setNotifs(v => v.map(n => n.id === id ? { ...n, read: true } : n)) }
  function dismiss(id: string) { setNotifs(v => v.filter(n => n.id !== id)) }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'relative h-7 w-7 flex items-center justify-center rounded-md transition-colors',
          open ? 'bg-white/[0.07] text-text-1' : 'text-text-3 hover:text-text-2 hover:bg-white/[0.05]'
        )}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit  ={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-[380px] rounded-xl border border-[#2E2E2E] bg-[#1C1C1C] shadow-modal z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2E2E2E]">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-text-1">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAll} className="text-[11px] text-text-3 hover:text-primary transition-colors">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-text-4 hover:text-text-2 transition-colors p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex border-b border-[#2E2E2E]">
              {(['all', 'unread'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'flex-1 py-2 text-[12px] font-medium transition-colors',
                    filter === f ? 'text-text-1 border-b-2 border-primary' : 'text-text-3 hover:text-text-2'
                  )}
                >
                  {f === 'all' ? 'All' : `Unread (${unread})`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {visible.length === 0 ? (
                <div className="py-12 text-center">
                  <Check className="w-8 h-8 text-text-4 mx-auto mb-2" />
                  <p className="text-[13px] text-text-3">All caught up</p>
                </div>
              ) : (
                visible.map(n => {
                  const Icon = icons[n.type]
                  return (
                    <div
                      key={n.id}
                      onClick={() => markOne(n.id)}
                      className={cn(
                        'flex gap-3 px-4 py-3.5 border-b border-[#2E2E2E] last:border-0 cursor-pointer group transition-colors',
                        n.read ? 'hover:bg-white/[0.02]' : 'bg-primary/[0.03] hover:bg-primary/[0.05]'
                      )}
                    >
                      {/* Icon */}
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', iconColors[n.type])}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-[13px] font-medium leading-snug', n.read ? 'text-text-2' : 'text-text-1')}>
                            {n.title}
                          </p>
                          <button
                            onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                            className="text-text-4 hover:text-text-2 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[12px] text-text-3 leading-relaxed mt-0.5">{n.body}</p>
                        <p className="text-[10px] font-mono text-text-4 mt-1.5">{n.time}</p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-[#2E2E2E] flex items-center justify-between">
              <button className="text-[11px] text-text-3 hover:text-text-2 transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Notification settings
              </button>
              <button onClick={() => setNotifs([])} className="text-[11px] text-text-4 hover:text-red-400 transition-colors">
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
