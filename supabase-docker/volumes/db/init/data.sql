-- =============================================
-- Storage and Realtime Setup Only
-- Tables are managed by Supabase CLI migrations
-- =============================================

-- =============================================
-- Storage Setup
-- =============================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- =============================================
-- Realtime Setup
-- =============================================

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
