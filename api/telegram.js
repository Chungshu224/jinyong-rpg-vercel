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
      ['藏寶閣', '強化坊'],
      ['合成', '藥鋪'],
      ['簽到', '轉世'],
      ['排行', '狀態'],
      ['稱號', '說明'],
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

function 藏寶閣分類鍵盤() {
  return { reply_markup: { keyboard: [['武器', '防具'], ['護膝', '鞋子'], ['飾品'], ['取消']], resize_keyboard: true } };
}

function 兵器類型選擇鍵盤() {
  const 排 = game.兵器順序.map((類) => [`兵器:${類}`]);
  排.push(['返回', '取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 裝備項目選擇鍵盤(欄位, 兵器類型限定) {
  const 名稱清單 = game.全部裝備分類名稱(欄位, 兵器類型限定);
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 2) {
    排.push(名稱清單.slice(i, i + 2));
  }
  排.push(['返回', '取消']);
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

function 洗髓丹選擇鍵盤(c) {
  const 名稱清單 = game.已裝備清單(c);
  const 排 = 名稱清單.map((名) => [`洗髓:${名}`]);
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 副本選擇鍵盤() {
  const 名稱清單 = game.全部副本名稱();
  const 排 = [];
  for (let i = 0; i < 名稱清單.length; i += 1) {
    排.push([名稱清單[i]]);
  }
  排.push(['取消']);
  return { reply_markup: { keyboard: 排, resize_keyboard: true } };
}

function 武學選擇鍵盤(c) {
  const 心法清單 = game.可選心法(c).map((名) => `心法:${名}`);
  const 招式清單 = game.可選招式(c).map((名) => `招式:${名}`);
  const 排 = [];
  for (const 名 of 心法清單) 排.push([名]);
  for (const 名 of 招式清單) 排.push([名]);
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

  // 選擇武學：文字格式為「心法:名稱」或「招式:名稱」
  if (text.startsWith('心法:')) {
    行.push(game.選擇心法(c, text.slice(3).trim()));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }
  if (text.startsWith('招式:')) {
    行.push(game.選擇招式(c, text.slice(3).trim()));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 藏寶閣分類瀏覽：文字格式為「兵器:類型」，顯示該兵器類型的武器清單
  if (text.startsWith('兵器:')) {
    const 類型 = text.slice(3).trim();
    行.push(`【武器 - ${類型}系】`, game.裝備分類清單文字(c, '武器', 類型));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行, 裝備項目選擇鍵盤('武器', 類型));
    return;
  }

  // 合成秘笈：文字剛好符合秘笈清單中的名稱
  if (game.全部秘笈名稱().includes(text)) {
    行.push(game.合成秘笈(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  // 洗髓丹：需另外指定要重骰的已裝備物品，優先於一般丹藥服用流程攔截
  if (text === '洗髓丹') {
    const 已裝備 = game.已裝備清單(c);
    if (已裝備.length === 0) {
      行.push('你目前身上沒有任何已裝備的物品，請先到「藏寶閣」裝備後再使用洗髓丹。');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
    } else {
      行.push('洗髓丹（300 銀兩）— 選定一件已裝備物品，重新擲一次品質詞綴：', '', 已裝備.join('、'));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 洗髓丹選擇鍵盤(c));
    }
    return;
  }
  if (text.startsWith('洗髓:')) {
    行.push(game.服用洗髓丹(c, text.slice(3).trim()));
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

  // 推進故事副本：文字剛好符合副本清單中的小說名稱
  if (game.全部副本名稱().includes(text)) {
    行.push(game.推進副本(c, text));
    await store.寫入角色(chatId, c);
    await 回覆(chatId, 行);
    return;
  }

  switch (text) {
    case '探索':
      行.push(game.探索(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '副本':
      行.push('江湖上流傳著幾部奇書異聞，各自藏著一段傳奇故事：', '', game.副本總覽文字(c), '', '請選擇要查看/推進的故事：');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 副本選擇鍵盤());
      break;
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
      行.push(game.藏寶閣總覽文字(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 藏寶閣分類鍵盤());
      break;
    case '武器':
      行.push(game.武器分類總覽文字(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 兵器類型選擇鍵盤());
      break;
    case '防具':
    case '護膝':
    case '鞋子':
    case '飾品':
      行.push(`【${text}】`, game.裝備分類清單文字(c, text, null));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 裝備項目選擇鍵盤(text, null));
      break;
    case '返回':
      行.push(game.藏寶閣總覽文字(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 藏寶閣分類鍵盤());
      break;
    case '武學':
      行.push(game.武學清單文字(c), '', '請選擇要修練的心法或招式：');
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行, 武學選擇鍵盤(c));
      break;
    case '比武':
      行.push(game.比武(c));
      await store.寫入角色(chatId, c);
      await 回覆(chatId, 行);
      break;
    case '切磋': {
      let 對手 = await store.讀取隨機對手(chatId);
      let 模擬 = false;
      if (!對手) {
        對手 = game.生成模擬玩家對手(game.戰力(c));
        模擬 = true;
      }
      if (模擬) 行.push('江湖上暫無其他真人玩家在線，先讓你和一位江湖路人過過招：');
      行.push(game.對戰計算(c, 對手));
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
