'use client'
// components/panels/TasksPanel.tsx

import { useState, useEffect, useCallback } from 'react'
import { getTasks, createTask, updateTask, deleteTask, Task, Priority, TaskCategory, TaskStatus } from '@/lib/firebase'
import { Badge, Btn, Input, Select, Empty, SectionTitle, priorityColor } from '@/components/ui'

const CATEGORIES: TaskCategory[] = ['general','follow_up','call','email','proposal','research']
const PRIORITIES: Priority[]     = ['low','medium','high','urgent']
const STATUSES: TaskStatus[]     = ['pending','in_progress','done','cancelled']

const emptyForm = {
  title:'', description:'', clientName:'', priority:'medium' as Priority,
  dueDate:'', category:'general' as TaskCategory, aiNotes:''
}

export default function TasksPanel({ refresh }: { refresh: number }) {
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTasks({ status: statusFilter as TaskStatus || undefined })
      setTasks(data)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load, refresh])

  async function handleAdd() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await createTask({ ...form, status:'pending' })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  async function complete(id: string) {
    await updateTask(id, { status:'done' })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this task?')) return
    await deleteTask(id)
    load()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ padding:24, height:'100%', overflowY:'auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, color:'var(--gold)' }}>Tasks</div>
        <Btn onClick={() => setShowForm(!showForm)}>+ Add Task</Btn>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-gold)', borderRadius:10, padding:16, marginBottom:20, display:'flex', flexDirection:'column', gap:10, animation:'fadeIn 0.2s ease' }}>
          <Input placeholder="Task title *" value={form.title} onChange={e => setForm({...form, title:e.target.value})} />
          <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            <Select value={form.priority} onChange={e => setForm({...form, priority:e.target.value as Priority})}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select value={form.category} onChange={e => setForm({...form, category:e.target.value as TaskCategory})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </Select>
            <Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate:e.target.value})} style={{ padding:'8px' }} />
          </div>
          <Input placeholder="Client name (optional)" value={form.clientName} onChange={e => setForm({...form, clientName:e.target.value})} />
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={handleAdd} disabled={saving || !form.title.trim()}>{saving ? 'Saving…' : 'Create Task'}</Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setForm(emptyForm) }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Status filters */}
      <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap' }}>
        {['','pending','in_progress','done'].map(s => (
          <FilterTab key={s} label={s || 'All'} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ color:'var(--text-muted)', fontSize:13 }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <Empty text="No tasks. Add one above or tell the AI to create one." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              today={today}
              onComplete={() => complete(t.id!)}
              onDelete={() => remove(t.id!)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task: t, today, onComplete, onDelete }: {
  task: Task; today: string; onComplete: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const done    = t.status === 'done'
  const overdue = t.dueDate && t.dueDate < today && !done

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'var(--bg-2)', border:`1px solid ${hovered?'var(--border-gold)':'var(--border)'}`,
        borderRadius:8, padding:'11px 14px', display:'flex', alignItems:'center', gap:12,
        transition:'border-color 0.15s', opacity: done ? 0.55 : 1
      }}
    >
      {/* Complete button */}
      <button onClick={onComplete} disabled={done}
        style={{
          width:20, height:20, borderRadius:'50%', flexShrink:0,
          border:`2px solid ${done ? 'var(--green)' : priorityColor[t.priority] || '#555'}`,
          background: done ? 'var(--green)' : 'transparent',
          cursor: done ? 'default' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, color:'#0A0A0A', transition:'all 0.15s'
        }}>
        {done ? '✓' : ''}
      </button>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color:done?'var(--text-muted)':'var(--text)', textDecoration:done?'line-through':'none', fontFamily:'Georgia,serif' }}>
          {t.title}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap', alignItems:'center' }}>
          {t.clientName && <span style={{ fontSize:10, color:'var(--gold)', fontFamily:'monospace' }}>@{t.clientName}</span>}
          {t.dueDate    && (
            <span style={{ fontSize:10, color:overdue?'var(--red)':'var(--text-muted)', fontFamily:'monospace' }}>
              📅 {t.dueDate}{overdue ? ' OVERDUE' : ''}
            </span>
          )}
          <Badge label={t.category.replace('_',' ')} />
          {t.description && <span style={{ fontSize:10, color:'var(--text-muted)' }}>{t.description.slice(0,50)}{t.description.length>50?'…':''}</span>}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
        <Badge label={t.priority} bg={priorityColor[t.priority]+'22'} color={priorityColor[t.priority]} />
        {hovered && !done && (
          <button onClick={onDelete}
            style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12, padding:'2px 4px' }}
            title="Delete">✕</button>
        )}
      </div>
    </div>
  )
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? 'var(--gold)' : 'transparent',
        border:`1px solid ${active?'var(--gold)':'var(--border)'}`,
        color: active ? '#0A0A0A' : 'var(--text-muted)',
        padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'monospace',
        textTransform:'capitalize', cursor:'pointer', transition:'all 0.15s'
      }}>{label.replace('_',' ')}</button>
  )
}
