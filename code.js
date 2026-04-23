/**
 * ✅ FIXED: CSP (Content Security Policy) Configuration
 * แก้ไขปัญหา "frame-ancestors 'self'" violation
 */

/**
 * doPost — รับ request จาก GitHub Pages (fetch API)
 * Body: { action: 'functionName', args: [...] }
 */
// _handleApiPost — จัดการ API call จาก GitHub Pages (POST body: {action, args})
// ใช้ string-based lookup (this[action]) แทน direct reference — ไม่มี ReferenceError
function _handleApiPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;
    var args    = payload.args || [];

    // Allowlist — เหมือน doGet เพื่อความปลอดภัย
    var allowedActions = [
      'getWarehouseAnalyticsData','getSpaceAnalysisData','getPlanByDate',
      'saveCalculationToNewSheet','calculatePrintTagList','savePrintTagLog',
      'getAllProductsForDropdown','autoLogInventoryDaily','getFGCycleData',
      'updateFGCycleRow','updateSemiCycleRow','getFGProductList',
      'getFGDashboardSummary','getFGRecheckList',
      'getPolicyCheckData','getStockInsight',
      'getSemiDashboardSummary','getSemiRecheckList',
      'saveSemiMovementAndGetMaster','getSemiCycleData',
      'getSemiMasterList','getProductionVerifyData',
      'getSafetyStockData','saveSafetyStockData',
      'saveFGCycleCount','saveSemiCycleCount',
      'importInventoryData','uploadOverdueData',
      'getInventoryCompareData','getCycleCountItems',
      'getLogisticMasterData','clearLogiMasterCache','calcRouteDistance','saveLogisticPlan','saveBatchLogisticPlans','getReadyToShipOrders','getAutoplanBundle',
      'getLogisticPlans','getLogisticPlanById','deleteLogisticPlan','getPlannedShopIdsByDateRange',
      'getLogisticPlanSummary','getPreShipmentData','getPreShipmentProductList',
      'saveDriverActivityRow','saveDriverActivityRows','getDriverActivityLog',
      'deleteDriverActivityRow','updateDriverActivityRows','saveGpsActivityRow',
      'saveGpsActivityRows','getGpsActivityLog','deleteGpsActivityRow',
      'saveDriverEventRow','saveDriverEventRows','deleteDriverEventRow',
      'updateDriverEventRow','getDriverEventLog',
      'getStaffEventLog','saveStaffEventRow',
      'saveStaffEventRows','updateStaffEventFixed','deleteStaffEventRow',
      'saveWHActivityRows','getWHActivityLog',
      'saveKPIResult','getKpiWHLGData','getKpiWHLGHistory','saveKpiWHLG',
      'saveAuditLog','getAuditLog',
      'getSKUCountHistory','saveReCheckLog','saveReCheckLogBulk',
      'setupInventorySheets',
      'getTagSystemStartDate','setTagSystemStartDate'
    ];

    if (allowedActions.indexOf(action) === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, message: 'Unknown action: ' + action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var fn = this[action];
    if (typeof fn !== 'function') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, message: action + ' is not defined in this deployment' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var result = fn.apply(null, args);
    return ContentService
      .createTextOutput(JSON.stringify(result !== undefined ? result : { success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

const SPREADSHEET_ID = '1uLXHWv6_jTb1wnaIzq652gn2gH0Odiw2KOlB8DyY2Us';
const PLAN_SHEET_NAME = 'Sheet Plan'; 
const HOLIDAY_SHEET_NAME = 'Holiday-TST';
const HISTORY_SHEET_NAME = 'History_Log';
const PRODUCTION_FG_SHEET = 'Production FG';
const TRANSECTION_SHEET = 'Transection';
const INVENTORY_FG_SHEET = 'Inventory FG';
const INVENTORY_DAILY_LOG_SHEET = 'Inventory_Log_Daily';
const PRINT_TAG_LOG_SHEET = 'Print Tag Log';
const FG_REPORT_SHEET     = 'FG report';      // ยอดผลิตจริงสะสม (ใช้ใน Print Tag FG)
const INVENTORY_BLOCKING_LOG_SHEET = 'Inventory_Blocking_Log';
const DAILY_CYCLE_COUNT_FG_SHEET_NAME = 'Daily Cycle Count FG';
const RECHECK_LOG_SHEET  = 'ReCheck_Log';
const ROOT_CAUSE_SHEET   = 'RootCause_Log';
const AUDIT_LOG_SHEET   = 'Audit_Log';
const AUDIT_LOG_HEADERS = ['Timestamp','User','Module','Action','Detail','Status'];

// ══════════════════════════════════════════════════════════════════════
// AUDIT LOG — บันทึก + ดึงประวัติการแก้ไขข้อมูล
// ══════════════════════════════════════════════════════════════════════

/**
 * saveAuditLog — บันทึก 1 รายการ action ลง Sheet "Audit_Log"
 * @param {string} module   — ชื่อ Module เช่น 'FG Cycle Count', 'Logistic'
 * @param {string} action   — ประเภท: 'SAVE' | 'DELETE' | 'IMPORT'
 * @param {string} detail   — รายละเอียดเพิ่มเติม
 * @param {string} status   — 'success' | 'error' (default: 'success')
 */
function saveAuditLog(module, action, detail, status) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(AUDIT_LOG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(AUDIT_LOG_SHEET);
      sheet.appendRow(AUDIT_LOG_HEADERS);
      // จัด style header row
      var hRange = sheet.getRange(1, 1, 1, AUDIT_LOG_HEADERS.length);
      hRange.setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
      sheet.setFrozenRows(1);
    }
    var ts   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var user = '';
    try { user = Session.getActiveUser().getEmail() || 'unknown'; } catch(e) { user = 'unknown'; }
    sheet.appendRow([ts, user, String(module || ''), String(action || ''), String(detail || ''), String(status || 'success')]);
    return { success: true };
  } catch(err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * getAuditLog — ดึงประวัติล่าสุด N รายการ (เรียงจากใหม่ → เก่า)
 * @param {number} limitRows — จำนวน rows สูงสุดที่ดึง (default 200)
 */
function getAuditLog(limitRows) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(AUDIT_LOG_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };
    var limit   = parseInt(limitRows) || 200;
    var allData = sheet.getDataRange().getValues();
    var headers = allData[0];   // ['Timestamp','User','Module','Action','Detail','Status']
    var rows    = allData.slice(1).reverse().slice(0, limit); // ล่าสุดขึ้นก่อน
    var result  = rows.map(function(r) {
      var obj = {};
      headers.forEach(function(h, i) { obj[String(h)] = r[i]; });
      return obj;
    });
    return { success: true, data: result };
  } catch(err) {
    return { success: false, message: err.toString() };
  }
}

// ── ป้องกัน Formula Injection ─────────────────────────────────────────
// ข้อมูล string ที่ขึ้นต้นด้วย = + - @ จะถูก prefix ด้วย apostrophe
// เพื่อป้องกัน Google Sheets/Excel รัน formula โดยไม่ตั้งใจ
function _sanitizeSheet(value) {
  if (value === null || value === undefined) return '';
  var str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
  return str;
}

/**
 * ✅ FIXED: doGet() with proper X-Frame-Options configuration
 */
function doGet(e) {
  try {
    // ── API mode: เรียกจาก GitHub Pages ──────────────────────────────
    if (e && e.parameter && e.parameter.action) {
      var action   = e.parameter.action;
      var callback = e.parameter.callback || '';

      // helper — คืน JSONP หรือ JSON เสมอ ไม่ว่าจะ error ที่ไหน
      function _respond(obj) {
        var json = JSON.stringify(obj);
        var body = callback ? callback + '(' + json + ')' : json;
        var mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
        return ContentService.createTextOutput(body).setMimeType(mime);
      }

      try {
        var args = JSON.parse(e.parameter.args || '[]');

        // ใช้ string lookup แทน direct reference เพื่อหลีกเลี่ยง ReferenceError ตอน build fnMap
        var fnNames = [
          'getWarehouseAnalyticsData','getSpaceAnalysisData','getPlanByDate',
          'saveCalculationToNewSheet','calculatePrintTagList','savePrintTagLog',
          'getAllProductsForDropdown','autoLogInventoryDaily','getFGCycleData',
          'updateFGCycleRow','updateSemiCycleRow','getFGProductList',
          'getFGDashboardSummary','getFGRecheckList',
          'getPolicyCheckData','getStockInsight',
          'getSemiDashboardSummary','getSemiRecheckList',
          'saveSemiMovementAndGetMaster','getSemiCycleData',
          'getSemiMasterList','getProductionVerifyData',
          'getSafetyStockData','saveSafetyStockData',
          'saveFGCycleCount','saveSemiCycleCount',
          'importInventoryData','uploadOverdueData',
          'getInventoryCompareData','getCycleCountItems','getLatestCycleDate',
          'getLogisticMasterData','clearLogiMasterCache','calcRouteDistance','saveLogisticPlan','saveBatchLogisticPlans','getReadyToShipOrders','getAutoplanBundle',
          'getLogisticPlans','getLogisticPlanById','deleteLogisticPlan','getPlannedShopIdsByDateRange',
          'getLogisticPlanSummary','getPreShipmentData','getPreShipmentProductList',
          'saveDriverActivityRow','saveDriverActivityRows','getDriverActivityLog',
          'deleteDriverActivityRow','updateDriverActivityRows','saveGpsActivityRow',
          'saveGpsActivityRows','getGpsActivityLog','deleteGpsActivityRow',
          'saveDriverEventRow','saveDriverEventRows','deleteDriverEventRow',
          'updateDriverEventRow','getDriverEventLog',
          'getStaffEventLog','saveStaffEventRow',
          'saveStaffEventRows','updateStaffEventFixed','deleteStaffEventRow',
          'saveWHActivityRows','getWHActivityLog',
          'saveKPIResult','getKpiWHLGData','getKpiWHLGHistory','saveKpiWHLG',
          'saveAuditLog','getAuditLog',
          'getSKUCountHistory','saveReCheckLog','saveReCheckLogBulk',
          'setupInventorySheets',
          'getTagSystemStartDate','setTagSystemStartDate'
        ];

        if (fnNames.indexOf(action) === -1) {
          return _respond({ success: false, message: 'Unknown action: ' + action });
        }

        // eval-safe: เรียก global function ด้วยชื่อ
        var fn = this[action];
        if (typeof fn !== 'function') {
          return _respond({ success: false, message: action + ' is not defined in this deployment' });
        }

        var result = fn.apply(null, args);
        return _respond(result !== undefined ? result : { success: true });

      } catch (apiErr) {
        return _respond({ success: false, message: apiErr.toString() });
      }
    }

    // ── HTML mode: เปิดจาก GAS โดยตรง ────────────────────────────────
    const html = HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('TST Warehouse Management System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html;
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return HtmlService.createHtmlOutput(
      '<div style="padding: 40px; font-family: sans-serif;">' +
      '<h1 style="color: #dc2626;">❌ Error Loading Application</h1>' +
      '<p style="color: #64748b;">' + error.message + '</p>' +
      '<p style="color: #64748b; font-size: 12px;">Please contact system administrator.</p>' +
      '</div>'
    );
  }
}

/**
 * ✅ NEW: Include HTML files
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ⚡ Cache Helper — ใช้ CacheService เพื่อลดการอ่าน Sheet ซ้ำ
 * key       : string unique ต่อฟังก์ชัน (รวม param ถ้ามี)
 * ttlSeconds: อายุ cache (วินาที)
 * fn        : function ที่คืนข้อมูลจริง (เรียกเมื่อ cache miss)
 */
function _withCache(key, ttlSeconds, fn) {
  try {
    var cache = CacheService.getScriptCache();
    var hit = cache.get(key);
    if (hit !== null) {
      try { return JSON.parse(hit); } catch (e) {}
    }
  } catch (e) {}
  var result = fn();
  try {
    var serialized = JSON.stringify(result);
    // CacheService รองรับสูงสุด 100 KB ต่อ entry
    // ไม่ cache ผลที่ success: false เพื่อกันปัญหา error ค้างใน cache
    if (serialized && serialized.length < 90000 && !(result && result.success === false)) {
      CacheService.getScriptCache().put(key, serialized, ttlSeconds);
    }
  } catch (e) {}
  return result;
}

// ============================================
// 📝 วิธีแก้ปัญหา CSP (Content Security Policy)
// ============================================

/*
 * ปัญหา: "frame-ancestors 'self'" violation
 * 
 * สาเหตุ:
 * - Google Cloud Run มี CSP policy ที่เข้มงวด
 * - ไม่อนุญาตให้แสดงผลใน iframe จากภายนอก
 * 
 * วิธีแก้:
 * 
 * 1. ✅ ใช้ ALLOWALL (ทำแล้วในโค้ด)
 *    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
 * 
 * 2. ⚙️ ตั้งค่า Google Cloud Project (ถ้ายังมีปัญหา):
 *    a. เปิด Google Cloud Console
 *    b. ไปที่ Cloud Run service ของโปรเจค
 *    c. Edit > Environment Variables > เพิ่ม:
 *       Name: CLOUD_RUN_CSP
 *       Value: frame-ancestors *
 * 
 * 3. 🔧 Deploy ใหม่:
 *    - Deploy > New deployment
 *    - เลือก "Execute as: User accessing the web app"
 *    - เลือก "Who has access: Anyone"
 * 
 * 4. 🌐 ใช้ Direct URL แทน iframe:
 *    - เปิดใน tab ใหม่แทนการใช้ iframe
 *    - window.open(url, '_blank')
 */

// ============================================
// เก็บส่วนอื่นๆ ของไฟล์เดิมไว้ด้านล่างนี้
// ============================================
/**
 * ดึงข้อมูลวันหยุดจาก Sheet
 */
function getHolidays() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(HOLIDAY_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return [];
    
    const data = sheet.getDataRange().getValues();
    const holidays = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] instanceof Date) {
        holidays.push(Utilities.formatDate(data[i][0], "GMT+7", "yyyy-MM-dd"));
      } else if (data[i][0]) {
        const d = parseDateValue(data[i][0]);
        holidays.push(Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd"));
      }
    }
    return holidays;
  } catch (e) {
    return [];
  }
}

/**
 * คำนวณ Normalized Capacity จากคอลัมน์ F
 */
function getNormalizedF(sumColF) {
  if (sumColF <= 7.5) return 7.5;
  if (sumColF <= 10) return 10;
  if (sumColF <= 11) return 11;  
  if (sumColF <= 13) return 13;
  return 23.5; 
}

/**
 * ฟังก์ชันเช็ควันทำงาน
 */
function isWorkDay(date, holidayList) {
  if (date.getDay() === 0) return false; // 0 = Sunday
  const formatted = Utilities.formatDate(date, "GMT+7", "yyyy-MM-dd");
  return !holidayList.includes(formatted);
}

/**
 * คำนวณวันเวลาที่คาดว่าจะเสร็จ (Finish Time)
 */
function calculateN(startDateStr, F_normal, totalUsedHrs) {
  try {
    if (totalUsedHrs <= 0) return null;

    const holidays = getHolidays();
    const [d, m, y] = startDateStr.split('/');
    let currentDate = new Date(y, m - 1, d, 8, 0, 0);
    if (isNaN(currentDate.getTime())) return null;
    let remainingHrs = totalUsedHrs;

    while (remainingHrs > F_normal) {
      if (isWorkDay(currentDate, holidays)) {
        remainingHrs -= F_normal;
      }
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }

    while (!isWorkDay(currentDate, holidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(8, 0, 0, 0);
    }

    let finishTime = new Date(currentDate);
    let addMinutes = remainingHrs * 60;

    if (remainingHrs > 4) {
      addMinutes += 60;
    }

    finishTime.setMinutes(finishTime.getMinutes() + Math.round(addMinutes));
    return finishTime;
  } catch (e) {
    Logger.log('❌ calculateN error: ' + e.message);
    return null;
  }
}
/**
 * ✅ บันทึกข้อมูลและจัดการแปลงค่าวันที่ (Physical Date) ให้เป็น Date Object
 */
function uploadOverdueData(dataArray) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Overdue Reservations');
    if (!sheet) sheet = ss.insertSheet('Overdue Reservations');
    
    sheet.clear(); 
    
    if (dataArray && dataArray.length > 0) {
      const processedData = dataArray.map((row, index) => {
        if (index === 0) return row; // Header

        // ตรวจสอบคอลัมน์ B (Index 1: Modified date) 
        // เพราะตามไฟล์ภาพ B คือวันที่ที่รวมเวลาไว้
        if (row[1]) {
          const d = new Date(row[1]);
          if (!isNaN(d.getTime())) {
            row[1] = d; 
          }
        }
        return row;
      });

      const sanitized = processedData.map((row, idx) =>
        idx === 0 ? row : row.map(cell => (cell instanceof Date ? cell : _sanitizeSheet(cell)))
      );
      sheet.getRange(1, 1, sanitized.length, sanitized[0].length).setValues(sanitized);
      const numDataRows = sheet.getLastRow() - 1;
      if (numDataRows > 0) sheet.getRange(2, 2, numDataRows, 1).setNumberFormat("dd/MM/yyyy HH:mm");
      
      return { success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว" };
    }
    return { success: false, message: "ไม่พบข้อมูลในไฟล์" };
  } catch (e) { return { success: false, message: e.toString() }; }
}
// ⚠️ REMOVED: getOverdueReservations() (no-param version) ถูกลบออก
// เพราะถูก override โดย getOverdueReservations(viewMode) ด้านล่าง (line ~1323)
// ใช้ version ใหม่ที่รองรับ viewMode = 'reserved' | 'onhand' แทน
/**
 * ฟังก์ชันช่วย: จัดรูปแบบวันที่
 */
function formatDate(date) {
  if (!date || date.getTime() === 0) return '-';
  return Utilities.formatDate(date, "GMT+7", "dd/MM/yyyy");
}

/**
 * ฟังก์ชันช่วย: แปลงค่าวันที่จากหลายรูปแบบ
 */
function parseDateValue(dateVal) {
  if (dateVal instanceof Date) return dateVal;
  if (!dateVal) return new Date(0);

  const strDate = String(dateVal).trim();

  // รูปแบบ 1: มี '/'
  if (strDate.includes('/')) {
    const datePart = strDate.split(' ')[0]; // ตัด time portion เช่น "3/31/2026 00:00" → "3/31/2026"
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      const p2 = parseInt(parts[2]);
      // กรณีชัดเจน M/D/YYYY: p0≤12 และ p1>12 → เดือน/วัน/ปี
      if (p0 <= 12 && p1 > 12) {
        return new Date(p2, p0 - 1, p1);
      }
      // กรณีชัดเจน D/M/YYYY: p0>12 และ p1≤12 → วัน/เดือน/ปี
      if (p0 > 12 && p1 <= 12) {
        return new Date(p2, p1 - 1, p0);
      }
      // กรณีกำกวม (ทั้ง p0≤12 และ p1≤12) → default เป็น D/M/YYYY (Thai format)
      // เช่น "01/05/2025" → วันที่ 1 เดือน 5 (พฤษภาคม) ไม่ใช่ 5 มกราคม
      return new Date(p2, p1 - 1, p0);
    }
  }

  // รูปแบบ 2: yyyy-MM-dd หรือ dd-MM-yyyy (GPS sheet ใช้ขีดกลาง)
  if (strDate.includes('-') && strDate.length === 10) {
    var dashParts = strDate.split('-');
    if (dashParts.length === 3) {
      if (dashParts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(parseInt(dashParts[0]), parseInt(dashParts[1]) - 1, parseInt(dashParts[2]));
      } else {
        // DD-MM-YYYY (เช่น 07-01-2026 จาก GPS_Activity_Log)
        return new Date(parseInt(dashParts[2]), parseInt(dashParts[1]) - 1, parseInt(dashParts[0]));
      }
    }
  }

  // รูปแบบ 3: yyyyMMdd
  if (!strDate.includes('/') && !strDate.includes('-') && strDate.length === 8) {
    const y = strDate.substring(0, 4);
    const m = strDate.substring(4, 6);
    const d = strDate.substring(6, 8);
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  // รูปแบบ 4: Timestamp
  const timestamp = Date.parse(strDate);
  return isNaN(timestamp) ? new Date(0) : new Date(timestamp);
}

// บังคับ parse M/D/YYYY เสมอ — ไม่ขึ้นกับ format ของ Google Sheet
// ใช้สำหรับ col I (Physical date) ใน Transection
function parseMDYDate(val) {
  if (val instanceof Date) return val; // GAS ส่ง Date object มาตรง → ใช้เลย
  const str = String(val || '').trim();
  if (!str) return new Date(0);
  if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/'); // ตัด time portion ถ้ามี
    if (parts.length === 3) {
      const m = parseInt(parts[0]); // เดือน
      const d = parseInt(parts[1]); // วัน
      const y = parseInt(parts[2]); // ปี
      if (!isNaN(m) && !isNaN(d) && !isNaN(y)) return new Date(y, m - 1, d);
    }
  }
  return parseDateValue(val); // fallback กรณีรูปแบบอื่น
}

// บังคับ parse D/M/YYYY เสมอ — สำหรับคอลัมน์ที่รู้แน่ว่าเป็น Thai format (วัน/เดือน/ปี)
function parseDMYDate(val) {
  if (val instanceof Date) return val;
  const str = String(val || '').trim();
  if (!str) return new Date(0);
  if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0]); // วัน
      const m = parseInt(parts[1]); // เดือน
      const y = parseInt(parts[2]); // ปี
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d);
    }
  }
  return parseDateValue(val); // fallback
}

function getProductMap() {
  return _withCache('productMap', 600, function() {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const productSheet = ss.getSheetByName('Product');
      if (!productSheet || productSheet.getLastRow() < 2) return {};
      const data = productSheet.getDataRange().getValues();
      const map = {};
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        map[String(data[i][0]).trim()] = {
          name: data[i][1] || 'Unknown',
          linesPerBundle: Number(data[i][2]) || 1,
          weight: Number(data[i][3]) || 0,
          remark: data[i][4] || '',
          pcsPerBundle: Number(data[i][2]) || 1
        };
      }
      return map;
    } catch (e) { return {}; }
  });
}

function getQCStandardMap() {
  return _withCache('qcStdMap', 600, function() {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('QC-Standard');
      if (!sheet || sheet.getLastRow() < 2) return {};
      const data = sheet.getDataRange().getValues();
      const map = {};
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        map[String(data[i][0]).trim()] = {
          productSize: data[i][1] || '',
          wStd: data[i][2] || '',
          wMinMax: data[i][3] || ''
        };
      }
      return map;
    } catch (e) { return {}; }
  });
}

function getPlanByDate(selectedDateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PLAN_SHEET_NAME);
    const productMap = getProductMap();
    const holidays = getHolidays();
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: "ไม่มีข้อมูลใน " + PLAN_SHEET_NAME };
    }

    const data = sheet.getDataRange().getValues();
    let rows = [];

    const targetDateClean = selectedDateStr.replace(/-/g, ""); 

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const rowDateRaw = String(row[0]).trim();

      if (rowDateRaw === targetDateClean) {
        const productId = String(row[4] || "").trim();
        const pInfo = productMap[productId] || { name: 'ไม่พบชื่อสินค้า', linesPerBundle: 1 };
        const plannedQtyLines = Number(row[13]) || 0;
        
        const pmTime = (Number(row[7]) || 0) + (Number(row[8]) || 0) + (Number(row[9]) || 0) + 
                       (Number(row[10]) || 0) + (Number(row[11]) || 0);

        rows.push({
          dateString: selectedDateStr.split('-').reverse().join('/'),
          machine: String(row[1] || "N/A").trim(),
          shift: String(row[2] || "-"),
          productId: productId,
          productName: pInfo.name,
          linesPerBundle: pInfo.linesPerBundle,
          prodTimeDay: Number(row[5]) || 0,
          prodTimeItem: Number(row[6]) || 0,
          pmTime: pmTime,
          speed: Number(row[12]) || 0,
          plannedQtyLines: plannedQtyLines,
          plannedQtyBundles: Math.ceil(plannedQtyLines / (pInfo.linesPerBundle || 1))
        });
      }
    }

    rows.sort((a, b) => a.machine.localeCompare(b.machine));

    return { 
      success: true,
      rows: rows, 
      holidays: holidays,
      sheetName: PLAN_SHEET_NAME + " (" + selectedDateStr + ")"
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

function saveCalculationToNewSheet(calculationData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(HISTORY_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(HISTORY_SHEET_NAME);
      const headers = ["บันทึกเมื่อ", "วันที่ผลิต", "เครื่อง", "กะ", "รหัสสินค้า", "ชื่อสินค้า", "มัดตามแผน", "มัดอื่นๆ", "รวมพื้นที่(เส้น)", "เวลาพื้นที่(ชม.)", "สถานะ", "เวลาเสร็จ"];
      sheet.appendRow(headers);
    }
    
    const now = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    const dataToSave = calculationData.map(r => [
      now, r.dateString, r.machine, r.shift, r.productId, r.productName,
      r.plannedBundles, r.otherBundles, r.totalLinesK, r.spaceHrsL, r.status, r.finishTime
    ]);
    
    const sanitized = dataToSave.map(row => row.map(cell => _sanitizeSheet(cell)));
    sheet.getRange(sheet.getLastRow() + 1, 1, sanitized.length, sanitized[0].length).setValues(sanitized);
    return { success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getPreviousWorkDay(selectedDateStr) {
  try {
    const holidays = getHolidays();
    const selected = new Date(selectedDateStr);
    if (isNaN(selected.getTime())) return { success: false, message: 'วันที่ไม่ถูกต้อง' };
    let prevDate = new Date(selected);
    prevDate.setDate(prevDate.getDate() - 1);

    while (prevDate.getDay() === 0 || holidays.includes(Utilities.formatDate(prevDate, "GMT+7", "yyyy-MM-dd"))) {
      prevDate.setDate(prevDate.getDate() - 1);
    }

    return Utilities.formatDate(prevDate, "GMT+7", "yyyy-MM-dd");
  } catch (e) {
    Logger.log('❌ getPreviousWorkDay error: ' + e.message);
    return { success: false, message: e.message };
  }
}
/**
 * ✅ เพิ่ม Logging ใน calculatePrintTagList()
 */
function calculatePrintTagList(selectedDateStr) {
  try {
    Logger.log("========================================");
    Logger.log("🚀 START calculatePrintTagList (Plan ONLY Mode)");
    Logger.log("  - Selected Date: " + selectedDateStr);
    
    const productMap = getProductMap();
    const qcMap = getQCStandardMap();
    const stdCMap = getStandardCMap();
    
    // 1. ดึงข้อมูลประกอบ (ยอดปริ้นเก่า, ยอดใช้จริง, ยอดบันทึกวันนี้)
    const printedBundlesExcludeToday = getPrintedQtyExcludeDate(selectedDateStr);
    const actualLinesExcludeToday = getActualLinesFromDynamic(selectedDateStr);
    const todayPrintedLog = getPrintedQtyFromLog(selectedDateStr);
    
    // 2. ดึงแผนวันนี้ (นี่คือพระเอกหลัก)
    const planLinesToday = getPlanLinesByDate(selectedDateStr);
    
    // ✅ แก้ไข: ใช้เฉพาะรายการที่มีในแผนวันนี้เท่านั้น (Plan Keys Only)
    // ไม่เอา ...Object.keys(printedBundlesExcludeToday) หรือ actualLinesExcludeToday มารวมแล้ว
    const planProductIds = Object.keys(planLinesToday);
    
    Logger.log("  - Plan Today Count: " + planProductIds.length + " SKU");
    
    if (planProductIds.length === 0) {
      Logger.log("⚠️ ไม่พบสินค้าในแผนการผลิตของวันที่เลือก");
      return { success: false, message: "ไม่พบสินค้าในแผนการผลิต (Sheet Plan) สำหรับวันที่นี้" };
    }
    
    const result = [];
    
    planProductIds.forEach(id => {
      const pInfo = productMap[id] || { name: 'Unknown', linesPerBundle: 1, pcsPerBundle: 1 };
      const linesPerBundle = pInfo.linesPerBundle || 1;
      
      // ดึงข้อมูลประกอบของสินค้านั้นๆ (ถ้าไม่มีให้เป็น 0)
      const printedExcludeTodayBundles = printedBundlesExcludeToday[id] || 0;
      const actualExcludeTodayLines = actualLinesExcludeToday[id] || 0;
      const actualExcludeTodayBundles = Math.ceil(actualExcludeTodayLines / linesPerBundle);
      
      const planTodayLines = planLinesToday[id] || 0;
      const planTodayBundles = Math.ceil(planTodayLines / linesPerBundle);
      
      // คำนวณยอดที่ต้องพิมพ์
      const calculation = printedExcludeTodayBundles - actualExcludeTodayBundles - planTodayBundles;
      let finalNeedToPrint = calculation < 0 ? Math.abs(calculation) : 0;
      
      const savedBundlesToday = todayPrintedLog[id] || 0;
      
      // เงื่อนไข: เนื่องจากเรา Loop ตามแผนอยู่แล้ว ก็ให้ Push ลงตารางได้เลย
      // แต่เช็คกันเหนียวนิดนึงว่าแผนต้องมากกว่า 0 (ซึ่งปกติควรจะใช่ ถ้ามาจาก getPlanLinesByDate)
      if (planTodayBundles > 0) {
        let qc = id.startsWith('0C') ? (stdCMap[id] || {}) : (qcMap[id] || {});
        
        result.push({
          productId: id,
          productName: pInfo.name,
          productSize: qc.productSize || '-',
          wStd: qc.wStd || '-',
          wMinMax: qc.wMinMax || '-',
          linesPerBundle: linesPerBundle,
          pcsPerBundle: pInfo.pcsPerBundle,
          
          printedExcludeToday: printedExcludeTodayBundles,
          usedExcludeToday: actualExcludeTodayBundles,
          planToday: planTodayBundles,
          needToPrintBundles: finalNeedToPrint,
          savedBundlesToday: savedBundlesToday
        });
      }
    });
    
    Logger.log("🎯 RESULT: " + result.length + " items (Filtered by Plan)");
    
    // เรียงลำดับตามชื่อสินค้าหรือ SKU ตามต้องการ
    result.sort((a, b) => a.productId.localeCompare(b.productId));
    
    return { success: true, items: result, selectedDate: selectedDateStr };
    
  } catch (e) {
    Logger.log("❌ ERROR: " + e.message);
    return { success: false, message: e.toString() };
  }
}
/**
 * ✅ แก้ไข getPrintedQtyExcludeDate() - เพิ่ม Logging
 */
function getPrintedQtyExcludeDate(excludeDateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRINT_TAG_LOG_SHEET);
    if (!sheet || sheet.getLastRow() < 2) {
      Logger.log("⚠️ Print Tag Log Sheet ว่างเปล่า");
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    const result = {};
    const excludeDate = new Date(excludeDateStr);
    excludeDate.setHours(0, 0, 0, 0);
    const startDateStr2 = getTagSystemStartDate().date;
    const startDate2 = new Date(startDateStr2);
    startDate2.setHours(0, 0, 0, 0);

    Logger.log("🔍 Debug getPrintedQtyExcludeDate:");
    Logger.log("  - Start Date: " + startDateStr2);
    Logger.log("  - Exclude Date: " + excludeDate.toISOString());

    for (let i = 1; i < data.length; i++) {
      const logDate = parseDateValue(data[i][1]);
      if (!logDate) continue;
      logDate.setHours(0, 0, 0, 0);

      if (logDate >= startDate2 && logDate < excludeDate) {
        const pid = String(data[i][2] || "").trim();
        const bundles = Number(data[i][3]) || 0;
        result[pid] = (result[pid] || 0) + bundles;
        
        Logger.log(`  - Row ${i}: ${pid} = ${bundles} มัด (Date: ${logDate.toISOString()})`);
      }
    }
    
    Logger.log("  - Total SKU Found: " + Object.keys(result).length);
    return result;
  } catch (e) { 
    Logger.log("❌ Error getPrintedQtyExcludeDate: " + e.message);
    return {}; 
  }
}
/**
 * ดึงยอดเส้นที่ผลิตจริงสะสม จากชีต 'FG report'
 * โครงสร้างชีต:
 *   Col A (index 0): Date (yyyyMMdd เช่น 20260302)
 *   Col B (index 1): Item Number (SKU)
 *   Col C (index 2): Product Name
 *   Col D (index 3): A = จำนวนเส้นผลิตจริง
 *   Col E (index 4): Hold
 * เงื่อนไข: รวมเฉพาะแถวที่วันที่ >= วันเริ่มระบบ (13/01/2026) AND < วันที่เลือก
 */
function getActualLinesExcludeDate(excludeDateStr) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(FG_REPORT_SHEET);

    if (!sheet || sheet.getLastRow() < 2) {
      Logger.log("⚠️ FG report Sheet ว่างเปล่า หรือชีตไม่เจอ (ชีตที่หา: '" + FG_REPORT_SHEET + "')");
      return {};
    }

    const data   = sheet.getDataRange().getValues();
    const result = {};

    Logger.log("📋 FG report Header: " + JSON.stringify(data[0]));
    if (data.length > 1) Logger.log("📋 FG report Row 1 sample: " + JSON.stringify(data[1]));

    // วันที่เลือก (ไม่รวมวันนี้)
    const excludeDate = new Date(excludeDateStr);
    excludeDate.setHours(0, 0, 0, 0);

    // วันเริ่มระบบ 13/01/2026
    const systemStartDate = new Date(2026, 0, 13);
    systemStartDate.setHours(0, 0, 0, 0);

    Logger.log("🔍 FG report Actual Usage Range:");
    Logger.log("  - Start (>=): " + systemStartDate.toISOString().split('T')[0]);
    Logger.log("  - Stop  (<) : " + excludeDate.toISOString().split('T')[0]);

    for (let i = 1; i < data.length; i++) {
      const rowDate = parseDateValue(data[i][0]); // Col A: Date (yyyyMMdd)
      if (!rowDate) continue;
      rowDate.setHours(0, 0, 0, 0);

      const isAfterSystemStart = rowDate.getTime() >= systemStartDate.getTime();
      const isBeforeExclude    = rowDate.getTime() <  excludeDate.getTime();
      if (!isAfterSystemStart || !isBeforeExclude) continue;

      const sku  = String(data[i][1] || '').trim(); // Col B: Item Number
      const qty  = Number(data[i][3]) || 0;          // Col D: A (จำนวนเส้นผลิตจริง)
      if (sku && qty > 0) result[sku] = (result[sku] || 0) + qty;
    }

    Logger.log("  - Total SKU Found: " + Object.keys(result).length);
    return result;

  } catch (e) {
    Logger.log("❌ Error getActualLinesExcludeDate: " + e.message);
    return {};
  }
}
// ── Tag System Start Date (PropertiesService) ─────────────────────────────────
function getTagSystemStartDate() {
  try {
    const stored = PropertiesService.getScriptProperties().getProperty('TAG_SYSTEM_START_DATE');
    return { success: true, date: stored || '2026-04-20' };
  } catch (e) {
    return { success: true, date: '2026-04-20' };
  }
}
function setTagSystemStartDate(payload) {
  try {
    const dateStr = String(payload.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น yyyy-MM-dd)' };
    PropertiesService.getScriptProperties().setProperty('TAG_SYSTEM_START_DATE', dateStr);
    return { success: true, message: 'บันทึกวันเริ่มต้นสำเร็จ: ' + dateStr };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ── ดึงยอดใช้จริง (Production) จาก DynamicTransaction ────────────────────────
// excludeDateStr = วันที่เลือก → รวมเฉพาะแถวที่วันที่ < excludeDate
// Col G (6) = type, Col E (4) = SKU, Col T (19) = date (D/M/YYYY), Col H (7) = เส้น
function getActualLinesFromDynamic(excludeDateStr) {
  try {
    const dynamicSS  = SpreadsheetApp.openById('1YMwI8sbtInCBWVEYr877GrgkoYcmLe83T0z884Xx7sQ');
    const transSheet = dynamicSS.getSheetByName('DynamicTransaction');
    if (!transSheet || transSheet.getLastRow() < 2) return {};

    const excludeDate = new Date(excludeDateStr);
    excludeDate.setHours(0, 0, 0, 0);

    // วันเริ่มต้นจาก PropertiesService
    const startDateStr = getTagSystemStartDate().date;
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    Logger.log('📅 getActualLinesFromDynamic startDate: ' + startDateStr);

    const lastRow  = transSheet.getLastRow();
    const readFrom = Math.max(2, lastRow - 15000);
    const data     = transSheet.getRange(readFrom, 1, lastRow - readFrom + 1, 20).getValues();

    const result = {};
    for (let i = 0; i < data.length; i++) {
      const type = String(data[i][6] || '').trim(); // Col G = type
      if (type !== 'Production') continue;

      const sku = String(data[i][4] || '').trim();  // Col E = Item Number
      if (!sku) continue;

      // Col T (index 19) = date D/M/YYYY — parse เหมือน Analytics
      const tRaw = data[i][19];
      let rowDateObj;
      const tStr = (tRaw instanceof Date)
        ? Utilities.formatDate(tRaw, 'GMT+7', 'dd/MM/yyyy')
        : String(tRaw || '').trim().split(' ')[0];
      const tp = tStr.split('/');
      if (tp.length === 3) {
        const d = parseInt(tp[0]), m = parseInt(tp[1]), y = parseInt(tp[2]);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) rowDateObj = new Date(y, m - 1, d);
      }
      if (!rowDateObj) rowDateObj = parseDateValue(tRaw);
      if (!rowDateObj) continue;

      rowDateObj.setHours(0, 0, 0, 0);
      if (rowDateObj.getTime() <  startDate.getTime())   continue; // ก่อนวันเริ่มต้น
      if (rowDateObj.getTime() >= excludeDate.getTime()) continue; // ไม่รวมวันที่เลือก

      const lines = parseFloat(data[i][7]) || 0; // Col H = CW quantity (เส้น)
      if (lines > 0) result[sku] = (result[sku] || 0) + lines;
    }

    Logger.log('✅ getActualLinesFromDynamic: found ' + Object.keys(result).length + ' SKUs');
    return result;

  } catch (e) {
    Logger.log('❌ getActualLinesFromDynamic: ' + e.message);
    return {};
  }
}

function getPrintedQtyCumulative(untilDateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRINT_TAG_LOG_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return {};
    
    const data = sheet.getDataRange().getValues();
    const result = {};
    const untilDate = new Date(untilDateStr);
    
    for (let i = 1; i < data.length; i++) {
      const logDate = parseDateValue(data[i][1]); 
      if (logDate <= untilDate) {
        const pid = String(data[i][2] || "").trim(); 
        const bundles = Number(data[i][3]) || 0;     
        result[pid] = (result[pid] || 0) + bundles;
      }
    }
    return result;
  } catch (e) { 
    return {}; 
  }
}

function getActualLinesCumulative(untilDateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRODUCTION_FG_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return {};
    
    const data = sheet.getDataRange().getValues();
    const result = {};
    const untilDate = new Date(untilDateStr);
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = parseDateValue(data[i][0]);
      if (rowDate <= untilDate) {
        const pid = String(data[i][1] || "").trim();
        const lines = Number(data[i][4]) || 0;      
        result[pid] = (result[pid] || 0) + lines;
      }
    }
    return result;
  } catch (e) {
    return {};
  }
}
/**
 * ✅ แก้ไข getPlanLinesByDate() - เพิ่ม Logging และรองรับ Date Format
 */
function getPlanLinesByDate(dateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PLAN_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) {
      Logger.log("⚠️ Sheet Plan ว่างเปล่า");
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    const result = {};
    
    // 🔧 แปลง yyyy-MM-dd → yyyyMMdd
    const targetDateNum = dateStr.replace(/-/g, "");
    
    Logger.log("🔍 Debug getPlanLinesByDate:");
    Logger.log("  - Input Date: " + dateStr);
    Logger.log("  - Target Format: " + targetDateNum);

    for (let i = 1; i < data.length; i++) {
      const rowDateRaw = String(data[i][0]).trim();
      
      if (rowDateRaw === targetDateNum) {
        const pid = String(data[i][4] || "").trim();
        const lines = Number(data[i][13]) || 0;
        result[pid] = (result[pid] || 0) + lines;
        
        Logger.log(`  - Row ${i}: ${pid} = ${lines} เส้น`);
      }
    }
    
    Logger.log("  - Total SKU Found: " + Object.keys(result).length);
    return result;
  } catch (e) {
    Logger.log("❌ Error getPlanLinesByDate: " + e.message);
    return {};
  }
}
/**
 * ✅ ฟังก์ชันเดิม: เช็คว่าวันนี้บันทึกไปแล้วหรือยัง (ไม่ต้องแก้)
 */
function getPrintedQtyFromLog(dateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRINT_TAG_LOG_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return {};
    
    const data = sheet.getDataRange().getValues();
    const result = {};
    
    for (let i = 1; i < data.length; i++) {
      const logDate = Utilities.formatDate(parseDateValue(data[i][1]), "GMT+7", "yyyy-MM-dd");
      if (logDate === dateStr) {
        const pid = String(data[i][2] || "").trim();
        const bundles = Number(data[i][3]) || 0;
        result[pid] = (result[pid] || 0) + bundles;
      }
    }
    return result;
  } catch (e) { 
    return {}; 
  }
}
function savePrintTagLog(printData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(PRINT_TAG_LOG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(PRINT_TAG_LOG_SHEET);
      sheet.appendRow(["Timestamp", "PrintDate", "SKU", "Bundles", "User", "TotalPcs"]);
    }
    const pMap = getProductMap();
    const pcsPer = pMap[printData.productId] ? pMap[printData.productId].pcsPerBundle : 40;
    sheet.appendRow([
      new Date(),
      _sanitizeSheet(printData.productionDate),
      _sanitizeSheet(printData.productId),
      Number(printData.bundles) || 0,
      Session.getActiveUser().getEmail(),
      (Number(printData.bundles) || 0) * pcsPer
    ]);
    return { success: true, message: "บันทึกเรียบร้อย" };
  } catch (e) { return { success: false, message: e.message }; }
}

function getStandardCMap() {
  return _withCache('stdCMap', 600, function() {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('Standard-C');
      if (!sheet || sheet.getLastRow() < 2) return {};
      const data = sheet.getDataRange().getValues();
      const map = {};
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        map[String(data[i][0]).trim()] = {
          productSize: data[i][1] || '',
          wStd: data[i][2] || '',
          wMinMax: data[i][3] || ''
        };
      }
      return map;
    } catch (e) { return {}; }
  });
}
/**
 * ✅ ฟังก์ชันหลักดึงข้อมูล Analytics ครบวงจร (รวม Blocking Trend)
 */
function getWarehouseAnalyticsData(startDate, endDate) {
  return _withCache('whAnalytics_' + startDate + '_' + endDate, 300, function() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // --- 1. ดึงข้อมูล Warehouse Flow (Inbound / Outbound) จาก DynamicTransaction ---
    const dynamicSS = SpreadsheetApp.openById('1YMwI8sbtInCBWVEYr877GrgkoYcmLe83T0z884Xx7sQ');
    const transSheet = dynamicSS.getSheetByName('DynamicTransaction');
    const dailyData = {};
    const dailyOwnDelivery = {}; // จัดส่งเอง (อยู่ใน Logistic_Plan)
    const dailyPickup = {};      // รถต่างจังหวัดมารับ (ไม่อยู่ใน Logistic_Plan)

    // สร้างโครงสร้างข้อมูลรายวันตามช่วงวันที่เลือก
    let tempDate = new Date(start);
    while (tempDate <= end) {
      const dStr = Utilities.formatDate(tempDate, "GMT+7", "yyyy-MM-dd");
      dailyData[dStr] = { in: 0, out: 0 };
      dailyOwnDelivery[dStr] = 0;
      dailyPickup[dStr] = 0;
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // --- อ่าน Logistic_Plan เพื่อดึงชื่อลูกค้าที่จัดส่งเอง (ต่อวัน) ---
    // Col B (index 1) = วันที่, Col G (index 6) = ชื่อร้านค้า
    const logiCustomersByDate = {}; // { 'yyyy-MM-dd': [shopName_lowercase, ...] }
    const logiPlanSheet = ss.getSheetByName('Logistic_Plan');
    if (logiPlanSheet && logiPlanSheet.getLastRow() >= 2) {
      const logiData = logiPlanSheet.getDataRange().getValues();
      for (let i = 1; i < logiData.length; i++) {
        const logiDateObj = parseDateValue(logiData[i][1]);
        if (!logiDateObj || logiDateObj < start || logiDateObj > end) continue;
        const logiStatus = String(logiData[i][11] || '').trim().toLowerCase(); // col L = สถานะ
        if (logiStatus !== 'success') continue;
        const shopName = String(logiData[i][6] || '').trim();
        if (!shopName) continue;
        const dStr = Utilities.formatDate(logiDateObj, 'GMT+7', 'yyyy-MM-dd');
        if (!logiCustomersByDate[dStr]) logiCustomersByDate[dStr] = [];
        const lc = shopName.toLowerCase();
        if (logiCustomersByDate[dStr].indexOf(lc) < 0) logiCustomersByDate[dStr].push(lc);
      }
    }

    let inWeight = 0, outWeight = 0, inLines = 0, outLines = 0;
    let ownDeliveryWeight = 0, ownDeliveryLines = 0;
    let pickupWeight = 0, pickupLines = 0;

    if (transSheet) {
      const lastRow = transSheet.getLastRow();
      const readFrom = Math.max(2, lastRow - 15000); // อ่านแค่ 15,000 แถวล่าสุด ป้องกัน Timeout
      const transData = transSheet.getRange(readFrom, 1, lastRow - readFrom + 1, 20).getValues();
      for (let i = 1; i < transData.length; i++) {
        const type = String(transData[i][6] || "").trim(); // Col G = Reference

        // Production → Col B (index 1) = Physical date
        // Sales order → Col T (index 19) = ST PD Date, กรองเฉพาะ Issue = "Sold"
        let rowDateObj;
        if (type === "Production") {
          // Col T = D/M/YYYY — บังคับ parse เป็น text ก่อน ไม่สนใจ format ของ Sheet
          const tRaw = transData[i][19];
          const tStr = (tRaw instanceof Date)
            ? Utilities.formatDate(tRaw, "GMT+7", "dd/MM/yyyy")
            : String(tRaw || '').trim().split(' ')[0]; // ตัด time portion
          const tp = tStr.split('/');
          if (tp.length === 3) {
            const d = parseInt(tp[0]), m = parseInt(tp[1]), y = parseInt(tp[2]);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) rowDateObj = new Date(y, m - 1, d);
          }
          if (!rowDateObj) rowDateObj = parseDateValue(tRaw); // fallback
        } else if (type === "Sales order") {
          const issue = String(transData[i][12] || "").trim(); // Col M = Issue
          if (issue !== "Sold") continue;
          // Col B = M/D/YYYY จาก ERP
          // เลขกลาง ≤ 12 → Sheet auto-convert เป็น Date object (D/M) → ต้อง swap
          // เลขกลาง > 12 → Sheet เก็บเป็น String → parse M/D ตรง
          const bRaw = transData[i][1];
          if (bRaw instanceof Date) {
            rowDateObj = new Date(bRaw.getFullYear(), bRaw.getDate() - 1, bRaw.getMonth() + 1);
          } else {
            const bStr = String(bRaw || '').trim().split(' ')[0];
            const bp = bStr.split('/');
            if (bp.length === 3) {
              const m = parseInt(bp[0]), d = parseInt(bp[1]), y = parseInt(bp[2]);
              if (!isNaN(m) && !isNaN(d) && !isNaN(y)) rowDateObj = new Date(y, m - 1, d);
            }
          }
        } else {
          continue;
        }

        if (!rowDateObj || rowDateObj < start || rowDateObj > end) continue;

        const dStr = Utilities.formatDate(rowDateObj, "GMT+7", "yyyy-MM-dd");
        const weight = parseFloat(transData[i][9]) || 0;  // Col J = Quantity (KG)
        const lines  = parseFloat(transData[i][7]) || 0;  // Col H = CW quantity (เส้น)

        if (type === "Production") {
          inWeight += weight;
          inLines  += lines;
          if (dailyData[dStr]) dailyData[dStr].in += weight;
        } else if (type === "Sales order") {
          const absWeight = Math.abs(weight);
          const absLines  = Math.abs(lines);
          outWeight += absWeight;
          outLines  += absLines;
          if (dailyData[dStr]) dailyData[dStr].out += absWeight;

          // จำแนก: จัดส่งเอง vs รถต่างจังหวัดมารับ
          // เทียบชื่อลูกค้า Col O (index 14) กับ Logistic_Plan ของวันเดียวกัน
          const custName = String(transData[i][14] || '').trim().toLowerCase(); // Col O
          const logiSet  = logiCustomersByDate[dStr] || [];
          if (custName && logiSet.indexOf(custName) >= 0) {
            ownDeliveryWeight += absWeight;
            ownDeliveryLines  += absLines;
            if (dailyOwnDelivery[dStr] !== undefined) dailyOwnDelivery[dStr] += absWeight;
          } else {
            pickupWeight += absWeight;
            pickupLines  += absLines;
            if (dailyPickup[dStr] !== undefined) dailyPickup[dStr] += absWeight;
          }
        }
      }
    }
    
    const sortedDates = Object.keys(dailyData).sort();
    const dailyIn = sortedDates.map(d => dailyData[d].in);
    const dailyOut = sortedDates.map(d => dailyData[d].out);
    const dailyOwnArr = sortedDates.map(d => dailyOwnDelivery[d] || 0);
    const dailyPickupArr = sortedDates.map(d => dailyPickup[d] || 0);
    
    // --- 2. ดึงข้อมูล Inventory ปัจจุบัน ---
    const invSheet = ss.getSheetByName("Inventory FG");
    let invWeight = 0, invLines = 0;
    if (invSheet) {
      const invData = invSheet.getDataRange().getValues();
      for (let i = 1; i < invData.length; i++) {
        invLines += parseFloat(invData[i][1]) || 0;
        invWeight += parseFloat(invData[i][2]) || 0;
      }
    }
    
    // --- 3. ดึงข้อมูล Inventory Trend (จาก Log Daily) ---
    const trendData = getInventoryTrendData(startDate, endDate); //

    // --- 4. ดึงข้อมูล Blocking Trend (จาก Inventory_Blocking_Log) ---
    const blockingTrend = getInventoryBlockingTrend(startDate, endDate); // ส่วนที่คุณต้องการเพิ่ม

    // ส่งข้อมูลทั้งหมดกลับไปยังหน้าเว็บ
    return {
      success: true,
      inWeight: inWeight,
      inLines: inLines,
      outWeight: outWeight,
      outLines: outLines,
      invWeight: invWeight,
      invLines: invLines,
      dates: sortedDates.map(d => d.split('-').slice(1).join('/')),
      dailyInbound: dailyIn,
      dailyOutbound: dailyOut,
      
      // ข้อมูลกราฟ Trend ปกติ
      inventoryTrendDates: trendData.dates,
      inventoryTrendLines: trendData.totalLines,
      inventoryTrendWeight: trendData.totalWeight,
      
      blockingTrendDates: blockingTrend.dates,
      blockingTrendWeights: blockingTrend.weights,
      blockingTrendLines: blockingTrend.lines,

      // ── ข้อมูลกราฟเปรียบเทียบ จัดส่งเอง vs รถต่างจังหวัดมารับ ──
      ownDeliveryWeight: ownDeliveryWeight,
      ownDeliveryLines: ownDeliveryLines,
      pickupWeight: pickupWeight,
      pickupLines: pickupLines,
      dailyOwnDelivery: dailyOwnArr,
      dailyPickup: dailyPickupArr

    };
    
  } catch (e) {
    Logger.log("❌ Error in getWarehouseAnalyticsData: " + e.message);
    return { success: false, message: e.toString() };
  }
  }); // end _withCache
}

// ── Debug: เช็คชื่อลูกค้าระหว่าง Logistic_Plan กับ Transection ต่อวัน ──
function getDeliveryNameDebug(dateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const targetDate = dateStr; // 'yyyy-MM-dd'

    // ดึงชื่อร้านค้าจาก Logistic_Plan (status=success)
    const logiNames = [];
    const logiSheet = ss.getSheetByName('Logistic_Plan');
    if (logiSheet && logiSheet.getLastRow() >= 2) {
      const logiData = logiSheet.getDataRange().getValues();
      for (let i = 1; i < logiData.length; i++) {
        const d = parseDateValue(logiData[i][1]);
        if (!d) continue;
        const dStr = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
        if (dStr !== targetDate) continue;
        const status = String(logiData[i][11] || '').trim().toLowerCase();
        const shopName = String(logiData[i][6] || '').trim();
        logiNames.push({ shopName: shopName, status: status });
      }
    }

    // ดึงชื่อลูกค้าจาก Transection (Sales order เท่านั้น)
    const transNames = [];
    const transSheet = ss.getSheetByName('Transection');
    if (transSheet && transSheet.getLastRow() >= 2) {
      const transData = transSheet.getDataRange().getValues();
      for (let i = 1; i < transData.length; i++) {
        const d = parseDateValue(transData[i][8]); // col I = Physical date
        if (!d) continue;
        const dStr = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
        if (dStr !== targetDate) continue;
        const type = String(transData[i][3] || '').trim();
        if (type !== 'Sales order') continue;
        const custName = String(transData[i][7] || '').trim();
        const weight = Math.abs(parseFloat(transData[i][6]) || 0);
        if (!transNames.find(x => x.custName === custName)) {
          transNames.push({ custName: custName, totalWeight: weight });
        } else {
          transNames.find(x => x.custName === custName).totalWeight += weight;
        }
      }
    }

    // เทียบว่า match กันไหม
    const successLogiNames = logiNames.filter(x => x.status === 'success').map(x => x.shopName.toLowerCase());
    const matchResult = transNames.map(t => ({
      custName: t.custName,
      totalWeight: t.totalWeight,
      matched: successLogiNames.indexOf(t.custName.toLowerCase()) >= 0
    }));

    return {
      success: true,
      date: targetDate,
      logiPlanNames: logiNames,
      transactionCustomers: matchResult
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
/**
 * ✅ ฟังก์ชันใหม่: ดึงสินค้า 20 อันดับแรกที่มีน้ำหนักสุทธิคงเหลือมากที่สุด
 * เพื่อนำไปแสดงในตารางสินค้าเร่งระบาย
 */
function getTopStockItems() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_FG_SHEET);
    const productMap = getProductMap();
    
    if (!sheet || sheet.getLastRow() < 2) return [];
    
    const data = sheet.getDataRange().getValues();
    const items = [];
    
    // Structure: A=Code, B=InvLines, C=InvWeight, D=ResLines, E=ResWeight
    for (let i = 1; i < data.length; i++) {
      const sku = String(data[i][0] || "").trim();
      if(!sku) continue;
      
      const invW = parseFloat(data[i][2]) || 0; // Col C: Inventory Weight
      const resW = parseFloat(data[i][4]) || 0; // Col E: Reserved Weight
      const netW = invW - resW;
      
      // เลือกเฉพาะที่มีของเหลือ (Net Weight > 0)
      if (netW > 0) {
        items.push({
          code: sku,
          name: productMap[sku] ? productMap[sku].name : 'Unknown Product',
          invW: invW,
          resW: resW,
          netW: netW
        });
      }
    }
    
    // เรียงลำดับตาม Net Weight จากมากไปน้อย
    items.sort((a, b) => b.netW - a.netW);
    
    // ตัดมาแค่ 20 อันดับแรก
    return items.slice(0, 20);
    
  } catch(e) {
    Logger.log("❌ Error getTopStockItems: " + e.message);
    return [];
  }
}

/**
 * ✅ ดึงข้อมูล Inventory Trend ตามช่วงวันที่ (แก้ไข: ใช้ parseDateValue เพื่อความแม่นยำ)
 */
function getInventoryTrendData(startDate, endDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName(INVENTORY_DAILY_LOG_SHEET);
    
    // ตั้งค่าเวลาเป็น 12:00 เพื่อป้องกันปัญหาเรื่อง Timezone
    const start = new Date(startDate); start.setHours(12,0,0,0);
    const end = new Date(endDate); end.setHours(12,0,0,0);
    const today = new Date(); today.setHours(12,0,0,0);

    const logDataMap = {}; 

    // 1. ดึงข้อมูลจาก Sheet Log
    if (logSheet && logSheet.getLastRow() >= 2) {
      const data = logSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        // ✅ ใช้ parseDateValue เพื่อรองรับทั้ง Date Object และ String
        let rowDate = parseDateValue(data[i][0]);
        if (!rowDate || rowDate.getTime() === 0) continue;

        // แปลงเป็น Key มาตรฐาน yyyy-MM-dd
        let dateKey = Utilities.formatDate(rowDate, "GMT+7", "yyyy-MM-dd");

        // Col E (Index 4) = น้ำหนัก (กก.)
        // Col D (Index 3) = จำนวนเส้น
        logDataMap[dateKey] = {
          weight: parseFloat(data[i][4]) || 0,
          lines: parseFloat(data[i][3]) || 0
        };
      }
    }

    // 2. ถ้าช่วงวันที่ครอบคลุม "วันนี้" และยังไม่มี Log -> ให้คำนวณสดจาก Inventory FG
    const todayKey = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
    if (end >= today && !logDataMap[todayKey]) {
       const currentInv = calculateCurrentInventory(); // เรียกฟังก์ชันคำนวณสด
       logDataMap[todayKey] = {
         weight: currentInv.weight,
         lines: currentInv.lines
       };
    }

    // 3. สร้าง Array ผลลัพธ์ตามช่วงเวลา (เติม 0 วันที่ขาด)
    const resultDates = [];
    const resultWeights = [];
    const resultLines = [];
    
    let loopDate = new Date(start);

    while (loopDate <= end) {
      const key = Utilities.formatDate(loopDate, "GMT+7", "yyyy-MM-dd");
      const label = Utilities.formatDate(loopDate, "GMT+7", "dd/MM");
      
      const dataPoint = logDataMap[key] || { weight: 0, lines: 0 };

      resultDates.push(label);
      resultWeights.push(dataPoint.weight);
      resultLines.push(dataPoint.lines);

      loopDate.setDate(loopDate.getDate() + 1);
    }

    return {
      success: true,
      dates: resultDates,
      totalWeight: resultWeights,
      totalLines: resultLines
    };

  } catch (e) {
    Logger.log("❌ Error getInventoryTrendData: " + e.message);
    return { success: false, dates: [], totalWeight: [], totalLines: [] };
  }
}

/**
 * ✅ ฟังก์ชันช่วย: คำนวณ Inventory ปัจจุบัน (สำหรับแสดงกราฟวันล่าสุดแบบ Realtime)
 */
function calculateCurrentInventory() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_FG_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { weight: 0, lines: 0 };
    
    const data = sheet.getDataRange().getValues();
    let sumWeight = 0;
    let sumLines = 0;
    
    for (let i = 1; i < data.length; i++) {
      // Col B (Index 1) = เส้น, Col C (Index 2) = น้ำหนัก
      sumLines += parseFloat(data[i][1]) || 0;
      sumWeight += parseFloat(data[i][2]) || 0;
    }
    return { weight: sumWeight, lines: sumLines };
  } catch(e) {
    return { weight: 0, lines: 0 };
  }
}

function autoLogInventoryDaily(targetDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const invSheet = ss.getSheetByName(INVENTORY_FG_SHEET);
    
    if (!invSheet || invSheet.getLastRow() < 2) {
      Logger.log("⚠️ ไม่มีข้อมูลใน Inventory FG");
      return { success: false, message: "No data in Inventory FG" };
    }
    
    const lastRow = invSheet.getLastRow();
    const data = invSheet.getRange(2, 1, lastRow - 1, 5).getValues();
    
    let sumB = 0; 
    let sumC = 0; 
    let sumD = 0; 
    let sumE = 0; 
    let totalSKU = 0;
    
    for (let i = 0; i < data.length; i++) {
      const sku = String(data[i][0] || "").trim();
      if (!sku) continue;
      
      totalSKU++;
      sumB += parseFloat(data[i][1]) || 0;
      sumC += parseFloat(data[i][2]) || 0;
      sumD += parseFloat(data[i][3]) || 0;
      sumE += parseFloat(data[i][4]) || 0;
    }
    
    const netLines = sumB - sumD;
    const netWeight = sumC - sumE;

    let now;
    if (targetDate && targetDate !== "" && typeof targetDate === 'string') {
      now = new Date(targetDate);
      if (isNaN(now.getTime())) {
        now = new Date();
      }
    } else {
      now = new Date(); 
    }
    
    const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
    const timeStr = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss"); 
    
    let logSheet = ss.getSheetByName(INVENTORY_DAILY_LOG_SHEET);
    if (!logSheet) {
      logSheet = ss.insertSheet(INVENTORY_DAILY_LOG_SHEET);
      const headers = ["วันที่บันทึก", "เวลา", "จำนวน SKU", "สินค้าคงคลัง(เส้น)", "น้ำหนักคงคลัง(กก.)", "รอส่งมอบ(เส้น)", "น้ำหนักรอส่งมอบ(กก.)", "คงคลังสุทธิ(เส้น)", "น้ำหนักสุทธิ(กก.)"];
      logSheet.appendRow(headers);
      logSheet.setFrozenRows(1);
    }
    
    const logData = logSheet.getDataRange().getValues();
    for (let i = logData.length - 1; i >= 1; i--) {
      let rowDate;
      if (logData[i][0] instanceof Date) {
        rowDate = Utilities.formatDate(logData[i][0], "GMT+7", "yyyy-MM-dd");
      } else {
        rowDate = String(logData[i][0]).trim();
      }
      
      if (rowDate === dateStr) {
        logSheet.deleteRow(i + 1);
        Logger.log("🗑️ Deleted existing log for date: " + dateStr);
      }
    }
    
    const newRow = [dateStr, timeStr, totalSKU, sumB, sumC, sumD, sumE, netLines, netWeight];
    logSheet.appendRow(newRow);
    
    const lastRowNum = logSheet.getLastRow();
    logSheet.getRange(lastRowNum, 4, 1, 6).setNumberFormat("#,##0.00");
    
    Logger.log(`✅ บันทึกสำเร็จ: ${dateStr}`);
    
    return { 
      success: true, 
      message: "Inventory logged for " + dateStr,
      data: { dateStr, totalWeight: sumC, netWeight: netWeight }
    };
    
  } catch (e) {
    Logger.log("❌ Error: " + e.message);
    return { success: false, message: e.message };
  }
}

function getRecentInventoryLogs() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName(INVENTORY_DAILY_LOG_SHEET);
    
    if (!logSheet || logSheet.getLastRow() < 2) {
      return { success: false, message: "ไม่มีข้อมูล Log" };
    }
    
    const lastRow = logSheet.getLastRow();
    const startRow = Math.max(2, lastRow - 6); 
    const data = logSheet.getRange(startRow, 1, lastRow - startRow + 1, 9).getValues();
    
    const logs = data.map(row => ({
      date: row[0],
      time: row[1],
      totalSKU: row[2],
      totalLines: row[3],
      totalWeight: row[4],
      reservedLines: row[5],
      reservedWeight: row[6],
      netLines: row[7],
      netWeight: row[8]
    }));
    
    return { success: true, logs: logs };
    
  } catch (e) {
    return { success: false, message: e.message };
  }
}
/**
 * ✅ ดึงรายชื่อสินค้าทั้งหมดสำหรับ Dropdown งานแทรก
 */
function getAllProductsForDropdown() {
  return _withCache('allProductsDropdown', 600, function() {
    try {
      const productMap = getProductMap();
      const qcMap = getQCStandardMap();
      const stdCMap = getStandardCMap();
      const list = [];
      Object.keys(productMap).forEach(id => {
        const p = productMap[id];
        let qc = id.startsWith('0C') ? (stdCMap[id] || {}) : (qcMap[id] || {});
        list.push({
          id: id,
          name: p.name,
          productSize: qc.productSize || '-',
          wStd: qc.wStd || '-',
          wMinMax: qc.wMinMax || '-',
          linesPerBundle: p.linesPerBundle || 1,
          pcsPerBundle: p.pcsPerBundle || 1
        });
      });
      list.sort((a, b) => a.id.localeCompare(b.id));
      return list;
    } catch (e) { return []; }
  });
}
/**
 * ✅ ดึงวันที่ผลิตล่าสุดของแต่ละ SKU จาก Sheet "Production FG"
 * Column A = วันที่ผลิต (รูปแบบ dd/MM/yyyy เช่น 22/01/2026)
 * Column C = รหัสสินค้า (Item)
 */
function getLastProductionDates() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRODUCTION_FG_SHEET);
    
    if (!sheet || sheet.getLastRow() < 2) {
      Logger.log("⚠️ Production FG Sheet ว่างเปล่า");
      return {};
    }
    
    const data = sheet.getDataRange().getValues();
    const lastProductionMap = {};
    
    Logger.log("📊 เริ่มอ่านข้อมูลจาก Production FG: " + (data.length - 1) + " แถว");
    
    // วนลูปข้อมูล (เริ่มจากแถว 2 เพราะแถว 1 เป็น Header)
    for (let i = 1; i < data.length; i++) {
      // ✅ Col A (Index 0) = วันที่ผลิต (Physical date)
      // ✅ Col C (Index 2) = Item (รหัสสินค้า)
      
      const prodDateRaw = data[i][0]; // Column A
      const productCode = String(data[i][2] || "").trim(); // Column C
      
      // ข้ามถ้าไม่มีรหัสสินค้า
      if (!productCode) continue;
      
      // แปลงวันที่โดยใช้ฟังก์ชัน parseDateValue ที่รองรับหลายรูปแบบ
      const prodDate = parseDateValue(prodDateRaw);
      
      // ตรวจสอบว่าแปลงวันที่ได้หรือไม่
      if (!prodDate || prodDate.getTime() === 0) {
        Logger.log(`⚠️ Row ${i + 1}: ไม่สามารถแปลงวันที่ "${prodDateRaw}" สำหรับ SKU: ${productCode}`);
        continue;
      }
      
      // ถ้ายังไม่มีข้อมูลของ SKU นี้ หรือวันที่ใหม่กว่า
      if (!lastProductionMap[productCode] || prodDate > lastProductionMap[productCode]) {
        lastProductionMap[productCode] = prodDate;
        
        // Debug log (ลบออกได้ถ้าไม่ต้องการ)
        Logger.log(`✅ Row ${i + 1}: SKU ${productCode} = ${Utilities.formatDate(prodDate, "GMT+7", "dd/MM/yyyy")}`);
      }
    }
    
    Logger.log("✅ พบข้อมูลการผลิต: " + Object.keys(lastProductionMap).length + " SKU");
    
    // Debug: แสดง 5 SKU แรก
    const firstFive = Object.keys(lastProductionMap).slice(0, 5);
    firstFive.forEach(sku => {
      Logger.log(`   - ${sku}: ${Utilities.formatDate(lastProductionMap[sku], "GMT+7", "dd/MM/yyyy")}`);
    });
    
    return lastProductionMap;
    
  } catch (e) {
    Logger.log("❌ Error getLastProductionDates: " + e.message);
    Logger.log("Stack trace: " + e.stack);
    return {};
  }
}
/**
 * ✅ ฟังก์ชันหลักดึงข้อมูลรายการจองค้าง หรือสินค้าพร้อมส่ง
 * @param {string} viewMode - "reserved" หรือ "onhand"
 */
function getOverdueReservations(viewMode) {
  viewMode = viewMode || 'reserved'; // Default เป็น Reserved
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (viewMode === 'reserved') {
      // 📦 มุมมอง: จองแล้วรอส่ง (Reserved Physical)
      return getReservedOverdueItems(ss);
    } else {
      // 📊 มุมมอง: มีของแต่ไม่จอง (On-Hand Available)
      return getOnHandAvailableItems(ss);
    }
  } catch (e) { 
    return { success: false, message: e.toString() }; 
  }
}
/**
 * ✅ ฟังก์ชันดึงข้อมูลรายการจองค้าง (Reserved Physical)
 * เงื่อนไข: Column H (Reference) = "Reserved physical" AND Column I (Issue) = "Sales order"
 */
function getReservedOverdueItems(ss) {
  const sheet = ss.getSheetByName('Overdue Reservations');
  if (!sheet || sheet.getLastRow() < 2) {
    return { success: false, message: "กรุณาอัปโหลดไฟล์ก่อน" };
  }
  
  const data = sheet.getDataRange().getValues();
  const overdueItems = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastProductionDates = getLastProductionDates();
  
  Logger.log("📋 Header Row: " + JSON.stringify(data[0]));
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // ✅ Column H (Index 7) = Reference type
    const referenceType = String(row[7] || "").trim();
    // ✅ Column I (Index 8) = Issue type
    const issueType = String(row[8] || "").trim();
    
    if (i <= 5) {
      Logger.log(`Row ${i}: Reference (H) = "${referenceType}", Issue (I) = "${issueType}", Product = ${row[3]}`);
    }
    
    // ✅ เงื่อนไข: จองแล้วแต่ยังไม่ส่ง (Reserved physical + Sales order)
    if (referenceType !== "Reserved physical" || issueType !== "Sales order") continue;
    
    const qtyPcs = Math.abs(parseFloat(row[10]) || 0);
    if (qtyPcs === 0) continue;

    const reserveDateRaw = row[1];
    const reserveDate = reserveDateRaw instanceof Date ? reserveDateRaw : new Date(reserveDateRaw);
    
    if (isNaN(reserveDate.getTime())) continue;
    
    const reserveDateOnly = new Date(reserveDate);
    reserveDateOnly.setHours(0,0,0,0);
    const overdueDays = Math.floor((today - reserveDateOnly) / (1000 * 60 * 60 * 24));
    
    // ✅ แสดงเฉพาะที่ค้าง >= 5 วัน (ถ้าต้องการแสดงทั้งหมด ให้คอมเมนต์บรรทัดนี้)
    if (overdueDays < 5) continue;
    
    const productId = String(row[3] || "").trim();
    
    const lastProdDate = lastProductionDates[productId];
    const lastProdDateStr = lastProdDate ? 
      Utilities.formatDate(lastProdDate, "GMT+7", "dd/MM/yyyy") : 
      "-";
    
    let daysSinceProduction = null;
    if (lastProdDate) {
      const daysDiff = Math.floor((today - lastProdDate) / (1000 * 60 * 60 * 24));
      daysSinceProduction = daysDiff;
    }
    
    overdueItems.push({
      accountName: String(row[5] || "").trim(),
      productId: productId,
      productName: String(row[4] || "").trim(),
      quantity: qtyPcs,
      weight: Math.abs(parseFloat(row[12]) || 0),
      reserveDateStr: Utilities.formatDate(reserveDate, "GMT+7", "dd/MM/yyyy HH:mm"),
      overdueDays: overdueDays,
      lastProductionDate: lastProdDateStr,
      daysSinceProduction: daysSinceProduction,
      reserveType: "Reserved physical"
    });
  }
  
  Logger.log(`✅ Found ${overdueItems.length} Reserved Physical items (ค้าง >= 5 วัน)`);
  
  overdueItems.sort((a, b) => {
    if (b.overdueDays !== a.overdueDays) {
      return b.overdueDays - a.overdueDays;
    }
    return a.accountName.localeCompare(b.accountName);
  });
  
  return {
    success: true,
    data: overdueItems,
    summary: {
      uniqueShops: [...new Set(overdueItems.map(item => item.accountName))].length,
      totalItems: overdueItems.length,
      totalWeight: overdueItems.reduce((sum, item) => sum + item.weight, 0)
    }
  };
}

/**
 * ✅ ฟังก์ชันดึงข้อมูลสินค้าที่มีของแต่ยังไม่จอง (On Hand Available)
 * เงื่อนไข: Column H (Reference) = "On order" AND มีสินค้าพร้อมส่ง >= 500 เส้น
 */
function getOnHandAvailableItems(ss) {
  const reserveSheet = ss.getSheetByName('Overdue Reservations');
  const invSheet = ss.getSheetByName(INVENTORY_FG_SHEET);
  
  if (!reserveSheet || reserveSheet.getLastRow() < 2) {
    return { success: false, message: "ไม่พบข้อมูลใน Overdue Reservations" };
  }
  
  const reserveData = reserveSheet.getDataRange().getValues();
  const invData = invSheet ? invSheet.getDataRange().getValues() : [];
  const lastProductionDates = getLastProductionDates();
  
  const invMap = {};
  for (let i = 1; i < invData.length; i++) {
    const sku = String(invData[i][0] || "").trim();
    invMap[sku] = {
      availLines: parseFloat(invData[i][5]) || 0,
      availWeight: parseFloat(invData[i][6]) || 0
    };
  }

  const resultItems = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  Logger.log("📋 Searching for On Order items with available >= 500");

  for (let i = 1; i < reserveData.length; i++) {
    const row = reserveData[i];
    
    // ✅ Column H (Index 7) = Reference type
    const referenceType = String(row[7] || "").trim();
    // ✅ Column I (Index 8) = Issue type  
    const issueType = String(row[8] || "").trim();
    
    if (i <= 5) {
      Logger.log(`Row ${i}: Reference (H) = "${referenceType}", Issue (I) = "${issueType}", Product = ${row[3]}`);
    }
    
    // ✅ เงื่อนไข: มีออเดอร์แต่ยังไม่จอง (On order)
    if (referenceType === "On order") {
      const productId = String(row[3] || "").trim();
      const orderQty = Math.abs(parseFloat(row[10]) || 0);
      const invInfo = invMap[productId] || { availLines: 0, availWeight: 0 };

      if (orderQty > 0 && invInfo.availLines >= 500) {
        const lastProdDate = lastProductionDates[productId];
        const lastProdDateStr = lastProdDate ? 
          Utilities.formatDate(lastProdDate, "GMT+7", "dd/MM/yyyy") : "-";
        
        let daysSinceProd = null;
        if (lastProdDate) {
          daysSinceProd = Math.floor((today - lastProdDate) / (1000 * 60 * 60 * 24));
        }

        resultItems.push({
          accountName: String(row[5] || "").trim(),
          productId: productId,
          productName: String(row[4] || "").trim(),
          quantity: orderQty,
          invAvailable: invInfo.availLines,
          weight: invInfo.availWeight,
          reserveDateStr: "-",
          overdueDays: 0,
          lastProductionDate: lastProdDateStr,
          daysSinceProduction: daysSinceProd,
          reserveType: "On order"
        });
      }
    }
  }

  Logger.log(`✅ Found ${resultItems.length} On Order items (available >= 500)`);

  resultItems.sort((a, b) => a.accountName.localeCompare(b.accountName));

  return {
    success: true,
    data: resultItems,
    summary: {
      uniqueShops: [...new Set(resultItems.map(item => item.accountName))].length,
      totalItems: resultItems.length,
      totalWeight: resultItems.reduce((sum, item) => sum + item.weight, 0)
    }
  };
}
/**
 * วิเคราะห์พื้นที่คลังสินค้า 3 รูปแบบ
 */
function getComprehensiveSpaceAnalysis() {
  try {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reserveSheet = ss.getSheetByName('Overdue Reservations');
  const invSheet = ss.getSheetByName('Inventory FG');
  const productMap = getProductMap(); // ดึงชื่อสินค้าจากชีต Product

  if (!reserveSheet || !invSheet) return { success: false, message: "Sheet data missing" };

  const reserveData = reserveSheet.getDataRange().getValues();
  const invData = invSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0,0,0,0);

  // 1. สร้าง Map สำหรับ Inventory (Col F = Lines)
  const invMap = {};
  for (let i = 1; i < invData.length; i++) {
    const sku = String(invData[i][0]).trim();
    invMap[sku] = {
      lines: parseFloat(invData[i][1]) || 0, // Inventory Lines
      weight: parseFloat(invData[i][2]) || 0,
      available: parseFloat(invData[i][5]) || 0 // Col F: สินค้าพร้อมส่ง
    };
  }

  const analysis = {
    reserved: [], // จองแล้วไม่ส่ง
    pending: [],  // ออเดอร์มี ของพร้อม แต่ไม่จอง
    blind: []     // ผลิตเยอะแต่ไม่มีออเดอร์
  };

  const skuWithOrders = new Set();

  // วนลูปข้อมูลจอง
  for (let i = 1; i < reserveData.length; i++) {
    const row = reserveData[i];
    const sku = String(row[3]).trim();
    const refType = String(row[8]).trim(); // Col I: Reference type (แก้ไขจาก row[7])
    const qty = Math.abs(parseFloat(row[10]) || 0);
    skuWithOrders.add(sku);

    // --- เงื่อนไข 1: Reserved physical > 5 วัน ---
    if (refType === "Reserved physical" && qty > 0) {
      const dateRaw = row[1];
      const reserveDate = dateRaw instanceof Date ? dateRaw : new Date(dateRaw);
      const diffDays = Math.floor((today - reserveDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 5) {
        analysis.reserved.push({
          shop: row[5], sku: sku, name: row[4], qty: qty, days: diffDays, weight: row[12]
        });
      }
    }

    // --- เงื่อนไข 2: On order และ ของในคลัง (Col F) > 500 ---
    if (refType === "On order" && qty > 0) {
      const invInfo = invMap[sku] || { available: 0 };
      if (invInfo.available >= 500) {
        analysis.pending.push({
          shop: row[5], sku: sku, name: row[4], orderQty: qty, invAvail: invInfo.available
        });
      }
    }
  }

  // --- เงื่อนไข 3: Blind Production (มีของเยอะแต่ไม่มีออเดอร์เลย) ---
  for (let sku in invMap) {
    if (!skuWithOrders.has(sku) && invMap[sku].lines > 0) {
      analysis.blind.push({
        sku: sku, name: productMap[sku] ? productMap[sku].name : "Unknown", 
        qty: invMap[sku].lines, weight: invMap[sku].weight
      });
    }
  }

  return { success: true, data: analysis };
  } catch (e) {
    Logger.log('❌ getComprehensiveSpaceAnalysis error: ' + e.message);
    return { success: false, message: e.toString() };
  }
}
/**
 * วิเคราะห์ข้อมูลพื้นที่คลังตาม 3 ความต้องการหลัก
 * ปรับปรุง: เพิ่มเงื่อนไขตรวจสอบ Column H (Index 7) ต้องเป็น "Sales order" สำหรับรายการจองค้าง
 */
function getSpaceAnalysisData() {
  return _withCache('spaceAnalysis', 300, function() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const reserveSheet = ss.getSheetByName('Overdue Reservations');
    const invSheet = ss.getSheetByName('Inventory FG');
    const prodSheet = ss.getSheetByName('Product');
    
    if (!reserveSheet || !invSheet) return { success: false, msg: "ไม่พบชีตข้อมูล Overdue Reservations หรือ Inventory FG" };

    const reserveData = reserveSheet.getDataRange().getValues();
    const invData = invSheet.getDataRange().getValues();
    
    // ดึง Product Map เพื่อหาชื่อสินค้ากรณีข้อมูลในไฟล์จองไม่ครบ
    const productMap = {};
    if (prodSheet) {
      const pData = prodSheet.getDataRange().getValues();
      for (let i = 1; i < pData.length; i++) {
        productMap[String(pData[i][0]).trim()] = pData[i][1];
      }
    }
    
    // ดึงวันที่ผลิตล่าสุดจาก Production FG
    const lastProductionDates = getLastProductionDates();

    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. สร้าง Map สำหรับ Inventory (Col F = Lines Available)
    const invMap = {};
    for (let i = 1; i < invData.length; i++) {
      const sku = String(invData[i][0]).trim();
      invMap[sku] = {
        totalLines: parseFloat(invData[i][1]) || 0, // Col B
        weight: parseFloat(invData[i][2]) || 0,      // Col C
        availLines: parseFloat(invData[i][5]) || 0   // Col F: สินค้าพร้อมส่ง
      };
    }

    const analysis = {
      reserved: [], // ข้อ 1: จองค้างเกิน 5 วัน
      pending: [],  // ข้อ 2: มีออเดอร์+ของพร้อม > 500 แต่ไม่จอง
      blind: []     // ข้อ 3: ผลิตเยอะแต่ไม่มีออเดอร์เลย
    };

    const skuWithOrders = new Set();

    // วนลูปข้อมูลในชีต Overdue Reservations
    for (let i = 1; i < reserveData.length; i++) {
      const row = reserveData[i];
      const sku = String(row[3]).trim(); // Col D: รหัสสินค้า
      const h_orderType = String(row[7] || "").trim(); // Col H: Reference type (เงื่อนไขที่เพิ่มใหม่)
      const i_issueType = String(row[8]).trim(); // Col I: Issue type
      const qty = Math.abs(parseFloat(row[10]) || 0); // Col K: CW quantity
      
      if (!sku) continue;
      skuWithOrders.add(sku);

      // --- เงื่อนไข 1: Reserved physical + Sales order ค้างเกิน 5 วัน ---
      // แก้ไข: เพิ่มเงื่อนไข h_orderType === "Sales order"
      if (i_issueType === "Reserved physical" && h_orderType === "Sales order" && qty > 0) {
        const dateRaw = row[1]; // Col B: Physical date (วันที่จอง)
        const reserveDate = dateRaw instanceof Date ? dateRaw : new Date(dateRaw);
        if (!isNaN(reserveDate.getTime())) {
          const reserveDateOnly = new Date(reserveDate);
          reserveDateOnly.setHours(0,0,0,0);
          const diffDays = Math.floor((today - reserveDateOnly) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 5) {
            const lastProdDate = lastProductionDates[sku];
            const lastProdDateStr = lastProdDate ? 
              Utilities.formatDate(lastProdDate, "GMT+7", "dd/MM/yyyy") : 
              "-";
            
            let daysSinceProduction = null;
            if (lastProdDate) {
              const daysDiff = Math.floor((today - lastProdDate) / (1000 * 60 * 60 * 24));
              daysSinceProduction = daysDiff;
            }
            
            analysis.reserved.push({
              shop: row[5] || "ไม่ระบุร้าน",  // Col F: Account Name
              sku: sku,                         // Col D: รหัสสินค้า
              name: row[4] || productMap[sku] || "ไม่พบชื่อสินค้า", // Col E: ชื่อสินค้า
              qty: qty,                         // Col K: จำนวนที่จอง
              days: diffDays,                   // จำนวนวันค้าง
              reserveDate: Utilities.formatDate(reserveDate, "GMT+7", "dd/MM/yyyy"), // วันที่จอง
              lastProductionDate: lastProdDateStr, // วันที่ผลิตล่าสุด
              daysSinceProduction: daysSinceProduction // จำนวนวันนับจากผลิต
            });
          }
        }
      }

      // --- เงื่อนไข 2: On order และ มีสินค้าในคลัง (Col F) >= 500 ---
      if (i_issueType === "On order" && qty > 0) {
        const invInfo = invMap[sku] || { availLines: 0 };
        if (invInfo.availLines >= 500) {
          const lastProdDate = lastProductionDates[sku];
          const lastProdDateStr = lastProdDate ? 
            Utilities.formatDate(lastProdDate, "GMT+7", "dd/MM/yyyy") : 
            "-";
          
          analysis.pending.push({
            shop: row[5] || "ไม่ระบุร้าน",
            sku: sku,
            name: row[4] || productMap[sku] || "ไม่พบชื่อสินค้า",
            orderQty: qty,
            invStock: invInfo.availLines,
            lastProductionDate: lastProdDateStr
          });
        }
      }
    }

    // --- เงื่อนไข 3: Blind Production (ผลิตมาแต่ไม่มีการจองหรือออเดอร์ในไฟล์เลย) ---
    for (let sku in invMap) {
      if (!skuWithOrders.has(sku) && invMap[sku].totalLines > 0) {
        const lastProdDate = lastProductionDates[sku];
        const lastProdDateStr = lastProdDate ? 
          Utilities.formatDate(lastProdDate, "GMT+7", "dd/MM/yyyy") : 
          "-";
        
        analysis.blind.push({
          sku: sku,
          name: productMap[sku] || "สินค้าใหม่/ไม่มีชื่อ",
          qty: invMap[sku].totalLines,
          weight: invMap[sku].weight,
          lastProductionDate: lastProdDateStr
        });
      }
    }

    return { success: true, data: analysis };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
  }); // end _withCache
}
/**
 * 🆕 ฟังก์ชันสำหรับตั้งเวลาบันทึก Inventory blocking อัตโนมัติทุกวัน 11:00 น.
 * เรียกใช้ครั้งเดียวเพื่อติดตั้ง Trigger
 */
function setupDailyInventoryBlockingLog() {
  try {
    // ลบ Trigger เก่าที่มีชื่อเดียวกัน (ถ้ามี)
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'recordInventoryBlockingDaily') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // สร้าง Trigger ใหม่: ทำงานทุกวันเวลา 11:00-12:00 น.
    ScriptApp.newTrigger('recordInventoryBlockingDaily')
      .timeBased()
      .atHour(11)
      .everyDays(1)
      .create();

    Logger.log('✅ ติดตั้ง Trigger สำเร็จ: บันทึก Inventory blocking อัตโนมัติทุกวัน 11:00 น.');
    return { success: true, message: 'ติดตั้ง Trigger สำเร็จ' };
  } catch (e) {
    Logger.log('❌ setupDailyInventoryBlockingLog error: ' + e.message);
    return { success: false, message: e.toString() };
  }
}
/**
 * 🆕 ฟังก์ชันบันทึกข้อมูล Inventory blocking อัตโนมัติ (เวอร์ชันคำนวณน้ำหนักตามมาตรฐานสินค้า)
 */
function recordInventoryBlockingDaily() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const overdueSheet = ss.getSheetByName('Overdue Reservations');
    const qcStdSheet = ss.getSheetByName('QC-Standard');
    const stdCSheet = ss.getSheetByName('Standard-C');
    
    if (!overdueSheet || overdueSheet.getLastRow() < 2) {
      Logger.log('⚠️ ไม่พบข้อมูลในชีต Overdue Reservations');
      return { success: false, message: 'ไม่พบข้อมูล' };
    }
    
    // 1. สร้าง Map สำหรับเก็บน้ำหนักมาตรฐานของสินค้าแต่ละกลุ่ม
    const weightMap = {};
    
    // ดึงข้อมูลจาก QC-Standard (สำหรับ 0RT, 0SQ)
    if (qcStdSheet) {
      const qcData = qcStdSheet.getDataRange().getValues();
      for (let i = 1; i < qcData.length; i++) {
        const sku = String(qcData[i][0]).trim(); // Col A
        const weightPerLine = parseFloat(qcData[i][2]) || 0; // Col C
        weightMap[sku] = weightPerLine;
      }
    }

    // ดึงข้อมูลจาก Standard-C (สำหรับ 0C)
    if (stdCSheet) {
      const stdCData = stdCSheet.getDataRange().getValues();
      for (let i = 1; i < stdCData.length; i++) {
        const sku = String(stdCData[i][0]).trim(); // Col A
        const weightPerLine = parseFloat(stdCData[i][2]) || 0; // Col C
        weightMap[sku] = weightPerLine;
      }
    }

    // 2. ประมวลผลข้อมูลจาก Overdue Reservations
    const data = overdueSheet.getDataRange().getValues();
    const today = new Date();
    const dateStr = Utilities.formatDate(today, 'GMT+7', 'dd/MM/yyyy');
    
    let totalSKU = 0;
    let totalLines = 0;
    let totalWeight = 0;
    const skuSet = new Set();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const colH = String(row[7] || '').trim(); // Col H: Status
      
      if (colH === 'Inventory blocking') {
        const sku = String(row[3] || '').trim(); // Col D: Product ID (SKU)
        const qty = Math.abs(parseFloat(row[10]) || 0); // Col K: จำนวนเส้น
        
        if (sku && qty > 0) {
          skuSet.add(sku);
          totalLines += qty;
          
          // --- ส่วนคำนวณน้ำหนักใหม่ตามเงื่อนไข ---
          let weightPerLine = 0;
          
          if (sku.startsWith('0RT') || sku.startsWith('0SQ')) {
            weightPerLine = weightMap[sku] || 0;
          } else if (sku.startsWith('0C')) {
            weightPerLine = weightMap[sku] || 0;
          } else {
            // ถ้าไม่เข้าเงื่อนไขหรือหาไม่เจอ อาจจะใช้น้ำหนักจาก Col M เดิม (ถ้าต้องการ)
            // หรือปล่อยเป็น 0 ตามที่ตั้งไว้
            weightPerLine = 0; 
          }
          
          totalWeight += (qty * weightPerLine);
        }
      }
    }
    
    totalSKU = skuSet.size;
    
    // 3. บันทึกลงชีต Inventory_Blocking_Log
    let logSheet = ss.getSheetByName(INVENTORY_BLOCKING_LOG_SHEET);
    if (!logSheet) {
      logSheet = ss.insertSheet(INVENTORY_BLOCKING_LOG_SHEET);
      logSheet.appendRow(['วันที่', 'จำนวน SKU', 'จำนวนเส้น (Lines)', 'น้ำหนักคำนวณ (kg)']);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    }
    
    logSheet.appendRow([dateStr, totalSKU, totalLines, totalWeight.toFixed(2)]);
    
    Logger.log(`✅ บันทึกสำเร็จ (น้ำหนักมาตรฐาน): SKU: ${totalSKU} | Lines: ${totalLines} | Weight: ${totalWeight.toFixed(2)} kg`);
    
    return { 
      success: true, 
      message: 'บันทึกสำเร็จด้วยน้ำหนักมาตรฐาน',
      data: { date: dateStr, sku: totalSKU, lines: totalLines, weight: totalWeight.toFixed(2) }
    };
    
  } catch (e) {
    Logger.log('❌ Error: ' + e.toString());
    return { success: false, message: e.toString() };
  }
}
/**
 * 🆕 ฟังก์ชันบันทึกด้วยตนเอง (Manual Trigger) - เรียกจากหน้าเว็บได้
 */
function manualRecordInventoryBlocking() {
  return recordInventoryBlockingDaily();
}

/**
 * 🆕 ดึงข้อมูล Log ย้อนหลัง สำหรับแสดงผลในหน้าเว็บ
 */
function getInventoryBlockingLog(limit = 30) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName(INVENTORY_BLOCKING_LOG_SHEET);
    
    if (!logSheet || logSheet.getLastRow() < 2) {
      return { success: false, message: 'ยังไม่มีข้อมูล Log' };
    }
    
    const data = logSheet.getDataRange().getValues();
    const logs = [];
    
    // ดึงข้อมูลย้อนหลัง (ไม่รวม header)
    const startRow = Math.max(1, data.length - limit);
    
    for (let i = startRow; i < data.length; i++) {
      logs.push({
        date: data[i][0],
        sku: data[i][1],
        lines: data[i][2],
        weight: data[i][3]
      });
    }
    
    // เรียงจากใหม่ไปเก่า
    logs.reverse();
    
    return { success: true, data: logs };
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * 🆕 ลบ Trigger (ใช้เมื่อต้องการยกเลิกการบันทึกอัตโนมัติ)
 */
function removeDailyInventoryBlockingTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;

    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'recordInventoryBlockingDaily') {
        ScriptApp.deleteTrigger(trigger);
        removed++;
      }
    });

    return {
      success: true,
      message: `ลบ Trigger สำเร็จ (${removed} รายการ)`
    };
  } catch (e) {
    Logger.log('❌ removeDailyInventoryBlockingTrigger error: ' + e.message);
    return { success: false, message: e.toString() };
  }
}
/**
 * ✅ แก้ไขฟังก์ชันดึงข้อมูลแนวโน้ม Inventory Blocking (เน้นความถูกต้องของจำนวนเส้น)
 */
/**
 * ✅ แก้ไขฟังก์ชันดึงข้อมูล Blocking Trend ให้แสดงครบทุกวัน (ฉบับเต็ม)
 */
function getInventoryBlockingTrend(startDate, endDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const logSheet = ss.getSheetByName(INVENTORY_BLOCKING_LOG_SHEET);
    
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);
    
    // 1. ดึงข้อมูลจากชีตมาเก็บไว้ใน Map ก่อน (ถ้ามีชีต)
    const dataMap = {};
    if (logSheet && logSheet.getLastRow() >= 2) {
      const data = logSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        let rowDate = parseDateValue(data[i][0]);
        if (rowDate) {
          // ใช้ Key เป็นรูปแบบ yyyy-MM-dd เพื่อความแม่นยำในการเทียบ
          const key = Utilities.formatDate(rowDate, "GMT+7", "yyyy-MM-dd");
          dataMap[key] = {
            lines: parseFloat(String(data[i][2]).replace(/,/g, '')) || 0,
            weight: parseFloat(String(data[i][3]).replace(/,/g, '')) || 0
          };
        }
      }
    }

    // 2. วนลูปสร้างวันที่ตามช่วงที่เลือก (Date Range) เพื่อเติมข้อมูลให้ครบทุกวัน
    const result = { dates: [], weights: [], lines: [] };
    let loopDate = new Date(start);

    while (loopDate <= end) {
      const key = Utilities.formatDate(loopDate, "GMT+7", "yyyy-MM-dd");
      const label = Utilities.formatDate(loopDate, "GMT+7", "dd/MM");
      
      result.dates.push(label);
      
      // ถ้าวันนั้นมีข้อมูลใน Map ให้ใช้ค่าจริง ถ้าไม่มีให้เป็น 0
      if (dataMap[key]) {
        result.lines.push(dataMap[key].lines);
        result.weights.push(dataMap[key].weight);
      } else {
        result.lines.push(0);
        result.weights.push(0);
      }
      
      // เลื่อนวันไปวันถัดไป
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return result;
  } catch (e) {
    Logger.log("Error in getInventoryBlockingTrend: " + e.toString());
    return { dates: [], weights: [], lines: [] };
  }
}

// ============================================================
// INVENTORY CONTROL - FG CYCLE COUNT FUNCTIONS
// ============================================================

const TRANSACTION_FG_SHEET = 'Transection FG';
const DAILY_CYCLE_COUNT_FG_SHEET = 'Daily Cycle Count FG';

/**
 * ดึงรายการสินค้าจากชีต Counting (ยอดระบบ)
 * + เส้นต่อมัด → ดึงจากชีต Product Col C
 */
function getCountingProductList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // ดึง linesPerBundle จากชีต Product Col C
    const productSheet = ss.getSheetByName('Product');
    const lpbMap = {};
    const nameMap = {};
    if (productSheet && productSheet.getLastRow() >= 2) {
      const productData = productSheet.getDataRange().getValues();
      for (let i = 1; i < productData.length; i++) {
        const sku = String(productData[i][0] || '').trim();
        if (!sku) continue;
        lpbMap[sku] = Number(productData[i][2]) || 10; // Col C: เส้นต่อมัด
        nameMap[sku] = String(productData[i][1] || '').trim(); // Col B: ชื่อสินค้า
      }
    }
    
    const countingSheet = ss.getSheetByName('Counting');
    
    if (!countingSheet || countingSheet.getLastRow() < 2) {
      return { success: false, message: 'ไม่พบข้อมูลในชีต Counting' };
    }
    
    const data = countingSheet.getDataRange().getValues();
    const products = [];
    const seen = new Set();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      
      const sku = String(row[0]).trim();
      if (seen.has(sku)) continue;
      seen.add(sku);
      
      products.push({
        sku: sku,
        name: nameMap[sku] || String(row[1] || '').trim(), // ชื่อจาก Product sheet ก่อน ถ้าไม่มีใช้จาก Counting
        linesPerBundle: lpbMap[sku] || 10,                 // เส้นต่อมัดจาก Product Col C
        systemQty: Number(row[3]) || 0                     // Col D: ยอดระบบ (เส้น) ใน Counting
      });
    }
    
    return { success: true, products: products };
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * getFGProductList — ดึงรายการสินค้าจากชีต Product
 * systemQty ดึงจากชีต Counting (col B = SKU, col H = CW on-hand)
 * รวม SUM ทุก batch ของ SKU เดียวกัน
 */
function getFGProductList() {
  return _withCache('fgProductList', 300, function() {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const productSheet = ss.getSheetByName('Product');
      if (!productSheet || productSheet.getLastRow() < 2) {
        return { success: false, message: 'ไม่พบข้อมูลในชีต Product' };
      }
      const productData = productSheet.getDataRange().getValues();
      const stockMap = {};
      const countingSheet = ss.getSheetByName('Counting');
      if (countingSheet && countingSheet.getLastRow() >= 2) {
        const cData = countingSheet.getDataRange().getValues();
        for (let i = 1; i < cData.length; i++) {
          const sku = String(cData[i][1] || '').trim();
          const cwOnHand = Number(cData[i][7]) || 0;
          if (!sku) continue;
          stockMap[sku] = (stockMap[sku] || 0) + cwOnHand;
        }
      }
      const products = [];
      for (let i = 1; i < productData.length; i++) {
        const row = productData[i];
        const sku = String(row[0] || '').trim();
        if (!sku) continue;
        products.push({
          sku:            sku,
          name:           String(row[1] || '').trim(),
          linesPerBundle: Number(row[2]) || 10,
          systemQty:      stockMap[sku] || 0
        });
      }
      return { success: true, products: products };
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  });
}

/**
 * ✅ ฟังก์ชันใหม่: ดึงยอดผลิตจาก Transection FG ตามวันที่ cycleDate
 * เงื่อนไข: Col G (Index 6) = 'Production', Col L (Index 11) = 'Received'
 *           Col T (Index 19) = วันที่ตรงกับ cycleDate
 * คืนค่า: { sku: totalLines }
 */
function getProductionByDate(cycleDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Transection FG');
    if (!sheet || sheet.getLastRow() < 2) {
      Logger.log("⚠️ ไม่พบชีต Transection FG หรือยังไม่มีข้อมูล");
      return {};
    }

    const data = sheet.getDataRange().getValues();
    const result = {};

    const targetDate = new Date(cycleDate + 'T00:00:00');
    const tY = targetDate.getFullYear();
    const tM = targetDate.getMonth();
    const tD = targetDate.getDate();

    Logger.log("🔍 getProductionByDate: cycleDate = " + cycleDate + " (Y=" + tY + " M=" + (tM+1) + " D=" + tD + ")");

    for (let i = 1; i < data.length; i++) {
      const ref     = String(data[i][6]  || '').trim().toLowerCase(); // Col G
      const receipt = String(data[i][11] || '').trim().toLowerCase(); // Col L
      if (ref !== 'production' || receipt !== 'received') continue;

      // Col T (Index 19) = Transection Date (เพิ่มเมื่อบันทึก)
      const rawDate = data[i][19];
      let rowDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (isNaN(rowDate.getTime())) continue;
      if (rowDate.getFullYear() !== tY || rowDate.getMonth() !== tM || rowDate.getDate() !== tD) continue;

      const sku = String(data[i][4] || '').trim();  // Col E = Item number
      const qty = Math.abs(parseFloat(data[i][7]) || 0); // Col H = CW quantity

      if (sku && qty > 0) {
        result[sku] = (result[sku] || 0) + qty;
      }
    }

    Logger.log("✅ getProductionByDate: พบ " + Object.keys(result).length + " SKU");
    return result;

  } catch (e) {
    Logger.log("❌ getProductionByDate error: " + e.message);
    return {};
  }
}

/**
 * ดึงข้อมูล Product List และ System Stock สำหรับ FG Cycle Count
 */
function getFGCycleData(cycleDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. ดึง Product List
    const productSheet = ss.getSheetByName('Product');
    const products = [];
    if (productSheet && productSheet.getLastRow() >= 2) {
      const productData = productSheet.getDataRange().getValues();
      for (let i = 1; i < productData.length; i++) {
        const row = productData[i];
        if (!row[0]) continue;
        products.push({
          sku: String(row[0]).trim(),
          name: String(row[1] || '').trim(),
          linesPerBundle: Number(row[2]) || 10
        });
      }
    }
    
    // 2. ดึง System Stock จากชีต Counting (Col B=SKU, Col H=CW on-hand) SUM group by SKU
    const countingSheet = ss.getSheetByName('Counting');
    const _stockMap = {};
    if (countingSheet && countingSheet.getLastRow() >= 2) {
      const cData = countingSheet.getDataRange().getValues();
      for (let i = 1; i < cData.length; i++) {
        const sku = String(cData[i][1] || '').trim(); // Col B = Item number
        const qty = parseFloat(cData[i][7]) || 0;    // Col H = CW on-hand
        if (!sku) continue;
        _stockMap[sku] = (_stockMap[sku] || 0) + qty;
      }
    }
    const systemStock = Object.entries(_stockMap).map(([sku, qty]) => ({ sku, qty }));

    // 3. ✅ ดึงยอด Hold สะสมจากชีต Overdue Reservations (เหมือนหน้า Dashboard)
    const holdMap = {};
    const overdueSheet = ss.getSheetByName('Overdue Reservations');
    if (overdueSheet && overdueSheet.getLastRow() >= 2) {
      const oData = overdueSheet.getDataRange().getValues();
      for (let i = 1; i < oData.length; i++) {
        const status = String(oData[i][7] || "").trim(); // Col H
        if (status === "Inventory blocking") {
          const sku = String(oData[i][3] || "").trim(); // Col D
          const qty = Math.abs(parseFloat(oData[i][10])) || 0; // Col K
          if (sku) holdMap[sku] = (holdMap[sku] || 0) + qty;
        }
      }
    }
    
    // ✅ เพิ่ม: ดึงยอดผลิตของวันนั้นจาก Transection FG
    const productionMap = getProductionByDate(cycleDate);
    
    return {
      success: true,
      products: products,
      systemStock: systemStock,
      systemHoldMap: holdMap, // ✅ ส่งยอด Hold กลับไปให้หน้าเว็บ
      productionMap: productionMap, // ✅ ส่งยอดผลิตกลับไปด้วย
      cycleDate: cycleDate
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
/**
 * ดึงยอด Hold สะสมจากชีต Overdue Reservations
 */
function getSystemHoldMap() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Overdue Reservations');
    const holdMap = {};
    if (!sheet || sheet.getLastRow() < 2) return holdMap;
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const sku = String(data[i][3] || "").trim(); // Col D
      const refType = String(data[i][7] || "").trim(); // Col H
      const qtyLines = Math.abs(parseFloat(data[i][10])) || 0; // Col K
      
      if (refType === "Inventory blocking" && sku) {
        holdMap[sku] = (holdMap[sku] || 0) + qtyLines;
      }
    }
    return holdMap;
  } catch (e) { return {}; }
}
/**
 * ✅ บันทึกผล KPI ลงชีต "KPI Log"
 * รองรับทั้ง FG และ SEMI
 * payload: { type, cycleDate, checkerKPI, prdKPI, tS, tL, pS, pL, cES, cEL, pES, pEL, dS, dL }
 */
function saveKPIResult(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const KPI_SHEET = 'KPI Log';
    let sheet = ss.getSheetByName(KPI_SHEET);
    
    if (!sheet) {
      sheet = ss.insertSheet(KPI_SHEET);
      const headers = [
        'บันทึกเมื่อ', 'วันที่ Cycle', 'ประเภท',
        'SKU ทั้งหมด', 'เส้น/แถบ ทั้งหมด',
        'Production SKU', 'Production เส้น/แถบ',
        'Checker Error SKU', 'Checker Error เส้น/แถบ',
        'PRD Error SKU', 'PRD Error เส้น/แถบ',
        'Diff SKU', 'Diff เส้น/แถบ',
        'KPI Checker (%)', 'KPI PRD (%)'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight('bold')
           .setBackground('#1e1b4b')
           .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    const nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      nowStr,
      payload.cycleDate  || '',
      payload.type       || 'FG',
      Number(payload.tS) || 0,
      Number(payload.tL) || 0,
      Number(payload.pS) || 0,
      Number(payload.pL) || 0,
      Number(payload.cES)|| 0,
      Number(payload.cEL)|| 0,
      Number(payload.pES)|| 0,
      Number(payload.pEL)|| 0,
      Number(payload.dS) || 0,
      Number(payload.dL) || 0,
      Number(payload.checkerKPI) || 0,
      Number(payload.prdKPI)     || 0
    ]);
    
    return { success: true, message: 'บันทึก KPI สำเร็จลงชีต "' + KPI_SHEET + '"' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * ✅ ฟังก์ชันบันทึกผล FG Cycle Count และ Transaction FG (ฉบับสมบูรณ์)
 * ปรับปรุง: เพิ่มการบันทึกคอลัมน์ 'สถานะ' และ 'หมายเหตุ' ต่อท้ายประวัติการตรวจนับ
 */
function saveFGCycleCount(cycleRows, excelRows, cycleDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const nowStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    const todayDateObj = new Date(); 
    let savedMsg = [];
    
    // ============ ส่วนเตรียมข้อมูล QC Standard ============
    let qcMap = {};
    const qcSheet = ss.getSheetByName('TST QC Standard');
    if (qcSheet && qcSheet.getLastRow() >= 2) {
      const qcData = qcSheet.getDataRange().getValues();
      for (let i = 1; i < qcData.length; i++) {
        const sku = String(qcData[i][0]).trim();
        if (sku) {
          qcMap[sku] = {
            min: parseFloat(qcData[i][2]) || 0,
            max: parseFloat(qcData[i][3]) || 0
          };
        }
      }
    }

    // ============ ส่วนที่ 1: บันทึก Transaction FG ============
    if (excelRows && excelRows.length > 0) {
      
      const processedExcelRows = excelRows.map((row, index) => {
        if (index === 0) {
          return [...row, 'Transection Date', 'น้ำหนักต่อเส้น', 'Min Weight', 'Max Weight', 'สถานะน้ำหนัก'];
        }

        const forceParseDate = (strVal) => {
          // กรณี raw:true → วันที่จาก XLSX จะเป็น number (Excel serial date)
          if (typeof strVal === 'number') {
            // Excel serial date: วันที่ 1 ม.ค. 1900 = serial 1
            const excelEpoch = new Date(1899, 11, 30); // 30 Dec 1899
            const ms = strVal * 24 * 60 * 60 * 1000;
            return new Date(excelEpoch.getTime() + ms);
          }
          if (typeof strVal !== 'string' || !strVal.includes('/')) {
            return strVal;
          }
          const parts = strVal.trim().split(' ');
          const dParts = parts[0].split('/'); // [M, D, YYYY]

          if (dParts.length === 3) {
            const month = parseInt(dParts[0]); 
            const day   = parseInt(dParts[1]); 
            const year  = parseInt(dParts[2]); 
            let hr = 0, min = 0;
            if (parts[1]) {
              const tParts = parts[1].split(':');
              hr  = parseInt(tParts[0]) || 0;
              min = parseInt(tParts[1]) || 0;
            }
            const pad = (n) => String(n).padStart(2, '0');
            const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hr)}:${pad(min)}:00+07:00`;
            return new Date(isoStr);
          }
          return strVal;
        };

        if (row[0]) row[0] = forceParseDate(row[0]);
        if (row[1]) row[1] = forceParseDate(row[1]);

        const sku = String(row[4] || "").trim();
        // ลบ comma ออกก่อน parseFloat เพื่อรองรับกรณี cell ถูก format เป็น "1,237.00"
        const parseNum = (v) => Math.abs(parseFloat(String(v || '').replace(/,/g, '')) || 0);
        const cwQty  = parseNum(row[7]);   // Col H = จำนวนเส้น
        const weight = parseNum(row[9]);   // Col J = น้ำหนัก

        let weightPerLine = 0;
        if (cwQty > 0) weightPerLine = weight / cwQty;

        const qc = qcMap[sku] || { min: 0, max: 0 };
        const minWeight = qc.min;
        const maxWeight = qc.max;

        let weightStatus = "-";
        if (weightPerLine > 0 && (minWeight > 0 || maxWeight > 0)) {
          weightStatus = weightPerLine > maxWeight ? "Over" : (weightPerLine < minWeight ? "Under" : "OK");
        }

        return [
          ...row,
          todayDateObj,
          weightPerLine > 0 ? parseFloat(weightPerLine.toFixed(2)) : 0,
          minWeight > 0 ? parseFloat(minWeight.toFixed(2)) : '',
          maxWeight > 0 ? parseFloat(maxWeight.toFixed(2)) : '',
          weightStatus
        ];
      });

      let txSheet = ss.getSheetByName(TRANSACTION_FG_SHEET);
      if (!txSheet) {
        txSheet = ss.insertSheet(TRANSACTION_FG_SHEET);
      }
      
      if (processedExcelRows[0]) {
        txSheet.getRange(1, 1, 1, processedExcelRows[0].length).setValues([processedExcelRows[0]]);
        txSheet.getRange(1, 1, 1, processedExcelRows[0].length)
          .setFontWeight('bold')
          .setBackground('#0f172a')
          .setFontColor('#ffffff');
      }
      
      const dataRows = processedExcelRows.slice(1).filter(r => r.some(c => c !== ''));
      if (dataRows.length > 0) {
        const startRow = txSheet.getLastRow() + 1;
        const numCols = dataRows[0].length;
        const sanitizedRows = dataRows.map(row => row.map(cell => (cell instanceof Date ? cell : _sanitizeSheet(cell))));
        txSheet.getRange(startRow, 1, sanitizedRows.length, numCols).setValues(sanitizedRows);
        txSheet.getRange(startRow, 1, dataRows.length, 1).setNumberFormat("dd/MM/yyyy HH:mm");
        txSheet.getRange(startRow, 2, dataRows.length, 1).setNumberFormat("dd/MM/yyyy");
        
        const transectionColIndex = excelRows[0].length + 1;
        txSheet.getRange(startRow, transectionColIndex, dataRows.length, 1).setNumberFormat("dd/MM/yyyy");

        savedMsg.push(`Transaction FG: ${dataRows.length} แถว`);
      }
    }
    
    // ============ ส่วนที่ 2: บันทึก Daily Cycle Count FG (ปรับปรุงใหม่) ============
    let cycleSheet = ss.getSheetByName(DAILY_CYCLE_COUNT_FG_SHEET_NAME) || ss.getSheetByName('Daily Cycle Count FG');
    if (!cycleSheet) {
      cycleSheet = ss.insertSheet(DAILY_CYCLE_COUNT_FG_SHEET_NAME || 'Daily Cycle Count FG');
      const headers = [
        'บันทึกเมื่อ', 'วันที่ Cycle', 'รหัสสินค้า', 'ชื่อสินค้า',
        'เส้นต่อมัด', 'กองที่1(มัด)', 'กองที่2(มัด)', 'เศษที่1(เส้น)', 'เศษที่2(เส้น)', 'Hold(เส้น)',
        'นับจริง(เส้น)', 'ระบบ(เส้น)', 'ส่วนต่าง(เส้น)', 'สถานะ', 'หมายเหตุ',
        'กอง1_แหล่ง', 'กอง2_แหล่ง', 'เศษ1_แหล่ง', 'เศษ2_แหล่ง'
      ];
      cycleSheet.appendRow(headers);
      cycleSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#0d9488')
        .setFontColor('#ffffff');
    }
    
    if (cycleRows && cycleRows.length > 0) {
      const cycleData = cycleRows.map(r => [
        nowStr,
        r.date,
        r.sku,
        r.name,
        r.linesPerBundle,
        Number(r.pile1)  || 0,
        Number(r.pile2)  || 0,
        Number(r.scrap1) || 0,
        Number(r.scrap2) || 0,
        Number(r.hold)   || 0,
        Number(r.actual)    || 0,
        Number(r.systemQty) || 0,
        Number(r.diff)      || 0,
        r.status || 'ปกติ',
        r.remark || '',
        Number(r.pile1_terms)  || 1,  // col 15: กอง1_แหล่ง
        Number(r.pile2_terms)  || 1,  // col 16: กอง2_แหล่ง
        Number(r.scrap1_terms) || 1,  // col 17: เศษ1_แหล่ง
        Number(r.scrap2_terms) || 1   // col 18: เศษ2_แหล่ง
      ]);
      
      const startRow = cycleSheet.getLastRow() + 1;
      const sanitizedCycle = cycleData.map(row => row.map(cell => (typeof cell === 'number' || cell instanceof Date ? cell : _sanitizeSheet(cell))));
      cycleSheet.getRange(startRow, 1, sanitizedCycle.length, sanitizedCycle[0].length).setValues(sanitizedCycle);
      savedMsg.push(`Daily Cycle Count FG: ${cycleData.length} รายการ`);
    }
    
    return {
      success: true,
      message: savedMsg.join(' | ') || 'บันทึกสำเร็จ (ไม่มีข้อมูลใหม่)'
    };
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
/**
 * นำเข้าข้อมูล Inventory แบบ Batch
 * รองรับ: counting, onhand_fg, onhand_semi
 * - จำนวนเส้นต่อมัด → ดึงจากชีต Product Col C
 */
function importInventoryData(rows, dataType) {
  try {
    if (!rows || rows.length < 2) {
      return { success: false, message: 'ไม่พบข้อมูลในไฟล์' };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Map dataType → ชื่อชีตปลายทาง
    const sheetMap = {
      'counting':             'Counting',
      'onhand_fg':            'ON-HAND FG',
      'onhand_semi':          'ON-HAND SEMI',
      'transection_fg':       'Transection FG',
      'transection_semi':     'Transection SEMI',
      'inventory_blocking':   'Overdue Reservations'
    };

    const targetSheetName = sheetMap[dataType];
    if (!targetSheetName) {
      return { success: false, message: 'ไม่รู้จักประเภทข้อมูล: ' + dataType };
    }
    
    // ดึง linesPerBundle จากชีต Product (Col C)
    const productSheet = ss.getSheetByName('Product');
    const lpbMap = {}; // sku → linesPerBundle
    if (productSheet && productSheet.getLastRow() >= 2) {
      const productData = productSheet.getDataRange().getValues();
      for (let i = 1; i < productData.length; i++) {
        const sku = String(productData[i][0] || '').trim();
        const lpb = Number(productData[i][2]) || 0;
        if (sku) lpbMap[sku] = lpb;
      }
    }

    // ดึง MinWeight / MaxWeight จากชีต TST QC Standard
    // Col A=SKU, Col C=MinWeight(index 2), Col D=MaxWeight(index 3)
    const qcMap = {}; // sku → { minW, maxW }
    if (dataType === 'transection_fg') {
      const qcSheet = ss.getSheetByName('TST QC Standard');
      if (qcSheet && qcSheet.getLastRow() >= 2) {
        const qcData = qcSheet.getRange(2, 1, qcSheet.getLastRow()-1, 4).getValues();
        qcData.forEach(function(r) {
          const s = String(r[0]||'').trim();
          if (s) qcMap[s] = { minW: r[2], maxW: r[3] };
        });
      }
    }
    
    let targetSheet = ss.getSheetByName(targetSheetName);

    if (!targetSheet) {
      targetSheet = ss.insertSheet(targetSheetName);
    }

    // กรองแถวข้อมูล (ข้าม header + แถวว่าง)
    const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''));

    if (dataRows.length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลในไฟล์ (หลังจากข้าม Header)' };
    }

    // ── วันที่นำเข้าวันนี้ (GMT+7) สำหรับเขียนลง Col T ──────────────────────
    const importDateStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
    const COL_T_IDX = 19; // index 0-based ของ Column T (คอลัมน์ที่ 20)

    // ── โหมดการบันทึก ─────────────────────────────────────────────────────
    // transection_fg  → Append ต่อท้ายข้อมูลเดิม (สะสมประวัติ)
    // ทุกประเภทอื่น (counting, onhand_fg, onhand_semi, transection_semi)
    //               → ลบข้อมูลเก่าออกทั้งหมด แล้วเขียนใหม่
    const isAppendMode = (dataType === 'transection_fg');

    if (!isAppendMode) {
      // ลบแถวข้อมูลทั้งหมด (แถว 2 เป็นต้นไป) ให้ชีตสะอาดจริงๆ
      const lastExisting = targetSheet.getLastRow();
      if (lastExisting >= 2) {
        targetSheet.deleteRows(2, lastExisting - 1);
      }
      // clear แถว 1 (header เดิม) ด้วย เพื่อเขียน header ใหม่
      targetSheet.clearContents();
    }

    // เขียน Header (แถวที่ 1) — เฉพาะเมื่อ clear หรือ sheet ยังว่าง
    const needHeader = !isAppendMode || targetSheet.getLastRow() < 1;
    if (needHeader) {
      const headerRow = rows[0] ? [...rows[0]] : [];
      if (dataType === 'counting' || dataType === 'onhand_fg') {
        headerRow.push('เส้นต่อมัด (จากProduct)');
      }
      // Pad header ถึง col T แล้วใส่ label
      while (headerRow.length <= COL_T_IDX) headerRow.push('');
      if (!headerRow[COL_T_IDX] || String(headerRow[COL_T_IDX]).trim() === '') {
        headerRow[COL_T_IDX] = 'วันที่นำเข้า';
      }
      // สำหรับ transection_fg: เพิ่ม header col U/V/W/X
      if (dataType === 'transection_fg') {
        while (headerRow.length <= 23) headerRow.push('');
        headerRow[20] = 'MinWeight';
        headerRow[21] = 'MaxWeight';
        headerRow[22] = 'น้ำหนัก/เส้น (J÷H)';
        headerRow[23] = 'สถานะน้ำหนัก';
      }
      targetSheet.getRange(1, 1, 1, headerRow.length)
        .setValues([headerRow])
        .setFontWeight('bold')
        .setBackground('#1e293b')
        .setFontColor('#ffffff');
    }

    // helper: parse ตัวเลขที่มีทั้ง comma และทศนิยม เช่น "1,234.56" หรือ "1234,56"
    function parseNum(v) {
      if (v === null || v === undefined || v === '') return 0;
      if (typeof v === 'number') return v;
      return parseFloat(String(v).replace(/,/g, '')) || 0;
    }

    // เพิ่ม linesPerBundle ให้แต่ละแถว (สำหรับ counting / onhand_fg)
    // และเขียนวันที่นำเข้าลง col T ทุกแถว ทุกประเภทไฟล์
    // สำหรับ transection_fg เพิ่ม col U/V/W/X (QC weight check)
    const processedRows = dataRows.map(row => {
      const newRow = [...row];
      if (dataType === 'counting' || dataType === 'onhand_fg') {
        const sku = String(row[0] || '').trim(); // Col A = SKU
        newRow.push(lpbMap[sku] || '');
      }
      // Pad ถึง col T แล้วเขียนวันที่นำเข้า (ไม่แตะ col A/B)
      while (newRow.length <= COL_T_IDX) newRow.push('');
      newRow[COL_T_IDX] = importDateStr;

      // ── Transection FG เพิ่ม col U/V/W/X ───────────────────────────────
      if (dataType === 'transection_fg') {
        const sku   = String(row[4] || '').trim(); // Col E = Item number
        const qc    = qcMap[sku] || {};
        const minW  = parseNum(qc.minW); // col U
        const maxW  = parseNum(qc.maxW); // col V
        const cwQty = parseNum(row[7]);        // col H = CW quantity
        const qty   = Math.abs(parseNum(row[9])); // col J = Quantity (ใช้ค่าสัมบูรณ์ — J มีได้ทั้ง + และ -)
        const ratio = (cwQty !== 0) ? (qty / Math.abs(cwQty)) : ''; // col W = |J|÷|H|
        let status  = ''; // col X
        if (ratio !== '' && minW > 0 && maxW > 0) {
          if (ratio < minW) status = 'Under';
          else if (ratio > maxW) status = 'Over';
          else status = 'OK';
        }
        // เขียนลง index 20-23 (col U-X)
        while (newRow.length <= 23) newRow.push('');
        newRow[20] = (minW > 0) ? minW : '';  // col U
        newRow[21] = (maxW > 0) ? maxW : '';  // col V
        newRow[22] = (ratio !== '') ? Math.round(ratio * 10000) / 10000 : ''; // col W (4 ทศนิยม)
        newRow[23] = status;                   // col X
      }

      return newRow;
    });

    // กำหนดแถวเริ่มต้นเขียน
    const startRow = isAppendMode
      ? Math.max(2, targetSheet.getLastRow() + 1) // append: ต่อจากแถวสุดท้าย
      : 2; // clear mode: เริ่มจากแถว 2 เสมอ
    const numCols = Math.max(...processedRows.map(r => r.length));

    // Normalize row length
    const normalizedRows = processedRows.map(r => {
      while (r.length < numCols) r.push('');
      return r;
    });

    const sanitizedRows = normalizedRows.map(row => row.map(cell => (typeof cell === 'number' || cell instanceof Date ? cell : _sanitizeSheet(cell))));
    targetSheet.getRange(startRow, 1, sanitizedRows.length, numCols).setValues(sanitizedRows);
    
    return {
      success: true,
      message: `นำเข้า ${normalizedRows.length} แถว → ชีต "${targetSheetName}" สำเร็จ`
    };
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// INVENTORY CONTROL — NEW BACKEND FUNCTIONS (v8.5+)
// ============================================================

/**
 * getInventoryCompareData(type)
 * type='fg':   อ่าน Counting + ON-HAND FG → เทียบยอดระบบ + counting
 * type='semi': อ่าน ON-HAND SEMI → แสดงรายละเอียด Batch+Serial
 */
function getInventoryCompareData(type) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (type === 'fg') {
      // ─── อ่าน Counting Sheet ─────────────────────────────────
      // Cols (0-based): B=Item number(1), E=Warehouse(4), H=CW on-hand(7), L=On-hand KG(11)
      const countingSheet = ss.getSheetByName('Counting');
      const cntMap = {}; // key = sku+'|'+wh → { sysLine, sysKg }
      if (countingSheet && countingSheet.getLastRow() >= 2) {
        const cData = countingSheet.getRange(2, 1, countingSheet.getLastRow()-1, 12).getValues();
        cData.forEach(function(row) {
          const sku = String(row[1] || '').trim();
          const wh  = String(row[4] || '').trim();
          const cwOnhand = Number(row[7]) || 0;
          const kgOnhand = Number(row[11]) || 0;
          if (!sku) return;
          const key = sku + '|' + wh;
          if (!cntMap[key]) cntMap[key] = { sku: sku, wh: wh, sysLine: 0, sysKg: 0 };
          cntMap[key].sysLine += cwOnhand;
          cntMap[key].sysKg   += kgOnhand;
        });
      }
      // ─── อ่าน ON-HAND FG Sheet ──────────────────────────────
      // Cols (0-based): A=Item number(0), D=CW physical inventory(3), F=CW physical reserved(5),
      //                  J=Physical inventory KG(9), M=Warehouse(12), N=Available physical(13)
      const onhandFgSheet = ss.getSheetByName('ON-HAND FG');
      const fgMap = {}; // key = sku+'|'+wh → { reserved, counted }
      if (onhandFgSheet && onhandFgSheet.getLastRow() >= 2) {
        const fgData = onhandFgSheet.getRange(2, 1, onhandFgSheet.getLastRow()-1, 14).getValues();
        fgData.forEach(function(row) {
          const sku      = String(row[0]  || '').trim();
          const wh       = String(row[12] || '').trim();
          const cwPhys   = Number(row[3])  || 0; // CW physical inventory (เส้น)
          const cwRes    = Number(row[5])  || 0; // CW physical reserved
          const cwAvail  = Number(row[13]) || 0; // CW available physical
          if (!sku) return;
          const key = sku + '|' + wh;
          if (!fgMap[key]) fgMap[key] = { sku: sku, wh: wh, counted: 0, reserved: 0 };
          fgMap[key].counted  += cwPhys;
          fgMap[key].reserved += cwRes;
        });
      }
      // ─── Merge ────────────────────────────────────────────────
      const result = [];
      const seen = {};
      Object.values(cntMap).forEach(function(item) {
        const key = item.sku + '|' + item.wh;
        seen[key] = true;
        const fg = fgMap[key] || {};
        result.push({
          sku:      item.sku,
          wh:       item.wh,
          sysLine:  item.sysLine,
          sysKg:    Math.round(item.sysKg * 100) / 100,
          reserved: fg.reserved || 0,
          counted:  fg.counted !== undefined ? fg.counted : null
        });
      });
      // สินค้าที่อยู่ใน ON-HAND แต่ไม่มีใน Counting
      Object.values(fgMap).forEach(function(item) {
        const key = item.sku + '|' + item.wh;
        if (!seen[key]) {
          result.push({ sku: item.sku, wh: item.wh, sysLine: 0, sysKg: 0, reserved: item.reserved||0, counted: item.counted });
        }
      });
      return { success: true, data: result, timestamp: new Date().toISOString() };

    } else if (type === 'semi') {
      // ─── อ่าน ON-HAND SEMI Sheet ────────────────────────────
      // Cols (0-based): A=Item number(0), C=Warehouse(2), D=Batch(3), E=Serial(4),
      //                  F=Physical inventory KG(5), G=Available physical(6),
      //                  K=CW physical inventory(10), T=CW physical reserved(19)
      const semiSheet = ss.getSheetByName('ON-HAND SEMI');
      const result = [];
      if (semiSheet && semiSheet.getLastRow() >= 2) {
        const sData = semiSheet.getRange(2, 1, semiSheet.getLastRow()-1, 20).getValues();
        sData.forEach(function(row) {
          const sku    = String(row[0]  || '').trim();
          const wh     = String(row[2]  || '').trim();
          const batch  = String(row[3]  || '').trim();
          const serial = String(row[4]  || '').trim();
          const physKg = Number(row[5])  || 0;
          const availKg= Number(row[6])  || 0;
          const cwPhys = Number(row[10]) || 0;
          const cwRes  = Number(row[19]) || 0;
          if (!sku) return;
          result.push({ sku: sku, wh: wh, batch: batch, serial: serial,
            physKg: Math.round(physKg*100)/100, availKg: Math.round(availKg*100)/100,
            cwPhys: cwPhys, cwRes: cwRes });
        });
      }
      return { success: true, data: result, timestamp: new Date().toISOString() };
    }
    return { success: false, message: 'ไม่รู้จัก type: ' + type };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * getCycleCountItems(dateStr, type)
 * ดึงรายการเคลื่อนไหวตามวันที่ จาก Transection FG หรือ Transection SEMI
 */
function getCycleCountItems(dateStr, type) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const targetDate = parseDateValue(dateStr);
    if (!targetDate) return { success: false, message: 'วันที่ไม่ถูกต้อง: ' + dateStr };

    // ── helper: ตัดอักษรไทยออก เหลือแต่ภาษาอังกฤษ ──────────────────────────
    function stripThai(str) {
      return String(str||'').replace(/[\u0E00-\u0E7F]+/g, '').replace(/\s{2,}/g, ' ').trim();
    }

    // ดึง lpb + ชื่อภาษาอังกฤษ (col B) จาก Product Sheet
    const lpbMap  = {}; // sku → linesPerBundle
    const nameMap = {}; // sku → ชื่อ English-only จาก col B
    const productSheet = ss.getSheetByName('Product');
    if (productSheet && productSheet.getLastRow() >= 2) {
      const pData = productSheet.getRange(2, 1, productSheet.getLastRow()-1, 3).getValues();
      pData.forEach(function(row) {
        const sku = String(row[0]||'').trim();
        if (!sku) return;
        lpbMap[sku]  = Number(row[2]) || 0;
        nameMap[sku] = stripThai(row[1]); // col B = Product name → ตัด Thai
      });
    }

    if (type === 'fg') {
      // Transection FG cols (0-based):
      //   D=Warehouse(3), E=Item number(4), F=Product name(5),
      //   H=CW quantity(7), L=Receipt(11), M=Issue(12), T=วันที่นำเข้า(19)
      // ✅ Filter ด้วย Col T (วันที่นำเข้า) — ไม่แตะ col A/B จากต้นฉบับ
      const fgSheet = ss.getSheetByName('Transection FG');
      if (!fgSheet || fgSheet.getLastRow() < 2) return { success: true, items: [], date: dateStr };
      const fgData = fgSheet.getRange(2, 1, fgSheet.getLastRow()-1, 20).getValues(); // อ่านถึง col T
      const grouped = {}; // sku+'|'+wh → { sku, name, wh, receiptQty, issueQty }
      fgData.forEach(function(row) {
        const rowDate = parseDateValue(row[19]); // Col T = วันที่นำเข้า (index 19)
        if (!rowDate) return;
        // Compare only date portion
        if (rowDate.toDateString() !== targetDate.toDateString()) return;
        const wh    = String(row[3] || '').trim();
        const sku   = String(row[4] || '').trim();
        // ✅ ใช้ชื่อจาก Product sheet col B (English-only) แทน col F ของ Transection
        const name  = nameMap[sku] || stripThai(row[5]);
        const cwQty = Number(row[7]) || 0;
        const receipt = String(row[11]||'').trim().toLowerCase();
        const issue   = String(row[12]||'').trim().toLowerCase();
        if (!sku) return;
        const key = sku + '|' + wh;
        if (!grouped[key]) grouped[key] = { sku: sku, name: name, wh: wh, receiptQty: 0, issueQty: 0 };
        if (receipt === 'received' || receipt === 'receipt') grouped[key].receiptQty += cwQty;
        else if (issue === 'issued' || issue === 'issue')   grouped[key].issueQty  += cwQty;
        else grouped[key].receiptQty += cwQty; // default to receipt if unclear
      });
      // Build sort order from Product sheet
      const fgOrderMap = {};
      const productSheet2 = ss.getSheetByName('Product');
      if (productSheet2 && productSheet2.getLastRow() >= 2) {
        const pRows = productSheet2.getRange(2, 1, productSheet2.getLastRow()-1, 1).getValues();
        pRows.forEach(function(r, i) { const s = String(r[0]||'').trim(); if (s) fgOrderMap[s] = i; });
      }
      const items = Object.values(grouped).map(function(r) {
        return Object.assign(r, { lpb: lpbMap[r.sku]||0, systemQty: 0 });
      }).sort(function(a, b) {
        const oa = (fgOrderMap[a.sku] !== undefined) ? fgOrderMap[a.sku] : 99999;
        const ob = (fgOrderMap[b.sku] !== undefined) ? fgOrderMap[b.sku] : 99999;
        return oa - ob;
      });
      // Try to get systemQty from Counting sheet
      const countingSheet = ss.getSheetByName('Counting');
      if (countingSheet && countingSheet.getLastRow() >= 2) {
        const cData = countingSheet.getRange(2, 1, countingSheet.getLastRow()-1, 12).getValues();
        const sysMap = {};
        cData.forEach(function(row) {
          const sku = String(row[1]||'').trim();
          const wh  = String(row[4]||'').trim();
          const qty = Number(row[7])||0;
          const key = sku + '|' + wh;
          if (!sysMap[key]) sysMap[key] = 0;
          sysMap[key] += qty;
        });
        items.forEach(function(r) {
          const key = r.sku + '|' + r.wh;
          r.systemQty = sysMap[key] || 0;
        });
      }
      return { success: true, items: items, date: dateStr };

    } else if (type === 'semi') {
      // Transection SEMI cols (0-based):
      //   D=Warehouse(3), G=Item number(6), H=Product name(7),
      //   I=Issue(8), J=Quantity KG(9), T=วันที่นำเข้า(19), U=Receipt(20)
      // ✅ Filter ด้วย Col T (วันที่นำเข้า) — ไม่แตะ col A/B จากต้นฉบับ
      const semiSheet = ss.getSheetByName('Transection SEMI');
      if (!semiSheet || semiSheet.getLastRow() < 2) return { success: true, items: [], date: dateStr };
      const semiData = semiSheet.getRange(2, 1, semiSheet.getLastRow()-1, 21).getValues();
      const grouped = {};
      semiData.forEach(function(row) {
        const rowDate = parseDateValue(row[19]); // Col T = วันที่นำเข้า (index 19)
        if (!rowDate) return;
        if (rowDate.toDateString() !== targetDate.toDateString()) return;
        const wh    = String(row[3]  || '').trim();
        const sku   = String(row[6]  || '').trim();
        const name  = nameMap[sku] || stripThai(row[7]); // ✅ ชื่อ English-only จาก Product col B
        const issue  = Number(row[8])  || 0;
        const qty    = Number(row[9])  || 0;
        const receipt= Number(row[20]) || 0;
        if (!sku) return;
        const key = sku + '|' + wh;
        if (!grouped[key]) grouped[key] = { sku: sku, name: name, wh: wh, receiptQty: 0, issueQty: 0, physKg: 0 };
        grouped[key].receiptQty += receipt;
        grouped[key].issueQty   += issue;
      });
      // Get physKg from ON-HAND SEMI
      const onhandSemiSheet = ss.getSheetByName('ON-HAND SEMI');
      if (onhandSemiSheet && onhandSemiSheet.getLastRow() >= 2) {
        const oData = onhandSemiSheet.getRange(2, 1, onhandSemiSheet.getLastRow()-1, 7).getValues();
        const physMap = {};
        oData.forEach(function(row) {
          const sku = String(row[0]||'').trim();
          const wh  = String(row[2]||'').trim();
          const kg  = Number(row[5])||0;
          const key = sku + '|' + wh;
          if (!physMap[key]) physMap[key] = 0;
          physMap[key] += kg;
        });
        Object.values(grouped).forEach(function(r) {
          r.physKg = physMap[r.sku+'|'+r.wh] || 0;
        });
      }
      // ── Join SEMI SOON FG master → ได้ FG1/FG2 info ──────────────────────
      const semiMasterSheet2 = ss.getSheetByName('SEMI SOON FG');
      const semiMasterMap = {};
      if (semiMasterSheet2 && semiMasterSheet2.getLastRow() >= 2) {
        const mData = semiMasterSheet2.getRange(2, 1, semiMasterSheet2.getLastRow()-1, 6).getValues();
        mData.forEach(function(row) {
          const sk = String(row[0]||'').trim();
          if (!sk) return;
          semiMasterMap[sk] = {
            fg1Sku:  String(row[2]||'').trim(),
            fg1Name: String(row[3]||'').trim(),
            fg2Sku:  String(row[4]||'').trim(),
            fg2Name: String(row[5]||'').trim()
          };
        });
      }
      // ── นับ systemQty จาก ON-HAND SEMI (จำนวนแถวต่อ SEMI SKU = จำนวนแถบ) ──
      const semiSysQtyMap = {};
      if (onhandSemiSheet && onhandSemiSheet.getLastRow() >= 2) {
        const sysData = onhandSemiSheet.getRange(2, 1, onhandSemiSheet.getLastRow()-1, 1).getValues();
        sysData.forEach(function(row) {
          const sk = String(row[0]||'').trim();
          if (!sk) return;
          semiSysQtyMap[sk] = (semiSysQtyMap[sk]||0) + 1;
        });
      }

      // Sort SEMI items by Product sheet order
      const semiOrderMap = {};
      const productSheet3 = ss.getSheetByName('Product');
      if (productSheet3 && productSheet3.getLastRow() >= 2) {
        const pRows3 = productSheet3.getRange(2, 1, productSheet3.getLastRow()-1, 1).getValues();
        pRows3.forEach(function(r, i) { const s = String(r[0]||'').trim(); if (s) semiOrderMap[s] = i; });
      }
      const semiItems = Object.values(grouped).sort(function(a, b) {
        const oa = (semiOrderMap[a.sku] !== undefined) ? semiOrderMap[a.sku] : 99999;
        const ob = (semiOrderMap[b.sku] !== undefined) ? semiOrderMap[b.sku] : 99999;
        return oa - ob;
      });

      // ── Restructure: ใส่ itemSemi, FG1/FG2 info, systemQty ──────────────
      semiItems.forEach(function(r) {
        const master    = semiMasterMap[r.sku] || {};
        r.itemSemi      = r.sku;                           // SEMI SKU (รหัสฟิล์ม)
        r.sku           = master.fg1Sku  || '';            // FG1 SKU → คอลัมน์ Item number Product 1
        r.name          = master.fg1Name || r.name;        // FG1 Name
        r.sku2          = master.fg2Sku  || '';            // FG2 SKU
        r.name2         = master.fg2Name || '';            // FG2 Name
        r.systemQty     = semiSysQtyMap[r.itemSemi] || 0; // ยอดระบบ (นับแถบ)
      });

      return { success: true, items: semiItems, date: dateStr };
    }
    return { success: false, message: 'ไม่รู้จัก type: ' + type };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * getLatestCycleDate(type)
 * คืนวันที่ล่าสุดที่มีข้อมูลใน Transection FG หรือ SEMI
 */
function getLatestCycleDate(type) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var latest = null;
    // ✅ ใช้ Col T (index 19 = คอลัมน์ที่ 20) = วันที่นำเข้า สำหรับทั้ง FG และ SEMI
    const shName = (type === 'fg') ? 'Transection FG' : 'Transection SEMI';
    const sh = ss.getSheetByName(shName);
    if (!sh || sh.getLastRow() < 2) return { success: false, message: 'ไม่มีข้อมูล ' + shName };
    const col = sh.getRange(2, 20, sh.getLastRow()-1, 1).getValues(); // col T = วันที่นำเข้า
    col.forEach(function(r) {
      const d = parseDateValue(r[0]);
      if (d && d.getFullYear() > 2000 && (!latest || d > latest)) latest = d;
    });
    if (!latest) return { success: false, message: 'ไม่พบวันที่ในข้อมูล' };
    const p = function(n) { return String(n).padStart(2,'0'); };
    const dateStr = latest.getFullYear() + '-' + p(latest.getMonth()+1) + '-' + p(latest.getDate());
    return { success: true, date: dateStr };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// DASHBOARD SUMMARY FG
// ============================================================
/**
 * Logic:
 *  1. Counting (Col B=SKU, Col H=CW on-hand) → SUM group by SKU = ยอดระบบ
 *  2. TST QC Standard (Col A=SKU, Col E=kg/เส้น) → น้ำหนัก
 *  3. Daily Cycle Count FG → แถวสุดท้ายต่อ SKU = นับจริงล่าสุด + วันที่
 *     Diff = นับจริงล่าสุด − ยอดระบบ (คำนวณใหม่ ไม่ใช้ Col 13)
 *  4. SKU ที่มีใน Daily Cycle Count FG แต่ไม่มีใน Counting → แสดงด้วย (ของจริงมีแต่ระบบไม่มี)
 *  5. Overdue Reservations (Col D=SKU, Col H=Status, Col K=เส้น, Col M=kg) → งานกักกัน
 */
function getFGDashboardSummary() {
  return _withCache('fgDashboard', 180, function() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ─── 0. ลำดับจากชีต Product (Col A = SKU) ─────────────────────────────────
    const productOrder = {}; // sku → index (0-based)
    const productSheet = ss.getSheetByName('Product');
    if (productSheet && productSheet.getLastRow() >= 2) {
      const pData = productSheet.getRange(2, 1, productSheet.getLastRow()-1, 1).getValues();
      pData.forEach(function(row, i) {
        var sku = String(row[0] || '').trim();
        if (sku && !(sku in productOrder)) productOrder[sku] = i;
      });
    }

    // ─── 1. Counting: SUM CW on-hand group by SKU ──────────────────────────────
    const systemMap = {}; // sku → { name, systemQty }
    const countingSheet = ss.getSheetByName('Counting');
    if (countingSheet && countingSheet.getLastRow() >= 2) {
      const cData = countingSheet.getDataRange().getValues();
      for (let i = 1; i < cData.length; i++) {
        const row  = cData[i];
        const sku  = String(row[1] || '').trim(); // Col B = Item number
        const name = String(row[2] || '').trim(); // Col C = Product name
        const qty  = parseFloat(row[7]) || 0;     // Col H = CW on-hand
        if (!sku) continue;
        if (!systemMap[sku]) systemMap[sku] = { name: name || sku, systemQty: 0 };
        if (!systemMap[sku].name && name) systemMap[sku].name = name;
        systemMap[sku].systemQty += qty;
      }
    }

    // ─── 2. TST QC Standard: kg/เส้น (Col E, index 4) ─────────────────────────
    const weightMap = {}; // sku → kg/เส้น
    const qcSheet = ss.getSheetByName('TST QC Standard');
    if (qcSheet && qcSheet.getLastRow() >= 2) {
      const qcData = qcSheet.getDataRange().getValues();
      for (let i = 1; i < qcData.length; i++) {
        const sku = String(qcData[i][0] || '').trim();
        const kg  = parseFloat(qcData[i][4]) || 0; // Col E
        if (sku) weightMap[sku] = kg;
      }
    }

    // ─── 3. Daily Cycle Count FG: หาแถวสุดท้ายต่อ SKU ────────────────────────
    // Header: [บันทึกเมื่อ(0), วันที่Cycle(1), SKU(2), ชื่อ(3), เส้น/มัด(4),
    //          กอง1(5), กอง2(6), เศษ1(7), เศษ2(8), hold(9), นับจริง(10), ระบบ(11), ส่วนต่าง(12)]
    // วนจากบนลงล่าง → แถวหลังสุดของแต่ละ SKU จะทับตัวเก่าเสมอ = ล่าสุด
    const latestCycleMap = {}; // sku → { cycleDate, actual, name }
    const cycleSheet = ss.getSheetByName('Daily Cycle Count FG');
    if (cycleSheet && cycleSheet.getLastRow() >= 2) {
      const cyData = cycleSheet.getDataRange().getValues();
      for (let i = 1; i < cyData.length; i++) {
        const row = cyData[i];
        const sku  = String(row[2] || '').trim();
        if (!sku) continue;
        latestCycleMap[sku] = {
          cycleDate: row[1],            // วันที่ Cycle
          actual:    parseFloat(row[10]) || 0, // นับจริง(เส้น)
          name:      String(row[3] || '').trim()
        };
      }
    }

    // ─── 4. Overdue Reservations: งานกักกัน ────────────────────────────────────
    const blockingMap = {}; // sku → { lines, weight }
    const overdueSheet = ss.getSheetByName('Overdue Reservations');
    if (overdueSheet && overdueSheet.getLastRow() >= 2) {
      const oData = overdueSheet.getDataRange().getValues();
      for (let i = 1; i < oData.length; i++) {
        const row = oData[i];
        if (String(row[7] || '').trim() !== 'Inventory blocking') continue;
        const sku    = String(row[3] || '').trim();
        const lines  = Math.abs(parseFloat(row[10]) || 0);
        const weight = Math.abs(parseFloat(row[12]) || 0);
        if (!sku || lines === 0) continue;
        if (!blockingMap[sku]) blockingMap[sku] = { lines: 0, weight: 0 };
        blockingMap[sku].lines  += lines;
        blockingMap[sku].weight += weight;
      }
    }

    // ─── 4a. RootCause_Log: latest rootCause per SKU ─────────────────────────
    const rootCauseMap = _getRootCauseMap(ss, 'fg');

    // ─── 4b. ReCheck_Log: latest action per SKU ──────────────────────────────
    const recheckMap = {};
    const recheckSheet = ss.getSheetByName(RECHECK_LOG_SHEET);
    if (recheckSheet && recheckSheet.getLastRow() >= 2) {
      const rData = recheckSheet.getDataRange().getValues();
      for (let i = 1; i < rData.length; i++) {
        const rRow = rData[i];
        const rSku = String(rRow[2] || '').trim();
        if (!rSku) continue;
        recheckMap[rSku] = {
          action:    String(rRow[8] || ''),
          note:      String(rRow[9] || ''),
          timestamp: String(rRow[0] || '')
        };
      }
    }

    // ─── 4c. Transection FG: Production / Sales order / Transfer per SKU ────────
    // อ่าน Transection FG → group by SKU ตาม import date ล่าสุด (col T, index 19)
    // Col E(4)=SKU, Col G(6)=Reference, Col H(7)=CW quantity
    const movMap = {}; // sku → { production, salesOrder, transfer }
    const txFgSheet = ss.getSheetByName('Transection FG');
    if (txFgSheet && txFgSheet.getLastRow() >= 2) {
      const txData = txFgSheet.getRange(2, 1, txFgSheet.getLastRow()-1, 20).getValues();
      // หา latest import date (col T = index 19)
      let latestImportDate = '';
      for (let i = 0; i < txData.length; i++) {
        const d = String(txData[i][19] || '').trim();
        if (d && d > latestImportDate) latestImportDate = d;
      }
      // sum movement per SKU ตาม import date ล่าสุด
      if (latestImportDate) {
        for (let i = 0; i < txData.length; i++) {
          const row = txData[i];
          if (String(row[19]||'').trim() !== latestImportDate) continue;
          const sku   = String(row[4]||'').trim(); // col E = Item number
          const ref   = String(row[6]||'').trim(); // col G = Reference
          const cwQty = parseFloat(row[7]) || 0;   // col H = CW quantity
          if (!sku) continue;
          if (!movMap[sku]) movMap[sku] = { production: 0, salesOrder: 0, transfer: 0 };
          const refL = ref.toLowerCase();
          if      (refL === 'production')              movMap[sku].production += cwQty;
          else if (refL === 'sales order')             movMap[sku].salesOrder += cwQty;
          else if (refL.includes('transfer'))          movMap[sku].transfer   += cwQty;
        }
      }
    }

    // ─── 5. รวม SKU ทั้งหมด: Counting + Daily Cycle (ของมีจริงแต่ระบบไม่มี) ──
    // union ของ SKU จากทั้งสองแหล่ง
    const allSkus = new Set([
      ...Object.keys(systemMap),
      ...Object.keys(latestCycleMap)
    ]);

    let kpiTotalLines = 0, kpiTotalWeight = 0, kpiBlockLines = 0, kpiBlockWeight = 0;
    let kpiMatchCount = 0, kpiDiffCount = 0, kpiNoCycleCount = 0;

    const rows = [];

    allSkus.forEach(sku => {
      const sm    = systemMap[sku]      || null;
      const cycle = latestCycleMap[sku] || null;
      const block = blockingMap[sku]    || null;

      // ยอดระบบ (0 ถ้าไม่มีใน Counting = ของมีจริงแต่ระบบไม่มี)
      const systemQty = sm ? Math.round(sm.systemQty) : 0;
      const name      = (sm && sm.name) || (cycle && cycle.name) || sku;
      const wPerLine  = weightMap[sku] || 0;
      const totalWeightKg = parseFloat((systemQty * wPerLine).toFixed(2));

      // Cycle Count ล่าสุด
      let cycleDateStr = '-';
      let actualQty    = null;
      let diffQty      = null;
      let matchStatus  = 'NO_CYCLE';

      if (cycle) {
        // format วันที่
        const cd = cycle.cycleDate;
        if (cd instanceof Date && !isNaN(cd)) {
          cycleDateStr = Utilities.formatDate(cd, 'GMT+7', 'dd/MM/yyyy');
        } else if (cd) {
          cycleDateStr = String(cd).substring(0, 10);
        }
        actualQty = Math.round(cycle.actual);

        // ✅ คำนวณ Diff ใหม่ = นับจริงล่าสุด − ยอดระบบ Counting
        diffQty     = actualQty - systemQty;
        matchStatus = (diffQty === 0) ? 'MATCH' : 'DIFF';
      }

      // กักกัน
      const blockLines  = block ? Math.round(block.lines)               : 0;
      const blockWeight = block ? parseFloat(block.weight.toFixed(2))  : 0;

      // KPI
      kpiTotalLines  += systemQty;
      kpiTotalWeight += totalWeightKg;
      kpiBlockLines  += blockLines;
      kpiBlockWeight += blockWeight;
      if      (matchStatus === 'MATCH') kpiMatchCount++;
      else if (matchStatus === 'DIFF')  kpiDiffCount++;
      else                              kpiNoCycleCount++;

      const rc = recheckMap[sku] || null;
      const mv = movMap[sku]    || null;
      rows.push({
        sku, name, systemQty, totalWeightKg, wPerLine,
        cycleDateStr, actualQty, diffQty, matchStatus,
        blockLines, blockWeight,
        noSystem:     !sm,
        recheckAction: rc ? rc.action    : '',
        recheckNote:   rc ? rc.note      : '',
        recheckTs:     rc ? rc.timestamp : '',
        production: mv ? Math.round(mv.production) : 0,
        salesOrder: mv ? Math.round(mv.salesOrder) : 0,
        transfer:   mv ? Math.round(mv.transfer)   : 0,
        rootCause:     rootCauseMap[sku] ? rootCauseMap[sku].rootCause : '',
        rootCauseNote: rootCauseMap[sku] ? rootCauseMap[sku].note      : ''
      });
    });

    // เรียงลำดับ: ตามชีต Product ก่อน → SKU ที่ไม่อยู่ใน Product ต่อท้าย (เรียงตามเดิม)
    const MAX_ORDER = 99999;
    rows.sort((a, b) => {
      const oa = (a.sku in productOrder) ? productOrder[a.sku] : MAX_ORDER;
      const ob = (b.sku in productOrder) ? productOrder[b.sku] : MAX_ORDER;
      if (oa !== ob) return oa - ob;
      // SKU ที่ไม่อยู่ใน Product: เรียงแบบเดิม (noSystem → DIFF → ยอดมาก)
      if (a.noSystem !== b.noSystem) return a.noSystem ? -1 : 1;
      if (a.matchStatus === 'DIFF' && b.matchStatus !== 'DIFF') return -1;
      if (a.matchStatus !== 'DIFF' && b.matchStatus === 'DIFF') return 1;
      return b.systemQty - a.systemQty;
    });

    return {
      success: true,
      rows,
      kpi: {
        totalSkus:    rows.length,
        totalLines:   kpiTotalLines,
        totalWeight:  parseFloat(kpiTotalWeight.toFixed(2)),
        blockLines:   kpiBlockLines,
        blockWeight:  parseFloat(kpiBlockWeight.toFixed(2)),
        matchCount:   kpiMatchCount,
        diffCount:    kpiDiffCount,
        noCycleCount: kpiNoCycleCount
      }
    };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
  }); // end _withCache
}
/**
 * getFGRecheckList
 * ดึงรายการ FG ที่ต้อง Re-Check (DIFF + NO_CYCLE + NO_SYSTEM)
 * พร้อม products[] และ systemStock[] สำหรับ buildFGMergedDataFromRecheck
 */
function getFGRecheckList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ─── 1. ดึง Product List ───────────────────────────────────────────────────
    const products = [];
    const productSheet = ss.getSheetByName('Product');
    if (productSheet && productSheet.getLastRow() >= 2) {
      const pData = productSheet.getDataRange().getValues();
      for (let i = 1; i < pData.length; i++) {
        const row = pData[i];
        if (!row[0]) continue;
        products.push({
          sku:            String(row[0]).trim(),
          name:           String(row[1] || '').trim(),
          linesPerBundle: Number(row[2]) || 10
        });
      }
    }

    // ─── 2. System Stock (Counting) ──────────────────────────────────────────
    const systemStock = [];
    const countingSheet2 = ss.getSheetByName('Counting');
    if (countingSheet2 && countingSheet2.getLastRow() >= 2) {
      const cData = countingSheet2.getDataRange().getValues();
      for (let i = 1; i < cData.length; i++) {
        const sku = String(cData[i][1] || '').trim(); // Col B = Item number
        const qty = parseFloat(cData[i][7]) || 0;    // Col H = CW on-hand
        if (!sku) continue;
        systemStock.push({ sku, qty });
      }
    }
    const systemQtyMap = {};
    systemStock.forEach(s => { systemQtyMap[s.sku] = (systemQtyMap[s.sku] || 0) + s.qty; });

    // ─── 3. Daily Cycle Count FG → ผลล่าสุดต่อ SKU ──────────────────────────
    // Header: [บันทึกเมื่อ(0), วันที่Cycle(1), SKU(2), ชื่อ(3), เส้น/มัด(4),
    //          กอง1(5), กอง2(6), เศษ1(7), เศษ2(8), hold(9), นับจริง(10), ระบบ(11), ส่วนต่าง(12)]
    const latestCycleMap = {};
    const cycleSheet = ss.getSheetByName('Daily Cycle Count FG');
    if (cycleSheet && cycleSheet.getLastRow() >= 2) {
      const cyData = cycleSheet.getDataRange().getValues();
      for (let i = 1; i < cyData.length; i++) {
        const row    = cyData[i];
        const sku    = String(row[2] || '').trim();
        if (!sku) continue;
        const cd     = row[1];
        let cdStr    = '-';
        if (cd instanceof Date && !isNaN(cd)) {
          cdStr = Utilities.formatDate(cd, 'GMT+7', 'dd/MM/yyyy');
        } else if (cd) {
          cdStr = String(cd).substring(0, 10);
        }
        latestCycleMap[sku] = {
          lastCycleDate: cdStr,
          lastActual:    parseFloat(row[10]) || 0,
          lastDiff:      parseFloat(row[12]) || 0
        };
      }
    }

    // ─── 4. Build Product map for lpb ────────────────────────────────────────
    const lpbMap  = {};
    const nameMap = {};
    products.forEach(p => {
      lpbMap[p.sku]  = p.linesPerBundle;
      nameMap[p.sku] = p.name;
    });

    // ─── 5. รวม SKU ทั้งหมด แล้วกรองเฉพาะที่ต้อง Re-Check ──────────────────
    const allSkus = new Set([
      ...products.map(p => p.sku),
      ...Object.keys(latestCycleMap)
    ]);

    const recheckRows = [];
    let diffCount     = 0;
    let noCycleCount  = 0;
    let noSystemCount = 0;

    allSkus.forEach(sku => {
      const systemQty = systemQtyMap[sku] || 0;
      const cycle     = latestCycleMap[sku] || null;
      const noSystem  = !systemQtyMap[sku] && cycle; // มีในCycle แต่ไม่มีในระบบ

      let matchStatus;
      if (!cycle) {
        matchStatus = 'NO_CYCLE';
        noCycleCount++;
      } else {
        const diff = Math.round(cycle.lastActual) - systemQty;
        matchStatus = diff === 0 ? 'MATCH' : 'DIFF';
        if (matchStatus === 'DIFF') diffCount++;
        if (noSystem)               noSystemCount++;
      }

      if (matchStatus === 'MATCH') return; // skip matched

      recheckRows.push({
        sku:            sku,
        name:           nameMap[sku] || (cycle && cycle.name) || sku,
        systemQty:      systemQty,
        linesPerBundle: lpbMap[sku] || 10,
        matchStatus:    matchStatus,
        lastActual:     cycle ? Math.round(cycle.lastActual) : null,
        lastDiff:       cycle ? cycle.lastDiff : null,
        lastCycleDate:  cycle ? cycle.lastCycleDate : null,
        noSystem:       !!noSystem
      });
    });

    // เรียง: ไม่มีในระบบ → DIFF → NO_CYCLE
    recheckRows.sort((a, b) => {
      if (a.noSystem !== b.noSystem) return a.noSystem ? -1 : 1;
      const order = { DIFF: 0, NO_CYCLE: 1, NO_SYSTEM: 2 };
      return (order[a.matchStatus]||3) - (order[b.matchStatus]||3);
    });

    return {
      success:     true,
      recheckRows: recheckRows,
      products:    products,
      systemStock: systemStock,
      summary: {
        diffCount:    diffCount,
        noCycleCount: noCycleCount,
        noSystemCount: noSystemCount,
        total:        recheckRows.length
      }
    };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// SEMI (Film) — Inventory Control & Dashboard
// ============================================================
// โครงสร้างชีตที่ใช้:
//   "SEMI SOON FG"           : Col A=รหัสSEMI, B=ชื่อSEMI, C=รหัสFG1, D=ชื่อFG1, E=รหัสFG2, F=ชื่อFG2
//   "ON-HAND SEMI"           : แต่ละแถว = 1 หน่วย SEMI (นับแถวต่อ SKU = ยอดระบบ)
//   "Daily Cycle Count SEMI" : บันทึกผลการตรวจนับ (มีคอลัมน์ QtyFG1, QtyFG2, Total, Diff)
// ============================================================
const SEMI_MASTER_SHEET    = 'SEMI SOON FG';
const ONHAND_SEMI_SHEET    = 'ON-HAND SEMI';
const DAILY_CYCLE_SEMI_SHT = 'Daily Cycle Count SEMI';

/**
 * getSemiCycleData
 * ดึงรายการ SEMI ทั้งหมด พร้อมยอดระบบ (นับแถว ON-HAND SEMI)
 * และผลการ Audit ล่าสุด (qtyFg1, qtyFg2, total, cycleDateStr)
 */
function getSemiCycleData() {
  try {
    const ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
    const semiMaster     = _getSemiMaster(ss);
    const systemQtyMap   = _getSemiSystemQty(ss);
    const latestCycleMap = _getLatestSemiCycle(ss);

    const semiList = semiMaster.map(s => {
      const sysQty = systemQtyMap[s.semiSku] || 0;
      const cycle  = latestCycleMap[s.semiSku] || null;

      // คำนวณ total จาก cycle ล่าสุด
      const prevQty1 = cycle ? (cycle.qtyFg1 !== null ? cycle.qtyFg1 : null) : null;
      const prevQty2 = cycle ? (cycle.qtyFg2 !== null ? cycle.qtyFg2 : null) : null;
      const prevTotal = cycle ? cycle.total : null;
      const prevDiff  = prevTotal !== null ? prevTotal - sysQty : null;

      let recheckStatus = 'NO_CYCLE';
      if (cycle) {
        recheckStatus = prevDiff === 0 ? 'MATCH' : 'DIFF';
      }

      return {
        semiSku:       s.semiSku,
        semiName:      s.semiName,
        fg1Sku:        s.fg1Sku,
        fg1Name:       s.fg1Name,
        fg2Sku:        s.fg2Sku,
        fg2Name:       s.fg2Name,
        systemQty:     sysQty,
        // ค่าที่กรอก — เริ่มต้นว่าง (null) ให้ผู้ใช้กรอก
        qtyFg1:        null,
        qtyFg2:        null,
        remark:        '',
        recheckStatus: recheckStatus,
        prevDiff:      prevDiff,
        prevCycleDate: cycle ? cycle.cycleDateStr : null
      };
    });

    return { success: true, semiList: semiList };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * getSemiRecheckList
 * กรองเฉพาะรายการ DIFF / NO_CYCLE พร้อมนำค่าจาก Audit ล่าสุดมาแสดง
 */
function getSemiRecheckList() {
  try {
    const ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
    const semiMaster     = _getSemiMaster(ss);
    const systemQtyMap   = _getSemiSystemQty(ss);
    const latestCycleMap = _getLatestSemiCycle(ss);

    const recheckList = [];

    semiMaster.forEach(s => {
      const sysQty = systemQtyMap[s.semiSku] || 0;
      const cycle  = latestCycleMap[s.semiSku] || null;

      const prevQty1  = cycle ? cycle.qtyFg1  : null;
      const prevQty2  = cycle ? cycle.qtyFg2  : null;
      const prevTotal = cycle ? cycle.total    : null;
      const prevDiff  = prevTotal !== null ? prevTotal - sysQty : null;

      let recheckStatus = 'NO_CYCLE';
      if (cycle) recheckStatus = prevDiff === 0 ? 'MATCH' : 'DIFF';

      if (recheckStatus === 'MATCH') return; // skip matched

      recheckList.push({
        semiSku:       s.semiSku,
        semiName:      s.semiName,
        fg1Sku:        s.fg1Sku,
        fg1Name:       s.fg1Name,
        fg2Sku:        s.fg2Sku,
        fg2Name:       s.fg2Name,
        systemQty:     sysQty,
        qtyFg1:        null,
        qtyFg2:        null,
        remark:        '',
        recheckStatus: recheckStatus,
        prevDiff:      prevDiff,
        prevCycleDate: cycle ? cycle.cycleDateStr : null
      });
    });

    return {
      success:     true,
      recheckList: recheckList,
      summary: {
        diffCount:    recheckList.filter(r => r.recheckStatus === 'DIFF').length,
        noCycleCount: recheckList.filter(r => r.recheckStatus === 'NO_CYCLE').length,
        total:        recheckList.length
      }
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
/**
 * saveSemiCycleCount - ปรับปรุงเพื่อบันทึกสถานะและหมายเหตุ
 */
function saveSemiCycleCount(cycleRows, cycleDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

    let sheet = ss.getSheetByName(DAILY_CYCLE_SEMI_SHT);
    if (!sheet) {
      sheet = ss.insertSheet(DAILY_CYCLE_SEMI_SHT);
      const headers = [
        'บันทึกเมื่อ', 'วันที่Cycle', 'SEMI Code', 'ชื่อ SEMI',
        'FG1 Code', 'FG1 Name', 'FG2 Code', 'FG2 Name',
        'SYSTEM(แถว)', 'QTY FG1', 'QTY FG2', 'TOTAL', 'DIFF', 'สถานะ', 'หมายเหตุ' // ✅ เพิ่ม Header
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
           .setBackground('#1e1b4b').setFontColor('#ffffff');
    }

    if (!cycleRows || cycleRows.length === 0) return { success: false, message: 'ไม่มีข้อมูล' };

    const data = cycleRows
      .filter(r => r.total !== null)
      .map(r => [
        nowStr,
        r.date,
        String(r.semiSku || ''),
        String(r.semiName || ''),
        String(r.fg1Sku || ''),
        String(r.fg1Name || ''),
        String(r.fg2Sku || ''),
        String(r.fg2Name || ''),
        Number(r.systemQty) || 0,
        r.qtyFg1 !== null ? Number(r.qtyFg1) : '',
        r.qtyFg2 !== null ? Number(r.qtyFg2) : '',
        Number(r.total) || 0,
        Number(r.diff) || 0,
        r.status || 'ปกติ', // ✅ บันทึกสถานะ
        String(r.remark || '') // ✅ บันทึกหมายเหตุ
      ]);

    if (data.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
    }
    return { success: true, message: `บันทึก SEMI สำเร็จ ${data.length} รายการ` };
  } catch (e) { return { success: false, message: e.toString() }; }
}
/**
 * getProductionVerifyData
 * ดึงข้อมูลจากชีต "Transection FG" ตามวันที่ที่เลือก
 *
 * โครงสร้างชีต Transection FG (0-based index):
 *   Col E (4)  Item number       ← SKU
 *   Col F (5)  Product name
 *   Col G (6)  Reference         ← ต้อง = "Production"
 *   Col H (7)  CW quantity       ← จำนวนเส้น
 *   Col J (9)  Quantity           ← น้ำหนัก (ค่าสมบูรณ์)
 *   Col L (11) Receipt            ← ต้อง = "Received"
 *   Col T (19) Transection Date   ← วันที่อ้างอิง
 *   Col U (20) น้ำหนักต่อเส้น    ← ใช้คำนวณ Median
 *
 * @param {string} dateStr - "yyyy-MM-dd"
 */
function getProductionVerifyData(dateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── 1. อ่าน Transection FG ──────────────────────────────────────
    const txSheet = ss.getSheetByName('Transection FG');
    if (!txSheet || txSheet.getLastRow() < 2) {
      return { success: false, message: 'ไม่พบชีต Transection FG หรือยังไม่มีข้อมูล' };
    }
    const txData = txSheet.getDataRange().getValues();

    const targetDate = new Date(dateStr + 'T00:00:00');
    const targetY = targetDate.getFullYear();
    const targetM = targetDate.getMonth();
    const targetD = targetDate.getDate();

    // skuMap: { sku → { productName, systemQty (เส้น), systemWeight (น้ำหนัก กก.), colUValues[] } }
    const skuMap = {};

    for (let i = 1; i < txData.length; i++) {
      const row = txData[i];

      // เงื่อนไข 1: Col G (Index 6) = "Production"
      if (String(row[6] || '').trim().toLowerCase() !== 'production') continue;

      // เงื่อนไข 2: Col L (Index 11) = "Received"
      if (String(row[11] || '').trim().toLowerCase() !== 'received') continue;

      // เงื่อนไข 3: Col T (Index 19) ตรงกับวันที่
      const rawDate = row[19];
      let rowDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (isNaN(rowDate.getTime())) continue;
      if (rowDate.getFullYear() !== targetY ||
          rowDate.getMonth()    !== targetM ||
          rowDate.getDate()     !== targetD) continue;

      const sku         = String(row[4]  || '').trim();   // Col E
      const productName = String(row[5]  || '').trim();   // Col F
      const cwQty       = Math.abs(parseFloat(row[7])  || 0);       // Col H = จำนวนเส้น (ค่าสมบูรณ์)
      const weightRaw   = Math.abs(parseFloat(row[9]) || 0); // Col J = น้ำหนัก (ค่าสมบูรณ์)
      // Col U = |J| / |H| (น้ำหนักต่อเส้น) — คำนวณแทนการอ่านจาก cell เพื่อความแม่นยำ
      const colUVal     = (cwQty > 0) ? parseFloat((weightRaw / cwQty).toFixed(2)) : NaN;

      if (!sku) continue;

      if (!skuMap[sku]) {
        skuMap[sku] = { productName, systemQty: 0, systemWeight: 0, colUValues: [] };
      }
      skuMap[sku].systemQty    += cwQty;
      skuMap[sku].systemWeight += weightRaw;
      if (!isNaN(colUVal) && colUVal > 0) {
        skuMap[sku].colUValues.push(colUVal);
      }
    }

    if (Object.keys(skuMap).length === 0) {
      return { success: true, rows: [] };
    }

    // ── 2. ดึง linesPerBundle จากชีต Product (Col A=SKU, Col C=เส้นต่อมัด) ──
    const lpbMap = {};
    try {
      const prodSheet = ss.getSheetByName('Product');
      if (prodSheet && prodSheet.getLastRow() >= 2) {
        const prodData = prodSheet.getDataRange().getValues();
        for (let i = 1; i < prodData.length; i++) {
          const pSku = String(prodData[i][0] || '').trim();
          const lpb  = parseFloat(prodData[i][2]) || 10;
          if (pSku) lpbMap[pSku] = lpb;
        }
      }
    } catch(e) { /* ใช้ default 10 */ }

    // ── 3. คำนวณ Median จาก colUValues ──────────────────────────────
    function calcMedian(arr) {
      if (!arr || arr.length === 0) return 0;
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    // ── 4. แปลงเป็น Array ──────────────────────────────────────────
    const rows = Object.keys(skuMap).sort().map(sku => ({
      sku,
      productName:    skuMap[sku].productName,
      systemQty:      skuMap[sku].systemQty,      // จำนวนเส้น (เกรด A ในระบบ)
      systemWeight:   skuMap[sku].systemWeight,   // น้ำหนัก กก. (เกรด A)
      medianWeight:   calcMedian(skuMap[sku].colUValues), // Median ของ Col U
      linesPerBundle: lpbMap[sku] || 10,
      // ช่องกรอกจากใบรายงาน
      fullBundle:     '',
      mixOldScrap:    '',
      mixHoldScrap:   '',
      newScrap:       '',
      newHold:        '',
      gradeAReport:   '',  // เกรด A (ใบ) — สำหรับ cross-check
      gradeB:         '',  // เกรด B (เส้น)
      gradeC:         '',  // เกรด C (เส้น)
      remark:         ''
    }));

    return { success: true, rows };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * สรุปสต็อก SEMI ทั้งหมดสำหรับ Dashboard
 * คืนค่า: rows (พร้อม qtyFg1, qtyFg2, totalQty, diffQty, matchStatus, cycleDateStr)
 *         kpi (totalSemi, totalRows, dualFgCount, matchCount, diffCount, noCycleCount)
 */
function getSemiDashboardSummary() {
  return _withCache('semiDashboard', 180, function() {
  try {
    const ss             = SpreadsheetApp.openById(SPREADSHEET_ID);
    const semiMaster     = _getSemiMaster(ss);
    const systemQtyMap   = _getSemiSystemQty(ss);
    const latestCycleMap = _getLatestSemiCycle(ss);
    const rootCauseMap   = _getRootCauseMap(ss, 'semi');

    let kpiTotalRows  = 0;
    let kpiDualFg     = 0;
    let kpiMatch      = 0;
    let kpiDiff       = 0;
    let kpiNoCycle    = 0;

    const rows = semiMaster.map(s => {
      const sysQty  = systemQtyMap[s.semiSku] || 0;
      const cycle   = latestCycleMap[s.semiSku] || null;
      const isDual  = s.fg2Sku && s.fg2Sku.trim() !== '';

      let matchStatus  = 'NO_CYCLE';
      let qtyFg1       = null;
      let qtyFg2       = null;
      let totalQty     = null;
      let diffQty      = null;
      let cycleDateStr = '-';

      if (cycle) {
        qtyFg1       = cycle.qtyFg1;
        qtyFg2       = cycle.qtyFg2;
        totalQty     = cycle.total;
        diffQty      = totalQty !== null ? totalQty - sysQty : null;
        matchStatus  = diffQty === 0 ? 'MATCH' : 'DIFF';
        cycleDateStr = cycle.cycleDateStr;
      }

      kpiTotalRows += sysQty;
      if (isDual)                      kpiDualFg++;
      if (matchStatus === 'MATCH')     kpiMatch++;
      else if (matchStatus === 'DIFF') kpiDiff++;
      else                             kpiNoCycle++;

      return {
        semiSku:      s.semiSku,
        semiName:     s.semiName,
        fg1Sku:       s.fg1Sku,
        fg1Name:      s.fg1Name,
        fg2Sku:       s.fg2Sku,
        fg2Name:      s.fg2Name,
        systemQty:    sysQty,
        qtyFg1:       qtyFg1,
        qtyFg2:       qtyFg2,
        totalQty:     totalQty,
        diffQty:      diffQty,
        matchStatus:   matchStatus,
        cycleDateStr:  cycleDateStr,
        isDual:        isDual,
        rootCause:     rootCauseMap[s.semiSku] ? rootCauseMap[s.semiSku].rootCause : '',
        rootCauseNote: rootCauseMap[s.semiSku] ? rootCauseMap[s.semiSku].note      : ''
      };
    });

    // เรียง: DIFF → NO_CYCLE → MATCH, ยอดระบบมากก่อน
    rows.sort((a, b) => {
      const order = { DIFF: 0, NO_CYCLE: 1, MATCH: 2 };
      const oa = order[a.matchStatus] ?? 3;
      const ob = order[b.matchStatus] ?? 3;
      if (oa !== ob) return oa - ob;
      return b.systemQty - a.systemQty;
    });

    return {
      success: true,
      rows: rows,
      kpi: {
        totalSemi:    rows.length,
        totalRows:    kpiTotalRows,
        dualFgCount:  kpiDualFg,
        matchCount:   kpiMatch,
        diffCount:    kpiDiff,
        noCycleCount: kpiNoCycle
      }
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
  }); // end _withCache
}

// ─── Private Helper Functions ───────────────────────────────────────────────

/**
 * _getSemiMaster — ดึงข้อมูล SEMI จากชีต "SEMI SOON FG"
 * Column: A=SEMI Code, B=Raw Material Name, C=FG1 Code, D=FG1 Name, E=FG2 Code, F=FG2 Name
 */
function _getSemiMaster(ss) {
  const sheet = ss.getSheetByName(SEMI_MASTER_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data   = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const semiSku = String(row[0] || '').trim();
    if (!semiSku) continue;
    result.push({
      semiSku:  semiSku,
      semiName: String(row[1] || '').trim(),
      fg1Sku:   String(row[2] || '').trim(),
      fg1Name:  String(row[3] || '').trim(),
      fg2Sku:   String(row[4] || '').trim(),
      fg2Name:  String(row[5] || '').trim()
    });
  }
  return result;
}

/**
 * getSemiMasterList
 * ส่งรายการ SEMI ทั้งหมดจากชีต "SEMI SOON FG" พร้อมยอดระบบ
 * ใช้สำหรับ modal เพิ่มรายการ SEMI ด้วยมือในหน้าเทียบ
 */
function getSemiMasterList() {
  return _withCache('semiMasterList', 300, function() {
    try {
      const ss           = SpreadsheetApp.openById(SPREADSHEET_ID);
      const masterList   = _getSemiMaster(ss);
      const systemQtyMap = _getSemiSystemQty(ss);
      const result = masterList.map(s => ({
        semiSku:   s.semiSku,
        semiName:  s.semiName,
        fg1Sku:    s.fg1Sku,
        fg1Name:   s.fg1Name,
        fg2Sku:    s.fg2Sku,
        fg2Name:   s.fg2Name,
        systemQty: systemQtyMap[s.semiSku] || 0
      }));
      return { success: true, semiMaster: result };
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  });
}

/**
 * _getSemiSystemQty — นับแถวใน "ON-HAND SEMI" แยกตาม SEMI Code (Col A)
 * ยอดระบบ = จำนวนแถวที่มี SEMI Code นั้นๆ
 */
function _getSemiSystemQty(ss) {
  const sheet  = ss.getSheetByName(ONHAND_SEMI_SHEET);
  const qtyMap = {};
  if (!sheet || sheet.getLastRow() < 2) return qtyMap;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const sku = String(data[i][0] || '').trim();
    if (!sku) continue;
    qtyMap[sku] = (qtyMap[sku] || 0) + 1;
  }
  return qtyMap;
}

/**
 * _getLatestSemiCycle — ดึงผลการ Audit ล่าสุดต่อ SEMI Code จาก "Daily Cycle Count SEMI"
 * Header ชีต: [บันทึกเมื่อ(0) | วันที่Cycle(1) | SEMI Code(2) | ชื่อSEMI(3) |
 *              FG1 Code(4) | FG1 Name(5) | FG2 Code(6) | FG2 Name(7) |
 *              SYSTEM(8) | QTY FG1(9) | QTY FG2(10) | TOTAL(11) | DIFF(12) | หมายเหตุ(13)]
 * คืนค่า Map: { semiCode → { qtyFg1, qtyFg2, total, cycleDateStr } }
 */
function _getLatestSemiCycle(ss) {
  const sheet      = ss.getSheetByName(DAILY_CYCLE_SEMI_SHT);
  const latestMap  = {};
  if (!sheet || sheet.getLastRow() < 2) return latestMap;

  const data = sheet.getDataRange().getValues();
  // วนจากบนลงล่าง — record ล่าสุดจะ overwrite record เก่า (เพราะ append ต่อท้ายชีต)
  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const sku    = String(row[2] || '').trim();
    if (!sku) continue;

    // Parse วันที่ Cycle
    const cd     = row[1];
    let cdStr    = '-';
    if (cd instanceof Date && !isNaN(cd)) {
      cdStr = Utilities.formatDate(cd, 'GMT+7', 'dd/MM/yyyy');
    } else if (cd) {
      cdStr = String(cd).substring(0, 10);
    }

    // QTY FG1 (Col 9), QTY FG2 (Col 10), TOTAL (Col 11)
    const qty1  = row[9]  !== '' && row[9]  !== null ? parseFloat(row[9])  : null;
    const qty2  = row[10] !== '' && row[10] !== null ? parseFloat(row[10]) : null;
    const total = row[11] !== '' && row[11] !== null ? parseFloat(row[11]) : null;

    latestMap[sku] = {
      qtyFg1:       qty1,
      qtyFg2:       qty2,
      total:        total,
      cycleDateStr: cdStr
    };
  }
  return latestMap;
}
/**
 * บันทึกข้อมูล Movement ของ SEMI ลงในชีต Transection SEMI
 * และเตรียมข้อมูลสำหรับการเทียบสต๊อก
 */
function saveSemiMovementAndGetMaster(excelRows, cycleDate) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const nowStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    
    // 1. บันทึกข้อมูลลงชีต Transection SEMI
    // — ลบข้อมูลเก่าทั้งหมดแล้วเขียนใหม่ทุกครั้ง —
    const headers = ["บันทึกเมื่อ", "Physical date", "Modified date", "Production pool", "Warehouse", "Serial number", "Batch number", "Item number", "Product name", "Issue", "Quantity", "Unit", "Number", "Reference", "Site", "Financial date", "Vendor name", "Customer name", "Account Name", "Receipt", "CW quantity", "CW unit", "Cost amount", "Serial Description"];
    let txSheet = ss.getSheetByName('Transection SEMI');
    if (!txSheet) {
      txSheet = ss.insertSheet('Transection SEMI');
    } else {
      // ลบข้อมูลเก่าออกทั้งหมด (รวม header) แล้วเริ่มใหม่
      txSheet.clearContents();
    }
    // เขียน Header ใหม่เสมอ
    txSheet.getRange(1, 1, 1, headers.length).setValues([headers])
           .setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

    if (excelRows && excelRows.length > 1) {
      const dataToSave = excelRows.slice(1).map(row => [nowStr, ...row]);
      txSheet.getRange(2, 1, dataToSave.length, dataToSave[0].length).setValues(dataToSave);
    }

    // 2. ดึงข้อมูล Master SEMI เพื่อส่งกลับไปสร้างตารางเทียบที่หน้าเว็บ
    return getSemiCycleData(); 
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
/**
 * getStockInsight
 * วิเคราะห์ Diff ของสินค้า โดยดึง:
 *  1. ประวัติ Cycle Count ย้อนหลัง (Daily Cycle Count FG) — 10 ครั้งล่าสุด
 *  2. ยอดผลิต/เคลื่อนไหว (Transection FG) — 30 วันล่าสุด
 *     - Production+Received = ผลิตเข้ามา
 *     - Production+Issued   = เบิกออก/ผสม
 *  3. ประวัติ Production Verify — mixOldScrap, mixHoldScrap, newScrap, newHold
 *     (ดึงจากชีต Production Verify Log ถ้ามี)
 *
 * @param {string} sku
 * @param {string} refDateStr - วันที่อ้างอิง "yyyy-MM-dd" (วันที่นับปัจจุบัน)
 */
/**
 * getPolicyCheckData
 * ดึงข้อมูลล่าสุดของแต่ละ SKU จากชีต "Daily Cycle Count FG"
 * พร้อม pile/scrap _terms เพื่อตรวจนโยบาย 1กอง/1เศษ
 *
 * Column index (0-based) ของ Daily Cycle Count FG:
 *  0  บันทึกเมื่อ   1  วันที่Cycle   2  SKU   3  ชื่อ   4  LPB
 *  5  กอง1   6  กอง2   7  เศษ1   8  เศษ2   9  Hold
 *  10 นับจริง  11 ระบบ  12 diff  13 สถานะ  14 หมายเหตุ
 *  15 กอง1_แหล่ง  16 กอง2_แหล่ง  17 เศษ1_แหล่ง  18 เศษ2_แหล่ง
 *
 * @param {string} dateStr  "yyyy-MM-dd"  ถ้า "" → ใช้ทุกวัน (latest per SKU)
 */
function getPolicyCheckData(dateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Daily Cycle Count FG');
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: 'ไม่พบชีต Daily Cycle Count FG หรือยังไม่มีข้อมูล' };
    }

    const data     = sheet.getDataRange().getValues();
    const formulas = sheet.getDataRange().getFormulas();

    // กรองตามวันที่ (ถ้ามี) แล้วเก็บ latest record per SKU
    // "latest" = แถวที่ตำแหน่งท้ายสุดในชีต (บันทึกล่าสุด)
    const latestMap = {}; // sku → { row, formulaRow }

    for (let i = 1; i < data.length; i++) {
      const row    = data[i];
      const sku    = String(row[2] || '').trim();
      if (!sku) continue;

      if (dateStr) {
        // เปรียบเทียบวันที่ Cycle (col 1)
        const d = row[1] instanceof Date ? row[1] : new Date(row[1]);
        if (isNaN(d.getTime())) continue;
        const rowDateStr = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
        if (rowDateStr !== dateStr) continue;
      }

      // เก็บ overwrite → แถวหลังสุดใน loop = ล่าสุด
      latestMap[sku] = { row, formulaRow: formulas[i] };
    }

    if (Object.keys(latestMap).length === 0) {
      return {
        success: true,
        rows: [],
        message: dateStr ? `ไม่พบข้อมูล Cycle Count วันที่ ${dateStr}` : 'ยังไม่มีประวัติการนับ'
      };
    }

    const rows = Object.values(latestMap).map(({ row, formulaRow }) => {
      const cycleD = row[1] instanceof Date ? row[1] : new Date(row[1]);
      const fmtFormula = (colIdx) => {
        const f = (formulaRow && formulaRow[colIdx]) ? formulaRow[colIdx] : '';
        const v = Number(row[colIdx]) || 0;
        if (f) return f;
        if (v) return String(v);
        return '';
      };
      return {
        cycleDate:   isNaN(cycleD.getTime()) ? '' : Utilities.formatDate(cycleD, 'GMT+7', 'yyyy-MM-dd'),
        sku:         String(row[2]  || '').trim(),
        name:        String(row[3]  || '').trim(),
        linesPerBundle: Number(row[4]) || 10,
        pile1:       Number(row[5])  || 0,
        pile2:       Number(row[6])  || 0,
        scrap1:      Number(row[7])  || 0,
        scrap2:      Number(row[8])  || 0,
        hold:        Number(row[9])  || 0,
        actual:      Number(row[10]) || 0,
        systemQty:   Number(row[11]) || 0,
        diff:        Number(row[12]) || 0,
        status:      String(row[13] || ''),
        remark:      String(row[14] || ''),
        pile1_terms:  Number(row[15]) || 1,
        pile2_terms:  Number(row[16]) || 1,
        scrap1_terms: Number(row[17]) || 1,
        scrap2_terms: Number(row[18]) || 1,
        pile1_formula:  fmtFormula(5),
        pile2_formula:  fmtFormula(6),
        scrap1_formula: fmtFormula(7),
        scrap2_formula: fmtFormula(8)
      };
    });

    // เรียงตาม SKU
    rows.sort((a, b) => a.sku.localeCompare(b.sku));

    // หาวันที่ที่มีอยู่ทั้งหมด (สำหรับ dropdown)
    const dateSet = new Set();
    for (let i = 1; i < data.length; i++) {
      const d = data[i][1] instanceof Date ? data[i][1] : new Date(data[i][1]);
      if (!isNaN(d.getTime())) dateSet.add(Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd'));
    }
    const availableDates = Array.from(dateSet).sort().reverse(); // ล่าสุดก่อน

    return { success: true, rows, availableDates };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getStockInsight(sku, refDateStr) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const refDate  = new Date(refDateStr + 'T00:00:00');
    const since30  = new Date(refDate); since30.setDate(since30.getDate() - 30);

    // ── 1. ประวัติ Cycle Count ──────────────────────────────────────
    const cycleHistory = [];
    const cycleSheet = ss.getSheetByName('Daily Cycle Count FG');
    if (cycleSheet && cycleSheet.getLastRow() >= 2) {
      const data = cycleSheet.getDataRange().getValues();
      // Col index: 0=บันทึกเมื่อ 1=วันที่Cycle 2=SKU 3=ชื่อ 4=LPB
      //            5=กอง1 6=กอง2 7=เศษ1 8=เศษ2 9=Hold
      //            10=นับจริง 11=ระบบ 12=diff 13=สถานะ 14=หมายเหตุ
      for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        if (String(row[2] || '').trim().toUpperCase() !== sku.toUpperCase()) continue;
        const d = row[1] instanceof Date ? row[1] : new Date(row[1]);
        if (isNaN(d.getTime())) continue;
        cycleHistory.push({
          cycleDate:  Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd'),
          pile1:      Number(row[5]) || 0,
          pile2:      Number(row[6]) || 0,
          scrap1:     Number(row[7]) || 0,
          scrap2:     Number(row[8]) || 0,
          hold:       Number(row[9]) || 0,
          actual:     Number(row[10]) || 0,
          systemQty:  Number(row[11]) || 0,
          diff:       Number(row[12]) || 0,
          status:     String(row[13] || ''),
          remark:     String(row[14] || '')
        });
        if (cycleHistory.length >= 10) break;
      }
    }
    cycleHistory.reverse(); // เรียงจากเก่า→ใหม่

    // ── 2. Movement จาก Transection FG ─────────────────────────────
    // Col E(4)=SKU, G(6)=Reference, H(7)=CWQty, J(9)=Weight
    // L(11)=Receipt, T(19)=TxDate
    // Reference=Production + Receipt=Received  → ผลิตเข้า
    // Reference=Production + Receipt=Issued    → เบิกออก (ผสม)
    const movements = [];
    const txSheet = ss.getSheetByName('Transection FG');
    if (txSheet && txSheet.getLastRow() >= 2) {
      const txData = txSheet.getDataRange().getValues();
      for (let i = 1; i < txData.length; i++) {
        const row = txData[i];
        if (String(row[4] || '').trim().toUpperCase() !== sku.toUpperCase()) continue;
        const rawDate = row[19];
        const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (isNaN(d.getTime()) || d < since30) continue;
        const ref     = String(row[6]  || '').trim().toLowerCase();
        const receipt = String(row[11] || '').trim().toLowerCase();
        const qty     = Math.abs(parseFloat(row[7]) || 0);
        const wt      = Math.abs(parseFloat(row[9]) || 0);
        let type = 'อื่นๆ';
        if (ref === 'production' && receipt === 'received') type = 'ผลิตเข้า';
        else if (ref === 'production' && receipt === 'issued') type = 'เบิกออก/ผสม';
        else if (receipt === 'issued') type = 'เบิกออก';
        else if (receipt === 'received') type = 'รับเข้า';
        movements.push({
          txDate: Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd'),
          type, qty, weight: wt
        });
      }
    }
    // เรียง เก่า→ใหม่
    movements.sort((a, b) => a.txDate.localeCompare(b.txDate));

    // สรุป movement 30 วัน
    const totalIn    = movements.filter(m => m.type === 'ผลิตเข้า').reduce((s, m) => s + m.qty, 0);
    const totalOut   = movements.filter(m => m.type.includes('เบิก')).reduce((s, m) => s + m.qty, 0);
    const totalOther = movements.filter(m => m.type === 'อื่นๆ' || m.type === 'รับเข้า').reduce((s, m) => s + m.qty, 0);

    // ── 3. Production Verify Log ────────────────────────────────────
    const pvHistory = [];
    const pvSheet = ss.getSheetByName('Production Verify Log');
    if (pvSheet && pvSheet.getLastRow() >= 2) {
      const pvData = pvSheet.getDataRange().getValues();
      // คาดหวัง header: date, sku, fullBundle, mixOldScrap, mixHoldScrap, newScrap, newHold, ...
      for (let i = pvData.length - 1; i >= 1; i--) {
        const row = pvData[i];
        if (String(row[1] || '').trim().toUpperCase() !== sku.toUpperCase()) continue;
        const d = row[0] instanceof Date ? row[0] : new Date(row[0]);
        if (isNaN(d.getTime()) || d < since30) continue;
        pvHistory.push({
          date:         Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd'),
          fullBundle:   Number(row[2]) || 0,
          mixOldScrap:  Number(row[3]) || 0,
          mixHoldScrap: Number(row[4]) || 0,
          newScrap:     Number(row[5]) || 0,
          newHold:      Number(row[6]) || 0
        });
        if (pvHistory.length >= 15) break;
      }
      pvHistory.reverse();
    }

    // ── 4. คำนวณ "คาดการณ์สต๊อก" เทียบกับ Cycle ปัจจุบัน ──────────
    // สูตร: สต๊อกที่ควรมี = Cycle ล่าสุด + ผลิตเข้า - เบิกออก
    let expectedQty = null;
    let baseLabel   = '';
    if (cycleHistory.length > 0) {
      const last = cycleHistory[cycleHistory.length - 1];
      // ถ้า last เป็นวันนี้ ใช้ก่อนหน้า
      const baseEntry = cycleHistory.length >= 2
        ? cycleHistory[cycleHistory.length - 2]
        : cycleHistory[0];
      const daysSinceBase = cycleHistory.length >= 2 ? 1 : 0;
      baseLabel   = baseEntry.cycleDate;
      expectedQty = baseEntry.actual + totalIn - totalOut;
    }

    // ── 5. สร้าง insights (คำอธิบาย) ──────────────────────────────
    const insights = [];
    const latestCycle = cycleHistory.length > 0 ? cycleHistory[cycleHistory.length - 1] : null;

    if (latestCycle) {
      const diff = latestCycle.diff;
      const scrapTotal = latestCycle.scrap1 + latestCycle.scrap2;

      if (diff !== 0 && expectedQty !== null) {
        const gap = latestCycle.actual - expectedQty;
        if (Math.abs(gap) <= 5) {
          insights.push({ type: 'ok', msg: `ยอดนับ (${latestCycle.actual}) ใกล้เคียงกับที่คาดการณ์ (${Math.round(expectedQty)}) — ส่วนต่างอาจมาจาก timing การคีย์` });
        } else if (latestCycle.actual < expectedQty) {
          insights.push({ type: 'warn', msg: `นับได้น้อยกว่าที่คาดการณ์ ${Math.abs(Math.round(gap))} เส้น — อาจมีการเบิกออกที่ยังไม่ได้คีย์ระบบ หรือสินค้าถูกนำไปผสมโดยไม่บันทึก` });
        } else {
          insights.push({ type: 'info', msg: `นับได้มากกว่าที่คาดการณ์ ${Math.round(gap)} เส้น — อาจมีการรับเข้าที่ยังไม่อัปเดตระบบ` });
        }
      }

      // เช็คเศษ: ถ้า Cycle ก่อนหน้ามีเศษ เทียบกับ PV
      if (cycleHistory.length >= 2) {
        const prev      = cycleHistory[cycleHistory.length - 2];
        const prevScrap = prev.scrap1 + prev.scrap2;
        const currScrap = latestCycle.scrap1 + latestCycle.scrap2;
        const pvMixOut  = pvHistory.reduce((s, p) => s + p.mixOldScrap + p.mixHoldScrap, 0);
        const pvNewScrap= pvHistory.reduce((s, p) => s + p.newScrap + p.newHold, 0);

        if (prevScrap > 0 && currScrap < prevScrap) {
          const dropped = prevScrap - currScrap;
          if (pvMixOut > 0) {
            insights.push({ type: 'ok', msg: `เศษลดลง ${dropped} เส้น — มีหลักฐานการนำไปผสมใน Production Verify (${pvMixOut} เส้น)` });
          } else {
            insights.push({ type: 'warn', msg: `เศษลดลง ${dropped} เส้น — แต่ไม่พบบันทึกการนำไปผสมใน Production Verify (30 วัน) โปรดตรวจสอบ` });
          }
        }
        if (pvNewScrap > 0 && currScrap > prevScrap) {
          insights.push({ type: 'info', msg: `เศษเพิ่มขึ้น ${currScrap - prevScrap} เส้น — สอดคล้องกับเศษใหม่จากการผลิต (${pvNewScrap} เส้น)` });
        }
      }

      // Diff ระหว่าง Cycle ปัจจุบันกับ PV
      if (latestCycle.diff !== 0) {
        const pvActual = pvHistory.reduce((s, p) => s + (p.fullBundle * 10), 0); // approx
        if (pvHistory.length > 0) {
          insights.push({ type: 'info', msg: `Production Verify (30 วัน): มัดเต็มรวม ${pvHistory.reduce((s,p)=>s+p.fullBundle,0)} มัด | ผสมเศษเก่าออก ${pvHistory.reduce((s,p)=>s+p.mixOldScrap,0)} เส้น | เศษใหม่เข้า ${pvHistory.reduce((s,p)=>s+p.newScrap,0)} เส้น` });
        } else {
          insights.push({ type: 'neutral', msg: 'ไม่พบข้อมูล Production Verify ในช่วง 30 วัน' });
        }
      }
    }

    if (insights.length === 0) {
      insights.push({ type: 'ok', msg: 'ไม่พบความผิดปกติ หรือยังไม่มีข้อมูลเปรียบเทียบเพียงพอ' });
    }

    return {
      success: true,
      sku,
      refDate: refDateStr,
      cycleHistory,
      movements,
      movementSummary: { totalIn, totalOut, totalOther },
      pvHistory,
      expectedQty,
      baseLabel,
      insights
    };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
// ══════════════════════════════════════════════════════════════════════════════
// LOGISTIC MODULE — Code.gs v2
// เพิ่มต่อท้าย Code.gs เดิม (ใช้ SPREADSHEET_ID จากไฟล์หลัก)
// ──────────────────────────────────────────────────────────────────────────────
// Sheet ที่อ่าน Master:
//   "TRUCK ID"        → Col A=ทะเบียนรถ, Col B=ประเภทรถ
//   "Driver Name"     → Col A=รหัสพนักงาน, Col B=ชื่อพนักงาน
//   "Customers"→ Col A=รหัสลูกค้า, B=ชื่อร้าน, C=ที่อยู่, D=ผันทาง, E=ระยะทาง(กม.), F=วลาเดินทาง(นาที), G=เซลส์, H=สถานะ
//   "Transport"       → Col A=รหัสขนส่ง, Col B=ชื่อขนส่ง
//   "Product"         → Col A=Product Code, Col B=Productname
//   "TST QC Standard" → Col A=Product Code, B=Productname, C=Range Min W, D=Range Max W, E=Likely W
// Sheet ที่เขียน:
//   "Logistic_Plan"      → header เที่ยวรถ (สร้างอัตโนมัติถ้าไม่มี)
//   "Logistic_Plan_Item" → รายการสินค้าต่อแผน (สร้างอัตโนมัติถ้าไม่มี)
// ══════════════════════════════════════════════════════════════════════════════

const LOGI_PLAN_SHEET   = 'Logistic_Plan';
const LOGI_ITEM_SHEET   = 'Logistic_Plan_Item';
const LOGI_ID_PREFIX    = 'WLTST';

// Master Sheet names
const LOGI_SH_TRUCK     = 'TRUCK ID';
const LOGI_SH_DRIVER    = 'Driver Name';
const LOGI_SH_CUSTOMER  = 'Customers'; // Sheet หลัก: A=รหัส B=ชื่อ C=ที่อยู่ D=เบอร์ E=เซลล์ F=ระยะทาง
const LOGI_SH_TRANSPORT = 'Transport';
const LOGI_SH_PRODUCT   = 'Product';
const LOGI_SH_QC_STD    = 'TST QC Standard';
const LOGI_SH_WH_STAFF  = 'Team Operation';

// ─────────────────────────────────────────────────────────────────────────────
// generateLogisticPlanId()
// รูปแบบ: WLTST{YY}{MM}{SEQ3}  เช่น WLTST2602001
// LockService ป้องกัน race condition
// ─────────────────────────────────────────────────────────────────────────────
function generateLogisticPlanId() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now    = new Date();
    const yy     = Utilities.formatDate(now, 'GMT+7', 'yy');
    const mm     = Utilities.formatDate(now, 'GMT+7', 'MM');
    const prefix = LOGI_ID_PREFIX + yy + mm;

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = _getOrCreateLogiPlanSheet(ss);

    let maxSeq  = 0;
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const planIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      planIds.forEach(function(row) {
        const id = String(row[0] || '');
        if (id.startsWith(prefix)) {
          const seq = parseInt(id.slice(prefix.length), 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });
    }
    return prefix + String(maxSeq + 1).padStart(3, '0');
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getLogisticMasterData()
// ดึง Master ทั้งหมด: ทะเบียนรถ, คนขับ, ขนส่ง, ร้านค้า, สินค้า+LikelyW
// ─────────────────────────────────────────────────────────────────────────────
function getLogisticMasterData() {
  return _withCache('logisticMaster', 30, function() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── 1. ทะเบียนรถ (TRUCK ID): Col A=ทะเบียน, B=ประเภท, C=netWeight, D=capแม่, E=capลูก ──
    var trucks = [];
    var truckSheet = ss.getSheetByName(LOGI_SH_TRUCK);
    if (truckSheet && truckSheet.getLastRow() >= 2) {
      var td = truckSheet.getDataRange().getValues();
      for (var i = 1; i < td.length; i++) {
        var plate     = String(td[i][0] || '').trim();
        var type      = String(td[i][1] || '').trim();
        var netWeight = parseFloat(td[i][2]) || 0;
        var capMother = parseFloat(td[i][3]) || 0;   // Col D: ความจุรถแม่ (kg)
        var capChild  = parseFloat(td[i][4]) || 0;   // Col E: ความจุรถลูก/หางพ่วง (kg)
        var childPlate = String(td[i][5] || '').trim();  // Col F: ทะเบียนรถลูก (เพิ่มใน Sheet)
        var isTrailer = capMother > 0 && capChild > 0; // มี capแม่+ลูก = รถพ่วง
        if (plate) trucks.push({ plate: plate, type: type, netWeight: netWeight,
                                 isTrailer: isTrailer, capMother: capMother, capChild: capChild,
                                 childPlate: childPlate });
      }
    }

    // ── 2. คนขับ (Driver Name): Col A=รหัส, B=ชื่อ, C=canTrailer, D=trailerPriority ──
    // trailerPriority: 1=ขับก่อน (คนขับหลัก), 2=สำรอง (เช่น หัวหน้างาน)
    // ถ้าไม่ระบุ Col D → default = 1
    var drivers = [];
    var driverSheet = ss.getSheetByName(LOGI_SH_DRIVER);
    if (driverSheet && driverSheet.getLastRow() >= 2) {
      var dd = driverSheet.getDataRange().getValues();
      for (var i = 1; i < dd.length; i++) {
        var empId           = String(dd[i][0] || '').trim();
        var empName         = String(dd[i][1] || '').trim();
        var canTrailer      = String(dd[i][2] || '').trim().toUpperCase() === 'TRUE'; // Col C
        var trailerPriority = parseInt(dd[i][3]) || 1; // Col D: 1=หลัก, 2=สำรอง (default=1)
        if (empName) drivers.push({ id: empId, name: empName, canTrailer: canTrailer, trailerPriority: trailerPriority });
      }
    }

    // ── 3. ขนส่ง (Transport): Col A=รหัส, B=ชื่อ ────────────────────────────
    var transports = [];
    var transSheet = ss.getSheetByName(LOGI_SH_TRANSPORT);
    if (transSheet && transSheet.getLastRow() >= 2) {
      var tt = transSheet.getDataRange().getValues();
      for (var i = 1; i < tt.length; i++) {
        var transId   = String(tt[i][0] || '').trim();
        var transName = String(tt[i][1] || '').trim();
        var transCap = parseFloat(tt[i][2]) || 0;
        if (transName) transports.push({ id: transId, name: transName, capacity: transCap });
      }
    }

    // ── 4. ร้านค้า (Customers): A=รหัส B=ชื่อ C=ที่อยู่ D=เบอร์ E=เซลล์ F=ระยะทาง G=noTrailer ──
    // Col G = TRUE หมายถึง ร้านนี้รถพ่วงเข้าไม่ได้ (ถนนแคบ, ที่จอดไม่พอ ฯลฯ)
    var shops = [];
    var custSheet = ss.getSheetByName(LOGI_SH_CUSTOMER);
    if (custSheet && custSheet.getLastRow() >= 2) {
      var cd = custSheet.getDataRange().getValues();
      for (var i = 1; i < cd.length; i++) {
        var cid        = String(cd[i][0] || '').trim();  // Col A: รหัสลูกค้า
        var cname      = String(cd[i][1] || '').trim();  // Col B: ชื่อร้าน
        var address    = String(cd[i][2] || '').trim();  // Col C: ที่อยู่
        var phone      = String(cd[i][3] || '').trim();  // Col D: เบอร์ติดต่อ
        var sale       = String(cd[i][4] || '').trim();  // Col E: เซลล์รับผิดชอบ
        var distance   = parseFloat(cd[i][5]) || 0;      // Col F: ระยะทาง (กม.)
        var noTrailer  = String(cd[i][6] || '').trim().toUpperCase() === 'TRUE'; // Col G: พ่วงเข้าไม่ได้
        if (cid && cname) {
          shops.push({ id: cid, name: cname, address: address, phone: phone, sale: sale,
                       distance: distance, freeDistance: 0, zone: '', noTrailer: noTrailer });
        }
      }
    }

    // ── 5. QC Standard map (TST QC Standard): A=SKU, B=Name, C=MinW, D=MaxW, E=LikelyW ──
    var qcMap = {};
    var qcSheet = ss.getSheetByName(LOGI_SH_QC_STD);
    if (qcSheet && qcSheet.getLastRow() >= 2) {
      var qd = qcSheet.getDataRange().getValues();
      for (var i = 1; i < qd.length; i++) {
        var sku = String(qd[i][0] || '').trim();
        if (!sku) continue;
        qcMap[sku] = {
          name:    String(qd[i][1] || '').trim(),
          minW:    parseFloat(qd[i][2]) || 0,
          maxW:    parseFloat(qd[i][3]) || 0,
          likelyW: parseFloat(qd[i][4]) || 0   // ← ใช้ค่านี้คำนวณน้ำหนัก
        };
      }
    }

    // ── 6. สินค้า (Product): A=Product Code, B=Productname ──────────────────
    var products = [];
    var prodSheet = ss.getSheetByName(LOGI_SH_PRODUCT);
    if (prodSheet && prodSheet.getLastRow() >= 2) {
      var pd = prodSheet.getDataRange().getValues();
      for (var i = 1; i < pd.length; i++) {
        var sku  = String(pd[i][0] || '').trim();
        var name = String(pd[i][1] || '').trim();
        if (!sku) continue;
        var qc = qcMap[sku] || {};
        products.push({
          sku:            sku,
          name:           name || qc.name || '',
          likelyW:        qc.likelyW || 0,
          minW:           qc.minW    || 0,
          maxW:           qc.maxW    || 0,
          linesPerBundle: Number(pd[i][2]) || 1   // Col C: เส้น/มัด
        });
      }
    } else {
      // Fallback: ใช้จาก QC Standard ถ้าไม่มีชีต Product
      Object.keys(qcMap).forEach(function(sku) {
        var qc = qcMap[sku];
        products.push({ sku: sku, name: qc.name, likelyW: qc.likelyW, minW: qc.minW, maxW: qc.maxW, linesPerBundle: 1 });
      });
    }

    // ── 7. พนักงาน WH (Team Operation): A=รหัสพนักงาน, B=ชื่อพนักงาน, C=ชื่อทีม ──
    var whStaff = [];
    var staffSheet = ss.getSheetByName(LOGI_SH_WH_STAFF);
    if (staffSheet && staffSheet.getLastRow() >= 2) {
      var sd = staffSheet.getDataRange().getValues();
      for (var i = 1; i < sd.length; i++) {
        var sId   = String(sd[i][0] || '').trim();
        var sName = String(sd[i][1] || '').trim();
        var sTeam = String(sd[i][2] || '').trim();
        if (sName) whStaff.push({ id: sId, name: sName, team: sTeam });
      }
    }

    return {
      success:    true,
      trucks:     trucks,
      drivers:    drivers,
      transports: transports,
      shops:      shops,
      products:   products,
      whStaff:    whStaff
    };

  } catch (e) {
    return { success: false, message: e.toString(), trucks: [], drivers: [], transports: [], shops: [], products: [], whStaff: [] };
  }
  }); // end _withCache
}

// ── ล้าง GAS-side cache ของ logisticMaster (เรียกจากปุ่มรีเฟรชใน frontend) ──
function clearLogiMasterCache() {
  try {
    CacheService.getScriptCache().remove('logisticMaster');
    return { success: true };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveLogisticPlan(payload)
// สร้าง PlanID ฝั่ง server → บันทึกลงชีต → return { success, planId }
// ─────────────────────────────────────────────────────────────────────────────
function saveLogisticPlan(payload) {
  try {
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var planSheet = _getOrCreateLogiPlanSheet(ss);
    var itemSheet = _getOrCreateLogiItemSheet(ss);
    var nowStr    = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    var user      = Session.getActiveUser().getEmail() || 'unknown';

    // ── ถ้ามี planId ส่งมา = UPDATE: ลบของเดิมทิ้งก่อน ──
    var isUpdate = !!(payload.planId);
    var planId   = isUpdate ? String(payload.planId) : generateLogisticPlanId();

    // ── Trailer split: childPlate มีค่า → แยก 2 PlanID (-M แม่, -C ลูก) ──
    var childPlate     = payload.truckType === 'hire' ? '' : (payload.childPlate || '');
    var trailerMode    = String(payload.trailerMode || '');
    if (trailerMode === 'mother_only') { childPlate = ''; }  // force single-truck mode
    var isTrailerSplit  = !!(childPlate);
    var basePlanId     = planId.replace(/-[MC]$/, '');  // strip suffix กรณี update
    var planIdM = isTrailerSplit ? basePlanId + '-M' : basePlanId;
    var planIdC = isTrailerSplit ? basePlanId + '-C' : null;
    planId = basePlanId; // normalize

    if (isUpdate) {
      // ลบแถวเดิมออกจาก planSheet — รวม -M และ -C variants
      if (planSheet.getLastRow() >= 2) {
        var pr = planSheet.getRange(2, 1, planSheet.getLastRow() - 1, 1).getValues();
        for (var pi = pr.length - 1; pi >= 0; pi--) {
          var rid = String(pr[pi][0]);
          if (rid === basePlanId || rid === basePlanId + '-M' || rid === basePlanId + '-C') {
            planSheet.deleteRow(pi + 2);
          }
        }
      }
      // ลบแถวเดิมออกจาก itemSheet — รวม -M และ -C variants
      if (itemSheet.getLastRow() >= 2) {
        var ir = itemSheet.getRange(2, 1, itemSheet.getLastRow() - 1, 1).getValues();
        for (var ii2 = ir.length - 1; ii2 >= 0; ii2--) {
          var rid2 = String(ir[ii2][0]);
          if (rid2 === basePlanId || rid2 === basePlanId + '-M' || rid2 === basePlanId + '-C') {
            itemSheet.deleteRow(ii2 + 2);
          }
        }
      }
    }

    // ── บันทึกหัวแผน ──
    // Col: A=PlanID B=วันที่ C=ประเภทรถ D=Driver/Transport E=TripNo
    //      F=ประเภทงาน G=ร้านค้า H=ระยะทาง I=ค่าStop J=ค่าจ้าง
    //      K=เซลล์ L=สถานะ M=คลังสินค้า N=สาเหตุซ่อมบำรุง/ไม่สำเร็จ O=ทะเบียนรถ P=ระยะทางขากลับ
    var driverOrTransport = payload.truckType === 'hire' ? (payload.transportName || '') : (payload.driverName || '');
    var tripNo            = payload.truckType === 'hire' ? '' : (payload.tripNo || '');
    var truckPlate        = payload.truckType === 'hire' ? '' : (payload.truckPlate || '');
    var shops             = payload.shops || [];
    var isTransferJob     = (payload.jobType === 'transfer_fg' || payload.jobType === 'transfer_semi');
    var shopNames;
    if (isTransferJob) {
      shopNames = (payload.whSource || '') + ' → ' + (payload.whDest || '');
    } else {
      shopNames = shops.map(function(s) { return s.shopName || ''; }).filter(Boolean).join(', ');
    }
    var totalDistance     = shops.reduce(function(sum, s) { return sum + (parseFloat(s.distance) || 0); }, 0);
    var uniqueSales       = [];
    shops.forEach(function(s) { if (s.sale && uniqueSales.indexOf(s.sale) < 0) uniqueSales.push(s.sale); });
    var saleStr           = uniqueSales.join(', ');
    var failReason        = payload.failReason || payload.pmDetail || '';

    // ── เขียน 1 แถวต่อร้าน ──
    // A–F, J, L, N, O, P = ข้อมูลระดับเที่ยว (ซ้ำทุกแถว)
    // G, H, I, K, M      = ข้อมูลต่อร้าน (ใช้คอลัมน์เดิม)
    // Q, R, S            = ข้อมูลต่อร้านเพิ่มเติม (คอลัมน์ใหม่)
    var planTrip = [
      planIdM,                              // A: PlanID (จะถูก override ต่อร้านสำหรับ trailer)
      payload.date             || '',       // B: วันที่
      payload.truckType        || 'company',// C: ประเภทรถ
      driverOrTransport,                    // D: Driver/Transport
      tripNo,                               // E: TripNo
      payload.jobType          || ''        // F: ประเภทงาน
    ];
    var planTail = [
      parseFloat(payload.wage) || 0,        // J: ค่าจ้าง
      payload.status           || 'planned',// L: สถานะ
      payload.warehouse        || '',       // M ← จะถูก override ด้วย loadWarehouse ต่อร้าน
      failReason,                           // N: สาเหตุซ่อมบำรุง/ไม่สำเร็จ
      truckPlate,                           // O: ทะเบียนรถ
      parseFloat(payload.returnDistance) || 0 // P: ระยะทางขากลับ (กม.)
    ];

    if (shops.length === 0 || payload.jobType === 'maintenance_pm') {
      // PM / ไม่มีร้าน → 1 แถว
      planSheet.appendRow(planTrip.concat([
        shopNames,     // G
        totalDistance, // H
        parseFloat(payload.stopFee) || 0, // I
        planTail[0],   // J
        saleStr,       // K
        planTail[1],   // L
        planTail[2],   // M
        planTail[3],   // N
        planTail[4],   // O
        planTail[5],   // P
        '','','',      // Q,R,S ว่าง
        trailerMode    // T: รูปแบบการวิ่งรถพ่วง
      ]));
    } else {
      shops.forEach(function(shop, si) {
        var shopItems = shop.items || [];

        // ── Determine which planIds/plates this shop uses (item-level split) ──
        var planRows = [];
        if (!isTrailerSplit) {
          planRows.push({ pid: planIdM, plate: truckPlate });
        } else {
          var hasMotherItems = shopItems.length === 0
            ? (shop.truckLabel !== 'child')
            : shopItems.some(function(it) { return (it.truckLabel || 'mother') !== 'child'; });
          var hasChildItems  = shopItems.length === 0
            ? (shop.truckLabel === 'child')
            : shopItems.some(function(it) { return it.truckLabel === 'child'; });
          if (hasMotherItems) planRows.push({ pid: planIdM, plate: truckPlate });
          if (hasChildItems)  planRows.push({ pid: planIdC, plate: childPlate });
          if (planRows.length === 0) planRows.push({ pid: planIdM, plate: truckPlate });
        }

        planRows.forEach(function(pr) {
          var rowTrip = planTrip.slice(); rowTrip[0] = pr.pid;
          planSheet.appendRow(rowTrip.concat([
            shop.shopName        || '',            // G: ชื่อร้านค้า (1 ร้านต่อแถว)
            parseFloat(shop.distance)     || 0,   // H: ระยะทางต่อร้าน
            parseFloat(shop.freeDistance) || 0,   // I: ระยะทางฟรีต่อร้าน (ค่าStop)
            planTail[0],                           // J: ค่าจ้าง
            shop.sale            || '',            // K: เซลล์ร้าน
            planTail[1],                           // L: สถานะ
            shop.loadWarehouse   || '',            // M: คลังโหลด
            planTail[3],                           // N: สาเหตุ
            pr.plate,                              // O: ทะเบียนรถ (แม่หรือลูก)
            planTail[5],                           // P: ระยะทางขากลับ
            si,                                    // Q: ลำดับร้าน (0-based)
            shop.shopId          || '',            // R: รหัสร้านค้า
            shop.remark          || '',            // S: หมายเหตุ/ความด่วน
            trailerMode                            // T: รูปแบบการวิ่งรถพ่วง
          ]));
        });
      });
    }

    // ── บันทึกรายการสินค้าต่อร้าน ──
    // Col: A=PlanID B=รหัสสินค้า C=ชื่อสินค้า D=จำนวน E=น้ำหนักต่อหน่วย F=น้ำหนักรวม
    //      G=ประเภทงาน H=ร้านค้า I=คลังสินค้า J=วันที่ K=สถานะ L=ทะเบียนรถ M=คลังโหลด
    //      N=ระยะทาง(กม.) O=หมายเหตุ/ความด่วน
    var itemRows = [];

    // โค้ด GAS FIX: รองรับ Transfer ที่ส่ง transferItems ฮีลดส์โดยตรง (ผ่าน payload.transferItems)
    var jobTypeVal = payload.jobType ? String(payload.jobType) : '';
    if (jobTypeVal === 'transfer_fg' || jobTypeVal === 'transfer_semi') {
      var directItems = payload.transferItems || [];
      if (directItems.length > 0) {
        var whSrcDirect = payload.whSource || '';
        var whDstDirect = payload.whDest   || '';
        directItems.forEach(function(item) {
          if (!item.sku) return;
          itemRows.push([
            planId,
            item.sku              || '',
            item.productName      || '',
            item.qty              || 0,
            item.weightPerUnit    || 0,
            item.weight           || 0,
            payload.jobType       || '',
            whSrcDirect + ' → ' + whDstDirect,
            payload.warehouse     || whSrcDirect,
            payload.date          || '',
            payload.status        || 'planned',
            truckPlate,
            whSrcDirect,
            0,
            payload.transferRemark || ''
          ]);
        });
      }
    }

    if (!isTransferJob) shops.forEach(function(shop, si) {
      // baseRow ใช้ค่า default ของร้าน (planId/plate จะ override ต่อ item)
      var baseRow = [
        planIdM,                              // A: PlanID (placeholder — override ต่อ item)
        '',                                   // B: รหัสสินค้า (placeholder)
        '',                                   // C: ชื่อสินค้า
        0,                                    // D: จำนวน
        0,                                    // E: น้ำหนักต่อหน่วย
        0,                                    // F: น้ำหนักรวม
        payload.jobType       || '',          // G: ประเภทงาน
        shop.shopName         || '',          // H: ร้านค้า
        payload.warehouse     || '',          // I: คลังสินค้า
        payload.date          || '',          // J: วันที่
        payload.status        || 'planned',   // K: สถานะ
        truckPlate,                           // L: ทะเบียนรถ (placeholder — override ต่อ item)
        shop.loadWarehouse    || '',          // M: คลังโหลด
        parseFloat(shop.distance)     || 0,   // N: ระยะทาง (กม.) — per-shop
        shop.remark                || '',     // O: หมายเหตุ/ความด่วน — per-shop
        si,                                   // P: shopSeq — ลำดับร้านในเที่ยว (0-based)
        parseFloat(shop.freeDistance) || 0,   // Q: ระยะทางฟรี (กม.) — per-shop
        shop.shopId           || ''           // R: รหัสร้านค้า
      ];

      // ถ้าร้านไม่มีสินค้า → placeholder 1 แถว โดยใช้ shop.truckLabel
      if (!shop.items || shop.items.length === 0) {
        var defLabel  = shop.truckLabel || 'mother';
        var defPlanId = isTrailerSplit ? (defLabel === 'child' ? planIdC : planIdM) : planIdM;
        var defPlate  = isTrailerSplit ? (defLabel === 'child' ? childPlate : truckPlate) : truckPlate;
        var defRow = baseRow.slice();
        defRow[0]  = defPlanId;
        defRow[11] = defPlate;
        itemRows.push(defRow);
        return;
      }

      // ── Item-level split: แต่ละ item เลือกรถแม่หรือลูกเองได้ ──
      shop.items.forEach(function(item) {
        if (!item.sku) return;
        var itemLabel  = item.truckLabel || shop.truckLabel || 'mother';
        var itemPlanId = isTrailerSplit ? (itemLabel === 'child' ? planIdC : planIdM) : planIdM;
        var itemPlate  = isTrailerSplit ? (itemLabel === 'child' ? childPlate : truckPlate) : truckPlate;
        var row = baseRow.slice();
        row[0]  = itemPlanId;               // A: PlanID (แม่หรือลูก ตาม item)
        row[1]  = item.sku           || ''; // B: รหัสสินค้า
        row[2]  = item.productName   || ''; // C: ชื่อสินค้า
        row[3]  = item.qty           || 0;  // D: จำนวน
        row[4]  = item.weightPerUnit || 0;  // E: น้ำหนักต่อหน่วย
        row[5]  = item.weight        || 0;  // F: น้ำหนักรวม
        row[11] = itemPlate;                // L: ทะเบียนรถ (แม่หรือลูก ตาม item)
        itemRows.push(row);
      });
    });

    if (itemRows.length > 0) {
      itemSheet
        .getRange(itemSheet.getLastRow() + 1, 1, itemRows.length, itemRows[0].length)
        .setValues(itemRows);
    }

    var savedMsg = isTrailerSplit
      ? 'บันทึกสำเร็จ: ' + planIdM + ' (แม่) + ' + planIdC + ' (ลูก)'
      : 'บันทึกสำเร็จ: ' + planIdM;
    return { success: true, planId: basePlanId, planIdM: planIdM, planIdC: planIdC,
             isTrailerSplit: isTrailerSplit, message: savedMsg };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getLogisticPlans(date)
// ─────────────────────────────────────────────────────────────────────────────
function getLogisticPlans(date) {
  try {
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var planSheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    var itemSheet = ss.getSheetByName(LOGI_ITEM_SHEET);

    if (!planSheet || planSheet.getLastRow() < 2) return { success: true, plans: [] };

    var planData  = planSheet.getDataRange().getValues();
    var planMap   = {};
    var planOrder = [];

    for (var i = 1; i < planData.length; i++) {
      var row     = planData[i];
      var pid     = String(row[0] || '');
      if (!pid) continue;
      var rowDate = row[1] instanceof Date
        ? Utilities.formatDate(row[1], 'GMT+7', 'yyyy-MM-dd')
        : String(row[1] || '').substring(0, 10);
      if (date && rowDate !== date) continue;

      // Col: A=PlanID B=วันที่ C=ประเภทรถ D=Driver/Transport E=TripNo
      //      F=ประเภทงาน G=ร้านค้า H=ระยะทาง I=ค่าStop J=ค่าจ้าง
      //      K=เซลล์ L=สถานะ M=คลังสินค้า N=สาเหตุ O=ทะเบียนรถ P=ระยะทางขากลับ
      //      Q=ลำดับร้าน R=รหัสร้านค้า S=หมายเหตุ/ความด่วน
      if (!planMap[pid]) {
        planOrder.push(pid);
        var isNewFmt = (row[16] !== '' && row[16] !== null && row[16] !== undefined);
        // Trailer pair metadata
        var _pairId   = pid.replace(/-[MC]$/, '');
        var _isMother = pid.endsWith('-M');
        var _isChild  = pid.endsWith('-C');
        planMap[pid] = {
          id:              pid,
          pairId:          _pairId,
          isMother:        _isMother,
          isChild:         _isChild,
          date:            rowDate,
          truckType:       String(row[2]  || 'company'),
          driverTransport: String(row[3]  || ''),
          tripNo:          String(row[4]  || ''),
          jobType:         String(row[5]  || ''),
          shopNames:       isNewFmt ? '' : String(row[6]  || ''),
          distance:        isNewFmt ? 0 : (parseFloat(row[7])  || 0),
          stopFee:         isNewFmt ? 0 : (parseFloat(row[8])  || 0),
          wage:            parseFloat(row[9])  || 0,
          sale:            String(row[10] || ''),
          status:          String(row[11] || 'planned'),
          warehouse:       String(row[12] || ''),
          failReason:      String(row[13] || ''),
          transferRemark:  String(row[13] || ''),
          truckPlate:      String(row[14] || ''),
          returnDistance:  parseFloat(row[15]) || 0,
          trailerMode:     String(row[19] || ''),
          whSource:        (function(g){ var p=String(g||'').split(' → '); return p[0]?p[0].trim():''; })(row[6]),
          whDest:          (function(g){ var p=String(g||'').split(' → '); return p[1]?p[1].trim():''; })(row[6]),
          totalWeight:     0,
          shops:           []
        };
      }

      // ── อ่าน shop จากคอลัมน์ Q(16) ถ้ามี = format ใหม่ (per-shop row) ──
      var hasShopRow = (row[16] !== '' && row[16] !== null && row[16] !== undefined);
      if (hasShopRow) {
        planMap[pid].distance += parseFloat(row[7]) || 0;  // H: สะสมระยะทาง
        planMap[pid].stopFee  += parseFloat(row[8]) || 0;  // I: สะสมค่าStop
        planMap[pid].shops.push({
          shopSeq:       parseInt(row[16]) || 0,       // Q
          shopId:        String(row[17] || ''),         // R
          shopName:      String(row[6]  || ''),         // G
          distance:      parseFloat(row[7])  || 0,     // H
          freeDistance:  parseFloat(row[8])  || 0,     // I
          sale:          String(row[10] || ''),         // K
          loadWarehouse: String(row[12] || ''),         // M
          remark:        String(row[18] || ''),         // S
          truckLabel:    String(row[0]).endsWith('-C') ? 'child' : 'mother',
          items: []
        });
        // อัปเดต shopNames จาก per-shop rows
        var sn = String(row[6] || '');
        if (sn && planMap[pid].shopNames.indexOf(sn) < 0) {
          planMap[pid].shopNames += (planMap[pid].shopNames ? ', ' : '') + sn;
        }
      }
    }

    var plans = planOrder.map(function(pid) { return planMap[pid]; });

    // แนบรายการสินค้าต่อร้าน
    if (itemSheet && itemSheet.getLastRow() >= 2) {
      var itemData = itemSheet.getDataRange().getValues();
      // ใช้ planMap ที่สร้างไว้แล้ว

      // Col: A=PlanID B=SKU C=Name D=Qty E=WeightPerUnit F=TotalWeight
      //      G=JobType H=ShopName I=Warehouse J=Date K=Status L=TruckPlate M=LoadWarehouse
      //      N=ระยะทาง O=หมายเหตุ P=shopSeq Q=ระยะทางฟรี R=shopId
      for (var j = 1; j < itemData.length; j++) {
        var irow = itemData[j];
        var pid  = String(irow[0] || '');
        var plan = planMap[pid];
        if (!plan) continue;

        var shopName = String(irow[7] || '');
        if (!shopName) continue;  // ข้ามแถวที่ไม่มีชื่อร้าน (ข้อมูลเสีย)

        var _lgShopSeq = (irow[15] !== undefined && irow[15] !== '') ? parseInt(irow[15]) : -1;  // Col P: shopSeq
        var _lgShopId  = String(irow[17] || '');  // Col R: shopId
        var shop = null;
        // ✅ Primary: จับคู่ด้วย shopSeq (unique ต่อร้านในแผน) — รองรับร้านชื่อเดียวกันที่กดเพิ่มแยกกัน
        if (_lgShopSeq >= 0) {
          for (var k = 0; k < plan.shops.length; k++) {
            if (plan.shops[k].shopSeq === _lgShopSeq) { shop = plan.shops[k]; break; }
          }
        }
        // Fallback: shopId + shopName (ข้อมูลเก่าที่ไม่มี shopSeq)
        if (!shop) {
          for (var k = 0; k < plan.shops.length; k++) {
            var _s = plan.shops[k];
            if (_lgShopId && _s.shopId) {
              if (_s.shopId === _lgShopId && _s.shopName === shopName) { shop = _s; break; }
            } else {
              if (_s.shopName === shopName) { shop = _s; break; }
            }
          }
        }
        if (!shop) {
          shop = {
            shopId:        _lgShopId,
            shopName:      shopName,
            loadWarehouse: String(irow[12] || ''),
            distance:      parseFloat(irow[13]) || 0,    // Col N: ระยะทาง per-shop
            remark:        String(irow[14] || ''),        // Col O: หมายเหตุ/ความด่วน
            shopSeq:       _lgShopSeq >= 0 ? _lgShopSeq : 9999,  // Col P
            freeDistance:  parseFloat(irow[16]) || 0,    // Col Q: ระยะทางฟรี per-shop
            items:         []
          };
          plan.shops.push(shop);
        }
        // ข้ามการ push item ถ้าเป็นแถว placeholder (SKU ว่าง)
        if (!irow[1]) continue;
        var itemWt = parseFloat(irow[5]) || 0;
        var _lgItemTruckLabel = String(irow[0]).endsWith('-C') ? 'child' : 'mother';
        shop.items.push({
          sku:           String(irow[1] || ''),
          productName:   String(irow[2] || ''),
          qty:           parseFloat(irow[3]) || 0,
          weightPerUnit: parseFloat(irow[4]) || 0,
          weight:        itemWt,
          truckLabel:    _lgItemTruckLabel
        });
        plan.totalWeight += itemWt;
      }
    }

    // sort shops ตาม shopSeq (ลำดับที่บันทึกไว้)
    plans.forEach(function(p) {
      p.shops.sort(function(a, b) { return (a.shopSeq || 0) - (b.shopSeq || 0); });
    });

    plans.sort(function(a, b) { return b.id.localeCompare(a.id); });
    return { success: true, plans: plans };

  } catch (e) {
    return { success: false, message: e.toString(), plans: [] };
  }
}

// ── getAutoplanBundle(tomorrowStr) ────────────────────────────────────────────
// รวม 3 การทำงานใน 1 call: โหลด SO + match ร้าน + ดึง plannedShopIds
// แทนการเรียก getReadyToShipOrders + getPlannedShopIdsByDateRange แยกกัน
function getAutoplanBundle(tomorrowStr) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── 1. สร้าง shopMap จาก Customers (สำหรับ match) ─────────────────────────
    var shopMap = {}; // key = ชื่อร้าน lowercase → { id, name }
    var custSheet = ss.getSheetByName(LOGI_SH_CUSTOMER);
    if (custSheet && custSheet.getLastRow() >= 2) {
      var cd = custSheet.getDataRange().getValues();
      for (var i = 1; i < cd.length; i++) {
        var cid   = String(cd[i][0] || '').trim();
        var cname = String(cd[i][1] || '').trim();
        if (cid && cname) shopMap[cname.toLowerCase()] = { id: cid, name: cname };
      }
    }
    var shopKeys = Object.keys(shopMap);

    // ── 2. โหลด SO จาก 'จองพร้อมส่ง' ─────────────────────────────────────────
    var items = [];
    var soSheet = ss.getSheetByName('จองพร้อมส่ง');
    if (soSheet && soSheet.getLastRow() >= 2) {
      var data    = soSheet.getDataRange().getValues();
      var headers = data[0];
      var colIdx  = {};
      headers.forEach(function(h, i) { colIdx[String(h).trim().toLowerCase()] = i; });

      var iShop    = colIdx['delivery name']  !== undefined ? colIdx['delivery name']  : 3;
      var iDate    = colIdx['ship date']       !== undefined ? colIdx['ship date']       : 6;
      var iItemNo  = colIdx['item number']     !== undefined ? colIdx['item number']     : 7;
      var iProd    = colIdx['product name']    !== undefined ? colIdx['product name']    : 8;
      var iQty     = colIdx['qty']             !== undefined ? colIdx['qty']             : 11;
      var iWeight  = colIdx['kg/จอง']          !== undefined ? colIdx['kg/จอง']          : 31;

      for (var r = 1; r < data.length; r++) {
        var row      = data[r];
        var shopRaw  = String(row[iShop]  || '').trim();
        var productN = String(row[iProd]  || '').trim();
        if (!shopRaw || !productN) continue;

        // แปลงวันที่
        var sd = '';
        var rawD = row[iDate];
        if (rawD) {
          var dObj = rawD instanceof Date ? rawD : new Date(rawD);
          if (!isNaN(dObj.getTime())) {
            sd = dObj.getFullYear() + '-' +
                 String(dObj.getMonth() + 1).padStart(2, '0') + '-' +
                 String(dObj.getDate()).padStart(2, '0');
          }
        }

        // match ร้านค้า (exact → substring → token)
        var matched = false, shopId = null, shopName = '';
        var rawLow = shopRaw.toLowerCase().trim();
        if (shopMap[rawLow]) {
          var m = shopMap[rawLow]; matched = true; shopId = m.id; shopName = m.name;
        } else {
          for (var k = 0; k < shopKeys.length && !matched; k++) {
            var sn = shopKeys[k];
            if (rawLow.indexOf(sn) >= 0 || sn.indexOf(rawLow) >= 0) {
              matched = true; shopId = shopMap[sn].id; shopName = shopMap[sn].name;
            }
          }
          if (!matched) {
            var tokens = rawLow.split(/\s+/).filter(function(t) { return t.length > 3; });
            for (var k = 0; k < shopKeys.length && !matched; k++) {
              var sn = shopKeys[k];
              for (var t = 0; t < tokens.length && !matched; t++) {
                if (sn.indexOf(tokens[t]) >= 0) {
                  matched = true; shopId = shopMap[sn].id; shopName = shopMap[sn].name;
                }
              }
            }
          }
        }

        items.push({
          shopRaw: shopRaw, shipDate: sd,
          itemNo: String(row[iItemNo] || '').trim(),
          productName: productN,
          qty: parseFloat(row[iQty]) || 0,
          weightKg: parseFloat(row[iWeight]) || 0,
          matched: matched, shopId: shopId, shopName: shopName
        });
      }
    }

    // ── 3. ดึง plannedShopIds สำหรับวันพรุ่งนี้ ────────────────────────────────
    var plannedShopIds = [];
    if (tomorrowStr) {
      var planSheet = ss.getSheetByName(LOGI_PLAN_SHEET);
      if (planSheet && planSheet.getLastRow() >= 2) {
        var pd = planSheet.getDataRange().getValues();
        var idMap = {};
        for (var i = 1; i < pd.length; i++) {
          var rowDate = '';
          var rawDate2 = pd[i][1]; // Col B: วันที่
          if (rawDate2 instanceof Date) {
            rowDate = Utilities.formatDate(rawDate2, 'GMT+7', 'yyyy-MM-dd');
          } else {
            rowDate = String(rawDate2 || '').substring(0, 10);
          }
          if (rowDate === tomorrowStr) {
            var sid = String(pd[i][17] || '').trim(); // Col R: รหัสร้านค้า
            if (sid) idMap[sid] = true;
          }
        }
        plannedShopIds = Object.keys(idMap);
      }
    }

    return { success: true, items: items, plannedShopIds: plannedShopIds };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ── ดึง shopId ที่ถูกวางแผนไปแล้วในช่วงวันที่ ─────────────────────────────────
function getPlannedShopIdsByDateRange(startDate, endDate) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    // ศูนย์รวมแผนอยู่ที่ Logistic_Plan เสมอ: Col B=วันที่, Col R(17)=รหัสร้านค้า
    var planSheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    if (!planSheet || planSheet.getLastRow() < 2) return { success: true, plannedShopIds: [] };
    var data = planSheet.getDataRange().getValues();
    var ids = {};
    var dateCol   = 1;   // Col B: วันที่
    var shopIdCol = 17;  // Col R: รหัสร้านค้า
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDateRaw = row[dateCol];
      var rowDate = '';
      if (rowDateRaw instanceof Date) {
        rowDate = Utilities.formatDate(rowDateRaw, 'GMT+7', 'yyyy-MM-dd');
      } else {
        rowDate = String(rowDateRaw || '').substring(0, 10);
      }
      if (rowDate < startDate || rowDate > endDate) continue;
      var shopId = String(row[shopIdCol] || '').trim();
      if (shopId) ids[shopId] = true;
    }
    return { success: true, plannedShopIds: Object.keys(ids) };
  } catch(e) {
    return { success: false, plannedShopIds: [], message: e.toString() };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// getLogisticPlanById(planId) — ดึงข้อมูลแผนเดียวสดจาก Sheet ครบทุก field
// รวม driverId, driverName, shopId, distance, remark ฯลฯ
// ─────────────────────────────────────────────────────────────────────────────
function getLogisticPlanById(planId) {
  try {
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var planSheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    var itemSheet = ss.getSheetByName(LOGI_ITEM_SHEET);
    if (!planSheet || planSheet.getLastRow() < 2) return { success: false, message: 'ไม่พบชีต' };

    // ถ้าเป็นแผนแม่ (-M) → โหลด items ของ -C มาด้วย
    var basePlanId  = String(planId).replace(/-[MC]$/, '');
    var isMother    = String(planId).endsWith('-M');
    var childPlanId = isMother ? (basePlanId + '-C') : null;

    var planData = planSheet.getDataRange().getValues();
    var plan = null;

    for (var i = 1; i < planData.length; i++) {
      var row = planData[i];
      // base-match: รองรับทั้ง old plans (WLTST2603149) และ new plans (WLTST2603149-M)
      var _rowBase  = String(row[0]).replace(/-[MC]$/, '');
      var _planBase = String(planId).replace(/-[MC]$/, '');
      if (_rowBase !== _planBase) continue;
      // รวม -M และ -C ทุกแถวไว้ใน plan เดียว (ใช้ truckLabel แยกแทน)

      var rowDate = row[1] instanceof Date
        ? Utilities.formatDate(row[1], 'GMT+7', 'yyyy-MM-dd')
        : String(row[1] || '').substring(0, 10);

      if (!plan) {
        // สร้าง plan object จากแถวแรกที่พบ (A–P เหมือนกันทุกแถว)
        var isNewFmt2 = (row[16] !== '' && row[16] !== null && row[16] !== undefined);
        plan = {
          id:              basePlanId,  // ใช้ base ID (strip -M/-C) เพื่อให้ edit ทำงานถูกต้อง
          date:            rowDate,
          truckType:       String(row[2]  || 'company'),
          driverTransport: String(row[3]  || ''),
          tripNo:          String(row[4]  || ''),
          jobType:         String(row[5]  || ''),
          shopNames:       isNewFmt2 ? '' : String(row[6]  || ''),
          distance:        isNewFmt2 ? 0 : (parseFloat(row[7])  || 0),
          stopFee:         isNewFmt2 ? 0 : (parseFloat(row[8])  || 0),
          wage:            parseFloat(row[9])  || 0,
          sale:            String(row[10] || ''),
          status:          String(row[11] || 'planned'),
          warehouse:       String(row[12] || ''),
          failReason:      String(row[13] || ''),
          transferRemark:  String(row[13] || ''),
          truckPlate:      String(row[14] || ''),
          returnDistance:  parseFloat(row[15]) || 0,
          trailerMode:     String(row[19] || ''),
          whSource:        (function(g){ var p=String(g||'').split(' → '); return p[0]?p[0].trim():''; })(row[6]),
          whDest:          (function(g){ var p=String(g||'').split(' → '); return p[1]?p[1].trim():''; })(row[6]),
          totalWeight:     0,
          shops:           []
        };
      }

      // ── อ่าน shop จากคอลัมน์ Q(16) ถ้ามี = format ใหม่ ──
      var hasShopRow2 = (row[16] !== '' && row[16] !== null && row[16] !== undefined);
      if (hasShopRow2) {
        var _sName = String(row[6]  || '');
        var _sId   = String(row[17] || '');
        var _sSeq  = parseInt(row[16]) || 0;  // Col Q: shopSeq
        // ✅ dup-check ใช้ shopSeq ด้วย — ร้านชื่อเดียวกัน shopId เดียวกัน แต่ shopSeq ต่าง = คนละร้าน
        var _dupShop = null;
        for (var _di = 0; _di < plan.shops.length; _di++) {
          var _ds = plan.shops[_di];
          if (_ds.shopName === _sName && _ds.shopId === _sId && _ds.shopSeq === _sSeq) {
            _dupShop = _ds; break;
          }
        }
        if (!_dupShop) {
          // ร้านใหม่ — เพิ่มและสะสม distance
          plan.distance += parseFloat(row[7]) || 0;
          plan.stopFee  += parseFloat(row[8]) || 0;
          plan.shops.push({
            shopSeq:       _sSeq,
            shopId:        _sId,
            shopName:      _sName,
            distance:      parseFloat(row[7])  || 0,
            freeDistance:  parseFloat(row[8])  || 0,
            sale:          String(row[10] || ''),
            loadWarehouse: String(row[12] || ''),
            remark:        String(row[18] || ''),
            truckLabel:    String(row[0]).endsWith('-C') ? 'child' : 'mother',
            items:         []
          });
        }
        // ถ้า _dupShop มีอยู่แล้ว (shopName+shopId+shopSeq ตรงกัน) → ข้าม
      }
    }
    if (!plan) return { success: false, message: 'ไม่พบ PlanID: ' + planId };

    // ── แนบรายการร้านค้า + สินค้าจาก Item Sheet ──
    if (itemSheet && itemSheet.getLastRow() >= 2) {
      var itemData = itemSheet.getDataRange().getValues();
      // Col: A=PlanID B=รหัสสินค้า C=ชื่อสินค้า D=จำนวน E=น้ำหนักต่อหน่วย F=น้ำหนักรวม
      //      G=ประเภทงาน H=ร้านค้า I=คลังสินค้า J=วันที่ K=สถานะ L=ทะเบียนรถ M=คลังโหลด
      //      N=ระยะทาง(กม.) O=หมายเหตุ/ความด่วน P=shopSeq Q=ระยะทางฟรี R=shopId
      for (var j = 1; j < itemData.length; j++) {
        var irow = itemData[j];
        var itemPlanId  = String(irow[0]);
        // base-match: รองรับทั้ง planId เดิม (ไม่มี suffix) และ planId ใหม่ (-M/-C)
        var _itemBase = itemPlanId.replace(/-[MC]$/, '');
        if (_itemBase !== basePlanId) continue;
        var _itemTruckLabel = itemPlanId.endsWith('-C') ? 'child' : 'mother';

        var shopName = String(irow[7] || '');  // Col H
        if (!shopName) continue;  // ข้ามแถวที่ไม่มีชื่อร้าน

        var _iShopSeq = (irow[15] !== undefined && irow[15] !== '') ? parseInt(irow[15]) : -1;  // Col P: shopSeq
        var _iShopId  = String(irow[17] || '');  // Col R: shopId
        var shop = null;
        // ✅ Primary: จับคู่ด้วย shopSeq (unique ต่อร้านในแผน) — รองรับร้านชื่อเดียวกันที่กดเพิ่มแยกกัน
        if (_iShopSeq >= 0) {
          for (var k = 0; k < plan.shops.length; k++) {
            if (plan.shops[k].shopSeq === _iShopSeq) { shop = plan.shops[k]; break; }
          }
        }
        // Fallback: shopId + shopName (ข้อมูลเก่าที่ไม่มี shopSeq)
        if (!shop) {
          for (var k = 0; k < plan.shops.length; k++) {
            var _s = plan.shops[k];
            if (_iShopId && _s.shopId) {
              if (_s.shopId === _iShopId && _s.shopName === shopName) { shop = _s; break; }
            } else {
              if (_s.shopName === shopName) { shop = _s; break; }
            }
          }
        }
        if (!shop) {
          shop = {
            shopId:        _iShopId,
            shopName:      shopName,
            loadWarehouse: String(irow[12] || ''),     // Col M
            distance:      parseFloat(irow[13]) || 0,  // Col N: ระยะทาง per-shop
            remark:        String(irow[14] || ''),      // Col O: หมายเหตุ/ความด่วน
            shopSeq:       _iShopSeq >= 0 ? _iShopSeq : 9999,  // Col P
            freeDistance:  parseFloat(irow[16]) || 0,  // Col Q: ระยะทางฟรี per-shop
            items:         []
          };
          plan.shops.push(shop);
        }
        // ข้ามการ push item ถ้าเป็นแถว placeholder (SKU ว่าง)
        if (!irow[1]) continue;
        var itemWt = parseFloat(irow[5]) || 0;
        shop.items.push({
          sku:           String(irow[1] || ''),
          productName:   String(irow[2] || ''),
          qty:           parseFloat(irow[3]) || 0,
          weightPerUnit: parseFloat(irow[4]) || 0,
          weight:        itemWt,
          truckLabel:    _itemTruckLabel  // per-item truck label (ดูจาก planId suffix)
        });
        plan.totalWeight += itemWt;
      }
    }

    // sort shops ตาม shopSeq
    plan.shops.sort(function(a, b) { return (a.shopSeq || 0) - (b.shopSeq || 0); });

    return { success: true, plan: plan };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateLogisticStatus(planId, newStatus)
// ─────────────────────────────────────────────────────────────────────────────
function updateLogisticStatus(planId, newStatus) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: false, message: 'ไม่พบชีต' };
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === planId) {
        sheet.getRange(i + 2, 12).setValue(newStatus);
        return { success: true, message: 'อัปเดตสถานะ ' + planId + ' → ' + newStatus };
      }
    }
    return { success: false, message: 'ไม่พบ PlanID: ' + planId };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteLogisticPlan(planId)
// ─────────────────────────────────────────────────────────────────────────────
function deleteLogisticPlan(planId) {
  try {
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var planSheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    var itemSheet = ss.getSheetByName(LOGI_ITEM_SHEET);

    var basePlanId = String(planId).replace(/-[MC]$/, '');
    if (planSheet && planSheet.getLastRow() >= 2) {
      var pr = planSheet.getRange(2, 1, planSheet.getLastRow() - 1, 1).getValues();
      for (var i = pr.length - 1; i >= 0; i--) {
        if (String(pr[i][0]).replace(/-[MC]$/, '') === basePlanId) planSheet.deleteRow(i + 2);
      }
    }
    if (itemSheet && itemSheet.getLastRow() >= 2) {
      var ir = itemSheet.getRange(2, 1, itemSheet.getLastRow() - 1, 1).getValues();
      for (var i = ir.length - 1; i >= 0; i--) {
        if (String(ir[i][0]).replace(/-[MC]$/, '') === basePlanId) itemSheet.deleteRow(i + 2);
      }
    }
    return { success: true, message: 'ลบ ' + basePlanId + ' (รวม -M/-C) เรียบร้อยแล้ว' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// calcRouteDistance(shopIds)
// คำนวณระยะทางขับรถจริงแต่ละ leg โดยใช้ GAS Maps Service
// Origin คงที่: "ที.แสตนดาร์ด สตีล ซ.บางปลา 8 บางพลี สมุทรปราการ"
// Legs: Origin→S1, S1→S2, S2→S3, ...
// Return: { success, legs: [{ shopId, shopName, distanceKm }] }
// ─────────────────────────────────────────────────────────────────────────────
function calcRouteDistance(shopIds, optimize) {
  try {
    if (!shopIds || shopIds.length === 0) {
      return { success: false, message: 'ไม่มี shopIds ที่ส่งมา' };
    }
    var doOptimize = (optimize !== false);  // default = true

    var ORIGIN = 'ที.แสตนดาร์ด สตีล ซ.บางปลา 8 บางพลี สมุทรปราการ';

    // โหลดข้อมูลร้านค้าจาก Customers sheet (A=id, B=ชื่อ, C=ที่อยู่)
    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var custSheet = ss.getSheetByName(LOGI_SH_CUSTOMER);
    if (!custSheet) return { success: false, message: 'ไม่พบชีต Customers' };

    var shopMap = {};
    var cd = custSheet.getDataRange().getValues();
    for (var i = 1; i < cd.length; i++) {
      var sid  = String(cd[i][0] || '').trim();
      var snam = String(cd[i][1] || '').trim();
      var sadd = String(cd[i][2] || '').trim();
      if (sid) shopMap[sid] = { name: snam, address: sadd };
    }

    // สร้างลิสต์ที่อยู่ตาม shopIds
    var addresses = [];
    for (var j = 0; j < shopIds.length; j++) {
      var info = shopMap[String(shopIds[j]).trim()];
      if (!info || !info.address) {
        return { success: false, message: 'ไม่พบที่อยู่ของร้าน: ' + shopIds[j] };
      }
      addresses.push({ shopId: shopIds[j], name: info.name, address: info.address });
    }

    // สร้าง DirectionFinder: Origin → Shop1 → ... → ShopN → Origin (วนกลับบริษัท)
    var finder = Maps.newDirectionFinder()
      .setMode(Maps.DirectionFinder.Mode.DRIVING)
      .setOrigin(ORIGIN)
      .setOptimizeWaypoints(doOptimize);  // true = จัดเรียงลำดับร้านให้เหมาะสมที่สุด

    for (var k = 0; k < addresses.length; k++) {
      finder.addWaypoint(addresses[k].address);
    }
    finder.setDestination(ORIGIN);

    var result = finder.getDirections();
    if (!result || !result.routes || result.routes.length === 0) {
      return { success: false, message: 'Maps API ไม่สามารถคำนวณเส้นทางได้' };
    }

    var route        = result.routes[0];
    var legs         = route.legs;
    // waypointOrder = ลำดับ index ที่ Maps เลือกว่าดีที่สุด เช่น [2,0,1] แปลว่า ร้าน3→ร้าน1→ร้าน2
    var wpOrder      = (doOptimize && route.waypoint_order) ? route.waypoint_order : addresses.map(function(_,i){return i;});
    var outLegs      = [];

    for (var l = 0; l < addresses.length; l++) {
      var origIdx = wpOrder[l];  // index ใน addresses array เดิม
      var distM   = legs[l] && legs[l].distance ? legs[l].distance.value : 0;
      outLegs.push({
        shopId:        addresses[origIdx].shopId,
        shopName:      addresses[origIdx].name,
        distanceKm:    Math.round(distM / 100) / 10,
        originalIndex: origIdx   // ส่งกลับเพื่อให้ frontend reorder cards
      });
    }

    // leg สุดท้าย = ขากลับบริษัท (ShopN_optimized → Origin)
    var returnLeg = legs[addresses.length];
    var returnKm  = returnLeg && returnLeg.distance ? Math.round(returnLeg.distance.value / 100) / 10 : 0;

    return {
      success:          true,
      legs:             outLegs,
      returnDistanceKm: returnKm,
      waypointOrder:    wpOrder,   // ส่งกลับเพื่อ reorder frontend cards
      optimized:        doOptimize
    };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function _getOrCreateLogiPlanSheet(ss) {
  var sheet = ss.getSheetByName(LOGI_PLAN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOGI_PLAN_SHEET);
    var headers = [
      // ── คอลัมน์เดิม A–P (ไม่เปลี่ยน) ──
      'PlanID','วันที่','ประเภทรถ','Driver/Transport','TripNo',
      'ประเภทงาน','ร้านค้า','ระยะทาง','ค่าStop','ค่าจ้าง',
      'เซลล์','สถานะ','คลังสินค้า','สาเหตุซ่อมบำรุง/ไม่สำเร็จ','ทะเบียนรถ',
      'ระยะทางขากลับ(กม.)',
      // ── คอลัมน์ใหม่ Q–S (ต่อท้าย) ──
      'ลำดับร้าน','รหัสร้านค้า','หมายเหตุ/ความด่วน'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,16).setBackground('#0f172a').setFontColor('#f59e0b').setFontWeight('bold').setFontSize(10);
    sheet.getRange(1,17,1,3).setBackground('#1e3a5f').setFontColor('#7dd3fc').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 120);
    sheet.setColumnWidth(1,150); sheet.setColumnWidth(2,100); sheet.setColumnWidth(6,180);
  }
  return sheet;
}

function _getOrCreateLogiItemSheet(ss) {
  var sheet = ss.getSheetByName(LOGI_ITEM_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOGI_ITEM_SHEET);
    var headers = [
      'PlanID','รหัสสินค้า','ชื่อสินค้า','จำนวน','น้ำหนักต่อหน่วย','น้ำหนักรวม',
      'ประเภทงาน','ร้านค้า','คลังสินค้า','วันที่','สถานะ','ทะเบียนรถ','คลังโหลด',
      'ระยะทาง(กม.)','หมายเหตุ','ลำดับร้าน','ระยะทางฟรี(กม.)','รหัสร้านค้า'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setBackground('#0f172a').setFontColor('#38bdf8').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 100);
    sheet.setColumnWidth(1,150); sheet.setColumnWidth(3,180); sheet.setColumnWidth(8,180);
  }
  return sheet;
}
// ══════════════════════════════════════════════════════════════════════════════
// PRE-SHIPMENT LOAD CONTROL MODULE
// เพิ่มต่อท้าย FlowWH.js (Code.gs) เดิม
// ══════════════════════════════════════════════════════════════════════════════
//
// ตรรกะการคำนวณ:
//   Product Sheet: Col A=SKU, Col B=Name, Col C=เส้น/มัด, Col D=มัด/lift
//   จำนวนเส้น (qty) ÷ เส้น/มัด = จำนวนมัด
//   จำนวนมัด ÷ มัด/lift = จำนวน lifts
//   แต่ละ item มี 7 ช่อง (7 lifts) ต่อแถว ถ้าเกินให้ขึ้นแถวใหม่
// ──────────────────────────────────────────────────────────────────────────────

/**
 * getPreShipmentProductList()
 * ดึงรายการสินค้าทั้งหมดจากชีต Product + TST QC Standard
 * สำหรับ Manual Mode (รถต่างจังหวัด / ลูกค้ามารับเอง)
 * Return: Array of { sku, name, linesPerBundle, bundlesPerLift, weightRange, likelyW }
 */
function getPreShipmentProductList() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── QC Standard Map ────────────────────────────────────────────────
    var qcSheet = ss.getSheetByName('TST QC Standard');
    var qcMap   = {};
    if (qcSheet && qcSheet.getLastRow() >= 2) {
      var qd = qcSheet.getDataRange().getValues();
      for (var q = 1; q < qd.length; q++) {
        var qSku = String(qd[q][0] || '').trim();
        if (!qSku) continue;
        qcMap[qSku] = {
          minW:        parseFloat(qd[q][2]) || 0,
          maxW:        parseFloat(qd[q][3]) || 0,
          likelyW:     parseFloat(qd[q][4]) || 0,
          weightRange: String(qd[q][5] || '').trim()
        };
      }
    }

    // ── Product Sheet ──────────────────────────────────────────────────
    var productSheet = ss.getSheetByName(LOGI_SH_PRODUCT);
    var list = [];
    if (productSheet && productSheet.getLastRow() >= 2) {
      var pd = productSheet.getDataRange().getValues();
      for (var i = 1; i < pd.length; i++) {
        var sku = String(pd[i][0] || '').trim();
        if (!sku) continue;
        var qcInfo = qcMap[sku] || {};
        list.push({
          sku:            sku,
          name:           String(pd[i][1] || '').trim(),
          linesPerBundle: Number(pd[i][2]) || 1,
          bundlesPerLift: Number(pd[i][3]) || 1,
          likelyW:        qcInfo.likelyW     || 0,  // น้ำหนักเฉลี่ย/เส้น
          minW:           qcInfo.minW        || 0,
          maxW:           qcInfo.maxW        || 0,
          weightRange:    qcInfo.weightRange || ''
        });
      }
    }
    list.sort(function(a, b) { return a.sku.localeCompare(b.sku); });
    return { success: true, products: list };
  } catch (e) {
    return { success: false, message: e.toString(), products: [] };
  }
}

/**
 * getPreShipmentData(planId)
 * ดึงข้อมูลแผน Logistic เพื่อสร้างเอกสาร PRE-SHIPMENT LOAD CONTROL
 * ถ้าไม่ส่ง planId → return list plan ทั้งหมด (สำหรับ dropdown เลือก)
 */
function getPreShipmentData(planId) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── 1. โหลด QC Standard Map (weightRange จาก Col F) ──────────────────
    var qcSheet = ss.getSheetByName('TST QC Standard');
    var qcMap   = {};
    if (qcSheet && qcSheet.getLastRow() >= 2) {
      var qd = qcSheet.getDataRange().getValues();
      for (var q = 1; q < qd.length; q++) {
        var qSku = String(qd[q][0] || '').trim();
        if (!qSku) continue;
        qcMap[qSku] = {
          minW:        parseFloat(qd[q][2]) || 0,
          maxW:        parseFloat(qd[q][3]) || 0,
          likelyW:     parseFloat(qd[q][4]) || 0,
          weightRange: String(qd[q][5] || '').trim()
        };
      }
    }

    // ── 2. โหลด Product Map (Col C=เส้น/มัด, Col D=มัด/lift) ─────────────
    var productSheet = ss.getSheetByName(LOGI_SH_PRODUCT);
    var prodMap = {};
    if (productSheet && productSheet.getLastRow() >= 2) {
      var pd = productSheet.getDataRange().getValues();
      for (var i = 1; i < pd.length; i++) {
        var sku = String(pd[i][0] || '').trim();
        if (!sku) continue;
        var qcInfo = qcMap[sku] || {};
        prodMap[sku] = {
          name:           String(pd[i][1] || '').trim(),
          linesPerBundle: Number(pd[i][2]) || 1,
          bundlesPerLift: Number(pd[i][3]) || 1,
          minW:           qcInfo.minW        || 0,
          maxW:           qcInfo.maxW        || 0,
          likelyW:        qcInfo.likelyW     || 0,
          weightRange:    qcInfo.weightRange || ''
        };
      }
    }

    // ── 3. ถ้าไม่ส่ง planId → return รายการแผนทั้งหมด สำหรับ dropdown ───
    if (!planId) {
      var planSheet = ss.getSheetByName(LOGI_PLAN_SHEET);
      if (!planSheet || planSheet.getLastRow() < 2) {
        return { success: true, mode: 'list', plans: [] };
      }
      var planData = planSheet.getDataRange().getValues();
      var planList = [];
      for (var r = 1; r < planData.length; r++) {
        var row = planData[r];
        var pid = String(row[0] || '').trim();
        if (!pid) continue;
        var rowDate = row[1] instanceof Date
          ? Utilities.formatDate(row[1], 'GMT+7', 'dd/MM/yyyy')
          : String(row[1] || '').substring(0, 10);
        planList.push({
          id:      pid,
          date:    rowDate,
          jobType: String(row[2] || ''),
          status:  String(row[3] || ''),
          truck:   String(row[6] || row[5] || ''),
          driver:  String(row[8] || ''),
          weight:  parseFloat(row[10]) || 0
        });
      }
      planList.sort(function(a, b) { return b.id.localeCompare(a.id); });
      return { success: true, mode: 'list', plans: planList };
    }

    // ── 4. ดึงข้อมูล Plan + Items สำหรับ planId ที่ระบุ ──────────────────
    // ใช้ getLogisticPlanById แทน getLogisticPlans เพื่อ base-match รองรับทั้ง
    // WLTST2603167, WLTST2603167-M, WLTST2603167-C
    var byIdResult = getLogisticPlanById(planId);
    if (!byIdResult.success) return { success: false, message: byIdResult.message };
    var plan = byIdResult.plan;

    // รถพ่วง: ดึง -C plan แยกเพื่อเอา childTruckPlate
    var childPlan = null;
    var basePlanIdPsd  = String(planId).replace(/-[MC]$/, '');
    var childPlanIdPsd = basePlanIdPsd + '-C';
    // ตรวจว่า plan มี shops จาก -C หรือเปล่า (getLogisticPlanById รวมมาแล้ว)
    // แต่ยังต้องการ childTruckPlate → ดึงจาก planSheet โดยตรง
    var _ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
    var _ps2 = _ss2.getSheetByName(LOGI_PLAN_SHEET);
    var childTruckPlate = '';
    var isTrailerPlan   = false;
    if (_ps2 && _ps2.getLastRow() >= 2) {
      var _pd2 = _ps2.getDataRange().getValues();
      for (var _ci = 1; _ci < _pd2.length; _ci++) {
        var _cPid = String(_pd2[_ci][0] || '').replace(/-[MC]$/, '');
        if (_cPid !== basePlanIdPsd) continue;
        if (String(_pd2[_ci][0]).endsWith('-M')) { isTrailerPlan = true; }
        if (String(_pd2[_ci][0]).endsWith('-C')) {
          childTruckPlate = String(_pd2[_ci][14] || '');  // Col O: ทะเบียนรถลูก
          isTrailerPlan = true;
        }
      }
    }

    // ── 5. คำนวณ lift rows สำหรับแต่ละ item ─────────────────────────────
    // getLogisticPlanById รวม shops ของ -M และ -C ไว้ด้วยกันแล้ว (truckLabel per shop/item)
    var allItems = [];
    var _shopsToProcess = [];
    plan.shops.forEach(function(s) { _shopsToProcess.push({ shop: s, shopTruckLabel: s.truckLabel || 'mother' }); });
    _shopsToProcess.forEach(function(entry) {
      var shop = entry.shop;
      var shopTruckLabel = entry.shopTruckLabel;
      (shop.items || []).forEach(function(it) {
        // ใช้ truckLabel ระดับ item (บันทึกจาก -M/-C suffix) เป็นหลัก → fallback shop-level
        var truckLabel = it.truckLabel || shopTruckLabel;
        var pInfo        = prodMap[it.sku] || { name: it.productName || '', linesPerBundle: 1, bundlesPerLift: 1, weightRange: '' };
        var totalLines   = parseFloat(it.qty) || 0;
        var linesPerBnd  = pInfo.linesPerBundle || 1;
        var bndPerLift   = pInfo.bundlesPerLift || 1;
        var totalBundles = Math.ceil(totalLines / linesPerBnd);
        var totalLifts   = Math.ceil(totalBundles / bndPerLift);  // จำนวนรอบยก

        // สร้าง array ของแต่ละรอบยก (lift)
        var lifts = [];
        var remainBundles = totalBundles;
        for (var ln = 1; ln <= totalLifts; ln++) {
          var bInLift     = Math.min(bndPerLift, remainBundles);  // มัดในรอบนี้
          remainBundles  -= bInLift;
          var linesInLift = bInLift * linesPerBnd;                // เส้นในรอบนี้
          var likelyWperLine = (totalLines > 0 && it.weight > 0) ? it.weight / totalLines : 0;
          lifts.push({
            liftNo:    ln,
            bundles:   bInLift,
            lines:     linesInLift,
            estWeight: likelyWperLine > 0 ? Math.round(linesInLift * likelyWperLine * 100) / 100 : 0
          });
        }

        // แบ่ง lifts เป็นกลุ่ม 7 ต่อแถว (row)
        var liftRows = [];
        for (var li = 0; li < lifts.length; li += 7) {
          liftRows.push(lifts.slice(li, li + 7));
        }

        allItems.push({
          shopName:       shop.shopName    || '',
          shopId:         shop.shopId      || '',   // ✅ เพิ่ม shopId เพื่อแยกร้านชื่อเดียวกัน
          shopSeq:        shop.shopSeq     || 0,    // ✅ ลำดับร้านในแผน
          sku:            it.sku,
          productName:    pInfo.name       || it.productName || '',
          totalQtyPcs:    totalLines,
          totalBundles:   totalBundles,
          totalWeight:    it.weight        || 0,
          linesPerBundle: linesPerBnd,
          bundlesPerLift: bndPerLift,
          weightRange:    pInfo.weightRange || '',
          liftRows:       liftRows,
          truckLabel:     truckLabel        // 'mother' | 'child'
        });
      });
    });

    // ── 6. Format date ────────────────────────────────────────────────────
    var loadingDate = plan.date || '';
    if (loadingDate && loadingDate.includes('-')) {
      var dp = loadingDate.split('-');
      if (dp.length === 3) loadingDate = dp[2] + '/' + dp[1] + '/' + dp[0];
    }

    return {
      success:         true,
      mode:            'doc',
      planId:          plan.id,
      truckPlate:      plan.truckPlate     || '—',
      childTruckPlate: childTruckPlate     || '',
      isTrailerPlan:   isTrailerPlan,
      loadingDate:   loadingDate,
      driverName:    plan.driverTransport   || '—',
      totalWeight:   plan.totalWeight  || 0,
      items:         allItems
    };

  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


// ════════════════════════════════════════════════════════════════════════
// doPost — API Entry Point (รับ POST จาก GitHub Pages)
// ════════════════════════════════════════════════════════════════════════
function doPost(e) {
  return _handleApiPost(e);
}

// DRIVER ACTIVITY LOG — บันทึกการปฏิบัติงานจริง (จากคนรถ)
// Sheet: Driver_Activity_Log
// ════════════════════════════════════════════════════════════════════════
var DRIVER_ACTIVITY_SHEET = 'Driver_Activity_Log';
var GPS_ACTIVITY_SHEET    = 'GPS_Activity_Log';
var WH_ACTIVITY_SHEET     = 'WH_Activity_Log';
var DRIVER_EVENT_SHEET    = 'Driver_Event_Log'; // รวม incident + emergency ทุกประเภท

function _getOrCreateDriverActivitySheet(ss) {
  var sheet = ss.getSheetByName(DRIVER_ACTIVITY_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DRIVER_ACTIVITY_SHEET);
    var headers = [
      'วันที่ส่งมอบ','ชื่อพนักงานขับรถ','ทะเบียนรถ',
      'เลขไมล์ต้นทาง','เลขไมล์ปลายทาง',
      'เวลาออกจากต้นทาง','เวลาถึงปลายทาง',
      'รหัสลูกค้า','ชื่อลูกค้า',
      'ระยะทาง Km','รวมเวลาเดินทาง (นาที)','KM/HR',
      'ระยะทางที่กำหนด','Sale','บันทึกเมื่อ'
    ];
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    [100,140,110,110,110,110,110,100,200,90,120,80,110,120,130].forEach(function(w,i){
      sheet.setColumnWidth(i+1, w);
    });
  }
  return sheet;
}

function _getOrCreateGpsActivitySheet(ss) {
  var sheet = ss.getSheetByName(GPS_ACTIVITY_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(GPS_ACTIVITY_SHEET);
    var headers = [
      'รหัสอุปกรณ์','ป้ายทะเบียน','ชื่อเรียกรถ','ชื่อคนขับ',
      'วันที่','เวลาเริ่มงาน','เวลาเลิกงาน',
      'ระยะเวลาติดเครื่องยนต์','จอดติดเครื่อง','รวมเวลาเดินทาง',
      'ระยะทางรวม','ความเร็วเฉลี่ย','ความเร็วสูงสุด',
      'การใช้เชื้อเพลิง','จอดติดเครื่อง(นาที)','ติดเครื่อง(นาที)',
      'กม./ลิตร','บันทึกเมื่อ'
    ];
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground('#0c4a6e').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    [100,110,120,140,90,90,90,130,110,110,90,90,90,110,120,110,80,130].forEach(function(w,i){
      sheet.setColumnWidth(i+1, w);
    });
  }
  return sheet;
}

// ── helper คำนวณ KM/HR ────────────────────────────────────────────────────
function _calcDriverRow(payload) {
  var s = parseFloat(payload.odomStart), e = parseFloat(payload.odomEnd);
  var km = (!isNaN(s) && !isNaN(e) && e >= s) ? (e - s) : '';

  // คำนวณรวมเวลาเดินทาง (นาที) จาก HH:MM
  var travelMin = '';
  var kmhr = '';
  if (payload.timeDepart && payload.timeArrive) {
    var dep = payload.timeDepart.split(':'), arr = payload.timeArrive.split(':');
    if (dep.length === 2 && arr.length === 2) {
      var depM = parseInt(dep[0])*60 + parseInt(dep[1]);
      var arrM = parseInt(arr[0])*60 + parseInt(arr[1]);
      var diff = arrM - depM;
      if (diff > 0) {
        travelMin = diff;
        if (km !== '') kmhr = Math.round(km / (diff / 60) * 10) / 10;
      }
    }
  }

  var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  return [
    payload.date          || '',   // วันที่ส่งมอบ
    payload.driver        || '',   // ชื่อพนักงานขับรถ
    payload.truck         || '',   // ทะเบียนรถ
    isNaN(s) ? (payload.odomStart||'') : s,   // เลขไมล์ต้นทาง
    isNaN(e) ? (payload.odomEnd||'')   : e,   // เลขไมล์ปลายทาง
    payload.timeDepart    || '',   // เวลาออกจากต้นทาง
    payload.timeArrive    || '',   // เวลาถึงปลายทาง
    payload.customerId    || '',   // รหัสลูกค้า
    payload.customerName  || payload.customer || '',  // ชื่อลูกค้า
    km,                            // ระยะทาง Km
    travelMin,                     // รวมเวลาเดินทาง (นาที)
    kmhr,                          // KM/HR
    payload.stdDistance   || '',   // ระยะทางที่กำหนด
    payload.sale          || '',   // Sale
    now                            // บันทึกเมื่อ
  ];
}

// ── บันทึก 1 แถว (จากคนรถ) ──────────────────────────────────────────────
function saveDriverActivityRow(payload) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateDriverActivitySheet(ss);
    sheet.appendRow(_calcDriverRow(payload));
    return { success: true };
  } catch(err) {
    return { success: false, message: err.message };
  }
}

// ── บันทึกหลายแถวพร้อมกัน (จากคนรถ) ─────────────────────────────────────
function saveDriverActivityRows(rows) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateDriverActivitySheet(ss);
    rows.forEach(function(payload) {
      sheet.appendRow(_calcDriverRow(payload));
    });
    return { success: true, saved: rows.length };
  } catch(err) {
    return { success: false, message: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════
// getLogisticPlanSummary — สรุป ส่งสำเร็จ/ไม่สำเร็จ จากชีต Logistic_Plan จริง
// params: { dateFrom: string, dateTo: string }  (รับหลายรูปแบบวันที่)
// คอลัมน์ที่ใช้:
//   B (1)  = วันที่        C (2)  = ประเภทรถ
//   D (3)  = Driver/Transport       L (11) = สถานะ
//   O (14) = ทะเบียนรถ
// ════════════════════════════════════════════════════════════════════════
function getLogisticPlanSummary(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: false, message: 'ไม่พบข้อมูลในชีต Logistic_Plan', byDriver: {}, byTruck: {} };
    }

    // แปลงช่วงวันที่ → ms (midnight) รองรับทุกรูปแบบ
    var fromMs = params && params.dateFrom ? _planDateToMs(params.dateFrom) : 0;
    var toMs   = params && params.dateTo   ? _planDateToMs(params.dateTo)   : Infinity;
    if (toMs !== Infinity) toMs += 86400000 - 1; // รวมทั้งวันสุดท้าย

    var data     = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
    var byDriver     = {}; // { driverName: { succ, fail, planned } }
    var byTruck      = {}; // { plate:      { succ, fail, planned } }
    var byTruckDriver = {}; // { plate: { driverName: trips } }  ← จำนวนเที่ยวต่อรถต่อคนขับ

    data.forEach(function(row) {
      var rowMs = _planDateToMs(row[1]); // Col B = วันที่
      if (!rowMs || rowMs < fromMs || rowMs > toMs) return;

      var type   = String(row[2]  || '').trim().toLowerCase(); // Col C = ประเภทรถ
      var driver = String(row[3]  || '').trim();               // Col D
      var plate  = String(row[14] || '').trim().toUpperCase(); // Col O
      var status = String(row[11] || 'planned').trim().toLowerCase(); // Col L

      // จัด bucket: success / fail / planned
      var bucket = (status === 'success')  ? 'succ'
                 : (status === 'planned')  ? 'planned'
                 : 'fail';

      if (driver) {
        if (!byDriver[driver]) byDriver[driver] = { succ: 0, fail: 0, planned: 0 };
        byDriver[driver][bucket]++;
      }
      if (plate) {
        if (!byTruck[plate]) byTruck[plate] = { succ: 0, fail: 0, planned: 0 };
        byTruck[plate][bucket]++;
      }
      // เฉพาะรถบริษัท (company) เท่านั้น — matrix เที่ยว
      if (plate && driver && type === 'company') {
        if (!byTruckDriver[plate]) byTruckDriver[plate] = {};
        byTruckDriver[plate][driver] = (byTruckDriver[plate][driver] || 0) + 1;
      }
    });

    return { success: true, byDriver: byDriver, byTruck: byTruck, byTruckDriver: byTruckDriver };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// ── แปลงวันที่หลายรูปแบบ → milliseconds (midnight GMT+7) ────────────────
// รองรับ: Date object, dd/MM/yyyy, yyyy-MM-dd, dd-MM-yyyy, yyyyMMdd, timestamp
function _planDateToMs(val) {
  if (!val) return 0;
  var d;
  if (val instanceof Date) {
    d = new Date(val);
  } else {
    var s = String(val).trim();
    if (s.includes('/')) {
      // dd/MM/yyyy หรือ MM/dd/yyyy → ลอง dd/MM/yyyy ก่อน (รูปแบบไทย)
      var p = s.split('/');
      if (p.length === 3) {
        d = p[0].length <= 2 && parseInt(p[0]) <= 31
          ? new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))  // dd/MM/yyyy
          : new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])); // yyyy/MM/dd
      }
    } else if (s.includes('-') && s.length === 10) {
      var q = s.split('-');
      if (q.length === 3) {
        d = q[0].length === 4
          ? new Date(parseInt(q[0]), parseInt(q[1]) - 1, parseInt(q[2]))  // yyyy-MM-dd
          : new Date(parseInt(q[2]), parseInt(q[1]) - 1, parseInt(q[0])); // dd-MM-yyyy
      }
    } else if (/^\d{8}$/.test(s)) {
      // yyyyMMdd
      d = new Date(parseInt(s.slice(0,4)), parseInt(s.slice(4,6)) - 1, parseInt(s.slice(6,8)));
    } else {
      var ts = Date.parse(s);
      d = isNaN(ts) ? null : new Date(ts);
    }
  }
  if (!d || isNaN(d.getTime()) || d.getTime() === 0) return 0;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── ค้นหาชื่อคนขับจากชีต Logistic_Plan โดยเทียบทะเบียนรถ + วันที่ ────────
function _lookupDriverByPlate(ss, plate, dateStr) {
  try {
    var sheet = ss.getSheetByName(LOGI_PLAN_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return '';
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 15).getValues();
    var normPlate = String(plate || '').replace(/[\s\-]/g, '').toUpperCase();
    if (!normPlate) return '';

    // หา rows ที่ทะเบียนตรงกัน (col O = index 14)
    var matches = [];
    data.forEach(function(row) {
      var rPlate = String(row[14] || '').replace(/[\s\-]/g, '').toUpperCase();
      if (rPlate === normPlate) {
        matches.push({ driver: String(row[3] || ''), dateVal: row[1] });
      }
    });
    if (!matches.length) return '';

    // ถ้ามี dateStr → ลอง match วันที่ตรงก่อน
    if (dateStr) {
      var targetMs = parseDateValue(dateStr);
      if (targetMs) {
        var targetDay = new Date(targetMs);
        targetDay.setHours(0, 0, 0, 0);
        var exact = matches.find(function(m) {
          var ms = parseDateValue(m.dateVal);
          if (!ms) return false;
          var d = new Date(ms); d.setHours(0, 0, 0, 0);
          return d.getTime() === targetDay.getTime();
        });
        if (exact) return exact.driver;
      }
    }
    // fallback: คืน match สุดท้าย (เรียงตาม row = ล่าสุด)
    return matches[matches.length - 1].driver || '';
  } catch(e) {
    return '';
  }
}

// ── helper สร้าง row GPS ──────────────────────────────────────────────────
function _buildGpsRow(payload, driverOverride) {
  var dist     = parseFloat(payload.distance) || '';
  var fuelUsed = parseFloat(payload.fuelUsed) || '';
  var fuelEff  = payload.fuelEff || '';
  if (!fuelEff && dist && fuelUsed) {
    fuelEff = Math.round((dist / fuelUsed) * 100) / 100;
  }
  var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  return [
    payload.deviceId      || '',              // รหัสอุปกรณ์
    payload.truck         || '',              // ป้ายทะเบียน
    payload.vehicleName   || '',              // ชื่อเรียกรถ
    driverOverride || payload.driver || '',   // ชื่อคนขับ (จาก Logistic_Plan ก่อน)
    payload.date          || '',              // วันที่
    payload.timeStart     || '',              // เวลาเริ่มงาน
    payload.timeEnd       || '',              // เวลาเลิกงาน
    payload.engineRunTime || '',              // ระยะเวลาติดเครื่องยนต์
    payload.idleStr       || '',              // จอดติดเครื่อง (raw)
    payload.travelTime    || '',              // รวมเวลาเดินทาง
    dist,                                    // ระยะทางรวม
    payload.avgSpeed      || '',              // ความเร็วเฉลี่ย
    payload.maxSpeed      || '',              // ความเร็วสูงสุด
    fuelUsed,                                // การใช้เชื้อเพลิง
    payload.idleMin       || '',              // จอดติดเครื่อง(นาที)
    payload.engineMin     || '',              // ติดเครื่อง(นาที)
    fuelEff,                                 // กม./ลิตร
    now                                      // บันทึกเมื่อ
  ];
}

// ── บันทึก 1 แถว (จาก GPS) ───────────────────────────────────────────────
function saveGpsActivityRow(payload) {
  try {
    var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet  = _getOrCreateGpsActivitySheet(ss);
    var driver = _lookupDriverByPlate(ss, payload.truck, payload.date);
    sheet.appendRow(_buildGpsRow(payload, driver));
    return { success: true };
  } catch(err) {
    return { success: false, message: err.message };
  }
}

// ── บันทึกหลายแถวพร้อมกัน (จาก GPS) ─────────────────────────────────────
function saveGpsActivityRows(rows) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateGpsActivitySheet(ss);
    // โหลด Logistic_Plan ครั้งเดียว แล้วใช้ cache สำหรับทุกแถว
    var planSheet  = ss.getSheetByName(LOGI_PLAN_SHEET);
    var planData   = (planSheet && planSheet.getLastRow() > 1)
                     ? planSheet.getRange(2, 1, planSheet.getLastRow() - 1, 15).getValues()
                     : [];
    rows.forEach(function(payload) {
      // ค้นหาชื่อคนขับจาก cache แทนการเรียก function ซ้ำ (ประหยัด quota)
      var driver = '';
      var normPlate = String(payload.truck || '').replace(/[\s\-]/g, '').toUpperCase();
      if (normPlate) {
        var matches = planData.filter(function(row) {
          return String(row[14] || '').replace(/[\s\-]/g, '').toUpperCase() === normPlate;
        });
        if (matches.length) {
          var found = null;
          if (payload.date) {
            var targetMs = parseDateValue(payload.date);
            if (targetMs) {
              var td = new Date(targetMs); td.setHours(0,0,0,0);
              found = matches.find(function(row) {
                var ms = parseDateValue(row[1]);
                if (!ms) return false;
                var d = new Date(ms); d.setHours(0,0,0,0);
                return d.getTime() === td.getTime();
              });
            }
          }
          driver = found ? String(found[3] || '') : String(matches[matches.length-1][3] || '');
        }
      }
      sheet.appendRow(_buildGpsRow(payload, driver));
    });
    return { success: true, saved: rows.length };
  } catch(err) {
    return { success: false, message: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ดู/แก้ไขข้อมูลย้อนหลัง — Driver_Activity_Log & GPS_Activity_Log
// ════════════════════════════════════════════════════════════════════════════

// แปลงค่าเวลาจาก Sheets → "HH:MM"
// Sheets เก็บ time-only เป็น Date Object ที่ UTC midnight + fraction ของวัน
// ต้องอ่านด้วย UTC เพื่อไม่ให้ timezone offset ทำให้เวลาผิด
function _sheetTimeToStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    // ใช้ UTC เพราะ Sheets time value ไม่มี timezone — อ่าน UTC ตรงๆ
    var hh = val.getUTCHours();
    var mm = val.getUTCMinutes();
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  var s = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return s.substring(0, 5);
  return s;
}

function _sheetDateToMs(val) {
  if (!val) return 0;
  if (val instanceof Date) {
    // Google Sheets Date Object เก็บเป็น UTC → แปลงเป็นวันที่ ICT (UTC+7) ก่อนเปรียบเทียบ
    var ict = Utilities.formatDate(val, 'Asia/Bangkok', 'yyyy-MM-dd');
    var p = ict.split('-');
    var d = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
    d.setHours(0,0,0,0);
    return d.getTime();
  }
  // String: ใช้ parseDateValue แล้ว normalize เป็น local midnight
  var parsed = parseDateValue(val);
  if (!parsed || parsed.getTime() === 0) return 0;
  var norm = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return norm.getTime();
}

// ── โหลด Driver_Activity_Log ตามช่วงวันที่ ───────────────────────────────
function getDriverActivityLog(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DRIVER_ACTIVITY_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };
    var fromMs = params.dateFrom ? (_sheetDateToMs(params.dateFrom) || 0) : 0;
    var toMs   = params.dateTo   ? (_sheetDateToMs(params.dateTo)   || Infinity) : Infinity;
    if (toMs !== Infinity) toMs += 86400000 - 1;
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 15).getValues();
    var result = [];
    data.forEach(function(row, i) {
      var rowMs = _sheetDateToMs(row[0]);
      if (rowMs >= fromMs && rowMs <= toMs) {
        var dt = row[0] instanceof Date
          ? Utilities.formatDate(row[0], 'Asia/Bangkok', 'dd/MM/yyyy') : String(row[0]||'');
        result.push({ rowNum:i+2, date:dt, driver:String(row[1]||''), truck:String(row[2]||''),
          odomStart:row[3]!==''?String(row[3]):'', odomEnd:row[4]!==''?String(row[4]):'',
          timeDepart:_sheetTimeToStr(row[5]), timeArrive:_sheetTimeToStr(row[6]),
          customerId:String(row[7]||''), customerName:String(row[8]||''),
          km:row[9]!==''?String(row[9]):'', travelMin:row[10]!==''?String(row[10]):'',
          kmhr:row[11]!==''?String(row[11]):'', stdDistance:row[12]!==''?String(row[12]):'',
          sale:String(row[13]||''), savedAt:String(row[14]||'') });
      }
    });
    return { success: true, rows: result };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── อัปเดตแถวใน Driver_Activity_Log ─────────────────────────────────────
function updateDriverActivityRow(params) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DRIVER_ACTIVITY_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rowNum = parseInt(params.rowNum);
    if (isNaN(rowNum) || rowNum < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    var p = params;
    var s = parseFloat(p.odomStart), e = parseFloat(p.odomEnd);
    var km = (!isNaN(s) && !isNaN(e) && e >= s) ? (e-s) : '';
    var travelMin = '', kmhr = '';
    if (p.timeDepart && p.timeArrive) {
      var dep=p.timeDepart.split(':'), arr=p.timeArrive.split(':');
      if (dep.length===2 && arr.length===2) {
        var diff=parseInt(arr[0])*60+parseInt(arr[1])-parseInt(dep[0])*60-parseInt(dep[1]);
        if (diff>0) { travelMin=diff; if(km!=='') kmhr=Math.round(km/(diff/60)*10)/10; }
      }
    }
    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var newRow = [p.date||'',p.driver||'',p.truck||'',
      isNaN(s)?(p.odomStart||''):s, isNaN(e)?(p.odomEnd||''):e,
      p.timeDepart||'',p.timeArrive||'',p.customerId||'',p.customerName||'',
      km,travelMin,kmhr,p.stdDistance||'',p.sale||'',now];
    sheet.getRange(rowNum, 1, 1, newRow.length).setValues([newRow]);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── อัปเดตหลายแถวพร้อมกัน (Batch) ใน Driver_Activity_Log ────────────────
function updateDriverActivityRows(payloads) {
  try {
    if (!payloads || !payloads.length) return { success: true, saved: 0 };
    var saved = 0;
    for (var i = 0; i < payloads.length; i++) {
      var res = updateDriverActivityRow(payloads[i]);
      if (res.success) saved++;
    }
    return { success: true, saved: saved };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── ลบแถวใน Driver_Activity_Log ──────────────────────────────────────────
function deleteDriverActivityRow(rowNum) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DRIVER_ACTIVITY_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rn = parseInt(rowNum);
    if (isNaN(rn) || rn < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    sheet.deleteRow(rn);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── โหลด GPS_Activity_Log ตามช่วงวันที่ ──────────────────────────────────
function _fmtTime(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Bangkok', 'HH:mm');
  var s = String(val).trim();
  if (!s) return '';
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return s.substring(0, 5);
  var num = parseFloat(s);
  if (!isNaN(num) && num >= 0 && num < 1) {
    var tot = Math.round(num * 1440);
    return String(Math.floor(tot/60)%24).padStart(2,'0') + ':' + String(tot%60).padStart(2,'0');
  }
  if (!isNaN(num) && num > 1) {
    var frac = num - Math.floor(num);
    var tot2 = Math.round(frac * 1440);
    return String(Math.floor(tot2/60)%24).padStart(2,'0') + ':' + String(tot2%60).padStart(2,'0');
  }
  return s;
}

function getGpsActivityLog(params) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(GPS_ACTIVITY_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };
    var fromMs = params.dateFrom ? (_sheetDateToMs(params.dateFrom) || 0) : 0;
    var toMs   = params.dateTo   ? (_sheetDateToMs(params.dateTo)   || Infinity) : Infinity;
    if (toMs !== Infinity) toMs += 86400000 - 1;
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 18).getValues();
    var result = [];
    data.forEach(function(row, i) {
      var rowMs = _sheetDateToMs(row[4]); // col E = วันที่
      if (rowMs >= fromMs && rowMs <= toMs) {
        var dt = row[4] instanceof Date
          ? Utilities.formatDate(row[4], 'Asia/Bangkok', 'dd/MM/yyyy') : String(row[4]||'');
        result.push({ rowNum:i+2, deviceId:String(row[0]||''), truck:String(row[1]||''),
          vehicleName:String(row[2]||''), driver:String(row[3]||''), date:dt,
          timeStart:_fmtTime(row[5]), timeEnd:_fmtTime(row[6]),
          engineRunTime:String(row[7]||''), idleStr:String(row[8]||''), travelTime:String(row[9]||''),
          distance:row[10]!==''?String(row[10]):'', avgSpeed:row[11]!==''?String(row[11]):'',
          maxSpeed:row[12]!==''?String(row[12]):'', fuelUsed:row[13]!==''?String(row[13]):'',
          idleMin:row[14]!==''?String(row[14]):'', engineMin:row[15]!==''?String(row[15]):'',
          fuelEff:row[16]!==''?String(row[16]):'', savedAt:String(row[17]||'') });
      }
    });
    return { success: true, rows: result };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── อัปเดตแถวใน GPS_Activity_Log ─────────────────────────────────────────
function updateGpsActivityRow(params) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(GPS_ACTIVITY_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rowNum = parseInt(params.rowNum);
    if (isNaN(rowNum) || rowNum < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    var p = params;
    var dist=parseFloat(p.distance)||'', fuel=parseFloat(p.fuelUsed)||'';
    var eff=(dist&&fuel)?Math.round((dist/fuel)*100)/100:(p.fuelEff||'');
    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var newRow=[p.deviceId||'',p.truck||'',p.vehicleName||'',p.driver||'',
      p.date||'',p.timeStart||'',p.timeEnd||'',p.engineRunTime||'',p.idleStr||'',p.travelTime||'',
      dist,p.avgSpeed||'',p.maxSpeed||'',fuel,p.idleMin||'',p.engineMin||'',eff,now];
    sheet.getRange(rowNum,1,1,newRow.length).setValues([newRow]);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── ลบแถวใน GPS_Activity_Log ─────────────────────────────────────────────
function deleteGpsActivityRow(rowNum) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(GPS_ACTIVITY_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rn = parseInt(rowNum);
    if (isNaN(rn) || rn < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    sheet.deleteRow(rn);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ════════════════════════════════════════════════════════════════════════
// WH ACTIVITY LOG — บันทึกข้อมูลจริงจากหน้างาน (คลังสินค้า)
// Sheet: WH_Activity_Log
// คอลัมน์: A=ประเภท B=วันที่ C=รหัสพนักงาน D=ชื่อพนักงาน E=ทีม
//           F=เวลาเริ่ม G=เวลาเสร็จ H=นาที I=จำนวนรวม J=น้ำหนัก
//           K=นาที/รายการ L=น้ำหนักต่อหน่วย M=รหัสสินค้า(A) N=ชื่อสินค้า(A)
//           O=เสียหาย/ผิด P=สาเหตุ Q=หมายเหตุ R=วันที่บันทึก
//           S=รหัสที่ถูก(B) T=ชื่อที่ถูก(B)
// ════════════════════════════════════════════════════════════════════════

function saveWHActivityRows(rows) {
  try {
    if (!rows || !rows.length) return { success: true, saved: 0 };
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(WH_ACTIVITY_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(WH_ACTIVITY_SHEET);
      var headers = ['ประเภทข้อมูล','วันที่','รหัสพนักงาน','ชื่อพนักงาน','ทีม',
                     'เวลาเริ่ม','เวลาเสร็จ','เวลาที่ใช้(นาที)','จำนวนรวม(I)','น้ำหนัก(กก.)',
                     'นาที/รายการ','น้ำหนักต่อหน่วย(A)','รหัสสินค้า(A)','ชื่อสินค้า(A)',
                     'จำนวนเสียหาย/ผิด(O)','สาเหตุ/ประเภท(P)','หมายเหตุ(Q)','วันที่บันทึก(R)',
                     'รหัสสินค้าที่ถูก(B)','ชื่อสินค้าที่ถูก(B)',
                     'ทะเบียนรถ(U)'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    var data = rows.map(function(r) {
      return [
        r.type         || '',
        r.date         || '',
        r.empId        || '',
        r.empName      || '',
        r.team         || '',
        r.timeStart    || '',
        r.timeEnd      || '',
        r.mins         !== undefined ? r.mins : '',
        r.qty          !== undefined ? r.qty  : '',
        r.weight       !== undefined ? r.weight : '',
        r.minPerItem   !== undefined ? r.minPerItem : '',
        r.weightPerUnit !== undefined ? r.weightPerUnit : '',
        r.skuA         || '',
        r.nameA        || '',
        r.damageQty    !== undefined ? r.damageQty : '',
        r.causeP       || '',
        r.remarkQ      || '',
        r.savedAt      || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
        r.skuB         || '',
        r.nameB        || '',
        r.truckPlate   || ''   // Col U: ทะเบียนรถ (optional)
      ];
    });
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data);
    return { success: true, saved: data.length };
  } catch(err) { return { success: false, message: err.message }; }
}

function getWHActivityLog(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(WH_ACTIVITY_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };
    var fromMs = params.dateFrom ? (_sheetDateToMs(params.dateFrom) || 0) : 0;
    var toMs   = params.dateTo   ? (_sheetDateToMs(params.dateTo)   || Infinity) : Infinity;
    if (toMs !== Infinity) toMs += 86400000 - 1;
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 20).getValues();
    var result = [];
    data.forEach(function(row, i) {
      var rowMs = _sheetDateToMs(row[1]); // col B = วันที่
      if (rowMs >= fromMs && rowMs <= toMs) {
        var dt = row[1] instanceof Date
          ? Utilities.formatDate(row[1], 'Asia/Bangkok', 'dd/MM/yyyy') : String(row[1]||'');
        result.push({
          rowNum:        i + 2,
          type:          String(row[0]  || ''),
          date:          dt,
          empId:         String(row[2]  || ''),
          empName:       String(row[3]  || ''),
          team:          String(row[4]  || ''),
          timeStart:     _fmtTime(row[5]),
          timeEnd:       _fmtTime(row[6]),
          mins:          row[7]  !== '' ? String(row[7])  : '',
          qty:           row[8]  !== '' ? String(row[8])  : '',
          weight:        row[9]  !== '' ? String(row[9])  : '',
          minPerItem:    row[10] !== '' ? String(row[10]) : '',
          weightPerUnit: row[11] !== '' ? String(row[11]) : '',
          skuA:          String(row[12] || ''),
          nameA:         String(row[13] || ''),
          damageQty:     row[14] !== '' ? String(row[14]) : '',
          causeP:        String(row[15] || ''),
          remarkQ:       String(row[16] || ''),
          savedAt:       String(row[17] || ''),
          skuB:          String(row[18] || ''),
          nameB:         String(row[19] || '')
        });
      }
    });
    return { success: true, rows: result };
  } catch(err) { return { success: false, message: err.message }; }
}

// ════════════════════════════════════════════════════════════════════════
// DRIVER EVENT LOG — รวม Incident (ใบสั่ง/อุบัติเหตุ) + Emergency Repair
// Sheet: Driver_Event_Log
// คอลัมน์: A=id  B=category(incident/emergency)  C=type(ticket/accident/repair)
//           D=date  E=driver  F=truck  G=detail  H=cause
//           I=fine  J=insurance  K=cost  L=shop  M=savedAt
// ════════════════════════════════════════════════════════════════════════

function _getOrCreateDriverEventSheet(ss) {
  var sheet = ss.getSheetByName(DRIVER_EVENT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DRIVER_EVENT_SHEET);
    var headers = ['id','category','type','date','driver','truck',
                   'detail','cause','fine','insurance','cost','shop','savedAt'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.getRange(1,1,1,headers.length)
         .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── โหลดทุก event จาก Sheet ──────────────────────────────────────────
function getDriverEventLog() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DRIVER_EVENT_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 13).getValues();
    var rows = [];
    data.forEach(function(row, i) {
      if (!row[0] && !row[3]) return; // skip empty rows
      rows.push({
        rowNum:    i + 2,
        id:        Number(row[0]) || 0,
        category:  String(row[1] || ''),
        type:      String(row[2] || ''),
        date:      String(row[3] || ''),
        driver:    String(row[4] || ''),
        truck:     String(row[5] || ''),
        detail:    String(row[6] || ''),
        cause:     String(row[7] || ''),
        fine:      row[8]  !== '' ? Number(row[8])  : 0,
        insurance: row[9]  !== '' ? Number(row[9])  : 0,
        cost:      row[10] !== '' ? Number(row[10]) : 0,
        shop:      String(row[11] || ''),
        savedAt:   String(row[12] || '')
      });
    });
    return { success: true, rows: rows };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── บันทึก event แถวเดียว → return rowNum ────────────────────────────
function saveDriverEventRow(payload) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateDriverEventSheet(ss);
    var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var newRow = [
      payload.id                    || Date.now(),
      _sanitizeSheet(payload.category),
      _sanitizeSheet(payload.type),
      _sanitizeSheet(payload.date),
      _sanitizeSheet(payload.driver),
      _sanitizeSheet(payload.truck),
      _sanitizeSheet(payload.detail),
      _sanitizeSheet(payload.cause),
      Number(payload.fine)          || 0,
      Number(payload.insurance)     || 0,
      Number(payload.cost)          || 0,
      _sanitizeSheet(payload.shop),
      now
    ];
    sheet.appendRow(newRow);
    var rowNum = sheet.getLastRow();
    return { success: true, rowNum: rowNum };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── บันทึก events หลายแถวพร้อมกัน (migration) → return [{id, rowNum}] ─
function saveDriverEventRows(rows) {
  try {
    if (!rows || !rows.length) return { success: true, saved: 0, items: [] };
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateDriverEventSheet(ss);
    var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var items = [];
    rows.forEach(function(payload) {
      var newRow = [
        payload.id                    || Date.now(),
        _sanitizeSheet(payload.category),
        _sanitizeSheet(payload.type),
        _sanitizeSheet(payload.date),
        _sanitizeSheet(payload.driver),
        _sanitizeSheet(payload.truck),
        _sanitizeSheet(payload.detail),
        _sanitizeSheet(payload.cause),
        Number(payload.fine)          || 0,
        Number(payload.insurance)     || 0,
        Number(payload.cost)          || 0,
        _sanitizeSheet(payload.shop),
        now
      ];
      sheet.appendRow(newRow);
      items.push({ id: Number(payload.id) || 0, rowNum: sheet.getLastRow() });
    });
    return { success: true, saved: items.length, items: items };
  } catch(err) { return { success: false, message: err.message }; }
}

// ── ลบแถวใน Driver_Event_Log ─────────────────────────────────────────
function deleteDriverEventRow(rowNum) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DRIVER_EVENT_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rn = parseInt(rowNum);
    if (isNaN(rn) || rn < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    sheet.deleteRow(rn);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDriverEventRow(rowNum, payload) — อัปเดตข้อมูลแถวใน Driver_Event_Log
// ─────────────────────────────────────────────────────────────────────────────
function updateDriverEventRow(rowNum, payload) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DRIVER_EVENT_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet: ' + DRIVER_EVENT_SHEET };
    var rn = parseInt(rowNum);
    if (isNaN(rn) || rn < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    // Columns: A=id B=category C=type D=date E=driver F=truck
    //          G=detail H=cause I=fine J=insurance K=cost L=shop M=savedAt
    var updatedRow = [
      payload.id                 || '',
      _sanitizeSheet(payload.category  || ''),
      _sanitizeSheet(payload.type      || ''),
      _sanitizeSheet(payload.date      || ''),
      _sanitizeSheet(payload.driver    || ''),
      _sanitizeSheet(payload.truck     || ''),
      _sanitizeSheet(payload.detail    || ''),
      _sanitizeSheet(payload.cause     || ''),
      Number(payload.fine)       || 0,
      Number(payload.insurance)  || 0,
      Number(payload.cost)       || 0,
      _sanitizeSheet(payload.shop      || ''),
      now
    ];
    sheet.getRange(rn, 1, 1, updatedRow.length).setValues([updatedRow]);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ════════════════════════════════════════════════════════════════════════
// STAFF EVENT LOG — รวม Bill Error (บิลผิดพลาด) + Delivery % (% ส่งมอบ)
// Sheet: Staff_Event_Log
// คอลัมน์: A=id  B=category(bill/delivery)  C=date  D=staff
//           E=customer  F=invoice  G=errtype  H=detail/remark
//           I=fixed(TRUE/FALSE)  J=planned  K=success  L=late  M=fail
//           N=pct  O=savedAt
// ════════════════════════════════════════════════════════════════════════
var STAFF_EVENT_SHEET = 'Staff_Event_Log';

function _getOrCreateStaffEventSheet(ss) {
  var sheet = ss.getSheetByName(STAFF_EVENT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(STAFF_EVENT_SHEET);
    var headers = ['id','category','date','staff','customer','invoice',
                   'errtype','detail','fixed','planned','success','late','fail','pct','savedAt'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
    sheet.getRange(1,1,1,headers.length)
         .setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getStaffEventLog() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_EVENT_SHEET);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };
    var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 15).getValues();
    var rows = [];
    data.forEach(function(row, i) {
      if (!row[0] && !row[2]) return;
      rows.push({
        rowNum:    i + 2,
        id:        Number(row[0])  || 0,
        category:  String(row[1]  || ''),
        date:      String(row[2]  || ''),
        staff:     String(row[3]  || ''),
        customer:  String(row[4]  || ''),
        invoice:   String(row[5]  || ''),
        errtype:   String(row[6]  || ''),
        detail:    String(row[7]  || ''),
        fixed:     row[8] === true || String(row[8]).toUpperCase() === 'TRUE',
        planned:   row[9]  !== '' ? Number(row[9])  : 0,
        success:   row[10] !== '' ? Number(row[10]) : 0,
        late:      row[11] !== '' ? Number(row[11]) : 0,
        fail:      row[12] !== '' ? Number(row[12]) : 0,
        pct:       row[13] !== '' ? Number(row[13]) : 0,
        savedAt:   String(row[14] || '')
      });
    });
    return { success: true, rows: rows };
  } catch(err) { return { success: false, message: err.message }; }
}

function saveStaffEventRow(payload) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateStaffEventSheet(ss);
    var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var newRow = [
      payload.id                   || Date.now(),
      _sanitizeSheet(payload.category),
      _sanitizeSheet(payload.date),
      _sanitizeSheet(payload.staff),
      _sanitizeSheet(payload.customer),
      _sanitizeSheet(payload.invoice),
      _sanitizeSheet(payload.errtype),
      _sanitizeSheet(payload.detail),
      payload.fixed    ? 'TRUE' : 'FALSE',
      Number(payload.planned)      || 0,
      Number(payload.success)      || 0,
      Number(payload.late)         || 0,
      Number(payload.fail)         || 0,
      Number(payload.pct)          || 0,
      now
    ];
    sheet.appendRow(newRow);
    return { success: true, rowNum: sheet.getLastRow() };
  } catch(err) { return { success: false, message: err.message }; }
}

function saveStaffEventRows(rows) {
  try {
    if (!rows || !rows.length) return { success: true, saved: 0, items: [] };
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateStaffEventSheet(ss);
    var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
    var items = [];
    rows.forEach(function(payload) {
      var newRow = [
        payload.id                   || Date.now(),
        _sanitizeSheet(payload.category),
        _sanitizeSheet(payload.date),
        _sanitizeSheet(payload.staff),
        _sanitizeSheet(payload.customer),
        _sanitizeSheet(payload.invoice),
        _sanitizeSheet(payload.errtype),
        _sanitizeSheet(payload.detail),
        payload.fixed    ? 'TRUE' : 'FALSE',
        Number(payload.planned)      || 0,
        Number(payload.success)      || 0,
        Number(payload.late)         || 0,
        Number(payload.fail)         || 0,
        Number(payload.pct)          || 0,
        now
      ];
      sheet.appendRow(newRow);
      items.push({ id: Number(payload.id) || 0, rowNum: sheet.getLastRow() });
    });
    return { success: true, saved: items.length, items: items };
  } catch(err) { return { success: false, message: err.message }; }
}

function deleteStaffEventRow(rowNum) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_EVENT_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rn = parseInt(rowNum);
    if (isNaN(rn) || rn < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    sheet.deleteRow(rn);
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

function updateStaffEventFixed(rowNum, fixed) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAFF_EVENT_SHEET);
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet' };
    var rn = parseInt(rowNum);
    if (isNaN(rn) || rn < 2) return { success: false, message: 'rowNum ไม่ถูกต้อง' };
    sheet.getRange(rn, 9).setValue(fixed ? 'TRUE' : 'FALSE'); // col I = fixed
    return { success: true };
  } catch(err) { return { success: false, message: err.message }; }
}

// ════════════════════════════════════════════════════════════════════════
// CYCLE COUNT EDIT — แก้ไขแถวข้อมูลหลังบ้าน
// ════════════════════════════════════════════════════════════════════════

/**
 * updateFGCycleRow — แก้ไขแถวใน Daily Cycle Count FG
 * ค้นหาแถวที่ตรงกับ cycleDate + sku (แถวล่าสุดที่ตรง)
 * แล้ว overwrite ค่าที่แก้ไข
 *
 * คอลัมน์ Daily Cycle Count FG (1-based):
 *  1=บันทึกเมื่อ  2=วันที่Cycle  3=รหัสสินค้า  4=ชื่อสินค้า
 *  5=เส้นต่อมัด  6=กอง1(มัด)  7=กอง2(มัด)  8=เศษ1(เส้น)  9=เศษ2(เส้น)
 * 10=Hold(เส้น) 11=นับจริง(เส้น) 12=ระบบ(เส้น) 13=ส่วนต่าง 14=สถานะ 15=หมายเหตุ
 * 16=กอง1_แหล่ง 17=กอง2_แหล่ง 18=เศษ1_แหล่ง 19=เศษ2_แหล่ง
 */
function updateFGCycleRow(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DAILY_CYCLE_COUNT_FG_SHEET_NAME || 'Daily Cycle Count FG');
    if (!sheet || sheet.getLastRow() < 2) return { success: false, message: 'ไม่พบข้อมูลในชีต' };

    var data = sheet.getDataRange().getValues();
    var targetRowNum = -1;

    // ค้นหาแถวล่าสุดที่ cycleDate + sku ตรง
    for (var i = data.length - 1; i >= 1; i--) {
      var rowSku  = String(data[i][2] || '').trim();
      var rowDate = data[i][1] instanceof Date
        ? Utilities.formatDate(data[i][1], 'GMT+7', 'yyyy-MM-dd')
        : String(data[i][1] || '').trim().split('T')[0];
      if (rowSku === String(params.sku || '').trim() && rowDate === String(params.cycleDate || '').trim()) {
        targetRowNum = i + 1; // 1-based
        break;
      }
    }

    if (targetRowNum < 0) return { success: false, message: 'ไม่พบแถวที่ต้องการแก้ไข (SKU: ' + params.sku + ', วันที่: ' + params.cycleDate + ')' };

    var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    var lpb    = Number(params.linesPerBundle) || 10;
    var p1     = Number(params.pile1)  || 0;
    var p2     = Number(params.pile2)  || 0;
    var s1     = Number(params.scrap1) || 0;
    var s2     = Number(params.scrap2) || 0;
    var hold   = Number(params.hold)   || 0;
    var actual = (p1 + p2) * lpb + s1 + s2;
    var sys    = Number(params.systemQty) || 0;
    var diff   = actual - sys;
    var status = diff === 0 ? 'MATCH' : 'DIFF';

    // อัปเดตทั้งแถว (คง col 1 = บันทึกเมื่อ ให้เป็นเวลาแก้ไข)
    var newRow = [
      nowStr,                  // 1 บันทึกเมื่อ (เวลาแก้ไข)
      data[targetRowNum-1][1], // 2 วันที่ Cycle (คงเดิม)
      params.sku,              // 3
      params.name || data[targetRowNum-1][3], // 4
      lpb,  p1, p2, s1, s2, hold, // 5-10
      actual, sys, diff, status,   // 11-14
      String(params.remark || ''), // 15
      Number(params.pile1_terms)  || 1, // 16
      Number(params.pile2_terms)  || 1, // 17
      Number(params.scrap1_terms) || 1, // 18
      Number(params.scrap2_terms) || 1  // 19
    ];

    sheet.getRange(targetRowNum, 1, 1, newRow.length).setValues([newRow]);
    return { success: true, message: 'แก้ไขสำเร็จ (แถว ' + targetRowNum + ')', actual: actual, diff: diff, status: status };
  } catch(e) { return { success: false, message: e.toString() }; }
}


/**
 * updateSemiCycleRow — แก้ไขแถวใน Daily Cycle Count SEMI
 * คอลัมน์ (1-based):
 *  1=บันทึกเมื่อ  2=วันที่Cycle  3=SEMI Code  4=ชื่อSEMI
 *  5=FG1Code  6=FG1Name  7=FG2Code  8=FG2Name
 *  9=SYSTEM(แถว) 10=QTY FG1 11=QTY FG2 12=TOTAL 13=DIFF 14=สถานะ 15=หมายเหตุ
 */
function updateSemiCycleRow(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(DAILY_CYCLE_SEMI_SHT || 'Daily Cycle Count SEMI');
    if (!sheet || sheet.getLastRow() < 2) return { success: false, message: 'ไม่พบข้อมูลในชีต' };

    var data = sheet.getDataRange().getValues();
    var targetRowNum = -1;

    for (var i = data.length - 1; i >= 1; i--) {
      var rowSku  = String(data[i][2] || '').trim();
      var rowDate = data[i][1] instanceof Date
        ? Utilities.formatDate(data[i][1], 'GMT+7', 'yyyy-MM-dd')
        : String(data[i][1] || '').trim().split('T')[0];
      if (rowSku === String(params.semiSku || '').trim() && rowDate === String(params.cycleDate || '').trim()) {
        targetRowNum = i + 1;
        break;
      }
    }

    if (targetRowNum < 0) return { success: false, message: 'ไม่พบแถวที่ต้องการแก้ไข (SEMI: ' + params.semiSku + ')' };

    var nowStr  = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    var qtyFg1  = params.qtyFg1 !== null && params.qtyFg1 !== '' ? Number(params.qtyFg1) : '';
    var qtyFg2  = params.qtyFg2 !== null && params.qtyFg2 !== '' ? Number(params.qtyFg2) : '';
    var total   = (Number(qtyFg1) || 0) + (Number(qtyFg2) || 0);
    var sys     = Number(params.systemQty) || 0;
    var diff    = total - sys;
    var status  = diff === 0 ? 'MATCH' : 'DIFF';

    var prev = data[targetRowNum - 1];
    var newRow = [
      nowStr,
      prev[1],                        // วันที่ Cycle คงเดิม
      params.semiSku,
      params.semiName || prev[3],
      prev[4], prev[5], prev[6], prev[7], // FG codes/names คงเดิม
      sys,
      qtyFg1 !== '' ? qtyFg1 : '',
      qtyFg2 !== '' ? qtyFg2 : '',
      total, diff, status,
      String(params.remark || '')
    ];

    sheet.getRange(targetRowNum, 1, 1, newRow.length).setValues([newRow]);
    return { success: true, message: 'แก้ไข SEMI สำเร็จ (แถว ' + targetRowNum + ')', total: total, diff: diff, status: status };
  } catch(e) { return { success: false, message: e.toString() }; }
}


// ════════════════════════════════════════════════════════════════════════
// SAFETY STOCK FG — จัดการ Safety Stock ต่อสินค้า
// Sheet: "Safety Stock FG"
// คอลัมน์: A=SKU B=ชื่อ C=สถานะ D=คันรถ E=กก.รวม F=น้ำหนัก/เส้น G=เส้น/มัด H=เส้นรวม I=มัดรวม J=หมายเหตุ K=บันทึกเมื่อ
// ════════════════════════════════════════════════════════════════════════

const SAFETY_STOCK_FG_SHEET = 'Safety Stock FG';

/**
 * getSafetyStockData
 * รวม 3 แหล่ง: Product (SKU+ชื่อ+เส้น/มัด) + TST QC Standard (kg/เส้น) + Safety Stock FG (การตั้งค่าที่บันทึกไว้)
 */
function getSafetyStockData() {
  return _withCache('safetyStock', 300, function() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. ดึง Product sheet (Col A=SKU, Col B=ชื่อ, Col C=เส้น/มัด)
    var productSheet = ss.getSheetByName('Product');
    if (!productSheet || productSheet.getLastRow() < 2) {
      return { success: false, message: 'ไม่พบชีต Product' };
    }
    var productData = productSheet.getDataRange().getValues();
    var products = []; // [{ sku, name, linesPerBundle }]
    for (var i = 1; i < productData.length; i++) {
      var sku = String(productData[i][0] || '').trim();
      if (!sku) continue;
      products.push({
        sku:            sku,
        name:           String(productData[i][1] || '').trim(),
        linesPerBundle: Number(productData[i][2]) || 1
      });
    }

    // 2. ดึง TST QC Standard (Col A=SKU, Col E=kg/เส้น index 4)
    var weightMap = {}; // sku → kg/เส้น
    var qcSheet = ss.getSheetByName('TST QC Standard');
    if (qcSheet && qcSheet.getLastRow() >= 2) {
      var qcData = qcSheet.getDataRange().getValues();
      for (var j = 1; j < qcData.length; j++) {
        var qSku = String(qcData[j][0] || '').trim();
        var kg   = parseFloat(qcData[j][4]) || 0; // Col E
        if (qSku) weightMap[qSku] = kg;
      }
    }

    // 3. ดึงค่าที่บันทึกไว้ใน Safety Stock FG sheet (ถ้ามี)
    var savedMap = {}; // sku → { status, trucks, remark }
    var ssSheet = ss.getSheetByName(SAFETY_STOCK_FG_SHEET);
    if (ssSheet && ssSheet.getLastRow() >= 2) {
      var ssData = ssSheet.getDataRange().getValues();
      for (var k = 1; k < ssData.length; k++) {
        var sSku = String(ssData[k][0] || '').trim();
        if (!sSku) continue;
        savedMap[sSku] = {
          status: String(ssData[k][2] || 'safety_stock').trim(),
          trucks: parseFloat(ssData[k][3]) || 0,
          remark: String(ssData[k][9] || '').trim()
        };
      }
    }

    // 4. รวมข้อมูล
    var result = products.map(function(p) {
      var saved = savedMap[p.sku] || {};
      return {
        sku:            p.sku,
        name:           p.name,
        linesPerBundle: p.linesPerBundle,
        weightPerLine:  weightMap[p.sku] || 0,
        status:         saved.status  || 'safety_stock',
        trucks:         saved.trucks  || 0,
        remark:         saved.remark  || ''
      };
    });

    return { success: true, products: result };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
  }); // end _withCache
}

/**
 * saveSafetyStockData
 * เขียนข้อมูลทั้งหมดลงชีต Safety Stock FG (clear แล้วเขียนใหม่)
 * @param {Array} rows — [{ sku, name, status, trucks, kgTotal, weightPerLine, linesPerBundle, lines, bundles, remark }]
 */
function saveSafetyStockData(rows) {
  try {
    if (!rows || rows.length === 0) return { success: false, message: 'ไม่มีข้อมูลที่จะบันทึก' };
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SAFETY_STOCK_FG_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(SAFETY_STOCK_FG_SHEET);
    }

    var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');

    // สร้าง header
    var headers = [
      'รหัสสินค้า', 'ชื่อสินค้า', 'สถานะ', 'คันรถ', 'กก.รวม',
      'น้ำหนัก/เส้น (กก.)', 'เส้น/มัด', 'เส้นรวม', 'มัดรวม', 'หมายเหตุ', 'บันทึกเมื่อ'
    ];

    var data = rows.map(function(r) {
      return [
        r.sku, r.name,
        r.status,           // C: สถานะ
        r.trucks,           // D: คันรถ
        r.kgTotal,          // E: กก.รวม
        r.weightPerLine,    // F: น้ำหนัก/เส้น
        r.linesPerBundle,   // G: เส้น/มัด
        r.lines,            // H: เส้นรวม
        r.bundles,          // I: มัดรวม
        r.remark,           // J: หมายเหตุ
        nowStr              // K: บันทึกเมื่อ
      ];
    });

    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground('#78350f')
      .setFontColor('#ffffff');
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);

    // จัด format สีแถว
    var statusColors = { safety_stock: '#d1fae5', no_safety: '#dbeafe', disable: '#fee2e2' };
    data.forEach(function(row, idx) {
      var bg = statusColors[row[2]] || '#ffffff';
      sheet.getRange(idx + 2, 1, 1, headers.length).setBackground(bg);
    });

    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    return { success: true, message: 'บันทึกสำเร็จ ' + rows.length + ' รายการ' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ════════════════════════════════════════════════════════════════════════
// KPI WAREHOUSE & LOGISTIC — Supervisor Dashboard
// ════════════════════════════════════════════════════════════════════════

/**
 * ดึงข้อมูล KPI อัตโนมัติสำหรับช่วงวันที่ที่เลือก
 * แหล่งข้อมูล:
 *   1. WH_Activity_Log       → ประสิทธิภาพการโหลดสินค้า
 *   2. Inventory_Blocking_Log → ไม่มีพื้นที่วางสินค้า
 *   3. Daily Cycle Count FG  → Checker FG %, Inventory Control
 * @param {string} startDateStr  - yyyy-MM-dd
 * @param {string} endDateStr    - yyyy-MM-dd
 */
function getKpiWHLGData(startDateStr, endDateStr) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    var start = new Date(startDateStr); start.setHours(0,0,0,0);
    var end   = new Date(endDateStr);   end.setHours(23,59,59,999);

    // ── Helper: Median ──────────────────────────────────────────────────
    function median(arr) {
      if (!arr.length) return null;
      var sorted = arr.slice().sort(function(a, b) { return a - b; });
      var mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    // ── 1. WH_Activity_Log → ประสิทธิภาพการโหลด ────────────────────────
    // สูตรใหม่: MPI÷WPU = นาที/KG (normalize ด้วยน้ำหนักต่อรายการ → ยุติธรรมกว่า)
    // Penalty: โหลดสินค้าผิด -15/ครั้ง, เคลมสินค้า -10/ครั้ง
    // Col A(0)=ประเภท, Col B(1)=วันที่, Col K(10)=นาที/รายการ, Col L(11)=น้ำหนักต่อหน่วย(A)
    var whaSheet = ss.getSheetByName(WH_ACTIVITY_SHEET);
    var whaMap      = {}; // key yyyy-MM-dd → { wpuList, mpiList, wrongCount, claimCount }
    var truckMap    = {}; // key 'yyyy-MM-dd|plate' → { plate, date, mpiPerKgList }
    var allMpiPerKg = []; // นาที/KG ทุก row สำหรับคำนวณ median baseline

    if (whaSheet && whaSheet.getLastRow() >= 2) {
      var whaData = whaSheet.getDataRange().getValues();
      for (var i = 1; i < whaData.length; i++) {
        var rowType = String(whaData[i][0] || '');
        var wd = parseDateValue(whaData[i][1]);
        if (!wd) continue;
        var wKey = Utilities.formatDate(wd, 'GMT+7', 'yyyy-MM-dd');
        if (!whaMap[wKey]) whaMap[wKey] = { wpuList: [], mpiList: [], wrongCount: 0, claimCount: 0, dmgLoadCount: 0, dmgStoreCount: 0 };

        if (rowType === 'โหลดสินค้าผิด') {
          whaMap[wKey].wrongCount++;
          continue;
        }
        if (rowType === 'เคลมสินค้า') {
          whaMap[wKey].claimCount++;
          continue;
        }
        if (rowType === 'สินค้าเสียหาย-การโหลด') {
          whaMap[wKey].dmgLoadCount++;
          continue;
        }
        if (rowType === 'สินค้าเสียหาย-การเก็บ') {
          whaMap[wKey].dmgStoreCount++;
          continue;
        }
        if (rowType !== 'บันทึกการโหลด') continue;

        var wpu = parseFloat(String(whaData[i][11]).replace(/,/g,''));
        var mpi = parseFloat(String(whaData[i][10]).replace(/,/g,''));
        if (isNaN(wpu) || wpu <= 0) continue;
        if (isNaN(mpi) || mpi <= 0) continue;

        whaMap[wKey].wpuList.push(wpu);
        whaMap[wKey].mpiList.push(mpi);
        allMpiPerKg.push(mpi / wpu); // นาที/KG per trip

        // Per-truck map (Col U index 20 = ทะเบียนรถ, optional)
        var rowTruck = String(whaData[i][20] || '').trim();
        if (rowTruck) {
          var tKey = wKey + '|' + rowTruck;
          if (!truckMap[tKey]) truckMap[tKey] = { plate: rowTruck, date: wKey, mpiPerKgList: [] };
          truckMap[tKey].mpiPerKgList.push(mpi / wpu);
        }
      }
    }

    // Median นาที/KG จากข้อมูลทั้งหมด (historical baseline)
    var mpiPerKgMedian = median(allMpiPerKg);

    // ── 2. Sheet Plan → planMinutes ต่อวัน (SUM prodTimeDay Col F × 60) ──
    // Col A(0)=วันที่(yyyyMMdd), Col F(5)=prodTimeDay(ชั่วโมง)
    var planSheet = ss.getSheetByName(PLAN_SHEET_NAME);
    var planMap   = {}; // key yyyy-MM-dd → totalMinutes
    if (planSheet && planSheet.getLastRow() >= 2) {
      var planData = planSheet.getDataRange().getValues();
      for (var j = 1; j < planData.length; j++) {
        var pDateRaw = String(planData[j][0] || '').trim();
        if (!pDateRaw || pDateRaw.length < 8) continue;
        // yyyyMMdd → yyyy-MM-dd
        var pKey = pDateRaw.substring(0,4) + '-' + pDateRaw.substring(4,6) + '-' + pDateRaw.substring(6,8);
        var prodHrs = parseFloat(String(planData[j][5]).replace(/,/g,'')) || 0;
        planMap[pKey] = (planMap[pKey] || 0) + prodHrs;
      }
      // แปลงชั่วโมง → นาที
      Object.keys(planMap).forEach(function(k) { planMap[k] = Math.round(planMap[k] * 60); });
    }

    // ── 3. Inv Control (%) = (totalLines - adjustedLines) / totalLines × 100 ──
    // 3a. Inventory_Log_Daily → totalLinesMap per วัน
    // Col A(0)=วันที่, Col D(3)=จำนวน SKU (เส้น) — last row per date wins
    var invLogSheet   = ss.getSheetByName(INVENTORY_DAILY_LOG_SHEET);
    var totalLinesMap = {}; // key yyyy-MM-dd → totalLines
    if (invLogSheet && invLogSheet.getLastRow() >= 2) {
      var ilData = invLogSheet.getDataRange().getValues();
      for (var il = 1; il < ilData.length; il++) {
        var ilD = parseDateValue(ilData[il][0]); // Col A(0) = วันที่
        if (!ilD) continue;
        var ilKey   = Utilities.formatDate(ilD, 'GMT+7', 'yyyy-MM-dd');
        var ilLines = parseFloat(String(ilData[il][3]).replace(/,/g,'')) || 0; // Col D(3)
        totalLinesMap[ilKey] = ilLines; // last row per date wins
      }
    }

    // 3b. Transection FG → adjustedLinesMap
    // กรอง Col G(6)="Counting", กลุ่มตาม Col N(13)=Number
    // นับเฉพาะ Number ที่มีแถวเดียวต่อวัน, Col H(7)=เส้น, Col T(19)=วันที่
    var transFGSheet    = ss.getSheetByName('Transection FG');
    var adjustedLinesMap = {}; // key yyyy-MM-dd → adjustedLines
    if (transFGSheet && transFGSheet.getLastRow() >= 2) {
      var tfData     = transFGSheet.getDataRange().getValues();
      var tfGroupMap = {}; // key "yyyy-MM-dd|Number" → { dateKey, lines[], count }
      for (var tf = 1; tf < tfData.length; tf++) {
        var tfRef = String(tfData[tf][6] || '').trim(); // Col G(6) = Reference
        if (tfRef !== 'Counting') continue;
        var tfD = parseDateValue(tfData[tf][19]); // Col T(19) = วันที่
        if (!tfD) continue;
        var tfDateKey  = Utilities.formatDate(tfD, 'GMT+7', 'yyyy-MM-dd');
        var tfNum      = String(tfData[tf][13] || '').trim(); // Col N(13) = Number
        var tfLines    = Math.abs(parseFloat(String(tfData[tf][7]).replace(/,/g,'')) || 0); // Col H(7) ใช้ค่าสัมบูรณ์
        var tfGroupKey = tfDateKey + '|' + tfNum;
        if (!tfGroupMap[tfGroupKey]) tfGroupMap[tfGroupKey] = { dateKey: tfDateKey, lines: [], count: 0 };
        tfGroupMap[tfGroupKey].lines.push(tfLines);
        tfGroupMap[tfGroupKey].count++;
      }
      // นับเฉพาะ Number ที่มี 1 แถว (count > 1 → ไม่นับ)
      var tfKeys = Object.keys(tfGroupMap);
      for (var tg = 0; tg < tfKeys.length; tg++) {
        var grp = tfGroupMap[tfKeys[tg]];
        if (grp.count === 1) {
          adjustedLinesMap[grp.dateKey] = (adjustedLinesMap[grp.dateKey] || 0) + grp.lines[0];
        }
      }
    }

    // ── 4. KPI Log → Checker(%), PRD KPI(%), tL, dL สำหรับ FG และ SEMI ──
    // Col A(0)=บันทึกเมื่อ, B(1)=วันที่Cycle, C(2)=ประเภท
    // E(4)=เส้นทั้งหมด(tL), M(12)=Diff เส้น(dL), N(13)=KPI Checker(%), O(14)=KPI PRD(%)
    var kpiLogSheet = ss.getSheetByName('KPI Log');
    var kpiLogMap   = {}; // key yyyy-MM-dd → { FG: {checker,prd,tL,dL}, SEMI: {checker,prd,tL,dL} }
    if (kpiLogSheet && kpiLogSheet.getLastRow() >= 2) {
      var kpiLogData = kpiLogSheet.getDataRange().getValues();
      for (var p = 1; p < kpiLogData.length; p++) {
        var kd = parseDateValue(kpiLogData[p][1]); // Col B = วันที่ Cycle
        if (!kd) continue;
        var kKey     = Utilities.formatDate(kd, 'GMT+7', 'yyyy-MM-dd');
        var kType    = String(kpiLogData[p][2] || '').trim(); // Col C = ประเภท
        var kTL      = parseFloat(String(kpiLogData[p][4]).replace(/,/g,''));  // Col E = เส้น ทั้งหมด
        var kDL      = parseFloat(String(kpiLogData[p][12]).replace(/,/g,'')); // Col M = Diff เส้น
        var kChecker = parseFloat(String(kpiLogData[p][13]).replace(/,/g,'')); // Col N = KPI Checker(%)
        var kPrd     = parseFloat(String(kpiLogData[p][14]).replace(/,/g,'')); // Col O = KPI PRD(%)
        if (isNaN(kChecker) && isNaN(kPrd) && isNaN(kTL)) continue;
        if (!kpiLogMap[kKey]) kpiLogMap[kKey] = {};
        kpiLogMap[kKey][kType] = { checker: kChecker, prd: kPrd, tL: kTL, dL: kDL }; // last row wins
      }
    }

    // ── สร้าง result วนทีละวัน ─────────────────────────────────────────
    var result = [];
    var cur    = new Date(start);
    while (cur <= end) {
      var key    = Utilities.formatDate(cur, 'GMT+7', 'yyyy-MM-dd');
      var wha         = whaMap[key] || null;
      var planMinutes = planMap[key] !== undefined ? planMap[key] : null;

      // คำนวณ efficiency จาก WH_Activity_Log
      var efficiency  = null;
      var effStep1    = null;
      var wpuActual   = null;
      var mpiActual   = null;
      var wrongCount  = wha ? (wha.wrongCount || 0) : 0;
      var claimCount  = wha ? (wha.claimCount || 0) : 0;

      if (wha && wha.wpuList.length > 0 && mpiPerKgMedian) {
        // wpuActual / mpiActual = ค่าเฉลี่ย (ใช้แสดงผลในตาราง เท่านั้น)
        wpuActual = wha.wpuList.reduce(function(a,b){return a+b;},0) / wha.wpuList.length;
        mpiActual = wha.mpiList.reduce(function(a,b){return a+b;},0) / wha.mpiList.length;
        // ✅ สูตรใหม่: นาที/KG = MPI÷WPU → normalize ด้วยน้ำหนักต่อรายการ (ยุติธรรมกว่า)
        var effList = [];
        for (var t = 0; t < wha.wpuList.length; t++) {
          var wpu_t = wha.wpuList[t];
          var mpi_t = wha.mpiList[t];
          if (wpu_t > 0 && mpi_t > 0) {
            var mpiPerKg_t = mpi_t / wpu_t; // นาที/KG ของ trip นี้
            // เร็วกว่า median → คะแนนสูง, cap ที่ 100
            var speedScore = Math.min(100, (mpiPerKgMedian / mpiPerKg_t) * 100);
            effList.push(speedScore);
          }
        }
        if (effList.length > 0) {
          effStep1 = effList.reduce(function(a,b){return a+b;},0) / effList.length;
          // Penalty: โหลดสินค้าผิด −15/ครั้ง, เคลมสินค้า −10/ครั้ง
          efficiency = Math.round(Math.max(0, effStep1 - wrongCount * 15 - claimCount * 10) * 10) / 10;
        }
      } else if (wha && (wrongCount > 0 || claimCount > 0)) {
        // มี penalty แต่ไม่มี trip data → แสดง null
        efficiency = null;
      }

      // Checker(%), PRD KPI(%), Final Adj(%) จาก KPI Log
      var kpiLog         = kpiLogMap[key] || {};
      var kpiFG          = kpiLog['FG']   || {};
      var kpiSEMI        = kpiLog['SEMI'] || {};
      var checkerFGPct   = !isNaN(kpiFG.checker)   ? Math.round(kpiFG.checker   * 10) / 10 : null;
      var checkerSEMIPct = !isNaN(kpiSEMI.checker) ? Math.round(kpiSEMI.checker * 10) / 10 : null;
      // Final Adj FG (%) = (tL - |dL|) / tL × 100 จาก KPI Log type='FG'
      var finalAdjFGPct  = (!isNaN(kpiFG.tL) && kpiFG.tL > 0)
          ? Math.round(((kpiFG.tL - Math.abs(isNaN(kpiFG.dL) ? 0 : kpiFG.dL)) / kpiFG.tL) * 1000) / 10
          : null;
      // prdKPI FG → Data Err FG (%), prdKPI SEMI → Data Err SEMI (%)
      var prdKPIFG       = !isNaN(kpiFG.prd)       ? Math.round(kpiFG.prd       * 10) / 10 : null;
      var prdKPISEMI     = !isNaN(kpiSEMI.prd)     ? Math.round(kpiSEMI.prd     * 10) / 10 : null;

      // คำนวณ Damage KPI จาก WH_Activity_Log
      var dmgLoadCount  = wha ? (wha.dmgLoadCount  || 0) : 0;
      var dmgStoreCount = wha ? (wha.dmgStoreCount || 0) : 0;
      var scoreLoad     = Math.max(0, 100 - dmgLoadCount  * 20);
      var scoreStore    = Math.max(0, 100 - dmgStoreCount * 10);
      // ถ่วงน้ำหนัก 0.6 (โหลด) + 0.4 (เก็บ)
      var damagePct     = Math.round((scoreLoad * 0.6 + scoreStore * 0.4) * 10) / 10;

      var planHours = (planMinutes !== null) ? Math.round((planMinutes / 60) * 10) / 10 : null;

      // Per-truck efficiency สำหรับวันนี้
      var truckScores = [];
      Object.keys(truckMap).forEach(function(tKey) {
        var tm = truckMap[tKey];
        if (tm.date !== key) return;
        if (!mpiPerKgMedian || !tm.mpiPerKgList.length) return;
        var effList_t = tm.mpiPerKgList.map(function(v) {
          return Math.min(100, (mpiPerKgMedian / v) * 100);
        });
        var avgEff_t = effList_t.reduce(function(a, b) { return a + b; }, 0) / effList_t.length;
        truckScores.push({
          plate:      tm.plate,
          efficiency: Math.round(avgEff_t * 10) / 10,
          tripCount:  tm.mpiPerKgList.length
        });
      });

      result.push({
        date:             key,
        efficiency:       efficiency,       // → Load Score (%)
        checkerFGPct:     checkerFGPct,     // → FG Checker (%)
        checkerSEMIPct:   checkerSEMIPct,   // → SEMI Checker (%)
        finalAdjFGPct:    finalAdjFGPct,    // → Final Adj FG (%) = (tL-|dL|)/tL×100
        damagePct:        damagePct,        // → Damage Score (%)
        prdKPIFG:         prdKPIFG,         // → Data Err FG (%)
        prdKPISEMI:       prdKPISEMI,       // → Data Err SEMI (%)
        planHours:        planHours,        // → แผนชั่วโมง (แสดงใน Space Breakdown)
        planMinutes:      planMinutes,      // → แผนนาที (ใช้คำนวณ Space Breakdown KPI)
        truckScores:      truckScores,      // → per-truck efficiency [{ plate, efficiency, tripCount }]
      });
      cur.setDate(cur.getDate() + 1);
    }

    return { success: true, data: result };
  } catch(e) {
    Logger.log('❌ getKpiWHLGData error: ' + e.message);
    return { success: false, message: e.toString() };
  }
}

/**
 * บันทึกหรืออัปเดต KPI 1 วัน ลงชีต Master KPI WH&LG
 * @param {Object} row - { date(dd/MM/yyyy), efficiency, wpuActual, mpiActual, wpuMedian, mpiMedian,
 *                         loadCount, blockingCount, invControlCount, checkerFGPct,
 *                         damage, checkerSemi, safety }
 */
function saveKpiWHLG(row) {
  try {
    var ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
    var SHEET_NAME = 'Master KPI WH&LG';
    var sheet      = ss.getSheetByName(SHEET_NAME);

    var headers = [
      'วันที่บันทึก',
      'วันที่ข้อมูล',
      'FG Checker (%)',
      'SEMI Checker (%)',
      'Final Adj FG (%)',
      'Final Adj SEMI (%)',
      'Space Breakdown (%)',
      'Load Score (%)',
      'Damage Score (%)',
      'Data Err FG (%)',
      'Data Err SEMI (%)',
    ];

    // สร้างชีตใหม่ถ้ายังไม่มี หรือ reset ถ้า header ไม่ตรง (format เก่า)
    var needReset = false;
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      needReset = true;
    } else {
      // ตรวจ header row: col A ต้องเป็น 'วันที่บันทึก'
      var firstCell = String(sheet.getRange(1, 1).getValue() || '').trim();
      if (firstCell !== 'วันที่บันทึก') needReset = true;
    }
    if (needReset) {
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#f59e0b')
        .setFontColor('#1e293b');
      sheet.setFrozenRows(1);
      // ลบคอลัมน์ส่วนเกินถ้ามี
      if (sheet.getMaxColumns() > headers.length) {
        sheet.deleteColumns(headers.length + 1, sheet.getMaxColumns() - headers.length);
      }
    }

    var _v = function(v) { return (v !== null && v !== undefined) ? v : ''; };
    var nowStr = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
    var newRow = [
      nowStr,                    // 0: วันที่บันทึก
      row.date || '',            // 1: วันที่ข้อมูล
      _v(row.checkerFGPct),      // 2: FG Checker (%)
      _v(row.checkerSEMIPct),    // 3: SEMI Checker (%)
      _v(row.finalAdjFG),        // 4: Final Adj FG (%)
      _v(row.finalAdjSEMI),      // 5: Final Adj SEMI (%)
      _v(row.spaceBreakdown),    // 6: Space Breakdown (%)
      _v(row.loadScore),         // 7: Load Score (%)
      _v(row.damageScore),       // 8: Damage Score (%)
      _v(row.dataErrFG),         // 9: Data Err FG (%)
      _v(row.dataErrSEMI),       // 10: Data Err SEMI (%)
    ];

    // ตรวจสอบว่ามีข้อมูลวันนั้นอยู่แล้วหรือไม่ (อัปเดตถ้ามี — เปรียบเทียบกับ col B = วันที่ข้อมูล)
    var lastRow  = sheet.getLastRow();
    var updated  = false;
    if (lastRow >= 2) {
      var existing = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var i = 0; i < existing.length; i++) {
        var cellDate = existing[i][1] instanceof Date
          ? Utilities.formatDate(existing[i][1], 'GMT+7', 'dd/MM/yyyy')
          : String(existing[i][1] || '').trim();
        if (cellDate === row.date) {
          sheet.getRange(i + 2, 1, 1, newRow.length).setValues([newRow]);
          updated = true;
          break;
        }
      }
    }
    if (!updated) sheet.appendRow(newRow);

    // Format แถวที่บันทึก
    var targetRow = updated
      ? (function(){ var d=sheet.getRange(2,1,sheet.getLastRow()-1,2).getValues(); for(var x=0;x<d.length;x++){var c=d[x][1] instanceof Date?Utilities.formatDate(d[x][1],'GMT+7','dd/MM/yyyy'):String(d[x][1]||'').trim(); if(c===row.date)return x+2;} return sheet.getLastRow(); })()
      : sheet.getLastRow();
    sheet.getRange(targetRow, 1, 1, newRow.length).setBackground('#d1fae5');

    return { success: true, message: 'บันทึก KPI วันที่ ' + row.date + ' สำเร็จ' };
  } catch(e) {
    Logger.log('❌ saveKpiWHLG error: ' + e.message);
    return { success: false, message: e.toString() };
  }
}

/**
 * โหลดข้อมูล KPI ที่บันทึกไว้แล้วจาก Master KPI WH&LG
 * @param {string} startDateStr - yyyy-MM-dd
 * @param {string} endDateStr   - yyyy-MM-dd
 */
function getKpiWHLGHistory(startDateStr, endDateStr) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Master KPI WH&LG');
    if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };

    var start = new Date(startDateStr); start.setHours(0,0,0,0);
    var end   = new Date(endDateStr);   end.setHours(23,59,59,999);

    var data   = sheet.getDataRange().getValues();
    var result = [];
    var _pf = function(v) { return (v !== '' && v !== null && v !== undefined) ? parseFloat(v) : null; };
    for (var i = 1; i < data.length; i++) {
      // Col A(0)=วันที่บันทึก(timestamp), Col B(1)=วันที่ข้อมูล
      var rowDateRaw = data[i][1];
      var rowDate    = parseDateValue(rowDateRaw);
      if (!rowDate || rowDate < start || rowDate > end) continue;
      var ddmmyyyy = Utilities.formatDate(rowDate, 'GMT+7', 'dd/MM/yyyy');
      // Columns:
      //  0=วันที่บันทึก  1=วันที่ข้อมูล  2=FGChecker  3=SEMIChecker
      //  4=FinalAdjFG    5=FinalAdjSEMI  6=SpaceBreakdown
      //  7=LoadScore     8=DamageScore   9=DataErrFG  10=DataErrSEMI
      result.push({
        date:           ddmmyyyy,
        checkerFGPct:   _pf(data[i][2]),
        checkerSEMIPct: _pf(data[i][3]),
        finalAdjFG:     _pf(data[i][4]),
        finalAdjSEMI:   _pf(data[i][5]),
        spaceBreakdown: _pf(data[i][6]),
        loadScore:      _pf(data[i][7]),
        damageScore:    _pf(data[i][8]),
        dataErrFG:      _pf(data[i][9]),
        dataErrSEMI:    _pf(data[i][10]),
      });
    }
    return { success: true, data: result };
  } catch(e) {
    Logger.log('❌ getKpiWHLGHistory error: ' + e.message);
    return { success: false, message: e.toString() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveBatchLogisticPlans(plansArray)
// บันทึกแผนหลายเที่ยวพร้อมกัน (Auto-Planning)
// ─────────────────────────────────────────────────────────────────────────────
function saveBatchLogisticPlans(plansArray) {
  try {
    if (!Array.isArray(plansArray) || plansArray.length === 0) {
      return { success: false, message: 'ไม่มีแผนที่ต้องบันทึก' };
    }
    var savedIds = [];
    var errors = [];
    for (var i = 0; i < plansArray.length; i++) {
      try {
        var res = saveLogisticPlan(plansArray[i]);
        if (res && res.planId) {
          savedIds.push(res.planId);
        } else {
          errors.push('เที่ยวที่ ' + (i+1) + ': ' + (res && res.message ? res.message : 'ไม่ทราบสาเหตุ'));
        }
      } catch(e2) {
        errors.push('เที่ยวที่ ' + (i+1) + ': ' + e2.toString());
      }
    }
    return {
      success: savedIds.length > 0,
      savedIds: savedIds,
      errors: errors,
      message: 'บันทึกสำเร็จ ' + savedIds.length + '/' + plansArray.length + ' เที่ยว'
    };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// getReadyToShipOrders(shipDateStr)
// ดึงข้อมูลจาก Sheet "จองพร้อมส่ง" เพื่อใช้วางแผนการส่งมอบ
// ─────────────────────────────────────────────────────────────────────────────
function getReadyToShipOrders(shipDateStr) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('จองพร้อมส่ง');
    if (!sheet) return { success: false, message: 'ไม่พบ Sheet "จองพร้อมส่ง"' };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: true, items: [], message: 'ไม่มีข้อมูล' };

    var data = sheet.getDataRange().getValues();
    var headers = data[0]; // row 1 = header

    // Map column index by header name (case-insensitive)
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[String(h).trim().toLowerCase()] = i; });

    // Column mapping ตามข้อมูลที่เห็นในภาพ:
    // D(3)=Delivery name/ชื่อร้าน, G(6)=Ship date, H(7)=Item number, I(8)=Product name
    // AB(27)=W/Order(จำนวน), AF(31)=KG/จอง(น้ำหนัก)
    // ถ้า header ตรง จะใช้ header; ถ้าไม่ตรง ใช้ index ตาม position
    var iShopName    = colIdx['delivery name']  !== undefined ? colIdx['delivery name']  : 3;
    var iShipDate    = colIdx['ship date']       !== undefined ? colIdx['ship date']       : 6;
    var iItemNo      = colIdx['item number']     !== undefined ? colIdx['item number']     : 7;
    var iProductName = colIdx['product name']    !== undefined ? colIdx['product name']    : 8;
    var iQty         = colIdx['qty']              !== undefined ? colIdx['qty']              :
                      colIdx['จำนวน']            !== undefined ? colIdx['จำนวน']            : 11; // Col L (0-based)
    var iWeight      = colIdx['kg/จอง']          !== undefined ? colIdx['kg/จอง']          : 31;

    // กรอง ship date ถ้ามี
    var filterDate = null;
    if (shipDateStr) {
      var dp = String(shipDateStr).split('-');
      if (dp.length === 3) filterDate = new Date(parseInt(dp[0]), parseInt(dp[1])-1, parseInt(dp[2]));
    }

    var items = [];
    for (var i = 1; i < data.length; i++) {
      var r        = data[i];
      var shopRaw  = String(r[iShopName]  || '').trim();
      var productN = String(r[iProductName] || '').trim();
      if (!shopRaw || !productN) continue;

      // แปลง ship date
      var sd = '';
      var rawDate = r[iShipDate];
      if (rawDate) {
        var d = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (!isNaN(d.getTime())) {
          // กรองตาม filterDate ถ้ามี
          if (filterDate) {
            var fy = filterDate.getFullYear(), fm = filterDate.getMonth(), fd = filterDate.getDate();
            if (d.getFullYear() !== fy || d.getMonth() !== fm || d.getDate() !== fd) continue;
          }
          var yyyy = d.getFullYear();
          var mm   = String(d.getMonth()+1).padStart(2,'0');
          var dd2  = String(d.getDate()).padStart(2,'0');
          sd = yyyy + '-' + mm + '-' + dd2;
        }
      }

      var qty     = parseFloat(r[iQty])    || 0;
      var wt      = parseFloat(r[iWeight]) || 0;

      items.push({
        shopRaw:     shopRaw,
        shipDate:    sd,
        itemNo:      String(r[iItemNo] || '').trim(),
        productName: productN,
        qty:         qty,
        weightKg:    wt,
        matched:     false,
        shopId:      null,
        shopName:    ''
      });
    }

    return { success: true, items: items, message: 'โหลดสำเร็จ ' + items.length + ' รายการ' };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RE-CHECK LOG — บันทึก + ดึงประวัติ Re-Check FG Dashboard
// ════════════════════════════════════════════════════════════════════════════

function _getOrCreateRecheckSheet(ss) {
  var sheet = ss.getSheetByName(RECHECK_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RECHECK_LOG_SHEET);
    sheet.getRange(1, 1, 1, 11).setValues([[
      'บันทึกเมื่อ', 'วันที่ Cycle', 'SKU', 'ชื่อสินค้า',
      'ยอด System', 'ยอดนับเดิม', 'ยอดนับใหม่', 'Diff',
      'Action', 'หมายเหตุ', 'เวลาที่นับ'
    ]]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveReCheckLog(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateRecheckSheet(ss);
    var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');

    var systemQty = parseFloat(params.systemQty) || 0;
    var actualQty = parseFloat(params.actualQty) || 0;
    var newQty    = (params.action === 'RECOUNTED' &&
                    params.newQty !== '' && params.newQty !== null && params.newQty !== undefined)
                    ? parseFloat(params.newQty) : '';
    var diff      = (newQty !== '') ? (newQty - systemQty) : (actualQty - systemQty);

    sheet.appendRow([
      now,
      params.cycleDate || '',
      params.sku       || '',
      params.name      || '',
      systemQty,
      actualQty,
      newQty,
      diff,
      params.action    || '',
      params.note      || '',
      params.countTime || ''
    ]);

    _clearCache('fgDashboard');
    return { success: true, message: 'บันทึกสำเร็จ' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function saveReCheckLogBulk(paramsArray) {
  try {
    if (!paramsArray || !paramsArray.length) return { success: false, message: 'ไม่มีข้อมูล' };
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = _getOrCreateRecheckSheet(ss);
    var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');

    var rowsToAppend = paramsArray.map(function(params) {
      var systemQty = parseFloat(params.systemQty) || 0;
      var actualQty = parseFloat(params.actualQty) || 0;
      var newQty    = (params.action === 'RECOUNTED' &&
                      params.newQty !== '' && params.newQty !== null && params.newQty !== undefined)
                      ? parseFloat(params.newQty) : '';
      var diff      = (newQty !== '') ? (newQty - systemQty) : (actualQty - systemQty);
      return [
        now,
        params.cycleDate || '',
        params.sku       || '',
        params.name      || '',
        systemQty,
        actualQty,
        newQty,
        diff,
        params.action    || '',
        params.note      || '',
        params.countTime || ''
      ];
    });

    // append ทีเดียว
    if (rowsToAppend.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 11).setValues(rowsToAppend);
    }

    _clearCache('fgDashboard');
    return { success: true, message: 'บันทึกสำเร็จ ' + rowsToAppend.length + ' รายการ' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// ROOT CAUSE LOG
// ============================================================

/**
 * _getRootCauseMap(ss, type)
 * คืน Map: sku → { rootCause, note } (แถวล่าสุดต่อ SKU)
 * type = 'fg' | 'semi'
 */
function _getRootCauseMap(ss, type) {
  var map   = {};
  var sheet = ss.getSheetByName(ROOT_CAUSE_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return map;
  var data = sheet.getDataRange().getValues();
  // Header: [บันทึกเมื่อ(0), วันที่Cycle(1), ประเภท(2), SKU(3), ชื่อ(4), สาเหตุ(5), หมายเหตุ(6)]
  for (var i = 1; i < data.length; i++) {
    var row     = data[i];
    var rowType = String(row[2] || '').trim().toLowerCase();
    if (rowType !== type) continue;
    var sku = String(row[3] || '').trim();
    if (!sku) continue;
    map[sku] = { rootCause: String(row[5] || ''), note: String(row[6] || '') };
  }
  return map;
}

/**
 * saveRootCause(params)
 * บันทึกสาเหตุ DIFF ลงชีต RootCause_Log
 * params: { sku, name, type ('fg'/'semi'), rootCause, note, cycleDate }
 */
function saveRootCause(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(ROOT_CAUSE_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(ROOT_CAUSE_SHEET);
      sheet.getRange(1, 1, 1, 7).setValues([[
        'บันทึกเมื่อ', 'วันที่ Cycle', 'ประเภท', 'SKU', 'ชื่อสินค้า', 'สาเหตุ', 'หมายเหตุ'
      ]]);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    var now = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
    sheet.appendRow([
      now,
      params.cycleDate  || '',
      params.type       || '',
      params.sku        || '',
      params.name       || '',
      params.rootCause  || '',
      params.note       || ''
    ]);
    // clear cache ของ dashboard ที่เกี่ยวข้อง
    _clearCache(params.type === 'semi' ? 'semiDashboard' : 'fgDashboard');
    return { success: true, message: 'บันทึกสาเหตุสำเร็จ' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getSKUCountHistory(sku) {
  try {
    var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
    var history = [];

    // 1. Daily Cycle Count FG — ทุก row ของ SKU นี้
    // Header: [บันทึกเมื่อ(0), วันที่Cycle(1), SKU(2), ชื่อ(3), เส้น/มัด(4),
    //          กอง1(5), กอง2(6), เศษ1(7), เศษ2(8), hold(9), นับจริง(10), ระบบ(11), ส่วนต่าง(12)]
    var cycleSheet = ss.getSheetByName(DAILY_CYCLE_COUNT_FG_SHEET_NAME);
    if (cycleSheet && cycleSheet.getLastRow() >= 2) {
      var cyData = cycleSheet.getDataRange().getValues();
      for (var i = 1; i < cyData.length; i++) {
        var row    = cyData[i];
        var rowSku = String(row[2] || '').trim();
        if (rowSku !== sku) continue;

        var cd = row[1];
        var dateStr = '';
        if (cd instanceof Date && !isNaN(cd)) {
          dateStr = Utilities.formatDate(cd, 'GMT+7', 'dd/MM/yyyy');
        } else if (cd) {
          dateStr = String(cd).substring(0, 10);
        }

        var ts = row[0];
        var tsStr = '';
        if (ts instanceof Date && !isNaN(ts)) {
          tsStr = Utilities.formatDate(ts, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
        } else if (ts) {
          tsStr = String(ts);
        }

        history.push({
          source:    'CYCLE',
          timestamp: tsStr,
          cycleDate: dateStr,
          lpb:       parseFloat(row[4])  || 0,
          pile1:     parseFloat(row[5])  || 0,
          pile2:     parseFloat(row[6])  || 0,
          scrap1:    parseFloat(row[7])  || 0,
          scrap2:    parseFloat(row[8])  || 0,
          hold:      parseFloat(row[9])  || 0,
          systemQty: parseFloat(row[11]) || 0,
          actualQty: parseFloat(row[10]) || 0,
          diff:      parseFloat(row[12]) || 0,
          newQty:    null,
          action:    String(row[13] || ''),
          note:      String(row[14] || ''),
          countTime: ''
        });
      }
    }

    // 2. ReCheck_Log — ทุก row ของ SKU นี้
    var recheckSheet = ss.getSheetByName(RECHECK_LOG_SHEET);
    if (recheckSheet && recheckSheet.getLastRow() >= 2) {
      var rData = recheckSheet.getDataRange().getValues();
      for (var j = 1; j < rData.length; j++) {
        var rRow   = rData[j];
        var rSku   = String(rRow[2] || '').trim();
        if (rSku !== sku) continue;
        var nq = rRow[6];
        history.push({
          source:    'RECHECK',
          timestamp: String(rRow[0] || ''),
          cycleDate: String(rRow[1] || ''),
          systemQty: parseFloat(rRow[4]) || 0,
          actualQty: parseFloat(rRow[5]) || 0,
          newQty:    (nq !== '' && nq !== null && nq !== undefined) ? parseFloat(nq) : null,
          diff:      parseFloat(rRow[7]) || 0,
          action:    String(rRow[8] || ''),
          note:      String(rRow[9] || ''),
          countTime: String(rRow[10] || '')
        });
      }
    }

    // เรียงจากใหม่ → เก่า
    history.sort(function(a, b) {
      return b.timestamp.localeCompare(a.timestamp);
    });

    return { success: true, history: history };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SETUP — สร้าง Sheet ที่เกี่ยวข้องกับ Inventory อัตโนมัติ (ถ้ายังไม่มี)
// ════════════════════════════════════════════════════════════════════════════

/**
 * setupInventorySheets()
 * สร้างทุก Sheet ที่ระบบ Inventory ต้องการ
 * - ถ้ามีอยู่แล้ว → ข้ามไป (ไม่ overwrite)
 * - ถ้ายังไม่มี → สร้างพร้อม Header และ Freeze row 1
 * คืนค่า { success, created: [...], skipped: [...] }
 */
function setupInventorySheets() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var created = [];
    var skipped = [];

    function _make(name, headers, bgColor, fontColor) {
      var sheet = ss.getSheetByName(name);
      if (sheet) { skipped.push(name); return; }
      sheet = ss.insertSheet(name);
      if (headers && headers.length) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length)
             .setFontWeight('bold')
             .setBackground(bgColor  || '#0f172a')
             .setFontColor(fontColor || '#ffffff');
        sheet.setFrozenRows(1);
      }
      created.push(name);
    }

    // ── FG: ชีต Log / Tracking ────────────────────────────────────────────
    _make('Inventory_Log_Daily', [
      'วันที่บันทึก','เวลา','จำนวน SKU',
      'สินค้าคงคลัง(เส้น)','น้ำหนักคงคลัง(กก.)',
      'รอส่งมอบ(เส้น)','น้ำหนักรอส่งมอบ(กก.)',
      'คงคลังสุทธิ(เส้น)','น้ำหนักสุทธิ(กก.)'
    ], '#0d9488');

    _make('Print Tag Log', [
      'Timestamp','PrintDate','SKU','Bundles','User','TotalPcs'
    ], '#0f172a');

    _make('Inventory_Blocking_Log', [
      'วันที่','จำนวน SKU','จำนวนเส้น (Lines)','น้ำหนักคำนวณ (kg)'
    ], '#7c3aed');

    _make('Daily Cycle Count FG', [
      'บันทึกเมื่อ','วันที่ Cycle','รหัสสินค้า','ชื่อสินค้า',
      'เส้นต่อมัด','กองที่1(มัด)','กองที่2(มัด)',
      'เศษที่1(เส้น)','เศษที่2(เส้น)','Hold(เส้น)',
      'นับจริง(เส้น)','ระบบ(เส้น)','ส่วนต่าง(เส้น)',
      'สถานะ','หมายเหตุ','กอง1_แหล่ง','กอง2_แหล่ง','เศษ1_แหล่ง','เศษ2_แหล่ง'
    ], '#0d9488');

    _make('ReCheck_Log', [
      'บันทึกเมื่อ','วันที่ Cycle','SKU','ชื่อสินค้า',
      'ยอด System','ยอดนับเดิม','ยอดนับใหม่','Diff',
      'Action','หมายเหตุ','เวลาที่นับ'
    ], '#b45309');

    _make('RootCause_Log', [
      'บันทึกเมื่อ','วันที่ Cycle','ประเภท','SKU','ชื่อสินค้า','สาเหตุ','หมายเหตุ'
    ], '#1e293b');

    _make('KPI Log', [
      'บันทึกเมื่อ','วันที่ Cycle','ประเภท',
      'SKU ทั้งหมด','เส้น/แถบ ทั้งหมด',
      'Production SKU','Production เส้น/แถบ',
      'Checker Error SKU','Checker Error เส้น/แถบ',
      'PRD Error SKU','PRD Error เส้น/แถบ',
      'Diff SKU','Diff เส้น/แถบ',
      'KPI Checker (%)','KPI PRD (%)'
    ], '#1e1b4b');

    _make('Audit_Log', [
      'Timestamp','User','Module','Action','Detail','Status'
    ], '#0f172a');

    _make('History_Log', [
      'บันทึกเมื่อ','วันที่ผลิต','เครื่อง','กะ','รหัสสินค้า','ชื่อสินค้า',
      'มัดตามแผน','มัดอื่นๆ','รวมพื้นที่(เส้น)','เวลาพื้นที่(ชม.)','สถานะ','เวลาเสร็จ'
    ], '#0f172a');

    // ── FG: ชีต Data (import จากภายนอก / ERP) ───────────────────────────
    _make('Inventory FG', [
      'รหัสสินค้า','สต็อค(เส้น)','น้ำหนัก(kg)','จอง(เส้น)','น้ำหนักจอง(kg)'
    ], '#065f46');

    _make('Production FG', [
      'วันที่ผลิต','รอบ/กะ','รหัสสินค้า','จำนวนเส้น'
    ], '#065f46');

    _make('Transection', [
      'วันที่','ประเภท','รหัสสินค้า','ชื่อสินค้า','จำนวน(เส้น)','น้ำหนัก(kg)',
      'Type','เลขที่เอกสาร','ลูกค้า/supplier'
    ], '#1e3a5f');

    _make('Transection FG', [
      'วันที่','ประเภท','รหัสสินค้า','ชื่อสินค้า','จำนวน(เส้น)','น้ำหนัก(kg)'
    ], '#1e3a5f');

    _make('FG report', [
      'วันที่ผลิต(yyyyMMdd)','รหัสสินค้า','ชื่อสินค้า','จำนวนเส้น'
    ], '#065f46');

    _make('Overdue Reservations', [
      'รหัสสินค้า','ชื่อสินค้า','จำนวนจอง(เส้น)','วันที่จอง','ลูกค้า','หมายเหตุ'
    ], '#7f1d1d');

    // ── FG: Master ────────────────────────────────────────────────────────
    _make('Product', [
      'รหัสสินค้า','ชื่อสินค้า','เส้นต่อมัด','น้ำหนักต่อเส้น(kg)'
    ], '#1e293b');

    _make('QC-Standard', [
      'รหัสสินค้า','ขนาด','W-Std(kg)','W-Min(kg)','W-Max(kg)'
    ], '#1e293b');

    // ── SEMI: ชีต Log / Tracking ─────────────────────────────────────────
    _make('Daily Cycle Count SEMI', [
      'บันทึกเมื่อ','วันที่Cycle','SEMI Code','ชื่อ SEMI',
      'FG1 Code','FG1 Name','FG2 Code','FG2 Name',
      'SYSTEM(แถว)','QTY FG1','QTY FG2','TOTAL','DIFF','สถานะ','หมายเหตุ'
    ], '#1e1b4b');

    _make('Transection SEMI', [
      'วันที่','ประเภท','SEMI SKU','ชื่อ SEMI','จำนวน(แถบ)'
    ], '#1e3a5f');

    // ── SEMI: Master / Data ───────────────────────────────────────────────
    _make('SEMI SOON FG', [
      'SEMI SKU','ชื่อ SEMI','FG1 SKU','FG1 Name','FG2 SKU','FG2 Name'
    ], '#4c1d95');

    _make('ON-HAND SEMI', [
      'SEMI SKU','ชื่อ SEMI','วันที่รับ','หมายเหตุ'
    ], '#4c1d95');

    var msg = '';
    if (created.length)  msg += 'สร้างใหม่ ' + created.length + ' ชีต: ' + created.join(', ') + '.  ';
    if (skipped.length)  msg += 'มีอยู่แล้ว (ข้าม) ' + skipped.length + ' ชีต.';
    if (!msg) msg = 'ไม่มีการเปลี่ยนแปลง';

    return { success: true, created: created, skipped: skipped, message: msg };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}