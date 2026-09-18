-- 在 Supabase 的 SQL Editor 執行這段，建立存角色資料的資料表
create table if not exists jinyong_characters (
  chat_id bigint primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 這張表只會被伺服器端(Vercel function 用 service_role key)存取，
-- 所以不需要開放給前端匿名讀寫，保持 RLS 關閉（預設）即可。
