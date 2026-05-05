import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Brain, Network, Users, Search, Settings,
  ChevronDown, ChevronLeft, ChevronRight, LogOut,
  Plus, Bell, LayoutDashboard,
} from 'lucide-react'
import { authApi, tokens } from '@/lib/api'

// ─── Context ──────────────────────────────────────────────────────────────────
const SidebarCtx = createContext({ collapsed: false })

// ─── Brand logos ──────────────────────────────────────────────────────────────

function SlackLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" aria-hidden="true">
      <path d="M19.712 28.14a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h3.853v3.853zM21.59 28.14a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v9.647a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853V28.14z" fill="#E01E5A"/>
      <path d="M25.443 19.712a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v3.853h-3.853zM25.443 21.59a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853h-9.647a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h9.647z" fill="#36C5F0"/>
      <path d="M34.288 25.443a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853h-3.853v-3.853zM32.41 25.443a3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853v-9.647a3.856 3.856 0 0 1 3.853-3.853 3.856 3.856 0 0 1 3.853 3.853v9.647z" fill="#2EB67D"/>
      <path d="M28.557 34.288a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853 3.856 3.856 0 0 1-3.853-3.853v-3.853h3.853zM28.557 32.41a3.856 3.856 0 0 1-3.853-3.853 3.856 3.856 0 0 1 3.853-3.853h9.647a3.856 3.856 0 0 1 3.853 3.853 3.856 3.856 0 0 1-3.853 3.853H28.557z" fill="#ECB22E"/>
    </svg>
  )
}

function GitHubLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#24292f" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
    </svg>
  )
}

function NotionLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.46 1.93 17.4.93c1.59-.13 2-.04 3 .68l4.13 2.91c.69.5.92.65.92 1.2v16.31c0 1.01-.36 1.61-1.64 1.7l-15.04.91c-.97.05-1.43-.09-1.94-.74L3.78 19.09c-.55-.74-.78-1.29-.78-1.94V3.59c0-.83.36-1.52 1.46-1.66z" fill="#fff" stroke="#e0dfdc" strokeWidth=".5"/>
      <path d="M3.34 4.55v13.74c0 .69.36 1.01 1.16 1.01l16.49-1c.83-.05 1.01-.55 1.01-1.15V4.59c0-.6-.23-.92-.74-.87l-17.27 1c-.55.04-.65.32-.65.83Zm15.39 1.6c.09.42 0 .83-.42.88l-.79.16v11.6c-.69.37-1.33.6-1.85.6-.83 0-1.05-.27-1.66-1.04L9.06 11.2v6.86l1.65.37s0 .96-1.34 1.01l-3.69.21c-.11-.21 0-.74.36-.83l.97-.27V8.13l-1.34-.11c-.11-.42.13-1.01.78-1.06l3.97-.27 5.46 8.36V8.05l-1.39-.16c-.11-.51.27-.87.74-.92l3.51-.21Z" fill="#37352F"/>
    </svg>
  )
}

function LinearLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="lg-main" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5E6AD2"/>
          <stop offset="100%" stopColor="#3F4ABE"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#lg-main)"/>
      <path d="M16 53 47 84M16 36 64 84M22 24 76 78M37 18 82 63M52 16 84 48M70 19 81 30" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".95"/>
    </svg>
  )
}

function DysonMark({ size = 22 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size,
      borderRadius: Math.max(4, size * 0.22),
      background: '#5B5BD6',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 120 120" aria-hidden="true">
        <g stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.5">
          <line x1="32" y1="40" x2="88" y2="40"/>
          <line x1="32" y1="40" x2="60" y2="86"/>
          <line x1="88" y1="40" x2="60" y2="86"/>
        </g>
        <circle cx="32" cy="40" r="12" fill="white"/>
        <circle cx="88" cy="40" r="12" fill="white"/>
        <circle cx="60" cy="86" r="12" fill="white"/>
      </svg>
    </span>
  )
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ to, icon: Icon, label, badge, statusBadge, exact = false }: {
  to: string; icon: React.ElementType; label: string
  badge?: number; statusBadge?: { text: string; green?: boolean }; exact?: boolean
}) {
  const { collapsed } = useContext(SidebarCtx)
  const location = useLocation()
  const active = exact
    ? location.pathname === to || location.pathname === to + '/'
    : location.pathname.startsWith(to)
  const [hov, setHov] = useState(false)

  return (
    <NavLink to={to} end={exact} style={{ textDecoration: 'none' }} title={collapsed ? label : undefined}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 9,
          padding: collapsed ? 0 : '6px 10px',
          width: collapsed ? 36 : 'auto',
          height: collapsed ? 36 : 'auto',
          margin: collapsed ? '0 auto 2px' : '0 0 1px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 8,
          background: active
            ? 'rgba(91,91,214,0.09)'
            : hov ? 'rgba(0,0,0,0.04)' : 'transparent',
          boxShadow: !collapsed && active ? 'inset 2px 0 0 #5B5BD6' : 'none',
          cursor: 'pointer', transition: 'background 80ms, box-shadow 80ms',
          userSelect: 'none',
        }}
      >
        <Icon
          size={15}
          style={{
            color: active ? '#5B5BD6' : hov ? '#1a1a1a' : '#6b6b6b',
            flexShrink: 0,
            transition: 'color 80ms',
          }}
        />
        {!collapsed && (
          <>
            <span style={{
              flex: 1,
              fontSize: 13.5, fontWeight: active ? 500 : 400,
              color: active ? '#111' : '#2d2d2d',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
            {badge !== undefined && badge > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 600, lineHeight: '16px',
                color: '#5B5BD6', background: 'rgba(91,91,214,0.10)',
                padding: '0 6px', borderRadius: 99,
              }}>
                {badge}
              </span>
            )}
            {statusBadge && (
              <span style={{
                fontSize: 9.5, fontWeight: 600, lineHeight: '16px',
                color: statusBadge.green ? '#16A34A' : '#5B5BD6',
                background: statusBadge.green ? 'rgba(22,163,74,0.09)' : 'rgba(91,91,214,0.09)',
                padding: '0 6px', borderRadius: 99,
                letterSpacing: '0.01em',
              }}>
                {statusBadge.text}
              </span>
            )}
          </>
        )}
      </div>
    </NavLink>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { collapsed } = useContext(SidebarCtx)
  if (collapsed) return <div style={{ height: 16 }} />
  return (
    <p style={{
      margin: '18px 0 5px 10px', padding: 0,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: '#a0a0a0',
      userSelect: 'none',
    }}>
      {label}
    </p>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function SidebarDivider() {
  return <div style={{ margin: '6px 10px', borderTop: '1px solid #ECEAE6' }} />
}

// ─── Source item ──────────────────────────────────────────────────────────────

function SourceItem({ name, logo, connected }: {
  name: string; logo: React.ReactNode; connected: boolean
}) {
  const { collapsed } = useContext(SidebarCtx)
  const [hov, setHov] = useState(false)

  return (
    <Link to="/app/settings/sources" style={{ textDecoration: 'none' }} title={collapsed ? name : undefined}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 9,
          padding: collapsed ? 0 : '5px 10px',
          width: collapsed ? 36 : 'auto',
          height: collapsed ? 36 : 'auto',
          margin: collapsed ? '0 auto 2px' : '0 0 1px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 8,
          background: hov ? 'rgba(0,0,0,0.04)' : 'transparent',
          cursor: 'pointer', transition: 'background 80ms',
        }}
      >
        {/* Logo box */}
        <div style={{
          width: 19, height: 19, borderRadius: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: connected ? 'white' : '#f0efec',
          border: '1px solid #e2e0db',
          flexShrink: 0,
          opacity: connected ? 1 : 0.55,
          overflow: 'hidden',
          boxShadow: connected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        }}>
          {logo}
        </div>
        {!collapsed && (
          <>
            <span style={{
              flex: 1, fontSize: 13.5, letterSpacing: '-0.01em', lineHeight: 1,
              color: connected ? '#2d2d2d' : '#a0a0a0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
            {connected
              ? <span style={{ width: 6, height: 6, borderRadius: 99, background: '#16A34A', flexShrink: 0 }} />
              : hov
                ? <span style={{ fontSize: 10.5, color: '#5B5BD6', fontWeight: 500, flexShrink: 0 }}>Connect</span>
                : null
            }
          </>
        )}
      </div>
    </Link>
  )
}

// ─── Workspace switcher ───────────────────────────────────────────────────────

function WorkspaceSwitcher() {
  const { collapsed } = useContext(SidebarCtx)
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  const user = authApi.getUser()

  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
        <button
          title="Dyson workspace"
          onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6 }}
        >
          <DysonMark size={26} />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '7px 9px', border: 'none', borderRadius: 8,
          background: open ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'pointer', transition: 'background 80ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <DysonMark size={22} />
        <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.02em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Dyson
          </p>
          <p style={{ margin: 0, fontSize: 10.5, color: '#9a9a9a', lineHeight: 1.2, marginTop: 1 }}>
            Free plan
          </p>
        </div>
        <ChevronDown size={13} style={{ color: '#bbb', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 140ms', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 6, right: 6, marginTop: 4, zIndex: 60,
          background: 'white', border: '1px solid #E8E7E5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 4,
        }}>
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #F0EFED', marginBottom: 4 }}>
            <p style={{ fontSize: 10.5, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0, marginBottom: 6 }}>
              {user?.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DysonMark size={20} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Dyson</span>
              <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#5B5BD6', background: 'rgba(91,91,214,0.09)', padding: '2px 7px', borderRadius: 99, fontWeight: 600, letterSpacing: '0.02em' }}>FREE</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              fontSize: 13, color: '#555', border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 7, textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F1'; (e.currentTarget as HTMLButtonElement).style.color = '#111' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
          >
            <Plus size={13} style={{ color: '#999' }} /> Create or join workspace
          </button>
        </div>
      )}
    </div>
  )
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const { collapsed } = useContext(SidebarCtx)
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

  const avatar = (
    <div style={{
      width: 26, height: 26, borderRadius: 99, flexShrink: 0,
      background: 'linear-gradient(135deg, #5B5BD6 0%, #8b8bef 100%)',
      color: 'white', fontSize: 10.5, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      letterSpacing: '0.02em',
    }}>
      {initials || 'U'}
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={collapsed ? name : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 9,
          padding: collapsed ? 0 : '5px 9px',
          width: collapsed ? 36 : '100%',
          height: collapsed ? 36 : 'auto',
          margin: collapsed ? '0 auto' : '0',
          justifyContent: collapsed ? 'center' : 'flex-start',
          border: 'none', borderRadius: 8,
          background: open ? 'rgba(0,0,0,0.05)' : 'transparent',
          cursor: 'pointer', transition: 'background 80ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        {avatar}
        {!collapsed && (
          <>
            <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1a1a1a', letterSpacing: '-0.01em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </p>
            </div>
            <ChevronDown size={12} style={{ color: '#bbb', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 140ms', flexShrink: 0 }} />
          </>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: collapsed ? 0 : '100%',
          left: collapsed ? 44 : 4,
          right: collapsed ? 'auto' : 4,
          width: collapsed ? 210 : 'auto',
          marginBottom: collapsed ? 0 : 4,
          zIndex: 60,
          background: 'white', border: '1px solid #E8E7E5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 4,
        }}>
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid #F0EFED', marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0, letterSpacing: '-0.01em' }}>{name}</p>
            {email && <p style={{ fontSize: 11, color: '#aaa', margin: 0, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>}
          </div>
          <button
            onClick={() => { navigate('/app/settings/profile'); setOpen(false) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px',
              fontSize: 13, color: '#444', border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 7, textAlign: 'left', letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F1'; (e.currentTarget as HTMLButtonElement).style.color = '#111' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#444' }}
          >
            <Settings size={13} style={{ color: '#9b9b9b', flexShrink: 0 }} />
            Settings
          </button>
          <div style={{ borderTop: '1px solid #F0EFED', marginTop: 4, paddingTop: 4 }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px',
                fontSize: 13, color: '#DC2626', border: 'none', background: 'transparent',
                cursor: 'pointer', borderRadius: 7, textAlign: 'left',
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

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [hovBell, setHovBell] = useState(false)

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
      borderBottom: '1px solid #ECEAE6',
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
        <span style={{ color: '#bbb', fontWeight: 400 }}>Dyson</span>
        <span style={{ color: '#ddd' }}>/</span>
        <span style={{ color: '#111', fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => navigate('/app/recall')}
          style={{
            height: 30, padding: '0 13px',
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#5B5BD6', color: 'white',
            border: 'none', borderRadius: 7,
            fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.01em',
            cursor: 'pointer', transition: 'background 80ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#4f4fc4' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5B5BD6' }}
        >
          <Brain size={13} /> Recall
        </button>
        <button
          onMouseEnter={() => setHovBell(true)}
          onMouseLeave={() => setHovBell(false)}
          style={{
            width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 7,
            background: hovBell ? 'rgba(0,0,0,0.05)' : 'transparent',
            color: hovBell ? '#1a1a1a' : '#9b9b9b', cursor: 'pointer',
            transition: 'all 80ms',
          }}
        >
          <Bell size={15} />
        </button>
      </div>
    </header>
  )
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function AppShell() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const isSettings = location.pathname.startsWith('/app/settings')
  const [collapsed, setCollapsed] = useState(false)

  const W = collapsed ? 56 : 242

  return (
    <SidebarCtx.Provider value={{ collapsed }}>
      <div style={{ display: 'flex', height: '100vh', background: '#FAFAF8', overflow: 'hidden', position: 'relative' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: W, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: '#F8F7F4',
          borderRight: '1px solid #E8E6E1',
          overflow: 'hidden', userSelect: 'none',
          transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        }}>

          {/* Workspace */}
          <div style={{ padding: collapsed ? '6px 10px 4px' : '10px 8px 6px', flexShrink: 0 }}>
            <WorkspaceSwitcher />
          </div>

          {/* Search */}
          <div style={{ padding: collapsed ? '0 10px 4px' : '0 8px 4px', flexShrink: 0 }}>
            {collapsed ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Link to="/app/search" title="Search" style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    <Search size={15} style={{ color: '#6b6b6b' }} />
                  </div>
                </Link>
              </div>
            ) : (
              <Link to="/app/search" style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <Search size={14} style={{ color: '#7a7a7a', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: '#3d3d3d', letterSpacing: '-0.01em', lineHeight: 1 }}>Search</span>
                  <kbd style={{
                    fontSize: 10, color: '#c0c0c0', fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.05)', padding: '2px 5px',
                    borderRadius: 4, lineHeight: 1.4,
                  }}>⌘K</kbd>
                </div>
              </Link>
            )}
          </div>

          <SidebarDivider />

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div style={{ padding: collapsed ? '2px 10px' : '2px 8px', flexShrink: 0 }}>
            <NavItem to="/app"                  icon={LayoutDashboard} label="Home"           exact />
            <NavItem to="/app/recall"           icon={Brain}           label="Recall"         />
            <NavItem to="/app/decisions"        icon={Network}         label="Memory Graph"   badge={8} />
            <NavItem to="/app/onboarding-packs" icon={Users}           label="Team Briefings" />
          </div>

          {/* ── Sources ─────────────────────────────────────────────────── */}
          <div style={{ padding: collapsed ? '0 10px' : '0 8px', flexShrink: 0 }}>
            <SectionLabel label="Sources" />
            <SourceItem name="Slack"  logo={<SlackLogo  size={12} />} connected={true}  />
            <SourceItem name="GitHub" logo={<GitHubLogo size={12} />} connected={true}  />
            <SourceItem name="Notion" logo={<NotionLogo size={12} />} connected={false} />
            <SourceItem name="Linear" logo={<LinearLogo size={12} />} connected={false} />
            {!collapsed && (
              <Link to="/app/settings/sources" style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13.5, color: '#b0b0b0', transition: 'all 80ms',
                    letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.color = '#5B5BD6' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = '#b0b0b0' }}
                >
                  <Plus size={13} style={{ color: 'currentColor' }} /> Add source
                </div>
              </Link>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ── Bottom bar ──────────────────────────────────────────────── */}
          <div style={{
            padding: collapsed ? '8px 10px 12px' : '6px 8px 10px',
            borderTop: '1px solid #E8E6E1',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <UserMenu />
              </div>
              {!collapsed && (
                <button
                  onClick={() => setCollapsed(true)}
                  title="Collapse sidebar"
                  style={{
                    width: 26, height: 26, borderRadius: 7,
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#c8c8c8', flexShrink: 0, transition: 'all 80ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#c8c8c8' }}
                >
                  <ChevronLeft size={14} />
                </button>
              )}
            </div>

            {collapsed && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                <button
                  onClick={() => setCollapsed(false)}
                  title="Expand sidebar"
                  style={{
                    width: 32, height: 26, borderRadius: 7,
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#c8c8c8', transition: 'all 80ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#c8c8c8' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
            {!isSettings && <Outlet />}
          </main>
        </div>

        {/* ── Settings overlay ──────────────────────────────────────────────── */}
        {isSettings && (
          <>
            <div
              onClick={() => navigate('/app')}
              style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(2px)',
                cursor: 'pointer',
              }}
            />
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
    </SidebarCtx.Provider>
  )
}
