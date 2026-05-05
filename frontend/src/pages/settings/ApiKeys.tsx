import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Copy, Trash2, Eye, EyeOff, Check, AlertCircle, X } from 'lucide-react'

type ApiKey = { id: string; name: string; prefix: string; created: string; lastUsed: string; scope: string }

const INITIAL_KEYS: ApiKey[] = [
  { id: '1', name: 'Production context API', prefix: 'dys_prod_', created: 'Apr 1, 2026',   lastUsed: '2 min ago', scope: 'read' },
  { id: '2', name: 'Dev integration',        prefix: 'dys_dev_',  created: 'Mar 15, 2026',  lastUsed: 'Never',     scope: 'read' },
]

export default function ApiKeys() {
  const [apiKeys,   setApiKeys]   = useState(INITIAL_KEYS)
  const [creating,  setCreating]  = useState(false)
  const [newName,   setNewName]   = useState('')
  const [revealed,  setRevealed]  = useState<string | null>(null)
  const [copied,    setCopied]    = useState<string | null>(null)
  const [newKey,    setNewKey]    = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim()) return
    const raw = `dys_prod_${'x'.repeat(32)}`
    setNewKey(raw)
    setApiKeys(v => [...v, {
      id: Date.now().toString(), name: newName.trim(),
      prefix: 'dys_prod_', created: 'Today', lastUsed: 'Never', scope: 'read',
    }])
    setCreating(false)
    setNewName('')
  }

  function handleCopy(text: string, id: string) {
    void navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="px-7 py-7 max-w-[680px]">

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[19px] font-semibold text-ink-1 mb-1">API keys</h1>
          <p className="text-[13px] text-ink-3">Keys for the Agent Context API and MCP server.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" /> New key
        </button>
      </div>

      {/* New key banner */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-5 p-4 rounded-xl border border-green-200 bg-green-50"
          >
            <div className="flex items-start gap-2 mb-3">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-green-700">API key created</p>
                <p className="text-[11.5px] text-green-600/80 mt-0.5">Copy this key — it won't be shown again.</p>
              </div>
              <button onClick={() => setNewKey(null)} className="text-green-500 hover:text-green-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-green-200 font-mono text-[12px] text-ink-2">
              <span className="flex-1 truncate">{newKey}</span>
              <button onClick={() => handleCopy(newKey, 'new')} className="text-ink-3 hover:text-primary transition-colors flex-shrink-0">
                {copied === 'new' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.97, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 8 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[16px] font-semibold text-ink-1">Create API key</h3>
                <button onClick={() => setCreating(false)} className="text-ink-3 hover:text-ink-1 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-5">
                <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Key name</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Production context API"
                  className="w-full h-10 px-3.5 rounded-xl border border-line bg-subtle text-[13px] text-ink-1 placeholder:text-ink-4 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCreating(false)}
                  className="flex-1 h-10 rounded-xl border border-line text-[13px] text-ink-3 hover:text-ink-2 hover:border-line-strong hover:bg-subtle transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex-1 h-10 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-all"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key list */}
      <div className="space-y-2.5">
        {apiKeys.map((key, i) => (
          <motion.div
            key={key.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-line bg-white p-4 group hover:border-line-strong hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13.5px] font-medium text-ink-1">{key.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-ink-3">Created {key.created}</span>
                  <span className="text-ink-4 text-[10px]">·</span>
                  <span className="text-[11px] font-mono text-ink-3">Last used: {key.lastUsed}</span>
                </div>
              </div>
              <button
                onClick={() => setApiKeys(v => v.filter(k => k.id !== key.id))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-4 hover:text-danger hover:bg-red-500/[0.08] opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-subtle border border-line font-mono text-[12px]">
              <span className="text-ink-3 flex-1 truncate">
                {revealed === key.id ? `${key.prefix}${'x'.repeat(32)}` : `${key.prefix}${'•'.repeat(20)}`}
              </span>
              <button
                onClick={() => setRevealed(revealed === key.id ? null : key.id)}
                className="text-ink-4 hover:text-ink-2 transition-colors"
              >
                {revealed === key.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleCopy(`${key.prefix}${'x'.repeat(32)}`, key.id)}
                className="text-ink-4 hover:text-primary transition-colors"
              >
                {copied === key.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notice */}
      <div className="mt-5 p-4 rounded-xl border border-line bg-subtle flex items-start gap-3">
        <AlertCircle className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-ink-3 leading-relaxed">
          API keys grant read access to your context graph. Never share them in public repositories or client-side code.
        </p>
      </div>
    </div>
  )
}
