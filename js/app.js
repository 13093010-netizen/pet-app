// 主程式：畫面切換（用網址 # 後面的路徑）、各個畫面
import * as db from './db.js';
import { assess, nextDate } from './rules.js';
import {
  DISCLAIMER, signalsFor, signalText, fieldLabel, fieldHint, fieldOpts, adaptationTip,
  MOODS, CONCERNS, REHOME_STEPS, REMINDER_PRESETS, FREQ_LABEL, READINESS_QUESTIONS,
  COST_GROUPS, COST_ASOF, COST_SOURCES, costPresets, EXPENSE_CATS,
} from './content.js';
import { todayISO, addDays, daysBetween, weekStart, fmtDate, weekdayShort, ageText, esc, store } from './util.js';

const root = document.getElementById('app');
const S = { session: null, pets: [], pet: null };

// ================= 共用元件 =================
const icon = {
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  log: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>',
  bell: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  paw: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="7" cy="10" r="2"/><circle cx="11" cy="6.5" r="2"/><circle cx="16" cy="7" r="2"/><circle cx="19" cy="11.5" r="2"/><path d="M8.5 17c0-3 2.3-5 4.5-5s4.5 2 4.5 4.5c0 2-1.5 3-3 3-1.2 0-2-.6-3-.6s-1.6.7-2.4.7c-.8 0-.6-1.3-.6-2.6z"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
  alert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/></svg>',
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>',
  coin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.1 0 1.1-1.1 2-2.5 2-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5"/></svg>',
  chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
};

function page({ title = '', back = null, nav = null, body = '', action = '' }) {
  const head = title || back
    ? `<header class="topbar">
        ${back ? `<a class="icon-btn" href="${back}" aria-label="返回">${icon.back}</a>` : ''}
        <h1>${title}</h1>${action}
      </header>`
    : '';
  const tabs = nav
    ? `<nav class="tabbar" aria-label="主選單">
        ${tab('#/home', '今日', icon.home, nav === 'home')}
        ${tab('#/history', '紀錄', icon.log, nav === 'history')}
        ${tab('#/money', '花費', icon.coin, nav === 'money')}
        ${tab('#/reminders', '提醒', icon.bell, nav === 'reminders')}
        ${tab('#/pet', '寵物', icon.paw, nav === 'pet')}
      </nav>`
    : '';
  return `<div class="screen ${nav ? 'has-tabs' : ''}">${head}<main class="content">${body}</main>${tabs}</div>`;
}

function tab(href, label, svg, on) {
  return `<a href="${href}" class="tab ${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}>${svg}<span>${label}</span></a>`;
}

function disclaimer() {
  return `<aside class="disclaimer" aria-label="使用提醒">${icon.info}<p>${DISCLAIMER}</p></aside>`;
}

function render(html) {
  root.innerHTML = html;
  window.scrollTo(0, 0);
}

function loading() {
  render('<div class="center-fill"><div class="spinner" role="status" aria-label="載入中"></div></div>');
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
  if (/public\.expenses/i.test(m)) return '記帳功能需要先在 Supabase 執行 002_expenses.sql 建立資料表';
  if (/Failed to fetch|NetworkError/i.test(m)) return '連不上網路，請確認網路後再試';
  return `發生錯誤：${m}`;
}

const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];

function petDay(pet, today) {
  return daysBetween(pet.adopted_on, today) + 1;
}

// ================= 畫面：設定未完成 =================
function viewSetup() {
  render(page({
    title: '尚未設定資料庫',
    body: `<section class="card"><p>請在 <code>config.js</code> 填入 Supabase 的 Project URL 和 publishable key，再重新整理頁面。</p></section>`,
  }));
}

// ================= 畫面：登入／註冊 =================
function viewAuth(mode = 'login') {
  const isLogin = mode === 'login';
  render(`
    <div class="screen auth">
      <main class="content">
        <div class="brand">
          <div class="brand-mark">${icon.paw}</div>
          <h1>安心養</h1>
          <p>陪新手飼主度過最需要幫忙的前 90 天</p>
        </div>
        <div class="seg" role="tablist">
          <a role="tab" href="#/login" class="${isLogin ? 'on' : ''}" aria-selected="${isLogin}">登入</a>
          <a role="tab" href="#/signup" class="${!isLogin ? 'on' : ''}" aria-selected="${!isLogin}">註冊</a>
        </div>
        <form id="auth-form" class="card form" novalidate>
          <label>電子郵件<input name="email" type="email" autocomplete="email" required inputmode="email"></label>
          <label>密碼<input name="password" type="password" minlength="6" required autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="至少 6 個字元"></label>
          <p class="form-error" id="auth-error" role="alert"></p>
          <button class="btn primary" type="submit">${isLogin ? '登入' : '建立帳號'}</button>
        </form>
      </main>
    </div>`);

  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = String(f.get('email')).trim();
    const password = String(f.get('password'));
    const errEl = $('#auth-error');
    if (!email || password.length < 6) {
      errEl.textContent = '請輸入電子郵件，密碼至少 6 個字元';
      return;
    }
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      if (isLogin) {
        await db.signIn(email, password);
      } else {
        const data = await db.signUp(email, password);
        if (!data.session) {
          errEl.textContent = '';
          render(page({
            title: '請收信確認',
            body: `<section class="card"><p>我們寄了一封確認信到 <b>${esc(email)}</b>，點信裡的連結後，再回來登入。</p>
                   <a class="btn primary" href="#/login">回到登入</a></section>`,
          }));
          return;
        }
      }
      // 登入成功由 onAuthChange 處理
    } catch (err) {
      errEl.textContent = errText(err);
      btn.disabled = false;
    }
  });
}

// ================= 畫面：第一次使用 =================
function viewWelcome() {
  render(page({
    title: '歡迎',
    body: `
      <section class="card hero">
        <h2>你現在是？</h2>
        <p class="muted">選一個開始，之後都可以再改。</p>
      </section>
      <a class="choice card" href="#/pet/new">
        <span class="choice-title">已經有貓狗了</span>
        <span class="muted">建立寵物檔案，開始每日紀錄</span>${icon.chevron}
      </a>
      <a class="choice card" href="#/readiness">
        <span class="choice-title">還在考慮要不要養</span>
        <span class="muted">花 2 分鐘做飼養準備度評估</span>${icon.chevron}
      </a>
      <button class="btn ghost" id="logout">登出</button>`,
  }));
  $('#logout').addEventListener('click', () => db.signOut());
}

// ================= 畫面：寵物檔案表單 =================
function viewPetForm(edit) {
  const today = todayISO();
  const p = edit ? S.pet : { name: '', species: 'cat', sex: 'unknown', birthday: '', adopted_on: today, weight_kg: '' };
  const backTo = edit ? '#/pet' : S.pets.length ? '#/pet' : '#/welcome';
  render(page({
    title: edit ? '編輯寵物檔案' : '新增寵物',
    back: backTo,
    body: `
      <form id="pet-form" class="card form" novalidate>
        <label>名字<input name="name" required maxlength="30" value="${esc(p.name)}" placeholder="例如：麻糬"></label>
        <fieldset><legend>種類</legend>
          <div class="chips cols-2">
            ${radio('species', 'cat', '貓', p.species === 'cat')}
            ${radio('species', 'dog', '狗', p.species === 'dog')}
          </div>
        </fieldset>
        <fieldset><legend>性別</legend>
          <div class="chips cols-3">
            ${radio('sex', 'female', '母', p.sex === 'female')}
            ${radio('sex', 'male', '公', p.sex === 'male')}
            ${radio('sex', 'unknown', '不確定', !p.sex || p.sex === 'unknown')}
          </div>
        </fieldset>
        <label>到家日<input name="adopted_on" type="date" required max="${today}" value="${esc(p.adopted_on)}"></label>
        <label>生日（大概就好）<input name="birthday" type="date" max="${today}" value="${esc(p.birthday || '')}"></label>
        <label>體重（公斤）<input name="weight_kg" type="number" inputmode="decimal" step="0.1" min="0" max="99" value="${esc(p.weight_kg ?? '')}"></label>
        <p class="form-error" id="pet-error" role="alert"></p>
        <button class="btn primary" type="submit">${edit ? '儲存' : '建立檔案'}</button>
      </form>`,
  }));

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
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const saved = await db.savePet(row);
      if (!edit) await db.seedReminders(saved, today);
      await loadPets(saved.id);
      toast(edit ? '已儲存' : `歡迎${saved.name}回家！`);
      location.hash = edit ? '#/pet' : '#/home';
    } catch (err) {
      $('#pet-error').textContent = errText(err);
      btn.disabled = false;
    }
  });
}

function radio(name, value, label, checked) {
  return `<label class="chip"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
}

// ================= 畫面：首頁（今日）=================
async function viewHome() {
  const pet = S.pet;
  const today = todayISO();
  const [logs, reminders, mood] = await Promise.all([
    db.listLogs(pet.id, addDays(today, -13)),
    db.listReminders(pet.id),
    db.getMood(weekStart(today)),
  ]);
  const day = petDay(pet, today);
  const a = assess(logs, pet, today);
  const todayLog = logs.find((l) => l.log_date === today);
  const due = reminders.filter((r) => r.enabled && r.next_date <= today);
  const tip = adaptationTip(pet.species, day);

  const switcher = S.pets.length > 1
    ? `<label class="sr-only" for="pet-switch">切換寵物</label>
       <select id="pet-switch" class="pet-switch">${S.pets.map((p) => `<option value="${p.id}" ${p.id === pet.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`
    : '';

  const statusCls = { none: 'neutral', stable: 'good', watch: 'warn', vet: 'bad' }[a.level];
  const statusCard = `
    <section class="card status ${statusCls}" aria-label="狀態提示">
      <div class="status-head">${a.level === 'vet' || a.level === 'watch' ? icon.alert : icon.info}
        <span>${{ none: '開始記錄', stable: '狀況穩定', watch: '需要留意', vet: '建議就醫' }[a.level]}</span></div>
      <p class="status-title">${esc(a.title)}</p>
      <p>${esc(a.body)}</p>
      ${a.level !== 'none' ? `<a class="btn small light" href="#/status">看詳情與建議</a>` : ''}
      <p class="fine">${DISCLAIMER}</p>
    </section>`;

  const logCard = todayLog
    ? `<section class="card">
        <div class="row-between"><h2>今日紀錄</h2><a href="#/log/${today}" class="link">修改</a></div>
        <div class="summary">${logSummary(todayLog, pet.species)}</div>
      </section>`
    : `<section class="card">
        <h2>今日紀錄</h2>
        <p class="muted">點一點就好，大約 30 秒。</p>
        <a class="btn primary" href="#/log/${today}">${icon.plus}新增今日紀錄</a>
      </section>`;

  const dueCard = due.length
    ? `<section class="card">
        <div class="row-between"><h2>今日待辦</h2><a href="#/reminders" class="link">全部</a></div>
        <ul class="list">${due.map((r) => `
          <li class="list-row">
            <button class="tick" data-done="${r.id}" aria-label="完成：${esc(r.title)}"></button>
            <span class="grow">${esc(r.title)}</span>
            ${r.next_date < today ? '<span class="tag warn">逾期</span>' : `<span class="muted small">${r.remind_time ? r.remind_time.slice(0, 5) : ''}</span>`}
          </li>`).join('')}</ul>
      </section>`
    : '';

  const moodCard = mood
    ? ''
    : `<section class="card">
        <h2>這週照顧${esc(pet.name)}，你感覺如何？</h2>
        <p class="muted small">每週一題，只有你看得到。</p>
        <div class="mood-row">${MOODS.map((m, i) => `<button class="mood" data-mood="${i + 1}">${m}</button>`).join('')}</div>
      </section>`;

  const tipCard = tip
    ? `<section class="card tip"><h2>${esc(tip.title)}</h2><p>${esc(tip.body)}</p></section>`
    : '';

  const installHint = !isStandalone() && store('hideInstall') !== '1'
    ? `<section class="card install"><p><b>加到主畫面，用起來像 App</b><br>
        <span class="small">iPhone：Safari 下方「分享」→「加入主畫面」。Android：Chrome 右上「⋮」→「加到主畫面」。</span></p>
        <button class="icon-btn" id="hide-install" aria-label="關閉">✕</button></section>`
    : '';

  render(page({
    nav: 'home',
    body: `
      <header class="home-head">
        <div class="avatar">${esc(pet.name.slice(0, 1))}</div>
        <div class="grow">
          <p class="eyebrow">到家第 ${day} 天${day <= 90 ? ' · 適應期' : ''}</p>
          <h1>${esc(pet.name)}今天好嗎？</h1>
        </div>${switcher}
      </header>
      ${installHint}${statusCard}${logCard}${dueCard}${moodCard}${tipCard}`,
  }));

  $('#pet-switch')?.addEventListener('change', (e) => {
    selectPet(e.target.value);
    viewHome();
  });
  $('#hide-install')?.addEventListener('click', () => {
    store('hideInstall', '1');
    $('.install')?.remove();
  });
  $$('[data-done]').forEach((b) => b.addEventListener('click', async () => {
    const r = reminders.find((x) => x.id === b.dataset.done);
    b.disabled = true;
    try {
      await completeReminder(r, today);
      toast(`完成：${r.title}`);
      viewHome();
    } catch (err) {
      toast(errText(err), true);
      b.disabled = false;
    }
  }));
  $$('[data-mood]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await db.saveMood(weekStart(today), Number(b.dataset.mood));
      location.hash = `#/support/${b.dataset.mood}`;
    } catch (err) {
      toast(errText(err), true);
    }
  }));
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function completeReminder(r, today) {
  const next = nextDate(r, today);
  await db.saveReminder(next ? { id: r.id, next_date: next } : { id: r.id, enabled: false });
}

function logSummary(l, species) {
  const parts = ['food', 'water', 'urine', 'energy']
    .filter((k) => l[k] !== null && l[k] !== undefined)
    .map((k) => {
      const v = l[k];
      const cls = k === 'energy' ? (v === 0 ? 'warn' : '') : v === 1 ? '' : v === 0 ? 'warn' : 'blue';
      return `<span class="pill ${cls}">${fieldLabel(k, species)}：${fieldOpts(k, species)[v]}</span>`;
    });
  (l.signals || []).forEach((s) => parts.push(`<span class="pill sig">${esc(s)}</span>`));
  return parts.join('') || '<span class="muted">沒有填寫項目</span>';
}

// ================= 畫面：新增／修改紀錄 =================
async function viewLog(date) {
  const pet = S.pet;
  const today = todayISO();
  if (!date || date > today) date = today;
  const existing = await db.getLog(pet.id, date);
  const l = existing || { food: null, water: null, urine: null, energy: null, signals: [], note: '' };
  const sp = pet.species;
  const day = daysBetween(pet.adopted_on, date) + 1;

  const fields = ['food', 'water', 'urine', 'energy'].map((k) => `
    <fieldset class="card field">
      <div class="row-between"><legend>${fieldLabel(k, sp)}</legend><span class="muted small">${fieldHint(k, sp)}</span></div>
      <div class="chips cols-3">${fieldOpts(k, sp).map((t, i) => radio(k, i, t, l[k] === i)).join('')}</div>
    </fieldset>`).join('');

  const sigs = signalsFor(sp);
  render(page({
    title: `${esc(pet.name)}的紀錄`,
    back: '#/home',
    body: `
      <p class="muted center">${date === today ? '今天' : fmtDate(date)} · 到家第 ${day} 天</p>
      <form id="log-form" novalidate>
        ${fields}
        <fieldset class="card field">
          <legend>今天有看到這些嗎？</legend>
          <p class="muted small">可複選，點了會告訴你代表什麼</p>
          <div class="chips cols-3 wrap">
            ${sigs.map((s) => `<label class="chip ${s.kind === 'health' ? 'health' : ''}"><input type="checkbox" name="signals" value="${s.key}" ${(l.signals || []).includes(s.key) ? 'checked' : ''}><span>${s.key}</span></label>`).join('')}
          </div>
          <div class="info-box" id="sig-info" aria-live="polite" ${l.signals?.length ? '' : 'hidden'}></div>
        </fieldset>
        <label class="card field">備註（選填）<textarea name="note" maxlength="500" rows="3" placeholder="例如：今天換了新飼料">${esc(l.note || '')}</textarea></label>
        ${disclaimer()}
        <div class="sticky-cta"><button class="btn primary" type="submit">儲存紀錄</button></div>
      </form>`,
  }));

  const info = $('#sig-info');
  const showInfo = (key) => {
    info.hidden = false;
    info.innerHTML = `<b>${esc(key)}</b><span>${esc(signalText(sp, key))}</span>`;
  };
  if (l.signals?.length) showInfo(l.signals[l.signals.length - 1]);
  $$('input[name="signals"]').forEach((c) => c.addEventListener('change', () => showInfo(c.value)));

  $('#log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const num = (k) => (f.get(k) === null ? null : Number(f.get(k)));
    const row = {
      pet_id: pet.id,
      log_date: date,
      food: num('food'),
      water: num('water'),
      urine: num('urine'),
      energy: num('energy'),
      signals: f.getAll('signals'),
      note: String(f.get('note') || '').trim() || null,
    };
    if ([row.food, row.water, row.urine, row.energy].every((v) => v === null) && !row.signals.length) {
      toast('至少點選一個項目', true);
      return;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await db.saveLog(row);
      toast('已儲存紀錄');
      location.hash = '#/home';
    } catch (err) {
      toast(errText(err), true);
      btn.disabled = false;
    }
  });
}

// ================= 畫面：狀態詳情 =================
async function viewStatus() {
  const pet = S.pet;
  const today = todayISO();
  const logs = await db.listLogs(pet.id, addDays(today, -13));
  const a = assess(logs, pet, today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const byDate = Object.fromEntries(logs.map((l) => [l.log_date, l]));
  const sp = pet.species;

  const grid = ['food', 'water', 'urine', 'energy'].map((k) => `
    <div class="grid-row">
      <span class="grid-label">${fieldLabel(k, sp)}</span>
      ${days.map((d) => {
        const v = byDate[d]?.[k];
        const has = v !== null && v !== undefined;
        const cls = !has ? 'empty' : k === 'energy' ? ['low', 'ok', 'ok'][v] : ['low', 'ok', 'high'][v];
        const label = has ? fieldOpts(k, sp)[v] : '沒記錄';
        return `<span class="cell ${cls}" title="${fmtDate(d)} ${label}" aria-label="${fmtDate(d)} ${fieldLabel(k, sp)} ${label}"></span>`;
      }).join('')}
    </div>`).join('');

  const statusCls = { none: 'neutral', stable: 'good', watch: 'warn', vet: 'bad' }[a.level];
  const redFlags = sp === 'dog'
    ? ['完全不吃超過一天', '反覆嘔吐、拉肚子或精神很差', '呼吸急促、牙齦發白', '肚子脹大、想吐吐不出來']
    : ['完全不吃超過一天', '反覆嘔吐、拉肚子或精神很差', '一直進貓砂盆卻尿不出來', '呼吸急促或張嘴呼吸'];

  render(page({
    title: '狀態詳情',
    back: '#/home',
    body: `
      <section class="card status ${statusCls}">
        <p class="status-title">${esc(a.title)}</p>
        <p>${esc(a.body)}</p>
      </section>
      ${disclaimer()}
      <section class="card">
        <h2>近 7 天</h2>
        <div class="week-grid" role="img" aria-label="近 7 天每日紀錄">
          <div class="grid-row head"><span class="grid-label"></span>${days.map((d) => `<span class="cell-head ${d === today ? 'today' : ''}">${d === today ? '今' : weekdayShort(d)}</span>`).join('')}</div>
          ${grid}
        </div>
        <div class="legend"><span><i class="cell low"></i>偏少／差</span><span><i class="cell ok"></i>正常</span><span><i class="cell high"></i>偏多</span><span><i class="cell empty"></i>沒記錄</span></div>
      </section>
      ${a.reasons.length ? `<section class="card"><h2>看到的變化</h2><ul class="bullets">${a.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
      ${a.tips.length ? `<section class="card"><h2>可以先這樣做</h2><ul class="bullets">${a.tips.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
      <section class="card redflag">
        <h2>${icon.alert}出現這些請盡快就醫</h2>
        <ul class="bullets">${redFlags.map((r) => `<li>${r}</li>`).join('')}</ul>
      </section>
      <a class="choice card" href="#/cost">
        <span class="choice-title">看診大概要花多少？</span>
        <span class="muted">用費用試算先有個心理準備</span>${icon.chevron}
      </a>`,
  }));
}

// ================= 畫面：紀錄列表 =================
async function viewHistory() {
  const pet = S.pet;
  const today = todayISO();
  const logs = await db.listLogs(pet.id, addDays(today, -59));
  render(page({
    nav: 'history',
    title: `${esc(pet.name)}的紀錄`,
    action: `<a class="btn small primary" href="#/log/${today}">${icon.plus}今天</a>`,
    body: logs.length
      ? `<p class="muted small">點一筆可以修改。</p>
         <ul class="history">${logs.map((l) => `
          <li><a class="card history-item" href="#/log/${l.log_date}">
            <span class="history-date">${l.log_date === today ? '今天' : fmtDate(l.log_date)}</span>
            <span class="summary">${logSummary(l, pet.species)}</span>
            ${l.note ? `<span class="muted small note">${esc(l.note)}</span>` : ''}
          </a></li>`).join('')}</ul>`
      : `<section class="card empty-state"><p>還沒有紀錄。</p><a class="btn primary" href="#/log/${today}">新增第一筆紀錄</a></section>`,
  }));
}

// ================= 畫面：提醒 =================
async function viewReminders() {
  const pet = S.pet;
  const today = todayISO();
  const list = await db.listReminders(pet.id);
  const when = (r) => {
    if (!r.enabled) return '已關閉';
    if (r.next_date < today) return `逾期（${fmtDate(r.next_date, false)}）`;
    if (r.next_date === today) return '今天';
    if (r.next_date === addDays(today, 1)) return '明天';
    return fmtDate(r.next_date);
  };

  render(page({
    nav: 'reminders',
    title: '提醒',
    action: `<button class="btn small primary" id="add-btn">${icon.plus}新增</button>`,
    body: `
      <form id="rem-form" class="card form" hidden>
        <h2>新增提醒</h2>
        <div class="chips wrap">${(REMINDER_PRESETS[pet.species] || REMINDER_PRESETS.cat).map((t) => `<button type="button" class="chip-btn" data-preset="${t}">${t}</button>`).join('')}</div>
        <label>項目<input name="title" required maxlength="40" placeholder="例如：鏟貓砂"></label>
        <label>頻率<select name="freq">${Object.entries(FREQ_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <div class="two">
          <label>從哪天開始<input name="next_date" type="date" value="${today}" min="${addDays(today, -30)}"></label>
          <label>時間（選填）<input name="remind_time" type="time"></label>
        </div>
        <div class="two"><button type="button" class="btn ghost" id="cancel-add">取消</button><button class="btn primary" type="submit">加入</button></div>
      </form>
      ${list.length ? `<ul class="list card">${list.map((r) => `
        <li class="list-row tall ${r.enabled ? '' : 'off'}">
          <div class="grow">
            <p class="title">${esc(r.title)}</p>
            <p class="muted small">${FREQ_LABEL[r.freq]}${r.remind_time ? ' ' + r.remind_time.slice(0, 5) : ''} · <span class="${r.enabled && r.next_date < today ? 'warn-text' : ''}">${when(r)}</span></p>
          </div>
          ${r.enabled && r.next_date <= today ? `<button class="btn small light" data-done="${r.id}">完成</button>` : ''}
          <button class="switch ${r.enabled ? 'on' : ''}" role="switch" aria-checked="${r.enabled}" aria-label="${esc(r.title)} 提醒開關" data-toggle="${r.id}"><span></span></button>
          <button class="icon-btn danger" data-del="${r.id}" aria-label="刪除 ${esc(r.title)}">✕</button>
        </li>`).join('')}</ul>`
        : `<section class="card empty-state"><p>還沒有提醒。</p></section>`}
      <p class="muted small pad">提醒會顯示在 App 首頁的「今日待辦」。手機推播通知會在之後的版本加入。</p>`,
  }));

  const form = $('#rem-form');
  const el = form.elements; // 注意：不能用 form.title，那是表單本身的屬性
  $('#add-btn').addEventListener('click', () => { form.hidden = false; el.title.focus(); });
  $('#cancel-add').addEventListener('click', () => { form.hidden = true; });
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.preset;
    el.title.value = t;
    const monthly = ['體內驅蟲', '體外驅蟲', '心絲蟲預防'];
    el.freq.value = t === '疫苗' ? 'yearly' : monthly.includes(t) ? 'monthly' : t === '剪指甲' || t === '洗澡' ? 'weekly' : 'daily';
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = el.title.value.trim();
    if (!title) return toast('請輸入項目', true);
    try {
      await db.saveReminder({
        pet_id: pet.id,
        title,
        freq: el.freq.value,
        next_date: el.next_date.value || today,
        remind_time: el.remind_time.value || null,
      });
      toast('已新增提醒');
      viewReminders();
    } catch (err) {
      toast(errText(err), true);
    }
  });
  $$('[data-done]').forEach((b) => b.addEventListener('click', async () => {
    const r = list.find((x) => x.id === b.dataset.done);
    try { await completeReminder(r, today); toast(`完成：${r.title}`); viewReminders(); } catch (err) { toast(errText(err), true); }
  }));
  $$('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
    const r = list.find((x) => x.id === b.dataset.toggle);
    try {
      await db.saveReminder({ id: r.id, enabled: !r.enabled, next_date: !r.enabled && r.next_date < today ? today : r.next_date });
      viewReminders();
    } catch (err) { toast(errText(err), true); }
  }));
  $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const r = list.find((x) => x.id === b.dataset.del);
    if (b.dataset.confirm !== '1') {
      b.dataset.confirm = '1';
      b.textContent = '刪除？';
      b.classList.add('confirm');
      setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.textContent = '✕'; b.classList.remove('confirm'); } }, 3000);
      return;
    }
    try { await db.deleteReminder(r.id); toast('已刪除'); viewReminders(); } catch (err) { toast(errText(err), true); }
  }));
}

// ================= 畫面：飼主壓力支持 =================
async function viewSupport(moodArg) {
  const pet = S.pet;
  const today = todayISO();
  let mood = Number(moodArg) || null;
  if (!mood) mood = (await db.getMood(weekStart(today)))?.mood || null;
  const logs = await db.listLogs(pet.id, addDays(today, -6));
  const a = assess(logs, pet, today);
  const day = petDay(pet, today);

  const head = mood && mood <= 2
    ? { t: '辛苦了，覺得累不代表你做得不好', b: '研究發現，將近一半的新手在寵物到家的頭幾個月，都有焦慮、挫折或疲憊的感覺。多數人會在幾週到幾個月內慢慢適應。' }
    : mood === 3
      ? { t: '還好就很好', b: '照顧一個生命本來就需要調整。有任何卡住的地方，下面有一些常見情況的建議。' }
      : { t: '太好了，你們正在變熟', b: `謝謝你這麼用心照顧${pet.name}。持續記錄，你會越來越了解牠。` };

  render(page({
    title: '給你的支持',
    back: '#/home',
    body: `
      <section class="card hero soft">
        <h2>${esc(head.t)}</h2><p>${esc(head.b)}</p>
      </section>
      <section class="card">
        <h2>${esc(pet.name)}這週的狀況</h2>
        <p>這週記錄了 ${new Set(logs.map((l) => l.log_date)).size} 天${logs.length >= 5 ? '，做得很好' : ''}。到家第 ${day} 天，${esc(a.title)}。</p>
        ${a.level === 'none' ? `<a class="link" href="#/log/${today}">去新增今天的紀錄</a>` : `<a class="link" href="#/status">查看狀態詳情</a>`}
      </section>
      ${disclaimer()}
      <section class="card">
        <h2>現在最困擾你的是？</h2>
        ${CONCERNS.map((c) => `
          <details class="acc"><summary>${c.title}${icon.chevron}</summary>
            <ul class="bullets">${c.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
          </details>`).join('')}
      </section>
      <section class="card">
        <h2>可以找誰幫忙</h2>
        <ul class="bullets">
          <li>健康問題：平常看的動物醫院，看診前先把想問的事寫下來。</li>
          <li>行為問題：可以詢問獸醫，或找合格的寵物行為訓練師。</li>
          <li>領養來的寵物：原本的送養單位通常很願意提供建議。</li>
        </ul>
      </section>
      <details class="card acc dashed"><summary>如果真的照顧不了${icon.chevron}</summary>
        <p class="muted">先別急著做決定。若評估後仍需要，請用負責任的方式幫牠找到下一個家：</p>
        <ol class="bullets">${REHOME_STEPS.map((s) => `<li>${s}</li>`).join('')}</ol>
      </details>`,
  }));
}

// ================= 畫面：我的寵物 =================
async function viewPet() {
  const pet = S.pet;
  const today = todayISO();
  const ready = await db.lastReadiness().catch(() => null);
  const sexText = { female: '母', male: '公', unknown: '' }[pet.sex] || '';
  render(page({
    nav: 'pet',
    title: '我的寵物',
    body: `
      <section class="card">
        <div class="pet-head">
          <div class="avatar lg">${esc(pet.name.slice(0, 1))}</div>
          <div class="grow"><h2>${esc(pet.name)}</h2><p class="muted">${pet.species === 'dog' ? '狗' : '貓'}${sexText ? ' · ' + sexText : ''}</p></div>
          <a class="btn small light" href="#/pet/edit">編輯</a>
        </div>
        <div class="stats">
          <div><span class="muted small">年齡</span><b>${ageText(pet.birthday, today)}</b></div>
          <div><span class="muted small">體重</span><b>${pet.weight_kg ? pet.weight_kg + ' kg' : '—'}</b></div>
          <div><span class="muted small">已陪伴</span><b>${petDay(pet, today)} 天</b></div>
        </div>
      </section>
      ${S.pets.length > 1 ? `<section class="card"><h2>切換寵物</h2><ul class="list">${S.pets.map((p) => `
        <li class="list-row"><span class="grow">${esc(p.name)}</span>${p.id === pet.id ? '<span class="tag">目前</span>' : `<button class="btn small light" data-pick="${p.id}">切換</button>`}</li>`).join('')}</ul></section>` : ''}
      <section class="card menu">
        <a href="#/pet/new">${icon.plus}<span class="grow">新增另一隻寵物</span>${icon.chevron}</a>
        <a href="#/cost">${icon.coin}<span class="grow">看診費用試算</span>${icon.chevron}</a>
        <a href="#/readiness">${icon.log}<span class="grow">飼養準備度評估${ready ? `<span class="muted small">（上次 ${ready.score} 分）</span>` : ''}</span>${icon.chevron}</a>
        <a href="#/support">${icon.info}<span class="grow">飼主支持</span>${icon.chevron}</a>
      </section>
      <section class="card">
        <p class="muted small">登入帳號：${esc(S.session.user.email)}</p>
        <button class="btn ghost" id="logout">登出</button>
      </section>`,
  }));
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => { selectPet(b.dataset.pick); viewPet(); }));
  $('#logout').addEventListener('click', () => db.signOut());
}

// ================= 畫面：花費記帳 =================
let moneyMonth = null;

function moneySeg(on) {
  return `<div class="seg" role="tablist">
    <a role="tab" href="#/money" class="${on === 'ledger' ? 'on' : ''}" aria-selected="${on === 'ledger'}">記帳</a>
    <a role="tab" href="#/cost" class="${on === 'cost' ? 'on' : ''}" aria-selected="${on === 'cost'}">費用試算</a>
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
  const money = (n) => `NT$ ${n.toLocaleString('zh-TW')}`;
  const catOf = (k) => EXPENSE_CATS.find((c) => c.key === k) || EXPENSE_CATS[EXPENSE_CATS.length - 1];
  const byCat = EXPENSE_CATS.map((c) => ({ ...c, sum: sum(list.filter((e) => e.category === c.key)) }))
    .filter((c) => c.sum > 0).sort((a, b) => b.sum - a.sum);
  const isNow = ym >= today.slice(0, 7);

  const days = [...new Set(list.map((e) => e.spent_on))];

  render(page({
    nav: 'money',
    title: '花費',
    body: `
      ${moneySeg('ledger')}
      <section class="card">
        <div class="month-nav">
          <button class="icon-btn" id="prev-m" aria-label="上個月">${icon.back}</button>
          <h2>${y} 年 ${m} 月</h2>
          <button class="icon-btn flip" id="next-m" aria-label="下個月" ${isNow ? 'disabled' : ''}>${icon.back}</button>
        </div>
        <div class="money-total">
          <span class="muted small">${esc(pet.name)}這個月的花費</span>
          <b>${money(total)}</b>
          <span class="muted small">${y} 年累計 ${money(sum(yearList))}</span>
        </div>
        ${byCat.length ? `
          <div class="stack-bar" role="img" aria-label="${byCat.map((c) => `${c.name} ${Math.round((c.sum / total) * 100)}%`).join('、')}">
            ${byCat.map((c) => `<span style="flex:${c.sum};background:${c.color}"></span>`).join('')}
          </div>
          <ul class="cat-legend">${byCat.map((c) => `
            <li><i style="background:${c.color}"></i><span class="grow">${c.name}</span><span class="muted small">${Math.round((c.sum / total) * 100)}%</span><b>${money(c.sum)}</b></li>`).join('')}
          </ul>` : ''}
      </section>
      <button class="btn primary" id="add-exp">${icon.plus}記一筆</button>
      <form id="exp-form" class="card form" hidden novalidate>
        <h2 id="exp-form-title">新增花費</h2>
        <fieldset><legend>分類</legend>
          <div class="chips cols-3">${EXPENSE_CATS.map((c, i) => radio('category', c.key, c.name, i === 0)).join('')}</div>
        </fieldset>
        <div class="chips wrap" id="quick-items"></div>
        <label>項目<input name="item" required maxlength="40" placeholder="例如：門診"></label>
        <label>金額（新台幣）<input name="amount" type="number" inputmode="numeric" min="1" step="1" required placeholder="0"></label>
        <div class="two">
          <label>日期<input name="spent_on" type="date" max="${today}" value="${today}"></label>
          <label>地點（選填）<input name="place" maxlength="40" placeholder="醫院或店家"></label>
        </div>
        <label>備註（選填）<textarea name="note" maxlength="300" rows="2"></textarea></label>
        <p class="form-error" id="exp-error" role="alert"></p>
        <div class="two"><button type="button" class="btn ghost" id="exp-cancel">取消</button><button class="btn primary" type="submit">儲存</button></div>
        <button type="button" class="btn ghost danger-text" id="exp-del" hidden>刪除這筆</button>
      </form>
      ${list.length ? days.map((d) => `
        <section class="card exp-day">
          <div class="row-between"><h2>${d === today ? '今天' : fmtDate(d)}</h2><span class="muted small">${money(sum(list.filter((e) => e.spent_on === d)))}</span></div>
          <ul class="list">${list.filter((e) => e.spent_on === d).map((e) => `
            <li><button class="exp-row" data-edit="${e.id}" aria-label="修改 ${esc(e.item)} ${e.amount} 元">
              <i class="dot" style="background:${catOf(e.category).color}"></i>
              <span class="grow"><span class="title">${esc(e.item)}</span><span class="muted small">${catOf(e.category).name}${e.place ? ' · ' + esc(e.place) : ''}${e.note ? ' · ' + esc(e.note) : ''}</span></span>
              <b>${money(e.amount)}</b>
            </button></li>`).join('')}
          </ul>
        </section>`).join('')
        : `<section class="card empty-state"><p>這個月還沒有記帳。</p><p class="muted small">記下飼料、看診、用品的花費，就能知道養${esc(pet.name)}每個月要準備多少錢。</p></section>`}
      `,
  }));

  const form = $('#exp-form');
  const el = form.elements;
  let editing = null;

  const fillQuick = () => {
    const cat = catOf(form.querySelector('input[name=category]:checked').value);
    $('#quick-items').innerHTML = cat.items.map((t) => `<button type="button" class="chip-btn" data-q="${t}">${t}</button>`).join('');
    $$('[data-q]').forEach((b) => b.addEventListener('click', () => { el.item.value = b.dataset.q; el.amount.focus(); }));
  };
  const openForm = (exp) => {
    editing = exp || null;
    form.hidden = false;
    $('#add-exp').hidden = true;
    $('#exp-form-title').textContent = exp ? '修改花費' : '新增花費';
    $('#exp-del').hidden = !exp;
    $('#exp-error').textContent = '';
    const cat = exp ? exp.category : 'medical';
    form.querySelector(`input[name=category][value=${cat}]`).checked = true;
    el.item.value = exp ? exp.item : '';
    el.amount.value = exp ? exp.amount : '';
    el.spent_on.value = exp ? exp.spent_on : (isNow ? today : monthEnd);
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
    if (b.dataset.confirm !== '1') {
      b.dataset.confirm = '1';
      b.textContent = '確定要刪除嗎？再按一次';
      return;
    }
    try { await db.deleteExpense(editing.id); toast('已刪除'); viewMoney(); } catch (err) { toast(errText(err), true); }
  });

  if (arg === 'new') openForm(null);
}

function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ================= 畫面：看診費用試算 =================
function viewCost() {
  const pet = S.pet;
  const sp = pet?.species || 'cat';
  const back = S.pets.length ? '#/pet' : '#/welcome';
  const qty = {};
  const groups = COST_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.species || i.species === sp) }));
  const all = groups.flatMap((g) => g.items);
  const presets = costPresets(sp, pet?.sex);
  const money = (n) => `NT$ ${n.toLocaleString('zh-TW')}`;

  render(page({
    title: pet ? '花費' : '看診費用試算',
    back: pet ? null : back,
    nav: pet ? 'money' : null,
    body: `
      ${pet ? moneySeg('cost') : ''}
      <section class="card soft">
        <p>選擇可能會做的項目，看看大概要準備多少錢。也可以先點下面的常見情況，一次帶入。</p>
      </section>
      <section class="card">
        <h2>常見情況</h2>
        <div class="chips wrap">${presets.map((p) => `<button type="button" class="chip-btn" data-preset="${p.key}">${p.name}</button>`).join('')}</div>
      </section>
      ${groups.map((g) => `
        <section class="card">
          <h2>${g.group}</h2>
          <ul class="list">${g.items.map((i) => `
            <li class="list-row tall cost-row" data-row="${i.key}">
              <div class="grow">
                <p class="title">${i.name}</p>
                <p class="muted small">${money(i.min)} – ${i.max.toLocaleString('zh-TW')}${i.unit ? ` / ${i.unit}` : ''}${i.note ? ` · ${i.note}` : ''}</p>
              </div>
              <div class="stepper">
                <button type="button" class="step" data-minus="${i.key}" aria-label="減少 ${i.name}">−</button>
                <output id="q-${i.key}" aria-live="polite">0</output>
                <button type="button" class="step" data-plus="${i.key}" aria-label="增加 ${i.name}">＋</button>
              </div>
            </li>`).join('')}</ul>
        </section>`).join('')}
      ${pet ? `<a class="choice card" href="#/money/new">
        <span class="choice-title">看完醫生了？</span>
        <span class="muted">把實際花費記到帳本，之後比較好規劃</span>${icon.chevron}
      </a>` : ''}
      <section class="card">
        <h2>看診時可以這樣做</h2>
        <ul class="bullets">
          <li>做檢查或治療前，先請醫院說明要做哪些項目、大概多少錢。</li>
          <li>結帳時索取收費明細，看不懂的項目可以直接問。</li>
          <li>平常每月存一點寵物醫療預備金，或考慮寵物保險。</li>
        </ul>
      </section>
      <section class="card">
        <p class="muted small">價格為 ${COST_ASOF} 整理的參考區間。低標來自動物醫院公開價目，高標參考台北市獸醫師公會單項收費上限。實際費用會因醫院、地區、體型與病情而不同，請以醫院報價為準。</p>
        <ul class="sources">${COST_SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join('')}</ul>
      </section>
      <div class="cost-bar" role="status" aria-live="polite">
        <div class="grow"><span class="muted small" id="cost-count">還沒選項目</span><b id="cost-total">NT$ 0</b></div>
        <button type="button" class="btn small ghost" id="cost-clear">清除</button>
      </div>`,
  }));

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
    $('#cost-total').textContent = n ? `${money(lo)} – ${hi.toLocaleString('zh-TW')}` : 'NT$ 0';
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

// ================= 畫面：飼養準備度評估 =================
async function viewReadiness() {
  const back = S.pets.length ? '#/pet' : '#/welcome';
  render(page({
    title: '飼養準備度評估',
    back,
    body: `
      <section class="card soft"><p>6 個問題，幫你找出養之前要先準備好的地方。沒有標準答案，誠實回答最有用。</p></section>
      <form id="ready-form">
        ${READINESS_QUESTIONS.map((q, qi) => `
          <fieldset class="card field">
            <legend>${qi + 1}. ${q.q}</legend>
            <div class="chips stack">${q.opts.map(([t, pts], i) => `<label class="chip"><input type="radio" name="${q.key}" value="${i}" required><span>${t}</span></label>`).join('')}</div>
          </fieldset>`).join('')}
        <div class="sticky-cta"><button class="btn primary" type="submit">看結果</button></div>
      </form>`,
  }));

  $('#ready-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const answers = {};
    let score = 0;
    const gaps = [];
    for (const q of READINESS_QUESTIONS) {
      const v = f.get(q.key);
      if (v === null) { toast('還有題目沒回答', true); return; }
      const [text, pts] = q.opts[Number(v)];
      answers[q.key] = text;
      score += pts;
      const max = Math.max(...q.opts.map((o) => o[1]));
      if (pts < max * 0.6) gaps.push(q.gap);
    }
    try { await db.saveReadiness(answers, score); } catch (err) { toast(errText(err), true); }
    const level = score >= 80 ? ['準備得很好', 'good'] : score >= 55 ? ['大致準備好了，還有幾件事要補強', 'warn'] : ['建議再多準備一些再決定', 'bad'];
    render(page({
      title: '評估結果',
      back,
      body: `
        <section class="card status ${level[1]}">
          <p class="score">${score}<small> / 100</small></p>
          <p class="status-title">${level[0]}</p>
        </section>
        ${gaps.length ? `<section class="card"><h2>養之前先處理這些</h2><ul class="bullets">${gaps.map((g) => `<li>${g}</li>`).join('')}</ul></section>` : ''}
        <section class="card">
          <h2>先想好的變故應對</h2>
          <ul class="bullets">
            <li>我生病或出遠門時，誰可以照顧牠？</li>
            <li>搬家、畢業、換工作時，牠要怎麼安排？</li>
            <li>突然要花一筆醫藥費（數千到上萬元），錢從哪裡來？</li>
          </ul>
          <p class="muted small">把答案寫下來，和家人或室友討論，就是你的飼養承諾。</p>
        </section>
        ${S.pets.length ? '' : '<a class="btn primary" href="#/pet/new">已經決定了，建立寵物檔案</a>'}
        <a class="btn ghost" href="${back}">完成</a>`,
    }));
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

  if (!S.session) {
    return viewAuth(name === 'signup' ? 'signup' : 'login');
  }
  if (name === 'login' || name === 'signup') return (location.hash = '#/home');

  try {
    if (name === 'readiness') return await viewReadiness();
    if (name === 'cost') return viewCost();
    if (name === 'money' && S.pet) { loading(); return await viewMoney(arg); }
    if (name === 'pet' && arg === 'new') return viewPetForm(false);
    if (!S.pet) {
      return name === 'welcome' ? viewWelcome() : (location.hash = '#/welcome');
    }
    if (name === 'welcome') return (location.hash = '#/home');

    loading();
    switch (name) {
      case 'log': return await viewLog(arg);
      case 'status': return await viewStatus();
      case 'history': return await viewHistory();
      case 'reminders': return await viewReminders();
      case 'support': return await viewSupport(arg);
      case 'pet': return arg === 'edit' ? viewPetForm(true) : await viewPet();
      default: return await viewHome();
    }
  } catch (err) {
    console.error(err);
    render(page({
      title: '載入失敗',
      body: `<section class="card"><p>${esc(errText(err))}</p><button class="btn primary" onclick="location.reload()">重新整理</button></section>`,
    }));
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
  // 有新版時自動重新載入一次
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
