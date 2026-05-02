import { useState } from 'react'
import { Camera, Check, Loader2 } from 'lucide-react'
import { authApi, usersApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="py-7 border-b border-line last:border-0">
      <div className="mb-5">
        <h3 className="text-[14px] font-semibold text-ink-1">{title}</h3>
        {sub && <p className="text-[12.5px] text-ink-3 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-6 items-start">
      <label className="text-[13px] text-ink-2 pt-2.5">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

function InputField({
  value, onChange, placeholder, type = 'text', readOnly = false,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full h-9 px-3.5 rounded-xl border bg-subtle text-[13px] text-ink-1 placeholder:text-ink-4',
        'outline-none transition-all',
        readOnly
          ? 'border-line text-ink-3 cursor-default'
          : 'border-line focus:border-primary/50 focus:bg-subtle focus:ring-2 focus:ring-primary/10'
      )}
    />
  )
}

export default function Profile() {
  const user     = authApi.getUser()
  const initials = (user?.name ?? 'U').split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

  const [name,        setName]        = useState(user?.name ?? '')
  const [saving,      setSaving]      = useState(false)

  // Change password state
  const [currentPw,  setCurrentPw]   = useState('')
  const [newPw,      setNewPw]       = useState('')
  const [confirmPw,  setConfirmPw]   = useState('')
  const [pwSaving,   setPwSaving]    = useState(false)
  const [pwError,    setPwError]     = useState<string | null>(null)

  async function handleSaveProfile() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await usersApi.updateMe({ name: name.trim() })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save â€” please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPwError(null)
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return }
    if (newPw.length < 8)    { setPwError('Password must be at least 8 characters'); return }

    setPwSaving(true)
    try {
      await authApi.changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      toast.success('Password changed â€” you have been signed out of other devices')
    } catch (err) {
      setPwError(err instanceof ApiError
        ? (err.code === 'INVALID_CREDENTIALS' ? 'Current password is incorrect' : err.message)
        : 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="px-10 py-8 max-w-[680px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-ink-1 mb-1">Profile</h1>
        <p className="text-[13px] text-ink-3">Manage your personal account settings.</p>
      </div>

      <Section title="Avatar">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/40 to-violet-500/40 border border-primary/20 flex items-center justify-center">
              <span className="text-[22px] font-bold text-primary">{initials}</span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-canvas border border-line flex items-center justify-center hover:bg-hover transition-colors">
              <Camera className="w-3 h-3 text-ink-2" />
            </button>
          </div>
          <div>
            <button className="text-[13px] text-ink-2 border border-line px-3 py-1.5 rounded-lg hover:text-ink-1 hover:border-line-strong hover:bg-hover transition-all">
              Upload photo
            </button>
            <p className="text-[11px] text-ink-3 mt-1.5">JPG or PNG, max 2MB</p>
          </div>
        </div>
      </Section>

      <Section title="Personal information">
        <div className="space-y-4">
          <Field label="Full name">
            <InputField value={name} onChange={setName} placeholder="Your name" />
          </Field>
          <Field label="Email">
            <InputField value={user?.email ?? ''} readOnly />
          </Field>
          <Field label="Role">
            <InputField value={user?.role ?? ''} readOnly />
          </Field>
        </div>
        <div className="flex justify-end pt-5">
          <button
            onClick={handleSaveProfile}
            disabled={saving || !name.trim() || name.trim() === user?.name}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
              'bg-primary text-white hover:bg-primary/90 shadow-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save changes
          </button>
        </div>
      </Section>

      <Section title="Password" sub="Use a strong password you don't use elsewhere.">
        <div className="space-y-4">
          <Field label="Current password">
            <InputField type="password" value={currentPw} onChange={setCurrentPw} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
          </Field>
          <Field label="New password">
            <InputField type="password" value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" />
          </Field>
          <Field label="Confirm password">
            <InputField type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repeat new password" />
          </Field>
          {pwError && (
            <p className="text-[12px] text-red-400 text-right">{pwError}</p>
          )}
        </div>
        <div className="flex justify-end pt-5">
          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
              'bg-primary text-white hover:bg-primary/90 shadow-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Change password
          </button>
        </div>
      </Section>

      <Section title="Danger zone">
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
          <div>
            <p className="text-[13px] font-medium text-red-400">Delete account</p>
            <p className="text-[11.5px] text-ink-3 mt-0.5">Permanently delete your account and all data.</p>
          </div>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-[12.5px] text-red-400 hover:bg-red-500/10 transition-all">
            Delete account
          </button>
        </div>
      </Section>
    </div>
  )
}




