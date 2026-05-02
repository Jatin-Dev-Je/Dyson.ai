import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, Check, Trash2, Mail, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'member' | 'viewer'
type Member = { id: string; name: string; email: string; role: Role; joined: string; initials: string; color: string }

const members: Member[] = [
  { id: '1', name: 'Jatin Dev',    email: 'sainijatin3078@gmail.com', role: 'admin',  joined: 'Apr 2026', initials: 'JD', color: 'from-primary/40 to-violet-500/40' },
  { id: '2', name: 'Alex Kumar',   email: 'alex@acme.com',            role: 'member', joined: 'Apr 2026', initials: 'AK', color: 'from-green-500/30 to-emerald-500/30' },
  { id: '3', name: 'Sarah Chen',   email: 'sarah@acme.com',           role: 'admin',  joined: 'Apr 2026', initials: 'SC', color: 'from-orange-500/30 to-amber-500/30' },
  { id: '4', name: 'Priya Nair',   email: 'priya@acme.com',           role: 'member', joined: 'Apr 2026', initials: 'PN', color: 'from-pink-500/30 to-rose-500/30' },
]

const roleConfig: Record<Role, { label: string; badge: string }> = {
  admin:  { label: 'Admin',  badge: 'text-primary/80 bg-primary/10 border-primary/20' },
  member: { label: 'Member', badge: 'text-ink-2 bg-subtle border-line' },
  viewer: { label: 'Viewer', badge: 'text-ink-3 bg-subtle border-line' },
}

function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all', roleConfig[value].badge, 'hover:opacity-80')}
      >
        {roleConfig[value].label}
        <ChevronDown className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-20 w-32 rounded-xl border border-line bg-canvas shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-1.5"
          >
            {(['admin', 'member', 'viewer'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => { onChange(r); setOpen(false) }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] text-ink-2 hover:text-ink-1 hover:bg-hover transition-colors"
              >
                {roleConfig[r].label}
                {r === value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TeamMembers() {
  const [people, setPeople]   = useState(members)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  function updateRole(id: string, role: Role) {
    setPeople(v => v.map(m => m.id === id ? { ...m, role } : m))
  }

  function remove(id: string) {
    setPeople(v => v.filter(m => m.id !== id))
  }

  return (
    <div className="px-10 py-8 max-w-[720px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[20px] font-semibold text-ink-1 mb-1">Team members</h1>
          <p className="text-[13px] text-ink-3">{people.length} members Â· Free plan (5 max)</p>
        </div>
        <button
          onClick={() => setInviting(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Invite member
        </button>
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {inviting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setInviting(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-line bg-canvas p-7 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[16px] font-semibold text-ink-1">Invite team member</h3>
                <button onClick={() => setInviting(false)} className="text-ink-3 hover:text-ink-2 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Email address</label>
                  <input
                    autoFocus
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full h-10 px-3.5 rounded-xl border border-line bg-subtle text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Role</label>
                  <select className="w-full h-10 px-3.5 rounded-xl border border-line bg-canvas text-[13px] text-ink-2 outline-none focus:border-primary/50 appearance-none">
                    <option>Member</option>
                    <option>Admin</option>
                    <option>Viewer</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => setInviting(false)}
                className="w-full h-10 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                Send invite
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members list */}
      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-line">
          <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Member</span>
          <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Role</span>
          <span className="w-8" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {people.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-4 hover:bg-subtle transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br border border-line flex items-center justify-center flex-shrink-0', m.color)}>
                  <span className="text-[10px] font-bold text-ink-1">{m.initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-1 truncate">{m.name}</p>
                  <p className="text-[11px] text-ink-3 truncate">{m.email}</p>
                </div>
              </div>
              <RoleSelect value={m.role} onChange={r => updateRole(m.id, r)} />
              <button
                onClick={() => remove(m.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-4 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}




