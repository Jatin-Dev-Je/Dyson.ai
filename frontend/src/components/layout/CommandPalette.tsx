import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, Zap, List, Users, Settings, Home, ArrowRight, Hash, FileText, Plug } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = {
  id: string
  label: string
  sub: string | undefined
  icon: React.ElementType
  action: () => void
  group: string
}

export function CommandPalette() {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const [active, setActive] = useState(0)
  const navigate             = useNavigate()

  const nav = useCallback((to: string) => { navigate(to); setOpen(false); setQuery('') }, [navigate])

  const pages: Item[] = [
    { id: 'home',       label: 'Home',             sub: undefined, icon: Home,     action: () => nav('/app'),                      group: 'Navigate' },
    { id: 'why',        label: 'WHY Engine',        sub: undefined, icon: Zap,      action: () => nav('/app/why'),                  group: 'Navigate' },
    { id: 'decisions',  label: 'Decision Log',      sub: undefined, icon: List,     action: () => nav('/app/decisions'),            group: 'Navigate' },
    { id: 'onboarding', label: 'Onboarding Packs',  sub: undefined, icon: Users,    action: () => nav('/app/onboarding-packs'),     group: 'Navigate' },
    { id: 'search',     label: 'Search',            sub: undefined, icon: Search,   action: () => nav('/app/search'),               group: 'Navigate' },
    { id: 'profile',    label: 'Profile settings',  sub: undefined, icon: Settings, action: () => nav('/app/settings/profile'),     group: 'Settings' },
    { id: 'sources',    label: 'Connected sources', sub: undefined, icon: Plug,     action: () => nav('/app/settings/sources'),     group: 'Settings' },
    { id: 'members',    label: 'Team members',      sub: undefined, icon: Users,    action: () => nav('/app/settings/members'),     group: 'Settings' },
    { id: 'billing',    label: 'Billing & plan',    sub: undefined, icon: FileText, action: () => nav('/app/settings/billing'),     group: 'Settings' },
    { id: 'apikeys',    label: 'API keys',          sub: undefined, icon: Hash,     action: () => nav('/app/settings/api-keys'),    group: 'Settings' },
  ]

  const recent = [
    { id: 'r1', label: 'Why did we move to JWT auth?',     sub: 'WHY Engine query', icon: Zap,  action: () => nav('/app/why'), group: 'Recent' },
    { id: 'r2', label: 'JWT auth replaces session tokens', sub: 'Decision · Backend', icon: List, action: () => nav('/app/decisions'), group: 'Recent' },
    { id: 'r3', label: 'What caused the Q3 incident?',     sub: 'WHY Engine query', icon: Zap,  action: () => nav('/app/why'), group: 'Recent' },
  ]

  const filtered = query.trim()
    ? pages.filter(p => p.label.toLowerCase().includes(query.toLowerCase()) || (p.sub ?? '').toLowerCase().includes(query.toLowerCase()))
    : recent

  useEffect(() => { setActive(0) }, [query, open])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(v => !v) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)) }
      if (e.key === 'Enter')     { filtered[active]?.action() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, active, filtered])

  // Group items
  const groups = filtered.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group]!.push(item)
    return acc
  }, {})

  return (
    <>
      {/* Trigger — invisible, activated by keyboard shortcut */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit  ={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[520px] mx-6 rounded-xl border border-[#3D3D3D] bg-[#1C1C1C] shadow-modal overflow-hidden"
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2E2E2E]">
                <Search className="w-4 h-4 text-text-4 flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pages, decisions, or ask a question..."
                  className="flex-1 bg-transparent text-[14px] text-text-1 placeholder:text-text-4 outline-none"
                />
                <kbd className="text-[10px] font-mono text-text-4 bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#2E2E2E] flex-shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[13px] text-text-3">No results for "{query}"</p>
                  </div>
                ) : (
                  Object.entries(groups).map(([group, items]) => (
                    <div key={group} className="mb-1">
                      <p className="px-4 py-1 text-[10px] font-medium text-text-4 uppercase tracking-wider">{group}</p>
                      {items.map((item) => {
                        const globalIdx = filtered.findIndex(f => f.id === item.id)
                        const Icon = item.icon
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() => setActive(globalIdx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                              active === globalIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                            )}
                          >
                            <div className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
                              active === globalIdx ? 'bg-primary/20 border border-primary/30' : 'bg-white/[0.04] border border-[#2E2E2E]'
                            )}>
                              <Icon className={cn('w-3.5 h-3.5', active === globalIdx ? 'text-primary' : 'text-text-3')} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-[13px] truncate', active === globalIdx ? 'text-text-1' : 'text-text-2')}>{item.label}</p>
                              {item.sub && <p className="text-[11px] text-text-4 truncate">{item.sub}</p>}
                            </div>
                            {active === globalIdx && <ArrowRight className="w-3.5 h-3.5 text-text-4 flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-[#2E2E2E]">
                {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <kbd className="text-[10px] font-mono text-text-4 bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#2E2E2E]">{key}</kbd>
                    <span className="text-[11px] text-text-4">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
