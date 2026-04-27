// backend/Code.js

// 部署為網路應用程式 (Deploy as Web App) 的設定：
// 1. 執行身分: 我 (Me)
// 2. 存取權限: 所有人 (Anyone)

const SPREADSHEET_ID = '1t_EUafkwqdeQRr6rpxHs1MLVeAzjmk58uFxMc5qEIuw'; // <-- 請將此替換為您的 Google 試算表 ID

// 定義試算表的工作表名稱
const MENU_SHEET_NAME = 'Menu';
const SUMMARY_SHEET_NAME = 'OrdersSummary';
const CONFIG_SHEET_NAME = 'Config';

/**
 * 處理 GET 請求
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getMenu';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === 'getOrders') {
      return respond({ success: true, orders: getOrdersData(ss) });
    }

    if (action === 'init') {
      return respond({
        success: true,
        items: getMenuData(ss),
        orders: getOrdersData(ss)
      });
    }

    // --- 預設為 getMenu ---
    return respond({ success: true, items: getMenuData(ss) });

  } catch (err) {
    return respond({ success: false, error: "Backend Error: " + err.message });
  }
}

/**
 * 取得餐點清單資料
 */
function getMenuData(ss) {
  const HEADER_ROW_COUNT = 1;
  const sheet = ss.getSheetByName(MENU_SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const items = [];
  for (let i = HEADER_ROW_COUNT; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // A 欄為餐點名稱
      items.push({
        name: String(row[0]),
        price: Number(row[1])
      });
    }
  }
  return items;
}

/**
 * 取得訂單資料
 */
function getOrdersData(ss) {
  const HEADER_ROW_COUNT = 1;
  const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const orderMap = {};

  for (let i = HEADER_ROW_COUNT; i < data.length; i++) {
    const row = data[i];
    const orderTimestamp = row[0] instanceof Date ? row[0].toISOString() : String(row[0]);
    const fillerName = String(row[1]);
    const key = fillerName + '_' + orderTimestamp;
    if (!orderTimestamp) continue;

    if (!orderMap[key]) {
      orderMap[key] = {
        timestamp: orderTimestamp,
        filler_name: fillerName,
        total_price: Number(row[5]), // F 欄 (Index 5)
        items: [],
        items_summary_parts: []
      };
    }
    // 從每行重建 item
    if (row[2] && row[3] && row[4]) {
      const quantity = Number(row[3]);
      const subtotal = Number(row[4]);
      const price = subtotal / quantity;
      orderMap[key].items.push({
        id: 'item-' + i,
        meal: { name: String(row[2]), price: price },
        quantity: quantity,
        subtotal: subtotal
      });
      orderMap[key].items_summary_parts.push(String(row[2]) + " × " + String(row[3]));
    }
  }

  return Object.values(orderMap).map(function (o) {
    o.items_summary = o.items_summary_parts.join('\n');
    delete o.items_summary_parts;
    return o;
  });
}

/**
 * 處理 POST 請求 (提交、更新或刪除訂單)
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 新增截止時間檢查
    if (isPastDeadline(ss)) {
      return respond({ success: false, error: '操作已超過截止時間，無法進行修改。' });
    }

    const payload = JSON.parse(e.postData.contents);
    const filler_name = payload.filler_name;
    const timestamp = payload.timestamp; // 用於刪除舊記錄

    const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
    if (!sheet) return respond({ success: false, error: "OrdersSummary sheet not found" });

    // 1. 先刪除所有具有相同 filler_name 和 timestamp 的舊列 (如果是編輯更新或直接刪除)
    const HEADER_ROW_COUNT = 1;
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= HEADER_ROW_COUNT; i--) {
      const rowDate = new Date(data[i][0]);
      const payloadDate = new Date(timestamp);
      if (rowDate.getTime() === payloadDate.getTime() && String(data[i][1]) === filler_name) {
        sheet.deleteRow(i + 1);
      }
    }

    // 2. 如果 payload 中包含 delete: true，則直接結束 (已完成刪除)
    if (payload.delete === true) {
      return respond({ success: true, message: "Order deleted!" });
    }

    // 3. 逐行寫入新資料 (提交或更新)
    const items = payload.items;
    const grand_total = payload.total_price;
    const now = new Date();
    now.setMilliseconds(0); // 捨去毫秒，與試算表精度對齊
    const responseTimestamp = now.toISOString();

    // 欄位: A:時間, B:姓名, C:餐點, D:數量, E:小計, F:總計
    items.forEach(function (item) {
      sheet.appendRow([
        now, // 直接寫入 Date 物件，讓 Google Sheets 處理顯示，讀取時則會拿到 Date 物件
        filler_name,
        item.meal.name,
        item.quantity,
        item.subtotal,
        grand_total
      ]);
    });

    return respond({ success: true, message: "OK", timestamp: responseTimestamp });
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

/**
 * 檢查是否超過截止時間 (採用 Date 物件比對，避免字串格式問題)
 */
function isPastDeadline(ss) {
  try {
    const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) return false;

    const data = sheet.getRange("A:B").getValues();
    let rawDeadline = null;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).indexOf('截止時間') !== -1) {
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
      // 如果年份太早 (Google Sheets 預設 1899)，代表使用者只填了時間，我們將其設為「今天」的時間
      if (deadline.getFullYear() < 1900) {
        const timeDate = deadline;
        deadline = new Date(now.getTime());
        deadline.setHours(timeDate.getHours(), timeDate.getMinutes(), timeDate.getSeconds(), 0);
      }
    } else {
      // 備援方案：如果是字串，試著解析（例如手動輸入的 18:00:00）
      deadline = new Date(rawDeadline);
      if (isNaN(deadline.getTime())) {
        // 如果還是無法解析，可能包含「下午」等字眼，這裡做最後的字串容錯
        const timeStr = String(rawDeadline);
        const match = timeStr.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
        if (match) {
          deadline = new Date(now.getTime());
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const seconds = parseInt(match[3] || "0", 10);
          if (timeStr.indexOf('下午') !== -1 && hours < 12) hours += 12;
          if (timeStr.indexOf('上午') !== -1 && hours === 12) hours = 0;
          deadline.setHours(hours, minutes, seconds, 0);
        } else {
          return false; // 完全無法辨識
        }
      }
    }

    deadline.setMilliseconds(0);
    return now > deadline;

  } catch (e) {
    console.error("isPastDeadline Error: " + e.message);
    return false;
  }
}

/**
 * 處理 CORS 及回傳 JSON 格式的輔助函式
 */
function respond(responseObj) {
  // 將結果轉成 JSON 字串
  return ContentService.createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 OPTIONS 請求 (解決 CORS 預檢問題)
 */
function doOptions(e) {
  return respond({ success: true });
}
