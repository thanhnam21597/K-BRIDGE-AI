# K-Bridge AI

Remote Onboarding Assistant for Vietnamese employees joining Korean companies.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui-style components
- Next.js API routes for backend
- LangChain + Groq / Claude 3.5 Sonnet (fallback OpenAI)
- Supabase (persistent conversation + pgvector RAG)
- Local storage-based demo state (auth/profile placeholder)
- Deployment-ready for Vercel

## Main Features (MVP Scaffold)

1. Smart 30-day onboarding checklist (adaptive by role/language level)
2. Cultural coach chatbot (Vietnamese-first guidance)
3. Real-time translator (VN ↔ EN ↔ KR, business tone)
4. Role-play conversation simulator
5. Flash Cards with spaced repetition and mastery stats
6. Ask Who / Escalation assistant (HR, buddy, tech lead, manager)
7. Weekly Timeline (weekly goals + weekly review + weekly PDF export)
8. Onboarding KPI dashboard (% week-1 completion, chatbot resolved questions, translation usage, self-rating delta)

## Project Structure

```txt
src/
  app/
    api/
      admin/seed-kb/route.ts
      coach/route.ts
      agent/chat/route.ts
      agent/feedback/route.ts
      agent/transcribe/route.ts
      agent/voice-correct/route.ts
      agent/upload/route.ts
      translate/route.ts
      role-play/route.ts
      flashcards/route.ts
      flashcards/stats/route.ts
    flashcards/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    dashboard/
      ask-who-panel.tsx
      kbridge-dashboard.tsx
      onboarding-kpi-panel.tsx
      sidebar.tsx
      weekly-timeline-panel.tsx
      checklist-panel.tsx
      cultural-coach.tsx
      translator-panel.tsx
      role-play-panel.tsx
    flashcards/
      flashcards-studio.tsx
    ui/
      avatar.tsx
      badge.tsx
      button.tsx
      card.tsx
      input.tsx
      progress.tsx
      scroll-area.tsx
      separator.tsx
      tabs.tsx
      textarea.tsx
  lib/
    ask-who.ts
    korean-vietnamese-kb.ts
    kbridge-agent.ts
    rate-limit.ts
    server-log.ts
    seed-kb.ts
    llm.ts
    onboarding.ts
    supabase.ts
    flashcards.ts
    types.ts
    utils.ts
    vector-store.ts
```

- `scripts/seed-kb.ps1` (Windows)
- `scripts/seed-kb.sh` (macOS/Linux)

## Environment Variables

Copy `.env.example` to `.env.local` and set at least one provider key:

- `ANTHROPIC_API_KEY` (Claude 3.5 Sonnet preferred)
- `GROQ_API_KEY` (fast inference option)
- `OPENAI_API_KEY` (chat + embeddings for RAG)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `SUPABASE_SERVICE_ROLE_KEY` (recommended for server-side write operations)
- `SEED_API_KEY` (protect KB seed endpoint)
- `VALSEA_API_KEY` (optional STT provider key)
- `VALSEA_BASE_URL` (optional STT provider base URL)

Security notes:

- Never commit `.env.local` or real API keys to git.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only (do not expose with `NEXT_PUBLIC_`).
- Rotate keys if they were pasted in chats/screenshots.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a Supabase project.
2. Run SQL in `supabase/schema.sql` to create `conversations`, `documents`, `flashcard_progress`, `coach_feedback`, and `match_documents_scoped`.
3. Add Supabase env variables to `.env.local`.

### Seed Global KB

Seed the built-in Korean-Vietnamese KB into Supabase vector table:

```bash
curl -X POST http://localhost:3000/api/admin/seed-kb
```

If `SEED_API_KEY` is set:

```bash
curl -X POST http://localhost:3000/api/admin/seed-kb -H "Authorization: Bearer <SEED_API_KEY>"
```

Or run helper scripts:

```bash
bash scripts/seed-kb.sh http://localhost:3000
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-kb.ps1 -BaseUrl "http://localhost:3000" -SeedApiKey "<SEED_API_KEY>"
```

## Agent API

- `GET /api/agent/chat?userId=<id>` loads previous chat history
- `POST /api/agent/chat` with `{ userId, message }`
- `POST /api/agent/feedback` with `{ userId, messageId, rating, reason?, userMessage?, assistantMessage }`
- `POST /api/agent/transcribe` with `multipart/form-data` `{ audio, language }` for server-side STT
- `POST /api/agent/voice-correct` with `{ transcript, language }` auto-corrects speech transcript via LLM
- `POST /api/agent/upload` as `multipart/form-data` with `userId` + one or more `files`
- `POST /api/admin/seed-kb` seeds backup KB into Supabase documents
- `GET /api/admin/kb-status` returns seeded/not-seeded status for global KB
- `GET /api/flashcards?userId=<id>&mode=all|weak&category=<optional>` gets flashcards
- `POST /api/flashcards` updates spaced repetition progress (`easy|hard|forgot`)
- `GET /api/flashcards/stats?userId=<id>` returns daily goal and mastery stats

## Minimal Security & Ops

- API rate limiting is enabled for critical endpoints:
  - `/api/agent/chat`
  - `/api/agent/transcribe`
  - `/api/agent/voice-correct`
  - `/api/translate`
  - `/api/role-play`
  - `/api/checklist/generate`
- Structured API error logging is enabled via `src/lib/server-log.ts`.

## Voice Transcription Flow

- Primary STT path (if configured): `MediaRecorder -> /api/agent/transcribe -> VALSEA`
- Fallback path: browser `SpeechRecognition` when provider is unavailable
- Optional post-processing: `/api/agent/voice-correct` to clean transcript before send

## Deploy to Vercel

1. Import this repository into Vercel.
2. Set environment variables in Vercel Project Settings.
3. Deploy with the default Next.js build settings.
