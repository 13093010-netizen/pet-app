// 照護知識內容：肢體訊號、適應期小知識、壓力支持
// 所有文字都是「觀察參考」，不做診斷。

export const DISCLAIMER =
  '本作品提供之資訊僅供輔助參考，不能取代獸醫師之診斷、治療或專業建議。貓犬之健康與營養需求可能因個體狀況而異，如有健康疑慮或需要調整飲食與照護方式，請諮詢合格獸醫師。';

// 肢體與行為訊號。kind: mood（情緒）、health（身體）
export const SIGNALS = {
  cat: [
    { key: '飛機耳', kind: 'mood', text: '耳朵往兩側壓平，常見於緊張、害怕或身體不舒服。' },
    { key: '躲起來', kind: 'mood', text: '比平常更常躲著。剛到家很常見；如果已經適應了還常躲，可能是壓力或身體不適，貓咪很會隱藏不舒服。' },
    { key: '叫聲變多', kind: 'mood', text: '可能是餓了、想引起注意，也可能是焦慮或不舒服。' },
    { key: '一直舔毛', kind: 'mood', text: '過度理毛可能和壓力、皮膚癢或某處疼痛有關。' },
    { key: '尾巴拍打', kind: 'mood', text: '尾巴大力甩動常代表煩躁，先讓牠安靜一下。' },
    { key: '一直跑砂盆', kind: 'health', text: '頻繁進出貓砂盆卻尿得很少，可能是泌尿道問題，公貓尤其要小心，建議盡快諮詢獸醫。' },
    { key: '嘔吐', kind: 'health', text: '偶爾吐毛球很常見；一天吐好幾次、吐完沒精神或不吃，就要諮詢獸醫。' },
    { key: '拉肚子', kind: 'health', text: '換飼料太快、壓力或寄生蟲都可能造成軟便。持續超過一天或帶血，請諮詢獸醫。' },
  ],
  dog: [
    { key: '夾尾巴', kind: 'mood', text: '尾巴夾在後腿間，常代表害怕或不安。' },
    { key: '躲起來', kind: 'mood', text: '剛到家想躲很常見；適應後還常躲，可能是壓力或身體不適。' },
    { key: '舔嘴打哈欠', kind: 'mood', text: '不睏卻一直打哈欠、舔嘴，常是狗狗在表達緊張。' },
    { key: '吠叫變多', kind: 'mood', text: '可能是無聊、焦慮或想保護家，也可能是分離焦慮。' },
    { key: '亂尿', kind: 'mood', text: '新環境還沒學會定點很正常；突然變多也可能和壓力或泌尿問題有關。' },
    { key: '破壞東西', kind: 'mood', text: '常見於精力過剩、無聊或獨處焦慮，多帶出門消耗體力會有幫助。' },
    { key: '嘔吐', kind: 'health', text: '偶爾吐一次不一定嚴重；反覆嘔吐、沒精神或不吃，就要諮詢獸醫。' },
    { key: '拉肚子', kind: 'health', text: '換飼料太快、壓力或寄生蟲都可能造成軟便。持續超過一天或帶血，請諮詢獸醫。' },
  ],
};

export function signalsFor(species) {
  return SIGNALS[species] || SIGNALS.cat;
}

export function signalText(species, key) {
  const s = signalsFor(species).find((x) => x.key === key);
  return s ? s.text : '';
}

// 每日紀錄的選項文字
export const LOG_FIELDS = {
  food: { label: '食量', hint: '和平常比', opts: ['少', '正常', '多'] },
  water: { label: '飲水', hint: '和平常比', opts: ['少', '正常', '多'] },
  urine: {
    label: { cat: '尿塊數', dog: '小便次數' },
    hint: { cat: '今天鏟到幾塊', dog: '和平常比' },
    opts: { cat: ['0–1 塊', '2–4 塊', '5 塊以上'], dog: ['少', '正常', '多'] },
  },
  energy: { label: '精神', hint: '活動力', opts: ['差', '普通', '好'] },
};

export function fieldLabel(field, species) {
  const f = LOG_FIELDS[field];
  return typeof f.label === 'string' ? f.label : f.label[species] || f.label.cat;
}
export function fieldHint(field, species) {
  const f = LOG_FIELDS[field];
  return typeof f.hint === 'string' ? f.hint : f.hint[species] || f.hint.cat;
}
export function fieldOpts(field, species) {
  const f = LOG_FIELDS[field];
  return Array.isArray(f.opts) ? f.opts : f.opts[species] || f.opts.cat;
}

// 適應期小知識（依到家天數）
export function adaptationTip(species, day) {
  const cat = species !== 'dog';
  if (day <= 3) {
    return {
      title: `到家第 ${day} 天：先讓牠躲`,
      body: cat
        ? '剛到家躲起來、吃得少都很常見。準備一個安靜的躲藏空間，不要硬抱出來，讓牠自己探索。'
        : '新環境會讓狗狗緊張，先固定一個安靜的休息角落，少一點訪客，讓牠慢慢熟悉家裡的聲音和氣味。',
    };
  }
  if (day <= 14) {
    return {
      title: `到家第 ${day} 天：建立固定作息`,
      body: cat
        ? '固定時間餵食、每天清貓砂。如果是領養的貓，記得和獸醫確認驅蟲與疫苗進度。換飼料要用七天慢慢混換。'
        : '固定時間餵食和散步，帶牠到同一個地方上廁所，做對了就立刻稱讚。換飼料要用七天慢慢混換。',
    };
  }
  if (day <= 30) {
    return {
      title: `到家第 ${day} 天：多一點互動`,
      body: cat
        ? '每天固定 10–15 分鐘用逗貓棒玩，不要用手直接逗，可以減少抓咬。靜靜待在同一個空間也是一種陪伴。'
        : '開始練習簡單指令和短時間獨處，從幾分鐘慢慢拉長，可以預防分離焦慮。',
    };
  }
  if (day <= 90) {
    return {
      title: `到家第 ${day} 天：你們正在變熟`,
      body: '多數新手在 1 到 3 個月之間會慢慢找到節奏。持續記錄，你會越來越看得懂牠的「平常」。',
    };
  }
  return null;
}

// 心情自評
export const MOODS = ['很累', '有點累', '還好', '不錯', '很好'];

// 飼主最常見的困擾與建議
export const CONCERNS = [
  {
    key: 'hide',
    title: '牠一直躲著，跟我不親',
    tips: [
      '剛到家幾週內躲起來是常見的適應反應，給牠時間。',
      '每天在牠附近安靜地做自己的事，讓牠習慣你的存在。',
      '用零食或肉泥建立好印象，讓牠自己靠近，不要硬抱。',
    ],
  },
  {
    key: 'night',
    title: '半夜或清晨一直叫',
    tips: [
      '睡前多陪玩 10–15 分鐘消耗體力，玩完再餵一小餐。',
      '不要在牠叫的時候回應或給吃的，否則會強化這個行為。',
      '持續好幾週沒改善，或叫聲聽起來很痛苦，請諮詢獸醫。',
    ],
  },
  {
    key: 'worry',
    title: '怕自己照顧不好牠',
    tips: [
      '會擔心，代表你很在乎牠。研究發現將近一半的新手頭幾個月都有類似的焦慮。',
      '持續做每日紀錄，App 會幫你看出牠的「平常」，有變化再處理就好。',
      '把擔心的事寫下來，下次看診時一次問獸醫。',
    ],
  },
  {
    key: 'time',
    title: '時間或生活排不過來',
    tips: [
      '把必要的照顧（餵食、清潔、陪玩）排成固定時段，用提醒功能管理。',
      '先找好一位能臨時幫忙照顧的親友或寵物保母。',
      '遇到搬家、畢業、換工作，提早規劃寵物要怎麼安排。',
    ],
  },
];

export const REHOME_STEPS = [
  '先別急著決定，找家人朋友或原本的送養單位聊聊，很多困難是暫時的。',
  '如果真的無法照顧，優先聯絡原本的收容所、送養人或繁殖者，很多單位會協助回收或轉送養。',
  '自行送養時，仔細篩選領養人、簽認養切結，並轉移寵物登記資料。',
  '不要把牠放生或丟在外面。在台灣棄養寵物違反《動物保護法》，牠也很難在外面活下去。',
];

// 提醒的預設選項
export const REMINDER_PRESETS = {
  cat: ['鏟貓砂', '餵食', '換水', '陪玩', '體內驅蟲', '體外驅蟲', '疫苗', '剪指甲'],
  dog: ['餵食', '散步', '換水', '體內驅蟲', '體外驅蟲', '心絲蟲預防', '疫苗', '洗澡'],
};

export const FREQ_LABEL = {
  daily: '每天',
  weekly: '每週',
  monthly: '每月',
  yearly: '每年',
  once: '一次',
};

// 飼養前準備度評估
export const READINESS_QUESTIONS = [
  {
    key: 'time',
    q: '平日每天能花多少時間陪伴和照顧？',
    opts: [['少於 30 分鐘', 0], ['30 分鐘到 1 小時', 10], ['1 到 2 小時', 18], ['2 小時以上', 20]],
    gap: '每天的照顧時間偏少。貓每天至少需要清潔、餵食和 15 分鐘互動；狗還需要每天散步。',
  },
  {
    key: 'budget',
    q: '每月能負擔的寵物開銷大約多少？',
    opts: [['1,000 元以下', 0], ['1,000 到 2,000 元', 10], ['2,000 到 4,000 元', 16], ['4,000 元以上', 20]],
    gap: '每月預算偏緊。除了飼料和貓砂，還要預留疫苗、驅蟲和臨時看病的費用。',
  },
  {
    key: 'housing',
    q: '目前的住處可以養寵物嗎？',
    opts: [['不確定或不行', 0], ['租屋，房東同意', 14], ['自己家或家人同意', 20]],
    gap: '住處還沒確認能養。請先取得房東或家人的書面同意，避免之後被迫送養。',
  },
  {
    key: 'family',
    q: '同住的人都同意，也沒有人對貓狗過敏嗎？',
    opts: [['還沒確認', 0], ['大部分同意', 8], ['都同意也沒過敏', 15]],
    gap: '同住者的意見或過敏狀況還沒確認，這是常見的棄養原因之一。',
  },
  {
    key: 'change',
    q: '未來一兩年有搬家、畢業、出國或換工作的計畫嗎？',
    opts: [['有，而且還沒想好寵物怎麼辦', 0], ['有，但已經想好安排', 10], ['沒有', 15]],
    gap: '近期有生活變動。先想好搬家、出國時寵物要跟著走還是託誰照顧。',
  },
  {
    key: 'backup',
    q: '你生病或出遠門時，有人可以幫忙照顧嗎？',
    opts: [['沒有', 0], ['有，但不確定', 5], ['有固定可以拜託的人', 10]],
    gap: '缺少備援照顧者。先找好一位可以臨時幫忙的人，或查好附近的寵物旅館。',
  },
];

// 看診費用試算（新台幣，2026 年參考行情）
// 低標：實際動物醫院公開價目；高標：台北市獸醫師公會單項收費上限或財經網站估計
export const COST_ASOF = '2026 年 11 月';
export const COST_GROUPS = [
  {
    group: '看診',
    items: [
      { key: 'visit', name: '一般門診（含基本藥物）', min: 500, max: 3000 },
      { key: 'er', name: '夜間急診掛號', min: 1000, max: 4000, note: '營業時間外，各院差很多' },
    ],
  },
  {
    group: '疫苗與預防',
    items: [
      { key: 'vac_cat', name: '貓三合一疫苗', min: 600, max: 1600, species: 'cat' },
      { key: 'vac_dog8', name: '狗八合一疫苗', min: 500, max: 1300, species: 'dog' },
      { key: 'vac_dog10', name: '狗十合一疫苗', min: 700, max: 1600, species: 'dog' },
      { key: 'rabies', name: '狂犬病疫苗', min: 200, max: 1200, note: '無佐劑疫苗較貴' },
      { key: 'chip', name: '晶片植入＋登記', min: 250, max: 300 },
    ],
  },
  {
    group: '檢查',
    items: [
      { key: 'checkup', name: '健康檢查套組', min: 2000, max: 6000 },
      { key: 'blood', name: '血液檢查（血球＋生化）', min: 1500, max: 4500 },
      { key: 'xray', name: 'X 光', unit: '張', qty: true, min: 500, max: 1600 },
      { key: 'us', name: '腹部超音波', min: 1000, max: 3000 },
    ],
  },
  {
    group: '手術與住院',
    items: [
      { key: 'neuter_m', name: '結紮（公）', min: 3000, max: 8000 },
      { key: 'neuter_f', name: '結紮（母）', min: 5000, max: 15000 },
      { key: 'dental', name: '洗牙（需麻醉）', min: 3000, max: 8000 },
      { key: 'stay', name: '住院', unit: '天', qty: true, min: 700, max: 3500, note: '籠位費依體型，不含藥物與治療' },
    ],
  },
];

// 常見情境：一鍵帶入
export function costPresets(species, sex) {
  const vac = species === 'dog' ? 'vac_dog8' : 'vac_cat';
  const neuter = sex === 'male' ? 'neuter_m' : 'neuter_f';
  return [
    { key: 'first', name: '第一年基本照顧', items: { [vac]: 2, rabies: 1, chip: 1, checkup: 1, [neuter]: 1 } },
    { key: 'tummy', name: '腸胃不舒服看診', items: { visit: 1, blood: 1, xray: 2 } },
    { key: 'night', name: '半夜急診', items: { er: 1, blood: 1, xray: 2, stay: 1 } },
  ];
}

export const COST_SOURCES = [
  { name: '台北市獸醫師公會單項收費上限（Money101 整理，2026/8）', url: 'https://www.money101.com.tw/blog/%E5%8B%95%E7%89%A9%E9%86%AB%E9%99%A2%E6%94%B6%E8%B2%BB%E9%A0%85%E7%9B%AE' },
  { name: '愛心堡動物醫院收費標準（新北板橋）', url: 'https://lovefield.vet/pricing' },
  { name: '五福動物醫院收費標準（台中）', url: 'https://www.woofvet.com.tw/pricing/' },
];
