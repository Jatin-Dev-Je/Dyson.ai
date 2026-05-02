import { Check, Zap, ArrowRight, CreditCard, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const plans = [
  { name: 'Free',     price: '$0',  period: '',         current: true,  features: ['5 users', '90 days history', 'Slack + GitHub', 'WHY Engine'] },
  { name: 'Team',     price: '$25', period: '/user/mo', current: false, features: ['50 users', 'Full history', 'All connectors', 'Decision Log', 'Onboarding packs', 'Agent API'] },
  { name: 'Business', price: '$45', period: '/user/mo', current: false, features: ['Unlimited users', 'SOC 2', 'SSO', 'Audit log', 'Priority support'] },
]

const invoices = [
  { date: 'Mar 1, 2026', amount: '$0.00', status: 'paid', plan: 'Free' },
  { date: 'Feb 1, 2026', amount: '$0.00', status: 'paid', plan: 'Free' },
  { date: 'Jan 1, 2026', amount: '$0.00', status: 'paid', plan: 'Free' },
]

export default function Billing() {
  return (
    <div className="px-10 py-8 max-w-[720px]">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-ink-1 mb-1">Billing & plan</h1>
        <p className="text-[13px] text-ink-3">Manage your subscription and invoices.</p>
      </div>

      {/* Current plan */}
      <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-[14px] font-semibold text-ink-1">Free plan</span>
              <span className="text-[10px] font-mono text-primary bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-full">Current</span>
            </div>
            <p className="text-[12.5px] text-ink-3">1 of 5 users Â· 90-day history Â· Slack + GitHub</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm">
            Upgrade <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={cn(
              'rounded-xl border p-5 transition-all',
              plan.current
                ? 'border-primary/30 bg-primary/[0.04]'
                : 'border-line bg-surface hover:border-line hover:bg-canvas cursor-pointer'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-ink-1">{plan.name}</span>
              {plan.current && <span className="text-[9px] font-mono text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/20">Active</span>}
            </div>
            <div className="flex items-end gap-0.5 mb-4">
              <span className="text-[26px] font-semibold text-ink-1 leading-none">{plan.price}</span>
              {plan.period && <span className="text-[11px] text-ink-3 mb-0.5">{plan.period}</span>}
            </div>
            <ul className="space-y-1.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-[11.5px] text-ink-3">
                  <Check className="w-3 h-3 text-primary/60 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {!plan.current && (
              <button className="w-full mt-4 py-2 rounded-xl border border-line text-[12px] text-ink-2 hover:text-ink-1 hover:border-primary/40 hover:bg-primary/10 transition-all">
                Upgrade to {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="mb-8">
        <h2 className="text-[14px] font-semibold text-ink-1 mb-3">Payment method</h2>
        <div className="flex items-center justify-between p-4 rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-ink-3" />
            <span className="text-[13px] text-ink-3">No payment method added</span>
          </div>
          <button className="text-[12.5px] text-primary hover:text-primary/80 transition-colors">
            Add card
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="text-[14px] font-semibold text-ink-1 mb-3">Invoice history</h2>
        <div className="rounded-lg border border-line bg-surface overflow-hidden">
          {invoices.map((inv, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-line last:border-0 hover:bg-subtle transition-colors group">
              <span className="text-[13px] text-ink-2 flex-1">{inv.date}</span>
              <span className="text-[13px] font-mono text-ink-2">{inv.amount}</span>
              <span className="text-[11px] font-mono text-green-400 bg-green-500/10 border border-green-500/15 px-2 py-0.5 rounded-full">{inv.status}</span>
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




