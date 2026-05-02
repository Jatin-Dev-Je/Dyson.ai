import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Brain, Network, Users, Search,
  Settings, ChevronDown, LogOut, User, CreditCard,
  Plus, Bell, Key,
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

function NavItem({ to, icon: Icon, label, badge, exact = false }: {
  to: string; icon: React.ElementType; label: string; badge?: number; exact?: boolean
}) {
  const location = useLocation()
  const active = exact
    ? location.pathname === to || location.pathname === to + '/'
    : location.pathname.startsWith(to)

  return (
    <NavLink to={to} end={exact}>
      <div className={cn(
        'flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[13px] cursor-pointer select-none transition-colors duration-100',
        active ? 'bg-primary-light text-primary font-medium' : 'text-ink-2 hover:bg-hover hover:text-ink-1'
      )}>
        <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-primary' : 'text-ink-3')} />
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums',
            active ? 'bg-primary/15 text-primary' : 'bg-line text-ink-3'
          )}>
            {badge}
          </span>
        )}
      </div>
    </NavLink>
  )
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold text-ink-4 uppercase tracking-[0.08em]">
      {children}
    </p>
  )
}

const sourceConfig = {
  Slack:  { dot: 'bg-[#E01E5A]', active: true  },
  GitHub: { dot: 'bg-[#656D76]', active: true  },
  Notion: { dot: 'bg-[#37352F]', active: false },
} as const

function SourceRow({ name }: { name: keyof typeof sourceConfig }) {
  const { dot, active } = sourceConfig[name]
  return (
    <Link to="/app/settings/sources">
      <div className="flex items-center gap-2 px-2.5 py-[6px] rounded-md hover:bg-hover transition-colors group cursor-pointer">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot, !active && 'opacity-30')} />
        <span className="text-[13px] text-ink-3 group-hover:text-ink-2 flex-1 transition-colors">{name}</span>
        {!active && <span className="text-[10px] text-ink-4">offline</span>}
      </div>
    </Link>
  )
}

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
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-hover transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
          {initials || 'U'}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[12.5px] font-medium text-ink-1 leading-none truncate">{name}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-ink-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-surface border border-line rounded-lg shadow-md py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-line mb-1">
            <p className="text-[12px] font-semibold text-ink-1">{name}</p>
            {email && <p className="text-[11px] text-ink-3 truncate mt-0.5">{email}</p>}
          </div>
          {[
            { icon: User,       label: 'Profile',  path: '/app/settings/profile' },
            { icon: CreditCard, label: 'Billing',  path: '/app/settings/billing' },
            { icon: Settings,   label: 'Settings', path: '/app/settings' },
          ].map(item => (
            <button key={item.label}
              onClick={() => { navigate(item.path); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-[6px] text-[13px] text-ink-2 hover:bg-hover hover:text-ink-1 transition-colors text-left">
              <item.icon className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />
              {item.label}
            </button>
          ))}
          <div className="border-t border-line mt-1 pt-1">
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-[6px] text-[13px] text-danger hover:bg-red-50 transition-colors text-left">
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Topbar() {
  const location = useLocation()
  const crumbs: [string, string][] = [
    ['/app/recall',           'Recall'],
    ['/app/decisions',        'Memory Graph'],
    ['/app/onboarding-packs', 'Team Briefings'],
    ['/app/search',           'Search'],
    ['/app/settings',         'Settings'],
  ]
  const current = crumbs.find(([k]) => location.pathname.startsWith(k))
  const title   = current?.[1] ?? 'Home'
  const user    = authApi.getUser()

  return (
    <header className="h-11 flex-shrink-0 flex items-center justify-between px-5 border-b border-line bg-surface/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-1 text-[12px]">
        <span className="text-ink-3">{user?.name?.split(' ')[0] ?? 'Workspace'}</span>
        <span className="text-ink-4 mx-0.5">/</span>
        <span className="text-ink-1 font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-1">
        <Link to="/app/recall">
          <button className="h-7 px-3 flex items-center gap-1.5 rounded-md bg-primary text-[12px] font-medium text-white hover:bg-primary-hover transition-colors shadow-sm">
            <Brain className="w-3.5 h-3.5" />
            Recall
          </button>
        </Link>
        <button className="w-7 h-7 flex items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink-1 transition-colors ml-1">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

export default function AppShell() {
  const user = authApi.getUser()

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col bg-subtle border-r border-line select-none">

        {/* Workspace header */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-hover transition-colors cursor-default">
            <DysonMark size={15} className="text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink-1 leading-none">Dyson</p>
              <p className="text-[10.5px] text-ink-3 mt-0.5 truncate">{user?.email ?? 'workspace'}</p>
            </div>
          </div>
        </div>

        <div className="mx-3 border-t border-line flex-shrink-0" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-0.5">
            <NavItem to="/app"                   icon={LayoutDashboard} label="Home"           exact />
            <NavItem to="/app/recall"            icon={Brain}           label="Recall"         />
            <NavItem to="/app/decisions"         icon={Network}         label="Memory Graph"   badge={8} />
            <NavItem to="/app/onboarding-packs"  icon={Users}           label="Team Briefings" />
            <NavItem to="/app/search"            icon={Search}          label="Search"         />
          </div>

          <SidebarLabel>Sources</SidebarLabel>
          <div className="space-y-0.5">
            <SourceRow name="Slack"  />
            <SourceRow name="GitHub" />
            <SourceRow name="Notion" />
            <Link to="/app/settings/sources">
              <div className="flex items-center gap-2 px-2.5 py-[6px] rounded-md hover:bg-hover transition-colors group cursor-pointer">
                <Plus className="w-[15px] h-[15px] text-ink-4 group-hover:text-ink-3" />
                <span className="text-[13px] text-ink-4 group-hover:text-ink-3 transition-colors">Add source</span>
              </div>
            </Link>
          </div>

          <SidebarLabel>Workspace</SidebarLabel>
          <div className="space-y-0.5">
            <NavItem to="/app/settings/api-keys" icon={Key}      label="API Keys"  />
            <NavItem to="/app/settings"          icon={Settings} label="Settings"  />
          </div>
        </nav>

        {/* User */}
        <div className="px-2 pb-2 pt-1 border-t border-line flex-shrink-0">
          <UserMenu />
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
