import { useState } from 'react'
import { Check, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-6 items-start py-5 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-[13px] text-white/60">{label}</p>
        {sub && <p className="text-[11.5px] text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

export default function Workspace() {
  const [saved, setSaved] = useState(false)

  return (
    <div className="px-10 py-8 max-w-[680px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-white/90 mb-1">Workspace</h1>
        <p className="text-[13px] text-white/35">Manage your workspace settings and identity.</p>
      </div>

      <Field label="Workspace name" sub="Shown to all team members">
        <input defaultValue="Acme Corp" className="w-full h-9 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] text-white outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all" />
      </Field>

      <Field label="Workspace URL" sub="Your unique Dyson URL">
        <div className="flex items-center h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden focus-within:border-primary/50 transition-all">
          <span className="px-3 text-[12px] text-white/25 border-r border-white/[0.06] h-full flex items-center">dyson.ai/</span>
          <input defaultValue="acme-corp" className="flex-1 px-3 bg-transparent text-[13px] text-white outline-none" />
        </div>
      </Field>

      <Field label="Workspace logo">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <button className="text-[13px] text-white/50 border border-white/[0.08] px-3 py-1.5 rounded-lg hover:text-white hover:border-white/[0.14] hover:bg-white/[0.04] transition-all">
            Upload logo
          </button>
        </div>
      </Field>

      <Field label="Plan" sub="Your current subscription">
        <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <div>
            <p className="text-[13px] font-medium text-white/70">Free plan</p>
            <p className="text-[11px] text-white/30">1 of 5 users · 90-day history</p>
          </div>
          <button className="text-[12px] text-primary hover:text-primary/80 transition-colors">Upgrade →</button>
        </div>
      </Field>

      <div className="mt-6 pt-6 border-t border-white/[0.06]">
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
          <div>
            <p className="text-[13px] font-medium text-red-400">Delete workspace</p>
            <p className="text-[11.5px] text-white/30 mt-0.5">Permanently delete this workspace and all data. Irreversible.</p>
          </div>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-[12.5px] text-red-400 hover:bg-red-500/10 transition-all">
            Delete workspace
          </button>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
            saved ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
          )}
        >
          {saved ? <><Check className="w-4 h-4" />Saved</> : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
