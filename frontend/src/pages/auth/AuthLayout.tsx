import { Link } from 'react-router-dom'
import { DysonMark } from '@/components/shared/DysonMark'

export function AuthLayout({ children, wide = false }: {
  children: React.ReactNode
  wide?:    boolean
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at 30% 20%, rgba(91,91,214,0.08), transparent 50%), radial-gradient(circle at 80% 80%, rgba(217,119,6,0.06), transparent 50%), #FAFAF8',
    }}>
      <div style={{ width: '100%', maxWidth: wide ? 520 : 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <DysonMark size={36} className="text-primary" />
            <span style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Dyson</span>
            <span style={{ fontSize: 12.5, color: '#9b9b9b', marginTop: -4 }}>Memory layer for engineering teams</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          border: '1px solid #E8E7E5',
          borderRadius: 14,
          padding: 26,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          {children}
        </div>

        {/* Trust signal */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#b0b0b0', marginTop: 20 }}>
          SOC 2 Type II · Your memories never train public models.
        </p>
      </div>
    </div>
  )
}
