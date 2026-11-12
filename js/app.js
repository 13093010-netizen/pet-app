// =========================================================
// 毛孩安心指南：主程式
// 每個畫面是一個 view 函式，網址 # 後面決定顯示哪一個。
// 版面與 class 照設計稿（css/tokens.css、css/components.css）。
// =========================================================
import * as db from './db.js';
import { assessRecords, triage, feedPlan, baseline, streakDays, stageText, ageMonths, dueToday, nextDate } from './rules.js';
import {
  DISCLAIMER, adaptationTip, MOODS, CONCERNS, REHOME_STEPS, FREQ_LABEL, READINESS_QUESTIONS,
  COST_GROUPS, COST_ASOF, COST_SOURCES, costPresets, EXPENSE_CATS,
  askGroups, DURATIONS, STOOL, ENERGY, KINDS, shopList,
} from './content.js';
import { todayISO, addDays, daysBetween, weekStart, fmtDate, weekdayShort, ageText, esc, store } from './util.js';

const APP_NAME = '毛孩安心指南';
const root = document.getElementById('app');
const S = { session: null, pets: [], pet: null, lastCheck: null };

// ================= 圖示 =================
const I = {
  home: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  ask: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/></svg>',
  log: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  bell: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  feed: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 11h16a8 8 0 0 1-16 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/></svg>',
  coin: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1.1 2-2.5 2-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5"/></svg>',
  chevron: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  camera: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  bellSm: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  dots: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  info: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>',
  check: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  paw: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="7" cy="10" r="2"/><circle cx="11" cy="6.5" r="2"/><circle cx="16" cy="7" r="2"/><circle cx="19" cy="11.5" r="2"/><path d="M8.5 17c0-3 2.3-5 4.5-5s4.5 2 4.5 4.5c0 2-1.5 3-3 3-1.2 0-2-.6-3-.6s-1.6.7-2.4.7c-.8 0-.6-1.3-.6-2.6z"/></svg>',
};

// ================= 共用元件 =================
function nav(on) {
  const item = (href, key, label, svg) =>
    `<a href="${href}" ${on === key ? 'aria-current="page"' : ''}>${svg}${label}</a>`;
  return `<nav class="nav" aria-label="主選單">
    ${item('#/home', 'home', '今天', I.home)}
    ${item('#/ask', 'ask', '問問看', I.ask)}
    ${item('#/record', 'record', '紀錄', I.log)}
    ${item('#/reminders', 'reminders', '提醒', I.bell)}
    ${item('#/feed', 'feed', '餵食', I.feed)}
    ${item('#/money', 'money', '花費', I.coin)}
  </nav>`;
}

function shell(body, navOn = null, extra = '') {
  return `<main class="phone">${body}</main>${navOn ? nav(navOn) : ''}${extra}`;
}

function topbar(title, back) {
  return `<div class="topbar">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="返回">${I.back}</a>` : ''}
    <h1 class="page-title">${title}</h1>
  </div>`;
}

function head(title, sub = '') {
  return `<div class="head"><h1 class="page-title">${title}</h1>${sub ? `<span class="page-sub">${sub}</span>` : ''}</div>`;
}

function disclaimer() {
  return `<aside class="disclaimer" aria-label="使用提醒">${I.info}<p>${DISCLAIMER}</p></aside>`;
}

// 表單用的單選／複選
function opt(name, value, label, checked, type = 'radio') {
  return `<label class="opt"><input type="${type}" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
}

// 一組 chip 按鈕（aria-pressed），回傳 HTML；用 bindChips 加上點擊行為
function chips(id, items, picked, { multi = false, fill = false } = {}) {
  return `<div class="chips ${fill ? 'chips--fill' : ''}" id="${id}" data-pick="${multi ? 'multi' : 'single'}" role="group">
    ${items.map((it) => `<button type="button" class="chip" data-v="${esc(it.v)}" aria-pressed="${(multi ? picked.includes(it.v) : picked === it.v) ? 'true' : 'false'}">${it.label}</button>`).join('')}
  </div>`;
}
function bindChips(id, onChange) {
  const g = document.getElementById(id);
  if (!g) return;
  const multi = g.dataset.pick === 'multi';
  g.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    if (multi) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
    else g.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === c));
    onChange?.(chipValue(id));
  });
}
function chipValue(id) {
  const g = document.getElementById(id);
  const on = [...g.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.v);
  return g.dataset.pick === 'multi' ? on : on[0] ?? null;
}

function render(html) {
  root.innerHTML = html;
  window.scrollTo(0, 0);
}
function loading() {
  render('<main class="phone"><div class="center-fill"><div class="spinner" role="status" aria-label="載入中"></div></div></main>');
}

let toastTimer;
function toast(msg, bad = false) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast show ${bad ? 'bad' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 2600);
}

function errText(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return '電子郵件或密碼不正確';
  if (/already registered|already exists/i.test(m)) return '這個電子郵件已經註冊過了，請直接登入';
  if (/Email not confirmed/i.test(m)) return '請先到信箱點確認信，再回來登入';
  if (/Password should be at least/i.test(m)) return '密碼至少要 6 個字元';
  if (/rate limit/i.test(m)) return '嘗試太多次了，請稍等幾分鐘再試';
  if (/public\.expenses/i.test(m)) return '記帳功能需要先在 Supabase 執行 002_expenses.sql';
  if (/food_g|water_ml|urine_count|stool|amount_g|last_done|alarm|public\.checks|food_kcal|food_switch|kind/i.test(m)) return '新版功能需要先在 Supabase 執行 003_new_design.sql';
  if (/Failed to fetch|NetworkError/i.test(m)) return '連不上網路，請確認網路後再試';
  return `發生錯誤：${m}`;
}

const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
const money = (n) => `NT$ ${Number(n).toLocaleString('zh-TW')}`;
const petDay = (pet, today) => daysBetween(pet.adopted_on, today) + 1;
const urineUnit = (pet) => (pet.species === 'dog' ? '次' : '塊');
const stoolLabel = (k) => STOOL.find((s) => s.key === k)?.label ?? '—';
const kindOf = (k) => KINDS.find((x) => x.key === k) || KINDS[KINDS.length - 1];

// ================= 登入／註冊 =================
function viewSetup() {
  render(shell(`${head('尚未設定資料庫')}<section class="card"><p>請在 config.js 填入 Supabase 的網址和金鑰，再重新整理。</p></section>`));
}

function viewAuth(mode = 'login') {
  const isLogin = mode === 'login';
  render(shell(`
    <div class="brand">
      <div class="brand-mark">${I.paw}</div>
      <h1 class="page-title">${APP_NAME}</h1>
      <p class="page-sub">陪新手飼主度過最需要幫忙的前 90 天</p>
    </div>
    <div class="seg seg--links" role="tablist">
      <a role="tab" href="#/login" aria-selected="${isLogin}">登入</a>
      <a role="tab" href="#/signup" aria-selected="${!isLogin}">註冊</a>
    </div>
    <form id="auth-form" class="card" novalidate>
      <label class="field">電子郵件<input name="email" type="email" autocomplete="email" inputmode="email" required></label>
      <label class="field">密碼<input name="password" type="password" minlength="6" required autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="至少 6 個字元"></label>
      <p class="form-error" id="auth-error" role="alert"></p>
      <button class="btn btn--primary" type="submit">${isLogin ? '登入' : '建立帳號'}</button>
    </form>`));

  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = String(f.get('email')).trim();
    const password = String(f.get('password'));
    const errEl = $('#auth-error');
    if (!email || password.length < 6) return (errEl.textContent = '請輸入電子郵件，密碼至少 6 個字元');
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      if (isLogin) await db.signIn(email, password);
      else {
        const data = await db.signUp(email, password);
        if (!data.session) {
          render(shell(`${head('請收信確認')}<section class="card"><p>確認信已寄到 <b>${esc(email)}</b>，點信裡的連結後再回來登入。</p><a class="btn btn--primary" href="#/login">回到登入</a></section>`));
          return;
        }
      }
    } catch (err) {
      errEl.textContent = errText(err);
      btn.disabled = false;
    }
  });
}

function viewWelcome() {
  render(shell(`
    ${head('歡迎！你現在是？', '選一個開始，之後都可以再改')}
    <a class="card card--dark" href="#/pet/new" style="flex-direction:row;align-items:center;padding:18px">
      <span class="grow" style="display:flex;flex-direction:column;gap:4px"><span style="font-size:18px;font-weight:700">已經有貓狗了</span><span class="small" style="color:var(--color-on-dark)">建立檔案，開始每天 1 分鐘紀錄</span></span>${I.chevron}
    </a>
    <a class="card" href="#/readiness" style="flex-direction:row;align-items:center;padding:18px">
      <span class="grow" style="display:flex;flex-direction:column;gap:4px"><span style="font-size:18px;font-weight:700">還在考慮要不要養</span><span class="hint">花 2 分鐘做飼養準備度評估</span></span>${I.chevron}
    </a>
    <button class="btn btn--ghost" id="logout">登出</button>`));
  $('#logout').addEventListener('click', () => db.signOut());
}

// ================= 寵物檔案 =================
function viewPetForm(edit) {
  const today = todayISO();
  const p = edit ? S.pet : { name: '', species: 'cat', sex: 'unknown', birthday: '', adopted_on: today, weight_kg: '' };
  const back = edit ? '#/pet' : S.pets.length ? '#/pet' : '#/welcome';
  render(shell(`
    ${topbar(edit ? '編輯寵物檔案' : '新增寵物', back)}
    <form id="pet-form" class="card" style="gap:14px" novalidate>
      <label class="field">名字<input name="name" required maxlength="30" value="${esc(p.name)}" placeholder="例如：毛毛"></label>
      <fieldset><legend>種類</legend><div class="chips chips--fill">${opt('species', 'cat', '貓', p.species === 'cat')}${opt('species', 'dog', '狗', p.species === 'dog')}</div></fieldset>
      <fieldset><legend>性別</legend><div class="chips chips--fill">${opt('sex', 'female', '母', p.sex === 'female')}${opt('sex', 'male', '公', p.sex === 'male')}${opt('sex', 'unknown', '不確定', !p.sex || p.sex === 'unknown')}</div></fieldset>
      <div class="two">
        <label class="field">到家日<input name="adopted_on" type="date" required max="${today}" value="${esc(p.adopted_on)}"></label>
        <label class="field">生日（大概）<input name="birthday" type="date" max="${today}" value="${esc(p.birthday || '')}"></label>
      </div>
      <label class="field">體重（公斤）<input name="weight_kg" type="number" inputmode="decimal" step="0.1" min="0" max="99" value="${esc(p.weight_kg ?? '')}" placeholder="例如 1.8"></label>
      <span class="hint">生日和體重會用來算每天該吃多少，可以之後再補。</span>
      <p class="form-error" id="pet-error" role="alert"></p>
      <button class="btn btn--primary" type="submit">${edit ? '儲存' : '建立檔案'}</button>
    </form>`));

  $('#pet-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('name')).trim();
    if (!name) return ($('#pet-error').textContent = '請輸入名字');
    const row = {
      name,
      species: f.get('species'),
      sex: f.get('sex'),
      adopted_on: f.get('adopted_on') || today,
      birthday: f.get('birthday') || null,
      weight_kg: f.get('weight_kg') ? Number(f.get('weight_kg')) : null,
    };
    if (edit) row.id = S.pet.id;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const saved = await db.savePet(row);
      if (!edit) await db.seedReminders(saved, today, feedPlan(saved, today));
      await loadPets(saved.id);
      toast(edit ? '已儲存' : `歡迎${saved.name}回家！`);
      location.hash = edit ? '#/pet' : '#/home';
    } catch (err) {
      $('#pet-error').textContent = errText(err);
      btn.disabled = false;
    }
  });
}

// ================= 今天（首頁） =================
async function viewHome() {
  const pet = S.pet;
  const today = todayISO();
  const [logs, reminders, mood] = await Promise.all([
    db.listLogs(pet.id, addDays(today, -14)),
    db.listReminders(pet.id),
    db.getMood(weekStart(today)).catch(() => null),
  ]);
  const day = petDay(pet, today);
  const a = assessRecords(logs, pet, today);
  const t = logs.find((l) => l.log_date === today) || {};
  const bf = baseline(logs, 'food_g', today);
  const bw = baseline(logs, 'water_ml', today);
  const bu = baseline(logs, 'urine_count', today);
  const streak = streakDays(logs, today);
  const tip = adaptationTip(pet.species, day);
  const due = reminders.filter((r) => dueToday(r, today));
  const done = due.filter((r) => r.last_done === today).length;

  const sub = [esc(pet.name), stageText(pet, today), pet.weight_kg ? `${pet.weight_kg} kg` : ''].filter(Boolean).join('・');
  const switcher = S.pets.length > 1
    ? `<label class="sr-only" for="pet-switch">切換寵物</label><select id="pet-switch" class="input" style="width:auto;min-height:40px;padding:6px 10px">${S.pets.map((p) => `<option value="${p.id}" ${p.id === pet.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`
    : '';

  const stat = (name, val, unit, usual, alert) => `
    <div class="stat ${alert ? 'stat--alert' : ''}"><span class="stat__name">${name}</span>
      <span class="stat__num">${val ?? '—'}${val != null && unit ? ` <small>${unit}</small>` : ''}</span>
      <span class="stat__usual">${usual}</span></div>`;

  const finding = ['watch', 'vet', 'urgent'].includes(a.state)
    ? `<a class="card card--peach" href="#/status" style="flex-direction:row;align-items:center">
        <span class="grow" style="display:flex;flex-direction:column;gap:2px">
          <span style="font-size:12px;font-weight:700;color:var(--color-peach-ink)">從紀錄發現</span>
          <span style="font-size:15px;font-weight:500;line-height:1.45">${esc(a.title)}</span>
        </span><span style="color:var(--color-peach-ink)">${I.chevron}</span></a>`
    : a.state === 'calm'
      ? `<a class="card card--sage" href="#/status" style="flex-direction:row;align-items:center">
          <span class="grow" style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:12px;font-weight:700;color:var(--color-sage-ink)">從紀錄看</span>
            <span style="font-size:15px;font-weight:500;line-height:1.45">${esc(a.title)}</span>
          </span><span style="color:var(--color-sage-ink)">${I.chevron}</span></a>`
      : '';

  const installHint = !isStandalone() && store('hideInstall') !== '1'
    ? `<section class="card card--lav install"><p class="grow small" style="color:var(--color-lav-ink)"><b>加到主畫面，用起來像 App</b><br>iPhone：Safari 下方「分享」→「加入主畫面」</p>
       <button class="icon-btn" id="hide-install" aria-label="關閉提示" style="width:32px;height:32px">✕</button></section>`
    : '';

  render(shell(`
    <div class="head-row">
      <a class="avatar" href="#/pet" aria-label="${esc(pet.name)}的檔案">${esc(pet.name.slice(0, 1))}</a>
      <div class="head grow"><span class="page-sub">${sub}</span><h1 class="page-title">到家第 ${day} 天</h1></div>
      ${switcher}
    </div>
    ${installHint}
    <section class="card">
      ${day <= 90 ? `<div class="hint" style="display:flex;justify-content:space-between"><span>新手前 90 天</span><span>剩 ${90 - day} 天</span></div>
      <div class="bar"><span style="width:${Math.max(3, Math.round((day / 90) * 100))}%"></span></div>` : `<span class="hint">已經一起度過新手 90 天了！</span>`}
      ${tip ? `<p style="margin-top:4px;font-size:14px;line-height:1.55"><b>${esc(tip.title)}：</b>${esc(tip.body)}</p>` : ''}
    </section>
    <a class="card card--dark" href="#/ask" style="flex-direction:row;align-items:center;padding:18px">
      <span class="grow" style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:20px;font-weight:700">牠這樣正常嗎？</span>
        <span style="font-size:13px;color:var(--color-on-dark)">不吃、拉肚子、躲起來…點一點，幫你判斷要不要看醫生</span>
      </span>
      <span aria-hidden="true" style="width:44px;height:44px;border-radius:999px;background:#F6D7BF;color:var(--color-ink);display:grid;place-items:center">${I.chevron}</span>
    </a>
    ${finding}
    <section class="card">
      <div class="row-between"><h2 class="card-title" style="font-size:16px">今天的紀錄</h2><a href="#/record" class="link">＋ 記一筆</a></div>
      <div class="stats">
        ${stat('食量', t.food_g, 'g', bf ? `平常 ${bf}` : '—', bf && t.food_g != null && t.food_g < bf * 0.6)}
        ${stat('喝水', t.water_ml, 'ml', bw ? `平常 ${bw}` : '—', bw && t.water_ml != null && t.water_ml < bw * 0.5)}
        ${stat('尿', t.urine_count, urineUnit(pet), bu != null ? `平常 ${bu}` : '—', pet.species !== 'dog' && t.urine_count === 0)}
        ${stat('便便', t.stool ? stoolLabel(t.stool) : null, '', ENERGY.find((x) => x.v === t.energy)?.label ? `精神${ENERGY.find((x) => x.v === t.energy).label}` : '—', t.stool === 'diarrhea')}
      </div>
      <span class="hint">${streak ? `已連續記錄 ${streak} 天，越記越懂${esc(pet.name)}的「正常」` : '每天記一次，就能算出牠的「平常」'}</span>
    </section>
    ${due.length ? `<a class="card" href="#/reminders" style="flex-direction:row;align-items:center">
      <span class="grow"><span class="card-title">今天的提醒</span><br><span class="hint">已完成 ${done} / ${due.length}</span></span>${I.chevron}</a>` : ''}
    ${mood ? '' : `<section class="card">
      <h2 class="card-title">這週照顧${esc(pet.name)}，你感覺如何？</h2>
      <span class="hint">每週一題，只有你看得到</span>
      <div class="mood-row">${MOODS.map((m, i) => `<button type="button" class="chip" data-mood="${i + 1}">${m}</button>`).join('')}</div>
    </section>`}
    ${disclaimer()}
  `, 'home'));

  $('#pet-switch')?.addEventListener('change', (e) => { selectPet(e.target.value); viewHome(); });
  $('#hide-install')?.addEventListener('click', () => { store('hideInstall', '1'); $('.install')?.remove(); });
  $$('[data-mood]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await db.saveMood(weekStart(today), Number(b.dataset.mood));
      location.hash = `#/support/${b.dataset.mood}`;
    } catch (err) { toast(errText(err), true); }
  }));
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// ================= 問問看：牠這樣正常嗎？ =================
async function viewAsk() {
  const pet = S.pet;
  const today = todayISO();
  const logs = await db.listLogs(pet.id, addDays(today, -14));
  const groups = askGroups(pet.species);
  const prev = S.lastCheck?.petId === pet.id ? S.lastCheck : null;
  const logDays = new Set(logs.map((l) => l.log_date)).size;

  render(shell(`
    ${head('牠這樣正常嗎？', '點你看到的樣子，可以選很多個')}
    ${groups.map((g, i) => `<section class="card"><span class="card-label">${g.label}</span>
      ${chips(`sym-${i}`, g.items.map((s) => ({ v: s, label: s })), prev?.symptoms || [], { multi: true })}</section>`).join('')}
    <section class="card"><span class="card-label">多久了？</span>
      ${chips('dur', DURATIONS.map((d) => ({ v: d.key, label: d.label })), prev?.duration || 'today', { fill: true })}</section>
    <button class="btn btn--primary" id="judge" style="height:54px">幫我判斷・已選 <span id="sym-count">0</span> 項</button>
    <span class="hint center">${logDays ? `會一起看${esc(pet.name)}這 ${logDays} 天的紀錄` : `先到「紀錄」記下食量和喝水，判斷會更準`}</span>
  `, 'ask'));

  const picked = () => groups.flatMap((_, i) => chipValue(`sym-${i}`));
  const update = () => {
    const n = picked().length;
    $('#sym-count').textContent = n;
    $('#judge').disabled = n === 0;
  };
  groups.forEach((_, i) => bindChips(`sym-${i}`, update));
  bindChips('dur');
  update();

  $('#judge').addEventListener('click', async () => {
    const symptoms = picked();
    const duration = chipValue('dur') || 'today';
    const result = triage(symptoms, duration, pet, logs, today);
    S.lastCheck = { petId: pet.id, symptoms, duration, result };
    try { await db.saveCheck({ pet_id: pet.id, symptoms, duration, level: result.level }); } catch (err) { console.warn(err); }
    location.hash = '#/result';
  });
}

// ================= 判斷結果（共用版面） =================
function costRange(keys) {
  const all = COST_GROUPS.flatMap((g) => g.items);
  let lo = 0, hi = 0;
  const names = [];
  for (const [k, q] of Object.entries(keys)) {
    const it = all.find((x) => x.key === k);
    if (!it) continue;
    lo += it.min * q;
    hi += it.max * q;
    names.push(it.name.replace(/（.*）/, ''));
  }
  return { lo, hi, names };
}

function resultCards(r, pet, backHref) {
  const tone = r.level === 0 ? (r.state === 'watch' ? 'peach' : 'sage') : 'peach';
  const label = ['在家觀察', '今天看醫生', '立刻就醫'][r.level];
  const cost = r.costKeys ? costRange(r.costKeys) : null;
  return `
    <section class="card card--${tone}" style="padding:18px;gap:10px">
      <div class="meter" data-level="${r.level}" role="img" aria-label="建議等級：${label}"><span>在家觀察</span><span>今天看醫生</span><span>立刻就醫</span></div>
      <h1 style="font-size:22px;line-height:1.35">${esc(r.title)}</h1>
      <p style="font-size:14px;line-height:1.6">${esc(r.body)}</p>
    </section>
    ${disclaimer()}
    ${r.evidence?.length ? `<section class="card"><span class="card-label">看了${esc(pet.name)}的紀錄</span>
      <div class="lines">${r.evidence.map((x) => `<span>・${esc(x)}</span>`).join('')}</div></section>` : ''}
    ${r.todo?.length ? `<section class="card"><span class="card-label">現在可以做</span>
      <div class="lines">${r.todo.map((x, i) => `<span>${i + 1}. ${esc(x)}</span>`).join('')}</div>
      ${r.warn ? `<span class="warn">${esc(r.warn)}</span>` : ''}</section>` : ''}
    <section class="card card--lav"><span class="card-label" style="color:var(--color-lav-ink)">費用心理準備</span>
      ${cost
        ? `<div class="row-between"><span class="small">${esc(cost.names.join('＋'))}</span><b>${money(cost.lo)}–${cost.hi.toLocaleString('zh-TW')}</b></div>
           <span class="hint" style="color:var(--color-lav-ink)">依動物醫院公開價目與公會收費上限整理，實際以醫院為準。<a href="#/cost" style="text-decoration:underline">詳細試算</a></span>`
        : `<div class="row-between"><span class="small">這次先不用看醫生</span><b>省下一趟掛號費</b></div>`}
    </section>
    <a class="btn btn--dark" href="#/record">去記今天的紀錄</a>
    <a class="btn btn--ghost" href="${backHref}">回上一頁</a>`;
}

function viewResult() {
  const c = S.lastCheck;
  if (!c || c.petId !== S.pet.id) return (location.hash = '#/ask');
  const pet = S.pet;
  render(shell(`
    <div class="head-row">
      <a class="icon-btn" href="#/ask" aria-label="返回">${I.back}</a>
      <span class="hint grow">你選的：${esc(c.symptoms.join('、'))}・${DURATIONS.find((d) => d.key === c.duration)?.label}</span>
    </div>
    ${resultCards({ ...c.result, state: c.result.level ? 'vet' : 'calm' }, pet, '#/ask')}
  `, 'ask'));
}

async function viewStatus() {
  const pet = S.pet;
  const today = todayISO();
  const logs = await db.listLogs(pet.id, addDays(today, -14));
  const a = assessRecords(logs, pet, today);
  const costKeys = a.level === 2 ? { er: 1, blood: 1, xray: 1 } : a.level === 1 ? { visit: 1 } : null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const by = Object.fromEntries(logs.map((l) => [l.log_date, l]));
  render(shell(`
    ${topbar('從紀錄看', '#/home')}
    ${resultCards({ ...a, costKeys }, pet, '#/home')}
    <section class="card"><span class="card-label">最近 7 天</span>
      <ul class="list">${days.map((d) => {
        const l = by[d];
        return `<li class="list-row" style="font-size:14px"><span style="width:62px" class="${d === today ? '' : 'muted'}">${d === today ? '今天' : fmtDate(d, false) + ' ' + weekdayShort(d)}</span>
          ${l ? `<span class="grow">${l.food_g ?? '—'} g・${l.water_ml ?? '—'} ml・${l.urine_count ?? '—'} ${urineUnit(pet)}${l.stool ? '・' + stoolLabel(l.stool) : ''}</span>` : '<span class="grow hint">沒有紀錄</span>'}
          <a class="link" href="#/record/${d}">${l ? '修改' : '補記'}</a></li>`;
      }).join('')}</ul></section>
  `, 'home'));
}

// ================= 紀錄：每日 1 分鐘 =================
async function viewRecord(date) {
  const pet = S.pet;
  const today = todayISO();
  if (!date || date > today) date = today;
  const [logs, existing] = await Promise.all([db.listLogs(pet.id, addDays(date, -8)), db.getLog(pet.id, date)]);
  const l = existing || {};
  const plan = feedPlan(pet, today);
  const isCat = pet.species !== 'dog';
  const bf = baseline(logs, 'food_g', date);
  const bw = baseline(logs, 'water_ml', date);
  const bu = baseline(logs, 'urine_count', date);
  const val = { food_g: l.food_g ?? null, water_ml: l.water_ml ?? null, urine_count: l.urine_count ?? null };
  const start = { food_g: bf ?? plan?.grams ?? 50, water_ml: bw ?? (isCat ? 150 : 300), urine_count: bu ?? (isCat ? 3 : 4) };

  const stepper = (key, label, hint, unit, step) => `
    <div class="stepper" data-key="${key}" data-step="${step}">
      <div class="stepper__label"><h2 class="card-title">${label}</h2><span class="hint">${hint}</span></div>
      <button type="button" class="stepper__btn" data-dec aria-label="${label}減少">−</button>
      <span class="stepper__value"><span data-value>${val[key] ?? '—'}</span><span class="stepper__unit"> ${unit}</span></span>
      <button type="button" class="stepper__btn stepper__btn--plus" data-inc aria-label="${label}增加">+</button>
    </div>`;

  render(shell(`
    ${date === today ? head('今天的 1 分鐘紀錄', '記克數和毫升，你和醫生都看得懂') : topbar(`${fmtDate(date)}的紀錄`, '#/history')}
    <section class="card">${stepper('food_g', '食量', [bf ? `平常 ${bf} g` : '', plan ? `建議 ${plan.grams} g` : ''].filter(Boolean).join('・') || '今天總共吃了幾克', 'g', 5)}</section>
    <section class="card">${stepper('water_ml', '喝水', bw ? `平常 ${bw} ml` : '水碗少了多少', 'ml', 10)}
      <div class="chips chips--fill">${[30, 50, 100].map((n) => `<button type="button" class="chip" data-add="${n}">+${n} ml</button>`).join('')}</div></section>
    <section class="card">${stepper('urine_count', isCat ? '尿（貓砂結塊）' : '尿尿次數', bu != null ? `平常 ${bu} ${urineUnit(pet)}` : isCat ? '今天鏟到幾塊' : '今天尿了幾次', urineUnit(pet), 1)}</section>
    <section class="card"><h2 class="card-title">便便</h2>${chips('stool', STOOL.map((s) => ({ v: s.key, label: s.label })), l.stool ?? null, { fill: true })}</section>
    <section class="card"><h2 class="card-title">精神</h2>${chips('energy', ENERGY.map((e) => ({ v: String(e.v), label: e.label })), l.energy != null ? String(l.energy) : null, { fill: true })}</section>
    <section class="card"><label class="field">備註（選填）<input id="note" maxlength="500" value="${esc(l.note || '')}" placeholder="例如：昨天換了新飼料"></label></section>
    <button class="btn btn--primary" id="save">儲存</button>
    <a class="link center" href="#/history">看過去的紀錄</a>
  `, 'record'));

  $$('.stepper').forEach((box) => {
    const key = box.dataset.key;
    const step = Number(box.dataset.step);
    const out = box.querySelector('[data-value]');
    const show = () => (out.textContent = val[key] ?? '—');
    box.querySelector('[data-inc]').addEventListener('click', () => { val[key] = val[key] == null ? start[key] : val[key] + step; show(); });
    box.querySelector('[data-dec]').addEventListener('click', () => { val[key] = val[key] == null ? start[key] : Math.max(0, val[key] - step); show(); });
    box.show = show;
  });
  $$('[data-add]').forEach((b) => b.addEventListener('click', () => {
    val.water_ml = (val.water_ml ?? 0) + Number(b.dataset.add);
    $('.stepper[data-key="water_ml"]').show();
  }));
  bindChips('stool');
  bindChips('energy');

  $('#save').addEventListener('click', async (e) => {
    const energy = chipValue('energy');
    const row = {
      pet_id: pet.id,
      log_date: date,
      ...val,
      stool: chipValue('stool'),
      energy: energy == null ? null : Number(energy),
      note: $('#note').value.trim() || null,
    };
    if (Object.entries(row).filter(([k]) => !['pet_id', 'log_date'].includes(k)).every(([, v]) => v == null)) return toast('至少填一個項目', true);
    e.target.disabled = true;
    try {
      await db.saveLog(row);
      toast('已儲存');
      location.hash = date === today ? '#/home' : '#/history';
    } catch (err) {
      toast(errText(err), true);
      e.target.disabled = false;
    }
  });
}

async function viewHistory() {
  const pet = S.pet;
  const today = todayISO();
  const logs = await db.listLogs(pet.id, addDays(today, -59));
  render(shell(`
    ${topbar(`${esc(pet.name)}的紀錄`, '#/record')}
    ${logs.length ? logs.map((l) => `
      <a class="card" href="#/record/${l.log_date}">
        <div class="row-between"><b>${l.log_date === today ? '今天' : fmtDate(l.log_date)}</b><span class="link">修改</span></div>
        <div class="stats">
          <div class="stat"><span class="stat__name">食量</span><span class="stat__num">${l.food_g ?? '—'}${l.food_g != null ? ' <small>g</small>' : ''}</span></div>
          <div class="stat"><span class="stat__name">喝水</span><span class="stat__num">${l.water_ml ?? '—'}${l.water_ml != null ? ' <small>ml</small>' : ''}</span></div>
          <div class="stat"><span class="stat__name">尿</span><span class="stat__num">${l.urine_count ?? '—'}${l.urine_count != null ? ` <small>${urineUnit(pet)}</small>` : ''}</span></div>
          <div class="stat ${l.stool === 'diarrhea' ? 'stat--alert' : ''}"><span class="stat__name">便便</span><span class="stat__num" style="font-size:15px">${l.stool ? stoolLabel(l.stool) : '—'}</span></div>
        </div>
        ${l.note ? `<span class="hint">${esc(l.note)}</span>` : ''}
      </a>`).join('')
      : `<section class="card center"><p>還沒有紀錄。</p><a class="btn btn--primary" href="#/record">記第一筆</a></section>`}
  `, 'record'));
}

// ================= 提醒：票根＋新增鬧鐘 =================
async function viewReminders() {
  const pet = S.pet;
  const today = todayISO();
  const [list, logs] = await Promise.all([db.listReminders(pet.id), db.listLogs(pet.id, addDays(today, -8))]);
  const isCat = pet.species !== 'dog';
  const bu = baseline(logs, 'urine_count', today) ?? (isCat ? 3 : null);
  const day = petDay(pet, today);
  const byTime = (a, b) => (a.remind_time || '99').localeCompare(b.remind_time || '99');
  const due = list.filter((r) => dueToday(r, today)).sort(byTime);
  const later = list.filter((r) => r.enabled && !dueToday(r, today) && r.freq !== 'daily' && r.freq !== 'weekdays' && !(r.freq === 'once' && r.last_done)).sort((a, b) => a.next_date.localeCompare(b.next_date));
  const off = list.filter((r) => !r.enabled);
  const doneN = due.filter((r) => r.last_done === today).length;

  const ticket = (r) => {
    const k = kindOf(r.kind);
    const isDone = r.last_done === today;
    const title = `${esc(r.title)}${r.kind === 'feed' && r.amount_g ? ` ${r.amount_g} g` : ''}`;
    let action;
    if (r.kind === 'litter' && isCat) {
      const base = bu ?? 3;
      const nums = [Math.max(0, base - 1), base, base + 1];
      action = `<div class="ticket__counts">${nums.map((n) => `<button class="ticket__btn" style="width:36px;padding:0" data-done="${r.id}" data-urine="${n}" aria-label="清好了，${n} 塊">${n}</button>`).join('')}</div>`;
    } else {
      const word = { feed: '餵好了', med: '吃了', walk: '走好了', litter: '清好了' }[r.kind] || '完成';
      action = `<button class="ticket__btn" data-done="${r.id}">${word}</button>`;
    }
    return `<div class="ticket ${k.tone ? 'ticket--' + k.tone : ''} ${isDone ? 'is-done' : ''}">
      <div class="ticket__stub">${r.remind_time ? r.remind_time.slice(0, 5) : '今天'}
        <button class="bell" data-bell="${r.id}" aria-pressed="${r.alarm !== false}" aria-label="${r.alarm !== false ? '關閉這個鬧鐘' : '開啟這個鬧鐘'}">${I.bellSm}</button></div>
      <div class="ticket__body">
        <div class="ticket__text"><span class="ticket__title">${title}</span>${r.look ? `<span class="ticket__look">${esc(r.look)}</span>` : ''}</div>
        ${action}
        <button class="ticket__done" data-undo="${r.id}" aria-label="還原">✓ ${esc(r.done_note || '完成')}</button>
        <button class="ticket__more" data-edit="${r.id}" aria-label="編輯 ${esc(r.title)}">${I.dots}</button>
      </div></div>`;
  };

  render(shell(`
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px">
      ${head('今天的提醒', `已完成 ${doneN} / ${due.length}・做完一按就幫你記好`)}
      <button class="btn btn--dark btn--small" id="open-add">＋ 新增鬧鐘</button>
    </div>
    <div class="stack" style="gap:8px">${due.length ? due.map(ticket).join('') : '<section class="card"><p class="hint">今天沒有提醒。</p></section>'}</div>
    <section class="card">
      <div class="row-between"><h2 class="card-title">${day <= 90 ? '新手 90 天要做的' : '接下來要做的'}</h2><span class="hint" style="font-size:11px">以醫生建議為準</span></div>
      ${day <= 14 ? `<div class="upcoming"><span>第一次健康檢查</span><b style="color:var(--color-peach-ink);font-size:13px">到家第 14 天（${fmtDate(addDays(pet.adopted_on, 13), false)}）</b></div>` : ''}
      ${later.map((r) => `<div class="upcoming"><button class="link" style="color:var(--color-ink);font-weight:400;font-size:14px;text-align:left" data-edit="${r.id}">${esc(r.title)}・${FREQ_LABEL[r.freq]}</button><span class="hint">${fmtDate(r.next_date, false)}</span></div>`).join('')}
      ${!later.length && day > 14 ? '<span class="hint">用「新增鬧鐘」加上驅蟲、疫苗等定期提醒。</span>' : ''}
    </section>
    ${off.length ? `<section class="card"><span class="card-label">已關閉的提醒</span>${off.map((r) => `<div class="upcoming"><span class="muted">${esc(r.title)}</span><button class="link" data-edit="${r.id}">編輯</button></div>`).join('')}</section>` : ''}
    <span class="hint center">漏掉一次也沒關係，晚點補記就好</span>
  `, 'reminders', reminderSheet(pet)));

  const find = (id) => list.find((r) => r.id === id);
  $$('[data-done]').forEach((b) => b.addEventListener('click', async () => {
    const r = find(b.dataset.done);
    b.disabled = true;
    try {
      let note = '完成';
      if (r.kind === 'feed' && r.amount_g) {
        const cur = await db.getLog(pet.id, today);
        await db.saveLog({ pet_id: pet.id, log_date: today, food_g: (cur?.food_g ?? 0) + r.amount_g });
        note = `記了 ${r.amount_g} g`;
      } else if (b.dataset.urine) {
        await db.saveLog({ pet_id: pet.id, log_date: today, urine_count: Number(b.dataset.urine) });
        note = `記了 ${b.dataset.urine} 塊`;
      } else if (r.kind === 'med') note = '已餵藥';
      const next = nextDate(r, today);
      await db.saveReminder({ id: r.id, last_done: today, done_note: note, ...(next ? { next_date: next } : {}) });
      toast(note);
      viewReminders();
    } catch (err) { toast(errText(err), true); b.disabled = false; }
  }));
  $$('[data-undo]').forEach((b) => b.addEventListener('click', async () => {
    const r = find(b.dataset.undo);
    try {
      if (r.kind === 'feed' && r.amount_g) {
        const cur = await db.getLog(pet.id, today);
        if (cur?.food_g != null) await db.saveLog({ pet_id: pet.id, log_date: today, food_g: Math.max(0, cur.food_g - r.amount_g) });
      }
      await db.saveReminder({ id: r.id, last_done: null, done_note: null, next_date: today, enabled: true });
      viewReminders();
    } catch (err) { toast(errText(err), true); }
  }));
  $$('[data-bell]').forEach((b) => b.addEventListener('click', async () => {
    const r = find(b.dataset.bell);
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? '關閉這個鬧鐘' : '開啟這個鬧鐘');
    try { await db.saveReminder({ id: r.id, alarm: on }); toast(on ? '鬧鐘已開啟' : '鬧鐘已關閉'); } catch (err) { toast(errText(err), true); }
  }));
  bindSheet(pet, list, today);
}

function reminderSheet(pet) {
  const kinds = KINDS.filter((k) => (pet.species === 'dog' ? !k.cat : !k.dog));
  return `<div class="sheet" id="add-alarm">
    <button class="sheet__backdrop" data-close aria-label="關閉"></button>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="row-between"><h2 style="font-size:20px" id="sheet-title">新增鬧鐘</h2><button class="icon-btn" data-close aria-label="關閉" style="background:var(--color-soft)">✕</button></div>
      <span class="card-label">要提醒什麼</span>
      ${chips('s-kind', kinds.map((k) => ({ v: k.key, label: k.label })), 'feed')}
      <label class="field">名稱<input id="s-title" maxlength="40" placeholder="例如：餵早餐"></label>
      <div class="card" style="align-items:center;gap:4px">
        <label class="sr-only" for="s-time">時間</label>
        <input id="s-time" class="time-input" type="time" value="08:00">
        <label class="row small" style="gap:6px;font-weight:500"><input type="checkbox" id="s-notime"> 不指定時間（當天提醒）</label>
      </div>
      <div id="s-amount-row" class="card">
        <div class="stepper" id="s-amount">
          <div class="stepper__label"><span class="card-title">份量</span><span class="hint">完成時自動加進今天的食量</span></div>
          <button type="button" class="stepper__btn" data-dec aria-label="份量減少">−</button>
          <span class="stepper__value"><span data-value>18</span><span class="stepper__unit"> g</span></span>
          <button type="button" class="stepper__btn stepper__btn--plus" data-inc aria-label="份量增加">+</button>
        </div>
      </div>
      <span class="card-label">重複</span>
      ${chips('s-freq', [['daily', '每天'], ['weekdays', '平日'], ['weekly', '每週'], ['monthly', '每月'], ['yearly', '每年'], ['once', '只有一次']].map(([v, label]) => ({ v, label })), 'daily')}
      <label class="field" id="s-date-row">從哪天開始<input id="s-date" type="date"></label>
      <span class="card-label">提醒方式</span>
      ${chips('s-mode', [{ v: 'sound', label: '響鈴' }, { v: 'silent', label: '只跳通知' }], 'sound', { fill: true })}
      <span class="hint">手機鬧鐘通知會在下一版開啟推播後生效，需要先把 App 加到主畫面。</span>
      <p class="form-error" id="s-error" role="alert"></p>
      <button class="btn btn--primary" id="s-save">設好了</button>
      <button class="btn btn--danger" id="s-del" hidden>刪除這個提醒</button>
    </div></div>`;
}

function bindSheet(pet, list, today) {
  const sheet = $('#add-alarm');
  const el = (id) => document.getElementById(id);
  let editing = null;
  let amount = 18;
  const amountOut = sheet.querySelector('#s-amount [data-value]');
  const setAmount = (n) => { amount = Math.max(0, n); amountOut.textContent = amount; };
  sheet.querySelector('#s-amount [data-inc]').addEventListener('click', () => setAmount(amount + 1));
  sheet.querySelector('#s-amount [data-dec]').addEventListener('click', () => setAmount(amount - 1));

  const setPick = (id, v) => el(id).querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.v === v));
  const syncKind = (fromUser) => {
    const k = chipValue('s-kind');
    el('s-amount-row').hidden = k !== 'feed';
    if (fromUser) el('s-title').value = kindOf(k).label === '其他' ? '' : kindOf(k).label;
  };
  const syncFreq = () => {
    const f = chipValue('s-freq');
    el('s-date-row').hidden = f === 'daily' || f === 'weekdays';
  };
  bindChips('s-kind', () => syncKind(true));
  bindChips('s-freq', syncFreq);
  bindChips('s-mode');
  el('s-notime').addEventListener('change', (e) => { el('s-time').disabled = e.target.checked; });

  const open = (r) => {
    editing = r || null;
    el('sheet-title').textContent = r ? '編輯提醒' : '新增鬧鐘';
    el('s-del').hidden = !r;
    el('s-error').textContent = '';
    setPick('s-kind', r ? r.kind : 'feed');
    setPick('s-freq', r ? r.freq : 'daily');
    setPick('s-mode', r ? r.alarm_mode || 'sound' : 'sound');
    el('s-title').value = r ? r.title : '餵食';
    el('s-time').value = r?.remind_time ? r.remind_time.slice(0, 5) : '08:00';
    el('s-notime').checked = r ? !r.remind_time : false;
    el('s-time').disabled = el('s-notime').checked;
    el('s-date').value = r ? r.next_date : today;
    setAmount(r?.amount_g ?? feedPlan(pet, today)?.meals[0]?.g ?? 18);
    syncKind(false);
    syncFreq();
    sheet.classList.add('is-open');
    el('s-title').focus();
  };
  const close = () => sheet.classList.remove('is-open');
  sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  $('#open-add').addEventListener('click', () => open(null));
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => open(list.find((r) => r.id === b.dataset.edit))));

  el('s-save').addEventListener('click', async () => {
    const kind = chipValue('s-kind');
    const freq = chipValue('s-freq');
    const title = el('s-title').value.trim() || kindOf(kind).label;
    const daily = freq === 'daily' || freq === 'weekdays';
    const row = {
      pet_id: pet.id,
      kind,
      title,
      freq,
      remind_time: el('s-notime').checked ? null : el('s-time').value || null,
      next_date: daily ? (editing?.last_done === today ? editing.next_date : today) : el('s-date').value || today,
      amount_g: kind === 'feed' ? amount : null,
      look: editing?.kind === kind ? editing.look : kindOf(kind).look || null,
      alarm_mode: chipValue('s-mode') || 'sound',
      enabled: true,
    };
    if (editing) row.id = editing.id;
    el('s-save').disabled = true;
    try {
      await db.saveReminder(row);
      close();
      toast(editing ? '已更新' : '已新增鬧鐘');
      viewReminders();
    } catch (err) {
      el('s-error').textContent = errText(err);
      el('s-save').disabled = false;
    }
  });
  el('s-del').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = '確定刪除？再按一次'; return; }
    try { await db.deleteReminder(editing.id); close(); toast('已刪除'); viewReminders(); } catch (err) { toast(errText(err), true); }
  });
}

// ================= 餵食指南 =================
async function viewFeed() {
  const pet = S.pet;
  const today = todayISO();
  const plan = feedPlan(pet, today);
  const months = ageMonths(pet.birthday, today);
  const shop = shopList(pet.species, months);
  const sw = pet.food_switch_on ? daysBetween(pet.food_switch_on, today) + 1 : null;
  const switching = sw && sw >= 1 && sw <= 7;
  const phase = (d) => (d <= 2 ? 0 : d <= 4 ? 1 : d <= 6 ? 2 : 3);
  const steps = [['第 1–2 天', '新 25%', 25], ['第 3–4 天', '新 50%', 50], ['第 5–6 天', '新 75%', 75], ['第 7 天', '全換新', 100]];

  render(shell(`
    ${head(`${esc(pet.name)}該怎麼吃`, plan ? `依${stageText(pet, today)}、${pet.weight_kg} kg 計算，體重變了會自動更新` : '先填體重，才能算出每天吃多少')}
    ${plan ? `
    <section class="card card--dark" style="padding:18px;gap:10px">
      <span style="font-size:13px;color:var(--color-on-dark)">一天大約吃</span>
      <div><span class="feed-num">${plan.grams} g</span> <span style="font-size:14px;color:var(--color-on-dark)">乾糧・分 ${plan.meals.length} 餐・約 ${plan.kcal} kcal</span></div>
      <div class="stats" style="grid-template-columns:repeat(${plan.meals.length}, minmax(0,1fr))">
        ${plan.meals.map((m) => `<span class="stat stat--dark"><span>${m.time}</span><b>${m.g} g</b></span>`).join('')}
      </div>
      <span style="font-size:12px;color:var(--color-on-dark)">以每公斤 ${plan.density.toLocaleString('zh-TW')} kcal 的飼料估算${plan.densityDefault ? '（預設值）' : ''}${plan.ageKnown ? '' : '；沒有填生日，先用成年的量計算'}</span>
      <div class="row" style="gap:8px">
        <label class="sr-only" for="kcal">飼料包裝上的熱量（kcal/kg）</label>
        <input id="kcal" class="input" type="number" inputmode="numeric" min="1000" max="6000" placeholder="包裝上的 kcal/kg" value="${pet.food_kcal_per_kg || ''}" style="min-height:40px;flex:1">
        <button class="btn btn--small" id="save-kcal" style="background:var(--color-sage-light);color:var(--color-ink)">更新</button>
      </div>
      <button class="btn btn--small" id="apply-meals" style="background:#4A4540;color:#fff;width:100%">把這些餐次設成提醒</button>
    </section>` : `
    <section class="card card--peach"><p>還沒有${esc(pet.name)}的體重${pet.birthday ? '' : '和生日'}。補上之後，就能算出每天該吃幾克、分幾餐。</p>
      <a class="btn btn--dark" href="#/pet/edit">去填體重</a></section>`}
    ${disclaimer()}
    <section class="card">
      <span class="card-label">買這些就夠了</span>
      ${shop.yes.map(([n, d]) => `<span style="font-size:14px;line-height:1.5"><span style="color:var(--color-sage-ink)">${I.check}</span> <b>${n}</b>：${d}</span>`).join('')}
      <span style="font-size:14px;line-height:1.5"><span style="color:var(--color-peach-ink)">✕</span> <b>先不用買</b>：${shop.no}</span>
      ${plan ? `<div class="row-between" style="border-top:1px solid var(--color-line);padding-top:8px;font-size:13px"><span>每月大約吃掉</span><b>${((plan.grams * 30) / 1000).toFixed(1)} kg 乾糧</b></div>
      <a class="link" href="#/money/new">買了飼料？記到花費</a>` : ''}
    </section>
    <section class="card">
      <div class="row-between"><span class="card-label">換飼料 7 天計畫</span>${switching ? `<b style="font-size:12px;color:var(--color-sage-link)">今天第 ${sw} 天</b>` : ''}</div>
      <div class="stats">
        ${steps.map(([d, txt, w], i) => `<div style="display:flex;flex-direction:column;gap:4px"><div class="bar"><span style="width:${w}%"></span></div>
          <span class="hint center">${switching && phase(sw) === i ? `<b>${d}</b>` : d}<br>${txt}</span></div>`).join('')}
      </div>
      ${switching
        ? `<span class="hint">今天：舊飼料 ${100 - steps[phase(sw)][2]}%＋新飼料 ${steps[phase(sw)][2]}%。如果拉肚子，就退回前一階段多待兩天。</span>
           <button class="btn btn--ghost btn--small" id="stop-switch" style="width:100%">結束換飼料</button>`
        : `<span class="hint">${sw && sw > 7 ? '上次換飼料已完成。' : ''}換新飼料時，新舊混著慢慢換，腸胃比較不會不舒服。</span>
           <button class="btn btn--primary btn--small" id="start-switch" style="width:100%">今天開始換飼料</button>`}
    </section>
  `, 'feed'));

  $('#save-kcal')?.addEventListener('click', async () => {
    const v = Number($('#kcal').value);
    if (v && (v < 1000 || v > 6000)) return toast('請輸入 1000 到 6000 之間的數字', true);
    try { await db.savePet({ id: pet.id, food_kcal_per_kg: v || null }); await loadPets(pet.id); toast('已更新'); viewFeed(); } catch (err) { toast(errText(err), true); }
  });
  $('#apply-meals')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = `會取代現有的餵食提醒，確定嗎？再按一次`; return; }
    try {
      const list = await db.listReminders(pet.id);
      for (const r of list.filter((x) => x.kind === 'feed')) await db.deleteReminder(r.id);
      const name = (t) => ({ '08:00': '早餐', '12:00': '午餐', '13:00': '午餐', '17:00': '晚餐', '19:00': '晚餐', '22:00': '宵夜' }[t] || '一餐');
      for (const m of plan.meals) {
        await db.saveReminder({ pet_id: pet.id, kind: 'feed', title: `餵${name(m.time)}`, amount_g: m.g, look: '看看有沒有吃完', freq: 'daily', remind_time: m.time, next_date: today });
      }
      toast('已更新餵食提醒');
      location.hash = '#/reminders';
    } catch (err) { toast(errText(err), true); }
  });
  const setSwitch = async (v) => {
    try { await db.savePet({ id: pet.id, food_switch_on: v }); await loadPets(pet.id); viewFeed(); } catch (err) { toast(errText(err), true); }
  };
  $('#start-switch')?.addEventListener('click', () => setSwitch(today));
  $('#stop-switch')?.addEventListener('click', () => setSwitch(null));
}

// ================= 花費：記帳 =================
let moneyMonth = null;
function moneySeg(on) {
  return `<div class="seg seg--links" role="tablist">
    <a role="tab" href="#/money" aria-selected="${on === 'ledger'}">記帳</a>
    <a role="tab" href="#/cost" aria-selected="${on === 'cost'}">費用試算</a>
  </div>`;
}

async function viewMoney(arg) {
  const pet = S.pet;
  const today = todayISO();
  if (!moneyMonth) moneyMonth = today.slice(0, 7);
  const ym = moneyMonth;
  const [y, m] = ym.split('-').map(Number);
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  const yearList = await db.listExpenses(pet.id, `${y}-01-01`, `${y}-12-31`);
  const list = yearList.filter((e) => e.spent_on >= monthStart && e.spent_on <= monthEnd);
  const sum = (arr) => arr.reduce((t, e) => t + e.amount, 0);
  const total = sum(list);
  const catOf = (k) => EXPENSE_CATS.find((c) => c.key === k) || EXPENSE_CATS[EXPENSE_CATS.length - 1];
  const byCat = EXPENSE_CATS.map((c) => ({ ...c, sum: sum(list.filter((e) => e.category === c.key)) })).filter((c) => c.sum > 0).sort((a, b) => b.sum - a.sum);
  const isNow = ym >= today.slice(0, 7);
  const days = [...new Set(list.map((e) => e.spent_on))];

  render(shell(`
    ${head('花費', `${esc(pet.name)}的記帳與看診費用試算`)}
    ${moneySeg('ledger')}
    <section class="card">
      <div class="month-nav">
        <button class="icon-btn" id="prev-m" aria-label="上個月">${I.back}</button>
        <h2 class="card-title" style="font-size:17px">${y} 年 ${m} 月</h2>
        <button class="icon-btn" id="next-m" aria-label="下個月" ${isNow ? 'disabled' : ''}>${I.chevron}</button>
      </div>
      <div class="money-total"><span class="hint">這個月的花費</span><b>${money(total)}</b><span class="hint">${y} 年累計 ${money(sum(yearList))}</span></div>
      ${byCat.length ? `
        <div class="stack-bar" role="img" aria-label="${byCat.map((c) => `${c.name} ${Math.round((c.sum / total) * 100)}%`).join('、')}">${byCat.map((c) => `<span style="flex:${c.sum};background:${c.color}"></span>`).join('')}</div>
        <ul class="cat-legend">${byCat.map((c) => `<li><i class="dot" style="background:${c.color}"></i><span class="grow">${c.name}</span><span class="hint">${Math.round((c.sum / total) * 100)}%</span><b>${money(c.sum)}</b></li>`).join('')}</ul>` : ''}
    </section>
    <button class="btn btn--dark" id="add-exp">＋ 記一筆</button>
    <form id="exp-form" class="card" style="gap:12px" hidden novalidate>
      <h2 class="card-title" id="exp-form-title">新增花費</h2>
      <fieldset><legend>分類</legend><div class="chips">${EXPENSE_CATS.map((c, i) => opt('category', c.key, c.name, i === 0)).join('')}</div></fieldset>
      <div class="chips" id="quick-items"></div>
      <label class="field">項目<input name="item" required maxlength="40" placeholder="例如：門診"></label>
      <label class="field">金額（新台幣）<input name="amount" type="number" inputmode="numeric" min="1" step="1" required placeholder="0"></label>
      <div class="two">
        <label class="field">日期<input name="spent_on" type="date" max="${today}" value="${today}"></label>
        <label class="field">地點（選填）<input name="place" maxlength="40" placeholder="醫院或店家"></label>
      </div>
      <label class="field">備註（選填）<textarea name="note" maxlength="300" rows="2"></textarea></label>
      <p class="form-error" id="exp-error" role="alert"></p>
      <div class="two"><button type="button" class="btn btn--ghost" id="exp-cancel">取消</button><button class="btn btn--primary" type="submit">儲存</button></div>
      <button type="button" class="btn btn--danger" id="exp-del" hidden>刪除這筆</button>
    </form>
    ${list.length ? days.map((d) => `
      <section class="card" style="gap:2px">
        <div class="row-between"><h2 class="card-title">${d === today ? '今天' : fmtDate(d)}</h2><span class="hint">${money(sum(list.filter((e) => e.spent_on === d)))}</span></div>
        <ul class="list">${list.filter((e) => e.spent_on === d).map((e) => `
          <li><button class="exp-row" data-edit="${e.id}" aria-label="修改 ${esc(e.item)} ${e.amount} 元">
            <i class="dot" style="background:${catOf(e.category).color}"></i>
            <span class="grow"><span style="font-weight:500">${esc(e.item)}</span><span class="hint">${catOf(e.category).name}${e.place ? '・' + esc(e.place) : ''}${e.note ? '・' + esc(e.note) : ''}</span></span>
            <b>${money(e.amount)}</b></button></li>`).join('')}</ul>
      </section>`).join('')
      : `<section class="card center"><p>這個月還沒有記帳。</p><span class="hint">記下飼料、看診、用品的花費，就知道養${esc(pet.name)}每個月要準備多少錢。</span></section>`}
  `, 'money'));

  const form = $('#exp-form');
  const el = form.elements;
  let editing = null;
  const fillQuick = () => {
    const cat = catOf(form.querySelector('input[name=category]:checked').value);
    $('#quick-items').innerHTML = cat.items.map((t) => `<button type="button" class="chip" data-q="${t}">${t}</button>`).join('');
    $$('[data-q]').forEach((b) => b.addEventListener('click', () => { el.item.value = b.dataset.q; el.amount.focus(); }));
  };
  const openForm = (exp) => {
    editing = exp || null;
    form.hidden = false;
    $('#add-exp').hidden = true;
    $('#exp-form-title').textContent = exp ? '修改花費' : '新增花費';
    $('#exp-del').hidden = !exp;
    $('#exp-error').textContent = '';
    form.querySelector(`input[name=category][value=${exp ? exp.category : 'medical'}]`).checked = true;
    el.item.value = exp ? exp.item : '';
    el.amount.value = exp ? exp.amount : '';
    el.spent_on.value = exp ? exp.spent_on : isNow ? today : monthEnd;
    el.place.value = exp?.place || '';
    el.note.value = exp?.note || '';
    fillQuick();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const closeForm = () => { form.hidden = true; $('#add-exp').hidden = false; editing = null; };
  $$('input[name=category]').forEach((r) => r.addEventListener('change', fillQuick));
  $('#add-exp').addEventListener('click', () => openForm(null));
  $('#exp-cancel').addEventListener('click', closeForm);
  $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openForm(list.find((e) => e.id === b.dataset.edit))));
  $('#prev-m').addEventListener('click', () => { moneyMonth = shiftMonth(ym, -1); viewMoney(); });
  $('#next-m').addEventListener('click', () => { if (!isNow) { moneyMonth = shiftMonth(ym, 1); viewMoney(); } });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Math.round(Number(el.amount.value));
    const item = el.item.value.trim();
    if (!item) return ($('#exp-error').textContent = '請輸入項目');
    if (!amount || amount < 1) return ($('#exp-error').textContent = '請輸入金額');
    const row = {
      pet_id: pet.id,
      category: form.querySelector('input[name=category]:checked').value,
      item,
      amount,
      spent_on: el.spent_on.value || today,
      place: el.place.value.trim() || null,
      note: el.note.value.trim() || null,
    };
    if (editing) row.id = editing.id;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await db.saveExpense(row);
      moneyMonth = row.spent_on.slice(0, 7);
      toast(editing ? '已修改' : `已記下 ${money(amount)}`);
      if (location.hash !== '#/money') location.hash = '#/money';
      else viewMoney();
    } catch (err) {
      $('#exp-error').textContent = errText(err);
      btn.disabled = false;
    }
  });
  $('#exp-del').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = '確定要刪除嗎？再按一次'; return; }
    try { await db.deleteExpense(editing.id); toast('已刪除'); viewMoney(); } catch (err) { toast(errText(err), true); }
  });
  if (arg === 'new') openForm(null);
}

function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ================= 花費：看診費用試算 =================
function viewCost() {
  const pet = S.pet;
  const sp = pet?.species || 'cat';
  const qty = {};
  const groups = COST_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.species || i.species === sp) }));
  const all = groups.flatMap((g) => g.items);
  const presets = costPresets(sp, pet?.sex);

  render(shell(`
    ${pet ? head('花費', `${esc(pet.name)}的記帳與看診費用試算`) + moneySeg('cost') : topbar('看診費用試算', '#/welcome')}
    <section class="card card--lav"><p class="small" style="color:var(--color-lav-ink);line-height:1.6">選擇可能會做的項目，看看大概要準備多少錢。也可以先點常見情況一次帶入。</p></section>
    <section class="card"><span class="card-label">常見情況</span>
      <div class="chips">${presets.map((p) => `<button type="button" class="chip" data-preset="${p.key}">${p.name}</button>`).join('')}</div></section>
    ${groups.map((g) => `
      <section class="card" style="gap:0"><span class="card-label" style="margin-bottom:4px">${g.group}</span>
        ${g.items.map((i) => `
          <div class="cost-row" data-row="${i.key}">
            <div class="grow" style="display:flex;flex-direction:column">
              <span class="cost-name" style="font-size:15px">${i.name}</span>
              <span class="hint">${money(i.min)}–${i.max.toLocaleString('zh-TW')}${i.unit ? ` / ${i.unit}` : ''}${i.note ? `・${i.note}` : ''}</span>
            </div>
            <button type="button" class="stepper__btn" data-minus="${i.key}" aria-label="減少 ${i.name}">−</button>
            <output id="q-${i.key}" aria-live="polite">0</output>
            <button type="button" class="stepper__btn stepper__btn--plus" data-plus="${i.key}" aria-label="增加 ${i.name}">+</button>
          </div>`).join('')}
      </section>`).join('')}
    ${pet ? `<a class="card" href="#/money/new" style="flex-direction:row;align-items:center"><span class="grow"><span class="card-title">看完醫生了？</span><br><span class="hint">把實際花費記到帳本</span></span>${I.chevron}</a>` : ''}
    <section class="card"><span class="card-label">看診時可以這樣做</span>
      <ul class="bullets"><li>做檢查或治療前，先請醫院說明要做哪些項目、大概多少錢。</li><li>結帳時索取收費明細，看不懂的項目可以直接問。</li><li>每月存一點醫療預備金，或考慮寵物保險。</li></ul></section>
    <section class="card"><span class="hint">價格為 ${COST_ASOF} 整理的參考區間。低標來自動物醫院公開價目，高標參考台北市獸醫師公會單項收費上限。實際費用依醫院、地區、體型與病情而不同，請以醫院報價為準。</span>
      <ul class="sources">${COST_SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join('')}</ul></section>
    <div class="cost-bar" role="status" aria-live="polite">
      <div class="grow"><small id="cost-count">還沒選項目</small><b id="cost-total">NT$ 0</b></div>
      <button type="button" class="btn btn--small btn--ghost" id="cost-clear">清除</button>
    </div>
  `, pet ? 'money' : null));

  const update = () => {
    let lo = 0, hi = 0, n = 0;
    for (const i of all) {
      const q = qty[i.key] || 0;
      $(`#q-${i.key}`).textContent = q;
      $(`[data-row="${i.key}"]`).classList.toggle('picked', q > 0);
      lo += i.min * q;
      hi += i.max * q;
      if (q) n++;
    }
    $('#cost-total').textContent = n ? `${money(lo)}–${hi.toLocaleString('zh-TW')}` : 'NT$ 0';
    $('#cost-count').textContent = n ? `已選 ${n} 項，預估` : '還沒選項目';
  };
  $$('[data-plus]').forEach((b) => b.addEventListener('click', () => { qty[b.dataset.plus] = Math.min(30, (qty[b.dataset.plus] || 0) + 1); update(); }));
  $$('[data-minus]').forEach((b) => b.addEventListener('click', () => { qty[b.dataset.minus] = Math.max(0, (qty[b.dataset.minus] || 0) - 1); update(); }));
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = presets.find((x) => x.key === b.dataset.preset);
    for (const k of Object.keys(qty)) delete qty[k];
    Object.assign(qty, p.items);
    update();
    toast(`已帶入：${p.name}`);
  }));
  $('#cost-clear').addEventListener('click', () => { for (const k of Object.keys(qty)) delete qty[k]; update(); });
}

// ================= 飼主支持 =================
async function viewSupport(moodArg) {
  const pet = S.pet;
  const today = todayISO();
  let mood = Number(moodArg) || null;
  if (!mood) mood = (await db.getMood(weekStart(today)).catch(() => null))?.mood || null;
  const logs = await db.listLogs(pet.id, addDays(today, -6));
  const a = assessRecords(logs, pet, today);
  const day = petDay(pet, today);
  const h = mood && mood <= 2
    ? ['辛苦了，覺得累不代表你做得不好', '研究發現，將近一半的新手在寵物到家的頭幾個月，都有焦慮、挫折或疲憊的感覺。多數人會在幾週到幾個月內慢慢適應。']
    : mood === 3
      ? ['還好就很好', '照顧一個生命本來就需要調整。卡住的地方，下面有常見情況的建議。']
      : ['太好了，你們正在變熟', `謝謝你這麼用心照顧${pet.name}。持續記錄，你會越來越了解牠。`];
  render(shell(`
    ${topbar('給你的支持', '#/home')}
    <section class="card card--sage" style="padding:18px"><h2 style="font-size:19px;line-height:1.4">${esc(h[0])}</h2><p style="font-size:14px;line-height:1.6">${esc(h[1])}</p></section>
    <section class="card"><span class="card-label">${esc(pet.name)}這週的狀況</span>
      <p style="font-size:14px;line-height:1.6">這週記錄了 ${new Set(logs.map((l) => l.log_date)).size} 天。到家第 ${day} 天，${esc(a.title)}。</p>
      <a class="link" href="${a.state === 'none' ? '#/record' : '#/status'}">${a.state === 'none' ? '去記今天的紀錄' : '看詳細'}</a></section>
    ${disclaimer()}
    <section class="card" style="gap:0"><span class="card-label" style="margin-bottom:4px">現在最困擾你的是？</span>
      ${CONCERNS.map((c) => `<details class="acc"><summary>${c.title}${I.chevron}</summary><ul>${c.tips.map((t) => `<li>${t}</li>`).join('')}</ul></details>`).join('')}</section>
    <section class="card"><span class="card-label">可以找誰幫忙</span>
      <ul class="bullets"><li>健康問題：平常看的動物醫院，看診前先把想問的事寫下來。</li><li>行為問題：詢問獸醫，或找合格的寵物行為訓練師。</li><li>領養來的寵物：原本的送養單位通常很願意提供建議。</li></ul></section>
    <details class="card acc" style="border:1.5px dashed var(--color-line-strong);background:transparent"><summary>如果真的照顧不了${I.chevron}</summary>
      <p class="hint" style="margin-top:8px">先別急著決定。若評估後仍需要，請用負責任的方式幫牠找到下一個家：</p>
      <ol>${REHOME_STEPS.map((s) => `<li>${s}</li>`).join('')}</ol></details>
  `, 'home'));
}

// ================= 寵物檔案頁 =================
async function viewPet() {
  const pet = S.pet;
  const today = todayISO();
  const ready = await db.lastReadiness().catch(() => null);
  const sexText = { female: '母', male: '公' }[pet.sex] || '';
  render(shell(`
    ${topbar('寵物檔案', '#/home')}
    <section class="card">
      <div class="pet-head">
        <div class="avatar avatar--lg">${esc(pet.name.slice(0, 1))}</div>
        <div class="grow"><h2 style="font-size:20px">${esc(pet.name)}</h2><span class="hint">${stageText(pet, today)}${sexText ? '・' + sexText : ''}</span></div>
        <a class="btn btn--small btn--ghost" href="#/pet/edit">編輯</a>
      </div>
      <div class="pet-stats">
        <div class="stat"><span class="stat__name">年齡</span><span class="stat__num" style="font-size:16px">${ageText(pet.birthday, today)}</span></div>
        <div class="stat"><span class="stat__name">體重</span><span class="stat__num" style="font-size:16px">${pet.weight_kg ? pet.weight_kg + ' kg' : '—'}</span></div>
        <div class="stat"><span class="stat__name">已陪伴</span><span class="stat__num" style="font-size:16px">${petDay(pet, today)} 天</span></div>
      </div>
    </section>
    ${S.pets.length > 1 ? `<section class="card"><span class="card-label">切換寵物</span><ul class="list">${S.pets.map((p) => `
      <li class="list-row"><span class="grow">${esc(p.name)}</span>${p.id === pet.id ? '<span class="tag">目前</span>' : `<button class="btn btn--small btn--ghost" data-pick="${p.id}">切換</button>`}</li>`).join('')}</ul></section>` : ''}
    <section class="card menu">
      <a href="#/history">${I.log}<span class="grow">過去的紀錄</span>${I.chevron}</a>
      <a href="#/support">${I.paw}<span class="grow">飼主支持</span>${I.chevron}</a>
      <a href="#/readiness">${I.ask}<span class="grow">飼養準備度評估${ready ? `<span class="hint">（上次 ${ready.score} 分）</span>` : ''}</span>${I.chevron}</a>
      <a href="#/pet/new">${I.home}<span class="grow">新增另一隻寵物</span>${I.chevron}</a>
    </section>
    <section class="card"><span class="hint">登入帳號：${esc(S.session.user.email)}</span><button class="btn btn--ghost" id="logout">登出</button></section>
  `, 'home'));
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => { selectPet(b.dataset.pick); viewPet(); }));
  $('#logout').addEventListener('click', () => db.signOut());
}

// ================= 飼養準備度評估 =================
async function viewReadiness() {
  const back = S.pets.length ? '#/pet' : '#/welcome';
  render(shell(`
    ${topbar('飼養準備度評估', back)}
    <section class="card card--sage"><p style="font-size:14px;line-height:1.6">6 個問題，幫你找出養之前要先準備好的地方。沒有標準答案，誠實回答最有用。</p></section>
    <form id="ready-form" class="stack">
      ${READINESS_QUESTIONS.map((q, qi) => `
        <fieldset class="card"><legend style="font-size:15px;color:var(--color-ink)">${qi + 1}. ${q.q}</legend>
          <div class="chips chips--stack">${q.opts.map(([t], i) => opt(q.key, i, t, false)).join('')}</div></fieldset>`).join('')}
      <button class="btn btn--primary" type="submit">看結果</button>
    </form>`));
  $('#ready-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const answers = {};
    let score = 0;
    const gaps = [];
    for (const q of READINESS_QUESTIONS) {
      const v = f.get(q.key);
      if (v === null) return toast('還有題目沒回答', true);
      const [text, pts] = q.opts[Number(v)];
      answers[q.key] = text;
      score += pts;
      if (pts < Math.max(...q.opts.map((o) => o[1])) * 0.6) gaps.push(q.gap);
    }
    try { await db.saveReadiness(answers, score); } catch (err) { toast(errText(err), true); }
    const level = score >= 80 ? ['準備得很好', 'sage'] : score >= 55 ? ['大致準備好了，還有幾件事要補強', 'peach'] : ['建議再多準備一些再決定', 'peach'];
    render(shell(`
      ${topbar('評估結果', back)}
      <section class="card card--${level[1]}" style="padding:18px"><span style="font-size:44px;font-weight:700;line-height:1">${score}<small style="font-size:16px;font-weight:500"> / 100</small></span><h2 style="font-size:19px">${level[0]}</h2></section>
      ${gaps.length ? `<section class="card"><span class="card-label">養之前先處理這些</span><ul class="bullets">${gaps.map((g) => `<li>${g}</li>`).join('')}</ul></section>` : ''}
      <section class="card"><span class="card-label">先想好的變故應對</span>
        <ul class="bullets"><li>我生病或出遠門時，誰可以照顧牠？</li><li>搬家、畢業、換工作時，牠要怎麼安排？</li><li>突然要花一筆醫藥費（數千到上萬元），錢從哪裡來？</li></ul>
        <span class="hint">把答案寫下來，和家人或室友討論，就是你的飼養承諾。</span></section>
      ${S.pets.length ? '' : '<a class="btn btn--primary" href="#/pet/new">已經決定了，建立寵物檔案</a>'}
      <a class="btn btn--ghost" href="${back}">完成</a>`));
  });
}

// ================= 資料載入與畫面切換 =================
async function loadPets(preferId) {
  S.pets = await db.listPets();
  selectPet(preferId || store('petId'));
}
function selectPet(id) {
  S.pet = S.pets.find((p) => p.id === id) || S.pets[0] || null;
  if (S.pet) store('petId', S.pet.id);
}

async function route() {
  if (!db.configured) return viewSetup();
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, arg] = hash.split('/');
  document.getElementById('toast')?.classList.remove('show');

  if (!S.session) return viewAuth(name === 'signup' ? 'signup' : 'login');
  if (name === 'login' || name === 'signup') return (location.hash = '#/home');

  try {
    if (name === 'readiness') return await viewReadiness();
    if (name === 'pet' && arg === 'new') return viewPetForm(false);
    if (!S.pet) return name === 'welcome' ? viewWelcome() : (location.hash = '#/welcome');
    if (name === 'welcome') return (location.hash = '#/home');

    loading();
    switch (name) {
      case 'ask': return await viewAsk();
      case 'result': return viewResult();
      case 'status': return await viewStatus();
      case 'record': return await viewRecord(arg);
      case 'log': return await viewRecord(arg); // 舊網址
      case 'history': return await viewHistory();
      case 'reminders': return await viewReminders();
      case 'feed': return await viewFeed();
      case 'money': return await viewMoney(arg);
      case 'cost': return viewCost();
      case 'support': return await viewSupport(arg);
      case 'pet': return arg === 'edit' ? viewPetForm(true) : await viewPet();
      default: return await viewHome();
    }
  } catch (err) {
    console.error(err);
    render(shell(`${head('載入失敗')}<section class="card"><p>${esc(errText(err))}</p><button class="btn btn--primary" onclick="location.reload()">重新整理</button></section>`, S.pet ? 'home' : null));
  }
}

async function start() {
  if (!db.configured) return viewSetup();
  loading();
  S.session = await db.getSession();
  if (S.session) {
    try { await loadPets(); } catch (err) { console.error(err); }
  }
  db.onAuthChange(async (session) => {
    const was = S.session?.user?.id;
    S.session = session;
    if (session && session.user.id !== was) {
      try { await loadPets(); } catch (err) { console.error(err); }
      location.hash = '#/home';
      route();
    } else if (!session && was) {
      S.pets = [];
      S.pet = null;
      store('petId', null);
      location.hash = '#/login';
      route();
    }
  });
  window.addEventListener('hashchange', route);
  route();
}

start();

if ('serviceWorker' in navigator) {
  let reloaded = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
      })
      .catch(() => {});
  });
}
