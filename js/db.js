// 和 Supabase 溝通的所有函式都放在這裡
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { addDays } from './util.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------- 帳號 ----------
export async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}
export function onAuthChange(cb) {
  sb.auth.onAuthStateChange((_event, session) => cb(session));
}
export async function signUp(email, password) {
  return check(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }));
}
export async function signIn(email, password) {
  return check(await sb.auth.signInWithPassword({ email, password }));
}
export async function signOut() {
  await sb.auth.signOut();
}

// ---------- 寵物 ----------
export async function listPets() {
  return check(await sb.from('pets').select('*').order('created_at'));
}
export async function savePet(pet) {
  if (pet.id) {
    const { id, ...rest } = pet;
    return check(await sb.from('pets').update(rest).eq('id', id).select().single());
  }
  return check(await sb.from('pets').insert(pet).select().single());
}

// ---------- 每日紀錄 ----------
export async function listLogs(petId, fromDate) {
  let q = sb.from('daily_logs').select('*').eq('pet_id', petId).order('log_date', { ascending: false });
  if (fromDate) q = q.gte('log_date', fromDate);
  return check(await q.limit(60));
}
export async function getLog(petId, date) {
  return check(await sb.from('daily_logs').select('*').eq('pet_id', petId).eq('log_date', date).maybeSingle());
}
export async function saveLog(log) {
  return check(await sb.from('daily_logs').upsert(log, { onConflict: 'pet_id,log_date' }).select().single());
}

// ---------- 提醒 ----------
export async function listReminders(petId) {
  return check(await sb.from('reminders').select('*').eq('pet_id', petId).order('next_date').order('remind_time'));
}
export async function saveReminder(r) {
  if (r.id) {
    const { id, ...rest } = r;
    return check(await sb.from('reminders').update(rest).eq('id', id).select().single());
  }
  return check(await sb.from('reminders').insert(r).select().single());
}
export async function deleteReminder(id) {
  return check(await sb.from('reminders').delete().eq('id', id));
}

// 新寵物的預設提醒
export async function seedReminders(pet, today) {
  const rows =
    pet.species === 'dog'
      ? [
          { title: '餵食', freq: 'daily', remind_time: '08:00', next_date: today },
          { title: '散步', freq: 'daily', remind_time: '19:00', next_date: today },
          { title: '體內驅蟲', freq: 'monthly', remind_time: null, next_date: addDays(today, 7) },
        ]
      : [
          { title: '鏟貓砂', freq: 'daily', remind_time: '21:00', next_date: today },
          { title: '餵食', freq: 'daily', remind_time: '08:00', next_date: today },
          { title: '體內驅蟲', freq: 'monthly', remind_time: null, next_date: addDays(today, 7) },
        ];
  return check(await sb.from('reminders').insert(rows.map((r) => ({ ...r, pet_id: pet.id }))));
}

// ---------- 心情自評 ----------
export async function getMood(weekStart) {
  return check(await sb.from('mood_checkins').select('*').eq('week_start', weekStart).maybeSingle());
}
export async function saveMood(weekStart, mood, concern = null) {
  return check(
    await sb.from('mood_checkins').upsert({ week_start: weekStart, mood, concern }, { onConflict: 'owner_id,week_start' }).select().single(),
  );
}

// ---------- 準備度評估 ----------
export async function saveReadiness(answers, score) {
  return check(await sb.from('readiness').insert({ answers, score }).select().single());
}
export async function lastReadiness() {
  return check(await sb.from('readiness').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle());
}
