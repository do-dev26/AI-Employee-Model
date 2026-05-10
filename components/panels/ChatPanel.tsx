'use client'
// components/panels/ChatPanel.tsx

import { useState, useRef, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { createTask, createClient, createDeal, saveChatMessage } from '@/lib/firebase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: { tool: string; data?: Record<string,unknown> }[]
}

const QUICK = [
  "What do I have today?",
  "Show me the pipeline",
  "Daily overview",
]

const STARTERS = [
  "Follow up with [Client] tomorrow about the proposal",
  "Add [Name] from [Company] as a new client",
  "Create a $8,000 deal with [Client Name]",
]

export default function ChatPanel({ onRefresh }: { onRefresh: () => void }) {
  const [sessionId] = useState(() => `sess_${Date.now()}`)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Hey! I'm your AI employee. Tell me what needs to get done.

Examples:
• "Follow up with Rahul tomorrow about the proposal"
• "Add Priya from StartupX as a client, she does $30K/month"  
• "Create a $8K deal with Acme Corp"
• "What's on my plate today?"`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function executeActions(actions: Message['actions']) {
    if (!actions?.length) return
    for (const action of actions) {
      try {
        if (action.tool === 'create_task' && action.data) {
          await createTask({
            title:       action.data.title as string,
            description: action.data.description as string | undefined,
            clientName:  action.data.clientName as string | undefined,
            priority:    (action.data.priority as string || 'medium') as 'low'|'medium'|'high'|'urgent',
            dueDate:     action.data.dueDate as string | undefined,
            category:    (action.data.category as string || 'general') as 'general'|'follow_up'|'call'|'email'|'proposal'|'research',
            status:      'pending',
          })
        } else if (action.tool === 'create_client' && action.data) {
          await createClient({
            name:     action.data.name as string,
            business: action.data.business as string | undefined,
            email:    action.data.email as string | undefined,
            phone:    action.data.phone as string | undefined,
            revenue:  action.data.revenue as string | undefined,
            status:   (action.data.status as string || 'prospect') as 'prospect'|'active'|'closed'|'lost',
            notes:    action.data.notes as string | undefined,
          })
        } else if (action.tool === 'create_deal' && action.data) {
          await createDeal({
            title:          action.data.title as string,
            clientName:     action.data.clientName as string,
            value:          Number(action.data.value) || 0,
            stage:          (action.data.stage as string || 'lead') as 'lead'|'qualified'|'proposal_sent'|'negotiating'|'closed_won'|'closed_lost',
            nextAction:     action.data.nextAction as string | undefined,
            nextActionDate: action.data.nextActionDate as string | undefined,
            notes:          action.data.notes as string | undefined,
          })
        }
      } catch (err) {
        console.error('Action failed:', action.tool, err)
      }
    }
    onRefresh()
  }

  async function send() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')

    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    // Save user message
    await saveChatMessage({ sessionId, role: 'user', content: msg })

    try {
      // Build history for API (last 10 messages)
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || 'Done.',
        actions: data.actions,
      }
      setMessages(prev => [...prev, assistantMsg])

      // Execute tool actions in Firebase
      if (data.actions?.length) await executeActions(data.actions)

      // Save assistant message
      await saveChatMessage({ sessionId, role: 'assistant', content: data.response, actions: data.actions })

    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error — check your API connection.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', animation:'fadeIn 0.2s ease' }}>
            {m.role === 'assistant' && (
              <div style={{
                width:30, height:30, borderRadius:'50%',
                background:'linear-gradient(135deg,#C8A96E,#8B6914)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700, color:'#0A0A0A',
                marginRight:8, flexShrink:0, marginTop:2
              }}>AI</div>
            )}
            <div style={{ maxWidth:'74%' }}>
              <div style={{
                background: m.role === 'user' ? 'linear-gradient(135deg,#1A1A2E,#16213E)' : 'var(--bg-2)',
                border: `1px solid ${m.role === 'user' ? '#2A2A4A' : 'var(--border-gold)'}`,
                borderRadius: m.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                padding:'10px 16px', fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap',
                color: m.role === 'user' ? '#A8B4D8' : 'var(--text)'
              }}>{m.content}</div>
              {/* Actions taken */}
              {m.actions?.length ? (
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
                  {m.actions.filter(a => a.tool !== 'get_summary').map((a, j) => (
                    <span key={j} style={{
                      background:'#1A2E1A', border:'1px solid #2A4A2A', color:'#4DC87A',
                      padding:'2px 8px', borderRadius:8, fontSize:10, fontFamily:'monospace'
                    }}>✓ {a.tool.replace(/_/g,' ')}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', alignItems:'center' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#C8A96E,#8B6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#0A0A0A', marginRight:8 }}>AI</div>
            <div style={{ background:'var(--bg-2)', border:'1px solid var(--border-gold)', borderRadius:'4px 18px 18px 18px', padding:'12px 16px', display:'flex', gap:5 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)', animation:'pulse 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div style={{ padding:'8px 24px', display:'flex', gap:6, flexWrap:'wrap' }}>
        {QUICK.map((q,i) => (
          <QuickBtn key={i} label={q} onClick={() => { setInput(q); inputRef.current?.focus() }} />
        ))}
      </div>

      {/* Starters (when empty) */}
      {messages.length <= 1 && (
        <div style={{ padding:'4px 24px 8px', display:'flex', gap:6, flexWrap:'wrap' }}>
          {STARTERS.map((s,i) => (
            <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }}
              style={{ background:'var(--gold-dark)', border:'1px solid var(--border-gold)', color:'var(--gold)', padding:'6px 12px', borderRadius:6, fontSize:11, fontFamily:'monospace', cursor:'pointer', transition:'all 0.15s' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'12px 24px 16px', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', gap:10, background:'var(--bg-2)', border:'1px solid var(--border-gold)', borderRadius:10, padding:'10px 14px', transition:'border-color 0.2s' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
            placeholder="Tell me what to do… (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex:1, background:'transparent', border:'none', color:'var(--text)',
              fontSize:13, lineHeight:1.6, resize:'none', maxHeight:80, overflow:'auto',
              fontFamily:'Georgia,serif'
            }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 80) + 'px'
            }}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg,#C8A96E,#8B6914)' : 'var(--bg-3)',
              border:'none', color: input.trim() && !loading ? '#0A0A0A' : '#333',
              width:34, height:34, borderRadius:7, fontSize:16, flexShrink:0,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center'
            }}>↑</button>
        </div>
        <div style={{ textAlign:'center', fontSize:10, color:'var(--text-muted)', fontFamily:'monospace', marginTop:6 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background:'transparent', border:`1px solid ${h?'var(--border-gold)':'var(--border)'}`, color:h?'var(--gold)':'var(--text-muted)', padding:'4px 10px', borderRadius:12, fontSize:11, fontFamily:'monospace', transition:'all 0.15s', cursor:'pointer' }}>
      {label}
    </button>
  )
}
