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

-- =========================================================
-- 6. 花費記帳（也可以單獨執行 002_expenses.sql）

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

-- =========================================================
-- 7. 新介面的擴充（也可以單獨執行 003_new_design.sql）
-- =========================================================
-- 1. 每日紀錄改成記數字：克數、毫升、尿塊數、便便狀態
alter table public.daily_logs add column if not exists food_g      integer check (food_g is null or food_g between 0 and 5000);
alter table public.daily_logs add column if not exists water_ml    integer check (water_ml is null or water_ml between 0 and 10000);
alter table public.daily_logs add column if not exists urine_count smallint check (urine_count is null or urine_count between 0 and 50);
alter table public.daily_logs add column if not exists stool       text check (stool is null or stool in ('formed', 'soft', 'diarrhea', 'none'));

-- 2. 提醒：類型、份量、說明、鬧鐘開關、今天是否完成
alter table public.reminders add column if not exists kind       text not null default 'other';
alter table public.reminders add column if not exists amount_g   integer check (amount_g is null or amount_g between 0 and 5000);
alter table public.reminders add column if not exists look       text check (look is null or char_length(look) <= 40);
alter table public.reminders add column if not exists alarm      boolean not null default true;
alter table public.reminders add column if not exists alarm_mode text not null default 'sound';
alter table public.reminders add column if not exists last_done  date;
alter table public.reminders add column if not exists done_note  text;

alter table public.reminders drop constraint if exists reminders_freq_check;
alter table public.reminders add constraint reminders_freq_check
  check (freq in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly', 'once'));
alter table public.reminders drop constraint if exists reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check
  check (kind in ('feed', 'litter', 'med', 'walk', 'deworm', 'vaccine', 'other'));

-- 3. 寵物：飼料熱量（包裝上的 kcal/kg）、開始換飼料的日期
alter table public.pets add column if not exists food_kcal_per_kg integer check (food_kcal_per_kg is null or food_kcal_per_kg between 1000 and 6000);
alter table public.pets add column if not exists food_switch_on   date;

-- 4. 「牠這樣正常嗎？」的每次判斷紀錄
create table if not exists public.checks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pet_id      uuid not null references public.pets (id) on delete cascade,
  symptoms    text[] not null default '{}',
  duration    text not null check (duration in ('today', '1-2d', '2d+')),
  level       smallint not null check (level between 0 and 2),
  created_at  timestamptz not null default now()
);
create index if not exists checks_pet_idx on public.checks (pet_id, created_at desc);

alter table public.checks enable row level security;
drop policy if exists "own checks" on public.checks;
create policy "own checks" on public.checks
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid()))
  );

notify pgrst, 'reload schema';
