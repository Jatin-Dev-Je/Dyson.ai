import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Github, MessageSquare, Sparkles } from 'lucide-react'
import { DysonMark } from '@/components/shared/DysonMark'
import { cn } from '@/lib/utils'

const steps = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'slack',     label: 'Slack'     },
  { id: 'github',    label: 'GitHub'    },
  { id: 'invite',    label: 'Invite'    },
  { id: 'done',      label: 'Done'      },
]

// â”€â”€â”€ Step 1: Workspace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepWorkspace({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  function handleName(v: string) {
    setName(v)
    setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold text-ink-1 mb-1.5">Name your workspace</h2>
        <p className="text-[13.5px] text-ink-3">Usually your company name. You can change this anytime.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Workspace name</label>
          <input
            autoFocus
            value={name}
            onChange={e => handleName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full h-11 px-4 rounded-xl border border-line bg-subtle text-[14px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:bg-subtle focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Workspace URL</label>
          <div className="flex items-center h-11 rounded-xl border border-line bg-subtle overflow-hidden focus-within:border-primary/50 transition-all">
            <span className="px-4 text-[13px] text-ink-3 border-r border-line h-full flex items-center flex-shrink-0">dyson.ai/</span>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="acme-corp"
              className="flex-1 px-4 bg-transparent text-[13px] text-ink-1 placeholder:text-ink-4 outline-none"
            />
          </div>
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!name.trim()}
        className="w-full h-11 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// â”€â”€â”€ Step 2: Connect Slack â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepSlack({ onNext }: { onNext: () => void }) {
  const [connected, setConnected] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold text-ink-1 mb-1.5">Connect Slack</h2>
        <p className="text-[13.5px] text-ink-3">Dyson reads message history and detects decisions in your channels.</p>
      </div>

      <div className="rounded-lg border border-line bg-subtle p-5 space-y-3">
        <p className="text-[12px] font-mono text-ink-3 uppercase tracking-wider">Permissions requested</p>
        {['channels:history â€” read messages', 'channels:read â€” list channels', 'users:read â€” resolve users', 'chat:write â€” post bot responses'].map(p => (
          <div key={p} className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-2.5 h-2.5 text-green-400" />
            </div>
            <span className="text-[13px] font-mono text-ink-3">{p}</span>
          </div>
        ))}
      </div>

      {connected ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-green-400">Slack connected</p>
            <p className="text-[11px] text-ink-3">acme-corp.slack.com Â· 24 channels syncing</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConnected(true)}
          className="w-full h-11 rounded-xl border border-line bg-subtle text-[13.5px] font-medium text-ink-1 hover:bg-hover hover:border-white/[0.16] hover:text-ink-1 transition-all flex items-center justify-center gap-2.5"
        >
          <MessageSquare className="w-4 h-4 text-[#E01E5A]" />
          Connect Slack workspace
        </button>
      )}

      <div className="flex gap-3">
        <button onClick={onNext} className="flex-1 h-11 rounded-xl border border-line text-[13px] text-ink-3 hover:text-ink-2 hover:border-line hover:bg-hover transition-all">
          Skip for now
        </button>
        <button
          onClick={onNext}
          disabled={!connected}
          className="flex-1 h-11 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Step 3: Connect GitHub â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepGitHub({ onNext }: { onNext: () => void }) {
  const [connected, setConnected] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold text-ink-1 mb-1.5">Connect GitHub</h2>
        <p className="text-[13.5px] text-ink-3">Dyson ingests PRs, issues, and commits to link code changes to decisions.</p>
      </div>

      <div className="rounded-lg border border-line bg-subtle p-5 space-y-3">
        <p className="text-[12px] font-mono text-ink-3 uppercase tracking-wider">Permissions requested</p>
        {['contents â€” read repository code', 'pull_requests â€” read PR history', 'issues â€” read issue context', 'metadata â€” read repo info'].map(p => (
          <div key={p} className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-2.5 h-2.5 text-green-400" />
            </div>
            <span className="text-[13px] font-mono text-ink-3">{p}</span>
          </div>
        ))}
      </div>

      {connected ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-green-400">GitHub connected</p>
            <p className="text-[11px] text-ink-3">acme-corp Â· 8 repositories syncing</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConnected(true)}
          className="w-full h-11 rounded-xl border border-line bg-subtle text-[13.5px] font-medium text-ink-1 hover:bg-hover hover:border-white/[0.16] hover:text-ink-1 transition-all flex items-center justify-center gap-2.5"
        >
          <Github className="w-4 h-4" />
          Connect GitHub organisation
        </button>
      )}

      <div className="flex gap-3">
        <button onClick={onNext} className="flex-1 h-11 rounded-xl border border-line text-[13px] text-ink-3 hover:text-ink-2 hover:border-line hover:bg-hover transition-all">
          Skip for now
        </button>
        <button
          onClick={onNext}
          disabled={!connected}
          className="flex-1 h-11 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Step 4: Invite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepInvite({ onNext }: { onNext: () => void }) {
  const [emails, setEmails] = useState(['', '', ''])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold text-ink-1 mb-1.5">Invite your team</h2>
        <p className="text-[13.5px] text-ink-3">Add engineers and engineering managers. They'll get an email invite.</p>
      </div>
      <div className="space-y-2.5">
        {emails.map((email, i) => (
          <input
            key={i}
            value={email}
            onChange={e => setEmails(v => v.map((x, j) => j === i ? e.target.value : x))}
            placeholder={`teammate${i + 1}@company.com`}
            className="w-full h-10 px-4 rounded-xl border border-line bg-surface text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:bg-surface focus:ring-2 focus:ring-primary/10 transition-all"
          />
        ))}
        <button
          onClick={() => setEmails(v => [...v, ''])}
          className="text-[12.5px] text-ink-3 hover:text-primary transition-colors"
        >
          + Add another
        </button>
      </div>
      <div className="flex gap-3">
        <button onClick={onNext} className="flex-1 h-11 rounded-xl border border-line text-[13px] text-ink-3 hover:text-ink-2 hover:border-line hover:bg-hover transition-all">
          Skip for now
        </button>
        <button
          onClick={onNext}
          className="flex-1 h-11 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Send invites <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Step 5: Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
      <div>
        <h2 className="text-[22px] font-semibold text-ink-1 mb-2">You're all set</h2>
        <p className="text-[13.5px] text-ink-3 leading-relaxed max-w-sm mx-auto">
          Dyson is ingesting your stack. Ask your first WHY question â€” the graph starts building immediately.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-subtle p-5 text-left space-y-3">
        {[
          { label: 'Try asking the WHY Engine',     sub: '"Why did we build X?"' },
          { label: 'Check the Decision Log',         sub: 'Decisions detected so far' },
          { label: 'Generate an onboarding pack',   sub: 'For a new team member' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-mono font-bold text-primary">{i + 1}</span>
            </div>
            <div>
              <p className="text-[13px] text-ink-2">{item.label}</p>
              <p className="text-[11px] text-ink-3">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onFinish}
        className="w-full h-11 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        Open Dyson <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// â”€â”€â”€ Shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Onboarding() {
  const navigate  = useNavigate()
  const [step, setStep] = useState(0)
  const next = () => setStep(v => v + 1)

  const content = [
    <StepWorkspace key="ws"     onNext={next} />,
    <StepSlack     key="slack"  onNext={next} />,
    <StepGitHub    key="gh"     onNext={next} />,
    <StepInvite    key="invite" onNext={next} />,
    <StepDone      key="done"   onFinish={() => navigate('/app')} />,
  ]

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Nav */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-line">
        <div className="flex items-center gap-2">
          <DysonMark size={20} className="text-primary" />
          <span className="text-[13px] font-semibold text-ink-1">Dyson</span>
        </div>
        <span className="text-[12px] font-mono text-ink-3">Step {step + 1} of {steps.length}</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-10">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300',
                  i < step  ? 'bg-primary border-primary' :
                  i === step ? 'border-primary bg-primary/15' :
                               'border-line bg-transparent'
                )}>
                  {i < step
                    ? <Check className="w-3 h-3 text-ink-1" />
                    : <span className={cn('text-[9px] font-mono font-bold', i === step ? 'text-primary' : 'text-ink-4')}>{i + 1}</span>
                  }
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('flex-1 h-px transition-all duration-300', i < step ? 'bg-primary/50' : 'bg-subtle')} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {content[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}




