import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Brain, Network, Users, TrendingUp,
  ChevronRight, ArrowUpRight, Check,
} from 'lucide-react'
import { SourcePill } from '@/components/shared/SourcePill'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { authApi } from '@/lib/api'

// ─── Static data ──────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Total memories',     value: '1,247', trend: '+24 today',     color: '#5B5BD6', Icon: Brain      },
  { label: 'Decisions detected', value: '89',    trend: '+3 this week',  color: '#D97706', Icon: Network    },
  { label: 'Recalls this week',  value: '34',    trend: '↑ 12% vs last', color: '#7C3AED', Icon: TrendingUp },
  { label: 'Active members',     value: '12',    trend: '3 online now',  color: '#16A34A', Icon: Users      },
]

const MEMORIES = [
  { id: 'm1', title: 'Moved to cursor-based pagination',   team: 'Backend',  source: 'slack'  as const, time: '2d ago' },
  { id: 'm2', title: 'Deprecated v1 API by June 2026',     team: 'Platform', source: 'github' as const, time: '3d ago' },
  { id: 'm3', title: 'Adopted pgvector over Pinecone',     team: 'Infra',    source: 'notion' as const, time: '5d ago' },
  { id: 'm4', title: 'JWT auth replaces session tokens',   team: 'Backend',  source: 'slack'  as const, time: '1w ago' },
  { id: 'm5', title: 'Retry budget capped at 3 for jobs',  team: 'Infra',    source: 'github' as const, time: '1w ago' },
]

const RECALLS = [
  { id: 1, query: 'What do we know about our auth system?',      confidence: 0.91, sources: 5, time: '2h ago'  },
  { id: 2, query: 'What happened during the Q3 incident?',        confidence: 0.87, sources: 4, time: '5h ago'  },
  { id: 3, query: 'What constraints exist on the payments service?', confidence: 0.74, sources: 3, time: '1d ago' },
]

const ACTIVITY = [
  { source: 'slack'  as const, text: '#incidents — 3 messages linked to open decisions', time: '10m ago' },
  { source: 'github' as const, text: 'PR #4721 — 2 related past decisions detected',     time: '42m ago' },
  { source: 'slack'  as const, text: '#backend — recall answered @alex query',           time: '1h ago'  },
  { source: 'notion' as const, text: 'RFC: payments-v2 — linked to 4 key memories',     time: '3h ago'  },
]

const SUGGESTIONS = [
  'Why did we choose pgvector?',
  'What happened in Q3?',
  'What constraints exist on auth?',
]

const SETUP = [
  { label: 'Connect Slack',    sub: 'Ingest conversations',   done: true,  to: '/app/settings/sources'  },
  { label: 'Connect GitHub',   sub: 'Capture PRs and issues', done: true,  to: '/app/settings/sources'  },
  { label: 'Invite your team', sub: 'Share company memory',   done: false, to: '/app/settings/members'  },
]

// ─── Recall box ───────────────────────────────────────────────────────────────

function RecallBox({ onAsk }: { onAsk: (q: string) => void }) {
  const [q,     setQ]     = useState('')
  const [focus, setFocus] = useState(false)

  return (
    <form onSubmit={e => { e.preventDefault(); if (q.trim()) onAsk(q) }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 18px',
        background: focus ? 'white' : '#FAFAF8',
        border: `1.5px solid ${focus ? 'rgba(91,91,214,0.5)' : '#E8E6E1'}`,
        borderRadius: 14,
        boxShadow: focus ? '0 0 0 4px rgba(91,91,214,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 150ms ease',
      }}>
        <Brain size={18} style={{ color: focus ? '#5B5BD6' : '#b0b0b0', flexShrink: 0, transition: 'color 150ms' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Ask anything your team has ever decided, discussed, or documented…"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 14.5, color: '#111', outline: 'none',
            letterSpacing: '-0.01em',
          }}
        />
        {q.trim() ? (
          <button type="submit" style={{
            height: 30, padding: '0 14px',
            background: '#5B5BD6', color: 'white',
            border: 'none', borderRadius: 8,
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            letterSpacing: '-0.01em', flexShrink: 0,
          }}>
            Ask
          </button>
        ) : (
          <kbd style={{ fontSize: 11, color: '#ccc', fontFamily: 'monospace', flexShrink: 0 }}>↵</kbd>
        )}
      </div>
    </form>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ value, label, trend, color, Icon }: typeof STATS[number]) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #ECEAE6',
      borderRadius: 12,
      padding: '16px 18px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontSize: 11, color: '#b0b0b0', letterSpacing: '-0.01em' }}>{trend}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#111', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: '5px 0 0', letterSpacing: '-0.01em' }}>{label}</p>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ title, linkLabel, linkTo }: { title: string; linkLabel?: string; linkTo?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 700, color: '#999',
        textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
      }}>
        {title}
      </h2>
      {linkLabel && linkTo && (
        <Link to={linkTo} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 12, color: '#bbb', textDecoration: 'none',
          letterSpacing: '-0.01em', transition: 'color 80ms',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#5B5BD6')}
          onMouseLeave={e => (e.currentTarget.style.color = '#bbb')}
        >
          {linkLabel} <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #ECEAE6',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

// ─── Row with hover ───────────────────────────────────────────────────────────

function Row({ onClick, children, last = false }: {
  onClick?: () => void; children: React.ReactNode; last?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        borderBottom: last ? 'none' : '1px solid #F5F3EF',
        background: hov && onClick ? '#FAFAF8' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 80ms',
      }}
    >
      {children}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate  = useNavigate()
  const user      = authApi.getUser()
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today     = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const doneCount = SETUP.filter(s => s.done).length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 36px 64px' }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: '#111',
            letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2,
          }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: 13.5, color: '#888', margin: '6px 0 0', letterSpacing: '-0.01em' }}>
            Your workspace has{' '}
            <span style={{ color: '#333', fontWeight: 500 }}>1,247 memories</span>
            {' '}across{' '}
            <span style={{ color: '#333', fontWeight: 500 }}>2 connected sources</span>
            . 24 captured today.
          </p>
        </div>
        <span style={{
          fontSize: 12, color: '#c0c0c0', flexShrink: 0,
          paddingTop: 5, letterSpacing: '-0.01em',
        }}>
          {today}
        </span>
      </div>

      {/* ── Recall hero ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <RecallBox onAsk={q => navigate(`/app/recall?q=${encodeURIComponent(q)}`)} />
      </div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 32, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => navigate(`/app/recall?q=${encodeURIComponent(s)}`)}
            style={{
              fontSize: 12, color: '#888',
              background: 'white', border: '1px solid #ECEAE6',
              padding: '4px 12px', borderRadius: 99,
              cursor: 'pointer', letterSpacing: '-0.01em',
              transition: 'all 100ms',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(91,91,214,0.3)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#5B5BD6'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#ECEAE6'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#888'
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
        {STATS.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 28, alignItems: 'start' }}>

        {/* ── Left column ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Recent memories */}
          <div>
            <SectionHead title="Recent memories" linkLabel="Memory graph" linkTo="/app/decisions" />
            <Card>
              {MEMORIES.map((m, i) => (
                <Row key={m.id} onClick={() => navigate('/app/decisions')} last={i === MEMORIES.length - 1}>
                  {/* Source pill */}
                  <SourcePill source={m.source} />
                  {/* Title */}
                  <p style={{
                    flex: 1, fontSize: 13.5, color: '#1a1a1a', margin: 0,
                    letterSpacing: '-0.01em', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.title}
                  </p>
                  {/* Team chip */}
                  <span style={{
                    fontSize: 11, color: '#999', background: '#F5F3EF',
                    border: '1px solid #ECEAE6', padding: '2px 8px',
                    borderRadius: 99, flexShrink: 0, letterSpacing: '-0.01em',
                  }}>
                    {m.team}
                  </span>
                  {/* Time */}
                  <span style={{ fontSize: 11.5, color: '#c0c0c0', flexShrink: 0, width: 44, textAlign: 'right' }}>
                    {m.time}
                  </span>
                  <ChevronRight size={13} style={{ color: '#ddd', flexShrink: 0 }} />
                </Row>
              ))}
            </Card>
          </div>

          {/* Recent recalls */}
          <div>
            <SectionHead title="Recent recalls" linkLabel="Open Recall" linkTo="/app/recall" />
            <Card>
              {RECALLS.map((r, i) => {
                const confColor = r.confidence >= 0.85 ? '#16A34A' : r.confidence >= 0.72 ? '#D97706' : '#DC2626'
                return (
                  <Row
                    key={r.id}
                    onClick={() => navigate(`/app/recall?q=${encodeURIComponent(r.query)}`)}
                    last={i === RECALLS.length - 1}
                  >
                    {/* Confidence accent dot */}
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: confColor, flexShrink: 0 }} />
                    {/* Query */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13.5, color: '#1a1a1a', margin: 0,
                        letterSpacing: '-0.01em', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.query}
                      </p>
                      <p style={{ fontSize: 11.5, color: '#bbb', margin: '3px 0 0', letterSpacing: '-0.01em' }}>
                        {r.sources} sources · {r.time}
                      </p>
                    </div>
                    {/* Confidence */}
                    <ConfidenceBadge confidence={r.confidence} showBar />
                    <ChevronRight size={13} style={{ color: '#ddd', flexShrink: 0 }} />
                  </Row>
                )
              })}
              {/* Prompt footer */}
              <div
                onClick={() => navigate('/app/recall')}
                style={{
                  padding: '10px 16px', borderTop: '1px solid #F5F3EF',
                  cursor: 'pointer', transition: 'background 80ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#FAFAF8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 13, color: '#bbb', letterSpacing: '-0.01em' }}>
                  Ask a new question…
                </span>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Live activity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Activity
              </h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#888' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 99, background: '#16A34A', flexShrink: 0,
                  boxShadow: '0 0 0 3px rgba(22,163,74,0.15)',
                }} />
                Live
              </span>
            </div>
            <Card>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12,
                  padding: '10px 16px',
                  borderBottom: i < ACTIVITY.length - 1 ? '1px solid #F5F3EF' : 'none',
                }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: '#E8E6E1', flexShrink: 0 }} />
                    {i < ACTIVITY.length - 1 && (
                      <span style={{ width: 1, flex: 1, background: '#F0EFED', marginTop: 4, minHeight: 16 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 4 }}>
                      <SourcePill source={a.source} />
                    </div>
                    <p style={{ fontSize: 12.5, color: '#3a3a3a', margin: 0, lineHeight: 1.45, letterSpacing: '-0.01em' }}>
                      {a.text}
                    </p>
                    <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Setup checklist */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Setup
              </h2>
              <span style={{ fontSize: 11, color: '#bbb', letterSpacing: '-0.01em' }}>
                {doneCount}/{SETUP.length} complete
              </span>
            </div>
            {/* Progress bar */}
            <div style={{
              height: 3, background: '#F0EFED', borderRadius: 99, marginBottom: 10, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: '#5B5BD6', borderRadius: 99,
                width: `${(doneCount / SETUP.length) * 100}%`,
                transition: 'width 300ms ease',
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SETUP.map((item, i) => (
                <div
                  key={i}
                  onClick={() => navigate(item.to)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'white', border: '1px solid #ECEAE6', borderRadius: 10,
                    cursor: 'pointer', transition: 'all 100ms',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = item.done ? '#ECEAE6' : 'rgba(91,91,214,0.25)'
                    el.style.background = '#FAFAF8'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = '#ECEAE6'
                    el.style.background = 'white'
                  }}
                >
                  {/* Check circle */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.done ? 'rgba(22,163,74,0.10)' : 'white',
                    border: `1.5px solid ${item.done ? '#16A34A' : '#E0DEDB'}`,
                  }}>
                    {item.done && <Check size={11} style={{ color: '#16A34A' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 500, margin: 0, letterSpacing: '-0.01em',
                      color: item.done ? '#aaa' : '#1a1a1a',
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 11.5, color: '#c0c0c0', margin: '2px 0 0', letterSpacing: '-0.01em' }}>
                      {item.sub}
                    </p>
                  </div>
                  {!item.done && <ChevronRight size={14} style={{ color: '#ccc', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Quick navigate */}
          <div>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
              Navigate
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: Brain,   label: 'Recall',          sub: 'Ask your team\'s memory', to: '/app/recall'           },
                { icon: Network, label: 'Memory Graph',    sub: 'Explore decisions',       to: '/app/decisions'        },
                { icon: Users,   label: 'Team Briefings',  sub: 'Onboarding packs',        to: '/app/onboarding-packs' },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: 'white', border: '1px solid #ECEAE6', borderRadius: 10,
                      transition: 'all 100ms', cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = 'rgba(91,91,214,0.25)'
                      el.style.background = '#FAFAF8'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = '#ECEAE6'
                      el.style.background = 'white'
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(91,91,214,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <item.icon size={14} style={{ color: '#5B5BD6' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: 11.5, color: '#bbb', margin: '1px 0 0', letterSpacing: '-0.01em' }}>
                        {item.sub}
                      </p>
                    </div>
                    <ArrowUpRight size={13} style={{ color: '#ccc', flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
