-- =========================================================
-- 寵物陪伴 App 資料庫結構
-- 使用方式：Supabase 專案 → SQL Editor → New query
--          整段貼上 → 按 Run。可以重複執行，不會出錯。
-- =========================================================

-- 1. 寵物檔案 ------------------------------------------------
create table if not exists public.pets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 30),
  species     text not null check (species in ('cat', 'dog')),
  sex         text check (sex in ('male', 'female', 'unknown')),
  birthday    date,
  adopted_on  date not null default current_date,   -- 到家日，用來算「到家第幾天」
  weight_kg   numeric(4,1) check (weight_kg is null or weight_kg between 0 and 99),
  created_at  timestamptz not null default now()
);

-- 2. 每日紀錄（每隻寵物每天一筆）----------------------------
--   food / water：0 少、1 正常、2 多
--   urine：0 偏少、1 正常、2 偏多（貓是尿塊數，狗是小便次數）
--   energy：0 差、1 普通、2 好
create table if not exists public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id      uuid not null references public.pets (id) on delete cascade,
  log_date    date not null default current_date,
  food        smallint check (food between 0 and 2),
  water       smallint check (water between 0 and 2),
  urine       smallint check (urine between 0 and 2),
  energy      smallint check (energy between 0 and 2),
  signals     text[] not null default '{}',
  note        text check (note is null or char_length(note) <= 500),
  created_at  timestamptz not null default now(),
  unique (pet_id, log_date)
);

-- 3. 提醒 ----------------------------------------------------
create table if not exists public.reminders (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id       uuid not null references public.pets (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 40),
  freq         text not null check (freq in ('daily', 'weekly', 'monthly', 'yearly', 'once')),
  remind_time  time,
  next_date    date not null default current_date,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 4. 飼主每週心情自評 ----------------------------------------
create table if not exists public.mood_checkins (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null,
  mood        smallint not null check (mood between 1 and 5),
  concern     text,
  created_at  timestamptz not null default now(),
  unique (owner_id, week_start)
);

-- 5. 飼養前準備度評估 ----------------------------------------
create table if not exists public.readiness (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answers     jsonb not null,
  score       smallint not null check (score between 0 and 100),
  created_at  timestamptz not null default now()
);

create index if not exists daily_logs_pet_date_idx on public.daily_logs (pet_id, log_date desc);
create index if not exists reminders_pet_idx on public.reminders (pet_id, next_date);
create index if not exists pets_owner_idx on public.pets (owner_id);

-- =========================================================
-- 權限（Row Level Security）：每個帳號只能看到、修改自己的資料
-- =========================================================
alter table public.pets          enable row level security;
alter table public.daily_logs    enable row level security;
alter table public.reminders     enable row level security;
alter table public.mood_checkins enable row level security;
alter table public.readiness     enable row level security;

drop policy if exists "own pets" on public.pets;
create policy "own pets" on public.pets
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "own logs" on public.daily_logs;
create policy "own logs" on public.daily_logs
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid()))
  );

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid()))
  );

drop policy if exists "own moods" on public.mood_checkins;
create policy "own moods" on public.mood_checkins
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "own readiness" on public.readiness;
create policy "own readiness" on public.readiness
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
