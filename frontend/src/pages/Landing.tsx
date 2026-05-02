import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Brain, Network, Users, GitPullRequest, MessageSquare,
  Check, ChevronRight, Zap, Shield, Globe, Menu, X,
} from 'lucide-react'
import { DysonMark } from '@/components/shared/DysonMark'
import { SourcePill } from '@/components/shared/SourcePill'
import { cn } from '@/lib/utils'

// ─── Nav ──────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="border-b border-line bg-surface/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <DysonMark size={18} className="text-primary" />
          <span className="text-[15px] font-semibold text-ink-1">Dyson</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {['Product', 'Docs', 'Pricing', 'Blog'].map(l => (
            <a key={l} href="#" className="text-[13px] text-ink-3 hover:text-ink-1 transition-colors">{l}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <button className="text-[13px] text-ink-2 hover:text-ink-1 transition-colors px-4 py-2">Sign in</button>
          </Link>
          <Link to="/signup">
            <button className="h-8 px-4 bg-primary text-[13px] font-medium text-white rounded-md hover:bg-primary-hover transition-colors shadow-sm">
              Start free
            </button>
          </Link>
        </div>

        <button className="md:hidden text-ink-2 hover:text-ink-1" onClick={() => setOpen(v => !v)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-line px-6 py-4 space-y-3 bg-surface">
          {['Product', 'Docs', 'Pricing', 'Blog'].map(l => (
            <a key={l} href="#" className="block text-[14px] text-ink-2 hover:text-ink-1 transition-colors py-1">{l}</a>
          ))}
          <div className="flex gap-3 pt-2 border-t border-line">
            <Link to="/login" className="flex-1"><button className="w-full h-9 border border-line rounded-md text-[13px] text-ink-2 hover:bg-subtle transition-colors">Sign in</button></Link>
            <Link to="/signup" className="flex-1"><button className="w-full h-9 bg-primary rounded-md text-[13px] font-medium text-white hover:bg-primary-hover transition-colors">Start free</button></Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="max-w-[1100px] mx-auto px-6 pt-20 pb-16 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.04] text-[12px] font-medium text-primary mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Now with MCP — connect any AI coding agent
        <ChevronRight className="w-3.5 h-3.5" />
      </div>

      <h1 className="text-[48px] sm:text-[58px] font-semibold text-ink-1 tracking-tight leading-[1.1] mb-6 max-w-[800px] mx-auto">
        Your company never<br />
        <span className="text-primary">forgets</span>
      </h1>

      <p className="text-[18px] text-ink-2 leading-relaxed max-w-[560px] mx-auto mb-10">
        Dyson is the persistent memory layer for your engineering team.
        Every decision, incident, and context — connected, searchable,
        and available to every person and AI agent that needs it.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
        <Link to="/signup">
          <button className="h-11 px-6 bg-primary text-[14px] font-medium text-white rounded-md hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2">
            Start free — no credit card
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <a href="#demo">
          <button className="h-11 px-6 bg-surface border border-line text-[14px] text-ink-2 rounded-md hover:bg-subtle hover:border-line-strong transition-colors flex items-center gap-2">
            See how it works
            <ChevronRight className="w-4 h-4 text-ink-4" />
          </button>
        </a>
      </div>

      {/* Social proof */}
      <div className="flex items-center justify-center gap-8 flex-wrap">
        {[
          'Trusted by engineering teams',
          '< 3s average recall time',
          '100% tenant-isolated',
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] text-ink-3">
            <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
            {t}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Product demo ──────────────────────────────────────────────────────────
const demoMemories = [
  { date:'Mar 12', source:'slack'   as const, text:'Rate-limit bug reported in #incidents — session flooding at peak load' },
  { date:'Mar 14', source:'notion'  as const, text:'RFC drafted: JWT migration proposal — 3 contributors' },
  { date:'Mar 17', source:'meeting' as const, text:'Design review — decision recorded: swap to JWT by Mar 31' },
  { date:'Mar 19', source:'github'  as const, text:'PR #4502 merged — cites RFC + design review meeting' },
]

function ProductDemo() {
  return (
    <section id="demo" className="max-w-[1100px] mx-auto px-6 pb-24">
      <div className="bg-surface border border-line rounded-xl shadow-md overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-subtle">
          <div className="flex gap-1.5">
            {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map((c, i) => (
              <div key={i} className={cn('w-2.5 h-2.5 rounded-full', c)} />
            ))}
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-surface border border-line rounded-md px-4 py-1 text-[11px] text-ink-3 font-mono">
              app.dyson.ai / recall
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Recall input */}
          <div className="p-8 border-b lg:border-b-0 lg:border-r border-line">
            <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-4">Memory recall</p>
            <div className="flex items-center gap-3 bg-subtle border border-line rounded-lg px-4 py-3 mb-6">
              <Brain className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-[14px] text-ink-2">Why did we move to JWT auth?</span>
            </div>

            <div className="space-y-3 mb-6">
              {demoMemories.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber" />
                    {i < demoMemories.length - 1 && <div className="w-px h-6 bg-line mt-1" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono text-ink-4">{m.date}</span>
                      <SourcePill source={m.source} />
                    </div>
                    <p className="text-[12px] text-ink-2 leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber/[0.06] border border-amber/25 rounded-lg p-4">
              <p className="text-[10px] font-semibold text-amber uppercase tracking-wider mb-2">Answer · 91% confidence</p>
              <p className="text-[13px] text-ink-1 leading-relaxed">
                The shift to JWT was triggered by a rate-limit incident on Mar 12 that exposed session token flooding under load. After an RFC and design review, the decision was shipped via PR #4502 on Mar 19.
              </p>
            </div>
          </div>

          {/* MCP code panel */}
          <div className="p-8">
            <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider mb-4">Agent integration · MCP</p>
            <div className="bg-ink-1 rounded-lg p-4 font-mono text-[12px] leading-relaxed overflow-hidden">
              <p className="text-ink-4 mb-2"># In Cursor / Claude Code</p>
              <p className="text-green-400">use_mcp_tool(<span className="text-amber">"dyson"</span>, <span className="text-amber">"recall"</span>,</p>
              <p className="text-white pl-4">{'{'}<span className="text-blue-300">"question"</span>: <span className="text-amber">"What constraints exist on auth?"</span>{'}'}</p>
              <p className="text-green-400">)</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-ink-4"># Response</p>
                <p className="text-white">{'{'}</p>
                <p className="text-white pl-4"><span className="text-blue-300">"answer"</span>: <span className="text-amber">"JWT with 15min TTL..."</span>,</p>
                <p className="text-white pl-4"><span className="text-blue-300">"confidence"</span>: <span className="text-green-400">0.91</span>,</p>
                <p className="text-white pl-4"><span className="text-blue-300">"citations"</span>: <span className="text-green-400">[...]</span></p>
                <p className="text-white">{'}'}</p>
              </div>
            </div>
            <p className="text-[12px] text-ink-3 mt-4">
              Any MCP-compatible agent gets full company memory. Works with Cursor, Claude Code, Copilot Chat, and custom agents.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: Brain,
    title: 'Recall anything',
    desc: 'Ask natural language questions about what your company knows. Get cited answers with confidence scores — or honest "I don\'t know."',
  },
  {
    icon: Network,
    title: 'Memory graph',
    desc: 'Every decision, incident, and context is connected causally. See why things happened, not just what happened.',
  },
  {
    icon: Users,
    title: 'Team briefings',
    desc: 'New engineers get up to speed in hours instead of weeks. Dyson generates context packs from real company memory.',
  },
  {
    icon: Zap,
    title: 'Automatic ingestion',
    desc: 'Connect Slack, GitHub, and Notion. Dyson ingests, normalizes, and connects events without anyone writing a doc.',
  },
  {
    icon: Globe,
    title: 'Agent memory',
    desc: 'AI agents read and write company memory via MCP or REST. Every agent action can become institutional knowledge.',
  },
  {
    icon: Shield,
    title: 'Built for trust',
    desc: 'Every answer is cited. Confidence gates prevent hallucination. Tenant-isolated. Your data never trains shared models.',
  },
]

function Features() {
  return (
    <section className="border-t border-line bg-subtle">
      <div className="max-w-[1100px] mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-[32px] font-semibold text-ink-1 tracking-tight mb-4">
            Everything a company needs to remember
          </h2>
          <p className="text-[16px] text-ink-3 max-w-[520px] mx-auto">
            From Slack threads to GitHub PRs to meeting notes — Dyson captures it all and makes it queryable.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="bg-surface border border-line rounded-lg p-6 hover:border-line-strong hover:shadow-sm transition-all">
              <div className="w-9 h-9 bg-primary/[0.06] border border-primary/15 rounded-md flex items-center justify-center mb-4">
                <f.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="text-[14px] font-semibold text-ink-1 mb-2">{f.title}</h3>
              <p className="text-[13px] text-ink-3 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Sources ───────────────────────────────────────────────────────────────
function Sources() {
  return (
    <section className="max-w-[1100px] mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <h2 className="text-[28px] font-semibold text-ink-1 tracking-tight mb-3">
          Works with your stack
        </h2>
        <p className="text-[15px] text-ink-3">Connect where your team works. More integrations coming.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { name: 'Slack',   desc: 'Channels, threads, DMs',    available: true,  dot: 'bg-[#E01E5A]' },
          { name: 'GitHub',  desc: 'PRs, issues, code reviews', available: true,  dot: 'bg-[#656D76]' },
          { name: 'Notion',  desc: 'Docs, wikis, databases',    available: false, dot: 'bg-[#37352F]' },
          { name: 'Linear',  desc: 'Issues, cycles, projects',  available: false, dot: 'bg-[#5E6AD2]' },
        ].map(s => (
          <div key={s.name} className={cn(
            'bg-surface border rounded-lg p-5 text-center',
            s.available ? 'border-line hover:border-line-strong hover:shadow-sm transition-all' : 'border-line opacity-50'
          )}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={cn('w-2 h-2 rounded-full', s.dot)} />
              <span className="text-[14px] font-semibold text-ink-1">{s.name}</span>
            </div>
            <p className="text-[12px] text-ink-3 mb-2">{s.desc}</p>
            <span className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
              s.available ? 'bg-green-50 text-success border border-green-200' : 'bg-subtle text-ink-4 border border-line'
            )}>
              {s.available ? 'Available' : 'Coming soon'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Pricing ───────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'For small teams getting started.',
    features: ['Up to 5 users', 'Slack + GitHub', '30 days memory', 'Community support'],
    cta: 'Start free',
    primary: false,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    desc: 'For teams that can\'t lose context.',
    features: ['Unlimited users', 'All integrations', 'Unlimited memory', 'Agent API + MCP', 'Priority support'],
    cta: 'Start trial',
    primary: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For orgs with compliance needs.',
    features: ['SSO / SAML', 'Audit logs', 'Custom retention', 'SLA', 'Dedicated support'],
    cta: 'Contact us',
    primary: false,
  },
]

function Pricing() {
  return (
    <section className="border-t border-line bg-subtle">
      <div className="max-w-[1100px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-[28px] font-semibold text-ink-1 tracking-tight mb-3">Simple pricing</h2>
          <p className="text-[15px] text-ink-3">Start free. Upgrade when your team grows.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[900px] mx-auto">
          {plans.map(p => (
            <div key={p.name} className={cn(
              'bg-surface rounded-xl border p-7 flex flex-col',
              p.primary ? 'border-primary/30 shadow-md ring-1 ring-primary/10' : 'border-line hover:border-line-strong transition-colors'
            )}>
              {p.primary && (
                <div className="text-[10px] font-semibold text-primary bg-primary/[0.06] border border-primary/20 rounded-full px-2.5 py-1 w-fit mb-4">
                  Most popular
                </div>
              )}
              <p className="text-[14px] font-semibold text-ink-1 mb-1">{p.name}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[32px] font-bold text-ink-1 tracking-tight">{p.price}</span>
                {p.period && <span className="text-[13px] text-ink-3">{p.period}</span>}
              </div>
              <p className="text-[12px] text-ink-3 mb-6">{p.desc}</p>

              <ul className="space-y-2.5 flex-1 mb-7">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    <span className="text-[13px] text-ink-2">{f}</span>
                  </li>
                ))}
              </ul>

              <Link to={p.name === 'Enterprise' ? '/contact' : '/signup'}>
                <button className={cn(
                  'w-full h-9 rounded-md text-[13px] font-medium transition-colors',
                  p.primary
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                    : 'bg-subtle border border-line text-ink-2 hover:bg-hover hover:border-line-strong'
                )}>
                  {p.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="max-w-[1100px] mx-auto px-6 py-20 text-center">
      <h2 className="text-[32px] font-semibold text-ink-1 tracking-tight mb-4">
        Your company's memory starts today
      </h2>
      <p className="text-[16px] text-ink-3 max-w-[480px] mx-auto mb-8">
        Connect Slack and GitHub in minutes. Your first recall is ready in under an hour.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/signup">
          <button className="h-11 px-6 bg-primary text-[14px] font-medium text-white rounded-md hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-2">
            Start free
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
        <Link to="/login">
          <button className="h-11 px-6 text-[14px] text-ink-2 hover:text-ink-1 transition-colors">
            Sign in →
          </button>
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-line bg-subtle">
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DysonMark size={16} className="text-primary" />
              <span className="text-[14px] font-semibold text-ink-1">Dyson</span>
            </div>
            <p className="text-[12px] text-ink-3 max-w-[240px] leading-relaxed">
              Company memory infrastructure for engineering teams.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px]">
            {[
              { label: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { label: 'Developers', links: ['API Docs', 'MCP Guide', 'GitHub', 'Status'] },
              { label: 'Company', links: ['About', 'Blog', 'Privacy', 'Terms'] },
            ].map(col => (
              <div key={col.label}>
                <p className="text-[11px] font-semibold text-ink-4 uppercase tracking-[0.06em] mb-3">{col.label}</p>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-ink-3 hover:text-ink-1 transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line mt-8 pt-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-ink-4">© 2026 Dyson. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {['Twitter', 'GitHub', 'LinkedIn'].map(l => (
              <a key={l} href="#" className="text-[11px] text-ink-4 hover:text-ink-2 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="bg-canvas min-h-screen">
      <Nav />
      <Hero />
      <ProductDemo />
      <Features />
      <Sources />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
