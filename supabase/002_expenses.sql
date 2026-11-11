-- =========================================================
-- 新增：寵物花費記帳
-- 使用方式：Supabase → SQL Editor → New query → 整段貼上 → Run
-- 可以重複執行，不會出錯。
-- =========================================================

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id      uuid not null references public.pets (id) on delete cascade,
  spent_on    date not null default current_date,
  category    text not null check (category in ('medical', 'food', 'supplies', 'grooming', 'other')),
  item        text not null check (char_length(item) between 1 and 40),
  amount      integer not null check (amount between 1 and 10000000),
  place       text check (place is null or char_length(place) <= 40),
  note        text check (note is null or char_length(note) <= 300),
  created_at  timestamptz not null default now()
);

create index if not exists expenses_pet_date_idx on public.expenses (pet_id, spent_on desc);

alter table public.expenses enable row level security;

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid()))
  );

notify pgrst, 'reload schema';
