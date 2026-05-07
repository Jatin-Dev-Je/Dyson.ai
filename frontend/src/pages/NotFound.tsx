import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[108px] font-bold leading-none text-line select-none mb-2">
        404
      </p>
      <h1 className="text-[22px] font-semibold text-ink-1 mb-2">Page not found</h1>
      <p className="text-[13.5px] text-ink-3 max-w-xs mx-auto mb-8 leading-relaxed">
        This page doesn't exist. The context graph has no record of it either.
      </p>
      <Link to="/app">
        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all shadow-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>
      </Link>
    </div>
  )
}
