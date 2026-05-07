import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Github, Plus, RefreshCw, Slack, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { connectorsApi, type Connector } from '@/lib/api'

type SourceId = 'slack' | 'github' | 'notion' | 'linear'
type Status = 'connected' | 'error' | 'disconnected'

const CATALOG: Array<{ id: SourceId; name: string; phaseOne: boolean; Icon: React.ElementType }> = [
  { id: 'slack', name: 'Slack', phaseOne: true, Icon: Slack },
  { id: 'github', name: 'GitHub', phaseOne: true, Icon: Github },
  { id: 'notion', name: 'Notion', phaseOne: false, Icon: AlertCircle },
  { id: 'linear', name: 'Linear', phaseOne: false, Icon: AlertCircle },
]

const statusCfg: Record<Status, { badge: string; dot: string; label: string }> = {
  connected: { badge: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500', label: 'Connected' },
  error: { badge: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500', label: 'Needs attention' },
  disconnected: { badge: 'text-ink-3 bg-subtle border-line', dot: 'bg-ink-4', label: 'Not connected' },
}

function connectorStatus(connector: Connector | undefined): Status {
  if (!connector || !connector.isActive) return 'disconnected'
  if (connector.syncError) return 'error'
  return 'connected'
}

function formatSync(value: string | null | undefined): string {
  if (!value) return 'Never synced'
  return new Date(value).toLocaleString()
}

export default function ConnectedSources() {
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const connectorsQuery = useQuery({
    queryKey: ['connectors'],
    queryFn: connectorsApi.list,
  })

  const bySource = new Map((connectorsQuery.data ?? []).map(c => [c.source.toLowerCase(), c]))

  const syncMutation = useMutation({
    mutationFn: connectorsApi.sync,
    onSuccess: async () => {
      toast.success('Sync queued')
      await queryClient.invalidateQueries({ queryKey: ['connectors'] })
    },
    onError: err => toast.error(err instanceof Error ? err.message : 'Sync failed'),
    onSettled: () => setSyncingId(null),
  })

  const disconnectMutation = useMutation({
    mutationFn: connectorsApi.disconnect,
    onSuccess: async () => {
      toast.success('Source disconnected')
      await queryClient.invalidateQueries({ queryKey: ['connectors'] })
    },
    onError: err => toast.error(err instanceof Error ? err.message : 'Disconnect failed'),
  })

  const connectMutation = useMutation({
    mutationFn: connectorsApi.connect,
    onError: err => toast.error(err instanceof Error ? err.message : 'Connector is not configured'),
  })

  function connect(source: SourceId, phaseOne: boolean) {
    if (!phaseOne) {
      toast.message('This connector is planned for Phase 2')
      return
    }
    if (source === 'slack' || source === 'github') {
      connectMutation.mutate(source)
    }
  }

  return (
    <div className="px-7 py-7 max-w-[720px]">
      <div className="mb-7">
        <h1 className="text-[19px] font-semibold text-ink-1 mb-1">Connected sources</h1>
        <p className="text-[13px] text-ink-3">Manage the systems Dyson can ingest into the memory graph.</p>
      </div>

      {connectorsQuery.isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-danger">
          Failed to load connectors.
        </div>
      )}

      <div className="space-y-2.5">
        {CATALOG.map(({ id, name, phaseOne, Icon }) => {
          const connector = bySource.get(id)
          const status = connectorStatus(connector)
          const cfg = statusCfg[status]
          const isSyncing = syncingId === connector?.id

          return (
            <div key={id} className="rounded-xl border border-line bg-white p-4 hover:border-line-strong hover:shadow-sm transition-all group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all',
                  status === 'disconnected' ? 'bg-subtle border-line opacity-60' : 'bg-white border-line',
                )}>
                  <Icon className="w-5 h-5 text-ink-2" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <span className="text-[13.5px] font-semibold text-ink-1">{name}</span>
                    <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border', cfg.badge)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-3 truncate">
                    {connector?.syncError ?? (phaseOne ? 'Phase 1 connector' : 'Planned for Phase 2')}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'connected' && connector && (
                    <>
                      <div className="text-right mr-1">
                        <p className="text-[10px] text-ink-4">Last sync</p>
                        <p className="text-[11px] font-mono text-ink-3">{formatSync(connector.lastSyncedAt)}</p>
                      </div>
                      <button
                        onClick={() => { setSyncingId(connector.id); syncMutation.mutate(connector.id) }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-primary hover:bg-primary/10 transition-all"
                        title="Sync now"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin text-primary')} />
                      </button>
                      <button
                        onClick={() => disconnectMutation.mutate(connector.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-3 hover:text-danger hover:bg-red-500/[0.08] opacity-0 group-hover:opacity-100 transition-all"
                        title="Disconnect"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {status !== 'connected' && (
                    <button
                      onClick={() => connect(id, phaseOne)}
                      disabled={connectMutation.isPending}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-line text-[12px] text-ink-3 hover:text-ink-1 hover:border-primary/40 hover:bg-primary/[0.06] disabled:opacity-50 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {status === 'error' ? 'Reconnect' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 p-4 rounded-xl border border-line bg-subtle flex items-start gap-3">
        <AlertCircle className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-3 leading-relaxed">
          Slack and GitHub are Phase 1 sources. Private data is only used through tenant-scoped backend retrieval and permission checks.
        </p>
      </div>
    </div>
  )
}
