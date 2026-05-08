import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, X, ChevronRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

type Conflict = {
  id:          string
  decisionId:  string
  itemId:      string
  itemType:    'belief' | 'principle' | 'decision'
  reason:      string
  severity:    'critical' | 'high' | 'medium' | 'low'
  confidence:  number
  status:      'open' | 'resolved' | 'dismissed'
  createdAt:   string
}

const SEVERITY_CONFIG = {
  critical: { badge: 'text-danger bg-red-50 border-red-200',    dot: 'bg-danger',  label: 'Critical' },
  high:     { badge: 'text-danger bg-red-50 border-red-100',    dot: 'bg-red-400', label: 'High'     },
  medium:   { badge: 'text-citation bg-citation/10 border-citation/20', dot: 'bg-citation', label: 'Medium' },
  low:      { badge: 'text-ink-2 bg-subtle border-line',        dot: 'bg-ink-4',   label: 'Low'      },
}

const STATUS_FILTERS = [
  { label: 'Open',     value: 'open'     },
  { label: 'Resolved', value: 'resolved' },
  { label: 'All',      value: ''         },
]

function ConflictCard({
  conflict,
  onResolve,
  onDismiss,
}: {
  conflict:  Conflict
  onResolve: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEVERITY_CONFIG[conflict.severity] ?? SEVERITY_CONFIG.medium

  return (
    <div className={cn(
      'rounded-xl border bg-white overflow-hidden transition-all',
      conflict.severity === 'critical' ? 'border-red-200' :
      conflict.severity === 'high'     ? 'border-red-100' :
      'border-line',
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-subtle/40 transition-colors group"
      >
        {/* Severity dot */}
        <div className="flex-shrink-0 mt-1">
          <span className={cn('w-2 h-2 rounded-full inline-block', cfg.dot)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', cfg.badge)}>
              {cfg.label}
            </span>
            <span className="text-[11px] text-ink-4 font-mono">
              {(conflict.confidence * 100).toFixed(0)}% confidence
            </span>
            <span className="text-[11px] text-ink-4 bg-subtle border border-line px-1.5 py-0.5 rounded font-mono">
              {conflict.itemType}
            </span>
          </div>
          <p className="text-[13px] text-ink-1 leading-snug">{conflict.reason}</p>
        </div>

        <ChevronRight className={cn(
          'w-4 h-4 text-ink-4 flex-shrink-0 mt-0.5 transition-transform',
          expanded && 'rotate-90',
        )} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-line bg-subtle/30">
          <div className="pt-3 pb-2 text-[12.5px] text-ink-3 leading-relaxed">
            The detected decision conflicts with an existing {conflict.itemType} in your belief graph.
            Review and decide whether to accept the conflict, resolve it, or dismiss it as intended.
          </div>
          {conflict.status === 'open' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onResolve(conflict.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-[12px] font-medium text-white hover:bg-primary/90 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </button>
              <button
                onClick={() => onDismiss(conflict.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[12px] text-ink-2 hover:border-line-strong hover:bg-subtle transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          )}
          {conflict.status !== 'open' && (
            <span className={cn(
              'inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full border',
              conflict.status === 'resolved'
                ? 'text-success bg-success/8 border-success/20'
                : 'text-ink-3 bg-subtle border-line',
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                conflict.status === 'resolved' ? 'bg-success' : 'bg-ink-4',
              )} />
              {conflict.status === 'resolved' ? 'Resolved' : 'Dismissed'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function Conflicts() {
  const [statusFilter, setStatusFilter] = useState('open')
  const queryClient = useQueryClient()

  const conflictsQuery = useQuery({
    queryKey: ['conflicts', statusFilter],
    queryFn:  () => apiFetch<{ data: Conflict[] }>(
      `/conflicts${statusFilter ? `?status=${statusFilter}` : ''}`,
    ),
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/conflicts/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution: 'Acknowledged and accepted by reviewer' }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conflicts'] })
      toast.success('Conflict resolved')
    },
    onError: () => toast.error('Failed to resolve conflict'),
  })

  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/conflicts/${id}/dismiss`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conflicts'] })
      toast.success('Conflict dismissed')
    },
    onError: () => toast.error('Failed to dismiss conflict'),
  })

  const conflicts = conflictsQuery.data?.data ?? []
  const openCount = conflicts.filter(c => c.status === 'open').length
  const criticalCount = conflicts.filter(c => c.severity === 'critical' && c.status === 'open').length

  return (
    <div className="px-8 py-7 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-[22px] font-semibold text-ink-1 -tracking-wide">Decision Conflicts</h1>
            {openCount > 0 && (
              <span className={cn(
                'text-[11px] font-bold px-2 py-0.5 rounded-full border',
                criticalCount > 0
                  ? 'text-danger bg-red-50 border-red-200'
                  : 'text-citation bg-citation/10 border-citation/20',
              )}>
                {openCount} open
              </span>
            )}
          </div>
          <p className="text-[13px] text-ink-3">
            Decisions that contradict existing beliefs or principles — detected automatically.
          </p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1.5 mb-5">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-[11.5px] font-medium transition-all border',
              statusFilter === f.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-line text-ink-3 hover:border-line-strong hover:text-ink-2',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Conflicts list */}
      {conflictsQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-xl" />
          ))}
        </div>
      ) : conflicts.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-12 text-center shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-subtle border border-line flex items-center justify-center mx-auto mb-3">
            <Zap className="w-4 h-4 text-ink-4" />
          </div>
          <p className="text-[13.5px] font-medium text-ink-2 mb-1">
            {statusFilter === 'open' ? 'No open conflicts' : 'No conflicts found'}
          </p>
          <p className="text-[12.5px] text-ink-4">
            The conflict detection agent checks every new decision against your belief graph.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map(c => (
            <ConflictCard
              key={c.id}
              conflict={c}
              onResolve={id => resolveMutation.mutate(id)}
              onDismiss={id => dismissMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
