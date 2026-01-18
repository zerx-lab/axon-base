-- =============================================
-- AI Knowledge Base Schema
-- =============================================

-- 1. Profiles table (user profiles)
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null,
  updated_at timestamp with time zone,
  username text unique,
  avatar_url text,
  website text,

  primary key (id),
  constraint username_length check (char_length(username) >= 3)
);

-- 2. Knowledge Bases table
create table if not exists knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  settings jsonb default '{}',
  document_count int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  kb_id uuid references knowledge_bases on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  file_path text,  -- Storage path
  file_type text default 'markdown',
  content text,  -- Raw markdown content (for small files)
  content_hash text,  -- SHA256 for change detection
  word_count int default 0,
  char_count int default 0,
  status text default 'active' check (status in ('active', 'archived', 'deleted')),
  metadata jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =============================================
-- Indexes
-- =============================================

create index if not exists idx_knowledge_bases_user on knowledge_bases(user_id);
create index if not exists idx_documents_kb on documents(kb_id);
create index if not exists idx_documents_user on documents(user_id);
create index if not exists idx_documents_status on documents(status);
create index if not exists idx_documents_content_hash on documents(content_hash);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Profiles RLS
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Knowledge Bases RLS
alter table knowledge_bases enable row level security;

create policy "Users can view own knowledge bases"
  on knowledge_bases for select
  using (auth.uid() = user_id);

create policy "Users can create knowledge bases"
  on knowledge_bases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own knowledge bases"
  on knowledge_bases for update
  using (auth.uid() = user_id);

create policy "Users can delete own knowledge bases"
  on knowledge_bases for delete
  using (auth.uid() = user_id);

-- Documents RLS
alter table documents enable row level security;

create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can create documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_knowledge_bases_updated_at
  before update on knowledge_bases
  for each row execute function update_updated_at_column();

create trigger update_documents_updated_at
  before update on documents
  for each row execute function update_updated_at_column();

-- =============================================
-- Trigger to update document_count
-- =============================================

create or replace function update_kb_document_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update knowledge_bases 
    set document_count = document_count + 1 
    where id = new.kb_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update knowledge_bases 
    set document_count = document_count - 1 
    where id = old.kb_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger update_document_count
  after insert or delete on documents
  for each row execute function update_kb_document_count();

-- =============================================
-- Storage Setup
-- =============================================

-- Create bucket for document files
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Create bucket for avatars (legacy)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for documents bucket
create policy "Users can view own document files"
  on storage.objects for select
  using (
    bucket_id = 'documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload document files"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own document files"
  on storage.objects for update
  using (
    bucket_id = 'documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own document files"
  on storage.objects for delete
  using (
    bucket_id = 'documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for avatars bucket (public read)
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy "Users can update avatars"
  on storage.objects for update
  using (bucket_id = 'avatars');

-- =============================================
-- Realtime Setup
-- =============================================

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table knowledge_bases;
alter publication supabase_realtime add table documents;
