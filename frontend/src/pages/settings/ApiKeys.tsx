import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Copy, Trash2, Eye, EyeOff, Check, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Key = { id: string; name: string; prefix: string; created: string; lastUsed: string; scope: string }

const keys: Key[] = [
  { id: '1', name: 'Production WHY Engine', prefix: 'dys_prod_', created: 'Apr 1, 2026', lastUsed: '2 min ago', scope: 'read' },
  { id: '2', name: 'Dev integration',       prefix: 'dys_dev_',  created: 'Mar 15, 2026', lastUsed: 'Never',   scope: 'read' },
]

export default function ApiKeys() {
  const [apiKeys, setApiKeys]   = useState(keys)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)
  const [newKey, setNewKey]     = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    const key = `dys_prod_${'x'.repeat(32)}`
    setNewKey(key)
    setApiKeys(v => [...v, { id: Date.now().toString(), name: newName, prefix: 'dys_prod_', created: 'Today', lastUsed: 'Never', scope: 'read' }])
    setCreating(false)
    setNewName('')
  }

  function handleCopy(text: string, id: string) {
    void navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleDelete(id: string) {
    setApiKeys(v => v.filter(k => k.id !== id))
  }

  return (
    <div className="px-10 py-8 max-w-[720px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[20px] font-semibold text-white/90 mb-1">API keys</h1>
          <p className="text-[13px] text-white/35">Keys for the Agent Context API and external integrations.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-[0_0_16px_rgba(99,102,241,0.2)] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          New key
        </button>
      </div>

      {/* New key revealed */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-4 rounded-xl border border-green-500/25 bg-green-500/[0.06]"
          >
            <div className="flex items-start gap-2 mb-3">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-green-400">API key created</p>
                <p className="text-[11.5px] text-white/40 mt-0.5">Copy this key — it won't be shown again.</p>
              </div>
              <button onClick={() => setNewKey(null)} className="ml-auto text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#08080E] border border-white/[0.06] font-mono text-[12px] text-white/60">
              <span className="flex-1 truncate">{newKey}</span>
              <button onClick={() => handleCopy(newKey, 'new')} className="text-white/30 hover:text-primary transition-colors flex-shrink-0">
                {copied === 'new' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create modal */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#131320] p-7 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
            >
              <h3 className="text-[16px] font-semibold text-white mb-5">Create API key</h3>
              <div className="mb-5">
                <label className="block text-[12px] font-medium text-white/50 mb-1.5">Key name</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Production WHY Engine"
                  className="w-full h-10 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] text-white placeholder:text-white/20 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCreating(false)} className="flex-1 h-10 rounded-xl border border-white/[0.08] text-[13px] text-white/40 hover:text-white/70 hover:border-white/[0.14] transition-all">Cancel</button>
                <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 h-10 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-all">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys */}
      <div className="space-y-3">
        {apiKeys.map((key, i) => (
          <motion.div
            key={key.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-white/[0.07] bg-[#0F0F17] p-5 group hover:border-white/[0.11] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13.5px] font-medium text-white/80">{key.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] font-mono text-white/25">Created {key.created}</span>
                  <span className="text-white/15">·</span>
                  <span className="text-[11px] font-mono text-white/25">Last used: {key.lastUsed}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#08080E] border border-white/[0.05] font-mono text-[12px]">
              <span className="text-white/40 flex-1">
                {revealed === key.id ? `${key.prefix}${'x'.repeat(32)}` : `${key.prefix}${'•'.repeat(20)}`}
              </span>
              <button onClick={() => setRevealed(revealed === key.id ? null : key.id)} className="text-white/20 hover:text-white/50 transition-colors">
                {revealed === key.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => handleCopy(`${key.prefix}${'x'.repeat(32)}`, key.id)} className="text-white/20 hover:text-primary transition-colors">
                {copied === key.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-white/35 leading-relaxed">
          API keys grant read access to your context graph. Never share them in public repositories or client-side code.
        </p>
      </div>
    </div>
  )
}
