'use client'
// components/panels/PipelinePanel.tsx

import { useState, useEffect } from 'react'
import { getDeals, createDeal, updateDeal, Deal, DealStage } from '@/lib/firebase'
import { Btn, Input, Select, Empty, stageColor, stageLabel } from '@/components/ui'

const STAGES: DealStage[] = ['lead','qualified','proposal_sent','negotiating','closed_won','closed_lost']

const emptyForm = { title:'', clientName:'', value:0, stage:'lead' as DealStage, nextAction:'', notes:'' }

export default function PipelinePanel({ refresh }: { refresh: number }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await getDeals()
    setDeals(data)
  }

  useEffect(() => { load() }, [refresh])

  async function addDeal() {
    if (!form.title || !form.clientName) return
    setSaving(true)
    try {
      await createDeal({ ...form, value: Number(form.value) || 0 })
      setForm(emptyForm)
      setShowAdd(false)
      load()
    } finally { setSaving(false) }
  }

  async function moveStage(id: string, stage: DealStage) {
    await updateDeal(id, { stage })
    load()
  }

  const pipelineValue = deals.filter(d => !['closed_won','closed_lost'].includes(d.stage)).reduce((s,d) => s+(d.value||0), 0)
  const wonValue      = deals.filter(d => d.stage === 'closed_won').reduce((s,d) => s+(d.value||0), 0)

  return (
    <div style={{ padding:24, height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexShrink:0 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, color:'var(--gold)' }}>Pipeline</div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ Add Deal</Btn>
      </div>

      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, flexShrink:0, fontFamily:'monospace' }}>
        Pipeline: <span style={{ color:'var(--gold)' }}>${pipelineValue.toLocaleString()}</span>
        &nbsp;·&nbsp;
        Won: <span style={{ color:'var(--green)' }}>${wonValue.toLocaleString()}</span>
        &nbsp;·&nbsp;
        {deals.filter(d=>!['closed_won','closed_lost'].includes(d.stage)).length} open deals
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-gold)', borderRadius:10, padding:16, marginBottom:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, flexShrink:0, animation:'fadeIn 0.2s ease' }}>
          <Input placeholder="Deal title *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{ gridColumn:'1/-1' }} />
          <Input placeholder="Client name *" value={form.clientName} onChange={e=>setForm({...form,clientName:e.target.value})} />
          <Input type="number" placeholder="Value $" value={form.value||''} onChange={e=>setForm({...form,value:Number(e.target.value)})} />
          <Select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value as DealStage})}>
            {STAGES.map(s=><option key={s} value={s}>{stageLabel[s]}</option>)}
          </Select>
          <Input placeholder="Next action" value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})} />
          <Input placeholder="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{ gridColumn:'1/-1' }} />
          <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
            <Btn onClick={addDeal} disabled={saving || !form.title || !form.clientName}>{saving?'Saving…':'Create Deal'}</Btn>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div style={{ display:'flex', gap:10, overflowX:'auto', flex:1, paddingBottom:8 }}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage)
          const stageTotal = stageDeals.reduce((s,d) => s+(d.value||0), 0)
          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={stageDeals}
              total={stageTotal}
              allStages={STAGES}
              onMove={moveStage}
            />
          )
        })}
      </div>
    </div>
  )
}

function KanbanColumn({ stage, deals, total, allStages, onMove }: {
  stage: DealStage
  deals: Deal[]
  total: number
  allStages: DealStage[]
  onMove: (id:string, stage:DealStage) => void
}) {
  const color = stageColor[stage]
  return (
    <div style={{ minWidth:190, flex:1, display:'flex', flexDirection:'column' }}>
      {/* Column header */}
      <div style={{
        padding:'7px 10px', background:`${color}18`,
        border:`1px solid ${color}44`, borderRadius:'6px 6px 0 0',
        display:'flex', justifyContent:'space-between', alignItems:'center'
      }}>
        <div style={{ fontSize:10, color, fontFamily:'JetBrains Mono,monospace', letterSpacing:'0.06em', textTransform:'uppercase' }}>
          {stageLabel[stage]}
        </div>
        {total > 0 && <div style={{ fontSize:10, color, fontFamily:'monospace' }}>${total.toLocaleString()}</div>}
      </div>

      {/* Cards */}
      <div style={{
        background:'var(--bg-1)', border:`1px solid ${color}33`, borderTop:'none',
        borderRadius:'0 0 6px 6px', flex:1, padding:6, display:'flex', flexDirection:'column', gap:5,
        minHeight:100, overflowY:'auto'
      }}>
        {deals.map(d => (
          <DealCard key={d.id} deal={d} allStages={allStages} currentStage={stage} onMove={onMove} />
        ))}
        {deals.length === 0 && (
          <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', paddingTop:16 }}>—</div>
        )}
      </div>
    </div>
  )
}

function DealCard({ deal:d, allStages, currentStage, onMove }: {
  deal:Deal; allStages:DealStage[]; currentStage:DealStage; onMove:(id:string,s:DealStage)=>void
}) {
  const [hov, setHov] = useState(false)
  const isClosed = ['closed_won','closed_lost'].includes(currentStage)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--bg-3)' : 'var(--bg-2)',
        border:'1px solid var(--border)', borderRadius:6, padding:'8px 10px',
        transition:'background 0.15s'
      }}
    >
      <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.4 }}>{d.title}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{d.clientName}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
        <span style={{ fontSize:11, color:'var(--gold)', fontFamily:'monospace', fontWeight:700 }}>
          ${(d.value||0).toLocaleString()}
        </span>
        {!isClosed && hov && (
          <select
            defaultValue=""
            onChange={e => { if(e.target.value) onMove(d.id!, e.target.value as DealStage); e.currentTarget.value=''; }}
            style={{ background:'var(--bg-1)', border:'1px solid var(--border-gold)', color:'var(--text-muted)', padding:'2px 4px', borderRadius:4, fontSize:9, cursor:'pointer' }}
          >
            <option value="">Move →</option>
            {allStages.filter(s=>s!==currentStage).map(s=><option key={s} value={s}>{stageLabel[s]}</option>)}
          </select>
        )}
      </div>
      {d.nextAction && (
        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>
          → {d.nextAction}
        </div>
      )}
    </div>
  )
}
