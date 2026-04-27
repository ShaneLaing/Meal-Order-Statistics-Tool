// backend/Code.js
//
// 部署為網路應用程式 (Deploy as Web App) 的設定：
// 1. 執行身分: 我 (Me)
// 2. 存取權限: 所有人 (Anyone)
//
// 工作表 (Sheets) schema — 嚴格沿用既有設計：
//
// 1. Menu          A=餐點名稱, B=餐點價錢                                  (header at row 1)
//                  -> 名稱 (name) 為唯一鍵，無獨立 id 欄。
//
// 2. OrdersSummary A=訂單時間, B=訂單姓名, C=餐點名稱,
//                  D=餐點數量, E=餐點價錢(小計), F=訂單總計             (header at row 1)
//                  -> 一筆訂單 = (filler_name, timestamp) 複合鍵；多餐點則同 key 多列。
//
// 3. Config        A=截止時間, B=Date 物件 (例: 2026/4/30 15:00:00)
//                  -> 使用 substring 匹配 "截止時間" 找 deadline。

const SPREADSHEET_ID = '1t_EUafkwqdeQRr6rpxHs1MLVeAzjmk58uFxMc5qEIuw';

const MENU_SHEET_NAME = 'Menu';
const SUMMARY_SHEET_NAME = 'OrdersSummary';
const CONFIG_SHEET_NAME = 'Config';

const HEADER_ROW_COUNT = 1;

// OrdersSummary 欄位索引
const O_COL = {
  TIMESTAMP: 0,
  FILLER: 1,
  MEAL: 2,
  QTY: 3,
  SUBTOTAL: 4,
  TOTAL: 5
};

// Menu 欄位索引
const M_COL = {
  NAME: 0,
  PRICE: 1
};

/* ------------------------------------------------------------------ */
/* Routing                                                              */
/* ------------------------------------------------------------------ */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getMenu';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === 'init') {
      return respond({
        success: true,
        items: getMenuData(ss),
        orders: getOrdersData(ss),
        settings: getSettings(ss)
      });
    }
    if (action === 'getOrders')   return respond({ success: true, orders: getOrdersData(ss) });
    if (action === 'getSettings') return respond({ success: true, settings: getSettings(ss) });
    return respond({ success: true, items: getMenuData(ss) });

  } catch (err) {
    return respond({ success: false, error: 'Backend Error: ' + err.message });
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const payload = JSON.parse(e.postData.contents);

    // 向後相容: 舊版 { delete: true } -> deleteOrder
    let action = payload.action;
    if (!action) action = payload.delete === true ? 'deleteOrder' : 'upsertOrder';

    if (action === 'upsertOrder') return upsertOrder(ss, payload);
    if (action === 'deleteOrder') return deleteOrder(ss, payload);
    if (action === 'upsertMenu')  return upsertMenu(ss, payload);
    if (action === 'deleteMenu')  return deleteMenu(ss, payload);

    return respond({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

function doOptions(e) {
  return respond({ success: true });
}

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

function getMenuData(ss) {
  const sheet = ss.getSheetByName(MENU_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const items = [];
  for (let i = HEADER_ROW_COUNT; i < data.length; i++) {
    const row = data[i];
    if (row[M_COL.NAME]) {
      items.push({
        name: String(row[M_COL.NAME]),
        price: Number(row[M_COL.PRICE]) || 0
      });
    }
  }
  return items;
}

function getOrdersData(ss) {
  const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const orderMap = {};

  for (let i = HEADER_ROW_COUNT; i < data.length; i++) {
    const row = data[i];
    const tsValue = row[O_COL.TIMESTAMP];
    if (!tsValue) continue;
    const timestamp = tsValue instanceof Date ? tsValue.toISOString() : String(tsValue);
    const fillerName = String(row[O_COL.FILLER]);
    const key = fillerName + '|' + timestamp;

    if (!orderMap[key]) {
      orderMap[key] = {
        timestamp: timestamp,
        filler_name: fillerName,
        total_price: Number(row[O_COL.TOTAL]) || 0,
        items: [],
        items_summary_parts: []
      };
    }

    if (row[O_COL.MEAL] && row[O_COL.QTY] && row[O_COL.SUBTOTAL]) {
      const quantity = Number(row[O_COL.QTY]) || 0;
      const subtotal = Number(row[O_COL.SUBTOTAL]) || 0;
      const unitPrice = quantity > 0 ? subtotal / quantity : 0;
      orderMap[key].items.push({
        id: 'item-' + i,
        meal: { name: String(row[O_COL.MEAL]), price: unitPrice },
        quantity: quantity,
        subtotal: subtotal
      });
      orderMap[key].items_summary_parts.push(
        String(row[O_COL.MEAL]) + ' × ' + String(row[O_COL.QTY])
      );
    }
  }

  return Object.values(orderMap).map(function (o) {
    o.items_summary = o.items_summary_parts.join('\n');
    delete o.items_summary_parts;
    return o;
  });
}

function getSettings(ss) {
  const out = { deadline: null };
  try {
    const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) return out;
    const data = sheet.getRange('A:B').getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').indexOf('截止時間') !== -1) {
        const v = data[i][1];
        if (v instanceof Date) {
          out.deadline = Utilities.formatDate(
            v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
          );
        } else if (v) {
          out.deadline = String(v);
        }
        break;
      }
    }
  } catch (e) {}
  return out;
}

/* ------------------------------------------------------------------ */
/* Deadline 檢查                                                        */
/* ------------------------------------------------------------------ */

function isPastDeadline(ss) {
  try {
    const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) return false;
    const data = sheet.getRange('A:B').getValues();
    let rawDeadline = null;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').indexOf('截止時間') !== -1) {
        rawDeadline = data[i][1];
        break;
      }
    }
    if (!rawDeadline) return false;

    const now = new Date();
    now.setMilliseconds(0);

    let deadline;
    if (rawDeadline instanceof Date) {
      deadline = rawDeadline;
      // 1899/12/30：Sheet 的「純時間」會落在這個基準日，需貼回今天
      if (deadline.getFullYear() < 1900) {
        const t = deadline;
        deadline = new Date(now.getTime());
        deadline.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
      }
    } else {
      deadline = new Date(rawDeadline);
      if (isNaN(deadline.getTime())) {
        // 容錯：手動字串如「下午 6:00:00」
        const m = String(rawDeadline).match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
        if (!m) return false;
        deadline = new Date(now.getTime());
        let hh = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const ss2 = parseInt(m[3] || '0', 10);
        if (String(rawDeadline).indexOf('下午') !== -1 && hh < 12) hh += 12;
        if (String(rawDeadline).indexOf('上午') !== -1 && hh === 12) hh = 0;
        deadline.setHours(hh, mm, ss2, 0);
      }
    }
    deadline.setMilliseconds(0);
    return now > deadline;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Order mutations                                                      */
/* ------------------------------------------------------------------ */

function upsertOrder(ss, payload) {
  if (isPastDeadline(ss)) {
    return respond({ success: false, error: 'PAST_DEADLINE' });
  }
  const validation = validateOrderPayload(payload);
  if (validation) return respond({ success: false, error: validation });

  const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sheet) return respond({ success: false, error: 'OrdersSummary sheet not found' });

  // 1. 編輯模式 (有提供 prevTimestamp + prevFillerName)：先刪除舊列
  const prevTs = payload.prevTimestamp || payload.timestamp;
  const prevName = payload.prevFillerName || payload.filler_name;
  if (prevTs) removeOrderRows(sheet, prevName, prevTs);

  // 2. 新增 / 更新後寫入
  const fillerName = String(payload.filler_name);
  const items = payload.items;
  const grandTotal = Number(payload.total_price);
  const now = new Date();
  now.setMilliseconds(0);
  const responseTimestamp = now.toISOString();

  items.forEach(function (item) {
    sheet.appendRow([
      now,                                  // A: 訂單時間 (Date)
      fillerName,                           // B: 訂單姓名
      String(item.meal && item.meal.name),  // C: 餐點名稱
      Number(item.quantity),                // D: 餐點數量
      Number(item.subtotal),                // E: 餐點價錢 (小計)
      grandTotal                            // F: 訂單總計
    ]);
  });

  return respond({ success: true, timestamp: responseTimestamp });
}

function deleteOrder(ss, payload) {
  if (isPastDeadline(ss)) {
    return respond({ success: false, error: 'PAST_DEADLINE' });
  }
  if (!payload.timestamp || !payload.filler_name) {
    return respond({ success: false, error: 'Missing timestamp or filler_name' });
  }
  const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sheet) return respond({ success: false, error: 'OrdersSummary sheet not found' });

  removeOrderRows(sheet, String(payload.filler_name), String(payload.timestamp));
  return respond({ success: true });
}

function removeOrderRows(sheet, fillerName, timestampStr) {
  const target = new Date(timestampStr);
  if (isNaN(target.getTime())) return;
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= HEADER_ROW_COUNT; i--) {
    const tsValue = data[i][O_COL.TIMESTAMP];
    if (!tsValue) continue;
    const rowDate = tsValue instanceof Date ? tsValue : new Date(tsValue);
    if (isNaN(rowDate.getTime())) continue;
    if (rowDate.getTime() === target.getTime() &&
        String(data[i][O_COL.FILLER]) === fillerName) {
      sheet.deleteRow(i + 1);
    }
  }
}

function validateOrderPayload(payload) {
  if (!payload || !payload.filler_name || !String(payload.filler_name).trim()) {
    return 'Missing filler_name';
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return 'items must be non-empty array';
  }
  for (let i = 0; i < payload.items.length; i++) {
    const it = payload.items[i];
    if (!it || !it.meal || !it.meal.name || typeof it.quantity !== 'number' || it.quantity <= 0) {
      return 'Invalid item at index ' + i;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Menu mutations  (key = name)                                         */
/* ------------------------------------------------------------------ */

function upsertMenu(ss, payload) {
  if (!payload.item) return respond({ success: false, error: 'Missing item' });
  const item = payload.item;
  const name = String(item.name || '').trim();
  const price = Number(item.price);
  if (!name) return respond({ success: false, error: 'Menu name required' });
  if (isNaN(price) || price < 0) return respond({ success: false, error: 'Menu price must be >= 0' });

  const sheet = ss.getSheetByName(MENU_SHEET_NAME);
  if (!sheet) return respond({ success: false, error: 'Menu sheet not found' });

  const prevName = item.prevName ? String(item.prevName) : null;
  const data = sheet.getDataRange().getValues();

  // 改名：若 prevName 與 name 不同，移除舊列
  if (prevName && prevName !== name) {
    for (let i = data.length - 1; i >= HEADER_ROW_COUNT; i--) {
      if (String(data[i][M_COL.NAME]) === prevName) {
        sheet.deleteRow(i + 1);
      }
    }
  }

  // 嘗試更新同名列
  let updated = false;
  const fresh = sheet.getDataRange().getValues();
  for (let i = HEADER_ROW_COUNT; i < fresh.length; i++) {
    if (String(fresh[i][M_COL.NAME]) === name) {
      sheet.getRange(i + 1, M_COL.PRICE + 1).setValue(price);
      updated = true;
      break;
    }
  }
  if (!updated) sheet.appendRow([name, price]);

  return respond({ success: true, item: { name: name, price: price } });
}

function deleteMenu(ss, payload) {
  if (!payload.name) return respond({ success: false, error: 'Missing menu name' });
  const sheet = ss.getSheetByName(MENU_SHEET_NAME);
  if (!sheet) return respond({ success: false, error: 'Menu sheet not found' });
  const target = String(payload.name);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= HEADER_ROW_COUNT; i--) {
    if (String(data[i][M_COL.NAME]) === target) sheet.deleteRow(i + 1);
  }
  return respond({ success: true });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function respond(responseObj) {
  return ContentService
    .createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}
