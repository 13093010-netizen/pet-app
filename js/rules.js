// 變化判斷規則（第一版不用 AI，用簡單規則）
// 紀錄值都是「和這隻寵物的平常比」：0 少、1 正常、2 多，所以規則本身就是以個體為基準。

import { addDays, daysBetween } from './util.js';

// logs：這隻寵物的紀錄，日期新到舊
// 回傳 { level, title, body, reasons[], tips[] }
// level：none（資料不足）、stable（穩定）、watch（需要留意）、vet（建議就醫）
export function assess(logs, pet, today) {
  const recent = logs.filter((l) => daysBetween(l.log_date, today) <= 6); // 近 7 天
  const day = daysBetween(pet.adopted_on, today) + 1;
  const isCat = pet.species !== 'dog';
  const name = pet.name;

  if (!recent.length || daysBetween(recent[0].log_date, today) > 2) {
    return {
      level: 'none',
      title: '還不夠了解牠的平常',
      body: `連續記錄幾天後，就能看出${name}的狀態有沒有變化。今天花 30 秒記一筆吧。`,
      reasons: [],
      tips: [],
    };
  }

  // 取最近連續幾天（日期相鄰）的紀錄
  const streak = [recent[0]];
  for (let i = 1; i < recent.length; i++) {
    if (daysBetween(recent[i].log_date, streak[streak.length - 1].log_date) === 1) streak.push(recent[i]);
    else break;
  }
  const lastN = (n, pred) => streak.length >= n && streak.slice(0, n).every(pred);
  const countSignal = (key) => recent.filter((l) => (l.signals || []).includes(key)).length;

  const vet = [];
  const watch = [];

  // 建議就醫
  if (isCat && lastN(2, (l) => l.urine === 0)) vet.push('尿塊連續 2 天只有 0–1 塊');
  if (isCat && countSignal('一直跑砂盆') >= 1 && recent[0].urine === 0) vet.push('一直跑砂盆，但尿塊很少');
  if (lastN(2, (l) => l.food === 0 && l.energy === 0)) vet.push('連續 2 天吃得少、精神也差');
  if (countSignal('嘔吐') >= 3) vet.push(`近 7 天記錄到 ${countSignal('嘔吐')} 天嘔吐`);
  if (lastN(2, (l) => (l.signals || []).includes('拉肚子'))) vet.push('連續 2 天拉肚子');

  // 需要留意
  if (lastN(3, (l) => l.food === 0)) watch.push('食量連續 3 天比平常少');
  if (lastN(2, (l) => l.water === 0)) watch.push('飲水連續 2 天比平常少');
  if (lastN(2, (l) => l.energy === 0)) watch.push('精神連續 2 天比較差');
  if (!isCat && lastN(2, (l) => l.urine === 0)) watch.push('小便次數連續 2 天偏少');
  if (recent.filter((l) => l.urine === 2).length >= 3) watch.push(`近 7 天有 ${recent.filter((l) => l.urine === 2).length} 天${isCat ? '尿塊' : '小便'}偏多`);
  if (recent.filter((l) => l.water === 2).length >= 3) watch.push(`近 7 天有 ${recent.filter((l) => l.water === 2).length} 天喝水偏多`);
  if (countSignal('嘔吐') >= 1 && countSignal('嘔吐') < 3) watch.push(`近 7 天記錄到 ${countSignal('嘔吐')} 天嘔吐`);
  if (day > 21 && countSignal('躲起來') >= 3) watch.push(`近 7 天有 ${countSignal('躲起來')} 天躲起來`);
  if (countSignal('一直舔毛') >= 3) watch.push(`近 7 天有 ${countSignal('一直舔毛')} 天過度舔毛`);

  if (vet.length) {
    return {
      level: 'vet',
      title: '建議盡快諮詢獸醫',
      body: `${name}最近出現的變化，比較適合讓獸醫看看。帶著這份紀錄去，說明會更清楚。`,
      reasons: [...vet, ...watch],
      tips: [
        '打電話給平常看的動物醫院，說明這幾天的變化。',
        '如果是晚上，可以先查附近的 24 小時動物醫院。',
        '在「紀錄」頁可以看到最近每天的狀況，看診時可以給獸醫看。',
      ],
    };
  }

  if (watch.length) {
    const tips = [];
    if (watch.some((w) => w.includes('食量'))) tips.push('檢查飼料有沒有換牌子、放太久，或碗沒洗乾淨。');
    if (watch.some((w) => w.includes('飲水'))) tips.push(isCat ? '多放幾個水碗、換新鮮的水，或在濕食裡加一點水。' : '確認水碗乾淨、水量充足，天熱時多放一碗。');
    if (watch.some((w) => w.includes('躲') || w.includes('舔毛'))) tips.push('想想家裡最近有沒有搬家、來客人、裝潢等壓力來源。');
    tips.push('持續觀察並記錄，若變化持續、加重，或出現嘔吐、精神很差，請諮詢獸醫。');
    return {
      level: 'watch',
      title: '需要多留意',
      body: `${name}最近有些變化，不一定是生病，先觀察幾天、照著下面的建議檢查看看。`,
      reasons: watch,
      tips,
    };
  }

  const settling = day <= 21 && countSignal('躲起來') >= 1;
  return {
    level: 'stable',
    title: `${name}最近狀況穩定`,
    body: settling
      ? `到家第 ${day} 天還會躲起來，是很常見的適應反應。照現在的步調就很好。`
      : `最近的紀錄沒有明顯變化，你照顧得很好。`,
    reasons: [],
    tips: [],
  };
}

// 提醒完成後，算出下一次日期
export function nextDate(reminder, today) {
  const base = reminder.next_date > today ? reminder.next_date : today;
  switch (reminder.freq) {
    case 'daily': return addDays(base, 1);
    case 'weekly': return addDays(base, 7);
    case 'monthly': return addMonths(base, 1);
    case 'yearly': return addMonths(base, 12);
    default: return null; // once：完成後關閉
  }
}

function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${target.getFullYear()}-${mm}-${dd}`;
}
