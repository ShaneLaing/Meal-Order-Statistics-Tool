// backend/Code.js

// 部署為網路應用程式 (Deploy as Web App) 的設定：
// 1. 執行身分: 我 (Me)
// 2. 存取權限: 所有人 (Anyone)

const SPREADSHEET_ID = '1t_EUafkwqdeQRr6rpxHs1MLVeAzjmk58uFxMc5qEIuw'; // <-- 請將此替換為您的 Google 試算表 ID

// 定義試算表的工作表名稱
const MENU_SHEET_NAME = 'Menu';
const SUMMARY_SHEET_NAME = 'OrdersSummary';

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
    if (row[1]) { // B 欄為餐點名稱
      items.push({
        id: String(row[0]),
        name: String(row[1]),
        price: Number(row[2])
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
    const orderId = String(row[0]);
    if (!orderId) continue;

    if (!orderMap[orderId]) {
      orderMap[orderId] = {
        id: orderId,
        timestamp: row[1],
        filler_name: String(row[2]),
        total_price: Number(row[6]), // G 欄 (Index 6)
        items: [],
        items_summary_parts: []
      };
      // 嘗試解析原始 JSON
      if (row[7]) {
        try {
          orderMap[orderId].items = JSON.parse(String(row[7]));
        } catch (e) { }
      }
    }
    // 收集品項摘要 (D, E 欄位)
    if (row[3]) {
      orderMap[orderId].items_summary_parts.push(String(row[3]) + " × " + String(row[4]));
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
    const payload = JSON.parse(e.postData.contents);
    const order_id = payload.id;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SUMMARY_SHEET_NAME);
    if (!sheet) return respond({ success: false, error: "OrdersSummary sheet not found" });

    // 1. 先刪除所有具有相同 order_id 的舊列 (如果是編輯更新或直接刪除)
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === String(order_id)) {
        sheet.deleteRow(i + 1);
      }
    }

    // 2. 如果 payload 中包含 delete: true，則直接結束 (已完成刪除)
    if (payload.delete === true) {
      return respond({ success: true, message: "Order deleted!" });
    }

    // 3. 逐行寫入新資料 (提交或更新)
    const filler_name = payload.filler_name;
    const items = payload.items;
    const grand_total = payload.total_price;
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    const rawItemsJson = JSON.stringify(items);

    // 欄位: A:ID, B:時間, C:姓名, D:餐點, E:數量, F:小計, G:總計, H:RawJSON
    items.forEach(function (item) {
      sheet.appendRow([
        order_id,
        timestamp,
        filler_name,
        item.meal.name,
        item.quantity,
        item.subtotal,
        grand_total,
        rawItemsJson
      ]);
    });

    return respond({ success: true, message: "OK" });
  } catch (err) {
    return respond({ success: false, error: err.message });
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
