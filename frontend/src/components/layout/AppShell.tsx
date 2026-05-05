import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Brain, Network, Users, Search, Settings, ChevronDown,
  LogOut, User, CreditCard, Plus, Bell, Key, Trash2,
  ChevronRight, Hash, GitBranch, MessageSquare, Plug,
  FileText, Shield,
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

// ─── Nav item — Notion style ───────────────────────────────────────────────
function NavItem({
  to, icon: Icon, label, badge, exact = false, indent = 0,
}: {
  to: string; icon?: React.ElementType | undefined; label: string
  badge?: number; exact?: boolean; indent?: number
}) {
  const location = useLocation()
  const active = exact
    ? location.pathname === to || location.pathname === to + '/'
    : location.pathname.startsWith(to)

  return (
    <NavLink to={to} end={exact}>
      <div
        style={{ paddingLeft: `${8 + indent * 12}px` }}
        className={cn(
          'flex items-center gap-1.5 pr-2 py-[5px] rounded-md text-[13.5px] cursor-pointer select-none',
          'transition-colors duration-75 group',
          active
            ? 'bg-[rgba(0,0,0,0.06)] text-[#1a1a1a] font-medium'
            : 'text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1a1a1a]'
        )}
      >
        {Icon && (
          <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-[#1a1a1a]' : 'text-[#9b9b9b]')} />
        )}
        <span className="flex-1 truncate leading-snug">{label}</span>
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
function SidebarSection({
  label, children, defaultOpen = true,
}: {
  label: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-medium text-[#a0a0a0] hover:text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.03)] transition-colors select-none group"
      >
        <ChevronRight className={cn('w-3 h-3 transition-transform duration-150 flex-shrink-0', open && 'rotate-90')} />
        <span className="tracking-[0.04em] uppercase">{label}</span>
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  )
}

// ─── Source item ───────────────────────────────────────────────────────────
function SourceItem({ name, dot, connected }: { name: string; dot: string; connected: boolean }) {
  return (
    <Link to="/app/settings/sources">
      <div className="flex items-center gap-1.5 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot, !connected && 'opacity-30')} />
        <span className={cn('flex-1 text-[13.5px] truncate', connected ? 'text-[#6b6b6b]' : 'text-[#b0b0b0]')}>
          {name}
        </span>
        {!connected && (
          <span className="text-[10px] text-[#c0c0c0] opacity-0 group-hover:opacity-100 transition-opacity">
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
  const name    = user?.name ?? 'Workspace'
  const initial = name[0]?.toUpperCase() ?? 'W'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group"
      >
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-[11px] font-bold text-white">{initial}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13.5px] font-semibold text-[#1a1a1a] leading-none truncate">Dyson</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#b0b0b0] flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[#E8E7E5] rounded-xl shadow-lg py-1.5 animate-fade-in">
          <div className="px-3 py-2 border-b border-[#F0EFED] mb-1">
            <p className="text-[11px] text-[#9b9b9b] uppercase tracking-[0.05em] font-medium mb-1">{user?.email}</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{initial}</span>
              </div>
              <span className="text-[13px] font-medium text-[#1a1a1a]">Dyson</span>
              <span className="ml-auto text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">Free</span>
            </div>
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-[6px] text-[13px] text-[#6b6b6b] hover:bg-[rgba(0,0,0,0.04)] transition-colors text-left">
            <Plus className="w-3.5 h-3.5" />
            Create or join a workspace
          </button>
        </div>
      )}
    </div>
  )
}

// ─── User / settings button ────────────────────────────────────────────────
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
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm">
          {initials || 'U'}
        </div>
        <p className="flex-1 text-left text-[13.5px] text-[#1a1a1a] font-medium truncate leading-none">{name}</p>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#b0b0b0] flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-[#E8E7E5] rounded-xl shadow-lg py-1.5 animate-fade-in">
          <div className="px-3 py-2 border-b border-[#F0EFED] mb-1">
            <p className="text-[12px] font-semibold text-[#1a1a1a]">{name}</p>
            {email && <p className="text-[11px] text-[#9b9b9b] truncate mt-0.5">{email}</p>}
          </div>
          {[
            { icon: User,       label: 'My profile',  path: '/app/settings/profile' },
            { icon: Settings,   label: 'Settings',    path: '/app/settings' },
            { icon: CreditCard, label: 'Plans & billing', path: '/app/settings/billing' },
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
              className="w-full flex items-center gap-2.5 px-3 py-[6px] text-[13px] text-[#e5484d] hover:bg-red-50 transition-colors text-left">
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
  const crumbs: [string, string][] = [
    ['/app/recall',           'Recall'],
    ['/app/decisions',        'Memory Graph'],
    ['/app/onboarding-packs', 'Team Briefings'],
    ['/app/search',           'Search'],
    ['/app/settings',         'Settings'],
  ]
  const current = crumbs.find(([k]) => location.pathname.startsWith(k))
  const title   = current?.[1] ?? 'Home'

  return (
    <header className="h-11 flex-shrink-0 flex items-center justify-between px-4 border-b border-[#E8E7E5] bg-white/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-1 text-[12.5px]">
        <span className="text-[#9b9b9b]">Dyson</span>
        <span className="text-[#d0d0d0] mx-0.5">/</span>
        <span className="text-[#1a1a1a] font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-1">
        <Link to="/app/recall">
          <button className="h-7 px-3 flex items-center gap-1.5 rounded-md bg-primary text-[12px] font-medium text-white hover:bg-primary-hover transition-colors">
            <Brain className="w-3.5 h-3.5" />
            Recall
          </button>
        </Link>
        <button className="w-7 h-7 flex items-center justify-center rounded-md text-[#9b9b9b] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1a1a1a] transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

// ─── Shell ─────────────────────────────────────────────────────────────────
export default function AppShell() {
  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col bg-[#F7F6F3] border-r border-[#E8E7E5] select-none overflow-hidden">

        {/* Workspace */}
        <div className="px-2 pt-3 pb-1 flex-shrink-0">
          <WorkspaceSwitcher />
        </div>

        {/* Quick actions */}
        <div className="px-2 pb-1 flex-shrink-0 space-y-0.5">
          <Link to="/app/search">
            <div className="flex items-center gap-2 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
              <Search className="w-[15px] h-[15px] text-[#9b9b9b]" />
              <span className="flex-1 text-[13.5px] text-[#6b6b6b] group-hover:text-[#1a1a1a] transition-colors">Search</span>
              <kbd className="text-[10px] text-[#c0c0c0] font-mono hidden group-hover:block">⌘K</kbd>
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

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">

          {/* Primary pages */}
          <NavItem to="/app"                  icon={undefined}  label="🏠 Home"             exact />
          <NavItem to="/app/recall"           icon={Brain}      label="Recall"               />
          <NavItem to="/app/decisions"        icon={Network}    label="Memory Graph"         badge={8} />
          <NavItem to="/app/onboarding-packs" icon={Users}      label="Team Briefings"       />

          <div className="my-2" />

          {/* Sources */}
          <SidebarSection label="Sources">
            <SourceItem name="Slack"  dot="bg-[#E01E5A]" connected={true}  />
            <SourceItem name="GitHub" dot="bg-[#656D76]" connected={true}  />
            <SourceItem name="Notion" dot="bg-[#37352F]" connected={false} />
            <SourceItem name="Linear" dot="bg-[#5E6AD2]" connected={false} />
            <Link to="/app/settings/sources">
              <div className="flex items-center gap-1.5 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
                <Plus className="w-[14px] h-[14px] text-[#c0c0c0] group-hover:text-[#9b9b9b]" />
                <span className="text-[13.5px] text-[#b0b0b0] group-hover:text-[#6b6b6b] transition-colors">Add source</span>
              </div>
            </Link>
          </SidebarSection>

          <div className="my-2" />

          {/* Workspace */}
          <SidebarSection label="Workspace" defaultOpen={false}>
            <NavItem to="/app/settings/members"   icon={Users}    label="Members"    />
            <NavItem to="/app/settings/api-keys"  icon={Key}      label="API Keys"   />
            <NavItem to="/app/settings/audit-log" icon={FileText} label="Audit log"  />
            <NavItem to="/app/settings/security"  icon={Shield}   label="Security"   />
          </SidebarSection>
        </nav>

        {/* Bottom */}
        <div className="px-2 py-2 border-t border-[#E8E7E5] space-y-0.5 flex-shrink-0">
          <Link to="/app/settings">
            <div className="flex items-center gap-2 px-2 py-[5px] rounded-md hover:bg-[rgba(0,0,0,0.04)] transition-colors group cursor-pointer">
              <Trash2 className="w-[15px] h-[15px] text-[#9b9b9b]" />
              <span className="text-[13.5px] text-[#6b6b6b] group-hover:text-[#1a1a1a] transition-colors">Trash</span>
            </div>
          </Link>
          <UserMenu />
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
