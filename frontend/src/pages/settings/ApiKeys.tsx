import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, Copy, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiKeysApi, type ApiKey } from '@/lib/api'

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

export default function ApiKeys() {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [scope, setScope] = useState<'read' | 'write'>('read')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  const keysQuery = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeysApi.list,
  })

  const createMutation = useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: async (key: ApiKey) => {
      setNewKey(key.rawKey ?? null)
      setCreating(false)
      setNewName('')
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: err => toast.error(err instanceof Error ? err.message : 'Could not create API key'),
  })

  const revokeMutation = useMutation({
    mutationFn: apiKeysApi.revoke,
    onSuccess: async () => {
      toast.success('API key revoked')
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: err => toast.error(err instanceof Error ? err.message : 'Could not revoke API key'),
  })

  function createKey() {
    if (!newName.trim()) return
    createMutation.mutate({ name: newName.trim(), scopes: scope === 'write' ? ['read', 'write'] : ['read'] })
  }

  async function copyKey(value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="px-7 py-7 max-w-[680px]">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[19px] font-semibold text-ink-1 mb-1">API keys</h1>
          <p className="text-[13px] text-ink-3">Keys for MCP clients and agent integrations.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> New key
        </button>
      </div>

      {newKey && (
        <div className="mb-5 p-4 rounded-xl border border-green-200 bg-green-50">
          <div className="flex items-start gap-2 mb-3">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-green-700">API key created</p>
              <p className="text-[11.5px] text-green-700/80 mt-0.5">Copy it now. It will not be shown again.</p>
            </div>
            <button onClick={() => setNewKey(null)} className="text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-green-200 font-mono text-[12px] text-ink-2">
            <span className="flex-1 truncate">{newKey}</span>
            <button onClick={() => void copyKey(newKey)} className="text-ink-3 hover:text-primary transition-colors flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {creating && (
        <div className="mb-5 rounded-xl border border-line bg-white p-4">
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium text-ink-2">Key name</span>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createKey()}
                placeholder="Production MCP client"
                className="h-10 px-3.5 rounded-xl border border-line bg-subtle text-[13px] text-ink-1 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium text-ink-2">Scope</span>
              <select
                value={scope}
                onChange={e => setScope(e.target.value as 'read' | 'write')}
                className="h-10 px-3.5 rounded-xl border border-line bg-white text-[13px] text-ink-2 outline-none"
              >
                <option value="read">Read only</option>
                <option value="write">Read and write</option>
              </select>
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="h-9 px-4 rounded-lg border border-line text-[13px] text-ink-3 hover:bg-subtle">
                Cancel
              </button>
              <button
                onClick={createKey}
                disabled={!newName.trim() || createMutation.isPending}
                className="h-9 px-4 rounded-lg bg-primary text-[13px] font-medium text-white disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {(keysQuery.data ?? []).map(key => (
          <div key={key.id} className="rounded-xl border border-line bg-white p-4 group hover:border-line-strong hover:shadow-sm transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13.5px] font-medium text-ink-1">{key.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-ink-3">Created {formatDate(key.createdAt)}</span>
                  <span className="text-ink-4 text-[10px]">·</span>
                  <span className="text-[11px] font-mono text-ink-3">Last used {formatDate(key.lastUsedAt)}</span>
                </div>
              </div>
              <button
                onClick={() => revokeMutation.mutate(key.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-4 hover:text-danger hover:bg-red-500/[0.08] opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-subtle border border-line font-mono text-[12px]">
              <span className="text-ink-3 flex-1 truncate">{key.keyPrefix}••••••••••••••••</span>
              <span className="text-[11px] text-ink-3">{key.scopes.join(', ')}</span>
            </div>
          </div>
        ))}

        {!keysQuery.isLoading && (keysQuery.data ?? []).length === 0 && (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-[13px] text-ink-3">
            No API keys yet.
          </div>
        )}
      </div>

      <div className="mt-5 p-4 rounded-xl border border-line bg-subtle flex items-start gap-3">
        <AlertCircle className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-3 leading-relaxed">
          API keys grant agent access to company memory. Never place them in frontend code or public repositories.
        </p>
      </div>
    </div>
  )
}
