import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap } from 'lucide-react'
import { DysonMark } from '@/components/shared/DysonMark'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-8">
          <DysonMark size={32} className="text-primary/50" />
        </div>
        <p className="text-[120px] font-semibold leading-none text-white/[0.04] mb-4 select-none">404</p>
        <h1 className="text-[24px] font-semibold text-ink-1 mb-3 -mt-6">Page not found</h1>
        <p className="text-[14px] text-ink-3 max-w-sm mx-auto mb-8 leading-relaxed">
          This page doesn't exist. The context graph has no record of it either.
        </p>
        <Link to="/">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-[13px] font-medium text-white hover:bg-primary/90 transition-all mx-auto shadow-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>
        </Link>
      </motion.div>
    </div>
  )
}



