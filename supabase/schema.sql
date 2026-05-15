-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Stores conversational turns per user.
create table if not exists public.conversations (
  id bigserial primary key,
  user_id text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Stores chunked document text + vector embeddings for retrieval.
-- Use 1536 for OpenAI text-embedding-3-small dimension.
create table if not exists public.documents (
  id bigserial primary key,
  user_id text not null,
  file_name text not null,
  content_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Safe migration for existing tables.
alter table public.documents
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists conversations_user_id_created_at_idx
  on public.conversations (user_id, created_at);

-- IVF flat index improves ANN search performance for larger corpora.
create index if not exists documents_embedding_ivfflat_idx
  on public.documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists documents_user_id_idx
  on public.documents (user_id);

create index if not exists documents_metadata_gin_idx
  on public.documents using gin (metadata);

create unique index if not exists documents_user_id_file_name_uidx
  on public.documents (user_id, file_name);

-- Flashcard spaced repetition progress per user/card.
create table if not exists public.flashcard_progress (
  id bigserial primary key,
  user_id text not null,
  card_id text not null,
  category text not null,
  review_count int not null default 0,
  easy_count int not null default 0,
  hard_count int not null default 0,
  forgot_count int not null default 0,
  mastery_score double precision not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists flashcard_progress_user_card_uidx
  on public.flashcard_progress (user_id, card_id);

create index if not exists flashcard_progress_user_id_idx
  on public.flashcard_progress (user_id);

-- Coach feedback events for iterative response quality tuning.
create table if not exists public.coach_feedback (
  id bigserial primary key,
  user_id text not null,
  message_id text not null,
  rating text not null check (rating in ('up', 'down')),
  reason text,
  user_message text,
  assistant_message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists coach_feedback_user_message_uidx
  on public.coach_feedback (user_id, message_id);

create index if not exists coach_feedback_user_created_idx
  on public.coach_feedback (user_id, created_at desc);

-- RPC for flexible vector similarity retrieval across user docs + global KB.
create or replace function public.match_documents_scoped (
  query_embedding vector(1536),
  match_count int default 5,
  filter_user_ids text[] default null,
  source_filter text default null
)
returns table (
  id bigint,
  user_id text,
  file_name text,
  content_text text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    d.id,
    d.user_id,
    d.file_name,
    d.content_text,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where
    (filter_user_ids is null or d.user_id = any(filter_user_ids))
    and (
      source_filter is null
      or coalesce(d.metadata->>'source', '') = source_filter
    )
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional: enable RLS once auth is integrated.
-- alter table public.conversations enable row level security;
-- alter table public.documents enable row level security;
