import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  User, Building2, Plug, Users, CreditCard, Bell, Key, Shield, FileText, X,
} from 'lucide-react'

const sections = [
  {
    label: 'Account',
    items: [
      { to: '/app/settings/profile',       icon: User,       label: 'My profile',        desc: 'Name, avatar, email'          },
      { to: '/app/settings/security',      icon: Shield,     label: 'Security',           desc: 'Password and sessions'        },
      { to: '/app/settings/notifications', icon: Bell,       label: 'Notifications',      desc: 'Alerts and digests'           },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/app/settings/workspace',     icon: Building2,  label: 'General',            desc: 'Name, slug, timezone'         },
      { to: '/app/settings/members',       icon: Users,      label: 'Members',            desc: 'Invite and manage team'       },
      { to: '/app/settings/billing',       icon: CreditCard, label: 'Billing & plan',     desc: 'Subscription and usage'       },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { to: '/app/settings/sources',       icon: Plug,       label: 'Connected sources',  desc: 'Slack, GitHub, Notion'        },
      { to: '/app/settings/api-keys',      icon: Key,        label: 'API keys',           desc: 'Agent and MCP access'         },
    ],
  },
  {
    label: 'Logs',
    items: [
      { to: '/app/settings/audit-log',     icon: FileText,   label: 'Audit log',          desc: 'All workspace activity'       },
    ],
  },
]

function NavItem({ to, icon: Icon, label, desc }: {
  to: string; icon: React.ElementType; label: string; desc: string
}) {
  const [hov, setHov] = useState(false)

  return (
    <NavLink to={to} end style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 8px', borderRadius: 8, marginBottom: 1,
            background: isActive
              ? 'rgba(91,91,214,0.08)'
              : hov ? 'rgba(0,0,0,0.04)' : 'transparent',
            border: isActive
              ? '1px solid rgba(91,91,214,0.14)'
              : '1px solid transparent',
            cursor: 'pointer', transition: 'all 100ms',
            boxShadow: hov && !isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          {/* Icon box */}
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive
              ? 'rgba(91,91,214,0.13)'
              : hov ? 'rgba(0,0,0,0.06)' : '#F0EFED',
            transition: 'background 100ms',
          }}>
            <Icon size={13} style={{ color: isActive ? '#5B5BD6' : '#6b6b6b' }} />
          </div>
          {/* Text */}
          <div style={{ overflow: 'hidden' }}>
            <p style={{
              margin: 0, fontSize: 12.5, lineHeight: '16px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#1a1a1a' : '#2a2a2a',
            }}>
              {label}
            </p>
            <p style={{ margin: 0, fontSize: 10.5, lineHeight: '14px', color: '#a0a0a0' }}>
              {desc}
            </p>
          </div>
        </div>
      )}
    </NavLink>
  )
}

export default function SettingsLayout() {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* Close button — absolute top-right of the modal card */}
      <button
        onClick={() => navigate('/app')}
        title="Close settings (Esc)"
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          width: 28, height: 28, borderRadius: 7,
          border: '1px solid transparent', background: 'transparent',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#b0b0b0', transition: 'all 100ms',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.background = '#F0EFED'
          b.style.borderColor = '#E8E7E5'
          b.style.color = '#1a1a1a'
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.background = 'transparent'
          b.style.borderColor = 'transparent'
          b.style.color = '#b0b0b0'
        }}
      >
        <X size={14} />
      </button>

      {/* Left sidebar — no scroll, compact */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid #EEEDE9',
        padding: '18px 10px 14px',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        background: '#F9F8F5',
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, color: '#b0b0b0',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          margin: '0 0 12px 6px',
        }}>
          Settings
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map(section => (
            <div key={section.label}>
              <p style={{
                fontSize: 9.5, color: '#cacac8', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                margin: '0 0 4px 6px',
              }}>
                {section.label}
              </p>
              {section.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Content — fills remaining width, scrolls independently */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#FAFAF8' }}>
        <Outlet />
      </div>
    </div>
  )
}
