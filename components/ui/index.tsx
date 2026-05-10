// components/ui/index.tsx — Reusable UI primitives

import { ReactNode, CSSProperties } from 'react'

// ── Colors ────────────────────────────────────────────────────
export const priorityColor: Record<string, string> = {
  urgent: '#FF4D4D', high: '#FF8C42', medium: '#C8A96E', low: '#6A8A6A'
}
export const stageColor: Record<string, string> = {
  lead: '#555', qualified: '#C8A96E', proposal_sent: '#4D90C8',
  negotiating: '#A64DC8', closed_won: '#4DC87A', closed_lost: '#C84D4D'
}
export const stageLabel: Record<string, string> = {
  lead: 'Lead', qualified: 'Qualified', proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating', closed_won: 'Closed Won', closed_lost: 'Closed Lost'
}
export const statusColor: Record<string, string> = {
  prospect: '#C8A96E', active: '#4DC87A', closed: '#4D90C8', lost: '#888'
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ label, bg = '#1E1E1E', color = '#888' }: { label: string; bg?: string; color?: string }) {
  return (
    <span style={{
      background: bg, color, padding:'2px 8px', borderRadius:10,
      fontSize:10, fontFamily:'JetBrains Mono,monospace', letterSpacing:'0.04em',
      display:'inline-block', whiteSpace:'nowrap'
    }}>{label}</span>
  )
}

// ── Stat card ─────────────────────────────────────────────────
export function Stat({ label, value, sub, accent = 'var(--gold)' }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background:'var(--bg-2)', border:'1px solid var(--border)',
      borderRadius:10, padding:'16px 20px', flex:1, minWidth:130
    }}>
      <div style={{ fontSize:26, fontWeight:700, color:accent, fontFamily:'JetBrains Mono,monospace' }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:'var(--gold)', marginTop:4, fontFamily:'monospace' }}>{sub}</div>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize:11, color:'var(--gold)', fontFamily:'JetBrains Mono,monospace',
      letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10
    }}>{children}</div>
  )
}

// ── Input ────────────────────────────────────────────────────
export function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background:'var(--bg-1)', border:'1px solid var(--border-gold)',
        color:'var(--text)', padding:'8px 12px', borderRadius:6,
        fontSize:13, width:'100%', ...style
      }}
    />
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        background:'var(--bg-1)', border:'1px solid var(--border-gold)',
        color:'var(--text)', padding:'8px', borderRadius:6, fontSize:12, ...style
      }}
    />
  )
}

// ── Button ────────────────────────────────────────────────────
export function Btn({
  children, variant = 'primary', onClick, disabled, style, small
}: {
  children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'
  onClick?: () => void; disabled?: boolean; style?: CSSProperties; small?: boolean
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background:'linear-gradient(135deg,#C8A96E,#8B6914)', color:'#0A0A0A', border:'none', fontWeight:700 },
    ghost:   { background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border)' },
    danger:  { background:'transparent', color:'#FF4D4D', border:'1px solid #2A1A1A' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '5px 12px' : '8px 18px',
        borderRadius:6, fontSize: small ? 11 : 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition:'all 0.15s',
        ...styles[variant],
        ...style
      }}
    >{children}</button>
  )
}

// ── Loading spinner ───────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{
      width:16, height:16, borderRadius:'50%',
      border:'2px solid var(--border)', borderTopColor:'var(--gold)',
      animation:'spin 0.8s linear infinite', display:'inline-block'
    }} />
  )
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ text }: { text: string }) {
  return (
    <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'40px 0' }}>{text}</div>
  )
}
