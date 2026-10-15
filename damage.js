/* ═══════════════════════════════════════════════════════════════════════════
   ระบบแจ้งสินค้าเสียหายและติดตามความรับผิดชอบ  (Product Damage Management)
   ───────────────────────────────────────────────────────────────────────────
   โหลดจาก index.html ด้วย <script src="damage.js">  ใช้ window._sb (Supabase) ตัวเดิมของ WMS
   ตารางอยู่ใน supabase_damage_cases.sql (ขึ้นต้น dmg_)  — ต้องรันไฟล์นั้นก่อนระบบถึงจะใช้งานได้

   หลักการที่ยึด (ดู README: DAMAGE_CASES_SETUP.md):
   • ประเภทที่ผู้แจ้งเลือก ≠ ข้อสรุปหลังสอบสวน — ระบบไม่ชี้ว่าใครผิดจากประเภทเหตุการณ์
   • ห้ามแสดงว่าส่งอีเมลสำเร็จ ถ้า Email Provider ยังไม่ยืนยัน
   • ช่องจำเป็นที่ขาด ต้องแจ้ง ไม่เติมค่าแทนเงียบๆ
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DMG = window.DMG = window.DMG || {};

  /* ─────────────────────────── ค่าคงที่ ─────────────────────────── */
  // สีสถานะยึดตามที่ใช้ทั้งโปรแกรม: น้ำเงิน=รอพิจารณา · เหลือง=กำลังดำเนินการ · เขียว=เสร็จ · แดง=เร่งด่วน/เกินกำหนด · เทา=ร่าง
  var STATUS = {
    'Draft':                { th: 'ร่าง',                  cls: 'gray'  },
    'Submitted':            { th: 'ส่งเรื่องแล้ว',          cls: 'blue'  },
    'New':                  { th: 'รับเรื่องใหม่',          cls: 'blue'  },
    'Under Review':         { th: 'ตรวจสอบข้อมูล',          cls: 'blue'  },
    'Awaiting Information': { th: 'รอข้อมูลเพิ่มเติม',      cls: 'amber' },
    'Assigned':             { th: 'มอบหมายแล้ว',            cls: 'amber' },
    'Investigating':        { th: 'อยู่ระหว่างสอบสวน',      cls: 'amber' },
    'Pending Approval':     { th: 'รออนุมัติแนวทางแก้ไข',   cls: 'blue'  },
    'Corrective Action':    { th: 'ดำเนินการแก้ไข',         cls: 'amber' },
    'Verification':         { th: 'รอตรวจผลการแก้ไข',       cls: 'blue'  },
    'Closed':               { th: 'ปิดเคส',                 cls: 'green' },
    'Reopened':             { th: 'เปิดเคสอีกครั้ง',        cls: 'amber' }
  };
  var STATUS_ORDER = ['Draft','Submitted','New','Under Review','Awaiting Information','Assigned',
    'Investigating','Pending Approval','Corrective Action','Verification','Closed','Reopened'];

  var PRIORITY = {
    low:    { th: 'ต่ำ',     cls: 'gray'  },
    normal: { th: 'ปกติ',    cls: 'blue'  },
    high:   { th: 'สูง',     cls: 'amber' },
    urgent: { th: 'เร่งด่วน', cls: 'red'   }
  };

  var INCIDENT_TYPES = [
    { v: 'production',        th: 'ความเสียหายจากฝ่ายผลิต' },
    { v: 'qc_escape',         th: 'สินค้ามีตำหนิหรือหลุด QC' },
    { v: 'warehouse_storage', th: 'ความเสียหายจากการรับเข้าและจัดเก็บในคลังสินค้า' },
    { v: 'pick_pack',         th: 'ความเสียหายจากการหยิบสินค้าและแพ็กสินค้า' },
    { v: 'loading',           th: 'ความเสียหายจากการโหลดสินค้า' },
    { v: 'transport',         th: 'ความเสียหายระหว่างขนส่ง' },
    { v: 'customer_found',    th: 'ความเสียหายที่พบจากลูกค้าหลังส่งมอบ' },
    { v: 'unknown',           th: 'ยังไม่ทราบสาเหตุ / ต้องสอบสวนเพิ่มเติม' },
    { v: 'other',             th: 'อื่น ๆ' }
  ];

  // ข้อสงสัยของผู้แจ้ง — ต้องติดป้ายว่าเป็นข้อสงสัย ไม่ใช่ข้อสรุป
  var SUSPECTED_STAGES = ['ผลิต','QC','รับเข้า / จัดเก็บ','หยิบ / แพ็ก','โหลดสินค้า','ขนส่ง','ลูกค้า / หลังส่งมอบ','ไม่ทราบ'];

  var CONCLUSIONS = [
    { v: 'production',       th: 'เกิดจากฝ่ายผลิต' },
    { v: 'qc',               th: 'เกิดจากกระบวนการ QC' },
    { v: 'warehouse',        th: 'เกิดจากคลังสินค้า' },
    { v: 'transport',        th: 'เกิดจากขนส่ง' },
    { v: 'multiple',         th: 'หลายฝ่ายเกี่ยวข้อง' },
    { v: 'process_standard', th: 'กระบวนการหรือมาตรฐานไม่เหมาะสม' },
    { v: 'inconclusive',     th: 'ยังสรุปไม่ได้ / หลักฐานไม่เพียงพอ' },
    { v: 'other',            th: 'ปัจจัยอื่น ๆ' }
  ];

  var PROCESS_STEPS = ['ผลิต','ตรวจ QC','รับเข้าคลัง','จัดเก็บ','หยิบสินค้า','แพ็กสินค้า','โหลดสินค้า','ขนส่ง','ส่งมอบลูกค้า','อื่น ๆ'];
  var ROOT_CAUSE_CATS = ['คน (Man)','เครื่องจักร (Machine)','วัสดุ (Material)','วิธีการ / ขั้นตอน (Method)',
    'สภาพแวดล้อม (Environment)','การวัด / การตรวจ (Measurement)','การจัดการ / การขนย้าย','อื่น ๆ'];
  var ATTACH_TYPES = { overview: 'ภาพรวมสินค้า', closeup: 'ภาพตำหนิระยะใกล้', document: 'เอกสาร',
    investigation: 'หลักฐานสอบสวน', capa: 'หลักฐานการแก้ไข', email: 'แนบอีเมล' };
  var CAPA_STATUS = { open: 'รอดำเนินการ', in_progress: 'กำลังทำ', done: 'ทำเสร็จ รอตรวจผล', verified: 'ตรวจผลแล้ว', cancelled: 'ยกเลิก' };
  var CAPA_CLS = { open: 'blue', in_progress: 'amber', done: 'blue', verified: 'green', cancelled: 'gray' };
  var ACTION_LABELS = {
    created_draft: 'สร้างร่าง', submitted: 'ส่งเรื่อง', status_changed: 'เปลี่ยนสถานะ', assigned: 'มอบหมายผู้รับผิดชอบ',
    assignment_done: 'ผู้รับมอบหมายทำเสร็จ', assignment_cancelled: 'ยกเลิกการมอบหมาย', assignment_submitted: 'ส่งผลตรวจสอบ',
    attachment_added: 'เพิ่มรูป/เอกสาร', attachment_removed: 'ลบรูป/เอกสาร', investigation_saved: 'บันทึกผลสอบสวน',
    investigation_submitted: 'ส่งผลสอบสวน', conclusion_saved: 'บันทึกข้อสรุป', conclusion_approved: 'อนุมัติข้อสรุป',
    priority_changed: 'เปลี่ยนความเร่งด่วน', capa_added: 'เพิ่มมาตรการแก้ไข', capa_in_progress: 'เริ่มดำเนินมาตรการ',
    capa_done: 'ทำมาตรการเสร็จ', capa_verified: 'ตรวจผลมาตรการแล้ว', capa_cancelled: 'ยกเลิกมาตรการ',
    info_requested: 'ขอข้อมูลเพิ่มเติม', info_provided: 'ส่งข้อมูลเพิ่มเติม', result_disputed: 'โต้แย้งผล',
    comment_added: 'ความคิดเห็น', email_sent: 'ส่งอีเมลสำเร็จ', email_failed: 'ส่งอีเมลไม่สำเร็จ', case_deleted: 'ลบเคส (soft delete)'
  };
  var EMAIL_TYPES = {
    new_case:        'แจ้งรับเคสใหม่',
    request_review:  'แจ้งหัวหน้าแผนกให้ตรวจสอบ',
    request_info:    'แจ้งขอข้อมูลเพิ่มเติมจากผู้แจ้ง',
    reassign:        'แจ้งเปลี่ยนผู้รับผิดชอบ',
    due_soon:        'แจ้งเตือนใกล้ครบกำหนด',
    overdue:         'แจ้งเตือนเคสเกินกำหนด',
    result:          'แจ้งผลการสอบสวน',
    request_approve: 'แจ้งขออนุมัติมาตรการแก้ไข',
    closed:          'แจ้งปิดเคส'
  };

  /* ─────────────────────────── ตัวช่วยทั่วไป ─────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function sb() { return window._sb; }
  function toast(msg, isErr) { if (typeof window.showToast === 'function') window.showToast(msg, !!isErr); else alert(msg); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function nf(n, d) { return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: d == null ? 0 : d }); }
  // เวลาไทยเสมอ (เครื่องผู้ใช้อาจตั้งโซนเวลาอื่น และเซิร์ฟเวอร์รัน UTC)
  function fmtDT(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit',
        year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso); }
  }
  function fmtD(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return String(iso); }
  }
  // <input type=datetime-local> เป็นเวลาท้องถิ่นไม่มีโซน → ติด +07:00 เองกันเลื่อนวัน
  function bkkLocalToISO(v) { return v ? (v.length === 16 ? v + ':00' : v) + '+07:00' : null; }
  function isoToBkkLocal(iso) {
    if (!iso) return '';
    var d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }
  function nowBkkLocal() { return isoToBkkLocal(new Date().toISOString()); }
  function dateToISOStart(d) { return d ? d + 'T00:00:00+07:00' : null; }
  function dateToISOEnd(d) { return d ? d + 'T23:59:59+07:00' : null; }
  function isOverdue(c) { return !!(c && c.due_at && c.status !== 'Closed' && c.status !== 'Draft' && new Date(c.due_at) < new Date()); }

  function badge(text, cls) { return '<span class="dmg-badge dmg-b-' + (cls || 'gray') + '">' + esc(text) + '</span>'; }
  function statusBadge(s) { var m = STATUS[s] || { th: s, cls: 'gray' }; return badge(m.th, m.cls); }
  function priorityBadge(p) { var m = PRIORITY[p] || { th: p || '—', cls: 'gray' }; return badge(m.th, m.cls); }
  function incidentLabel(v) { var m = INCIDENT_TYPES.filter(function (x) { return x.v === v; })[0]; return m ? m.th : (v || '—'); }
  function conclusionLabel(v) { var m = CONCLUSIONS.filter(function (x) { return x.v === v; })[0]; return m ? m.th : (v || '—'); }

  // ดึงข้อมูลทั้งหมดทีละหน้า — PostgREST ตัดที่ 1,000 แถวแบบเงียบ จึงห้ามเชื่อ query เดียว
  // และห้ามกลืน error (ถ้าหน้าไหนพัง ต้องพังให้เห็น ไม่ใช่ได้ข้อมูลครึ่งเดียวแล้วนึกว่าครบ)
  function fetchAll(makeQuery) {
    var PAGE = 1000, all = [];
    function step(from) {
      return makeQuery().range(from, from + PAGE - 1).then(function (r) {
        if (r.error) throw new Error(r.error.message || 'query failed');
        var rows = r.data || [];
        all = all.concat(rows);
        if (rows.length === PAGE) return step(from + PAGE);
        return all;
      });
    }
    return step(0);
  }

  /* ─────────────────────────── ค่าตั้งระบบ (app_config) ─────────────────────────── */
  var CFG = { maxPhotos: 10, maxPhotoMb: 10, minPhotos: 1, dueDays: 7, company: 'บริษัท ที.แสตนดาร์ด สตีล จำกัด' };
  function loadConfig() {
    return sb().from('app_config').select('key,value').in('key',
      ['dmg_max_photos', 'dmg_max_photo_mb', 'dmg_min_photos', 'dmg_due_days', 'dmg_company_name']).then(function (r) {
      if (r.error) return CFG;                     // ใช้ค่าตั้งต้น (ไม่ใช่ข้อมูลธุรกิจ จึงไม่เป็นไรที่ fallback)
      (r.data || []).forEach(function (row) {
        var n = parseInt(row.value, 10);
        if (row.key === 'dmg_max_photos' && n > 0) CFG.maxPhotos = n;
        if (row.key === 'dmg_max_photo_mb' && n > 0) CFG.maxPhotoMb = n;
        if (row.key === 'dmg_min_photos' && n >= 0) CFG.minPhotos = n;
        if (row.key === 'dmg_due_days' && n > 0) CFG.dueDays = n;
        if (row.key === 'dmg_company_name' && row.value) CFG.company = row.value;
      });
      return CFG;
    });
  }

  /* ─────────────────────────── ตารางพร้อมใช้ไหม ─────────────────────────── */
  // เคยพลาดมาแล้ว: นับแถวแบบ head:true ได้ "ok" แม้ตารางไม่มี → ต้องดึงข้อมูลจริง 1 แถวเท่านั้น
  var _ready = null;
  function checkReady(force) {
    if (_ready && !force) return _ready;
    _ready = sb().from('dmg_cases').select('id').limit(1).then(function (r) {
      if (!r.error) return { ok: true };
      var code = r.error.code || '';
      var missing = code === 'PGRST205' || code === '42P01' || /could not find the table|does not exist/i.test(r.error.message || '');
      return { ok: false, missing: missing, message: r.error.message || '' };
    }).catch(function (e) { return { ok: false, missing: false, message: String(e && e.message || e) }; });
    return _ready;
  }
  function setupPanel(st, forStaff) {
    if (forStaff) {
      return '<div class="dmg-empty"><div class="dmg-empty-ic">🛠️</div><b>ระบบแจ้งสินค้าเสียหายยังไม่เปิดใช้งาน</b>'
        + '<p>กรุณาแจ้งผู้ดูแลระบบให้เปิดใช้งานก่อน</p></div>';
    }
    return '<div class="dmg-card dmg-setup"><h3>ยังตั้งค่าฐานข้อมูลไม่ครบ</h3>'
      + (st.missing
        ? '<p>ไม่พบตาราง <code>dmg_cases</code> ในฐานข้อมูล — ต้องรันไฟล์ migration ก่อน</p>'
        : '<p>เชื่อมต่อตารางไม่สำเร็จ: <code>' + esc(st.message) + '</code></p>')
      + '<ol><li>เปิด Supabase → SQL Editor ของโปรเจกต์ WMS</li>'
      + '<li>เปิดไฟล์ <code>supabase_damage_cases.sql</code> วางทั้งไฟล์แล้วกด Run</li>'
      + '<li>ดูผลตารางสุดท้ายที่โชว์ (ต้องได้ 12 ตาราง · 24 ลำดับสถานะ · 7 แผนก · 10 triggers)</li>'
      + '<li>กลับมากด <b>ตรวจใหม่</b></li></ol>'
      + '<button class="dmg-btn dmg-btn-primary" onclick="DMG.recheck()">ตรวจใหม่</button>'
      + '<p class="dmg-muted">ข้อมูลตัวอย่าง (ไม่บังคับ): ไฟล์ <code>supabase_damage_cases_seed_demo.sql</code></p></div>';
  }
  DMG.recheck = function () {
    // ปุ่ม "ตรวจใหม่" โผล่ได้ที่เดียวคือในหน้าศูนย์รับเรื่อง (ฝั่งหน้างานไม่มีปุ่มนี้ ดู setupPanel)
    _ready = null; staffCache = null;
    DMG.initCases();
  };

  /* ─────────────────────────── ผู้ใช้ปัจจุบัน + บทบาท ─────────────────────────── */
  var staffCache = null;   // แถว dmg_staff ของทั้งระบบ (ใช้เป็น dropdown ด้วย)
  function me() {
    var u = window._cu || {};
    return { username: u.username || u.name || '', name: u.name || u.username || '', isAdmin: !!u.isAdmin,
      isWhStaff: u.role === 'WH Staff' || !!u._whStaffId, team: u._whTeam || '', perms: u.perms || [] };
  }
  function loadStaff(force) {
    if (staffCache && !force) return Promise.resolve(staffCache);
    return sb().from('dmg_staff').select('*').order('display_name').then(function (r) {
      if (r.error) throw new Error(r.error.message);
      staffCache = r.data || [];
      return staffCache;
    });
  }
  // บทบาทในโมดูลนี้: admin | coordinator | investigator | viewer | reporter
  // admin = ผู้ดูแล WMS · ที่เหลือมาจาก dmg_staff · ไม่มีแถวใน dmg_staff แต่ได้สิทธิ์หน้าศูนย์รับเรื่อง = coordinator
  function myRole() {
    var u = me();
    if (u.isAdmin) return Promise.resolve({ role: 'admin', canApprove: true, dept: null, email: '' });
    return loadStaff().then(function (rows) {
      var row = rows.filter(function (x) { return x.username === u.username && x.is_active; })[0];
      if (row) return { role: row.role, canApprove: !!row.can_approve, dept: row.department_code, email: row.email || '' };
      if (u.perms.indexOf('damage-cases') >= 0) return { role: 'coordinator', canApprove: false, dept: null, email: '' };
      return { role: 'reporter', canApprove: false, dept: u.isWhStaff ? 'WH' : null, email: '' };
    });
  }
  var DEPTS = null;
  function loadDepts(force) {
    if (DEPTS && !force) return Promise.resolve(DEPTS);
    return sb().from('dmg_departments').select('*').order('sort_order').then(function (r) {
      if (r.error) throw new Error(r.error.message);
      DEPTS = r.data || []; return DEPTS;
    });
  }
  function deptName(code) {
    var d = (DEPTS || []).filter(function (x) { return x.code === code; })[0];
    return d ? d.name : (code || '—');
  }
  function deptOptions(sel, withBlank) {
    return (withBlank ? '<option value="">— เลือกแผนก —</option>' : '') + (DEPTS || []).filter(function (d) { return d.is_active; })
      .map(function (d) { return '<option value="' + esc(d.code) + '"' + (d.code === sel ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('');
  }

  // ส่งออกให้ส่วนอื่นของไฟล์ใช้
  DMG._ = { STATUS: STATUS, STATUS_ORDER: STATUS_ORDER, PRIORITY: PRIORITY, INCIDENT_TYPES: INCIDENT_TYPES,
    SUSPECTED_STAGES: SUSPECTED_STAGES, CONCLUSIONS: CONCLUSIONS, PROCESS_STEPS: PROCESS_STEPS,
    ROOT_CAUSE_CATS: ROOT_CAUSE_CATS, ATTACH_TYPES: ATTACH_TYPES, CAPA_STATUS: CAPA_STATUS, CAPA_CLS: CAPA_CLS,
    ACTION_LABELS: ACTION_LABELS, EMAIL_TYPES: EMAIL_TYPES, CFG: CFG,
    esc: esc, $: $, sb: sb, toast: toast, uuid: uuid, nf: nf, fmtDT: fmtDT, fmtD: fmtD,
    bkkLocalToISO: bkkLocalToISO, isoToBkkLocal: isoToBkkLocal, nowBkkLocal: nowBkkLocal,
    dateToISOStart: dateToISOStart, dateToISOEnd: dateToISOEnd, isOverdue: isOverdue,
    badge: badge, statusBadge: statusBadge, priorityBadge: priorityBadge, incidentLabel: incidentLabel,
    conclusionLabel: conclusionLabel, fetchAll: fetchAll, loadConfig: loadConfig, checkReady: checkReady,
    setupPanel: setupPanel, me: me, myRole: myRole, loadStaff: loadStaff, loadDepts: loadDepts,
    deptName: deptName, deptOptions: deptOptions, getStaff: function () { return staffCache || []; },
    getDepts: function () { return DEPTS || []; }, resetStaff: function () { staffCache = null; },
    resetDepts: function () { DEPTS = null; } };


  /* ═══════════════════════════ CSS (ฉีดครั้งเดียว) ═══════════════════════════ */
  function injectCss() {
    if ($('dmg-style')) return;
    var s = document.createElement('style');
    s.id = 'dmg-style';
    s.textContent = [
      '.dmg-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}',
      '.dmg-b-gray{background:#f1f5f9;color:#475569}', '.dmg-b-blue{background:#dbeafe;color:#1d4ed8}',
      '.dmg-b-amber{background:#fef3c7;color:#92400e}', '.dmg-b-green{background:#d1fae5;color:#065f46}',
      '.dmg-b-red{background:#fee2e2;color:#991b1b}',
      '.dmg-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px}',
      '.dmg-setup{max-width:560px;margin:40px auto;text-align:left}',
      '.dmg-setup h3{font-weight:900;font-size:16px;margin-bottom:8px}',
      '.dmg-setup code{background:#f1f5f9;padding:1px 6px;border-radius:5px;font-size:12px}',
      '.dmg-setup ol{margin:10px 0 14px 20px;font-size:13px;line-height:1.9}',
      '.dmg-muted{color:#94a3b8;font-size:12px;margin-top:10px}',
      '.dmg-btn{border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:800;cursor:pointer;transition:.12s}',
      '.dmg-btn:hover{background:#f8fafc}', '.dmg-btn-primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}',
      '.dmg-btn-primary:hover{background:#1e40af}', '.dmg-btn-danger{background:#dc2626;border-color:#dc2626;color:#fff}',
      '.dmg-btn-danger:hover{background:#b91c1c}', '.dmg-btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}',
      '.dmg-btn:disabled{opacity:.5;cursor:not-allowed}',
      '.dmg-empty{text-align:center;padding:60px 20px;color:#94a3b8}', '.dmg-empty-ic{font-size:40px;margin-bottom:10px}',
      '.dmg-field{margin-bottom:14px}', '.dmg-label{display:block;font-size:12px;font-weight:800;color:#475569;margin-bottom:5px}',
      '.dmg-label .req{color:#dc2626}',
      '.dmg-input,.dmg-select,.dmg-textarea{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;box-sizing:border-box;background:#fff}',
      '.dmg-input:focus,.dmg-select:focus,.dmg-textarea:focus{outline:none;border-color:#1d4ed8}',
      '.dmg-textarea{resize:vertical;min-height:70px}', '.dmg-err{color:#dc2626;font-size:11.5px;margin-top:4px;font-weight:700}',
      '.dmg-err-border{border-color:#dc2626 !important}',
      '.dmg-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}', '.dmg-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}',
      '@media(max-width:640px){.dmg-row2,.dmg-row3{grid-template-columns:1fr}}',
      '.dmg-section-title{font-size:13px;font-weight:900;color:#1e293b;margin:18px 0 10px;padding-top:14px;border-top:1px solid #f1f5f9;display:flex;align-items:center;gap:8px}',
      '.dmg-section-title:first-child{border-top:none;padding-top:0;margin-top:0}',
      '.dmg-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin-top:10px}',
      '.dmg-photo-tile{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;background:#f8fafc}',
      '.dmg-photo-tile img{width:100%;height:100%;object-fit:cover}',
      '.dmg-photo-tile .dmg-photo-del{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.dmg-photo-tile .dmg-photo-up{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.85);font-size:11px;font-weight:800;color:#64748b}',
      '.dmg-photo-add{aspect-ratio:1;border:2px dashed #cbd5e1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:#94a3b8;font-size:11px;font-weight:800;background:#f8fafc}',
      '.dmg-photo-add:hover{border-color:#1d4ed8;color:#1d4ed8}',
      '.dmg-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px}',
      '.dmg-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px}',
      '.dmg-kpi .n{font-size:24px;font-weight:900;color:#1e293b;line-height:1.1}', '.dmg-kpi .l{font-size:11px;color:#94a3b8;font-weight:700;margin-top:4px}',
      '.dmg-kpi.alert .n{color:#dc2626}',
      '.dmg-filterbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}',
      '.dmg-filterbar input,.dmg-filterbar select{border:1.5px solid #e2e8f0;border-radius:9px;padding:7px 10px;font-size:13px}',
      '.dmg-table-wrap{overflow-x:auto;border:1px solid #e2e8f0;border-radius:14px}',
      '.dmg-table{width:100%;border-collapse:collapse;font-size:13px;min-width:900px}',
      '.dmg-table th{background:#f8fafc;color:#64748b;font-weight:800;font-size:11px;text-align:left;padding:10px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap}',
      '.dmg-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}',
      '.dmg-table tr:hover td{background:#f8fafc;cursor:pointer}', '.dmg-table tr.dmg-overdue td{background:#fef2f2}',
      '.dmg-thumb{width:36px;height:36px;border-radius:8px;object-fit:cover;background:#f1f5f9}',
      '.dmg-pagin{display:flex;justify-content:center;gap:6px;margin-top:14px}',
      '.dmg-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9990;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow-y:auto}',
      '.dmg-modal{background:#fff;border-radius:18px;width:100%;max-width:880px;margin:auto;overflow:hidden}',
      '.dmg-modal-hd{background:#0f172a;color:#fff;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.dmg-modal-hd .dmg-x{background:rgba(255,255,255,.1);border:none;color:#fff;width:30px;height:30px;border-radius:9px;cursor:pointer;font-size:14px}',
      '.dmg-modal-body{padding:20px 22px;max-height:76vh;overflow-y:auto}',
      '.dmg-tabs{display:flex;gap:4px;border-bottom:1px solid #e2e8f0;margin-bottom:16px;overflow-x:auto}',
      '.dmg-tab{padding:9px 14px;font-size:13px;font-weight:800;color:#94a3b8;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}',
      '.dmg-tab.on{color:#1d4ed8;border-color:#1d4ed8}',
      '.dmg-kv{display:grid;grid-template-columns:150px 1fr;gap:8px 14px;font-size:13px;margin-bottom:6px}',
      '.dmg-kv b{color:#64748b;font-weight:700}',
      '.dmg-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-top:8px}',
      '.dmg-gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;cursor:pointer;border:1px solid #e2e8f0}',
      '.dmg-timeline{position:relative;padding-left:22px}',
      '.dmg-timeline::before{content:"";position:absolute;left:6px;top:4px;bottom:4px;width:2px;background:#e2e8f0}',
      '.dmg-tl-item{position:relative;padding-bottom:16px}',
      '.dmg-tl-item::before{content:"";position:absolute;left:-22px;top:3px;width:10px;height:10px;border-radius:50%;background:#1d4ed8;border:2px solid #fff;box-shadow:0 0 0 1px #e2e8f0}',
      '.dmg-tl-head{font-size:13px;font-weight:800;color:#1e293b}', '.dmg-tl-meta{font-size:11px;color:#94a3b8;margin-top:1px}',
      '.dmg-tl-body{font-size:12.5px;color:#475569;margin-top:3px;white-space:pre-wrap}',
      '.dmg-capa-item{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px}',
      '.dmg-chip-group{display:flex;flex-wrap:wrap;gap:6px}',
      '.dmg-chip{border:1.5px solid #e2e8f0;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;color:#475569}',
      '.dmg-chip.on{background:#1d4ed8;border-color:#1d4ed8;color:#fff}',
      '.dmg-demo-tag{background:#fef3c7;color:#92400e;font-size:10px;font-weight:900;padding:1px 7px;border-radius:999px;margin-left:6px}',
      '.dmg-fab{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:#1d4ed8;color:#fff;border:none;font-size:22px;box-shadow:0 6px 20px rgba(29,78,216,.4);cursor:pointer;z-index:10001}', // #wh-screen (หน้าจอทีมโหลด) ใช้ z-index:10000 ต้องสูงกว่านั้น ไม่งั้นโดนบังมิด
      '#dmg-report-screen{position:fixed;inset:0;background:#f1f5f9;z-index:10050;display:none;flex-direction:column;overflow-y:auto}',
      '#dmg-report-screen.active{display:flex}',
      '.dmg-rpt-hd{background:#0f172a;color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:5}',
      '.dmg-rpt-body{padding:16px;max-width:640px;margin:0 auto;width:100%;box-sizing:border-box;padding-bottom:40px}',
      '.dmg-rpt-success{text-align:center;padding:50px 20px}',
      '.dmg-rpt-success .ic{font-size:56px;margin-bottom:14px}',
      '.dmg-rpt-success .num{font-size:22px;font-weight:900;color:#1d4ed8;font-family:monospace;margin:10px 0}'
    ].join('\n');
    document.head.appendChild(s);
  }
  DMG._.injectCss = injectCss;


  /* ═══════════════════════════ หน้าจอที่ 1: ฟอร์มแจ้งสินค้าเสียหาย (มือถือ) ═══════════════════════════ */
  var _rptPhotos = [];              // [{file, blob, url(preview), uploadedUrl|null, uploading}]
  var _rptCloseupPhotos = [];
  var _rptDraftTimer = null;

  function photoTileHtml(p, idx, listName) {
    var preview = p.url;
    return '<div class="dmg-photo-tile">'
      + '<img src="' + preview + '" alt="">'
      + (p.uploading ? '<div class="dmg-photo-up"><i class="fas fa-spinner fa-spin"></i></div>' : '')
      + '<button type="button" class="dmg-photo-del" onclick="DMG.removePhoto(\'' + listName + '\',' + idx + ')" aria-label="ลบรูป"><i class="fas fa-times"></i></button>'
      + '</div>';
  }
  function photoGridHtml(list, listName, max) {
    var tiles = list.map(function (p, i) { return photoTileHtml(p, i, listName); }).join('');
    var addBtn = list.length < max
      ? '<label class="dmg-photo-add"><i class="fas fa-camera" style="font-size:20px"></i>เพิ่มรูป<input type="file" accept="image/*" multiple capture="environment" style="display:none" onchange="DMG.addPhotos(\'' + listName + '\', this.files)"></label>'
      : '';
    return '<div class="dmg-photo-grid">' + tiles + addBtn + '</div>'
      + '<div class="dmg-muted">' + list.length + ' / ' + max + ' รูป — รองรับ JPG, PNG, WebP</div>';
  }
  DMG.addPhotos = function (listName, files) {
    var list = listName === 'closeup' ? _rptCloseupPhotos : _rptPhotos;
    var max = DMG._.CFG.maxPhotos;
    var maxBytes = DMG._.CFG.maxPhotoMb * 1024 * 1024;
    var rejected = [];
    for (var i = 0; i < files.length && list.length < max; i++) {
      var f = files[i];
      if (!/^image\/(jpeg|png|webp|jpg)$/i.test(f.type)) { rejected.push(f.name + ' (ไม่ใช่ไฟล์รูปที่รองรับ)'); continue; }
      if (f.size > maxBytes) { rejected.push(f.name + ' (ไฟล์ใหญ่เกิน ' + DMG._.CFG.maxPhotoMb + ' MB)'); continue; }
      list.push({ file: f, url: URL.createObjectURL(f) });
    }
    if (files.length > 0 && list.length >= max) rejected.push('แนบได้สูงสุด ' + max + ' รูปเท่านั้น');
    if (rejected.length) DMG._.toast('บางไฟล์ไม่ถูกเพิ่ม: ' + rejected.join(', '), true);
    renderReportPhotos();
  };
  DMG.removePhoto = function (listName, idx) {
    var list = listName === 'closeup' ? _rptCloseupPhotos : _rptPhotos;
    list.splice(idx, 1);
    renderReportPhotos();
  };
  function renderReportPhotos() {
    var a = $('dmg-rpt-photos-overview'), b = $('dmg-rpt-photos-closeup');
    if (a) a.innerHTML = photoGridHtml(_rptPhotos, 'overview', Math.max(1, Math.floor(DMG._.CFG.maxPhotos / 2)));
    if (b) b.innerHTML = photoGridHtml(_rptCloseupPhotos, 'closeup', Math.max(1, Math.ceil(DMG._.CFG.maxPhotos / 2)));
  }

  function reportFieldErr(id, msg) {
    var el = $(id);
    if (!el) return;
    el.classList.add('dmg-err-border');
    var errEl = $(id + '-err');
    if (!errEl) {
      errEl = document.createElement('div'); errEl.id = id + '-err'; errEl.className = 'dmg-err';
      el.parentNode.appendChild(errEl);
    }
    errEl.textContent = msg;
  }
  function clearReportErrs() {
    document.querySelectorAll('#dmg-report-form .dmg-err-border').forEach(function (e) { e.classList.remove('dmg-err-border'); });
    document.querySelectorAll('#dmg-report-form .dmg-err').forEach(function (e) { e.remove(); });
  }

  function reportFormHtml() {
    var u = DMG._.me();
    var typeOpts = DMG._.INCIDENT_TYPES.map(function (t) { return '<option value="' + t.v + '">' + DMG._.esc(t.th) + '</option>'; }).join('');
    var stageOpts = '<option value="">— ไม่ระบุ —</option>' + DMG._.SUSPECTED_STAGES.map(function (s) {
      return '<option value="' + DMG._.esc(s) + '">' + DMG._.esc(s) + '</option>';
    }).join('');
    return ''
      + '<form id="dmg-report-form" onsubmit="return false">'

      + '<div class="dmg-section-title"><i class="fas fa-user"></i> ข้อมูลผู้แจ้ง</div>'
      + '<div class="dmg-row2">'
        + '<div class="dmg-field"><label class="dmg-label">ชื่อผู้แจ้ง</label><input class="dmg-input" value="' + DMG._.esc(u.name) + '" disabled></div>'
        + '<div class="dmg-field"><label class="dmg-label">แผนก</label><input class="dmg-input" id="dmg-rpt-dept-display" value="' + DMG._.esc(u.isWhStaff ? 'คลังสินค้า (ทีม ' + (u.team || '-') + ')' : '-') + '" disabled></div>'
      + '</div>'
      + '<div class="dmg-row2">'
        + '<div class="dmg-field"><label class="dmg-label">วันเวลาที่พบเหตุ <span class="req">*</span></label><input type="datetime-local" class="dmg-input" id="dmg-rpt-datetime" value="' + DMG._.nowBkkLocal() + '"></div>'
        + '<div class="dmg-field"><label class="dmg-label">จุดที่พบเหตุ <span class="req">*</span></label><input class="dmg-input" id="dmg-rpt-location" placeholder="เช่น คลัง P1 จุดรับเข้า"></div>'
      + '</div>'

      + '<div class="dmg-section-title"><i class="fas fa-box"></i> รายละเอียดสินค้า</div>'
      + '<div class="dmg-row2">'
        + '<div class="dmg-field"><label class="dmg-label">รหัสสินค้า (SKU) <span class="req">*</span></label><input class="dmg-input" id="dmg-rpt-sku" placeholder="เช่น 0SQG200140"></div>'
        + '<div class="dmg-field"><label class="dmg-label">ชื่อสินค้า <span class="req">*</span></label><input class="dmg-input" id="dmg-rpt-name" placeholder="ชื่อสินค้า"></div>'
      + '</div>'
      + '<div class="dmg-row2">'
        + '<div class="dmg-field"><label class="dmg-label">เลข Lot / Batch</label><input class="dmg-input" id="dmg-rpt-lot"></div>'
        + '<div class="dmg-field"><label class="dmg-label">เลขที่ใบสั่งผลิต</label><input class="dmg-input" id="dmg-rpt-po"></div>'
      + '</div>'
      + '<div class="dmg-field"><label class="dmg-label">เลขที่คำสั่งซื้อ / ใบส่งสินค้า</label><input class="dmg-input" id="dmg-rpt-do"></div>'
      + '<div class="dmg-row3">'
        + '<div class="dmg-field"><label class="dmg-label">จำนวนที่เสียหาย <span class="req">*</span></label><input type="number" min="0" step="0.01" class="dmg-input" id="dmg-rpt-qty"></div>'
        + '<div class="dmg-field"><label class="dmg-label">หน่วยนับ</label><input class="dmg-input" id="dmg-rpt-unit" value="เส้น"></div>'
        + '<div class="dmg-field"><label class="dmg-label">มูลค่าความเสียหายโดยประมาณ (บาท)</label><input type="number" min="0" class="dmg-input" id="dmg-rpt-value"></div>'
      + '</div>'
      + '<div class="dmg-row2">'
        + '<div class="dmg-field"><label class="dmg-label">ประเภทความเสียหาย <span class="req">*</span></label><select class="dmg-select" id="dmg-rpt-type"><option value="">— เลือกประเภท —</option>' + typeOpts + '</select></div>'
        + '<div class="dmg-field"><label class="dmg-label">ระดับความเร่งด่วน</label><select class="dmg-select" id="dmg-rpt-priority">'
          + '<option value="normal" selected>ปกติ</option><option value="low">ต่ำ</option><option value="high">สูง</option><option value="urgent">เร่งด่วน</option></select></div>'
      + '</div>'

      + '<div class="dmg-section-title"><i class="fas fa-circle-exclamation"></i> รายละเอียดเหตุการณ์</div>'
      + '<div class="dmg-field"><label class="dmg-label">พบความเสียหายอย่างไร <span class="req">*</span></label><textarea class="dmg-textarea" id="dmg-rpt-symptom" placeholder="อธิบายสิ่งที่พบ"></textarea></div>'
      + '<div class="dmg-field"><label class="dmg-label">สภาพสินค้าตอนพบ</label><textarea class="dmg-textarea" id="dmg-rpt-condition"></textarea></div>'
      + '<div class="dmg-field"><label class="dmg-label">สงสัยว่าเกิดในขั้นตอนไหน <span class="dmg-muted" style="display:inline">(ข้อสงสัยเท่านั้น ไม่ใช่ข้อสรุป)</span></label><select class="dmg-select" id="dmg-rpt-stage">' + stageOpts + '</select></div>'
      + '<div class="dmg-field"><label class="dmg-label">มีผลกระทบต่อการส่งมอบหรือไม่</label>'
        + '<div class="dmg-chip-group" id="dmg-rpt-impact-group">'
          + '<div class="dmg-chip on" data-val="false" onclick="DMG.toggleChip(this,\'dmg-rpt-impact-group\')">ไม่กระทบ</div>'
          + '<div class="dmg-chip" data-val="true" onclick="DMG.toggleChip(this,\'dmg-rpt-impact-group\')">กระทบ</div>'
        + '</div></div>'
      + '<div class="dmg-field"><label class="dmg-label">ดำเนินการเบื้องต้นแล้วหรือไม่</label>'
        + '<div class="dmg-chip-group" id="dmg-rpt-action-group">'
          + '<div class="dmg-chip on" data-val="false" onclick="DMG.toggleChip(this,\'dmg-rpt-action-group\');DMG.toggleActionDetail()">ยังไม่ได้ทำ</div>'
          + '<div class="dmg-chip" data-val="true" onclick="DMG.toggleChip(this,\'dmg-rpt-action-group\');DMG.toggleActionDetail()">ทำแล้ว</div>'
        + '</div></div>'
      + '<div class="dmg-field" id="dmg-rpt-action-detail-wrap" style="display:none"><label class="dmg-label">รายละเอียดการดำเนินการเบื้องต้น</label><textarea class="dmg-textarea" id="dmg-rpt-action-detail"></textarea></div>'

      + '<div class="dmg-section-title"><i class="fas fa-camera"></i> รูปภาพและหลักฐาน <span class="req">*</span></div>'
      + '<div class="dmg-field"><label class="dmg-label">ภาพรวมสินค้า</label><div id="dmg-rpt-photos-overview"></div></div>'
      + '<div class="dmg-field"><label class="dmg-label">ภาพตำหนิระยะใกล้</label><div id="dmg-rpt-photos-closeup"></div></div>'
      + '<div class="dmg-muted">แนะนำให้ถ่ายทั้งภาพรวมสินค้าและภาพตำหนิระยะใกล้ อย่างน้อย ' + DMG._.CFG.minPhotos + ' รูป</div>'

      + '<div class="dmg-section-title"><i class="fas fa-check"></i> ยืนยันและส่ง</div>'
      + '<label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#475569;margin-bottom:16px;cursor:pointer">'
        + '<input type="checkbox" id="dmg-rpt-confirm" style="margin-top:3px"> ข้าพเจ้ายืนยันว่าข้อมูลข้างต้นตรงกับสิ่งที่พบจริง</label>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
        + '<button type="button" class="dmg-btn" style="flex:1;min-width:140px" onclick="DMG.saveDraft()"><i class="fas fa-save"></i> บันทึกร่าง</button>'
        + '<button type="button" class="dmg-btn dmg-btn-primary" style="flex:2;min-width:140px" onclick="DMG.submitReport()" id="dmg-rpt-submit-btn"><i class="fas fa-paper-plane"></i> ส่งแจ้งเหตุ</button>'
      + '</div>'
      + '</form>';
  }

  DMG.toggleChip = function (el, groupId) {
    var g = $(groupId);
    Array.prototype.forEach.call(g.children, function (c) { c.classList.remove('on'); });
    el.classList.add('on');
  };
  DMG.toggleActionDetail = function () {
    var on = $('dmg-rpt-action-group').querySelector('.on[data-val="true"]');
    $('dmg-rpt-action-detail-wrap').style.display = on ? '' : 'none';
  };
  function chipVal(groupId) {
    var on = $(groupId).querySelector('.on');
    return on ? on.getAttribute('data-val') === 'true' : null;
  }

  var DRAFT_KEY = 'dmg_report_draft_v1';
  DMG.saveDraft = function () {
    try {
      var draft = collectReportForm(true);
      // ไม่เก็บรูปใน localStorage (ไฟล์ใหญ่เกิน quota) — เก็บแค่ข้อความ รูปต้องถ่ายใหม่ตอนกลับมา
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      DMG._.toast('บันทึกร่างแล้ว (ไม่รวมรูปภาพ)');
    } catch (e) { DMG._.toast('บันทึกร่างไม่สำเร็จ', true); }
  };
  function loadDraftIntoForm() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      Object.keys(d.fields || {}).forEach(function (id) { var el = $(id); if (el) el.value = d.fields[id]; });
    } catch (e) {}
  }

  function collectReportForm(forDraft) {
    var ids = ['dmg-rpt-datetime', 'dmg-rpt-location', 'dmg-rpt-sku', 'dmg-rpt-name', 'dmg-rpt-lot', 'dmg-rpt-po',
      'dmg-rpt-do', 'dmg-rpt-qty', 'dmg-rpt-unit', 'dmg-rpt-value', 'dmg-rpt-type', 'dmg-rpt-priority',
      'dmg-rpt-symptom', 'dmg-rpt-condition', 'dmg-rpt-stage', 'dmg-rpt-action-detail'];
    var fields = {};
    ids.forEach(function (id) { var el = $(id); if (el) fields[id] = el.value; });
    if (forDraft) return { fields: fields };

    var u = DMG._.me();
    return {
      reporter_username: u.username, reporter_name: u.name,
      department_code: u.isWhStaff ? 'WH' : null,
      incident_type: fields['dmg-rpt-type'] || null,
      incident_location: fields['dmg-rpt-location'] || null,
      incident_datetime: DMG._.bkkLocalToISO(fields['dmg-rpt-datetime']),
      symptom: fields['dmg-rpt-symptom'] || null,
      condition_on_found: fields['dmg-rpt-condition'] || null,
      suspected_stage: fields['dmg-rpt-stage'] || null,
      delivery_impact: chipVal('dmg-rpt-impact-group'),
      initial_action_taken: chipVal('dmg-rpt-action-group'),
      initial_action_detail: fields['dmg-rpt-action-detail'] || null,
      product_code: fields['dmg-rpt-sku'] || null, product_name: fields['dmg-rpt-name'] || null,
      lot_number: fields['dmg-rpt-lot'] || null, production_order: fields['dmg-rpt-po'] || null,
      delivery_reference: fields['dmg-rpt-do'] || null,
      damaged_quantity: fields['dmg-rpt-qty'] ? Number(fields['dmg-rpt-qty']) : null,
      unit: fields['dmg-rpt-unit'] || null,
      estimated_damage_value: fields['dmg-rpt-value'] ? Number(fields['dmg-rpt-value']) : null,
      priority: fields['dmg-rpt-priority'] || 'normal',
      title: (fields['dmg-rpt-name'] || 'สินค้าเสียหาย') + ' — ' + (DMG._.incidentLabel(fields['dmg-rpt-type']) || '')
    };
  }

  function validateReport(data) {
    clearReportErrs();
    var errs = [];
    function need(id, cond, msg) { if (!cond) { reportFieldErr(id, msg); errs.push(msg); } }
    need('dmg-rpt-location', !!data.incident_location, 'กรุณากรอกจุดที่พบเหตุ');
    need('dmg-rpt-sku', !!data.product_code, 'กรุณากรอกรหัสสินค้า');
    need('dmg-rpt-name', !!data.product_name, 'กรุณากรอกชื่อสินค้า');
    need('dmg-rpt-qty', data.damaged_quantity != null && data.damaged_quantity > 0, 'กรุณากรอกจำนวนที่เสียหาย');
    need('dmg-rpt-type', !!data.incident_type, 'กรุณาเลือกประเภทความเสียหาย');
    need('dmg-rpt-symptom', !!data.symptom, 'กรุณาอธิบายว่าพบความเสียหายอย่างไร');
    var totalPhotos = _rptPhotos.length + _rptCloseupPhotos.length;
    if (totalPhotos < DMG._.CFG.minPhotos) { errs.push('กรุณาแนบรูปอย่างน้อย ' + DMG._.CFG.minPhotos + ' รูป'); DMG._.toast('กรุณาแนบรูปอย่างน้อย ' + DMG._.CFG.minPhotos + ' รูป', true); }
    if (!$('dmg-rpt-confirm').checked) { errs.push('กรุณายืนยันว่าข้อมูลตรงกับสิ่งที่พบ'); DMG._.toast('กรุณาติ๊กยืนยันข้อมูลก่อนส่ง', true); }
    return errs;
  }

  var _submitting = false;
  DMG.submitReport = function () {
    if (_submitting) return;
    var data = collectReportForm(false);
    var errs = validateReport(data);
    if (errs.length) { if (!errs.some(function (e) { return /แนบรูป|ยืนยัน/.test(e); })) DMG._.toast(errs[0], true); return; }

    _submitting = true;
    var btn = $('dmg-rpt-submit-btn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...';

    var token = DMG._.uuid();
    data.client_token = token;
    data.status = 'Submitted';

    // กันกดส่งซ้ำด้วย client_token (unique) — ถ้าเน็ตหลุดแล้วกดใหม่ ฝั่งฐานข้อมูลปฏิเสธแถวซ้ำเอง
    DMG._.sb().from('dmg_cases').insert(data).select('id,case_number').single()
      .then(function (r) {
        if (r.error) throw new Error(r.error.message);
        return uploadReportPhotos(r.data.id).then(function () { return r.data; });
      })
      .then(function (caseRow) {
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
        _rptPhotos = []; _rptCloseupPhotos = [];
        showReportSuccess(caseRow);
      })
      .catch(function (e) {
        DMG._.toast('ส่งไม่สำเร็จ: ' + e.message, true);
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> ส่งแจ้งเหตุ';
      })
      .finally(function () { _submitting = false; });
  };

  function uploadReportPhotos(caseId) {
    var u = DMG._.me();
    var jobs = [];
    _rptPhotos.forEach(function (p) { jobs.push({ file: p.file, type: 'overview' }); });
    _rptCloseupPhotos.forEach(function (p) { jobs.push({ file: p.file, type: 'closeup' }); });
    return Promise.all(jobs.map(function (j) {
      return window._cldUpload(j.file, 'damage').then(function (url) {
        if (!url) return null;
        return DMG._.sb().from('dmg_attachments').insert({
          case_id: caseId, storage_path: url, file_name: j.file.name, mime_type: j.file.type,
          file_size: j.file.size, attachment_type: j.type, uploaded_by: u.username
        });
      });
    }));
  }

  function showReportSuccess(caseRow) {
    var body = $('dmg-rpt-body');
    body.innerHTML = '<div class="dmg-rpt-success">'
      + '<div class="ic">✅</div><b style="font-size:16px">ส่งแจ้งเหตุสำเร็จ</b>'
      + '<div class="num">' + DMG._.esc(caseRow.case_number) + '</div>'
      + '<p style="color:#64748b;font-size:13px">สถานะปัจจุบัน: ' + DMG._.statusBadge('New') + '</p>'
      + '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">'
      + '<button class="dmg-btn" onclick="DMG.openReportForm()">แจ้งเหตุอีกครั้ง</button>'
      + '<button class="dmg-btn dmg-btn-primary" onclick="DMG.viewMyCase(\'' + caseRow.id + '\')">ดูรายละเอียดเคสนี้</button>'
      + '<button class="dmg-btn" onclick="DMG.closeReportScreen()">ปิด</button>'
      + '</div></div>';
  }

  DMG.viewMyCase = function (id) {
    DMG.closeReportScreen();
    DMG.openCaseDetail(id);
  };

  DMG.openReportForm = function () {
    injectCss();
    _rptPhotos = []; _rptCloseupPhotos = [];
    var scr = $('dmg-report-screen');
    if (!scr) {
      scr = document.createElement('div'); scr.id = 'dmg-report-screen';
      scr.innerHTML = '<div class="dmg-rpt-hd"><b><i class="fas fa-triangle-exclamation"></i> แจ้งสินค้าเสียหาย</b>'
        + '<button class="dmg-btn" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff" onclick="DMG.closeReportScreen()"><i class="fas fa-times"></i></button></div>'
        + '<div class="dmg-rpt-body" id="dmg-rpt-body"></div>';
      document.body.appendChild(scr);
    }
    DMG._.loadConfig().then(function () {
      $('dmg-rpt-body').innerHTML = reportFormHtml();
      renderReportPhotos();
      loadDraftIntoForm();
      scr.classList.add('active');
    });
  };
  DMG.closeReportScreen = function () {
    var scr = $('dmg-report-screen');
    if (scr) scr.classList.remove('active');
  };


  /* ═══════════════════════════ หน้าจอที่ 2: ศูนย์รับเรื่อง (ออฟฟิศ) ═══════════════════════════ */
  var _caseList = [];       // รายการเคสทั้งหมด (หน้านี้โหลดมาทีเดียว กรอง/เรียง/แบ่งหน้าในเครื่อง)
  var _caseFilters = { q: '', status: '', incident_type: '', department: '', priority: '', overdue: false, noCause: false, from: '', to: '', showDemo: true };
  var _casePage = 1;
  var CASE_PAGE_SIZE = 25;
  var _caseRefreshTimer = null;

  function kpiCardsHtml(rows) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var total = rows.length;
    var newToday = rows.filter(function (c) { return c.created_at && new Date(c.created_at) >= today; }).length;
    var underReview = rows.filter(function (c) { return c.status === 'Under Review' || c.status === 'New'; }).length;
    var awaitingInfo = rows.filter(function (c) { return c.status === 'Awaiting Information'; }).length;
    var overdue = rows.filter(DMG._.isOverdue).length;
    var closed = rows.filter(function (c) { return c.status === 'Closed'; }).length;
    var totalValue = rows.reduce(function (a, c) { return a + (Number(c.estimated_damage_value) || 0); }, 0);
    function kpi(n, label, cls) { return '<div class="dmg-kpi' + (cls ? ' ' + cls : '') + '"><div class="n">' + n + '</div><div class="l">' + label + '</div></div>'; }
    return '<div class="dmg-kpi-grid">'
      + kpi(total, 'เคสทั้งหมด') + kpi(newToday, 'เคสใหม่วันนี้') + kpi(underReview, 'รอตรวจสอบ')
      + kpi(awaitingInfo, 'รอข้อมูลเพิ่มเติม') + kpi(overdue, 'เคสเกินกำหนด', overdue > 0 ? 'alert' : '')
      + kpi(closed, 'ปิดแล้ว') + kpi(DMG._.nf(totalValue), 'มูลค่าเสียหายรวม (บาท)')
      + '</div>';
  }

  function filterBarHtml() {
    var statusOpts = '<option value="">ทุกสถานะ</option>' + DMG._.STATUS_ORDER.map(function (s) {
      return '<option value="' + s + '"' + (s === _caseFilters.status ? ' selected' : '') + '>' + DMG._.esc(DMG._.STATUS[s].th) + '</option>';
    }).join('');
    var typeOpts = '<option value="">ทุกประเภท</option>' + DMG._.INCIDENT_TYPES.map(function (t) {
      return '<option value="' + t.v + '"' + (t.v === _caseFilters.incident_type ? ' selected' : '') + '>' + DMG._.esc(t.th) + '</option>';
    }).join('');
    var deptOpts = DMG._.deptOptions(_caseFilters.department, true);
    var prioOpts = '<option value="">ทุกระดับ</option>' + Object.keys(DMG._.PRIORITY).map(function (p) {
      return '<option value="' + p + '"' + (p === _caseFilters.priority ? ' selected' : '') + '>' + DMG._.esc(DMG._.PRIORITY[p].th) + '</option>';
    }).join('');
    return '<div class="dmg-filterbar">'
      + '<input type="text" placeholder="ค้นหา เลขเคส / SKU / Lot / ชื่อสินค้า" value="' + DMG._.esc(_caseFilters.q) + '" oninput="DMG.setFilter(\'q\',this.value)" style="min-width:220px">'
      + '<select onchange="DMG.setFilter(\'status\',this.value)">' + statusOpts + '</select>'
      + '<select onchange="DMG.setFilter(\'incident_type\',this.value)">' + typeOpts + '</select>'
      + '<select onchange="DMG.setFilter(\'department\',this.value)">' + deptOpts + '</select>'
      + '<select onchange="DMG.setFilter(\'priority\',this.value)">' + prioOpts + '</select>'
      + '<label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#475569"><input type="checkbox" ' + (_caseFilters.overdue ? 'checked' : '') + ' onchange="DMG.setFilter(\'overdue\',this.checked)"> เกินกำหนด</label>'
      + '<label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#475569"><input type="checkbox" ' + (_caseFilters.noCause ? 'checked' : '') + ' onchange="DMG.setFilter(\'noCause\',this.checked)"> ยังไม่ระบุสาเหตุ</label>'
      + '<label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#475569"><input type="checkbox" ' + (_caseFilters.showDemo ? 'checked' : '') + ' onchange="DMG.setFilter(\'showDemo\',this.checked)"> แสดงข้อมูลตัวอย่าง</label>'
      + '<button class="dmg-btn dmg-btn-sm" onclick="DMG.resetFilters()"><i class="fas fa-rotate-left"></i> ล้างตัวกรอง</button>'
      + '<button class="dmg-btn dmg-btn-primary dmg-btn-sm" style="margin-left:auto" onclick="DMG.openReportForm()"><i class="fas fa-plus"></i> แจ้งเหตุใหม่</button>'
      + '</div>';
  }
  DMG.setFilter = function (key, val) { _caseFilters[key] = val; _casePage = 1; renderCaseList(); };
  DMG.resetFilters = function () {
    _caseFilters = { q: '', status: '', incident_type: '', department: '', priority: '', overdue: false, noCause: false, from: '', to: '', showDemo: true };
    _casePage = 1; renderCasesPanel();
  };

  function applyFilters(rows) {
    var f = _caseFilters;
    return rows.filter(function (c) {
      if (!f.showDemo && c.is_demo) return false;
      if (f.status && c.status !== f.status) return false;
      if (f.incident_type && c.incident_type !== f.incident_type) return false;
      if (f.department && c.department_code !== f.department && (c.involved_departments || []).indexOf(f.department) < 0) return false;
      if (f.priority && c.priority !== f.priority) return false;
      if (f.overdue && !DMG._.isOverdue(c)) return false;
      if (f.noCause && c.root_cause) return false;
      if (f.q) {
        var q = f.q.toLowerCase();
        var hay = [c.case_number, c.product_code, c.product_name, c.lot_number, c.title, c.reporter_name].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function caseRowHtml(c) {
    var overdue = DMG._.isOverdue(c);
    var thumb = c._thumb ? '<img class="dmg-thumb" src="' + DMG._.esc(c._thumb) + '">' : '<div class="dmg-thumb" style="display:flex;align-items:center;justify-content:center;color:#cbd5e1"><i class="fas fa-image"></i></div>';
    return '<tr onclick="DMG.openCaseDetail(\'' + c.id + '\')" class="' + (overdue ? 'dmg-overdue' : '') + '">'
      + '<td><b style="font-family:monospace">' + DMG._.esc(c.case_number || '—') + '</b>' + (c.is_demo ? '<span class="dmg-demo-tag">ตัวอย่าง</span>' : '') + '</td>'
      + '<td>' + DMG._.fmtD(c.created_at) + '</td>'
      + '<td>' + thumb + '</td>'
      + '<td>' + DMG._.esc(c.product_name || '—') + '<div class="dmg-muted" style="margin:0;font-family:monospace">' + DMG._.esc(c.product_code || '') + '</div></td>'
      + '<td>' + DMG._.esc(DMG._.incidentLabel(c.incident_type)) + '</td>'
      + '<td>' + DMG._.esc(DMG._.deptName(c.department_code)) + '</td>'
      + '<td>' + DMG._.priorityBadge(c.priority) + '</td>'
      + '<td>' + DMG._.esc(c.reporter_name || c.reporter_username || '—') + '</td>'
      + '<td>' + DMG._.statusBadge(c.status) + '</td>'
      + '<td>' + (c.due_at ? DMG._.fmtD(c.due_at) : '—') + (overdue ? ' <span style="color:#dc2626;font-weight:800">⚠</span>' : '') + '</td>'
      + '<td><button class="dmg-btn dmg-btn-sm" onclick="event.stopPropagation();DMG.openCaseDetail(\'' + c.id + '\')"><i class="fas fa-eye"></i></button></td>'
      + '</tr>';
  }

  function renderCaseList() {
    var wrap = $('dmg-case-table-wrap');
    if (!wrap) return;
    var filtered = applyFilters(_caseList).sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var totalPages = Math.max(1, Math.ceil(filtered.length / CASE_PAGE_SIZE));
    if (_casePage > totalPages) _casePage = totalPages;
    var pageRows = filtered.slice((_casePage - 1) * CASE_PAGE_SIZE, _casePage * CASE_PAGE_SIZE);

    if (!filtered.length) {
      wrap.innerHTML = '<div class="dmg-empty"><div class="dmg-empty-ic">📭</div>ไม่พบเคสที่ตรงเงื่อนไข</div>';
      $('dmg-case-pagin').innerHTML = '';
      return;
    }
    wrap.innerHTML = '<div class="dmg-table-wrap"><table class="dmg-table"><thead><tr>'
      + '<th>เลขที่เคส</th><th>วันที่แจ้ง</th><th>รูป</th><th>สินค้า / SKU</th><th>ประเภท</th><th>แผนก</th><th>เร่งด่วน</th><th>ผู้แจ้ง</th><th>สถานะ</th><th>กำหนดเสร็จ</th><th></th>'
      + '</tr></thead><tbody>' + pageRows.map(caseRowHtml).join('') + '</tbody></table></div>';

    var pag = $('dmg-case-pagin');
    var html = '';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="dmg-btn dmg-btn-sm" style="' + (i === _casePage ? 'background:#1d4ed8;color:#fff;border-color:#1d4ed8' : '') + '" onclick="DMG.gotoPage(' + i + ')">' + i + '</button>';
    }
    pag.innerHTML = totalPages > 1 ? html : '';
  }
  DMG.gotoPage = function (p) { _casePage = p; renderCaseList(); };

  function loadCaseList() {
    var listEl = $('dmg-case-table-wrap');
    if (listEl) listEl.innerHTML = '<div class="dmg-empty"><i class="fas fa-spinner fa-spin"></i></div>';
    return DMG._.fetchAll(function () {
      return DMG._.sb().from('dmg_cases').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    }).then(function (rows) {
      _caseList = rows;
      // ดึงรูป thumbnail แรกของแต่ละเคส (เบากว่าการดึงรูปทั้งหมดของทุกเคส)
      var ids = rows.map(function (r) { return r.id; });
      if (!ids.length) return rows;
      return DMG._.fetchAll(function () {
        return DMG._.sb().from('dmg_attachments').select('case_id,storage_path,uploaded_at').in('case_id', ids)
          .is('deleted_at', null).order('uploaded_at', { ascending: true });
      }).then(function (atts) {
        var first = {};
        atts.forEach(function (a) { if (!first[a.case_id]) first[a.case_id] = a.storage_path; });
        rows.forEach(function (r) { r._thumb = first[r.id] || null; });
        return rows;
      });
    });
  }

  function renderCasesPanel() {
    var host = $('view-damage-cases-content');
    if (!host) return;
    host.innerHTML = '<div id="dmg-cases-body"><div class="dmg-empty"><i class="fas fa-spinner fa-spin"></i></div></div>';
    Promise.all([DMG._.loadConfig(), DMG._.loadDepts(), DMG._.loadStaff(), loadCaseList()])
      .then(function (res) {
        var rows = res[3];
        $('dmg-cases-body').innerHTML = kpiCardsHtml(applyFilters(rows)) + filterBarHtml()
          + '<div id="dmg-case-table-wrap"></div><div class="dmg-pagin" id="dmg-case-pagin"></div>';
        renderCaseList();
      })
      .catch(function (e) { $('dmg-cases-body').innerHTML = '<div class="dmg-empty" style="color:#dc2626">โหลดข้อมูลไม่สำเร็จ: ' + DMG._.esc(e.message) + '</div>'; });
  }

  DMG.initCases = function () {
    injectCss();
    DMG._.checkReady().then(function (st) {
      var host = $('view-damage-cases-content');
      if (!host) return;
      host.classList.add('dmg-view-visible');
      if (!st.ok) { host.innerHTML = DMG._.setupPanel(st, false); return; }
      renderCasesPanel();
      clearInterval(_caseRefreshTimer);
      _caseRefreshTimer = setInterval(function () {
        if (!host.classList.contains('hidden')) loadCaseList().then(function () {
          var k = host.querySelector('.dmg-kpi-grid');
          if (k) k.outerHTML = kpiCardsHtml(applyFilters(_caseList));
          renderCaseList();
        });
      }, 30000);
    });
  };


  /* ═══════════════════════════ หน้ารายละเอียดเคส (Case Detail) ═══════════════════════════ */
  var _curCase = null;          // เคสที่เปิดอยู่ในโมดัล (รวมข้อมูลลูกทั้งหมด)
  var _curTab = 'info';
  var _transitions = null;      // {from: [to,...]}  — โหลดจาก dmg_status_transitions ครั้งเดียว ไม่ hardcode ซ้ำฝั่ง UI

  function loadTransitions() {
    if (_transitions) return Promise.resolve(_transitions);
    return DMG._.sb().from('dmg_status_transitions').select('*').then(function (r) {
      if (r.error) throw new Error(r.error.message);
      var m = {};
      (r.data || []).forEach(function (t) { (m[t.from_status] = m[t.from_status] || []).push(t.to_status); });
      _transitions = m; return m;
    });
  }

  function loadCaseFull(id) {
    var sb = DMG._.sb();
    return Promise.all([
      sb.from('dmg_cases').select('*').eq('id', id).single(),
      sb.from('dmg_attachments').select('*').eq('case_id', id).is('deleted_at', null).order('uploaded_at'),
      sb.from('dmg_assignments').select('*').eq('case_id', id).order('assigned_at'),
      sb.from('dmg_investigations').select('*').eq('case_id', id).order('investigated_at'),
      sb.from('dmg_corrective_actions').select('*').eq('case_id', id).order('created_at'),
      sb.from('dmg_comments').select('*').eq('case_id', id).order('created_at'),
      sb.from('dmg_activity_logs').select('*').eq('case_id', id).order('created_at'),
      sb.from('dmg_email_logs').select('*').eq('case_id', id).order('created_at'),
      loadTransitions(), DMG._.loadDepts(), DMG._.loadStaff()
    ]).then(function (res) {
      var errs = res.slice(0, 8).map(function (r) { return r.error; }).filter(Boolean);
      if (errs.length) throw new Error(errs[0].message);
      return {
        c: res[0].data, attachments: res[1].data || [], assignments: res[2].data || [],
        investigations: res[3].data || [], capa: res[4].data || [], comments: res[5].data || [],
        logs: res[6].data || [], emails: res[7].data || []
      };
    });
  }

  DMG.openCaseDetail = function (id) {
    var back = $('dmg-modal-backdrop');
    if (!back) {
      back = document.createElement('div'); back.id = 'dmg-modal-backdrop'; back.className = 'dmg-modal-backdrop';
      back.style.display = 'none';
      back.innerHTML = '<div class="dmg-modal" id="dmg-modal-inner"></div>';
      back.addEventListener('click', function (e) { if (e.target === back) DMG.closeCaseDetail(); });
      document.body.appendChild(back);
    }
    back.style.display = 'flex';
    $('dmg-modal-inner').innerHTML = '<div class="dmg-modal-body"><div class="dmg-empty"><i class="fas fa-spinner fa-spin"></i></div></div>';
    _curTab = 'info';
    loadCaseFull(id).then(function (data) {
      _curCase = data;
      renderCaseModal();
    }).catch(function (e) {
      $('dmg-modal-inner').innerHTML = '<div class="dmg-modal-body"><div class="dmg-empty" style="color:#dc2626">โหลดเคสไม่สำเร็จ: ' + DMG._.esc(e.message) + '</div></div>';
    });
  };
  DMG.closeCaseDetail = function () {
    var back = $('dmg-modal-backdrop');
    if (back) back.style.display = 'none';
    _curCase = null;
  };
  DMG.switchCaseTab = function (tab) { _curTab = tab; renderCaseModal(); };
  function refreshCurCase() { return loadCaseFull(_curCase.c.id).then(function (d) { _curCase = d; renderCaseModal(); renderCaseList(); }); }

  function workflowBarHtml() {
    var c = _curCase.c;
    var nexts = (_transitions && _transitions[c.status]) || [];
    if (!nexts.length) return '';
    var opts = '<option value="">— เปลี่ยนสถานะเป็น —</option>' + nexts.map(function (s) {
      return '<option value="' + s + '">' + DMG._.esc(DMG._.STATUS[s].th) + '</option>';
    }).join('');
    return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;margin-bottom:16px">'
      + '<select class="dmg-select" style="width:auto" id="dmg-next-status" onchange="DMG.onStatusPick()">' + opts + '</select>'
      + '<div id="dmg-status-reason-wrap" style="display:none;flex:1;min-width:200px"><input class="dmg-input" id="dmg-status-reason" placeholder="เหตุผล / รายละเอียดเพิ่มเติม"></div>'
      + '<button class="dmg-btn dmg-btn-primary dmg-btn-sm" onclick="DMG.applyStatusChange()">ยืนยันเปลี่ยนสถานะ</button>'
      + '</div>';
  }
  DMG.onStatusPick = function () {
    var s = $('dmg-next-status').value;
    $('dmg-status-reason-wrap').style.display = (s === 'Awaiting Information' || s === 'Reopened') ? '' : 'none';
  };
  DMG.applyStatusChange = function () {
    var s = $('dmg-next-status').value;
    if (!s) return;
    var reasonEl = $('dmg-status-reason');
    var reason = reasonEl ? reasonEl.value.trim() : '';
    if ((s === 'Awaiting Information' || s === 'Reopened') && !reason) {
      DMG._.toast('กรุณาระบุเหตุผล', true); return;
    }
    if (s === 'Pending Approval' && (!_curCase.c.root_cause || !_curCase.c.conclusion || !_curCase.c.conclusion_reason)) {
      DMG._.toast('กรุณาบันทึกสาเหตุราก ข้อสรุป และเหตุผล ในแท็บ "สาเหตุและความรับผิดชอบ" ก่อนส่งขออนุมัติ', true);
      DMG.switchCaseTab('cause'); return;
    }
    var u = DMG._.me();
    var patch = { status: s, status_reason: reason || null, last_actor: u.username };
    DMG._.sb().from('dmg_cases').update(patch).eq('id', _curCase.c.id).then(function (r) {
      if (r.error) { DMG._.toast('เปลี่ยนสถานะไม่สำเร็จ: ' + r.error.message, true); return; }
      DMG._.toast('เปลี่ยนสถานะเป็น "' + DMG._.STATUS[s].th + '" แล้ว');
      refreshCurCase();
    });
  };

  function renderCaseModal() {
    var inner = $('dmg-modal-inner');
    var c = _curCase.c;
    var tabs = [
      ['info', 'ข้อมูลเหตุการณ์'], ['review', 'การตรวจสอบ'], ['cause', 'สาเหตุและความรับผิดชอบ'],
      ['capa', 'แนวทางแก้ไข (CAPA)'], ['timeline', 'ประวัติเคส (' + _curCase.logs.length + ')']
    ];
    inner.innerHTML = '<div class="dmg-modal-hd">'
      + '<div><b style="font-size:16px;font-family:monospace">' + DMG._.esc(c.case_number || 'ร่าง') + '</b>' + (c.is_demo ? '<span class="dmg-demo-tag">ตัวอย่าง</span>' : '')
        + '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + DMG._.esc(c.title || '') + '</div></div>'
      + '<div style="display:flex;align-items:center;gap:10px">' + DMG._.statusBadge(c.status) + DMG._.priorityBadge(c.priority)
      + '<button class="dmg-x" onclick="DMG.closeCaseDetail()"><i class="fas fa-times"></i></button></div></div>'
      + '<div class="dmg-modal-body">'
      + workflowBarHtml()
      + '<div class="dmg-tabs">' + tabs.map(function (t) { return '<div class="dmg-tab ' + (t[0] === _curTab ? 'on' : '') + '" onclick="DMG.switchCaseTab(\'' + t[0] + '\')">' + t[1] + '</div>'; }).join('') + '</div>'
      + '<div id="dmg-tab-body">' + renderTabBody() + '</div>'
      + '</div>';
  }

  function renderTabBody() {
    if (_curTab === 'info') return tabInfoHtml();
    if (_curTab === 'review') return tabReviewHtml();
    if (_curTab === 'cause') return tabCauseHtml();
    if (_curTab === 'capa') return tabCapaHtml();
    if (_curTab === 'timeline') return tabTimelineHtml();
    return '';
  }


  /* ── Tab 1: ข้อมูลเหตุการณ์ ── */
  function tabInfoHtml() {
    var c = _curCase.c;
    var gallery = _curCase.attachments.filter(function (a) { return a.attachment_type === 'overview' || a.attachment_type === 'closeup'; });
    return '<div class="dmg-kv">'
      + '<b>ผู้แจ้ง</b><div>' + DMG._.esc(c.reporter_name || c.reporter_username) + ' (' + DMG._.esc(DMG._.deptName(c.department_code)) + ')</div>'
      + '<b>วันเวลาที่พบเหตุ</b><div>' + DMG._.fmtDT(c.incident_datetime) + '</div>'
      + '<b>จุดที่พบเหตุ</b><div>' + DMG._.esc(c.incident_location || '—') + '</div>'
      + '<b>สินค้า</b><div>' + DMG._.esc(c.product_name || '—') + ' <span style="font-family:monospace;color:#94a3b8">(' + DMG._.esc(c.product_code || '—') + ')</span></div>'
      + '<b>Lot / ใบสั่งผลิต</b><div>' + DMG._.esc(c.lot_number || '—') + ' / ' + DMG._.esc(c.production_order || '—') + '</div>'
      + '<b>เลขที่คำสั่งซื้อ/ส่ง</b><div>' + DMG._.esc(c.delivery_reference || '—') + '</div>'
      + '<b>จำนวน / มูลค่า</b><div>' + DMG._.nf(c.damaged_quantity, 2) + ' ' + DMG._.esc(c.unit || '') + '   ·   ' + DMG._.nf(c.estimated_damage_value) + ' บาท</div>'
      + '<b>ประเภทเหตุการณ์</b><div>' + DMG._.esc(DMG._.incidentLabel(c.incident_type)) + '</div>'
      + '<b>ข้อสงสัยของผู้แจ้ง</b><div>' + (c.suspected_stage ? DMG._.esc(c.suspected_stage) + ' <span class="dmg-muted" style="display:inline">(ข้อสงสัยเท่านั้น ไม่ใช่ข้อสรุป)</span>' : '—') + '</div>'
      + '<b>ผลกระทบต่อส่งมอบ</b><div>' + (c.delivery_impact == null ? '—' : (c.delivery_impact ? 'กระทบ' : 'ไม่กระทบ')) + '</div>'
      + '</div>'
      + '<div class="dmg-section-title">รายละเอียดเหตุการณ์</div>'
      + '<p style="font-size:13px;white-space:pre-wrap">' + DMG._.esc(c.symptom || '—') + '</p>'
      + (c.condition_on_found ? '<div class="dmg-section-title" style="margin-top:8px">สภาพสินค้าตอนพบ</div><p style="font-size:13px;white-space:pre-wrap">' + DMG._.esc(c.condition_on_found) + '</p>' : '')
      + (c.initial_action_taken ? '<div class="dmg-section-title" style="margin-top:8px">การดำเนินการเบื้องต้น</div><p style="font-size:13px;white-space:pre-wrap">' + DMG._.esc(c.initial_action_detail || '—') + '</p>' : '')
      + '<div class="dmg-section-title">รูปภาพหลักฐาน (' + gallery.length + ')</div>'
      + (gallery.length
        ? '<div class="dmg-gallery">' + gallery.map(function (a) { return '<img src="' + DMG._.esc(a.storage_path) + '" onclick="window.open(\'' + DMG._.esc(a.storage_path) + '\',\'_blank\')" title="' + DMG._.esc(DMG._.ATTACH_TYPES[a.attachment_type] || '') + '">'; }).join('') + '</div>'
        : '<p class="dmg-muted">ไม่มีรูปภาพ</p>');
  }

  /* ── Tab 2: การตรวจสอบ (มอบหมาย + คำชี้แจงแผนก) ── */
  function assignmentCardHtml(a) {
    var statusMap = { open: ['blue', 'รอดำเนินการ'], submitted: ['amber', 'ส่งผลแล้ว'], done: ['green', 'เสร็จแล้ว'], cancelled: ['gray', 'ยกเลิก'] };
    var sm = statusMap[a.assignment_status] || ['gray', a.assignment_status];
    return '<div class="dmg-capa-item">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
      + '<div><b>' + DMG._.esc(DMG._.deptName(a.department_code)) + '</b>'
        + (a.assignee_username ? ' — ' + DMG._.esc(a.assignee_username) : '')
        + '<div class="dmg-muted" style="margin:3px 0 0">มอบหมายโดย ' + DMG._.esc(a.assigned_by || '—') + ' เมื่อ ' + DMG._.fmtDT(a.assigned_at) + (a.due_at ? ' · กำหนด ' + DMG._.fmtD(a.due_at) : '') + '</div></div>'
      + DMG._.badge(sm[1], sm[0])
      + '</div>'
      + (a.notes ? '<p style="font-size:12.5px;margin-top:8px;color:#475569;white-space:pre-wrap">' + DMG._.esc(a.notes) + '</p>' : '')
      + (a.assignment_status === 'open' ? '<div style="margin-top:8px;display:flex;gap:6px"><button class="dmg-btn dmg-btn-sm" onclick="DMG.setAssignStatus(\'' + a.id + '\',\'done\')">✓ ทำเสร็จแล้ว</button><button class="dmg-btn dmg-btn-sm" onclick="DMG.setAssignStatus(\'' + a.id + '\',\'cancelled\')">ยกเลิก</button></div>' : '')
      + '</div>';
  }
  DMG.setAssignStatus = function (id, status) {
    DMG._.sb().from('dmg_assignments').update({ assignment_status: status }).eq('id', id).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; }
      refreshCurCase();
    });
  };
  function tabReviewHtml() {
    var html = '<div class="dmg-section-title">มอบหมายผู้ตรวจสอบ</div>';
    html += _curCase.assignments.length
      ? _curCase.assignments.map(assignmentCardHtml).join('')
      : '<p class="dmg-muted">ยังไม่มีการมอบหมาย</p>';
    var deptOpts = DMG._.deptOptions('', true);
    var staffOpts = '<option value="">— ไม่ระบุตัวบุคคล —</option>' + DMG._.getStaff().map(function (s) {
      return '<option value="' + DMG._.esc(s.username) + '">' + DMG._.esc(s.display_name || s.username) + '</option>';
    }).join('');
    html += '<div class="dmg-section-title"><i class="fas fa-user-plus"></i> มอบหมายเพิ่ม</div>'
      + '<div class="dmg-row3">'
      + '<div class="dmg-field"><label class="dmg-label">แผนก</label><select class="dmg-select" id="dmg-assign-dept">' + deptOpts + '</select></div>'
      + '<div class="dmg-field"><label class="dmg-label">ผู้รับผิดชอบ</label><select class="dmg-select" id="dmg-assign-user">' + staffOpts + '</select></div>'
      + '<div class="dmg-field"><label class="dmg-label">กำหนดเสร็จ</label><input type="date" class="dmg-input" id="dmg-assign-due"></div>'
      + '</div>'
      + '<div class="dmg-field"><label class="dmg-label">หมายเหตุ</label><textarea class="dmg-textarea" id="dmg-assign-notes" placeholder="สิ่งที่ต้องการให้ตรวจสอบ"></textarea></div>'
      + '<button class="dmg-btn dmg-btn-primary dmg-btn-sm" onclick="DMG.createAssignment()"><i class="fas fa-paper-plane"></i> มอบหมาย + เตรียมส่งอีเมล</button>'
      + '<div class="dmg-section-title"><i class="fas fa-comments"></i> ความคิดเห็น / ขอข้อมูลเพิ่มเติม</div>'
      + '<div id="dmg-comments-list">' + (_curCase.comments.length ? _curCase.comments.map(commentHtml).join('') : '<p class="dmg-muted">ยังไม่มีความคิดเห็น</p>') + '</div>'
      + '<div class="dmg-row2" style="margin-top:10px">'
      + '<select class="dmg-select" id="dmg-comment-kind"><option value="comment">ความคิดเห็นทั่วไป</option><option value="info_request">ขอข้อมูลเพิ่มเติม</option><option value="dispute">โต้แย้งผลสรุป</option></select>'
      + '<button class="dmg-btn dmg-btn-sm" onclick="DMG.addComment()"><i class="fas fa-paper-plane"></i> ส่งความคิดเห็น</button>'
      + '</div>'
      + '<textarea class="dmg-textarea" id="dmg-comment-text" placeholder="พิมพ์ข้อความ..." style="margin-top:8px"></textarea>';
    return html;
  }
  function commentHtml(cm) {
    var kindLabel = { info_request: '📋 ขอข้อมูลเพิ่มเติม', info_response: '↩️ ตอบกลับข้อมูล', dispute: '⚠️ โต้แย้งผล', comment: '💬' }[cm.kind] || '';
    return '<div style="border-bottom:1px solid #f1f5f9;padding:8px 0">'
      + '<div style="font-size:12px"><b>' + DMG._.esc(cm.display_name || cm.username || '—') + '</b> <span class="dmg-muted" style="display:inline">' + kindLabel + ' · ' + DMG._.fmtDT(cm.created_at) + '</span></div>'
      + '<div style="font-size:13px;margin-top:3px;white-space:pre-wrap">' + DMG._.esc(cm.comment) + '</div></div>';
  }
  DMG.createAssignment = function () {
    var dept = $('dmg-assign-dept').value, user = $('dmg-assign-user').value;
    var due = $('dmg-assign-due').value, notes = $('dmg-assign-notes').value.trim();
    if (!dept) { DMG._.toast('กรุณาเลือกแผนก', true); return; }
    var u = DMG._.me();
    DMG._.sb().from('dmg_assignments').insert({
      case_id: _curCase.c.id, department_code: dept, assignee_username: user || null,
      assigned_by: u.username, due_at: due ? DMG._.dateToISOEnd(due) : null, notes: notes || null
    }).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; }
      DMG._.toast('มอบหมายแล้ว');
      refreshCurCase().then(function () {
        DMG.openEmailCompose('request_review', dept);
      });
    });
  };
  DMG.addComment = function () {
    var kind = $('dmg-comment-kind').value, text = $('dmg-comment-text').value.trim();
    if (!text) { DMG._.toast('กรุณากรอกข้อความ', true); return; }
    var u = DMG._.me();
    DMG._.sb().from('dmg_comments').insert({
      case_id: _curCase.c.id, username: u.username, display_name: u.name, kind: kind, comment: text
    }).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; }
      $('dmg-comment-text').value = '';
      if (kind === 'info_request') {
        var patch = {};
        if (_curCase.c.status !== 'Awaiting Information') patch = { status: 'Awaiting Information', status_reason: text, last_actor: u.username };
        if (Object.keys(patch).length) DMG._.sb().from('dmg_cases').update(patch).eq('id', _curCase.c.id).then(function () { refreshCurCase(); });
        else refreshCurCase();
      } else refreshCurCase();
    });
  };


  /* ── Tab 3: สาเหตุและความรับผิดชอบ ── */
  function tabCauseHtml() {
    var c = _curCase.c;
    var canEdit = c.status !== 'Closed' || true; // ปิดแล้วยังแก้ข้อสรุปได้ผ่านการ Reopen เท่านั้น (เช็กจริงที่ trigger)
    var processOpts = '<option value="">— เลือกขั้นตอน —</option>' + DMG._.PROCESS_STEPS.map(function (p) {
      return '<option value="' + DMG._.esc(p) + '"' + (p === c.root_cause_category ? '' : '') + '>' + DMG._.esc(p) + '</option>';
    }).join('');
    var rcCatOpts = '<option value="">— เลือกหมวด —</option>' + DMG._.ROOT_CAUSE_CATS.map(function (r) {
      return '<option value="' + DMG._.esc(r) + '"' + (r === c.root_cause_category ? ' selected' : '') + '>' + DMG._.esc(r) + '</option>';
    }).join('');
    var conclOpts = '<option value="">— เลือกข้อสรุป —</option>' + DMG._.CONCLUSIONS.map(function (x) {
      return '<option value="' + x.v + '"' + (x.v === c.conclusion ? ' selected' : '') + '>' + DMG._.esc(x.th) + '</option>';
    }).join('');
    var deptChips = DMG._.getDepts().map(function (d) {
      var on = (c.involved_departments || []).indexOf(d.code) >= 0;
      return '<div class="dmg-chip' + (on ? ' on' : '') + '" data-dept="' + d.code + '" onclick="DMG.toggleDeptChip(this)">' + DMG._.esc(d.name) + '</div>';
    }).join('');

    var html = '<div class="dmg-section-title"><i class="fas fa-clipboard-list"></i> รายงานการสอบสวนของแผนก</div>';
    html += _curCase.investigations.length
      ? _curCase.investigations.map(investigationHtml).join('')
      : '<p class="dmg-muted">ยังไม่มีรายงานการสอบสวน</p>';
    html += '<div class="dmg-section-title"><i class="fas fa-plus"></i> เพิ่มรายงานการสอบสวน</div>'
      + '<div class="dmg-row2">'
      + '<div class="dmg-field"><label class="dmg-label">แผนกที่สอบสวน</label><select class="dmg-select" id="dmg-inv-dept">' + DMG._.deptOptions('', true) + '</select></div>'
      + '<div class="dmg-field"><label class="dmg-label">ขั้นตอน/กระบวนการที่เกี่ยวข้อง</label><select class="dmg-select" id="dmg-inv-process">' + processOpts + '</select></div>'
      + '</div>'
      + '<div class="dmg-field"><label class="dmg-label">คำชี้แจงข้อเท็จจริงของแผนก</label><textarea class="dmg-textarea" id="dmg-inv-statement"></textarea></div>'
      + '<div class="dmg-field"><label class="dmg-label">สรุปผลการสอบสวน</label><textarea class="dmg-textarea" id="dmg-inv-summary"></textarea></div>'
      + '<button class="dmg-btn dmg-btn-sm" onclick="DMG.addInvestigation()"><i class="fas fa-save"></i> บันทึกรายงาน</button>'

      + '<div class="dmg-section-title"><i class="fas fa-gavel"></i> ข้อสรุปความรับผิดชอบ'
        + (c.conclusion_approved_at ? DMG._.badge('อนุมัติแล้ว โดย ' + (c.conclusion_approved_by || '—'), 'green') : '') + '</div>'
      + '<div class="dmg-row2">'
      + '<div class="dmg-field"><label class="dmg-label">หมวดสาเหตุราก (Root Cause Category)</label><select class="dmg-select" id="dmg-rc-cat">' + rcCatOpts + '</select></div>'
      + '<div class="dmg-field"><label class="dmg-label">ข้อสรุป</label><select class="dmg-select" id="dmg-conclusion">' + conclOpts + '</select></div>'
      + '</div>'
      + '<div class="dmg-field"><label class="dmg-label">สาเหตุราก (Root Cause) <span class="req">*</span></label><textarea class="dmg-textarea" id="dmg-root-cause">' + DMG._.esc(c.root_cause || '') + '</textarea></div>'
      + '<div class="dmg-field"><label class="dmg-label">แผนกที่เกี่ยวข้อง (เลือกได้หลายแผนก)</label><div class="dmg-chip-group" id="dmg-involved-depts">' + deptChips + '</div></div>'
      + '<div class="dmg-field"><label class="dmg-label">เหตุผลของข้อสรุป <span class="req">*</span></label><textarea class="dmg-textarea" id="dmg-concl-reason">' + DMG._.esc(c.conclusion_reason || '') + '</textarea></div>'
      + '<div class="dmg-field"><label class="dmg-label">หลักฐานที่ใช้พิจารณา</label><textarea class="dmg-textarea" id="dmg-concl-evidence">' + DMG._.esc(c.conclusion_evidence || '') + '</textarea></div>'
      + '<button class="dmg-btn dmg-btn-primary dmg-btn-sm" onclick="DMG.saveConclusion()"><i class="fas fa-save"></i> บันทึกข้อสรุป</button>'
      + '<div class="dmg-muted">บันทึกข้อสรุปแล้ว ต้องเปลี่ยนสถานะเป็น "รออนุมัติแนวทางแก้ไข" จึงจะส่งขออนุมัติต่อ</div>';
    return html;
  }
  function investigationHtml(inv) {
    return '<div class="dmg-capa-item">'
      + '<div style="font-size:12px"><b>' + DMG._.esc(DMG._.deptName(inv.department_code)) + '</b> — ' + DMG._.esc(inv.investigator_username || '—') + ' <span class="dmg-muted" style="display:inline">· ' + DMG._.fmtDT(inv.investigated_at) + '</span></div>'
      + (inv.dept_statement ? '<p style="font-size:12.5px;margin-top:6px"><b>คำชี้แจง:</b> ' + DMG._.esc(inv.dept_statement) + '</p>' : '')
      + (inv.investigation_summary ? '<p style="font-size:12.5px;margin-top:4px"><b>สรุป:</b> ' + DMG._.esc(inv.investigation_summary) + '</p>' : '')
      + '</div>';
  }
  DMG.toggleDeptChip = function (el) { el.classList.toggle('on'); };
  DMG.addInvestigation = function () {
    var dept = $('dmg-inv-dept').value;
    if (!dept) { DMG._.toast('กรุณาเลือกแผนก', true); return; }
    var u = DMG._.me();
    DMG._.sb().from('dmg_investigations').insert({
      case_id: _curCase.c.id, department_code: dept, investigator_username: u.username,
      process_involved: $('dmg-inv-process').value || null,
      dept_statement: $('dmg-inv-statement').value.trim() || null,
      investigation_summary: $('dmg-inv-summary').value.trim() || null
    }).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; }
      DMG._.toast('บันทึกรายงานสอบสวนแล้ว');
      refreshCurCase();
    });
  };
  DMG.saveConclusion = function () {
    var rootCause = $('dmg-root-cause').value.trim();
    var reason = $('dmg-concl-reason').value.trim();
    var conclusion = $('dmg-conclusion').value;
    if (!rootCause || !reason || !conclusion) { DMG._.toast('กรุณากรอกสาเหตุราก ข้อสรุป และเหตุผลให้ครบ', true); return; }
    var involved = [];
    document.querySelectorAll('#dmg-involved-depts .on').forEach(function (el) { involved.push(el.getAttribute('data-dept')); });
    var u = DMG._.me();
    DMG._.sb().from('dmg_cases').update({
      root_cause: rootCause, root_cause_category: $('dmg-rc-cat').value || null, conclusion: conclusion,
      conclusion_reason: reason, conclusion_evidence: $('dmg-concl-evidence').value.trim() || null,
      involved_departments: involved, last_actor: u.username
    }).eq('id', _curCase.c.id).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; }
      DMG._.toast('บันทึกข้อสรุปแล้ว');
      refreshCurCase();
    });
  };

  /* ── Tab 4: แนวทางแก้ไข (CAPA) ── */
  function capaItemHtml(a) {
    var sm = DMG._.CAPA_STATUS[a.status] || a.status;
    var cls = DMG._.CAPA_CLS[a.status] || 'gray';
    var btns = '';
    if (a.status === 'open') btns = '<button class="dmg-btn dmg-btn-sm" onclick="DMG.capaSetStatus(\'' + a.id + '\',\'in_progress\')">เริ่มดำเนินการ</button>';
    else if (a.status === 'in_progress') btns = '<button class="dmg-btn dmg-btn-sm" onclick="DMG.capaComplete(\'' + a.id + '\')">ทำเสร็จแล้ว</button>';
    else if (a.status === 'done') btns = '<button class="dmg-btn dmg-btn-primary dmg-btn-sm" onclick="DMG.capaVerify(\'' + a.id + '\')">ตรวจผลและยืนยัน</button>';
    return '<div class="dmg-capa-item">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">'
      + '<div><b style="font-size:13px">' + (a.action_type === 'immediate' ? '🔧 เฉพาะหน้า' : '🛡️ ป้องกันซ้ำ') + '</b>'
        + '<p style="font-size:13px;margin:4px 0;white-space:pre-wrap">' + DMG._.esc(a.description) + '</p>'
        + '<div class="dmg-muted">ผู้รับผิดชอบ ' + DMG._.esc(a.owner_username || '—') + ' (' + DMG._.esc(DMG._.deptName(a.department_code)) + ')'
          + (a.due_at ? ' · กำหนด ' + DMG._.fmtD(a.due_at) : '') + '</div></div>'
      + DMG._.badge(sm, cls) + '</div>'
      + (a.completion_notes ? '<p style="font-size:12px;color:#475569;margin-top:6px"><b>ผลดำเนินการ:</b> ' + DMG._.esc(a.completion_notes) + '</p>' : '')
      + (a.verified_by ? '<div class="dmg-muted">ตรวจผลโดย ' + DMG._.esc(a.verified_by) + ' เมื่อ ' + DMG._.fmtDT(a.verified_at) + '</div>' : '')
      + (btns ? '<div style="margin-top:8px">' + btns + '</div>' : '') + '</div>';
  }
  function tabCapaHtml() {
    var html = '<div class="dmg-section-title"><i class="fas fa-screwdriver-wrench"></i> มาตรการแก้ไข (' + _curCase.capa.length + ')</div>';
    html += _curCase.capa.length ? _curCase.capa.map(capaItemHtml).join('') : '<p class="dmg-muted">ยังไม่มีมาตรการแก้ไข</p>';
    var staffOpts = '<option value="">— ระบุชื่อ —</option>' + DMG._.getStaff().map(function (s) {
      return '<option value="' + DMG._.esc(s.username) + '">' + DMG._.esc(s.display_name || s.username) + '</option>';
    }).join('');
    html += '<div class="dmg-section-title"><i class="fas fa-plus"></i> เพิ่มมาตรการแก้ไข</div>'
      + '<div class="dmg-row3">'
      + '<div class="dmg-field"><label class="dmg-label">ประเภท</label><select class="dmg-select" id="dmg-capa-type"><option value="immediate">แก้ไขเฉพาะหน้า</option><option value="preventive">ป้องกันการเกิดซ้ำ</option></select></div>'
      + '<div class="dmg-field"><label class="dmg-label">แผนกที่รับผิดชอบ</label><select class="dmg-select" id="dmg-capa-dept">' + DMG._.deptOptions('', true) + '</select></div>'
      + '<div class="dmg-field"><label class="dmg-label">ผู้รับผิดชอบ</label><select class="dmg-select" id="dmg-capa-owner">' + staffOpts + '</select></div>'
      + '</div>'
      + '<div class="dmg-field"><label class="dmg-label">รายละเอียดมาตรการ <span class="req">*</span></label><textarea class="dmg-textarea" id="dmg-capa-desc"></textarea></div>'
      + '<div class="dmg-field" style="max-width:220px"><label class="dmg-label">กำหนดวันเสร็จ</label><input type="date" class="dmg-input" id="dmg-capa-due"></div>'
      + '<button class="dmg-btn dmg-btn-sm" onclick="DMG.addCapa()"><i class="fas fa-save"></i> เพิ่มมาตรการ</button>';
    return html;
  }
  DMG.addCapa = function () {
    var desc = $('dmg-capa-desc').value.trim();
    if (!desc) { DMG._.toast('กรุณากรอกรายละเอียดมาตรการ', true); return; }
    var u = DMG._.me();
    DMG._.sb().from('dmg_corrective_actions').insert({
      case_id: _curCase.c.id, action_type: $('dmg-capa-type').value, description: desc,
      department_code: $('dmg-capa-dept').value || null, owner_username: $('dmg-capa-owner').value || null,
      due_at: $('dmg-capa-due').value ? DMG._.dateToISOEnd($('dmg-capa-due').value) : null, created_by: u.username
    }).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; }
      DMG._.toast('เพิ่มมาตรการแล้ว'); refreshCurCase();
    });
  };
  DMG.capaSetStatus = function (id, status) {
    var u = DMG._.me();
    DMG._.sb().from('dmg_corrective_actions').update({ status: status, last_actor: u.username }).eq('id', id).then(function (r) {
      if (r.error) { DMG._.toast(r.error.message, true); return; } refreshCurCase();
    });
  };
  DMG.capaComplete = function (id) {
    var notes = prompt('ผลการดำเนินการ (ระบุสั้นๆ):');
    if (notes == null) return;
    var u = DMG._.me();
    DMG._.sb().from('dmg_corrective_actions').update({
      status: 'done', completion_notes: notes.trim() || null, completed_at: new Date().toISOString(), last_actor: u.username
    }).eq('id', id).then(function (r) { if (r.error) { DMG._.toast(r.error.message, true); return; } refreshCurCase(); });
  };
  DMG.capaVerify = function (id) {
    var u = DMG._.me();
    DMG._.sb().from('dmg_corrective_actions').update({
      status: 'verified', verified_by: u.username, verified_at: new Date().toISOString(), last_actor: u.username
    }).eq('id', id).then(function (r) { if (r.error) { DMG._.toast(r.error.message, true); return; } refreshCurCase(); });
  };


  /* ── Tab 5: ประวัติเคส (Timeline) ── */
  function timelineItemHtml(l) {
    var label = DMG._.ACTION_LABELS[l.action] || l.action;
    var detail = '';
    if (l.action === 'status_changed') detail = (l.old_value ? DMG._.STATUS[l.old_value] ? DMG._.STATUS[l.old_value].th : l.old_value : '—') + ' → ' + (DMG._.STATUS[l.new_value] ? DMG._.STATUS[l.new_value].th : l.new_value);
    else if (l.old_value || l.new_value) detail = [l.old_value, l.new_value].filter(Boolean).join(' → ');
    var details = l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : '';
    return '<div class="dmg-tl-item">'
      + '<div class="dmg-tl-head">' + DMG._.esc(label) + '</div>'
      + '<div class="dmg-tl-meta">' + DMG._.esc(l.actor || 'ระบบ') + ' · ' + DMG._.fmtDT(l.created_at) + '</div>'
      + (detail ? '<div class="dmg-tl-body">' + DMG._.esc(detail) + '</div>' : '')
      + '</div>';
  }
  function tabTimelineHtml() {
    var html = '<div class="dmg-section-title"><i class="fas fa-clock-rotate-left"></i> ลำดับเหตุการณ์</div>';
    var logs = _curCase.logs.slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    html += logs.length ? '<div class="dmg-timeline">' + logs.map(timelineItemHtml).join('') + '</div>' : '<p class="dmg-muted">ยังไม่มีประวัติ</p>';

    html += '<div class="dmg-section-title"><i class="fas fa-envelope"></i> ประวัติการส่งอีเมล (' + _curCase.emails.length + ')</div>';
    if (_curCase.emails.length) {
      html += '<div class="dmg-table-wrap"><table class="dmg-table" style="min-width:600px"><thead><tr><th>วันที่</th><th>ประเภท</th><th>ถึง</th><th>สถานะ</th><th></th></tr></thead><tbody>';
      _curCase.emails.slice().reverse().forEach(function (e) {
        var sm = e.status === 'sent' ? ['green', 'ส่งสำเร็จ'] : e.status === 'failed' ? ['red', 'ส่งไม่สำเร็จ'] : ['amber', 'รอส่ง'];
        html += '<tr><td>' + DMG._.fmtDT(e.created_at) + '</td><td>' + DMG._.esc(DMG._.EMAIL_TYPES[e.email_type] || e.email_type || '—') + '</td>'
          + '<td>' + DMG._.esc(e.recipient) + '</td><td>' + DMG._.badge(sm[1], sm[0]) + (e.error_message ? '<div class="dmg-muted">' + DMG._.esc(e.error_message) + '</div>' : '') + '</td>'
          + '<td>' + (e.status !== 'sent' ? '<button class="dmg-btn dmg-btn-sm" onclick="DMG.retrySendEmail(\'' + e.id + '\')">ส่งใหม่</button>' : '') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    } else html += '<p class="dmg-muted">ยังไม่มีการส่งอีเมล</p>';
    return html;
  }
  DMG.retrySendEmail = function (id) {
    var btn = event && event.target;
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังส่ง...'; }
    sendEmailViaFunction(id).then(function () { refreshCurCase(); }).catch(function (e) {
      DMG._.toast('ส่งไม่สำเร็จ: ' + e.message, true); refreshCurCase();
    });
  };

  /* ═══════════════════════════ ระบบอีเมล ═══════════════════════════ */
  var DMG_EDGE_BASE = 'https://akazjfgbnzhykhgeenye.supabase.co/functions/v1/dmg-send-email';

  function buildEmailTemplate(type, deptCode) {
    var c = _curCase.c;
    var dept = DMG._.deptName(deptCode);
    var company = DMG._.CFG.company;
    var lines = {
      request_review: {
        subject: '[Damage Report] ' + c.case_number + ' - ขอให้ตรวจสอบสินค้าเสียหาย',
        body: 'เรียน ' + dept + '\n\n' + company + 'ได้รับแจ้งเหตุสินค้าเสียหาย เลขที่เคส ' + c.case_number + '\n\n'
          + 'ข้อมูลสินค้า: ' + (c.product_name || '-') + ' / ' + (c.product_code || '-') + ' / Lot ' + (c.lot_number || '-') + '\n'
          + 'จำนวนที่เสียหาย: ' + (c.damaged_quantity || 0) + ' ' + (c.unit || '') + '\n'
          + 'วันที่และเวลาที่พบเหตุ: ' + DMG._.fmtDT(c.incident_datetime) + '\n'
          + 'จุดที่พบเหตุ: ' + (c.incident_location || '-') + '\n'
          + 'ฝ่ายที่ขอให้ตรวจสอบ: ' + dept + '\n'
          + (c.due_at ? 'กำหนดส่งผลตรวจสอบ: ' + DMG._.fmtD(c.due_at) + '\n' : '') + '\n'
          + 'รายละเอียดเหตุการณ์:\n' + (c.symptom || '-') + '\n\n'
          + 'กรุณาตรวจสอบข้อเท็จจริงและหลักฐาน พร้อมบันทึกผลการตรวจสอบ สาเหตุ และแนวทางป้องกันการเกิดซ้ำในระบบภายในกำหนดเวลา\n\n'
          + 'หมายเหตุ: อีเมลนี้เป็นการขอให้ตรวจสอบข้อเท็จจริง ไม่ใช่การสรุปว่าฝ่ายใดเป็นผู้กระทำผิด\n\nขอบคุณ'
      },
      request_info: {
        subject: '[Damage Report] ' + c.case_number + ' - ขอข้อมูลเพิ่มเติม',
        body: 'เรียน ' + (c.reporter_name || c.reporter_username) + '\n\nเกี่ยวกับเคส ' + c.case_number + '\n\n'
          + 'เจ้าหน้าที่ขอข้อมูลเพิ่มเติม:\n' + (c.status_reason || '-') + '\n\nขอบคุณ'
      },
      request_approve: {
        subject: '[Damage Report] ' + c.case_number + ' - ขออนุมัติแนวทางแก้ไข',
        body: 'เรียน ผู้อนุมัติ\n\nเคส ' + c.case_number + ' ผ่านการสอบสวนแล้ว\n\n'
          + 'สาเหตุราก: ' + (c.root_cause || '-') + '\nข้อสรุป: ' + DMG._.conclusionLabel(c.conclusion) + '\nเหตุผล: ' + (c.conclusion_reason || '-') + '\n\n'
          + 'กรุณาพิจารณาอนุมัติแนวทางแก้ไข\n\nขอบคุณ'
      },
      result: {
        subject: '[Damage Report] ' + c.case_number + ' - แจ้งผลการสอบสวน',
        body: 'เรียน ' + (c.reporter_name || c.reporter_username) + '\n\nผลการสอบสวนเคส ' + c.case_number + '\n\n'
          + 'ข้อสรุป: ' + DMG._.conclusionLabel(c.conclusion) + '\nสาเหตุราก: ' + (c.root_cause || '-') + '\n\nขอบคุณ'
      },
      closed: {
        subject: '[Damage Report] ' + c.case_number + ' - ปิดเคสแล้ว',
        body: 'เรียน ' + (c.reporter_name || c.reporter_username) + '\n\nเคส ' + c.case_number + ' ได้รับการปิดเรียบร้อยแล้ว\n\n'
          + 'ข้อสรุป: ' + DMG._.conclusionLabel(c.conclusion) + '\n\nขอบคุณ'
      }
    };
    return lines[type] || { subject: '[Damage Report] ' + c.case_number, body: '' };
  }

  DMG.openEmailCompose = function (type, deptCode) {
    injectCss();
    var tpl = buildEmailTemplate(type, deptCode);
    var back = $('dmg-email-backdrop');
    if (!back) {
      back = document.createElement('div'); back.id = 'dmg-email-backdrop'; back.className = 'dmg-modal-backdrop'; back.style.zIndex = '9995';
      document.body.appendChild(back);
    }
    var deptStaff = DMG._.getStaff().filter(function (s) { return !deptCode || s.department_code === deptCode; });
    var defaultTo = deptStaff.length ? deptStaff[0].email || '' : '';
    back.style.display = 'flex';
    back.innerHTML = '<div class="dmg-modal" style="max-width:600px">'
      + '<div class="dmg-modal-hd"><b>แจ้งทางอีเมล — ' + DMG._.esc(DMG._.EMAIL_TYPES[type] || '') + '</b><button class="dmg-x" onclick="DMG.closeEmailCompose()"><i class="fas fa-times"></i></button></div>'
      + '<div class="dmg-modal-body">'
      + '<div class="dmg-field"><label class="dmg-label">To <span class="req">*</span></label><input class="dmg-input" id="dmg-email-to" value="' + DMG._.esc(defaultTo) + '" placeholder="email@example.com"></div>'
      + '<div class="dmg-field"><label class="dmg-label">CC</label><input class="dmg-input" id="dmg-email-cc" placeholder="คั่นด้วยจุลภาคถ้ามีหลายคน"></div>'
      + '<div class="dmg-field"><label class="dmg-label">Subject</label><input class="dmg-input" id="dmg-email-subject" value="' + DMG._.esc(tpl.subject) + '"></div>'
      + '<div class="dmg-field"><label class="dmg-label">เนื้อหา</label><textarea class="dmg-textarea" id="dmg-email-body" style="min-height:220px">' + DMG._.esc(tpl.body) + '</textarea></div>'
      + '<div id="dmg-email-preview" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:13px;white-space:pre-wrap;margin-bottom:14px"></div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end">'
      + '<button class="dmg-btn" onclick="DMG.previewEmail()"><i class="fas fa-eye"></i> Preview</button>'
      + '<button class="dmg-btn dmg-btn-primary" id="dmg-email-send-btn" onclick="DMG.sendEmailNow(\'' + type + '\')"><i class="fas fa-paper-plane"></i> Send Email</button>'
      + '</div></div></div>';
    back.setAttribute('data-click-close', '1');
    back.onclick = function (e) { if (e.target === back) DMG.closeEmailCompose(); };
  };
  DMG.closeEmailCompose = function () { var b = $('dmg-email-backdrop'); if (b) b.style.display = 'none'; };
  DMG.previewEmail = function () {
    var p = $('dmg-email-preview');
    p.style.display = 'block';
    p.innerHTML = '<b>To:</b> ' + DMG._.esc($('dmg-email-to').value) + '\n<b>Subject:</b> ' + DMG._.esc($('dmg-email-subject').value) + '\n\n' + DMG._.esc($('dmg-email-body').value);
  };
  DMG.sendEmailNow = function (type) {
    var to = $('dmg-email-to').value.trim();
    if (!to || to.indexOf('@') < 0) { DMG._.toast('กรุณากรอกอีเมลผู้รับที่ถูกต้อง', true); return; }
    var subject = $('dmg-email-subject').value.trim();
    var body = $('dmg-email-body').value;
    var cc = $('dmg-email-cc').value.trim();
    var u = DMG._.me();
    var btn = $('dmg-email-send-btn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...';

    DMG._.sb().from('dmg_email_logs').insert({
      case_id: _curCase.c.id, recipient: to, cc: cc || null, subject: subject, body: body,
      email_type: type, status: 'pending', sent_by: u.username
    }).select('id').single().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return sendEmailViaFunction(r.data.id);
    }).then(function (res) {
      if (res.ok && res.status === 'sent') { DMG._.toast('ส่งอีเมลสำเร็จ ✅'); DMG.closeEmailCompose(); }
      else { DMG._.toast('บันทึกคำขอส่งแล้ว แต่ส่งไม่สำเร็จ: ' + (res.error || 'ไม่ทราบสาเหตุ'), true); }
      refreshCurCase();
    }).catch(function (e) {
      DMG._.toast('ส่งไม่สำเร็จ: ' + e.message, true);
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
    });
  };
  // เรียก Edge Function จริง — ถ้าเรียกไม่ถึง (ยังไม่ deploy) ให้คืนสถานะ failed ที่ชัดเจน ไม่ throw ขึ้นจอดิบ
  function sendEmailViaFunction(emailLogId) {
    return fetch(DMG_EDGE_BASE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_log_id: emailLogId })
    }).then(function (res) { return res.json().catch(function () { return {}; }); })
      .catch(function () {
        return { ok: false, status: 'failed', error: 'เรียก Edge Function ไม่สำเร็จ (ยังไม่ได้ deploy หรือเครือข่ายขัดข้อง)' };
      });
  }
  DMG._.sendEmailViaFunction = sendEmailViaFunction;


  /* ═══════════════════════════ Dashboard สรุปผล (ผู้บริหาร) ═══════════════════════════ */
  DMG.openDashboard = function () {
    injectCss();
    var back = $('dmg-modal-backdrop');
    if (!back) {
      back = document.createElement('div'); back.id = 'dmg-modal-backdrop'; back.className = 'dmg-modal-backdrop'; back.style.display = 'none';
      back.innerHTML = '<div class="dmg-modal" id="dmg-modal-inner"></div>';
      back.addEventListener('click', function (e) { if (e.target === back) DMG.closeCaseDetail(); });
      document.body.appendChild(back);
    }
    back.style.display = 'flex';
    $('dmg-modal-inner').innerHTML = '<div class="dmg-modal-body"><div class="dmg-empty"><i class="fas fa-spinner fa-spin"></i></div></div>';
    Promise.all([DMG._.loadDepts(), _caseList.length ? Promise.resolve(_caseList) : loadCaseList()]).then(function (res) {
      renderDashboard(res[1].filter(function (c) { return !c.is_demo || _caseFilters.showDemo; }));
    });
  };
  function renderDashboard(rows) {
    var byDept = {}, byType = {}, byCause = {}, byDay = {}, skuCount = {};
    var totalVal = 0;
    rows.forEach(function (c) {
      var d = c.department_code || '—'; byDept[d] = (byDept[d] || 0) + 1;
      var t = DMG._.incidentLabel(c.incident_type); byType[t] = (byType[t] || 0) + 1;
      if (c.root_cause_category) byCause[c.root_cause_category] = (byCause[c.root_cause_category] || 0) + 1;
      var day = (c.created_at || '').slice(0, 10); if (day) byDay[day] = (byDay[day] || 0) + 1;
      if (c.product_code) skuCount[c.product_code] = (skuCount[c.product_code] || 0) + 1;
      totalVal += Number(c.estimated_damage_value) || 0;
    });
    function barList(obj, limit) {
      var entries = Object.keys(obj).map(function (k) { return [k, obj[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      if (limit) entries = entries.slice(0, limit);
      var max = entries.length ? entries[0][1] : 1;
      return entries.map(function (e) {
        var pct = Math.round(e[1] / max * 100);
        return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span>' + DMG._.esc(e[0]) + '</span><b>' + e[1] + '</b></div>'
          + '<div style="height:6px;background:#f1f5f9;border-radius:4px"><div style="height:100%;width:' + pct + '%;background:#1d4ed8;border-radius:4px"></div></div></div>';
      }).join('') || '<p class="dmg-muted">ไม่มีข้อมูล</p>';
    }
    var noCause = rows.filter(function (c) { return !c.root_cause; }).length;
    var repeatSku = Object.keys(skuCount).filter(function (k) { return skuCount[k] > 1; }).length;
    var overdue = rows.filter(DMG._.isOverdue).length;
    var closedOnTime = rows.filter(function (c) { return c.status === 'Closed' && c.due_at && c.closed_at && new Date(c.closed_at) <= new Date(c.due_at); }).length;
    var closedTotal = rows.filter(function (c) { return c.status === 'Closed'; }).length;
    var onTimeRate = closedTotal ? Math.round(closedOnTime / closedTotal * 100) : 0;

    var inner = $('dmg-modal-inner');
    inner.innerHTML = '<div class="dmg-modal-hd"><b><i class="fas fa-chart-pie"></i> Dashboard สรุปผลสินค้าเสียหาย</b>'
      + '<div style="display:flex;gap:8px"><button class="dmg-btn dmg-btn-sm" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff" onclick="DMG.exportCsv()"><i class="fas fa-download"></i> Export CSV</button>'
      + '<button class="dmg-x" onclick="DMG.closeCaseDetail()"><i class="fas fa-times"></i></button></div></div>'
      + '<div class="dmg-modal-body">'
      + kpiCardsHtml(rows)
      + '<div class="dmg-kpi-grid" style="margin-top:-6px">'
        + '<div class="dmg-kpi' + (noCause ? ' alert' : '') + '"><div class="n">' + noCause + '</div><div class="l">ยังหาต้นเหตุไม่ได้</div></div>'
        + '<div class="dmg-kpi"><div class="n">' + repeatSku + '</div><div class="l">สินค้าที่เสียหายซ้ำ (SKU)</div></div>'
        + '<div class="dmg-kpi"><div class="n">' + onTimeRate + '%</div><div class="l">ปิดเคสทันกำหนด</div></div>'
      + '</div>'
      + '<div class="dmg-row2">'
      + '<div><div class="dmg-section-title">จำนวนเหตุการณ์แยกตามแผนกที่พบ</div>' + barList(byDept) + '</div>'
      + '<div><div class="dmg-section-title">จำนวนแยกตามประเภทเหตุการณ์</div>' + barList(byType) + '</div>'
      + '</div>'
      + '<div class="dmg-row2">'
      + '<div><div class="dmg-section-title">สาเหตุรากที่พบมากที่สุด</div>' + barList(byCause, 8) + '</div>'
      + '<div><div class="dmg-section-title">สินค้าที่เสียหายซ้ำบ่อย (SKU)</div>' + barList(skuCount, 8) + '</div>'
      + '</div>'
      + '<div class="dmg-muted">หมายเหตุ: "แผนกที่พบเหตุ" ด้านบนคือแผนกของผู้แจ้ง ไม่ใช่แผนกที่สรุปว่าเกี่ยวข้องกับสาเหตุ — ดูข้อสรุปจริงได้ในแต่ละเคส</div>'
      + '</div>';
  }
  DMG.exportCsv = function () {
    var rows = applyFilters(_caseList);
    var headers = ['case_number', 'created_at', 'status', 'priority', 'department_code', 'incident_type',
      'product_code', 'product_name', 'lot_number', 'damaged_quantity', 'unit', 'estimated_damage_value',
      'root_cause', 'conclusion', 'reporter_name', 'due_at', 'closed_at'];
    var csv = '﻿' + headers.join(',') + '\n' + rows.map(function (r) {
      return headers.map(function (h) {
        var v = r[h] == null ? '' : String(r[h]);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'damage_cases_' + DMG._.nowBkkLocal().slice(0, 10) + '.csv';
    a.click();
  };

  /* ═══════════════════════════ ปุ่มลอยสำหรับ WH Staff (ทีมโหลดสินค้า) ═══════════════════════════ */
  DMG.ensureWhFab = function () {
    injectCss(); // ไม่งั้นปุ่มไม่มี position:fixed/สี เลย กลายเป็นปุ่มเปล่าปนอยู่ในเนื้อหา มองไม่เห็น
    if ($('dmg-wh-fab')) return;
    var b = document.createElement('button');
    b.id = 'dmg-wh-fab'; b.className = 'dmg-fab'; b.title = 'แจ้งสินค้าเสียหาย';
    b.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
    b.onclick = function () { DMG.openReportForm(); };
    document.body.appendChild(b);
  };

})();
