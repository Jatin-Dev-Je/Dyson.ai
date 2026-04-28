import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, List, Users, Search, Settings, ChevronDown,
  Plus, Check, LogOut, User, CreditCard, ChevronRight,
  HelpCircle, ExternalLink, Hash, LayoutDashboard,
  Keyboard, Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { DysonMark } from '@/components/shared/DysonMark'
import { NotificationPanel } from './NotificationPanel'
import { CommandPalette } from './CommandPalette'

// ─── Outside click ────────────────────────────────────────────────────────
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

// ─── Dropdown primitives ──────────────────────────────────────────────────
function FloatingMenu({ open, children, className = '' }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -4 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1.5 min-w-[200px]',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MenuItem({
  icon: Icon, label, shortcut, danger = false, onClick,
}: { icon?: React.ElementType; label: string; shortcut?: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-[6px] mx-1 rounded-lg text-[13px] transition-colors text-left',
        'w-[calc(100%-8px)]',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-text-2 hover:text-text-1 hover:bg-white/[0.06]'
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-text-4" />}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-text-4 bg-white/[0.05] px-1.5 py-0.5 rounded border border-[#2E2E2E]">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

function MenuSep() { return <div className="my-1.5 mx-1 border-t border-[#282828]" /> }
function MenuLabel({ children }: { children: string }) {
  return <p className="px-3 pt-1.5 pb-0.5 text-[10.5px] font-medium text-text-4 uppercase tracking-widest">{children}</p>
}

// ─── Workspace switcher ───────────────────────────────────────────────────
const workspaces = [
  { id: '1', name: 'Acme Corp',    plan: 'Free',  initials: 'AC', color: 'bg-violet-500/25 text-violet-300' },
  { id: '2', name: 'Side Project', plan: 'Free',  initials: 'SP', color: 'bg-emerald-500/20 text-emerald-400' },
]

function WorkspaceSwitcher() {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(workspaces[0]!)
  const ref                 = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative px-3 py-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors group"
      >
        <div className={cn('w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0', active.color)}>
          {active.initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-medium text-text-1 leading-none truncate">{active.name}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <FloatingMenu open={open} className="top-full left-0 right-0 mt-1">
        <MenuLabel>Workspaces</MenuLabel>
        {workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => { setActive(ws); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-2.5 py-[6px] mx-1 w-[calc(100%-8px)] rounded-lg hover:bg-white/[0.06] transition-colors group"
          >
            <div className={cn('w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0', ws.color)}>
              {ws.initials}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] text-text-2 group-hover:text-text-1 transition-colors">{ws.name}</p>
              <p className="text-[10px] text-text-4">{ws.plan} plan</p>
            </div>
            {ws.id === active.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </button>
        ))}
        <MenuSep />
        <MenuItem icon={Plus} label="Create workspace" />
      </FloatingMenu>
    </div>
  )
}

// ─── User menu ────────────────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.04] transition-colors group"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white">
          J
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[12.5px] font-medium text-text-2 leading-none truncate group-hover:text-text-1 transition-colors">Jatin Dev</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <FloatingMenu open={open} className="bottom-full left-2 right-2 mb-1">
        <div className="px-3 py-2.5 border-b border-[#282828] mb-1">
          <p className="text-[13px] font-semibold text-text-1">Jatin Dev</p>
          <p className="text-[11px] text-text-3 mt-0.5 truncate">sainijatin3078@gmail.com</p>
        </div>
        <MenuItem icon={User}         label="Profile"        shortcut="⌘P" onClick={() => { navigate('/app/settings/profile'); setOpen(false) }} />
        <MenuItem icon={CreditCard}   label="Billing"                      onClick={() => { navigate('/app/settings/billing'); setOpen(false) }} />
        <MenuItem icon={Settings}     label="Settings"                     onClick={() => { navigate('/app/settings'); setOpen(false) }} />
        <MenuSep />
        <MenuItem icon={HelpCircle}   label="Documentation"  />
        <MenuItem icon={ExternalLink} label="What's new"     />
        <MenuItem icon={Keyboard}     label="Keyboard shortcuts" shortcut="?" />
        <MenuSep />
        <MenuItem icon={LogOut} label="Sign out" danger
          onClick={() => { auth.logout(); navigate('/login', { replace: true }) }}
        />
      </FloatingMenu>
    </div>
  )
}

// ─── Nav item ─────────────────────────────────────────────────────────────
function NavItem({
  to, icon: Icon, label, badge, exact = false,
}: { to: string; icon: React.ElementType; label: string; badge?: number; exact?: boolean }) {
  const location = useLocation()
  const active   = exact
    ? location.pathname === to
    : (location.pathname === to || location.pathname.startsWith(to + '/'))

  return (
    <NavLink to={to} end={exact}>
      <div className={cn(
        'relative flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[13px] transition-colors duration-100 group cursor-pointer mx-1',
        active
          ? 'bg-white/[0.07] text-text-1'
          : 'text-text-3 hover:text-text-2 hover:bg-white/[0.04]'
      )}>
        {active && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-1 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-primary rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Icon className={cn(
          'w-[15px] h-[15px] flex-shrink-0 transition-colors',
          active ? 'text-text-1' : 'text-text-4 group-hover:text-text-3'
        )} />
        <span className="flex-1 font-[440]">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className={cn(
            'text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums',
            active ? 'bg-white/[0.12] text-text-2' : 'bg-white/[0.06] text-text-4'
          )}>
            {badge}
          </span>
        )}
      </div>
    </NavLink>
  )
}

// ─── Section divider ──────────────────────────────────────────────────────
function SidebarSection({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <p className="px-4 pb-1 pt-0.5 text-[10.5px] font-medium text-text-4/80 uppercase tracking-[0.08em]">
          {label}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

// ─── Recent query item ─────────────────────────────────────────────────────
function RecentQueryItem({ query }: { query: string }) {
  return (
    <button className="w-full text-left flex items-center gap-2 px-3 py-[5px] mx-1 w-[calc(100%-8px)] rounded-lg text-[12.5px] text-text-4 hover:text-text-2 hover:bg-white/[0.04] transition-all duration-100 group">
      <Hash className="w-3 h-3 flex-shrink-0 text-text-4 group-hover:text-text-3 transition-colors" />
      <span className="truncate leading-relaxed">{query}</span>
    </button>
  )
}

// ─── Source status ────────────────────────────────────────────────────────
const sourceConfig = {
  Slack:  { dot: 'bg-[#E01E5A]',  active: true  },
  GitHub: { dot: 'bg-[#8B949E]',  active: true  },
  Notion: { dot: 'bg-orange-400', active: false, error: true },
} as const

function SourceStatus({ name }: { name: keyof typeof sourceConfig }) {
  const cfg = sourceConfig[name]
  return (
    <Link to="/app/settings/sources">
      <div className="flex items-center gap-2 px-3 py-[5px] mx-1 w-[calc(100%-8px)] rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group">
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          cfg.dot,
          'error' in cfg && cfg.error && 'animate-pulse'
        )} />
        <span className="text-[12.5px] text-text-4 group-hover:text-text-3 transition-colors flex-1">{name}</span>
        {'error' in cfg && cfg.error && (
          <span className="text-[9px] font-mono text-orange-400/80 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
            error
          </span>
        )}
      </div>
    </Link>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────
function Topbar() {
  const location = useLocation()
  const crumbs: [string, string][] = [
    ['/app/why',              'WHY Engine'],
    ['/app/decisions',        'Decision Log'],
    ['/app/onboarding-packs', 'Onboarding Packs'],
    ['/app/search',           'Search'],
    ['/app/settings',         'Settings'],
  ]
  const current = crumbs.find(([k]) => location.pathname.startsWith(k))
  const title   = current?.[1] ?? 'Dashboard'

  return (
    <header className="h-[52px] flex-shrink-0 flex items-center justify-between px-6 border-b border-[#1E1E1E] bg-[#141414]/98 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-text-4 hover:text-text-3 cursor-pointer transition-colors">Acme Corp</span>
        <ChevronRight className="w-3.5 h-3.5 text-text-4" />
        <span className="text-text-2 font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationPanel />
        <div className="w-px h-4 bg-[#282828] mx-1" />
        <Link to="/app/why">
          <button className="h-7 px-3 flex items-center gap-1.5 rounded-lg border border-[#282828] bg-white/[0.03] text-[12px] font-medium text-text-2 hover:text-text-1 hover:bg-white/[0.06] hover:border-[#3D3D3D] transition-all duration-150 active:scale-[0.97]">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Ask WHY
          </button>
        </Link>
      </div>
    </header>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
const recentQueries = [
  'Why did we move to JWT?',
  'What caused the Q3 incident?',
  'Why off Redis rate limiter?',
]

export default function AppShell() {
  return (
    <>
      <CommandPalette />

      <div className="flex h-screen bg-[#141414] overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <aside className="w-[240px] flex-shrink-0 flex flex-col bg-[#181818] select-none overflow-hidden" style={{ borderRight: '1px solid #1E1E1E' }}>

          {/* Brand + workspace — single unified header */}
          <div className="pt-3 pb-1">
            {/* Brand row */}
            <div className="flex items-center gap-2.5 px-4 py-1.5 mb-0.5">
              <DysonMark size={16} className="text-text-1 flex-shrink-0" />
              <span className="text-[13.5px] font-semibold text-text-1 tracking-[-0.01em] flex-1">Dyson</span>
              <span className="text-[9px] font-mono text-primary/80 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm">
                BETA
              </span>
            </div>

            {/* Workspace switcher — directly below brand */}
            <WorkspaceSwitcher />
          </div>

          {/* Divider */}
          <div className="mx-3 my-1 border-t border-[#242424]" />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 space-y-4 overflow-x-hidden">

            {/* Primary navigation */}
            <SidebarSection>
              <NavItem to="/app"              icon={LayoutDashboard} label="Dashboard"        exact />
              <NavItem to="/app/why"          icon={Zap}             label="WHY Engine"       />
              <NavItem to="/app/decisions"    icon={List}            label="Decision Log"     badge={8} />
              <NavItem to="/app/onboarding-packs" icon={Users}      label="Onboarding Packs" />
              <NavItem to="/app/search"       icon={Search}          label="Search"           />
            </SidebarSection>

            {/* Recent queries */}
            <SidebarSection label="Recent">
              {recentQueries.map((q, i) => (
                <RecentQueryItem key={i} query={q} />
              ))}
            </SidebarSection>

            {/* Connected sources */}
            <SidebarSection label="Sources">
              <SourceStatus name="Slack"  />
              <SourceStatus name="GitHub" />
              <SourceStatus name="Notion" />
              <Link to="/app/settings/sources">
                <div className="flex items-center gap-2 px-3 py-[5px] mx-1 w-[calc(100%-8px)] rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <Circle className="w-3 h-3 text-text-4/40 flex-shrink-0" />
                  <span className="text-[12.5px] text-text-4/60 group-hover:text-text-3 transition-colors">Add source…</span>
                </div>
              </Link>
            </SidebarSection>
          </nav>

          {/* Bottom — settings + user */}
          <div style={{ borderTop: '1px solid #1E1E1E' }}>
            {/* Settings nav item */}
            <div className="px-0 py-1.5">
              <NavItem to="/app/settings" icon={Settings} label="Settings" />
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-[#1E1E1E]" />

            {/* User */}
            <UserMenu />
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
