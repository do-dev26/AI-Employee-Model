// lib/firebase.ts
// Firebase initialization + Firestore CRUD helpers
// All database operations go through these functions

import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore, collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, Timestamp, DocumentData, QueryConstraint
} from 'firebase/firestore'

// ── Firebase init ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)

// ── Types ──────────────────────────────────────────────────────
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type TaskCategory = 'general' | 'follow_up' | 'call' | 'email' | 'proposal' | 'research'
export type ClientStatus = 'prospect' | 'active' | 'closed' | 'lost'
export type DealStage = 'lead' | 'qualified' | 'proposal_sent' | 'negotiating' | 'closed_won' | 'closed_lost'

export interface Task {
  id?: string
  title: string
  description?: string
  clientId?: string
  clientName?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string         // ISO date string YYYY-MM-DD
  category: TaskCategory
  aiNotes?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  completedAt?: Timestamp
}

export interface Client {
  id?: string
  name: string
  business?: string
  email?: string
  phone?: string
  revenue?: string
  website?: string
  status: ClientStatus
  notes?: string
  tags?: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Deal {
  id?: string
  title: string
  clientId?: string
  clientName: string
  value: number
  stage: DealStage
  probability?: number
  nextAction?: string
  nextActionDate?: string
  notes?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  closedAt?: Timestamp
}

export interface Proposal {
  id?: string
  clientId?: string
  clientName: string
  dealId?: string
  title: string
  content: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  value?: number
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface ChatMessage {
  id?: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  actions?: object[]
  createdAt?: Timestamp
}

export interface ActivityLog {
  id?: string
  type: string
  description: string
  clientId?: string
  clientName?: string
  entityId?: string
  entityType?: string
  createdAt?: Timestamp
}

// ── Helper: convert Firestore doc to plain object ──────────────
function docToObj(doc: DocumentData): DocumentData & { id: string } {
  return { id: doc.id, ...doc.data() }
}

// ════════════════════════════════════════════════════════════════
//  TASKS
// ════════════════════════════════════════════════════════════════
export const tasksCol = () => collection(db, 'tasks')

export async function createTask(data: Omit<Task, 'id'>): Promise<Task> {
  const ref = await addDoc(tasksCol(), {
    ...data,
    status: data.status || 'pending',
    priority: data.priority || 'medium',
    category: data.category || 'general',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logActivity('task_created', `Task created: ${data.title}`, { entityId: ref.id, entityType: 'tasks', clientName: data.clientName })
  return { id: ref.id, ...data }
}

export async function getTasks(filters: {
  status?: TaskStatus | ''
  priority?: Priority | ''
  clientId?: string
  overdue?: boolean
  dueToday?: boolean
} = {}): Promise<Task[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(100)]
  if (filters.status)   constraints.unshift(where('status', '==', filters.status))
  if (filters.clientId) constraints.unshift(where('clientId', '==', filters.clientId))
  if (filters.priority) constraints.unshift(where('priority', '==', filters.priority))

  const snap = await getDocs(query(tasksCol(), ...constraints))
  let tasks = snap.docs.map(docToObj) as Task[]

  // Client-side date filters (Firestore free tier avoids composite indexes)
  const today = new Date().toISOString().split('T')[0]
  if (filters.overdue)   tasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done')
  if (filters.dueToday)  tasks = tasks.filter(t => t.dueDate === today)

  return tasks
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const updates: Partial<Task> & { updatedAt: ReturnType<typeof serverTimestamp>, completedAt?: ReturnType<typeof serverTimestamp> } = { ...data, updatedAt: serverTimestamp() }
  if (data.status === 'done') updates.completedAt = serverTimestamp()
  await updateDoc(doc(db, 'tasks', id), updates)
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id))
}

// ════════════════════════════════════════════════════════════════
//  CLIENTS
// ════════════════════════════════════════════════════════════════
export const clientsCol = () => collection(db, 'clients')

export async function createClient(data: Omit<Client, 'id'>): Promise<Client> {
  const ref = await addDoc(clientsCol(), {
    ...data,
    status: data.status || 'prospect',
    tags: data.tags || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logActivity('client_added', `Client added: ${data.name}`, { entityId: ref.id, entityType: 'clients' })
  return { id: ref.id, ...data }
}

export async function getClients(statusFilter?: ClientStatus | ''): Promise<Client[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (statusFilter) constraints.unshift(where('status', '==', statusFilter))
  const snap = await getDocs(query(clientsCol(), ...constraints))
  return snap.docs.map(docToObj) as Client[]
}

export async function getClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, 'clients', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } as Client : null
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  await updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteClient(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', id))
}

// ════════════════════════════════════════════════════════════════
//  DEALS
// ════════════════════════════════════════════════════════════════
export const dealsCol = () => collection(db, 'deals')

export async function createDeal(data: Omit<Deal, 'id'>): Promise<Deal> {
  const ref = await addDoc(dealsCol(), {
    ...data,
    stage: data.stage || 'lead',
    probability: data.probability || 20,
    value: data.value || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logActivity('deal_created', `Deal created: ${data.title} — $${data.value?.toLocaleString()}`, { entityId: ref.id, entityType: 'deals', clientName: data.clientName })
  return { id: ref.id, ...data }
}

export async function getDeals(stageFilter?: DealStage | ''): Promise<Deal[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (stageFilter) constraints.unshift(where('stage', '==', stageFilter))
  const snap = await getDocs(query(dealsCol(), ...constraints))
  return snap.docs.map(docToObj) as Deal[]
}

export async function updateDeal(id: string, data: Partial<Deal>): Promise<void> {
  const updates: Partial<Deal> & { updatedAt: ReturnType<typeof serverTimestamp>, closedAt?: ReturnType<typeof serverTimestamp> } = { ...data, updatedAt: serverTimestamp() }
  if (data.stage === 'closed_won' || data.stage === 'closed_lost') {
    updates.closedAt = serverTimestamp()
  }
  await updateDoc(doc(db, 'deals', id), updates)
}

// ════════════════════════════════════════════════════════════════
//  PROPOSALS
// ════════════════════════════════════════════════════════════════
export const proposalsCol = () => collection(db, 'proposals')

export async function saveProposal(data: Omit<Proposal, 'id'>): Promise<Proposal> {
  const ref = await addDoc(proposalsCol(), {
    ...data,
    status: data.status || 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: ref.id, ...data }
}

export async function getProposals(clientId?: string): Promise<Proposal[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (clientId) constraints.unshift(where('clientId', '==', clientId))
  const snap = await getDocs(query(proposalsCol(), ...constraints))
  return snap.docs.map(docToObj) as Proposal[]
}

// ════════════════════════════════════════════════════════════════
//  CHAT MESSAGES
// ════════════════════════════════════════════════════════════════
export const chatCol = () => collection(db, 'chat_messages')

export async function saveChatMessage(data: Omit<ChatMessage, 'id'>): Promise<void> {
  await addDoc(chatCol(), { ...data, createdAt: serverTimestamp() })
}

export async function getChatHistory(sessionId: string, limitNum = 20): Promise<ChatMessage[]> {
  const snap = await getDocs(query(
    chatCol(),
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'asc'),
    limit(limitNum)
  ))
  return snap.docs.map(docToObj) as ChatMessage[]
}

// ════════════════════════════════════════════════════════════════
//  ACTIVITY LOG
// ════════════════════════════════════════════════════════════════
export const activityCol = () => collection(db, 'activity_log')

export async function logActivity(
  type: string,
  description: string,
  meta: { clientId?: string; clientName?: string; entityId?: string; entityType?: string } = {}
): Promise<void> {
  try {
    await addDoc(activityCol(), {
      type, description, ...meta, createdAt: serverTimestamp()
    })
  } catch { /* don't fail silently on log errors */ }
}

export async function getActivity(limitNum = 30): Promise<ActivityLog[]> {
  const snap = await getDocs(query(activityCol(), orderBy('createdAt', 'desc'), limit(limitNum)))
  return snap.docs.map(docToObj) as ActivityLog[]
}

// ════════════════════════════════════════════════════════════════
//  DASHBOARD STATS (client-side computed)
// ════════════════════════════════════════════════════════════════
export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  const [taskSnap, clientSnap, dealSnap, proposalSnap] = await Promise.all([
    getDocs(tasksCol()),
    getDocs(clientsCol()),
    getDocs(dealsCol()),
    getDocs(proposalsCol()),
  ])

  const tasks     = taskSnap.docs.map(d => d.data()) as Task[]
  const clients   = clientSnap.docs.map(d => d.data()) as Client[]
  const deals     = dealSnap.docs.map(d => d.data()) as Deal[]
  const proposals = proposalSnap.docs.map(d => d.data()) as Proposal[]

  const openDeals = deals.filter(d => !['closed_won','closed_lost'].includes(d.stage))

  return {
    tasksPending:      tasks.filter(t => t.status === 'pending').length,
    tasksDueToday:     tasks.filter(t => t.dueDate === today && t.status !== 'done').length,
    tasksOverdue:      tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length,
    clientsTotal:      clients.length,
    clientsActive:     clients.filter(c => c.status === 'active').length,
    dealsOpen:         openDeals.length,
    pipelineValue:     openDeals.reduce((s, d) => s + (d.value || 0), 0),
    wonValue:          deals.filter(d => d.stage === 'closed_won').reduce((s,d) => s + (d.value||0), 0),
    proposalsSent:     proposals.filter(p => p.status === 'sent').length,
  }
}
