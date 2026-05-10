// app/api/chat/route.ts
// AI Agent endpoint — Claude processes message, calls tools, saves to Firebase

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tool definitions (function calling) ───────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a task. Use when user says: follow up, remind me, call X, I need to, add task, send email to.',
    input_schema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Short clear task title' },
        description: { type: 'string' },
        clientName:  { type: 'string', description: 'Client this is for' },
        priority:    { type: 'string', enum: ['low','medium','high','urgent'] },
        dueDate:     { type: 'string', description: 'ISO date YYYY-MM-DD. Convert: today, tomorrow, next week.' },
        category:    { type: 'string', enum: ['general','follow_up','call','email','proposal','research'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_client',
    description: 'Add a new client or prospect to the system.',
    input_schema: {
      type: 'object',
      properties: {
        name:     { type: 'string' },
        business: { type: 'string' },
        email:    { type: 'string' },
        phone:    { type: 'string' },
        revenue:  { type: 'string', description: 'e.g. $25K/month' },
        status:   { type: 'string', enum: ['prospect','active','closed','lost'] },
        notes:    { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_deal',
    description: 'Create a sales deal. Use when user mentions a potential sale or opportunity.',
    input_schema: {
      type: 'object',
      properties: {
        title:          { type: 'string' },
        clientName:     { type: 'string' },
        value:          { type: 'number', description: 'Deal value in USD' },
        stage:          { type: 'string', enum: ['lead','qualified','proposal_sent','negotiating','closed_won','closed_lost'] },
        nextAction:     { type: 'string' },
        nextActionDate: { type: 'string' },
        notes:          { type: 'string' },
      },
      required: ['title','clientName'],
    },
  },
  {
    name: 'get_summary',
    description: 'Get overview of pending tasks, pipeline, and what needs attention today. Use for: what do I have today, overview, status, daily briefing.',
    input_schema: { type: 'object', properties: {} },
  },
]

const today = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

const SYSTEM = `You are an AI Employee — a sharp, focused personal business assistant.

Today: ${today}

Your job:
- Understand what the user needs and DO it using tools
- After using a tool, confirm briefly in plain human language
- Proactive: if you see something important, mention it

Speak like a competent coworker — direct, efficient, warm.
Never say "I have created a task with the following details" — say "Done, added: Call Rahul (tomorrow)"

Natural language → actions:
"Follow up with Rahul tomorrow" → create_task: title="Follow up with Rahul", dueDate=tomorrow, category=follow_up
"Add Priya from StartupX, she does 30K/month" → create_client: name=Priya, business=StartupX, revenue=$30K/month
"$8K deal with Acme Corp" → create_deal: title="Acme Corp Deal", clientName=Acme Corp, value=8000`

// ── Date resolver helper (server-side) ───────────────────────
function resolveDate(str?: string): string | undefined {
  if (!str) return undefined
  const t = new Date()
  const s = str.toLowerCase().trim()
  if (s === 'today')     return t.toISOString().split('T')[0]
  if (s === 'tomorrow')  { t.setDate(t.getDate()+1); return t.toISOString().split('T')[0] }
  if (s.includes('next week')) { t.setDate(t.getDate()+7); return t.toISOString().split('T')[0] }
  if (/\d{4}-\d{2}-\d{2}/.test(str)) return str
  return str
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: message }
    ]

    const actions: object[] = []
    let finalText = ''

    // ── Agentic loop ─────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      })

      const textBlocks  = response.content.filter(b => b.type === 'text')
      const toolBlocks  = response.content.filter(b => b.type === 'tool_use')

      if (textBlocks.length) finalText = textBlocks.map(b => (b as Anthropic.TextBlock).text).join(' ')
      if (!toolBlocks.length || response.stop_reason === 'end_turn') break

      // Execute tools — results go back to Firebase via frontend
      // Here we just prepare the results to send back
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolBlock of toolBlocks) {
        const tb = toolBlock as Anthropic.ToolUseBlock
        let result = {}

        if (tb.name === 'create_task') {
          const inp = tb.input as Record<string,string>
          result = {
            action: 'create_task',
            data: { ...inp, dueDate: resolveDate(inp.dueDate) }
          }
        } else if (tb.name === 'create_client') {
          result = { action: 'create_client', data: tb.input }
        } else if (tb.name === 'create_deal') {
          result = { action: 'create_deal', data: tb.input }
        } else if (tb.name === 'get_summary') {
          result = { action: 'get_summary', data: {} }
        }

        actions.push({ tool: tb.name, ...result })
        toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify({ queued: true }) })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }

    return NextResponse.json({ response: finalText, actions })

  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
