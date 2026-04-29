import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Database,
  KeyRound,
  Lock,
  MessageSquare,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Workflow,
  X,
  Menu,
} from 'lucide-react'

import { DysonMark } from '@/components/shared/DysonMark'
import { cn } from '@/lib/utils'

type Source = 'slack' | 'github' | 'notion' | 'linear' | 'meeting'

const sourceStyles: Record<Source, string> = {
  slack: 'border-[#E01E5A]/25 bg-[#E01E5A]/10 text-[#F58BAA]',
  github: 'border-white/15 bg-white/[0.06] text-white/80',
  notion: 'border-white/15 bg-white/[0.06] text-white/75',
  linear: 'border-[#5E6AD2]/30 bg-[#5E6AD2]/12 text-[#AEB5FF]',
  meeting: 'border-citation/25 bg-citation/10 text-citation',
}

const queryExamples = [
  {
    question: 'Why did we split ingestion from processing?',
    confidence: 0.91,
    answer:
      'The split was driven by webhook lag during backfills. Engineering kept ingestion fast for Slack and GitHub events, then moved heavier extraction and embeddings into async jobs.',
    events: [
      { source: 'slack' as const, time: 'Apr 12', title: '#incidents: webhook lag crossed 8 minutes' },
      { source: 'linear' as const, time: 'Apr 13', title: 'INF-142 opened for ingestion queue isolation' },
      { source: 'notion' as const, time: 'Apr 15', title: 'Design note compared one queue vs job split' },
      { source: 'github' as const, time: 'Apr 18', title: 'PR #219 introduced process-event jobs' },
    ],
  },
  {
    question: 'Why does the WHY Engine refuse low confidence answers?',
    confidence: 0.86,
    answer:
      'The product treats a wrong explanation as worse than no explanation. Below the confidence threshold it returns source events instead of composing a narrative.',
    events: [
      { source: 'notion' as const, time: 'Mar 22', title: 'Trust contract: no uncited claims' },
      { source: 'meeting' as const, time: 'Mar 25', title: 'Design review set confidence gate at 0.72' },
      { source: 'github' as const, time: 'Mar 27', title: 'PR #171 added cannotAnswer path' },
    ],
  },
  {
    question: 'Why is MCP part of the product now?',
    confidence: 0.82,
    answer:
      'The agent API turns Dyson into infrastructure, not just an app. Coding agents can ask for context before changing code and write decisions back after they act.',
    events: [
      { source: 'slack' as const, time: 'Apr 04', title: '#eng-platform: agents need workspace memory' },
      { source: 'github' as const, time: 'Apr 06', title: 'MCP server added ask_why and write_event' },
      { source: 'notion' as const, time: 'Apr 09', title: 'Agent context API scope and security notes' },
    ],
  },
]

const metrics = [
  { value: '0.72', label: 'minimum confidence before Dyson composes an answer' },
  { value: '<3s', label: 'target response time for cited WHY answers' },
  { value: '100%', label: 'tenant-scoped graph, search, and embedding retrieval' },
]

const features = [
  {
    icon: Workflow,
    eyebrow: 'WHY Engine',
    title: 'Turn scattered events into a causal timeline.',
    body: 'Ask why a change happened and Dyson reconstructs the Slack thread, issue, decision, PR, and outcome behind it.',
  },
  {
    icon: Network,
    eyebrow: 'Context graph',
    title: 'Typed links between people, events, code, and decisions.',
    body: 'Nodes and edges make institutional memory queryable by humans, product surfaces, and agent workflows.',
  },
  {
    icon: Bot,
    eyebrow: 'Agent API',
    title: 'Give coding agents the same memory as the team.',
    body: 'MCP tools expose ask_why, search_context, recent_decisions, and write_event with API-key scopes.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Trust',
    title: 'Citations and confidence are product requirements.',
    body: 'Low-confidence answers return raw source events instead of narrative. No uncited claim should reach the user.',
  },
]

const pipeline = [
  { icon: MessageSquare, title: 'Ingest', body: 'Signed Slack and GitHub events enter the raw event log with stable external IDs.' },
  { icon: Sparkles, title: 'Process', body: 'Entity extraction, decision detection, embeddings, and edge-building run asynchronously.' },
  { icon: Database, title: 'Graph', body: 'Postgres, pgvector, context nodes, causal edges, and query history stay tenant scoped.' },
  { icon: Search, title: 'Answer', body: 'Hybrid retrieval selects evidence. Gemini composes only over retrieved source nodes.' },
]

const trust = [
  'Every factual claim needs a citation to a source node.',
  'Confidence below threshold returns cannotAnswer with raw events.',
  'Tenant ID comes from auth context, never user input.',
  'Secrets stay out of logs, errors, and frontend bundles.',
]

const navItems = [
  { href: '#product', label: 'Product' },
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#agents', label: 'Agents' },
  { href: '#trust', label: 'Trust' },
]

function SourceBadge({ source }: { source: Source }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em]', sourceStyles[source])}>
      {source}
    </span>
  )
}

function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08080D]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 text-white" aria-label="Dyson home">
          <DysonMark size={24} variant="linked" />
          <span className="text-[15px] font-medium tracking-[-0.02em]">Dyson</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(item => (
            <a key={item.href} href={item.href} className="rounded-md px-3 py-2 text-[13px] text-white/48 transition hover:bg-white/[0.04] hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className="rounded-md px-3 py-2 text-[13px] text-white/55 transition hover:text-white">
            Sign in
          </Link>
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-[13px] font-medium text-[#08080D] transition hover:bg-white/90">
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] text-white/75 md:hidden"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#08080D] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map(item => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-[13px] text-white/60 hover:bg-white/[0.04] hover:text-white">
                {item.label}
              </a>
            ))}
            <Link to="/signup" className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-[13px] font-medium text-[#08080D]">
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function ProductDemo() {
  const [index, setIndex] = useState(0)
  const active = queryExamples[index]!

  useEffect(() => {
    const timer = window.setInterval(() => setIndex(i => (i + 1) % queryExamples.length), 5200)
    return () => window.clearInterval(timer)
  }, [])

  const visibleEvents = useMemo(() => active.events, [active])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B11] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-1.5 sm:flex">
          <DysonMark size={12} className="text-primary" />
          <span className="font-mono text-[11px] text-white/35">dyson.ai / why</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Live graph
        </div>
      </div>

      <div className="grid min-h-[530px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="border-b border-white/[0.06] p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-3">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <p className="truncate font-mono text-[12.5px] text-white/78">{active.question}</p>
          </div>

          <div className="space-y-2">
            {queryExamples.map((item, i) => (
              <button
                key={item.question}
                onClick={() => setIndex(i)}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition',
                  i === index
                    ? 'border-primary/35 bg-primary/[0.08]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
                )}
              >
                <p className="line-clamp-2 text-[12.5px] leading-relaxed text-white/72">{item.question}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/28">example query</span>
                  <ChevronRight className={cn('h-3.5 w-3.5', i === index ? 'text-primary' : 'text-white/20')} />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-citation/20 bg-citation/[0.06] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-citation" />
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-citation">Trust gate</p>
            </div>
            <p className="text-[12.5px] leading-relaxed text-white/58">
              If confidence drops below 0.72, Dyson refuses to summarize and returns source events only.
            </p>
          </div>
        </aside>

        <main className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/32">Causal timeline</p>
              <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-white">Answer with receipts</h3>
            </div>
            <div className="rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-[12px] text-success">
              {Math.round(active.confidence * 100)}% confidence
            </div>
          </div>

          <div className="space-y-0">
            {visibleEvents.map((event, i) => (
              <div key={`${active.question}-${event.title}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-citation ring-[4px] ring-citation/10" />
                  {i < visibleEvents.length - 1 && <span className="my-2 w-px flex-1 bg-white/[0.10]" />}
                </div>
                <div className="pb-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-white/30">{event.time}</span>
                    <SourceBadge source={event.source} />
                  </div>
                  <p className="text-[13px] leading-relaxed text-white/65">{event.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-citation" />
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-citation">Synthesis</p>
            </div>
            <p className="text-[13.5px] leading-relaxed text-white/72">{active.answer}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {active.events.map((event, i) => (
                <span key={`${event.title}-citation`} className="rounded-md border border-citation/20 bg-citation/10 px-2 py-1 font-mono text-[10px] text-citation">
                  [{i + 1}] {event.source}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  body,
  className,
}: {
  eyebrow: string
  title: string
  body?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-[680px]', className)}>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="text-[34px] font-medium leading-[1.05] tracking-[-0.035em] text-white sm:text-[48px]">{title}</h2>
      {body && <p className="mt-4 text-[15px] leading-[1.65] text-white/52">{body}</p>}
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:pb-28 sm:pt-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.10] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_100%,48px_48px,48px_48px]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#08080D] to-transparent" />
      </div>

      <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_14px_rgba(34,197,94,0.65)]" />
            <span className="text-[12px] text-white/58">Slack and GitHub first. MCP-ready.</span>
          </div>

          <h1 className="max-w-[640px] text-[48px] font-medium leading-[0.98] tracking-[-0.055em] text-white sm:text-[70px] lg:text-[78px]">
            The system of record for why.
          </h1>
          <p className="mt-6 max-w-[570px] text-[16px] leading-[1.7] text-white/56 sm:text-[18px]">
            Dyson connects the fragments of engineering work across Slack, GitHub, docs, issues, and agents into a cited context graph. Ask why something happened and get the evidence, not a guess.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-medium text-[#08080D] transition hover:bg-white/90">
              Start building context
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#product" className="inline-flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.03] px-5 py-3 text-[14px] text-white/78 transition hover:border-white/20 hover:text-white">
              See the workflow
            </a>
          </div>

          <div className="mt-9 grid max-w-[560px] grid-cols-3 border-t border-white/[0.08] pt-6">
            {metrics.map((metric, i) => (
              <div key={metric.value} className={cn(i > 0 && 'border-l border-white/[0.08] pl-4 sm:pl-6', i === 0 && 'pr-4 sm:pr-6')}>
                <p className="text-[24px] font-medium tracking-[-0.03em] text-white sm:text-[30px]">{metric.value}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-white/38">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductDemo />
      </div>
    </section>
  )
}

function ProblemSection() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.012] px-5 py-20">
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          eyebrow="The pain"
          title="Most teams can find what changed. They still cannot find why."
          body="Search returns files, threads, and tickets. Dyson returns the causal chain between them."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Slack scrollback decays', 'Decisions in channels disappear from institutional memory within weeks.'],
            ['PRs miss rationale', 'Code shows the outcome but rarely preserves the tradeoff that created it.'],
            ['Docs drift from reality', 'Architecture notes and actual implementation fall out of sync.'],
            ['Agents lack context', 'A code agent without workspace memory repeats decisions your team already rejected.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-white/[0.08] bg-[#0C0C14] p-5">
              <h3 className="text-[15px] font-medium text-white">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/48">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductSection() {
  return (
    <section id="product" className="px-5 py-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeader
          eyebrow="Product"
          title="A context graph your team and agents can actually trust."
          body="The first wedge is engineering post-mortems and onboarding: reconstruct what happened, what changed, who decided, and what evidence supports the answer."
          className="mb-12"
        />

        <div className="grid gap-3 md:grid-cols-4">
          {features.map((feature, i) => (
            <div key={feature.title} className={cn('rounded-2xl border border-white/[0.08] bg-[#0C0C14] p-6', i === 0 && 'md:col-span-2', i === 3 && 'md:col-span-2')}>
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.045] text-white/82">
                <feature.icon className="h-5 w-5" />
              </div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{feature.eyebrow}</p>
              <h3 className="text-[18px] font-medium leading-tight tracking-[-0.02em] text-white">{feature.title}</h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-white/50">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PipelineSection() {
  return (
    <section id="pipeline" className="border-y border-white/[0.06] bg-white/[0.012] px-5 py-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeader
          eyebrow="Pipeline"
          title="Designed around replayable events and tenant-scoped retrieval."
          body="Every boundary is idempotent. Raw events are durable, processing is async, and answers are composed only after retrieval has selected source nodes."
          className="mb-12"
        />

        <div className="grid gap-3 md:grid-cols-4">
          {pipeline.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-white/[0.08] bg-[#0B0B11] p-6">
              <div className="mb-7 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.10] text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-[11px] text-white/24">0{i + 1}</span>
              </div>
              <h3 className="text-[17px] font-medium tracking-[-0.02em] text-white">{step.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-white/48">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AgentSection() {
  return (
    <section id="agents" className="px-5 py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          eyebrow="Agent context"
          title="MCP turns Dyson into memory for coding agents."
          body="Agents can query recent decisions before making a change, search context while debugging, and write back what they did so the graph keeps compounding."
        />

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B11]">
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.025] px-4 py-3">
            <TerminalSquare className="h-4 w-4 text-primary" />
            <span className="font-mono text-[12px] text-white/42">dyson mcp tools</span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {[
              ['ask_why', 'Get a cited causal answer or a cannotAnswer response.'],
              ['search_context', 'Find events, decisions, and prior WHY queries.'],
              ['recent_decisions', 'List active constraints before coding.'],
              ['write_event', 'Record what an agent changed and why.'],
            ].map(([name, body]) => (
              <div key={name} className="grid gap-3 p-5 sm:grid-cols-[180px_1fr]">
                <code className="rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2 font-mono text-[12px] text-citation">{name}</code>
                <p className="text-[13.5px] leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section id="trust" className="border-y border-white/[0.06] bg-white/[0.012] px-5 py-24">
      <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeader
          eyebrow="Trust contract"
          title="Dyson is useful only if engineers believe the answer."
          body="Trust is not a polish pass. It is the core product constraint: citations, confidence, permission boundaries, and clear refusal when evidence is not strong enough."
        />

        <div className="rounded-2xl border border-white/[0.08] bg-[#0B0B11] p-6">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-citation" />
            <h3 className="text-[18px] font-medium text-white">Non-negotiables</h3>
          </div>
          <div className="space-y-3">
            {trust.map(item => (
              <div key={item} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-[13.5px] leading-relaxed text-white/60">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const plans = [
    {
      name: 'Free', price: '$0', period: null,
      desc: 'For trying the workflow with a small team.',
      cta: 'Start free', ctaLink: '/signup', highlight: false,
      features: ['5 users', '90 days history', 'Slack and GitHub', 'WHY Engine'],
    },
    {
      name: 'Team', price: '$25', period: '/ user / mo',
      desc: 'For teams making Dyson part of daily engineering work.',
      cta: 'Start 14-day trial', ctaLink: '/signup', highlight: true,
      features: ['Unlimited history', 'All core workflows', 'Decision Log', 'Agent API · read scope', 'Onboarding packs'],
    },
    {
      name: 'Business', price: '$45', period: '/ user / mo',
      desc: 'For companies that need controls and rollout support.',
      cta: 'Talk to us', ctaLink: 'mailto:team@dyson.ai', highlight: false,
      features: ['Everything in Team', 'SSO · SCIM ready', 'Audit log export', 'Custom retention', 'Priority support'],
    },
  ]

  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeader
          eyebrow="Pricing"
          title="Start with one team. Expand when the graph becomes useful."
          body="Pricing is intentionally simple for the engineering wedge. Enterprise controls land after the core WHY workflow is trusted."
          className="mb-12"
        />

        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl border p-6',
                plan.highlight
                  ? 'border-white/80 bg-white text-[#08080D] shadow-[0_24px_64px_-12px_rgba(255,255,255,0.15)]'
                  : 'border-white/[0.08] bg-[#0C0C14]'
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-[#08080D] px-3 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em] text-white">
                  Most popular
                </span>
              )}

              <div>
                <p className={cn('text-[14px] font-medium', plan.highlight ? 'text-[#08080D]' : 'text-white')}>{plan.name}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className={cn('text-[42px] font-medium tracking-[-0.04em]', plan.highlight ? 'text-[#08080D]' : 'text-white')}>{plan.price}</span>
                  {plan.period && (
                    <span className={cn('mb-2 text-[13px]', plan.highlight ? 'text-[#08080D]/50' : 'text-white/38')}>{plan.period}</span>
                  )}
                </div>
                <p className={cn('mt-3 min-h-[44px] text-[13px] leading-relaxed', plan.highlight ? 'text-[#08080D]/60' : 'text-white/45')}>{plan.desc}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className={cn('h-3.5 w-3.5 shrink-0', plan.highlight ? 'text-[#08080D]' : 'text-white/55')} />
                      <span className={cn('text-[13px]', plan.highlight ? 'text-[#08080D]/80' : 'text-white/58')}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-7">
                <Link
                  to={plan.ctaLink}
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-medium transition active:scale-[0.98]',
                    plan.highlight
                      ? 'bg-[#08080D] text-white hover:bg-[#1a1a26]'
                      : 'border border-white/[0.10] bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/[0.07] hover:text-white'
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[12px] text-white/30">
          All plans include a 14-day free trial of Team features · No credit card required
        </p>
      </div>
    </section>
  )
}

function Footer() {
  const product = [
    { href: '#product',  label: 'WHY Engine' },
    { href: '#pipeline', label: 'Pipeline' },
    { href: '#agents',   label: 'Agent API' },
    { href: '#trust',    label: 'Trust' },
  ]
  const company = [
    { href: '#', label: 'About' },
    { href: '#', label: 'Blog' },
    { href: '#', label: 'Changelog' },
    { href: 'mailto:team@dyson.ai', label: 'Contact' },
  ]
  const legal = [
    { href: '#', label: 'Privacy' },
    { href: '#', label: 'Terms' },
    { href: '#', label: 'Security' },
  ]

  return (
    <footer className="border-t border-white/[0.06] px-5 py-14">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white">
              <DysonMark size={20} variant="linked" />
              <span className="text-[15px] font-medium tracking-[-0.015em]">Dyson</span>
            </div>
            <p className="mt-4 max-w-[300px] text-[13px] leading-relaxed text-white/38">
              Context infrastructure for engineering teams.<br />
              Others store what. Dyson explains why.
            </p>
            <p className="mt-4 font-mono text-[11px] text-white/22">
              Private beta · Currently invite-only
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.1em] text-white/45">Product</p>
            <ul className="space-y-2.5">
              {product.map(item => (
                <li key={item.label}>
                  <a href={item.href} className="text-[13px] text-white/38 transition hover:text-white/80">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.1em] text-white/45">Company</p>
            <ul className="space-y-2.5">
              {company.map(item => (
                <li key={item.label}>
                  <a href={item.href} className="text-[13px] text-white/38 transition hover:text-white/80">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.1em] text-white/45">Legal</p>
            <ul className="space-y-2.5">
              {legal.map(item => (
                <li key={item.label}>
                  <a href={item.href} className="text-[13px] text-white/38 transition hover:text-white/80">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-8 md:flex-row md:items-center">
          <p className="text-[12px] text-white/28">© {new Date().getFullYear()} Dyson, Inc. All rights reserved.</p>
          <p className="font-mono text-[11px] text-white/22">The system of record for why.</p>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#08080D] text-white">
      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <ProductSection />
        <PipelineSection />
        <AgentSection />
        <TrustSection />
        <PricingSection />
        <section className="px-5 py-24">
          <div className="mx-auto max-w-[900px] text-center">
            <DysonMark size={54} variant="linked" animate className="mx-auto mb-8 text-white/85" />
            <h2 className="text-[42px] font-medium leading-[1.02] tracking-[-0.045em] text-white sm:text-[64px]">
              Give every engineer and agent the context behind the code.
            </h2>
            <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-relaxed text-white/50">
              Start with Slack and GitHub. Ask one WHY question. Keep the answer grounded.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[14px] font-medium text-[#08080D] transition hover:bg-white/90">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
