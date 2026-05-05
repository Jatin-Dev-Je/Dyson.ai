import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Brain, Network, Users, TrendingUp, ChevronRight, MessageSquare, GitPullRequest, Zap, Check } from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { authApi } from '@/lib/api'

// ─── Data (replace with real API calls) ──────────────────────────────────
const STATS = [
  { label: 'Total memories',     value: '1,247', sub: '+24 today',    icon: Brain,       bg: 'rgba(91,91,214,0.10)',  fg: '#5B5BD6'  },
  { label: 'Decisions detected', value: '89',    sub: '+3 this week', icon: Network,     bg: 'rgba(217,119,6,0.10)', fg: '#D97706'  },
  { label: 'Team members',       value: '12',    sub: '3 active today',icon: Users,      bg: '#DCFCE7',              fg: '#16A34A'  },
  { label: 'Recalls this week',  value: '34',    sub: '↑ 12% vs last',icon: TrendingUp,  bg: '#EDE9FE',              fg: '#7C3AED'  },
]

const RECALLS = [
  { id: 1, query: 'What do we know about our auth system?',     confidence: 0.91, sources: 5, time: '2h ago' },
  { id: 2, query: 'What happened during the Q3 incident?',       confidence: 0.87, sources: 4, time: '5h ago' },
  { id: 3, query: 'What constraints exist on payments service?', confidence: 0.74, sources: 3, time: '1d ago' },
]

const MEMORIES = [
  { id: 'm1', title: 'Moved to cursor-based pagination',  team: 'Backend',  source: 'slack'   as const, time: '2d ago' },
  { id: 'm2', title: 'Deprecated v1 API by June 2026',    team: 'Platform', source: 'github'  as const, time: '3d ago' },
  { id: 'm3', title: 'Adopted pgvector over Pinecone',    team: 'Infra',    source: 'notion'  as const, time: '5d ago' },
  { id: 'm4', title: 'JWT auth replaces session tokens',  team: 'Backend',  source: 'meeting' as const, time: '1w ago' },
  { id: 'm5', title: 'Retry budget for ingestion jobs',   team: 'Infra',    source: 'github'  as const, time: '1w ago' },
]

const ACTIVITY = [
  { type: 'slack'  as const, text: '#incidents — 3 messages linked to open decisions', time: '10m ago' },
  { type: 'github' as const, text: 'PR #4721 — 2 related past decisions detected',     time: '42m ago' },
  { type: 'slack'  as const, text: '#backend — recall answered @alex query',           time: '1h ago' },
  { type: 'notion' as const, text: 'RFC: payments-v2 — linked to 4 key memories',     time: '3h ago' },
]

const SUGGESTIONS = [
  'What do we know about our auth system?',
  'Why did we choose pgvector?',
  'What happened in Q3?',
]

// ─── Recall box ────────────────────────────────────────────────────────────
function RecallBox({ onAsk }: { onAsk: (q: string) => void }) {
  const [q,     setQ]     = useState('')
  const [focus, setFocus] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) onAsk(q)
  }

  return (
    <form onSubmit={submit}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: focus || q ? 'white' : '#FAFAF8',
        border: `1px solid ${focus ? 'rgba(91,91,214,0.45)' : '#E8E7E5'}`,
        borderRadius: 12, padding: '12px 16px',
        boxShadow: focus ? '0 0 0 3px rgba(91,91,214,0.10)' : 'none',
        transition: 'all 120ms ease',
      }}>
        <Brain size={18} style={{ color: '#9b9b9b', flexShrink: 0 }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          placeholder="Ask anything about what your team knows…"
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, color: '#1a1a1a', outline: 'none' }}
        />
        {q.trim()
          ? <button type="submit" style={{ height: 28, padding: '0 12px', background: '#5B5BD6', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Ask</button>
          : <kbd style={{ fontSize: 11, color: '#c0c0c0', fontFamily: 'monospace' }}>↵</kbd>
        }
      </div>
    </form>
  )
}

// ─── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, bg, fg, value, label, sub }: typeof STATS[number]) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'white', border: '1px solid #E8E7E5', borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 11.5, color: '#9b9b9b', margin: 0, marginTop: 4 }}>{label}</p>
      </div>
      <p style={{ fontSize: 11, color: '#b0b0b0', margin: 0, flexShrink: 0 }}>{sub}</p>
    </div>
  )
}

// ─── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 11.5, fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
        {children}
      </h2>
      {action}
    </div>
  )
}

// ─── Card wrapper ───────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E8E7E5', borderRadius: 12, overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate()
  const user      = authApi.getUser()
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const emoji     = hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙'
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 32px 60px' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 30, marginBottom: 4 }}>{emoji}</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: 15, color: '#9b9b9b', margin: 0, marginTop: 6 }}>
          Your team has captured <span style={{ color: '#1a1a1a', fontWeight: 500 }}>1,247 memories</span> — here's what's happening.
        </p>
      </div>

      {/* Recall box */}
      <div style={{ marginBottom: 28 }}>
        <RecallBox onAsk={q => navigate(`/app/recall?q=${encodeURIComponent(q)}`)} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => navigate(`/app/recall?q=${encodeURIComponent(s)}`)}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F0EFED'; (e.currentTarget as HTMLButtonElement).style.color = '#575553'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F4F1'; (e.currentTarget as HTMLButtonElement).style.color = '#9b9b9b'; }}
              style={{
                fontSize: 12, color: '#9b9b9b',
                background: '#F5F4F1', border: '1px solid #E8E7E5',
                padding: '4px 12px', borderRadius: 99, cursor: 'pointer', transition: 'all 120ms',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {STATS.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Main grid: 2/3 + 1/3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28 }}>

        {/* Left column */}
        <div>
          {/* Recent recalls */}
          <SectionLabel action={
            <Link to="/app/recall" style={{ fontSize: 12.5, color: '#9b9b9b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#5B5BD6')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9b9b9b')}>
              Open Recall <ChevronRight size={13} />
            </Link>
          }>
            Recent recalls
          </SectionLabel>

          <Card style={{ marginBottom: 28 }}>
            {RECALLS.map((r, i) => (
              <div key={r.id} onClick={() => navigate(`/app/recall?q=${encodeURIComponent(r.query)}`)}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  borderBottom: i < RECALLS.length - 1 ? '1px solid #F5F4F1' : 'none',
                  cursor: 'pointer', transition: 'background 80ms',
                }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(91,91,214,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={13} style={{ color: '#5B5BD6' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.query}</p>
                  <p style={{ fontSize: 11.5, color: '#9b9b9b', margin: 0, marginTop: 2 }}>{r.sources} sources · {r.time}</p>
                </div>
                <ConfidenceBadge confidence={r.confidence} showBar />
                <ChevronRight size={14} style={{ color: '#d0d0d0' }} />
              </div>
            ))}
            <div onClick={() => navigate('/app/recall')}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ padding: '11px 16px', cursor: 'pointer', borderTop: '1px solid #F5F4F1', transition: 'background 80ms' }}>
              <span style={{ fontSize: 13, color: '#9b9b9b' }}>Ask a new question…</span>
            </div>
          </Card>

          {/* Key memories */}
          <SectionLabel action={
            <Link to="/app/decisions" style={{ fontSize: 12.5, color: '#9b9b9b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              View all <ChevronRight size={13} />
            </Link>
          }>
            Key memories
          </SectionLabel>
          <Card>
            {MEMORIES.map((m, i) => (
              <div key={m.id} onClick={() => navigate('/app/decisions')}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                  borderBottom: i < MEMORIES.length - 1 ? '1px solid #F5F4F1' : 'none',
                  cursor: 'pointer', transition: 'background 80ms',
                }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#D97706', flexShrink: 0 }} />
                <p style={{ flex: 1, fontSize: 13.5, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                <span style={{ fontSize: 11.5, color: '#b0b0b0', flexShrink: 0 }}>{m.team}</span>
                <SourcePill source={m.source} />
                <span style={{ fontSize: 11.5, color: '#b0b0b0', flexShrink: 0, width: 48, textAlign: 'right' }}>{m.time}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Right column */}
        <div>
          {/* Activity */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 11.5, fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Activity</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9b9b9b' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: '#16A34A', animation: 'pulse 2s ease-in-out infinite' }} />
              Live
            </span>
          </div>
          <Card style={{ marginBottom: 28 }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: i < ACTIVITY.length - 1 ? '1px solid #F5F4F1' : 'none' }}>
                <div style={{ marginBottom: 6 }}><SourcePill source={a.type} /></div>
                <p style={{ fontSize: 12.5, color: '#4a4a4a', margin: 0, lineHeight: 1.5 }}>{a.text}</p>
                <p style={{ fontSize: 11, color: '#b0b0b0', margin: 0, marginTop: 4 }}>{a.time}</p>
              </div>
            ))}
          </Card>

          {/* Get started */}
          <SectionLabel>Get started</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: MessageSquare, label: 'Connect Slack',   sub: 'Ingest conversations',    done: true,  go: 'settings-sources' },
              { icon: GitPullRequest,label: 'Connect GitHub',  sub: 'Capture PRs and issues',  done: true,  go: 'settings-sources' },
              { icon: Zap,           label: 'Invite your team',sub: 'Share company memory',    done: false, go: 'settings-members' },
            ].map((it, i) => (
              <div key={i} onClick={() => navigate(`/app/settings/${it.go.replace('settings-', '')}`)}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  background: 'white', border: '1px solid #E8E7E5', borderRadius: 12,
                  cursor: 'pointer', transition: 'all 120ms',
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: it.done ? 'rgba(22,163,74,0.10)' : '#F0EFED',
                  color: it.done ? '#16A34A' : '#9b9b9b',
                }}>
                  {it.done ? <Check size={11} /> : <it.icon size={11} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: it.done ? '#9b9b9b' : '#1a1a1a', textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</p>
                  <p style={{ fontSize: 11.5, color: '#b0b0b0', margin: 0 }}>{it.sub}</p>
                </div>
                {!it.done && <ChevronRight size={14} style={{ color: '#d0d0d0' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
