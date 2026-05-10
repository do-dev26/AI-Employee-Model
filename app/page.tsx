'use client'
// app/page.tsx — Main app shell with sidebar + panel routing

import { useState, useEffect } from 'react'
import DashboardPanel from '@/components/panels/DashboardPanel'
import ChatPanel from '@/components/panels/ChatPanel'
import TasksPanel from '@/components/panels/TasksPanel'
import ClientsPanel from '@/components/panels/ClientsPanel'
import PipelinePanel from '@/components/panels/PipelinePanel'

type Page = 'dashboard' | 'chat' | 'tasks' | 'clients' | 'pipeline'

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'chat',      label: 'AI Chat',   icon: '◉' },
  { id: 'tasks',     label: 'Tasks',     icon: '◆' },
  { id: 'clients',   label: 'Clients',   icon: '▣' },
  { id: 'pipeline',  label: 'Pipeline',  icon: '▲' },
]

export default function Home() {
  const [page, setPage] = useState<Page>('chat')
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)' }}>
      {/* ── Header ── */}
      <header style={{
        padding:'14px 24px', borderBottom:'1px solid var(--border)',
        background:'var(--bg-1)', display:'flex', alignItems:'center',
        justifyContent:'space-between', flexShrink:0, zIndex:10
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:36, height:36, borderRadius:'50%',
            background:'linear-gradient(135deg, #C8A96E, #6B4C10)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, fontWeight:700, color:'#0A0A0A',
            boxShadow:'0 0 16px rgba(200,169,110,0.3)'
          }}>✦</div>
          <div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontWeight:700, color:'var(--gold)' }}>
              AI Employee
            </div>
            <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.12em', fontFamily:'JetBrains Mono,monospace' }}>
              PERSONAL BUSINESS ASSISTANT
            </div>
          </div>
        </div>
        {/* Active page indicator */}
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>
          {NAV.find(n => n.id === page)?.icon} {NAV.find(n => n.id === page)?.label}
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* Sidebar */}
        <nav style={{
          width:186, background:'var(--bg-1)', borderRight:'1px solid var(--border)',
          padding:'16px 10px', display:'flex', flexDirection:'column', gap:4, flexShrink:0
        }}>
          {NAV.map(n => (
            <NavBtn key={n.id} item={n} active={page === n.id} onClick={() => setPage(n.id)} />
          ))}
          <div style={{ marginTop:'auto', padding:'12px 8px', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', lineHeight:1.8 }}>
              Target: $5K–$10K<br/>Mode: Founder
            </div>
          </div>
        </nav>

        {/* Panel content */}
        <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {page === 'dashboard' && <DashboardPanel refresh={refreshKey} onNavigate={(p: Page) => setPage(p)} />}
          {page === 'chat'      && <ChatPanel onRefresh={refresh} />}
          {page === 'tasks'     && <TasksPanel refresh={refreshKey} />}
          {page === 'clients'   && <ClientsPanel refresh={refreshKey} />}
          {page === 'pipeline'  && <PipelinePanel refresh={refreshKey} />}
        </main>
      </div>
    </div>
  )
}

function NavBtn({ item, active, onClick }: { item: typeof NAV[0]; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'linear-gradient(135deg, #1C1408, #251B0A)' : hovered ? 'var(--bg-2)' : 'transparent',
        border: `1px solid ${active ? 'var(--gold)' : hovered ? 'var(--border-gold)' : 'var(--border)'}`,
        color: active ? 'var(--gold)' : hovered ? '#8a7a60' : 'var(--text-muted)',
        padding:'10px 12px', borderRadius:8, textAlign:'left', fontSize:13,
        fontFamily:'Georgia,serif', display:'flex', alignItems:'center', gap:10,
        transition:'all 0.15s', width:'100%'
      }}
    >
      <span style={{ fontSize:15 }}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  )
}
