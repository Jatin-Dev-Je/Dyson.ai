import { useState } from 'react'
import { Check, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-6 py-5 border-b border-line last:border-0">
      <div className="w-40 flex-shrink-0">
        <p className="text-[13px] text-ink-2">{label}</p>
        {sub && <p className="text-[11px] text-ink-3 mt-0.5">{sub}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default function Workspace() {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    toast.success('Workspace settings saved')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="px-7 py-7 max-w-[640px]">

      <div className="mb-7">
        <h1 className="text-[19px] font-semibold text-ink-1 mb-1">Workspace</h1>
        <p className="text-[13px] text-ink-3">Manage your workspace identity and settings.</p>
      </div>

      <Field label="Workspace name" sub="Shown to all team members">
        <input
          defaultValue="Acme Corp"
          className="w-full h-9 px-3.5 rounded-xl border border-line bg-white text-[13px] text-ink-1 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </Field>

      <Field label="Workspace URL" sub="Your unique Dyson URL">
        <div className="flex items-center h-9 rounded-xl border border-line bg-white overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <span className="px-3 text-[12px] text-ink-3 border-r border-line h-full flex items-center bg-subtle">
            dyson.ai/
          </span>
          <input
            defaultValue="acme-corp"
            className="flex-1 px-3 bg-transparent text-[13px] text-ink-1 outline-none"
          />
        </div>
      </Field>

      <Field label="Workspace logo">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/[0.08] border border-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <button className="text-[13px] text-ink-2 border border-line px-3.5 py-1.5 rounded-lg hover:text-ink-1 hover:border-line-strong hover:bg-subtle transition-all">
              Upload logo
            </button>
            <p className="text-[11px] text-ink-3 mt-1">PNG or SVG, max 1 MB</p>
          </div>
        </div>
      </Field>

      <Field label="Plan" sub="Your current subscription">
        <div className="flex items-center justify-between p-3 rounded-xl border border-line bg-subtle">
          <div>
            <p className="text-[13px] font-medium text-ink-2">Free plan</p>
            <p className="text-[11px] text-ink-3 mt-0.5">1 of 5 users · 90-day history</p>
          </div>
          <button className="text-[12px] text-primary font-medium hover:text-primary/80 transition-colors">
            Upgrade →
          </button>
        </div>
      </Field>

      <div className="flex justify-between items-center mt-7 pt-6 border-t border-line">
        {/* Danger zone */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.03] flex-1 mr-6">
          <div className="flex-1">
            <p className="text-[13px] font-medium text-danger">Delete workspace</p>
            <p className="text-[11px] text-ink-3 mt-0.5">Permanently delete this workspace. Irreversible.</p>
          </div>
          <button className="px-3.5 py-1.5 rounded-xl border border-red-500/30 text-[12px] text-danger hover:bg-red-500/10 transition-all flex-shrink-0">
            Delete
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-medium transition-all flex-shrink-0',
            saved
              ? 'bg-green-500/[0.12] border border-green-500/25 text-green-600'
              : 'bg-primary text-white hover:bg-primary/90 shadow-sm disabled:opacity-60',
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
