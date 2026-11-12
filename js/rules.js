// 判斷規則（第一版用規則，之後可以換成 AI）
// 重點：用「這隻寵物自己前幾天的平均」當基準，而不是固定數字。

import { addDays, daysBetween } from './util.js';

// ---------- 工具 ----------
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// 前 7 天（不含今天）某個欄位的平均；至少要有 3 天資料才算
export function baseline(logs, field, today) {
  const vals = logs
    .filter((l) => l.log_date < today && daysBetween(l.log_date, today) <= 7 && l[field] !== null && l[field] !== undefined)
    .map((l) => Number(l[field]));
  return vals.length >= 3 ? Math.round(avg(vals)) : null;
}

export function streakDays(logs, today) {
  const dates = new Set(logs.map((l) => l.log_date));
  let n = 0;
  let d = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function ageMonths(birthday, today) {
  if (!birthday) return null;
  return Math.max(0, Math.floor(daysBetween(birthday, today) / 30.44));
}

export function stageText(pet, today) {
  const m = ageMonths(pet.birthday, today);
  const cat = pet.species !== 'dog';
  if (m === null) return cat ? '貓' : '狗';
  if (m < 12) return `${cat ? '幼貓' : '幼犬'} ${Math.max(1, m)} 個月`;
  const y = Math.floor(m / 12);
  if ((cat && y >= 11) || (!cat && y >= 8)) return `${cat ? '老貓' : '老犬'} ${y} 歲`;
  return `${cat ? '成貓' : '成犬'} ${y} 歲`;
}

// ---------- 從每日紀錄找變化 ----------
// 回傳 state：none（資料不足）、calm（穩定）、watch（多留意）、vet（今天看醫生）、urgent（立刻就醫）
export function assessRecords(logs, pet, today) {
  const isCat = pet.species !== 'dog';
  const name = pet.name;
  const by = Object.fromEntries(logs.map((l) => [l.log_date, l]));
  const t = by[today];
  const y = by[addDays(today, -1)];
  const recent = logs.filter((l) => daysBetween(l.log_date, today) <= 2);
  if (!recent.length) {
    return { state: 'none', level: 0, title: '還不夠了解牠的平常', body: `連續記錄 3 天以上，就能看出${name}的狀態有沒有變化。`, evidence: [], todo: [] };
  }

  const bf = baseline(logs, 'food_g', today);
  const bw = baseline(logs, 'water_ml', today);
  const bu = baseline(logs, 'urine_count', today);
  const low = (l, f, b, r) => l && l[f] !== null && l[f] !== undefined && b && l[f] < b * r;
  const high = (l, f, b, r) => l && l[f] !== null && l[f] !== undefined && b && l[f] > b * r;

  const urgent = [];
  const vet = [];
  const watch = [];
  const evidence = [];

  if (t?.food_g != null) evidence.push(`今天吃 ${t.food_g} g${bf ? `，前幾天平均 ${bf} g` : ''}`);
  if (t?.water_ml != null) evidence.push(`喝水 ${t.water_ml} ml${bw ? `，平常 ${bw} ml` : ''}`);
  if (t?.urine_count != null) evidence.push(`${isCat ? '尿塊' : '尿尿'} ${t.urine_count} ${isCat ? '塊' : '次'}${bu != null ? `，平常 ${bu}` : ''}`);
  if (t?.note) evidence.push(`你今天的備註：${t.note}`);

  if (isCat && t?.urine_count === 0 && y?.urine_count != null && y.urine_count <= 1) urgent.push('尿塊連續兩天幾乎沒有');
  if (t?.food_g === 0 && y?.food_g === 0) vet.push('已經超過一天完全沒吃');
  if (low(t, 'food_g', bf, 0.6) && low(y, 'food_g', bf, 0.6)) vet.push('連續兩天吃不到平常的六成');
  else if (low(t, 'food_g', bf, 0.6)) watch.push('今天吃得比平常少很多');
  if (low(t, 'water_ml', bw, 0.5) && low(y, 'water_ml', bw, 0.5)) vet.push('連續兩天喝水不到平常一半');
  if (high(t, 'water_ml', bw, 1.8) && high(y, 'water_ml', bw, 1.8)) vet.push('連續兩天喝水明顯變多');
  if (t?.stool === 'diarrhea' && y?.stool === 'diarrhea') vet.push('連續兩天拉肚子');
  else if (t?.stool === 'diarrhea') watch.push('今天拉肚子');
  if (t?.energy === 0 && (y?.energy === 0 || low(t, 'food_g', bf, 0.6) || t?.stool === 'diarrhea')) vet.push('沒精神，又合併其他變化');
  else if (t?.energy === 0) watch.push('今天比較沒精神');

  const day = daysBetween(pet.adopted_on, today) + 1;
  if (urgent.length) {
    return {
      state: 'urgent', level: 2, title: '建議立刻就醫',
      body: isCat ? '貓咪長時間尿不出來可能是泌尿道阻塞，會很快變危險，請馬上聯絡動物醫院。' : `${name}的狀況需要獸醫盡快處理，請馬上聯絡動物醫院。`,
      evidence: [...urgent, ...evidence], todo: ['馬上打給動物醫院，晚上就找 24 小時急診', '帶著這幾天的紀錄給醫生看'],
    };
  }
  if (vet.length) {
    return {
      state: 'vet', level: 1, title: '建議今天帶去看醫生',
      body: `${name}這兩天的變化比較明顯，早點看比較安心，也通常比拖到急診便宜。`,
      evidence: [...vet, ...evidence], todo: ['打電話給平常看的醫院預約', '帶著「紀錄」頁這幾天的數字給醫生看', '先不要餵牛奶或人吃的東西'],
    };
  }
  if (watch.length) {
    return {
      state: 'watch', level: 0, title: watch[0] + '，先在家多觀察',
      body: day <= 21 ? `剛到家 ${day} 天，食量和便便忽好忽壞很常見。今天多留意，明天再記一次。` : '偶爾一天不一樣不一定是生病，明天再記一次比較看看。',
      evidence: [...watch, ...evidence], todo: ['檢查飼料有沒有換、有沒有放太久', '飯碗和水碗放在安靜的地方', '明天再記一次，App 會幫你比對'],
    };
  }
  return {
    state: 'calm', level: 0, title: `${name}最近狀況穩定`,
    body: bf ? '最近的數字都在平常範圍內，你照顧得很好。' : '再多記幾天，就能算出牠的「平常」是多少。',
    evidence, todo: [],
  };
}

// ---------- 「牠這樣正常嗎？」三級分流 ----------
// symptoms：使用者點的症狀文字；duration：today、1-2d、2d+
export function triage(symptoms, duration, pet, logs, today) {
  const has = (s) => symptoms.includes(s);
  const isCat = pet.species !== 'dog';
  const day = daysBetween(pet.adopted_on, today) + 1;
  const months = ageMonths(pet.birthday, today);
  const young = months !== null && months < 6;
  const long = duration === '2d+';
  const started = duration !== 'today';
  const gi = ['不吃', '吃很少', '吐了', '拉肚子'].filter(has).length;

  let level = 0;
  const why = [];
  const up = (l, reason) => { if (l > level) level = l; why.push(reason); };

  if (has('蹲很久尿不出來')) up(2, isCat ? '貓咪尿不出來可能是泌尿道阻塞，會很快變危險' : '尿不出來需要盡快檢查');
  if (has('不吃') && long) up(2, '超過兩天完全不吃');
  if (has('吐了') && has('沒精神') && started) up(2, '持續嘔吐又沒精神');
  if (has('不吃') && started) up(1, '超過一天不吃');
  if (has('吐了') && (started || gi >= 2)) up(1, '一直吐或合併其他腸胃症狀');
  if (has('拉肚子') && (started || has('沒精神'))) up(1, young ? '幼小的寵物拉肚子容易脫水' : '拉肚子持續或合併沒精神');
  if (has('沒精神') && gi >= 1) up(1, '沒精神又合併吃喝問題');
  if ((has('喝很多水') || has('尿很多')) && long) up(1, '喝多尿多超過兩天');
  if ((has('打噴嚏') || has('一直抓癢')) && long) up(1, '症狀超過兩天沒有好轉');
  const settling = ['一直躲起來', '一直叫', '飛機耳', '夾尾巴', '吃很少'];
  if (long && symptoms.some((s) => !settling.includes(s) && s !== '打噴嚏' && s !== '一直抓癢') && level === 0) up(1, '症狀超過兩天');
  if (long && day > 21 && symptoms.some((s) => settling.includes(s)) && level === 0) up(1, '已經適應一段時間，行為變化卻持續');

  // 從紀錄找佐證
  const t = logs.find((l) => l.log_date === today);
  const bf = baseline(logs, 'food_g', today);
  const bw = baseline(logs, 'water_ml', today);
  const evidence = [];
  if (t?.food_g != null) evidence.push(`今天吃 ${t.food_g} g${bf ? `，前幾天平均 ${bf} g` : ''}`);
  if (t?.water_ml != null) evidence.push(`喝水 ${t.water_ml} ml${bw ? `，平常 ${bw} ml` : ''}`);
  if (t?.urine_count != null) evidence.push(`${isCat ? '尿塊' : '尿尿'} ${t.urine_count} ${isCat ? '塊' : '次'}`);
  const notes = logs.filter((l) => l.note && daysBetween(l.log_date, today) <= 3).map((l) => `${l.log_date === today ? '今天' : '前幾天'}的備註：${l.note}`);
  evidence.push(...notes.slice(0, 2));
  if (!evidence.length) evidence.push('還沒有今天的紀錄，記下食量和喝水，判斷會更準');

  const onlySettling = symptoms.length && symptoms.every((s) => settling.includes(s));
  let title, body;
  if (level === 2) {
    title = '建議立刻就醫';
    body = `${why[0]}，請馬上聯絡動物醫院；晚上就找 24 小時急診。`;
  } else if (level === 1) {
    title = '建議今天帶去看醫生';
    body = `${why[0]}，早點看比較安心，也通常比拖到急診便宜。`;
  } else if (onlySettling && day <= 21) {
    title = '新手很常見，先在家觀察';
    body = `剛到家 ${day} 天，${isCat ? '躲起來、叫、吃得少' : '緊張、叫、吃得少'}都是常見的適應反應。給牠安靜的空間，持續記錄就好。`;
  } else {
    title = '先在家觀察';
    body = '目前看起來不急，先照下面的建議做，明天再記一次比對。';
  }

  const todo = [];
  if (has('吃很少') || has('不吃')) todo.push('換飼料要新舊混著餵，7 天慢慢換');
  if (has('吃很少') || has('不吃')) todo.push('少量多餐，飯碗放在安靜的地方');
  if (has('拉肚子')) todo.push('拍一張便便照片，或帶新鮮樣本給醫生');
  if (has('吐了')) todo.push('先暫停零食，記下吐了幾次、吐出什麼');
  if (has('一直躲起來') || has('飛機耳') || has('夾尾巴')) todo.push('準備一個安靜的躲藏處，不要硬抱出來');
  if (has('一直叫')) todo.push('睡前多陪玩消耗體力，叫的時候不要馬上給吃的');
  if (has('一直抓癢')) todo.push('看看皮膚有沒有紅、掉毛或跳蚤，確認驅蟲有沒有按時做');
  if (has('喝很多水') || has('尿很多')) todo.push('連續幾天記錄喝水量和尿塊數，給醫生參考');
  if (level >= 1) todo.unshift('帶著「紀錄」頁這 7 天的數字給醫生看');
  todo.push('明天再記一次，App 會幫你比對');

  const warn = level === 2
    ? '路上注意保暖，不要餵東西或藥物。'
    : isCat
      ? '超過 24 小時完全不吃、一直吐、尿不出來或一直躺著不動：請立刻就醫。'
      : '一直吐、肚子脹、呼吸急促或一直躺著不動：請立刻就醫。';

  const costKeys = level === 2 ? { er: 1, blood: 1, xray: 1 } : level === 1 ? { visit: 1 } : null;
  return { level, title, body, why, evidence, todo: [...new Set(todo)].slice(0, 5), warn, costKeys };
}

// ---------- 餵食量 ----------
// 每日熱量 = 70 × 體重^0.75 × 生命階段係數（常見的獸醫營養估算方式）
export function feedPlan(pet, today) {
  const kg = Number(pet.weight_kg);
  if (!kg) return null;
  const cat = pet.species !== 'dog';
  const m = ageMonths(pet.birthday, today);
  let factor, meals;
  if (m !== null && m < 4) { factor = 3.0; meals = 4; }
  else if (m !== null && m < 12) { factor = cat ? 2.5 : 2.0; meals = m < 6 ? 4 : 3; }
  else { factor = cat ? 1.2 : 1.6; meals = 2; }
  const rer = 70 * Math.pow(kg, 0.75);
  const kcal = Math.round(rer * factor);
  const density = pet.food_kcal_per_kg || (cat ? 3900 : 3600);
  const grams = Math.round((kcal / density) * 1000);
  const times = { 2: ['08:00', '19:00'], 3: ['08:00', '13:00', '19:00'], 4: ['08:00', '12:00', '17:00', '22:00'] }[meals];
  const each = Math.floor(grams / meals);
  const split = times.map((t, i) => ({ time: t, g: i < grams - each * meals ? each + 1 : each }));
  return { kcal, grams, density, meals: split, factor, ageKnown: m !== null, months: m, densityDefault: !pet.food_kcal_per_kg };
}

// ---------- 提醒 ----------
export function dueToday(r, today) {
  if (!r.enabled) return false;
  if (r.freq === 'once' && r.last_done && r.last_done !== today) return false; // 一次性的，做完就結束
  if (r.freq === 'weekdays') {
    const dow = new Date(today + 'T00:00:00').getDay();
    if (dow === 0 || dow === 6) return false;
  }
  return r.next_date <= today || r.last_done === today;
}

export function nextDate(reminder, today) {
  const base = reminder.next_date > today ? reminder.next_date : today;
  switch (reminder.freq) {
    case 'daily': return addDays(base, 1);
    case 'weekdays': {
      let d = addDays(base, 1);
      while ([0, 6].includes(new Date(d + 'T00:00:00').getDay())) d = addDays(d, 1);
      return d;
    }
    case 'weekly': return addDays(base, 7);
    case 'monthly': return addMonths(base, 1);
    case 'yearly': return addMonths(base, 12);
    default: return null;
  }
}

function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}
