import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { authApi, usersApi, workspaceApi, type AuthUser } from '@/lib/api'

type Role = 'admin' | 'member' | 'viewer'

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

function initials(user: AuthUser): string {
  return user.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || user.email.slice(0, 2).toUpperCase()
}

export default function TeamMembers() {
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const queryClient = useQueryClient()
  const currentUser = authApi.getUser()

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ limit: 50 }),
  })

  const workspaceQuery = useQuery({
    queryKey: ['workspace'],
    queryFn: workspaceApi.get,
  })

  const inviteMutation = useMutation({
    mutationFn: usersApi.invite,
    onSuccess: async () => {
      toast.success('Invite sent')
      setInviteEmail('')
      setInviting(false)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: err => toast.error(err instanceof Error ? err.message : 'Invite failed'),
  })

  const removeMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: async () => {
      toast.success('Member removed')
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: err => toast.error(err instanceof Error ? err.message : 'Could not remove member'),
  })

  function sendInvite() {
    if (!inviteEmail.trim()) return
    const input: { email: string; role: Role; workspaceName?: string } = {
      email: inviteEmail.trim(),
      role: inviteRole,
    }
    if (workspaceQuery.data?.name) input.workspaceName = workspaceQuery.data.name
    inviteMutation.mutate(input)
  }

  const people = usersQuery.data?.users ?? []

  return (
    <div className="px-7 py-7 max-w-[680px]">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[19px] font-semibold text-ink-1 mb-1">Team members</h1>
          <p className="text-[13px] text-ink-3">{people.length} active member{people.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => setInviting(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Invite
        </button>
      </div>

      {inviting && (
        <div className="mb-5 rounded-xl border border-line bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-ink-1">Invite team member</h3>
            <button onClick={() => setInviting(false)} className="text-ink-3 hover:text-ink-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <input
              autoFocus
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="colleague@company.com"
              className="h-10 px-3.5 rounded-xl border border-line bg-subtle text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              className="h-10 px-3.5 rounded-xl border border-line bg-white text-[13px] text-ink-2 outline-none"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={sendInvite}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
              className="h-10 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Mail className="w-3.5 h-3.5" /> Send invite
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-line bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-line bg-subtle">
          <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Member</span>
          <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Role</span>
          <span className="w-8" />
        </div>

        {people.map((member, index) => (
          <div
            key={member.id}
            className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-4 hover:bg-subtle transition-colors group ${index < people.length - 1 ? 'border-b border-line' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-primary">{initials(member)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-1 truncate">{member.name}</p>
                <p className="text-[11px] text-ink-3 truncate">{member.email}</p>
              </div>
            </div>
            <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border border-line bg-subtle text-ink-2">
              {ROLE_LABEL[member.role]}
            </span>
            <button
              disabled={member.id === currentUser?.id}
              onClick={() => removeMutation.mutate(member.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-4 hover:text-danger hover:bg-red-500/[0.08] disabled:opacity-20 disabled:hover:bg-transparent opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {!usersQuery.isLoading && people.length === 0 && (
          <div className="px-5 py-10 text-center text-[13px] text-ink-3">No members found.</div>
        )}
      </div>
    </div>
  )
}
