'use client'
// components/panels/ClientsPanel.tsx

import { useState, useEffect, useCallback } from 'react'
import { getClients, getClient, createClient, updateClient, getTasks, getDeals, getProposals, Client, ClientStatus } from '@/lib/firebase'
import { Badge, Btn, Input, Select, Empty, SectionTitle, statusColor, priorityColor, stageColor, stageLabel } from '@/components/ui'

const emptyForm: Omit<Client,'id'|'createdAt'|'updatedAt'> = {
  name:'', business:'', email:'', phone:'', revenue:'', website:'', status:'prospect', notes:''
}

export default function ClientsPanel({ refresh }: { refresh: number }) {
  const [clients, setClients]     = useState<Client[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClients()
      setClients(data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load, refresh])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.business || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd() {
    if (!form.name.trim()) return
    await createClient(form)
    setForm(emptyForm)
    setShowAdd(false)
    load()
  }

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* ── Client list ── */}
      <div style={{ width:290, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:16, borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, color:'var(--gold)' }}>Clients</span>
            <Btn small onClick={() => setShowAdd(!showAdd)}>+ Add</Btn>
          </div>
          <Input
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ padding:12, borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6, animation:'fadeIn 0.2s ease' }}>
            {([['name','Name *'],['business','Business'],['email','Email'],['phone','Phone'],['revenue','Revenue e.g. $25K/mo'],['website','Website']] as const).map(([k,l]) => (
              <Input key={k} placeholder={l} value={form[k as keyof typeof emptyForm] as string || ''} onChange={e => setForm({...form, [k]:e.target.value})} style={{ fontSize:12, padding:'6px 10px' }} />
            ))}
            <Select value={form.status} onChange={e => setForm({...form, status:e.target.value as ClientStatus})}>
              {['prospect','active','closed','lost'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <textarea
              placeholder="Notes"
              value={form.notes || ''}
              onChange={e => setForm({...form, notes:e.target.value})}
              rows={2}
              style={{ background:'var(--bg-1)', border:'1px solid var(--border-gold)', color:'var(--text)', padding:'6px 10px', borderRadius:6, fontSize:12, resize:'none' }}
            />
            <div style={{ display:'flex', gap:6 }}>
              <Btn small onClick={handleAdd}>Save</Btn>
              <Btn small variant="ghost" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</Btn>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading && <div style={{ padding:16, color:'var(--text-muted)', fontSize:12 }}>Loading…</div>}
          {!loading && filtered.length === 0 && <Empty text="No clients found." />}
          {filtered.map(c => (
            <ClientListItem
              key={c.id}
              client={c}
              selected={selected === c.id}
              onClick={() => setSelected(c.id!)}
            />
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected
        ? <ClientDetail clientId={selected} key={selected} onUpdate={load} />
        : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>
            Select a client to view details
          </div>
      }
    </div>
  )
}

function ClientListItem({ client:c, selected, onClick }: { client:Client; selected:boolean; onClick:()=>void }) {
  const [hov, setHov] = useState(false)
  const dotColor = statusColor[c.status] || '#555'
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'12px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer',
        background: selected ? 'var(--gold-dark)' : hov ? 'var(--bg-2)' : 'transparent',
        transition:'background 0.12s'
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:13, color:'var(--text)', fontFamily:'Georgia,serif' }}>{c.name}</div>
        <div style={{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
      </div>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{c.business || '—'}</div>
      {c.revenue && <div style={{ fontSize:10, color:'var(--gold)', fontFamily:'monospace', marginTop:2 }}>{c.revenue}</div>}
    </div>
  )
}

function ClientDetail({ clientId, onUpdate }: { clientId:string; onUpdate:()=>void }) {
  const [client, setClient]  = useState<Client | null>(null)
  const [tasks, setTasks]    = useState<ReturnType<typeof getTasks> extends Promise<infer T> ? T : []>([])
  const [deals, setDeals]    = useState<ReturnType<typeof getDeals> extends Promise<infer T> ? T : []>([])
  const [editing, setEditing]= useState(false)
  const [form, setForm]      = useState<Partial<Client>>({})

  useEffect(() => {
    Promise.all([
      getClient(clientId),
      getTasks({ clientId }),
      getDeals(),
    ]).then(([c, t, d]) => {
      setClient(c)
      setTasks(t as any)
      setDeals((d as any).filter((deal: any) => deal.clientId === clientId))
      if (c) setForm(c)
    })
  }, [clientId])

  if (!client) return <div style={{ flex:1, padding:24, color:'var(--text-muted)' }}>Loading…</div>

  async function save() {
    await updateClient(clientId, form)
    setEditing(false)
    onUpdate()
    const updated = await getClient(clientId)
    setClient(updated)
  }

  const taskList = tasks as any[]
  const dealList = deals as any[]

  return (
    <div style={{ flex:1, overflowY:'auto', padding:24 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:'var(--gold)' }}>{client.name}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            {client.business}{client.email ? ` · ${client.email}` : ''}{client.phone ? ` · ${client.phone}` : ''}
          </div>
          <div style={{ display:'flex', gap:6, marginTop:8 }}>
            {client.revenue && <Badge label={client.revenue} bg="var(--gold-dark)" color="var(--gold)" />}
            <Badge label={client.status} bg={{prospect:'#2a2218',active:'#1a2e1a',closed:'#1a1a2e',lost:'#2a1a1a'}[client.status]||'#222'} color={statusColor[client.status]||'#888'} />
          </div>
        </div>
        <Btn small variant="ghost" onClick={() => setEditing(!editing)}>{editing?'Cancel':'Edit'}</Btn>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-gold)', borderRadius:8, padding:14, marginBottom:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, animation:'fadeIn 0.2s ease' }}>
          {(['name','business','email','phone','revenue','website'] as const).map(k => (
            <Input key={k} placeholder={k} value={form[k] as string||''} onChange={e => setForm({...form,[k]:e.target.value})} style={{ fontSize:12 }} />
          ))}
          <textarea placeholder="Notes" value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} rows={2}
            style={{ gridColumn:'1/-1', background:'var(--bg-1)', border:'1px solid var(--border-gold)', color:'var(--text)', padding:'8px', borderRadius:6, fontSize:12, resize:'none' }} />
          <Select value={form.status||'prospect'} onChange={e => setForm({...form,status:e.target.value as ClientStatus})} style={{ fontSize:12 }}>
            {['prospect','active','closed','lost'].map(s=><option key={s} value={s}>{s}</option>)}
          </Select>
          <Btn onClick={save}>Save Changes</Btn>
        </div>
      )}

      {/* Tasks */}
      <SectionTitle>Tasks ({taskList.length})</SectionTitle>
      {taskList.length === 0 ? <Empty text="No tasks for this client." /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
          {taskList.slice(0,6).map((t:any) => (
            <div key={t.id} style={{ padding:'6px 10px', background:'var(--bg-2)', borderRadius:6, display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:t.status==='done'?'var(--text-muted)':'var(--text)', textDecoration:t.status==='done'?'line-through':'none' }}>{t.title}</span>
              <Badge label={t.priority} bg={priorityColor[t.priority]+'22'} color={priorityColor[t.priority]} />
            </div>
          ))}
        </div>
      )}

      {/* Deals */}
      <SectionTitle>Deals ({dealList.length})</SectionTitle>
      {dealList.length === 0 ? <Empty text="No deals yet." /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
          {dealList.map((d:any) => (
            <div key={d.id} style={{ padding:'8px 12px', background:'var(--bg-2)', borderRadius:6, display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <div>
                <div style={{ color:'var(--text)' }}>{d.title}</div>
                <Badge label={stageLabel[d.stage]||d.stage} bg={stageColor[d.stage]+'22'} color={stageColor[d.stage]} />
              </div>
              <span style={{ color:'var(--gold)', fontFamily:'monospace' }}>${(d.value||0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <div>
          <SectionTitle>Notes</SectionTitle>
          <div style={{ fontSize:12, color:'var(--text-dim)', lineHeight:1.7 }}>{client.notes}</div>
        </div>
      )}
    </div>
  )
}
