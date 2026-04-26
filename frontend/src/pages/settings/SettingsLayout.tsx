import { NavLink, Outlet } from 'react-router-dom'
import { User, Building2, Plug, Users, CreditCard, Bell, Key, Shield, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/app/settings/profile',       icon: User,       label: 'Profile'           },
  { to: '/app/settings/workspace',     icon: Building2,  label: 'Workspace'         },
  { to: '/app/settings/sources',       icon: Plug,       label: 'Connected sources' },
  { to: '/app/settings/members',       icon: Users,      label: 'Team members'      },
  { to: '/app/settings/billing',       icon: CreditCard, label: 'Billing & plan'    },
  { to: '/app/settings/notifications', icon: Bell,       label: 'Notifications'     },
  { to: '/app/settings/api-keys',      icon: Key,        label: 'API keys'          },
  { to: '/app/settings/audit-log',     icon: FileText,   label: 'Audit log'         },
  { to: '/app/settings/security',      icon: Shield,     label: 'Security'          },
]

export default function SettingsLayout() {
  return (
    <div className="flex h-full">
      <div className="w-[200px] flex-shrink-0 border-r border-[#2E2E2E] px-2 py-5">
        <p className="px-3 text-[10px] font-medium text-text-4 uppercase tracking-wider mb-2">Settings</p>
        <nav className="space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end>
              {({ isActive }) => (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-[6px] rounded-md text-[13px] transition-all duration-100',
                  isActive ? 'bg-white/[0.06] text-text-1' : 'text-text-3 hover:text-text-2 hover:bg-white/[0.04]'
                )}>
                  <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-text-2' : 'text-text-4')} />
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto bg-[#141414]">
        <Outlet />
      </div>
    </div>
  )
}
