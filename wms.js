// ════════════════════════════════════════════════════════════════
//  WMS Backend — Google Apps Script
//  ไม่มี hardcode ใดๆ ทุก Spreadsheet ID / Sheet name รับเป็น parameter
// ════════════════════════════════════════════════════════════════

var ALLOWED_ACTIONS = [
  'getProductionPlanByDate',
  'getProductionBlock'
];

// ── Entry Point ──────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action) {
      var action   = e.parameter.action;
      var callback = e.parameter.callback || '';
      var args     = JSON.parse(e.parameter.args || '[]');

      function respond(obj) {
        var json = JSON.stringify(obj);
        var body = callback ? callback + '(' + json + ')' : json;
        var mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
        return ContentService.createTextOutput(body).setMimeType(mime);
      }

      if (ALLOWED_ACTIONS.indexOf(action) === -1) {
        return respond({ success: false, message: 'Unknown action: ' + action });
      }

      try {
        var fn = this[action];
        if (typeof fn !== 'function') {
          return respond({ success: false, message: action + ' not defined' });
        }
        var result = fn.apply(null, args);
        return respond(result !== undefined ? result : { success: true });
      } catch (err) {
        return respond({ success: false, message: err.toString() });
      }
    }

    return ContentService.createTextOutput('WMS GAS OK').setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ════════════════════════════════════════════════════════════════
//  getProductionPlanByDate
//  อ่านแผนผลิตประจำวันจาก Sheet "Dashboard"
//
//  params:
//    dateStr        {string}  'YYYY-MM-DD'
//    spreadsheetId  {string}  Spreadsheet ID ของไฟล์แผนผลิต
//
//  Sheet format (Dashboard):
//    col A  = (unused)
//    col B  = RefCode2
//    col C  = วันที่ (YYYYMMDD number)
//    col D  = เครื่อง  (C5 / P1 / P2 / P3 / P4)
//    col E  = กะ
//    col F  = ช่างคุม
//    col G  = รหัสสินค้า (SKU)
//    col H  = ชื่อสินค้า
//    col J  = ชม./วัน
//    col U  = เส้น/งาน
// ════════════════════════════════════════════════════════════════
function getProductionPlanByDate(dateStr, spreadsheetId) {
  if (!dateStr)       return { success: false, message: 'ไม่มี dateStr' };
  if (!spreadsheetId) return { success: false, message: 'ไม่มี spreadsheetId' };

  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Dashboard');
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet: Dashboard' };

  var targetDate = parseInt(dateStr.replace(/-/g, ''), 10); // YYYYMMDD

  var MACHINES = { 'C5': 1, 'P1': 1, 'P2': 1, 'P3': 1, 'P4': 1 };
  var data = sheet.getDataRange().getValues();

  var machinesMap  = {};
  var machineHours = {};

  for (var r = 1; r < data.length; r++) {
    var row     = data[r];
    var colC    = parseInt(row[2] || 0, 10);   // col C = วันที่ YYYYMMDD
    var machine = String(row[3] || '').trim().toUpperCase();  // col D = เครื่อง
    var sku     = String(row[6] || '').trim();  // col G = รหัสสินค้า
    var hours   = parseFloat(row[9]  || 0);    // col J = ชม./วัน
    var lines   = parseFloat(row[20] || 0);    // col U = เส้น/งาน

    if (colC !== targetDate) continue;
    if (!MACHINES[machine])  continue;

    if (hours > 0 && !machineHours[machine]) machineHours[machine] = hours;
    if (!sku || isNaN(lines) || lines <= 0)  continue;

    if (!machinesMap[machine])      machinesMap[machine] = {};
    if (!machinesMap[machine][sku]) machinesMap[machine][sku] = 0;
    machinesMap[machine][sku] += lines;
  }

  var machines = Object.keys(machinesMap).map(function(machineId) {
    return {
      machineId: machineId,
      products: Object.keys(machinesMap[machineId]).map(function(sku) {
        var daily = {};
        daily[dateStr] = machinesMap[machineId][sku];
        return { sku: sku, daily: daily };
      })
    };
  });

  return { success: true, machines: machines, hours: machineHours, dateStr: dateStr };
}

// ════════════════════════════════════════════════════════════════
//  getProductionBlock
//  อ่านแผนการผลิตรายเดือนจาก Sheet ชื่อเดือน (เช่น "กรกฎาคม 69")
//
//  params:
//    monthKey       {string}  'YYYY-MM'  เช่น '2026-07'
//    spreadsheetId  {string}  Spreadsheet ID ของไฟล์ Production Block
//    sheetName      {string}  ชื่อ Sheet เช่น 'กรกฎาคม 69'
//
//  Sheet format:
//    col A  = เครื่อง  (C5 / P1 / P2 / P3 / P4) — ถ้าว่างให้ใช้เครื่องก่อนหน้า
//    col B  = Product Code (SKU)
//    col C  = ขาด/ส.
//    col D  = นน.เฉลี่ย
//    col E  = Speed/mins
//    col F  = Productname
//    col G+ = วันที่ (Date header), value = จำนวนเส้น
// ════════════════════════════════════════════════════════════════
function getProductionBlock(monthKey, spreadsheetId, sheetName) {
  if (!spreadsheetId) return { success: false, message: 'ไม่มี spreadsheetId' };
  if (!sheetName)     return { success: false, message: 'ไม่มี sheetName' };

  var ss    = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheets().filter(function(s) {
    return s.getName().trim() === sheetName.trim();
  })[0] || null;
  if (!sheet) return { success: false, message: 'ไม่พบ Sheet: ' + sheetName };

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, message: 'Sheet ว่างเปล่า' };

  var MACHINES = { 'C5': 1, 'P1': 1, 'P2': 1, 'P3': 1, 'P4': 1 };

  // หา date columns จาก header row (col 6 ขึ้นไป)
  var headerRow = data[0];
  var dateCols  = {};
  for (var c = 6; c < headerRow.length; c++) {
    var hv = headerRow[c];
    if (!hv) continue;
    var ds = '';
    if (hv instanceof Date) {
      ds = Utilities.formatDate(hv, 'GMT+7', 'yyyy-MM-dd');
    } else {
      var serial = parseFloat(hv);
      if (!isNaN(serial) && serial > 40000) {
        ds = Utilities.formatDate(new Date((serial - 25569) * 86400000), 'GMT+7', 'yyyy-MM-dd');
      }
    }
    if (ds && ds.slice(0, 7) === monthKey) dateCols[c] = ds;
  }

  var machinesMap  = {};
  var currentMachine = '';

  for (var r = 1; r < data.length; r++) {
    var row     = data[r];
    var machineCell = String(row[0] || '').trim().toUpperCase();
    var sku         = String(row[1] || '').trim();

    // ถ้ามีค่าในคอลัมน์ A ให้อัปเดต current machine
    if (machineCell && MACHINES[machineCell]) currentMachine = machineCell;
    if (!currentMachine || !MACHINES[currentMachine]) continue;
    if (!sku) continue;

    Object.keys(dateCols).forEach(function(c) {
      var lines = parseFloat(row[parseInt(c)]);
      if (isNaN(lines) || lines <= 0) return;
      var ds = dateCols[c];
      if (!machinesMap[currentMachine])            machinesMap[currentMachine] = {};
      if (!machinesMap[currentMachine][sku])       machinesMap[currentMachine][sku] = {};
      machinesMap[currentMachine][sku][ds] = (machinesMap[currentMachine][sku][ds] || 0) + lines;
    });
  }

  var machines = Object.keys(machinesMap).map(function(machineId) {
    return {
      machineId: machineId,
      products: Object.keys(machinesMap[machineId]).map(function(sku) {
        return { sku: sku, daily: machinesMap[machineId][sku] };
      })
    };
  });

  return { success: true, machines: machines, monthKey: monthKey };
}

