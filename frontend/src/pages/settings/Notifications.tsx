import { useState } from 'react'
import { cn } from '@/lib/utils'

type Setting = { id: string; label: string; sub: string; email: boolean; slack: boolean }

const defaults: Setting[] = [
  { id: 'new_decision',  label: 'New decision detected',         sub: 'When Dyson detects a new decision in your stack',         email: true,  slack: true  },
  { id: 'weekly_digest', label: 'Weekly decision digest',        sub: 'Summary of decisions made in the past week',              email: true,  slack: false },
  { id: 'low_confidence',label: 'Low confidence answers',        sub: 'When a WHY Engine query returns confidence below 72%',    email: false, slack: true  },
  { id: 'new_member',    label: 'New team member joined',        sub: 'When someone accepts your invite',                        email: true,  slack: false },
  { id: 'onboarding',    label: 'Onboarding pack generated',     sub: 'When a new context pack is ready',                       email: true,  slack: true  },
  { id: 'source_error',  label: 'Source connection error',       sub: 'When a connected source loses access',                    email: true,  slack: true  },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0',
        on ? 'bg-primary' : 'bg-white/[0.10]'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
        on ? 'left-[18px]' : 'left-0.5'
      )} />
    </button>
  )
}

export default function Notifications() {
  const [settings, setSettings] = useState(defaults)

  function update(id: string, field: 'email' | 'slack', val: boolean) {
    setSettings(v => v.map(s => s.id === id ? { ...s, [field]: val } : s))
  }

  return (
    <div className="px-10 py-8 max-w-[680px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-white/90 mb-1">Notifications</h1>
        <p className="text-[13px] text-white/35">Choose how and when Dyson notifies you.</p>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-[#0F0F17] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_72px_72px] gap-4 px-5 py-3 border-b border-white/[0.06]">
          <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider">Notification</span>
          <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider text-center">Email</span>
          <span className="text-[10px] font-mono text-white/25 uppercase tracking-wider text-center">Slack</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {settings.map(s => (
            <div key={s.id} className="grid grid-cols-[1fr_72px_72px] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div>
                <p className="text-[13px] text-white/70">{s.label}</p>
                <p className="text-[11.5px] text-white/30 mt-0.5">{s.sub}</p>
              </div>
              <div className="flex justify-center">
                <Toggle on={s.email} onChange={v => update(s.id, 'email', v)} />
              </div>
              <div className="flex justify-center">
                <Toggle on={s.slack} onChange={v => update(s.id, 'slack', v)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
