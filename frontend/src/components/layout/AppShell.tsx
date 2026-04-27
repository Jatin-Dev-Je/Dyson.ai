import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, List, Users, Search, Settings, ChevronDown,
  Plus, Check, LogOut, User, CreditCard, ChevronRight,
  HelpCircle, ExternalLink, Hash, LayoutDashboard,
  Keyboard,
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

// ─── Dropdown ─────────────────────────────────────────────────────────────
function Menu({ open, children, className = '' }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 rounded-xl border border-[#2E2E2E] bg-[#222222] shadow-modal py-1 min-w-[200px]',
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
        'w-full flex items-center gap-2.5 px-3 py-[7px] mx-1 rounded-lg text-[13px] transition-colors text-left',
        'w-[calc(100%-8px)]',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-text-2 hover:text-text-1 hover:bg-white/[0.05]'
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-text-4" />}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-text-4 bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#2E2E2E]">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

function MenuLabel({ children }: { children: string }) {
  return <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-text-4 uppercase tracking-wider">{children}</p>
}

function MenuSep() { return <div className="my-1.5 border-t border-[#2E2E2E]" /> }

// ─── Workspace switcher ───────────────────────────────────────────────────
const workspaces = [
  { id: '1', name: 'Acme Corp',    plan: 'Free',  initials: 'AC', color: 'bg-primary/20 text-primary' },
  { id: '2', name: 'Side Project', plan: 'Free',  initials: 'SP', color: 'bg-violet-500/20 text-violet-400' },
]

function WorkspaceSwitcher() {
  const [open, setOpen]   = useState(false)
  const [active, setActive] = useState(workspaces[0]!)
  const ref               = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative px-2 pb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
      >
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-bold', active.color)}>
          {active.initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-medium text-text-1 leading-none truncate">{active.name}</p>
          <p className="text-[10px] text-text-4 leading-none mt-0.5">{active.plan} plan</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <Menu open={open} className="top-full left-2 right-2 mt-0.5">
        <MenuLabel>Workspaces</MenuLabel>
        {workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => { setActive(ws); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-[7px] mx-1 w-[calc(100%-8px)] rounded-lg hover:bg-white/[0.05] transition-colors group"
          >
            <div className={cn('w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0', ws.color)}>
              {ws.initials}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] text-text-2 group-hover:text-text-1 transition-colors">{ws.name}</p>
            </div>
            {ws.id === active.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </button>
        ))}
        <MenuSep />
        <MenuItem icon={Plus} label="Create workspace" />
      </Menu>
    </div>
  )
}

// ─── User menu ────────────────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref      = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative px-2 py-2 border-t border-[#2E2E2E]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.05] transition-colors group"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-violet-500/60 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white">
          J
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-medium text-text-1 leading-none truncate">Jatin Dev</p>
          <p className="text-[10px] text-text-4 leading-none mt-0.5 truncate">sainijatin3078@gmail.com</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <Menu open={open} className="bottom-full left-2 right-2 mb-0.5">
        <div className="px-3 py-2.5 border-b border-[#2E2E2E] mb-1">
          <p className="text-[13px] font-semibold text-text-1">Jatin Dev</p>
          <p className="text-[11px] text-text-3 mt-0.5">sainijatin3078@gmail.com</p>
        </div>
        <MenuLabel>Account</MenuLabel>
        <MenuItem icon={User}         label="Profile"        shortcut="⌘P" onClick={() => { navigate('/app/settings/profile'); setOpen(false) }} />
        <MenuItem icon={CreditCard}   label="Billing"        onClick={() => { navigate('/app/settings/billing'); setOpen(false) }} />
        <MenuItem icon={Settings}     label="Settings"       onClick={() => { navigate('/app/settings'); setOpen(false) }} />
        <MenuSep />
        <MenuLabel>Help</MenuLabel>
        <MenuItem icon={HelpCircle}   label="Documentation"  />
        <MenuItem icon={ExternalLink} label="What's new"     />
        <MenuItem icon={Keyboard}     label="Keyboard shortcuts" shortcut="?" />
        <MenuSep />
        <MenuItem icon={LogOut} label="Sign out" danger
          onClick={() => { auth.logout(); navigate('/login', { replace: true }) }}
        />
      </Menu>
    </div>
  )
}

// ─── Nav item ─────────────────────────────────────────────────────────────
function NavItem({
  to, icon: Icon, label, badge, exact = false,
}: { to: string; icon: React.ElementType; label: string; badge?: number; exact?: boolean }) {
  const location = useLocation()
  const active   = exact ? location.pathname === to : (location.pathname === to || location.pathname.startsWith(to + '/'))

  return (
    <NavLink to={to} end={exact}>
      <div className={cn(
        'relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-100 group',
        active
          ? 'bg-white/[0.07] text-text-1'
          : 'text-text-3 hover:text-text-2 hover:bg-white/[0.04]'
      )}>
        {/* Active left border */}
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
        <Icon className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors',
          active ? 'text-text-1' : 'text-text-4 group-hover:text-text-3'
        )} />
        <span className="flex-1 font-[450]">{label}</span>
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

// ─── Section header ───────────────────────────────────────────────────────
function SidebarSection({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <p className="px-2.5 py-1.5 text-[10px] font-semibold text-text-4 uppercase tracking-widest">
          {label}
        </p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

// ─── Search trigger ───────────────────────────────────────────────────────
function SearchTrigger() {
  return (
    <button
      onClick={() => {
        const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
        window.dispatchEvent(e)
      }}
      className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg border border-[#2E2E2E] bg-white/[0.02] text-[12px] text-text-4 hover:text-text-3 hover:bg-white/[0.04] hover:border-[#3D3D3D] transition-all duration-150 group"
    >
      <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
      <span className="flex-1 text-left">Search...</span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <kbd className="text-[9px] font-mono bg-white/[0.04] px-1 py-0.5 rounded border border-[#2E2E2E]">⌘</kbd>
        <kbd className="text-[9px] font-mono bg-white/[0.04] px-1 py-0.5 rounded border border-[#2E2E2E]">K</kbd>
      </div>
    </button>
  )
}

// ─── Connected sources ────────────────────────────────────────────────────
function SourceStatus({ label, dot, time }: { label: string; dot: string; time: string }) {
  return (
    <Link to="/app/settings/sources">
      <div className="flex items-center gap-2 px-2.5 py-[5px] rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
        <span className="text-[12px] text-text-4 group-hover:text-text-3 transition-colors flex-1">{label}</span>
        <span className="text-[10px] font-mono text-text-4 opacity-0 group-hover:opacity-100 transition-opacity">{time}</span>
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
    <header className="h-[52px] flex-shrink-0 flex items-center justify-between px-6 border-b border-[#2E2E2E] bg-[#141414]/95 backdrop-blur-xl sticky top-0 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-text-4 hover:text-text-3 cursor-pointer transition-colors">Acme Corp</span>
        <ChevronRight className="w-3.5 h-3.5 text-text-4" />
        <span className="text-text-2 font-medium">{title}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <NotificationPanel />
        <div className="w-px h-4 bg-[#2E2E2E] mx-1" />
        <Link to="/app/why">
          <button className="h-7 px-3 flex items-center gap-1.5 rounded-lg border border-[#2E2E2E] bg-white/[0.03] text-[12px] font-medium text-text-2 hover:text-text-1 hover:bg-white/[0.06] hover:border-[#3D3D3D] transition-all duration-150 active:scale-[0.97]">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Ask WHY
          </button>
        </Link>
      </div>
    </header>
  )
}

// ─── Recent queries ───────────────────────────────────────────────────────
const recentQueries = [
  'Why did we move to JWT?',
  'What caused the Q3 incident?',
  'Why off Redis rate limiter?',
]

// ─── Shell ────────────────────────────────────────────────────────────────
export default function AppShell() {
  return (
    <>
      <CommandPalette />

      <div className="flex h-screen bg-[#141414] overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className="w-[228px] flex-shrink-0 flex flex-col border-r border-[#2E2E2E] bg-[#1A1A1A] select-none">

          {/* Logo */}
          <div className="flex items-center gap-2.5 h-[52px] px-4 border-b border-[#2E2E2E] flex-shrink-0">
            <DysonMark size={18} className="text-primary" />
            <span className="text-[14px] font-semibold text-text-1 tracking-[-0.01em]">Dyson</span>
            <div className="ml-auto">
              <span className="text-[9px] font-mono text-text-4 bg-white/[0.04] border border-[#2E2E2E] px-1.5 py-0.5 rounded">
                BETA
              </span>
            </div>
          </div>

          {/* Workspace switcher */}
          <div className="border-b border-[#2E2E2E] pt-2">
            <WorkspaceSwitcher />
          </div>

          {/* Search */}
          <div className="px-2 py-2 border-b border-[#2E2E2E]">
            <SearchTrigger />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">

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
                <button
                  key={i}
                  className="w-full text-left flex items-start gap-2 px-2.5 py-[6px] rounded-lg text-[12px] text-text-4 hover:text-text-3 hover:bg-white/[0.04] transition-all duration-100 group"
                >
                  <Hash className="w-3 h-3 flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                  <span className="truncate leading-relaxed">{q}</span>
                </button>
              ))}
            </SidebarSection>

            {/* Connected sources */}
            <SidebarSection label="Connected">
              <SourceStatus label="Slack"  dot="bg-[#E01E5A]" time="2m" />
              <SourceStatus label="GitHub" dot="bg-[#8B949E]" time="4m" />
              <div className="flex items-center gap-2 px-2.5 py-[5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-text-4 flex-shrink-0" />
                <span className="text-[12px] text-text-4 flex-1">Notion</span>
                <span className="text-[9px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                  error
                </span>
              </div>
            </SidebarSection>
          </nav>

          {/* Bottom section */}
          <div className="border-t border-[#2E2E2E]">
            <div className="px-2 py-2">
              <NavItem to="/app/settings" icon={Settings} label="Settings" />
            </div>
            <UserMenu />
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
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
