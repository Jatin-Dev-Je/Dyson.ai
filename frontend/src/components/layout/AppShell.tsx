import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Brain, Network, Users, Search, Settings, ChevronDown,
  LogOut, User, CreditCard, Plus, Bell, LayoutDashboard,
  ChevronRight, Trash2, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi, tokens } from '@/lib/api'
import { DysonMark } from '@/components/shared/DysonMark'

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

// ─── Nav item ─────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, badge, exact = false }: {
  to: string; icon: React.ElementType; label: string
  badge?: number; exact?: boolean
}) {
  const location = useLocation()
  const active = exact
    ? location.pathname === to || location.pathname === to + '/'
    : location.pathname.startsWith(to)

  return (
    <NavLink to={to} end={exact}>
      <div className={cn(
        'flex items-center gap-2 px-2 py-[5px] rounded-md text-[13.5px] cursor-pointer select-none transition-colors duration-75',
        active
          ? 'bg-[rgba(0,0,0,0.06)] text-[#1a1a1a] font-medium'
          : 'text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1a1a1a]'
      )}>
        <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-[#1a1a1a]' : 'text-[#9b9b9b]')} />
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-medium text-[#9b9b9b] bg-[rgba(0,0,0,0.06)] px-1.5 py-0.5 rounded tabular-nums">
            {badge}
          </span>
        )}
      </div>
    </NavLink>
  )
}

// ─── Collapsible section ───────────────────────────────────────────────────
function SidebarSection({ label, children, defaultOpen = true }: {
  label: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-semibold text-[#a0a0a0] uppercase tracking-[0.05em] hover:text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.03)] transition-colors select-none"
      >
        <ChevronRight className={cn('w-3 h-3 transition-transform duration-150 flex-shrink-0', open && 'rotate-90')} />
        {label}
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  )
}

// ─── Source item ───────────────────────────────────────────────────────────
function SourceItem({ name, dotColor, connected }: { name: string; dotColor: string; connected: boolean }) {
  return (
    <Link to="/app/settings/sources">
      <div className="flex items-center gap-2 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor, opacity: connected ? 1 : 0.3 }} />
        <span className={cn('flex-1 text-[13.5px] truncate', connected ? 'text-[#6b6b6b]' : 'text-[#b0b0b0]')}>
          {name}
        </span>
        {!connected && (
          <span className="text-[10px] text-[#9b9b9b] opacity-0 group-hover:opacity-100 transition-opacity">
            Connect
          </span>
        )}
      </div>
    </Link>
  )
}

// ─── Workspace switcher ────────────────────────────────────────────────────
function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  const user    = authApi.getUser()
  const initial = (user?.name ?? 'W')[0]?.toUpperCase() ?? 'W'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <DysonMark size={13} className="text-white" />
        </div>
        <span className="flex-1 text-left text-[13.5px] font-semibold text-[#1a1a1a] truncate leading-none">Dyson</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#b0b0b0] flex-shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[#E8E7E5] rounded-xl shadow-lg py-1.5 animate-fade-in">
          <div className="px-3 py-2 border-b border-[#F0EFED] mb-1">
            <p className="text-[10.5px] text-[#9b9b9b] uppercase tracking-[0.05em] font-medium mb-2">{user?.email}</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">{initial}</span>
              </div>
              <span className="text-[13px] font-medium text-[#1a1a1a]">Dyson</span>
              <span className="ml-auto text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">Free</span>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-2 px-3 py-[6px] text-[13px] text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.04)] transition-colors text-left"
            onClick={() => setOpen(false)}
          >
            <Plus className="w-3.5 h-3.5" /> Create or join workspace
          </button>
        </div>
      )}
    </div>
  )
}

// ─── User menu ─────────────────────────────────────────────────────────────
function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()
  useOutsideClick(ref, () => setOpen(false))

  const user     = authApi.getUser()
  const name     = user?.name ?? 'Account'
  const email    = user?.email ?? ''
  const initials = name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

  function handleSignOut() {
    tokens.clearAll()
    navigate('/login', { replace: true })
    void authApi.logout()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
          {initials || 'U'}
        </div>
        <span className="flex-1 text-[13.5px] font-medium text-[#1a1a1a] truncate text-left leading-none">{name}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#b0b0b0] flex-shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-[#E8E7E5] rounded-xl shadow-lg py-1.5 animate-fade-in">
          <div className="px-3 py-2 border-b border-[#F0EFED] mb-1">
            <p className="text-[12px] font-semibold text-[#1a1a1a]">{name}</p>
            {email && <p className="text-[11px] text-[#9b9b9b] truncate mt-0.5">{email}</p>}
          </div>
          {[
            { icon: User,       label: 'My profile',      path: '/app/settings/profile'  },
            { icon: Settings,   label: 'Settings',         path: '/app/settings'          },
            { icon: CreditCard, label: 'Plans & billing',  path: '/app/settings/billing'  },
            { icon: FileText,   label: 'Audit log',        path: '/app/settings/audit-log'},
          ].map(item => (
            <button key={item.label}
              onClick={() => { navigate(item.path); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-[6px] text-[13px] text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1a1a1a] transition-colors text-left">
              <item.icon className="w-3.5 h-3.5 text-[#9b9b9b] flex-shrink-0" />
              {item.label}
            </button>
          ))}
          <div className="border-t border-[#F0EFED] mt-1 pt-1">
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-[6px] text-[13px] text-[#DC2626] hover:bg-red-50 transition-colors text-left">
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Topbar ────────────────────────────────────────────────────────────────
function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const titles: [string, string][] = [
    ['/app/recall',           'Recall'],
    ['/app/decisions',        'Memory Graph'],
    ['/app/onboarding-packs', 'Team Briefings'],
    ['/app/search',           'Search'],
    ['/app/settings',         'Settings'],
  ]
  const title = titles.find(([k]) => location.pathname.startsWith(k))?.[1] ?? 'Home'

  return (
    <header className="h-11 flex-shrink-0 flex items-center justify-between px-5 border-b border-[#E8E7E5] bg-white/92 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-1 text-[12.5px]">
        <span className="text-[#9b9b9b]">Dyson</span>
        <span className="text-[#d0d0d0] mx-0.5">/</span>
        <span className="text-[#1a1a1a] font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate('/app/recall')}
          className="h-7 px-3 flex items-center gap-1.5 rounded-md bg-primary text-[12px] font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <Brain className="w-3.5 h-3.5" />
          Recall
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded-md text-[#9b9b9b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1a1a1a] transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

// ─── App shell ─────────────────────────────────────────────────────────────
export default function AppShell() {
  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col bg-[#F7F6F3] border-r border-[#E8E7E5] select-none overflow-hidden">

        {/* Workspace switcher */}
        <div className="px-2 pt-3 pb-2 flex-shrink-0">
          <WorkspaceSwitcher />
        </div>

        {/* Quick actions — search + settings, no duplicates */}
        <div className="px-2 pb-1 flex-shrink-0 space-y-0.5">
          <Link to="/app/search">
            <div className="flex items-center gap-2 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
              <Search className="w-[15px] h-[15px] text-[#9b9b9b]" />
              <span className="flex-1 text-[13.5px] text-[#6b6b6b] group-hover:text-[#1a1a1a] transition-colors">Search</span>
              <kbd className="text-[10px] text-[#c0c0c0] font-mono opacity-0 group-hover:opacity-100 transition-opacity">⌘K</kbd>
            </div>
          </Link>
          <Link to="/app/settings">
            <div className="flex items-center gap-2 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
              <Settings className="w-[15px] h-[15px] text-[#9b9b9b]" />
              <span className="text-[13.5px] text-[#6b6b6b] group-hover:text-[#1a1a1a] transition-colors">Settings & members</span>
            </div>
          </Link>
        </div>

        <div className="mx-3 my-1 border-t border-[#E8E7E5] flex-shrink-0" />

        {/* Main navigation — each item appears exactly once */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5">

          <NavItem to="/app"                   icon={LayoutDashboard} label="Home"           exact />
          <NavItem to="/app/recall"            icon={Brain}           label="Recall"         />
          <NavItem to="/app/decisions"         icon={Network}         label="Memory Graph"   badge={8} />
          <NavItem to="/app/onboarding-packs"  icon={Users}           label="Team Briefings" />

          <div className="h-3" />

          {/* Sources — collapsible */}
          <SidebarSection label="Sources">
            <SourceItem name="Slack"  dotColor="#E01E5A" connected={true}  />
            <SourceItem name="GitHub" dotColor="#656D76" connected={true}  />
            <SourceItem name="Notion" dotColor="#37352F" connected={false} />
            <SourceItem name="Linear" dotColor="#5E6AD2" connected={false} />
            <Link to="/app/settings/sources">
              <div className="flex items-center gap-2 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-[#c0c0c0] group-hover:text-[#9b9b9b]" />
                <span className="text-[13.5px] text-[#b0b0b0] group-hover:text-[#6b6b6b] transition-colors">Add source</span>
              </div>
            </Link>
          </SidebarSection>
        </nav>

        {/* Bottom — trash + user menu */}
        <div className="px-2 py-2 border-t border-[#E8E7E5] flex-shrink-0 space-y-0.5">
          <button className="w-full flex items-center gap-2 px-2 py-[5px] rounded-md text-[13.5px] text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1a1a1a] transition-colors text-left">
            <Trash2 className="w-[15px] h-[15px] text-[#9b9b9b]" />
            Trash
          </button>
          <UserMenu />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
