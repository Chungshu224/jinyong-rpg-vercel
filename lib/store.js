/**
 * 角色存檔模組 - 使用 Supabase 儲存每個 Telegram chat 的角色資料
 * 需要在 Supabase 建立資料表（見專案根目錄 schema.sql）
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const TABLE = 'jinyong_characters';

async function 讀取角色(chatId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (error) throw error;
  return data ? data.data : null;
}

async function 寫入角色(chatId, c) {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ chat_id: chatId, data: c, updated_at: new Date().toISOString() });

  if (error) throw error;
}

// 隨機取一位其他玩家的角色資料（用於「切磋」PVP，僅供讀取比較，不會改到對方的存檔）
async function 讀取隨機對手(排除ChatId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('chat_id, data')
    .neq('chat_id', 排除ChatId)
    .limit(50);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const 選中 = data[Math.floor(Math.random() * data.length)];
  return 選中.data;
}

// 取得全部玩家的角色資料（用於「排行」功能），限制筆數避免抓取過大
async function 讀取全部角色(限制 = 300) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('chat_id, data')
    .limit(限制);

  if (error) throw error;
  return data || [];
}

module.exports = { 讀取角色, 寫入角色, 讀取隨機對手, 讀取全部角色 };
