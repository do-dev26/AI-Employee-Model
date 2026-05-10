# AI Employee — Next.js + Firebase + Vercel

Personal AI business assistant. One person, full business control.

---

## Stack
- **Frontend + API**: Next.js 14 (App Router)
- **Database**: Firebase Firestore
- **AI**: Anthropic Claude (via API routes — key never exposed to client)
- **Hosting**: Vercel (free tier works perfectly)

---

## Setup in 3 Steps

### Step 1 — Firebase Setup

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `ai-employee`
3. Disable Google Analytics (not needed) → Create
4. Left sidebar → **Firestore Database** → Create database
   - Choose **"Start in test mode"** (we'll secure later)
   - Pick any region (asia-south1 for India)
5. Left sidebar → **Project Settings** (gear icon) → **Your apps** → click **`</>`** (Web)
   - Register app name: `ai-employee-web`
   - Copy the `firebaseConfig` values — you'll need these

### Step 2 — Local Setup

```bash
# Clone / download this project
cd ai-employee-next

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local and fill in:
#   - All NEXT_PUBLIC_FIREBASE_* values from Firebase Console
#   - ANTHROPIC_API_KEY from https://console.anthropic.com/

# Run locally
npm run dev
# → http://localhost:3000
```

### Step 3 — Deploy to Vercel

```bash
# Install Vercel CLI (one time)
npm i -g vercel

# Deploy
vercel

# When prompted:
# - Link to existing project? No
# - Project name: ai-employee
# - Framework: Next.js (auto-detected)

# Add environment variables in Vercel Dashboard:
# https://vercel.com/[your-name]/ai-employee/settings/environment-variables
# Add all variables from .env.local
```

Or use GitHub:
1. Push this folder to a GitHub repo
2. Go to https://vercel.com → Import from GitHub
3. Add environment variables in Vercel dashboard
4. Deploy — done!

---

## Firebase Security Rules

After testing, update Firestore rules:

```
// Firebase Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Single user — restrict to authenticated user or just allow all for now
    match /{document=**} {
      allow read, write: if true; // Change to auth-based later
    }
  }
}
```

---

## Project Structure

```
ai-employee-next/
├── app/
│   ├── layout.tsx          ← Root HTML layout
│   ├── page.tsx            ← Main app shell + sidebar
│   ├── globals.css         ← Design tokens + global styles
│   └── api/
│       └── chat/
│           └── route.ts    ← AI agent endpoint (server-side)
│
├── components/
│   ├── ui/index.tsx        ← Reusable UI: Badge, Stat, Btn, Input...
│   └── panels/
│       ├── ChatPanel.tsx   ← AI conversation + tool execution
│       ├── TasksPanel.tsx  ← Task CRUD
│       ├── ClientsPanel.tsx← Client management
│       ├── PipelinePanel.tsx← Kanban deal board
│       └── DashboardPanel.tsx← Overview + stats
│
├── lib/
│   └── firebase.ts         ← Firebase init + ALL Firestore CRUD
│
├── .env.local              ← Your secrets (never commit)
├── .env.example            ← Safe template (commit this)
└── .gitignore              ← .env.local is excluded
```

---

## How it works

**Chat → Firebase flow:**
1. User types: *"Follow up with Rahul tomorrow"*
2. `ChatPanel` sends message to `/api/chat`
3. Claude reads the message, calls `create_task` tool
4. API route returns `{ response: "Done — added...", actions: [{tool: "create_task", data: {...}}] }`
5. `ChatPanel` receives actions, calls `createTask()` from `lib/firebase.ts`
6. Task saved to Firestore → Tasks panel refreshes

**Manual form flow:**
1. User opens Tasks panel → clicks "+ Add Task"
2. Fills form: title, priority, due date, client, category
3. Hits Create → `createTask()` called → Firestore → list refreshes

---

## Collections in Firestore

| Collection | What it stores |
|---|---|
| `tasks` | All tasks with status, priority, due date |
| `clients` | Client profiles |
| `deals` | Sales pipeline |
| `proposals` | Generated proposals |
| `chat_messages` | Full conversation history |
| `activity_log` | Audit trail of all actions |

---

## Environment Variables Reference

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your Apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |

---

## Common Issues

**"Firebase not initialized" error:**
→ Check all 6 `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`

**"Anthropic API error":**
→ Check `ANTHROPIC_API_KEY` — must be server-side (no `NEXT_PUBLIC_` prefix)

**Firestore permission denied:**
→ Go to Firebase Console → Firestore → Rules → Set to test mode temporarily

**Vercel build fails:**
→ Make sure all env vars are added in Vercel Dashboard settings
