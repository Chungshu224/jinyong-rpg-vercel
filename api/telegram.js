/**
 * Telegram Webhook 入口（Vercel Serverless Function）
 * 部署後需執行一次 setWebhook，讓 Telegram 把訊息 POST 到這支函式。
 * 見專案根目錄 README 的設定步驟。
 */

const TelegramBot = require('node-telegram-bot-api');
const game = require('../lib/game');
const store = require('../lib/store');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// 注意：這裡不開 polling，純粹用來呼叫 sendMessage 等 API
const bot = new TelegramBot(TOKEN);

const 主選單鍵盤 = {
  reply_markup: {
    keyboard: [
      ['探索', '副本'],
      ['練功', '江湖歷練'],
      ['門派任務', '拜師'],
      ['武學', '比武'],
      ['切磋', '試煉'],