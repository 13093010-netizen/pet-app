// 小工具：日期（一律用使用者手機的當地日期）、跳脫文字

export function toISO(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayISO() {
  return toISO(new Date());
}

function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// b 減 a 的天數
export function daysBetween(a, b) {
  return Math.round((parse(b) - parse(a)) / 86400000);
}

// 本週一
export function weekStart(iso) {
  const d = parse(iso);
  const dow = (d.getDay() + 6) % 7; // 週一 = 0
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function fmtDate(iso, withWeek = true) {
  const d = parse(iso);
  const s = `${d.getMonth() + 1}/${d.getDate()}`;
  return withWeek ? `${s}（${WEEK[d.getDay()]}）` : s;
}

export function weekdayShort(iso) {
  return WEEK[parse(iso).getDay()];
}

export function ageText(birthday, today) {
  if (!birthday) return '—';
  const days = daysBetween(birthday, today);
  if (days < 0) return '—';
  if (days < 365) return `${Math.max(1, Math.floor(days / 30))} 個月`;
  return `${Math.floor(days / 365)} 歲`;
}

// 防止使用者輸入的文字被當成 HTML
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) {
    return null;
  }
  return null;
}
