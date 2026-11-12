-- =========================================================
-- 003：配合新介面的資料庫擴充
-- 使用方式：Supabase → SQL Editor → New query → 整段貼上 → Run
-- 可以重複執行，不會出錯。
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
