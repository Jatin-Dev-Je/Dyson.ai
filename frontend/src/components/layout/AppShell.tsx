import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Brain, Network, Users, Search, Settings, ChevronDown,
  LogOut, Plus, Bell, LayoutDashboard,
  ChevronRight, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi, tokens } from '@/lib/api'

// ─── Real brand logos ──────────────────────────────────────────────────────

function SlackLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" aria-hidden="true">
      <path d="M19.712 28.14a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h3.853v3.853zM21.59 28.14a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v9.647a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853V28.14z" fill="#E01E5A"/>
      <path d="M25.443 19.712a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v3.853h-3.853zM25.443 21.59a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853h-9.647a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h9.647z" fill="#36C5F0"/>
      <path d="M34.288 25.443a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853h-3.853v-3.853zM32.41 25.443a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853v-9.647a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v9.647z" fill="#2EB67D"/>
      <path d="M28.557 34.288a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853v-3.853h3.853zM28.557 32.41a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h9.647a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853H28.557z" fill="#ECB22E"/>
    </svg>
  )
}

function GitHubLogo({ size = 16, color = '#1a1a1a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
    </svg>
  )
}

function NotionLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.46 1.93 17.4.93c1.59-.13 2-.04 3 .68l4.13 2.91c.69.5.92.65.92 1.2v16.31c0 1.01-.36 1.61-1.64 1.7l-15.04.91c-.97.05-1.43-.09-1.94-.74L3.78 19.09c-.55-.74-.78-1.29-.78-1.94V3.59c0-.83.36-1.52 1.46-1.66z" fill="#fff" stroke="#e0dfdc" strokeWidth=".5"/>
      <path d="M3.34 4.55v13.74c0 .69.36 1.01 1.16 1.01l16.49-1c.83-.05 1.01-.55 1.01-1.15V4.59c0-.6-.23-.92-.74-.87l-17.27 1c-.55.04-.65.32-.65.83Zm15.39 1.6c.09.42 0 .83-.42.88l-.79.16v11.6c-.69.37-1.33.6-1.85.6-.83 0-1.05-.27-1.66-1.04L9.06 11.2v6.86l1.65.37s0 .96-1.34 1.01l-3.69.21c-.11-.21 0-.74.36-.83l.97-.27V8.13l-1.34-.11c-.11-.42.13-1.01.78-1.06l3.97-.27 5.46 8.36V8.05l-1.39-.16c-.11-.51.27-.87.74-.92l3.51-.21Z" fill="#37352F"/>
    </svg>
  )
}

function LinearLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="linear-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5E6AD2"/>
          <stop offset="100%" stopColor="#3F4ABE"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#linear-grad)"/>
      <path d="M16 53 47 84M16 36 64 84M22 24 76 78M37 18 82 63M52 16 84 48M70 19 81 30" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".95"/>
    </svg>
  )
}

// Dyson mark — three connected nodes forming a causal triangle
function DysonMark({ size = 20 }: { size?: number }) {
  const r = Math.max(4, size * 0.22)
  return (
    <span style={{
      width: size, height: size, borderRadius: r,
      background: '#5B5BD6',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 120 120" aria-hidden="true">
        <g stroke="white" strokeWidth="7" strokeLinecap="round" opacity="0.55">
          <line x1="32" y1="40" x2="88" y2="40"/>
          <line x1="32" y1="40" x2="60" y2="86"/>
          <line x1="88" y1="40" x2="60" y2="86"/>
        </g>
        <g fill="white">
          <circle cx="32" cy="40" r="11"/>
          <circle cx="88" cy="40" r="11"/>
          <circle cx="60" cy="86" r="11"/>
        </g>
      </svg>
    </span>
  )
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

// ─── Nav item ──────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, badge, exact = false }: {
  to: string; icon: React.ElementType; label: string
  badge?: number; exact?: boolean
}) {
  const location = useLocation()
  const active = exact
    ? location.pathname === to || location.pathname === to + '/'
    : location.pathname.startsWith(to)

  return (
    <NavLink to={to} end={exact} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 8px', borderRadius: 6,
        background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
        color: active ? '#1a1a1a' : '#6b6b6b',
        fontSize: 13.5, fontWeight: active ? 500 : 400,
        cursor: 'pointer', transition: 'background 80ms',
        userSelect: 'none',
      }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)' }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <Icon size={15} style={{ color: active ? '#1a1a1a' : '#9b9b9b', flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 500, color: '#9b9b9b',
            background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 4,
          }}>{badge}</span>
        )}
      </div>
    </NavLink>
  )
}

// ─── Section label ─────────────────────────────────────────────────────────
function SidebarSection({ label, children, defaultOpen = true }: {
  label: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', border: 'none', background: 'transparent',
          color: '#a0a0a0', fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          cursor: 'pointer', borderRadius: 6, userSelect: 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <ChevronRight size={11} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', color: '#b0b0b0', flexShrink: 0 }} />
        {label}
      </button>
      {open && <div style={{ marginTop: 2 }}>{children}</div>}
    </div>
  )
}

// ─── Source item with real brand logo ──────────────────────────────────────
function SourceItem({ name, logo, connected }: {
  name: string; logo: React.ReactNode; connected: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link to="/app/settings/sources" style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 8px', borderRadius: 6,
          background: hov ? 'rgba(0,0,0,0.04)' : 'transparent',
          cursor: 'pointer', transition: 'background 80ms',
        }}
      >
        {/* Brand logo in a small box */}
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: connected ? 'white' : '#f0efed',
          border: '1px solid #e8e7e5',
          flexShrink: 0, opacity: connected ? 1 : 0.45,
          overflow: 'hidden',
        }}>
          {logo}
        </div>
        <span style={{
          flex: 1, fontSize: 13.5,
          color: connected ? '#6b6b6b' : '#b0b0b0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</span>
        {connected
          ? <span style={{ width: 6, height: 6, borderRadius: 99, background: '#16A34A', flexShrink: 0 }} />
          : hov && <span style={{ fontSize: 10, color: '#9b9b9b', flexShrink: 0 }}>Connect</span>
        }
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', border: 'none', borderRadius: 6,
          background: open ? 'rgba(0,0,0,0.04)' : 'transparent',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <DysonMark size={22} />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1a1a1a', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Dyson
        </span>
        <ChevronDown size={13} style={{ color: '#b0b0b0', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 8, right: 8, marginTop: 4, zIndex: 50,
          background: 'white', border: '1px solid #E8E7E5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 4,
        }}>
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #F0EFED', marginBottom: 4 }}>
            <p style={{ fontSize: 10.5, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, margin: 0, marginBottom: 6 }}>{user?.email}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DysonMark size={20} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Dyson</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#5B5BD6', background: 'rgba(91,91,214,0.08)', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>Free</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              fontSize: 13, color: '#6b6b6b', border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 6, textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <Plus size={13} /> Create or join a workspace
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 8px', border: 'none', borderRadius: 6,
          background: open ? 'rgba(0,0,0,0.04)' : 'transparent',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 99, flexShrink: 0,
          background: 'linear-gradient(135deg, #5B5BD6, #8a8aff)',
          color: 'white', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{initials || 'U'}</div>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <ChevronDown size={13} style={{ color: '#b0b0b0', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4, zIndex: 50,
          background: 'white', border: '1px solid #E8E7E5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 4,
        }}>
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #F0EFED', marginBottom: 4 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{name}</p>
            {email && <p style={{ fontSize: 11, color: '#9b9b9b', margin: 0, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>}
          </div>
          <button
            onClick={() => { navigate('/app/settings/profile'); setOpen(false) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
              fontSize: 13, color: '#6b6b6b', border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 6, textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F1'; (e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b6b6b' }}
          >
            <Settings size={13} style={{ color: '#9b9b9b', flexShrink: 0 }} />
            Settings
          </button>
          <div style={{ borderTop: '1px solid #F0EFED', marginTop: 4, paddingTop: 4 }}>
            <button onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                fontSize: 13, color: '#DC2626', border: 'none', background: 'transparent',
                cursor: 'pointer', borderRadius: 6, textAlign: 'left',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <LogOut size={13} style={{ flexShrink: 0 }} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Topbar ─────────────────────────────────────────────────────────────────
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
    <header style={{
      height: 44, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: '1px solid #E8E7E5',
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
        <span style={{ color: '#9b9b9b' }}>Dyson</span>
        <span style={{ color: '#d0d0d0', margin: '0 2px' }}>/</span>
        <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => navigate('/app/recall')}
          style={{
            height: 28, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6,
            background: '#5B5BD6', color: 'white', border: 'none', borderRadius: 6,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Brain size={13} /> Recall
        </button>
        <button style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', borderRadius: 6, background: 'transparent', color: '#9b9b9b', cursor: 'pointer',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F1'; (e.currentTarget as HTMLButtonElement).style.color = '#1a1a1a' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9b9b9b' }}
        >
          <Bell size={15} />
        </button>
      </div>
    </header>
  )
}

// ─── App shell ─────────────────────────────────────────────────────────────
export default function AppShell() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const isSettings = location.pathname.startsWith('/app/settings')

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFAF8', overflow: 'hidden', position: 'relative' }}>

      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: '#F7F6F3', borderRight: '1px solid #E8E7E5',
        overflow: 'hidden', userSelect: 'none',
      }}>

        {/* Workspace */}
        <div style={{ padding: '12px 8px 4px' }}>
          <WorkspaceSwitcher />
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 8px 4px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[
            { to: '/app/search', icon: Search, label: 'Search', shortcut: '⌘K' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                  color: '#6b6b6b', fontSize: 13.5, transition: 'background 80ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.color = '#1a1a1a' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = '#6b6b6b' }}
              >
                <item.icon size={15} style={{ color: '#9b9b9b', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && <kbd style={{ fontSize: 10, color: '#c0c0c0', fontFamily: 'monospace' }}>{item.shortcut}</kbd>}
              </div>
            </Link>
          ))}
        </div>

        <div style={{ margin: '4px 12px', borderTop: '1px solid #E8E7E5' }} />

        {/* Main nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <NavItem to="/app"                   icon={LayoutDashboard} label="Home"           exact />
          <NavItem to="/app/recall"            icon={Brain}           label="Recall"         />
          <NavItem to="/app/decisions"         icon={Network}         label="Memory Graph"   badge={8} />
          <NavItem to="/app/onboarding-packs"  icon={Users}           label="Team Briefings" />

          <div style={{ height: 8 }} />

          {/* Sources with real logos */}
          <SidebarSection label="Sources">
            <SourceItem name="Slack"  logo={<SlackLogo size={13} />}  connected={true}  />
            <SourceItem name="GitHub" logo={<GitHubLogo size={13} />} connected={true}  />
            <SourceItem name="Notion" logo={<NotionLogo size={13} />} connected={false} />
            <SourceItem name="Linear" logo={<LinearLogo size={13} />} connected={false} />
            <Link to="/app/settings/sources" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 13.5, color: '#b0b0b0', transition: 'background 80ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.color = '#6b6b6b' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = '#b0b0b0' }}
              >
                <Plus size={13} style={{ color: '#c0c0c0' }} /> Add source
              </div>
            </Link>
          </SidebarSection>
        </nav>

        {/* Bottom */}
        <div style={{ padding: '8px', borderTop: '1px solid #E8E7E5', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px',
            borderRadius: 6, border: 'none', background: 'transparent',
            fontSize: 13.5, color: '#6b6b6b', cursor: 'pointer', textAlign: 'left',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <Trash2 size={15} style={{ color: '#9b9b9b', flexShrink: 0 }} /> Trash
          </button>
          <UserMenu />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
          {!isSettings && <Outlet />}
        </main>
      </div>

      {/* Settings modal overlay */}
      {isSettings && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => navigate('/app')}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(2px)',
              cursor: 'pointer',
            }}
          />
          {/* Modal card */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 101,
            width: 'min(92vw, 980px)', height: 'min(88vh, 720px)',
            background: 'white', borderRadius: 14,
            display: 'flex', overflow: 'hidden',
            boxShadow: '0 28px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
          }}>
            <Outlet />
          </div>
        </>
      )}
    </div>
  )
}
