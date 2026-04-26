import { useState } from 'react'
import { Camera, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="py-7 border-b border-white/[0.06] last:border-0">
      <div className="mb-5">
        <h3 className="text-[14px] font-semibold text-white/85">{title}</h3>
        {sub && <p className="text-[12.5px] text-white/35 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-6 items-start">
      <label className="text-[13px] text-white/50 pt-2.5">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

function Input({ defaultValue, placeholder, type = 'text' }: { defaultValue?: string; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full h-9 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/20 outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10 transition-all"
    />
  )
}

export default function Profile() {
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-10 py-8 max-w-[680px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-white/90 mb-1">Profile</h1>
        <p className="text-[13px] text-white/35">Manage your personal account settings.</p>
      </div>

      <Section title="Avatar">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-violet-500/40 border border-primary/20 flex items-center justify-center">
              <span className="text-[22px] font-bold text-primary">J</span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#131320] border border-white/[0.10] flex items-center justify-center hover:bg-white/[0.07] transition-colors">
              <Camera className="w-3 h-3 text-white/50" />
            </button>
          </div>
          <div>
            <button className="text-[13px] text-white/60 border border-white/[0.08] px-3 py-1.5 rounded-lg hover:text-white hover:border-white/[0.14] hover:bg-white/[0.04] transition-all">
              Upload photo
            </button>
            <p className="text-[11px] text-white/25 mt-1.5">JPG or PNG, max 2MB</p>
          </div>
        </div>
      </Section>

      <Section title="Personal information">
        <div className="space-y-4">
          <Field label="Full name"><Input defaultValue="Jatin Dev" /></Field>
          <Field label="Email"><Input defaultValue="sainijatin3078@gmail.com" type="email" /></Field>
          <Field label="Role"><Input defaultValue="Founder" /></Field>
        </div>
      </Section>

      <Section title="Password" sub="Use a strong password you don't use elsewhere.">
        <div className="space-y-4">
          <Field label="Current password"><Input type="password" placeholder="••••••••" /></Field>
          <Field label="New password"><Input type="password" placeholder="Min. 8 characters" /></Field>
          <Field label="Confirm password"><Input type="password" placeholder="Repeat new password" /></Field>
        </div>
      </Section>

      <Section title="Danger zone">
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
          <div>
            <p className="text-[13px] font-medium text-red-400">Delete account</p>
            <p className="text-[11.5px] text-white/30 mt-0.5">Permanently delete your account and all data.</p>
          </div>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-[12.5px] text-red-400 hover:bg-red-500/10 transition-all">
            Delete account
          </button>
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
            saved
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
          )}
        >
          {saved ? <><Check className="w-4 h-4" />Saved</> : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
