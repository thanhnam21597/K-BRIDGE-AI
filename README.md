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
5. Personalized daily tips

## Project Structure

```txt
src/
  app/
    api/
      admin/seed-kb/route.ts
      coach/route.ts
      agent/chat/route.ts
      agent/upload/route.ts
      translate/route.ts
      role-play/route.ts
      daily-tips/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    dashboard/
      kbridge-dashboard.tsx
      sidebar.tsx
      checklist-panel.tsx
      cultural-coach.tsx
      translator-panel.tsx
      role-play-panel.tsx
      daily-tips-panel.tsx
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
    korean-vietnamese-kb.ts
    kbridge-agent.ts
    seed-kb.ts
    llm.ts
    onboarding.ts
    supabase.ts
    types.ts
    utils.ts
    vector-store.ts
```

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

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a Supabase project.
2. Run SQL in `supabase/schema.sql` to create `conversations`, `documents`, and `match_documents_scoped`.
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

## Agent API

- `GET /api/agent/chat?userId=<id>` loads previous chat history
- `POST /api/agent/chat` with `{ userId, message }`
- `POST /api/agent/upload` as `multipart/form-data` with `userId` + one or more `files`
- `POST /api/admin/seed-kb` seeds backup KB into Supabase documents
- `GET /api/admin/kb-status` returns seeded/not-seeded status for global KB

## Deploy to Vercel

1. Import this repository into Vercel.
2. Set environment variables in Vercel Project Settings.
3. Deploy with the default Next.js build settings.
