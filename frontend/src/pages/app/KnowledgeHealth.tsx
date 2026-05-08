import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, RefreshCw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { Link } from 'react-router-dom'

type HealthReport = {
  id:               string
  overallScore:     number
  freshnessScore:   number
  connectivityScore:number
  coverageScore:    number
  conflictScore:    number
  atRiskNodes:      { title: string; riskReason: string }[]
  staleDecisions:   { title: string; occurredAt: string }[]
  recommendations:  string[]
  scoredAt:         string
}

type HistoryPoint = {
  id:           string
  overallScore: number
  scoredAt:     string
}

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size / 2) - 8
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const color = score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#F0EFED" strokeWidth="6"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[15px] font-bold text-ink-1" style={{ color }}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>
      <span className="text-[11px] text-ink-3 text-center">{label}</span>
    </div>
  )
}

function TrendSparkline({ history }: { history: HistoryPoint[] }) {
  if (history.length < 2) return null
  const max   = 100
  const w     = 120
  const h     = 32
  const pts   = history.slice(-8).map((p, i, arr) => {
    const x = (i / (arr.length - 1)) * w
    const y = h - (p.overallScore / max) * h
    return `${x},${y}`
  }).join(' ')

  const lastScore = history[history.length - 1]?.overallScore ?? 0
  const prevScore = history[history.length - 2]?.overallScore ?? 0
  const delta     = lastScore - prevScore
  const color     = delta >= 0 ? '#16A34A' : '#DC2626'

  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline fill="none" stroke="#E8E7E5" strokeWidth="1.5" points={pts} />
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>
      <span className={cn('text-[12px] font-medium', delta >= 0 ? 'text-success' : 'text-danger')}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(0)} pts
      </span>
    </div>
  )
}

function AtRiskCard({ node }: { node: { title: string; riskReason: string } }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-100 bg-red-50/50">
      <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-1 truncate">{node.title}</p>
        <p className="text-[12px] text-ink-3 mt-0.5">{node.riskReason}</p>
      </div>
    </div>
  )
}

function StaleCard({ decision }: { decision: { title: string; occurredAt: string } }) {
  const age = Math.floor((Date.now() - new Date(decision.occurredAt).getTime()) / 86_400_000)
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-subtle/50 hover:border-line-strong transition-colors">
      <Clock className="w-3.5 h-3.5 text-citation flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink-1 truncate">{decision.title}</p>
        <p className="text-[11.5px] text-ink-4 mt-0.5">{age} days ago · no recent activity</p>
      </div>
    </div>
  )
}

export default function KnowledgeHealth() {
  const reportQuery = useQuery({
    queryKey: ['knowledge-health'],
    queryFn:  () => apiFetch<{ data: HealthReport | null }>('/health/knowledge'),
  })

  const historyQuery = useQuery({
    queryKey: ['knowledge-health-history'],
    queryFn:  () => apiFetch<{ data: HistoryPoint[] }>('/health/knowledge/history?limit=12'),
  })

  const report  = reportQuery.data?.data
  const history = historyQuery.data?.data ?? []

  if (reportQuery.isLoading) {
    return (
      <div className="px-8 py-7 max-w-[1000px] mx-auto">
        <div className="h-6 shimmer rounded w-48 mb-3" />
        <div className="h-4 shimmer rounded w-72 mb-8" />
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 shimmer rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="px-8 py-7 max-w-[1000px] mx-auto">
        <h1 className="text-[22px] font-semibold text-ink-1 -tracking-wide mb-1">Knowledge Health</h1>
        <p className="text-[13px] text-ink-3 mb-10">No health report yet.</p>
        <div className="rounded-xl border border-line bg-subtle/50 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-line flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[14px] font-medium text-ink-1 mb-1">Run your first health scan</p>
          <p className="text-[13px] text-ink-3 max-w-xs mx-auto">
            The Knowledge Health agent runs weekly. You can trigger it manually from the agent settings.
          </p>
        </div>
      </div>
    )
  }

  const scoreColor = (s: number) => s >= 75 ? 'text-success' : s >= 50 ? 'text-citation' : 'text-danger'
  const scoredAgo  = Math.floor((Date.now() - new Date(report.scoredAt).getTime()) / 86_400_000)

  return (
    <div className="px-8 py-7 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1 -tracking-wide mb-1">Knowledge Health</h1>
          <p className="text-[13px] text-ink-3">
            Last scanned {scoredAgo === 0 ? 'today' : `${scoredAgo}d ago`} — weekly automatic scan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendSparkline history={history} />
          <div className={cn('text-[28px] font-bold -tracking-wide', scoreColor(report.overallScore))}>
            {report.overallScore.toFixed(0)}
            <span className="text-[16px] font-medium text-ink-4">/100</span>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-5 gap-4 mb-8 p-5 rounded-xl border border-line bg-white shadow-sm">
        <ScoreRing score={report.overallScore}     label="Overall"       size={72} />
        <ScoreRing score={report.freshnessScore}   label="Freshness"     size={72} />
        <ScoreRing score={report.connectivityScore} label="Connectivity" size={72} />
        <ScoreRing score={report.coverageScore}    label="Coverage"      size={72} />
        <ScoreRing score={report.conflictScore}    label="Conflicts"     size={72} />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">

        {/* At-risk nodes */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h2 className="text-[13.5px] font-semibold text-ink-1">Knowledge at risk</h2>
            {report.atRiskNodes.length > 0 && (
              <span className="ml-auto text-[11px] font-semibold text-danger bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                {report.atRiskNodes.length}
              </span>
            )}
          </div>
          {report.atRiskNodes.length === 0 ? (
            <div className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="w-4 h-4" /> No at-risk knowledge
            </div>
          ) : (
            <div className="space-y-2">
              {report.atRiskNodes.slice(0, 4).map((n, i) => (
                <AtRiskCard key={i} node={n} />
              ))}
            </div>
          )}
        </div>

        {/* Stale decisions */}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-citation" />
            <h2 className="text-[13.5px] font-semibold text-ink-1">Decisions needing review</h2>
            {report.staleDecisions.length > 0 && (
              <span className="ml-auto text-[11px] font-semibold text-citation bg-citation/10 border border-citation/20 px-2 py-0.5 rounded-full">
                {report.staleDecisions.length}
              </span>
            )}
          </div>
          {report.staleDecisions.length === 0 ? (
            <div className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="w-4 h-4" /> All decisions are fresh
            </div>
          ) : (
            <div className="space-y-2">
              {report.staleDecisions.slice(0, 4).map((d, i) => (
                <StaleCard key={i} decision={d} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-[13.5px] font-semibold text-ink-1">Recommendations</h2>
          </div>
          <div className="space-y-2.5">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 text-[13px] text-ink-2 leading-relaxed">
                <span className="w-5 h-5 rounded bg-primary/8 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
