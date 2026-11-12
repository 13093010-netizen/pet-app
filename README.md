# 毛孩安心指南

陪新手飼主度過最需要幫忙的前 90 天。2026 法國皇家 AI for Pets 創新徵件計畫｜負責任的飼主。

網頁 App（PWA），手機打開網址後「加入主畫面」就能像 App 一樣使用。

## 功能（第一版）

- 帳號註冊與登入（Supabase Auth）
- 寵物檔案，可以養很多隻
- 每日紀錄：食量、飲水、尿塊數（貓）或小便次數（狗）、精神、肢體訊號
- 分級提示：狀況穩定／需要留意／建議就醫（目前用規則判斷，之後接 AI）
- 近 7 天紀錄圖、就醫紅旗清單
- 提醒：鏟貓砂、餵食、驅蟲、疫苗等，完成後自動排下一次
- 依到家天數的適應期小知識
- 飼主每週心情自評與壓力支持、負責任送養引導
- 飼養前準備度評估

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 頁面外殼 |
| `css/tokens.css` | 顏色、字型、圓角（設計變數） |
| `css/components.css` | 設計稿的元件 |
| `css/app.css` | App 額外需要的元件 |
| `config.js` | Supabase 網址與 publishable key |
| `js/app.js` | 畫面與切換 |
| `js/db.js` | 讀寫資料庫 |
| `js/rules.js` | 狀態判斷規則 |
| `js/content.js` | 照護知識文字 |
| `js/util.js` | 日期等小工具 |
| `sw.js` | 離線快取（改檔案後把 `VERSION` 加 1） |
| `supabase/schema.sql` | 資料表與權限，貼到 Supabase SQL Editor 執行 |

## 設定步驟

1. 在 Supabase SQL Editor 執行 `supabase/schema.sql`
2. 把 Project URL 和 publishable key 填進 `config.js`
3. GitHub 專案 Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)`
4. Supabase → Authentication → URL Configuration，把 Site URL 設成 GitHub Pages 網址

## 注意

依參賽注意事項第 35 條，所有顯示健康或照護建議的畫面都有固定提示文字。本作品不提供診斷。

## 資料庫更新紀錄

| 檔案 | 內容 |
| --- | --- |
| `supabase/schema.sql` | 全部（新專案只要跑這個） |
| `supabase/002_expenses.sql` | 花費記帳 |
| `supabase/003_new_design.sql` | 新介面：克數紀錄、票根提醒、判斷紀錄、餵食設定 |
