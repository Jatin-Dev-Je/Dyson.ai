import { useState } from 'react'
import { Shield, Smartphone, Monitor, LogOut, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const sessions = [
  { id: '1', device: 'Chrome on Windows 11', location: 'New Delhi, India', current: true,  lastActive: 'Now'          },
  { id: '2', device: 'Safari on iPhone 15',  location: 'New Delhi, India', current: false, lastActive: '2 hours ago'   },
  { id: '3', device: 'Chrome on MacBook',    location: 'Mumbai, India',    current: false, lastActive: '3 days ago'    },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn('relative w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0', on ? 'bg-primary' : 'bg-white/[0.10]')}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

export default function Security() {
  const [twoFA, setTwoFA] = useState(false)
  const [sessionAlert, setSessionAlert] = useState(true)

  return (
    <div className="px-10 py-8 max-w-[680px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-white/90 mb-1">Security</h1>
        <p className="text-[13px] text-white/35">Protect your account and manage active sessions.</p>
      </div>

      {/* 2FA */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0F0F17] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-[13.5px] font-medium text-white/80">Two-factor authentication</p>
              <p className="text-[12px] text-white/35">Add an extra layer of security to your account</p>
            </div>
          </div>
          <Toggle on={twoFA} onChange={setTwoFA} />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-[#0F0F17] p-5 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white/40" />
            </div>
            <div>
              <p className="text-[13.5px] font-medium text-white/80">New session alerts</p>
              <p className="text-[12px] text-white/35">Email me when a new device signs in</p>
            </div>
          </div>
          <Toggle on={sessionAlert} onChange={setSessionAlert} />
        </div>
      </div>

      {/* Active sessions */}
      <div>
        <h2 className="text-[14px] font-semibold text-white/80 mb-3">Active sessions</h2>
        <div className="rounded-xl border border-white/[0.07] bg-[#0F0F17] overflow-hidden">
          {sessions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Monitor className="w-3.5 h-3.5 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] text-white/70 truncate">{s.device}</p>
                  {s.current && <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full flex-shrink-0">Current</span>}
                </div>
                <p className="text-[11px] text-white/25">{s.location} · {s.lastActive}</p>
              </div>
              {!s.current && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/20">
                  <LogOut className="w-3.5 h-3.5" />
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="mt-3 text-[12.5px] text-red-400/70 hover:text-red-400 transition-colors">
          Sign out all other sessions
        </button>
      </div>
    </div>
  )
}
