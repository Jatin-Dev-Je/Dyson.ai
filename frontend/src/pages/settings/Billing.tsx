import { Check, Zap, ArrowRight, CreditCard, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Free', price: '$0', period: '', current: true,
    features: ['5 users', '90 days history', 'Slack + GitHub', 'Memory recall'],
  },
  {
    name: 'Team', price: '$25', period: '/user/mo', current: false,
    features: ['50 users', 'Full history', 'All connectors', 'Memory graph', 'Onboarding packs', 'Agent API'],
  },
  {
    name: 'Business', price: '$45', period: '/user/mo', current: false,
    features: ['Unlimited users', 'SOC 2 Type II', 'SSO / SAML', 'Audit log', 'Priority support'],
  },
]

const invoices = [
  { date: 'Mar 1, 2026', amount: '$0.00', status: 'paid', plan: 'Free' },
  { date: 'Feb 1, 2026', amount: '$0.00', status: 'paid', plan: 'Free' },
]

export default function Billing() {
  return (
    <div className="px-7 py-7 max-w-[680px]">

      <div className="mb-7">
        <h1 className="text-[19px] font-semibold text-ink-1 mb-1">Billing & plan</h1>
        <p className="text-[13px] text-ink-3">Manage your subscription and invoices.</p>
      </div>

      {/* Current plan banner */}
      <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-[14px] font-semibold text-ink-1">Free plan</span>
              <span className="text-[10px] font-mono text-primary bg-primary/[0.12] border border-primary/20 px-2 py-0.5 rounded-full">Current</span>
            </div>
            <p className="text-[12px] text-ink-3">1 of 5 users · 90-day history · Slack + GitHub</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm">
            Upgrade <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={cn(
              'rounded-xl border p-4 transition-all',
              plan.current
                ? 'border-primary/25 bg-primary/[0.03]'
                : 'border-line bg-white hover:border-line-strong hover:shadow-sm cursor-pointer',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-ink-1">{plan.name}</span>
              {plan.current && (
                <span className="text-[9px] font-mono text-primary bg-primary/[0.12] px-2 py-0.5 rounded-full border border-primary/20">Active</span>
              )}
            </div>
            <div className="flex items-end gap-0.5 mb-4">
              <span className="text-[24px] font-semibold text-ink-1 leading-none">{plan.price}</span>
              {plan.period && <span className="text-[10px] text-ink-3 mb-1">{plan.period}</span>}
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-ink-3">
                  <Check className="w-3 h-3 text-primary/60 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <button className="w-full py-1.5 rounded-xl border border-line text-[11.5px] text-ink-2 hover:text-ink-1 hover:border-primary/40 hover:bg-primary/[0.06] transition-all">
                Upgrade to {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="mb-6">
        <h2 className="text-[13.5px] font-semibold text-ink-1 mb-3">Payment method</h2>
        <div className="flex items-center justify-between p-4 rounded-xl border border-line bg-white hover:border-line-strong transition-colors">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-ink-3" />
            <span className="text-[13px] text-ink-3">No payment method added</span>
          </div>
          <button className="text-[12.5px] text-primary font-medium hover:text-primary/80 transition-colors">
            Add card
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="text-[13.5px] font-semibold text-ink-1 mb-3">Invoice history</h2>
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          {invoices.map((inv, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-0 hover:bg-subtle transition-colors group"
            >
              <span className="text-[13px] text-ink-2 flex-1">{inv.date}</span>
              <span className="text-[13px] font-mono text-ink-2">{inv.amount}</span>
              <span className="text-[10px] font-mono text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                {inv.status}
              </span>
              <button className="text-ink-4 hover:text-ink-2 transition-colors opacity-0 group-hover:opacity-100">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
