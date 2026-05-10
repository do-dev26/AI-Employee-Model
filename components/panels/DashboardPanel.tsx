'use client'
// components/panels/DashboardPanel.tsx

import { useState, useEffect } from 'react'
import { getDashboardStats, getTasks, getActivity, ActivityLog, Task } from '@/lib/firebase'
import { Stat, SectionTitle, Badge, priorityColor } from '@/components/ui'

export default function DashboardPanel({ refresh, onNavigate }: { refresh: number; onNavigate: (page: any) => void }) {
  const [stats, setStats]     = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null)
  const [overdue, setOverdue] = useState<Task[]>([])
  const [pending, setPending] = useState<Task[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDashboardStats(),
      getTasks({ overdue: true }),
      getTasks({ status: 'pending' }),
      getActivity(20),
    ]).then(([s, ov, pe, ac]) => {
      setStats(s)
      setOverdue(ov)
      setPending(pe.slice(0,6))
      setActivity(ac)
      setLoading(false)
    })
  }, [refresh])

  if (loading) return <div style={{ padding:24, color:'var(--text-muted)' }}>Loading dashboard…</div>
  if (!stats)  return null

  return (
    <div style={{ padding:24, height:'100%', overflowY:'auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, color:'var(--gold)' }}>Good day</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', marginTop:2 }}>{today}</div>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24 }}>
        <Stat label="Tasks Pending"  value={stats.tasksPending}  accent="var(--gold)" />
        <Stat
          label="Overdue"
          value={stats.tasksOverdue}
          accent={stats.tasksOverdue > 0 ? 'var(--red)' : 'var(--green)'}
        />
        <Stat label="Active Clients" value={stats.clientsActive} accent="var(--blue)" />
        <Stat
          label="Pipeline"
          value={stats.dealsOpen}
          sub={`$${stats.pipelineValue.toLocaleString()}`}
          accent="var(--purple)"
        />
        <Stat
          label="Won"
          value={`$${(stats.wonValue/1000).toFixed(0)}K`}
          accent="var(--green)"
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, flexWrap:'wrap' }}>
        {/* Overdue tasks */}
        <div>
          <SectionTitle>⚠ Overdue ({overdue.length})</SectionTitle>
          {overdue.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--green)' }}>All clear ✓</div>
          ) : overdue.map(t => (
            <div key={t.id} style={{ padding:'7px 10px', background:'#1A0A0A', border:'1px solid #2A1A1A', borderRadius:6, marginBottom:4, display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:'var(--text)' }}>{t.title}</span>
              <span style={{ color:'var(--red)', fontFamily:'monospace', fontSize:10 }}>{t.dueDate}</span>
            </div>
          ))}
          {overdue.length > 0 && (
            <button onClick={() => onNavigate('tasks')} style={{ fontSize:11, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', marginTop:4 }}>
              View all tasks →
            </button>
          )}
        </div>

        {/* Pending tasks */}
        <div>
          <SectionTitle>Pending Tasks</SectionTitle>
          {pending.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>No pending tasks.</div>
          ) : pending.map(t => (
            <div key={t.id} style={{ padding:'7px 10px', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:6, marginBottom:4, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
              <span style={{ color:'var(--text)' }}>{t.title.slice(0,32)}{t.title.length>32?'…':''}</span>
              <Badge label={t.priority} bg={priorityColor[t.priority]+'22'} color={priorityColor[t.priority]} />
            </div>
          ))}
        </div>

        {/* Activity */}
        <div>
          <SectionTitle>Recent Activity</SectionTitle>
          {activity.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>No activity yet.</div>
          ) : activity.slice(0,10).map((a, i) => (
            <div key={i} style={{ padding:'5px 0', borderBottom:'1px solid var(--border)', display:'flex', gap:8, fontSize:11 }}>
              <span style={{ color:'var(--gold)', flexShrink:0 }}>•</span>
              <span style={{ color:'var(--text-dim)' }}>{a.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
