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
      ['練功', '江湖歷練'],
      ['門派任務', '拜師'],
      ['比武', '切磋'],
      ['試煉', '藏寶閣'],
      ['強化坊', '合成'],
      ['藥鋪', '簽到'],
      ['轉世', '排行'],
      ['狀態', '稱號'],
      ['說明'],
    ],
    resize_keyboard: true,
  },
};

function 門派選擇鍵盤() {
  const 名稱清單 = Object.keys(game.門派清單);
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 2) {
    排.push(名稱清單.slice(i, i + 2));
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 稱號選擇鍵盤(c) {
  const 清單 = ['無', ...game.可用稱號清單(c)];
  const 排 = [];
  for (let i = 0; i < 清單.length; i += 2) {
    排.push(清單.slice(i, i + 2));
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 藏寶閣選擇鍵盤() {
  const 名稱清單 = game.全部裝備名稱();
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 2) {
    排.push(名稱清單.slice(i, i + 2));
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 試煉選擇鍵盤() {
  const 名稱清單 = game.全部BOSS名稱();
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 1) {
    排.push([名稱清單[i]]);
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 強化坊選擇鍵盤(c) {
  const 已購 = c.已購裝備 || [];
  const 排 = 已購.map((名稱) => [`強化 ${名稱}`]);
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 合成選擇鍵盤() {
  const 名稱清單 = game.全部秘笈名稱();
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 1) {
    排.push([名稱清單[i]]);
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 藥鋪選擇鍵盤() {
  const 名稱清單 = game.全部丹藥名稱();
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 1) {
    排.push([名稱清單[i]]);
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

async function 回覆(chatId, 行陣列, 鍵盤) {
  await bot.sendMessage(chatId, 行陣列.join('\n\n'), 鍵盤 || 主選單鍵盤);
}

async function 處理訊息(chatId, 原文) {
  const text = (原文 || '').trim();

  if (text === '/start') {
    const 現有角色 = await store.讀取角色(chatId);
    if (現有角色) {
      await 回覆(chatId, [`${現有角色.名字}，歡迎回來。輸入下方按鈕開始行動。`]);
    } else {
      await bot.sendMessage(chatId, '尚未建立角色，請輸入俠客名號：');
    }
    return;
  }

  if (text.startsWith('/')) return; // 其他斜線指令先忽略

  let c = await store.讀取角色(chatId);

  // 尚未建立角色 -> 這次輸入視為角色名字
  if (!c) {
    const 名字 = text || '無名俠客';
    c = game.新角色(名字);
    await store.寫入角色(chatId, c);
    await 回覆(chatId, [`歡迎踏入江湖，${c.名字}！`, game.狀態文字(c)]);
    return;
  }

  const 提示 = game.結算離線進度(c);
  const 行 = [];
  if (提示) 行.push(提示);

  // 拜師：文字剛好符合門派名稱且尚未拜師
  if (!c.門派 && game.門派清單[text]) {
    行.push(game.拜師(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 佩戴/卸下稱號：文字剛好符合已擁有稱號或「無」
  if ((c.已獲稱號 || []).includes(text) || text === '無') {
    行.push(game.換稱號(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 購買/裝備：文字剛好符合藏寶閣裡的裝備名稱
  if (game.全部裝備名稱().includes(text)) {
    行.push(game.購買或裝備(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 挑戰 BOSS：文字剛好符合試煉清單中的 BOSS 名稱
  if (game.全部BOSS名稱().includes(text)) {
    行.push(game.挑戰BOSS(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 強化裝備：文字格式為「強化 物品名稱」
  if (text.startsWith('強化 ')) {
    const 物品名稱 = text.slice(3).trim();
    行.push(game.強化裝備(c, 物品名稱));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 合成秘笈：文字剛好符合秘笈清單中的名稱
  if (game.全部秘笈名稱().includes(text)) {
    行.push(game.合成秘笈(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 服用丹藥：文字剛好符合藥鋪清單中的名稱
  if (game.全部丹藥名稱().includes(text)) {
    行.push(game.購買並服用(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  switch (text) {
    case '練功':
      行.push(game.練功(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '江湖歷練':
      行.push(game.江湖歷練(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '門派任務':
      行.push(game.門派任務(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '拜師':
      if (c.門派) {
        行.push(`你已是「${c.門派}」${c.門派職位}，尚無轉投他派之理。`);
        await store.寫入角色(chatId, c);
        await 回覆(chatId, 行);
      } else {
        await store.寫入角色(chatId, c);
        行.push('請選擇欲拜入的門派：', '', game.門派清單文字());
        await 回覆(chatId, 行, 門派選擇鍵盤());
      }
      break;
    case '取消':
      await store.寫入角色(chatId, c);
      行.push('已取消。');
      await 回覆(chatId, 行);
      break;
    case '狀態':
      行.push(game.狀態文字(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '稱號': {
      const 擁有 = game.可用稱號清單(c);
      if (擁有.length === 0) {
        行.push('你尚未獲得任何稱號。完成「江湖歷練」中的典故奇遇即可獲得專屬稱號！');
        await store.寫入角色(chatId, c);
        await 回覆(chatId, 行);
      } else {
        const 目前 = c.目前稱號 ? `目前佩戴：「${c.目前稱號}」` : '目前未佩戴稱號';
        行.push(`${目前}\n\n已擁有稱號：\n${擁有.map((t) => `・${t}`).join('\n')}\n\n請選擇要佩戴的稱號（「無」為卸下）：`);
        await store.寫入角色(chatId, c);
        await 回覆(chatId, 行, 稱號選擇鍵盤(c));
      }
      break;
    }
    case '藏寶閣':
      行.push('藏寶閣中陳列著各方奇珍異寶：', '', game.藏寶閣清單文字(c), '', '請選擇要購買/裝備的物品：');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 藏寶閣選擇鍵盤());
      break;
    case '比武':
      行.push(game.比武(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '切磋': {
      const 對手 = await store.讀取隨機對手(chatId);
      if (!對手) {
        行.push('江湖上暫無其他同道可供切磋，稍後再來試試！');
      } else {
        行.push(game.對戰計算(c, 對手));
      }
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    }
    case '試煉':
      行.push('江湖上流傳著幾位深藏不露的絕頂高手：', '', game.試煉清單文字(c), '', '請選擇要挑戰的對象：');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 試煉選擇鍵盤());
      break;
    case '強化坊':
      行.push('強化坊內爐火熊熊，可將已擁有的裝備繼續打磨：', '', game.強化坊清單文字(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 強化坊選擇鍵盤(c));
      break;
    case '合成':
      行.push('你翻開懷中蒐集的殘篇，比對缺漏之處：', '', game.殘篇清單文字(c), '', '殘篇集滿後，選擇秘笈名稱即可合成：');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 合成選擇鍵盤());
      break;
    case '簽到':
      行.push(game.簽到(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '轉世':
      行.push(game.轉世(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '藥鋪':
      行.push('藥鋪內丹藥琳瑯滿目：', '', game.藥鋪清單文字(), '', '請選擇要購買服用的丹藥：');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 藥鋪選擇鍵盤());
      break;
    case '排行': {
      const 全部角色 = await store.讀取全部角色();
      行.push('江湖排行榜（依戰力排序）：', '', game.排行榜文字(全部角色, chatId));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    }
    case '說明':
      行.push(game.說明文字());
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    default:
      行.push('請用下方按鈕操作，或按「說明」查看完整系統介紹。');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(200).send('這是金庸RPG bot的webhook端點，請透過Telegram傳訊息。');
    return;
  }

  try {
    const update = req.body;
    const msg = update && update.message;
    if (msg && typeof msg.text === 'string') {
      await 處理訊息(msg.chat.id, msg.text);
    }
  } catch (err) {
    console.error('處理訊息時發生錯誤：', err);
  }

  // 無論如何都回 200，避免 Telegram 重試造成訊息重複處理
  res.status(200).send('OK');
};
