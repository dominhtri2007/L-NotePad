-- ==========================================================
-- Supabase Schema for L-NotePad
-- Copy and paste this script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ==========================================================

-- 1. Create table for users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create table for notes
CREATE TABLE IF NOT EXISTS public.notes (
  slug TEXT PRIMARY KEY,
  content TEXT DEFAULT '',
  password TEXT DEFAULT NULL,
  language TEXT DEFAULT 'plaintext',
  owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notes_owner ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Set permissive policies for public API access
CREATE POLICY "Allow public all access on notes" ON public.notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public all access on users" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Enable Realtime updates for notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
