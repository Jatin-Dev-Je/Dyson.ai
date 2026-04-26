import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, List, Users, Search, Settings, ChevronDown,
  Plus, Check, LogOut, User, CreditCard, Bell,
  ChevronRight, HelpCircle, ExternalLink, Hash, GitPullRequest,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { DysonMark } from '@/components/shared/DysonMark'

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
function Menu({ open, children, className = '' }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit  ={{ opacity: 0, scale: 0.97, y: -4 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 min-w-[200px] rounded-lg border border-[#2E2E2E] bg-[#222222] shadow-modal py-1',
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
        'w-full flex items-center gap-2 px-3 py-[6px] text-[13px] transition-colors text-left rounded-md mx-1 w-[calc(100%-8px)]',
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-2 hover:text-text-1 hover:bg-white/[0.05]'
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 text-text-3" />}
      <span className="flex-1">{label}</span>
      {shortcut && <kbd className="text-[10px] font-mono text-text-4 bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#2E2E2E]">{shortcut}</kbd>}
    </button>
  )
}

function MenuSep() { return <div className="my-1 border-t border-[#2E2E2E]" /> }

// ─── Workspace switcher ───────────────────────────────────────────────────
const workspaces = [
  { id: '1', name: 'Acme Corp', plan: 'Free', initials: 'AC' },
  { id: '2', name: 'Side Project', plan: 'Free', initials: 'SP' },
]

function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(workspaces[0]!)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.05] transition-colors group"
      >
        <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-primary">{active.initials}</span>
        </div>
        <span className="flex-1 text-[13px] font-medium text-text-1 truncate text-left">{active.name}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-4 transition-transform', open && 'rotate-180')} />
      </button>

      <Menu open={open} className="top-full left-0 right-0 mt-0.5">
        <p className="px-3 py-1 text-[11px] font-medium text-text-3 uppercase tracking-wider">Workspaces</p>
        {workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => { setActive(ws); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-[6px] mx-1 w-[calc(100%-8px)] rounded-md hover:bg-white/[0.05] transition-colors"
          >
            <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-primary">{ws.initials}</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] text-text-2">{ws.name}</p>
            </div>
            {ws.id === active.id && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
        ))}
        <MenuSep />
        <MenuItem icon={Plus} label="New workspace" />
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/[0.05] transition-colors"
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/50 to-violet-500/50 flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-white">J</span>
        </div>
        <span className="flex-1 text-[13px] text-text-2 truncate text-left">Jatin Dev</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-4 transition-transform', open && 'rotate-180')} />
      </button>

      <Menu open={open} className="bottom-full left-0 right-0 mb-0.5">
        <div className="px-3 py-2 mb-1">
          <p className="text-[13px] font-medium text-text-1">Jatin Dev</p>
          <p className="text-[11px] text-text-3 mt-0.5">sainijatin3078@gmail.com</p>
        </div>
        <MenuSep />
        <MenuItem icon={User}        label="Profile"       shortcut="⌘P" />
        <MenuItem icon={Bell}        label="Notifications" />
        <MenuItem icon={CreditCard}  label="Billing"       />
        <MenuSep />
        <MenuItem icon={HelpCircle}  label="Help & docs"   />
        <MenuItem icon={ExternalLink}label="What's new"    />
        <MenuSep />
        <MenuItem icon={LogOut} label="Sign out" danger onClick={() => { auth.logout(); navigate('/login', { replace: true }) }} />
      </Menu>
    </div>
  )
}

// ─── Nav section ──────────────────────────────────────────────────────────
function NavSection({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      {label && <p className="px-3 py-1 text-[11px] font-medium text-text-4 uppercase tracking-wider">{label}</p>}
      {children}
    </div>
  )
}

function NavItem({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string; badge?: number }) {
  const location = useLocation()
  const active = location.pathname === to || (to !== '/app' && location.pathname.startsWith(to))
  return (
    <NavLink to={to}>
      <div className={cn(
        'flex items-center gap-2 px-3 py-[6px] rounded-md text-[13px] transition-all duration-100',
        active ? 'bg-white/[0.07] text-text-1' : 'text-text-3 hover:text-text-2 hover:bg-white/[0.04]'
      )}>
        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-text-2' : 'text-text-4')} />
        <span className="flex-1">{label}</span>
        {badge !== undefined && (
          <span className="text-[10px] font-mono text-text-4 bg-white/[0.06] px-1.5 rounded">{badge}</span>
        )}
      </div>
    </NavLink>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────
function Topbar() {
  const location = useLocation()
  const crumbs: Record<string, string> = {
    '/app/why':             'WHY Engine',
    '/app/decisions':       'Decision Log',
    '/app/onboarding-packs':'Onboarding Packs',
    '/app/search':          'Search',
    '/app/settings':        'Settings',
  }
  const title = Object.entries(crumbs).find(([k]) => location.pathname.startsWith(k))?.[1] ?? 'Dashboard'

  return (
    <div className="h-[52px] flex-shrink-0 flex items-center justify-between px-6 border-b border-[#2E2E2E] bg-[#141414]/90 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-text-3">Acme Corp</span>
        <ChevronRight className="w-3.5 h-3.5 text-text-4" />
        <span className="text-text-2 font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button className="h-7 px-2 rounded-md text-text-3 hover:text-text-2 hover:bg-white/[0.05] transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <Link to="/app/why">
          <button className="h-7 px-3 flex items-center gap-1.5 rounded-md border border-[#2E2E2E] bg-white/[0.03] text-[12px] text-text-2 hover:text-text-1 hover:bg-white/[0.06] hover:border-[#3D3D3D] transition-all">
            <Zap className="w-3.5 h-3.5" />
            Ask WHY
          </button>
        </Link>
      </div>
    </div>
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
    <div className="flex h-screen bg-[#141414] overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-[#2E2E2E] bg-[#1A1A1A]">

        {/* Logo row */}
        <div className="flex items-center h-[52px] px-4 border-b border-[#2E2E2E] flex-shrink-0">
          <DysonMark size={18} className="text-primary mr-2" />
          <span className="text-[13px] font-semibold text-text-1">Dyson</span>
        </div>

        {/* Workspace switcher */}
        <div className="px-2 pt-3 pb-2 border-b border-[#2E2E2E]">
          <WorkspaceSwitcher />
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">

          <NavSection>
            <NavItem to="/app"              icon={Hash}         label="Home"          />
            <NavItem to="/app/why"          icon={Zap}          label="WHY Engine"    />
            <NavItem to="/app/decisions"    icon={List}         label="Decision Log"  badge={8} />
            <NavItem to="/app/onboarding-packs" icon={Users}    label="Onboarding"    />
            <NavItem to="/app/search"       icon={Search}       label="Search"        />
          </NavSection>

          <NavSection label="Recent">
            {recentQueries.map((q, i) => (
              <button
                key={i}
                className="w-full text-left flex items-center gap-2 px-3 py-[5px] rounded-md text-[12px] text-text-4 hover:text-text-3 hover:bg-white/[0.04] transition-colors"
              >
                <Hash className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{q}</span>
              </button>
            ))}
          </NavSection>

          <NavSection label="Connected">
            {[
              { label: 'Slack',  dot: 'bg-[#E01E5A]', time: '2m' },
              { label: 'GitHub', dot: 'bg-[#8B949E]',  time: '4m' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-[5px]">
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                <span className="text-[12px] text-text-4 flex-1">{s.label}</span>
                <span className="text-[10px] font-mono text-text-4">{s.time}m</span>
              </div>
            ))}
          </NavSection>
        </nav>

        {/* Settings */}
        <div className="px-2 pb-2 border-t border-[#2E2E2E] pt-2">
          <NavItem to="/app/settings" icon={Settings} label="Settings" />
        </div>

        {/* User */}
        <div className="px-2 pb-3 border-t border-[#2E2E2E] pt-2">
          <UserMenu />
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-[#141414]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
