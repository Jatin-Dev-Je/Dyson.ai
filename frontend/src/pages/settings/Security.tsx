import { useState, useEffect } from 'react'
import { Shield, Smartphone, Monitor, LogOut, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sessionsApi, type Session, tokens, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn('relative w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0', on ? 'bg-primary' : 'bg-white/[0.10]')}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'Safari on iOS'
  if (userAgent.includes('Android'))  return 'Chrome on Android'
  if (userAgent.includes('Macintosh')) return 'Browser on macOS'
  if (userAgent.includes('Windows'))   return 'Browser on Windows'
  if (userAgent.includes('Linux'))     return 'Browser on Linux'
  return 'Browser'
}

function timeAgo(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(ms / 60_000)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Security() {
  const navigate  = useNavigate()
  const [sessions,    setSessions]    = useState<Session[]>([])
  const [loading,     setLoading]     = useState(true)
  const [revoking,    setRevoking]    = useState<string | null>(null)
  const [signingOut,  setSigningOut]  = useState(false)
  const [sessionAlert, setSessionAlert] = useState(true)

  async function loadSessions() {
    setLoading(true)
    try {
      const data = await sessionsApi.list()
      setSessions(data)
    } catch {
      // non-critical
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadSessions() }, [])

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId)
    try {
      await sessionsApi.revoke(sessionId)
      setSessions(s => s.filter(x => x.id !== sessionId))
      toast.success('Session revoked')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke session')
    } finally {
      setRevoking(null)
    }
  }

  async function handleSignOutAll() {
    setSigningOut(true)
    try {
      await sessionsApi.revokeAll()
      tokens.clearAll()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Failed to sign out â€” please try again')
      setSigningOut(false)
    }
  }

  return (
    <div className="px-10 py-8 max-w-[680px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-ink-1 mb-1">Security</h1>
        <p className="text-[13px] text-ink-3">Protect your account and manage active sessions.</p>
      </div>

      {/* Security settings */}
      <div className="rounded-lg border border-line bg-surface p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-subtle border border-line flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-ink-3" />
            </div>
            <div>
              <p className="text-[13.5px] font-medium text-ink-1">Two-factor authentication</p>
              <p className="text-[12px] text-ink-3">Coming soon â€” TOTP support</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-ink-3 bg-subtle border border-line px-2 py-0.5 rounded-full">
            Soon
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-subtle border border-line flex items-center justify-center">
              <Shield className="w-4 h-4 text-ink-3" />
            </div>
            <div>
              <p className="text-[13.5px] font-medium text-ink-1">New session alerts</p>
              <p className="text-[12px] text-ink-3">Email me when a new device signs in</p>
            </div>
          </div>
          <Toggle on={sessionAlert} onChange={setSessionAlert} />
        </div>
      </div>

      {/* Active sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-ink-1">Active sessions</h2>
          <button onClick={loadSessions} className="text-ink-3 hover:text-ink-2 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-lg border border-line bg-surface overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 text-ink-4 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-ink-3">
              No active sessions found
            </div>
          ) : (
            sessions.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-4 hover:bg-subtle transition-colors group',
                  i < sessions.length - 1 && 'border-b border-line'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-subtle border border-line flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-3.5 h-3.5 text-ink-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] text-ink-2 truncate">{deviceLabel(s.userAgent)}</p>
                    {i === 0 && (
                      <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-3">
                    {s.ipAddress ?? 'Unknown IP'} Â· {timeAgo(s.createdAt)}
                  </p>
                </div>
                {i > 0 && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={revoking === s.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-ink-3 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 disabled:opacity-50 transition-all border border-transparent hover:border-red-500/20"
                  >
                    {revoking === s.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <LogOut className="w-3.5 h-3.5" />
                    }
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <button
          onClick={handleSignOutAll}
          disabled={signingOut}
          className="mt-3 flex items-center gap-1.5 text-[12.5px] text-red-400/70 hover:text-red-400 disabled:opacity-50 transition-colors"
        >
          {signingOut && <Loader2 className="w-3 h-3 animate-spin" />}
          Sign out all sessions
        </button>
      </div>
    </div>
  )
}



