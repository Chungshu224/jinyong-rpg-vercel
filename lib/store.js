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

module.exports = { 讀取角色, 寫入角色 };
