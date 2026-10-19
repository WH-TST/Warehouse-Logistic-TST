/* ─────────────────────────────────────────────────────────────────────────
   คิวงานพัฒนาระบบ (Dev Queue)

   รับคำขอจากทุกแผนกไว้ที่เดียว เรียงตามความคุ้ม และติดตามว่าทำถึงไหน
   ตารางเดียว: dev_queue  (ดู supabase/migrations/*_dev_queue.sql)

   ⚠ จำกัดงาน "กำลังทำ" ไว้ 2 โดยตั้งใจ — คอขวดคือเวลาคนทำ ไม่ใช่จำนวนงาน
     เกินแล้วขึ้นเตือน แต่ไม่บล็อก เพราะบางวันมีงานด่วนแทรกจริง
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var DQ = window.DQ = {};

  function $(id) { return document.getElementById(id); }
  function sb() { return window._sb; }
  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function toast(msg, bad) {
    if (window.DMG && window.DMG._ && window.DMG._.toast) return window.DMG._.toast(msg, bad);
    alert(msg);
  }
  function me() {
    var u = window._cu || {};
    return { username: u.username || '', name: u.name || u.username || '', isAdmin: !!u.isAdmin };
  }

  var STAGES = [
    { k: 'new',    th: 'เข้ามาใหม่ ยังไม่ตัดสิน', c: '#1d4ed8' },
    { k: 'next',   th: 'คิวถัดไป',                c: '#b45309' },
    { k: 'doing',  th: 'กำลังทำ',                 c: '#c2410c', wip: 2 },
    { k: 'verify', th: 'รอผู้ขอยืนยัน',           c: '#1d4ed8' },
    { k: 'done',   th: 'เสร็จแล้ว',               c: '#0f766e' },
    { k: 'park',   th: 'พักไว้ / ยังไม่ทำ',        c: '#64748b' }
  ];
  var SYSTEMS = ['WMS', 'ผลิต', 'ทั้งสองระบบ'];
  var DEPTS   = ['คลังสินค้า', 'ฝ่ายผลิต', 'จัดส่ง', 'คุณภาพ', 'ขาย', 'ผู้บริหาร', 'ช่างซ่อมบำรุง'];
  var EFFORT  = { 1: 'ชั่วโมง', 2: 'วัน', 3: 'สัปดาห์' };
  var IMPACT  = { 1: 'ต่ำ', 2: 'กลาง', 3: 'สูง' };

  var _items = [], _filter = { system: '', dept: '', q: '' }, _openId = null;

  /** ความคุ้ม = ผลกระทบสองเท่า ลบแรงที่ใช้ — ตั้งใจให้คิดง่าย กรอกเร็ว ไม่งั้นเลิกใช้ */
  function score(it) { return (it.impact || 2) * 2 - (it.effort || 2); }
  function scoreTag(it) {
    var s = score(it);
    if (s >= 4) return '<span class="dq-tag dq-hi">คุ้มสูง</span>';
    if (s >= 2) return '<span class="dq-tag">คุ้มกลาง</span>';
    return '<span class="dq-tag dq-lo">คุ้มต่ำ</span>';
  }
  function daysAgo(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function ageText(it) {
    if (it.stage === 'done') {
      var d = daysAgo(it.done_at);
      return d == null ? '' : 'เสร็จเมื่อ ' + (d <= 0 ? 'วันนี้' : d + ' วันก่อน');
    }
    var a = daysAgo(it.created_at);
    return a == null ? '' : 'ขอมา ' + (a <= 0 ? 'วันนี้' : a + ' วัน');
  }

  function injectCss() {
    if ($('dq-css')) return;
    var st = document.createElement('style'); st.id = 'dq-css';
    st.textContent = [
      '#view-dev-queue-content{font-size:14px}',
      '.dq-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px}',
      '.dq-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px}',
      '.dq-kpi .k{font-size:11.5px;color:#64748b;font-weight:700}',
      '.dq-kpi .v{font-size:26px;font-weight:900;line-height:1.2;color:#0f172a}',
      '.dq-kpi.warn .v{color:#c2410c}',
      '.dq-bar{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:14px;display:grid;gap:9px}',
      '.dq-row{display:flex;gap:8px;flex-wrap:wrap}',
      '.dq-in,.dq-sel{border:1.5px solid #e2e8f0;border-radius:9px;padding:9px 11px;font-size:14px;background:#f8fafc;color:#0f172a;font-family:inherit}',
      '.dq-in{flex:1;min-width:200px}',
      '.dq-ta{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px;font-size:14px;font-family:inherit;min-height:90px;background:#fff;color:#0f172a;line-height:1.6}',
      '.dq-btn{border:1.5px solid #e2e8f0;background:#f8fafc;color:#0f172a;border-radius:9px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:14px;font-family:inherit}',
      '.dq-btn:hover{border-color:#94a3b8}',
      '.dq-btn.pri{background:#0f172a;color:#fff;border-color:#0f172a}',
      '.dq-grp{margin-bottom:20px}',
      '.dq-ghead{display:flex;align-items:center;gap:9px;margin-bottom:8px;flex-wrap:wrap}',
      '.dq-dot{width:10px;height:10px;border-radius:3px;flex:0 0 auto}',
      '.dq-ghead b{font-size:15.5px;color:#0f172a}',
      '.dq-ghead .n{font-family:ui-monospace,monospace;font-size:12px;color:#94a3b8}',
      '.dq-wip{font-size:11.5px;color:#c2410c;font-weight:700}',
      '.dq-item{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #cbd5e1;border-radius:0 11px 11px 0;padding:11px 13px;margin-bottom:7px}',
      '.dq-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}',
      '.dq-m{flex:1;min-width:200px;cursor:pointer}',
      '.dq-t{font-weight:700;font-size:14.5px;display:block;color:#0f172a}',
      '.dq-item.done .dq-t{text-decoration:line-through;color:#94a3b8}',
      '.dq-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:5px}',
      '.dq-tag{font-size:11px;font-weight:700;border-radius:5px;padding:2px 7px;background:#f1f5f9;color:#475569;white-space:nowrap}',
      '.dq-tag.sys{font-family:ui-monospace,monospace}',
      '.dq-hi{background:#fdebe3;color:#9a3412}',
      '.dq-lo{background:#f1f5f9;color:#94a3b8}',
      '.dq-age{font-size:11.5px;color:#94a3b8;font-family:ui-monospace,monospace}',
      '.dq-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start}',
      '.dq-acts button{border:1px solid #e2e8f0;background:transparent;color:#475569;border-radius:8px;padding:6px 10px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}',
      '.dq-acts button:hover{border-color:#94a3b8;color:#0f172a}',
      '.dq-acts button.go{border-color:#c2410c;color:#c2410c}',
      '.dq-acts button.fin{border-color:#0f766e;color:#0f766e}',
      '.dq-detail{margin-top:10px;border-top:1px dashed #e2e8f0;padding-top:10px}',
      '.dq-detail .lbl{font-size:11.5px;font-weight:800;color:#64748b;margin-bottom:5px}',
      '.dq-pre{white-space:pre-wrap;word-break:break-word;font-size:13.5px;color:#334155;line-height:1.7;background:#f8fafc;border-radius:9px;padding:10px 12px}',
      '.dq-empty{font-size:13px;color:#94a3b8;padding:8px 2px}',
      '.dq-note{border:1px solid #e2e8f0;border-left:4px solid #b45309;background:#fff;border-radius:0 10px 10px 0;padding:12px 14px;margin-top:20px;font-size:13.5px;color:#475569}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ─────────────────────────── โหลด / บันทึก ─────────────────────────── */
  function load() {
    return sb().from('dev_queue').select('*').order('created_at', { ascending: false })
      .then(function (r) {
        if (r.error) throw new Error(r.error.message);
        _items = r.data || [];
        return _items;
      });
  }

  DQ.initQueue = function () {
    injectCss();
    var host = $('view-dev-queue-content');
    if (!host) return;
    host.innerHTML = '<div class="dq-empty"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด…</div>';
    load().then(render).catch(function (e) {
      // ห้ามกลืน error คิวรี — ถ้าโหลดไม่ได้ต้องเห็น ไม่ใช่เห็นคิวว่างแล้วนึกว่าไม่มีงาน
      host.innerHTML = '<div class="dq-note"><b>โหลดคิวงานไม่สำเร็จ</b><br>' + esc(e.message)
        + '<br><button class="dq-btn" style="margin-top:8px" onclick="DQ.initQueue()">ลองใหม่</button></div>';
      console.error('[DQ]', e);
    });
  };

  DQ.setFilter = function (k, v) { _filter[k] = v; render(); };

  DQ.add = function () {
    var t = $('dq-f-title'), v = t.value.trim();
    if (!v) { toast('พิมพ์ชื่องานก่อน', true); t.focus(); return; }
    var row = {
      title: v,
      detail: $('dq-f-detail').value.trim() || null,
      system: $('dq-f-sys').value,
      dept: $('dq-f-dept').value,
      requester: $('dq-f-req').value.trim() || null,
      impact: +$('dq-f-imp').value,
      effort: +$('dq-f-eff').value,
      stage: 'new',
      created_by: me().username || null
    };
    sb().from('dev_queue').insert(row).select('*').then(function (r) {
      if (r.error) { toast('เพิ่มไม่สำเร็จ: ' + r.error.message, true); return; }
      if (!r.data || !r.data.length) { toast('เพิ่มไม่สำเร็จ — ฐานข้อมูลไม่อนุญาต', true); return; }
      _items.unshift(r.data[0]);
      t.value = ''; $('dq-f-detail').value = ''; $('dq-f-req').value = '';
      toast('เพิ่มเข้าคิวแล้ว');
      render();
    });
  };

  DQ.move = function (id, to) {
    sb().from('dev_queue').update({ stage: to }).eq('id', id).select('*').then(function (r) {
      if (r.error) { toast('เปลี่ยนสถานะไม่สำเร็จ: ' + r.error.message, true); return; }
      if (!r.data || !r.data.length) { toast('เปลี่ยนสถานะไม่สำเร็จ', true); return; }
      for (var i = 0; i < _items.length; i++) if (_items[i].id === id) _items[i] = r.data[0];
      render();
    });
  };

  DQ.toggleDetail = function (id) { _openId = (_openId === id) ? null : id; render(); };

  DQ.editDetail = function (id) {
    var it = _items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    _openId = id;
    render(true);
  };

  DQ.saveDetail = function (id) {
    var ta = $('dq-edit-' + id);
    if (!ta) return;
    sb().from('dev_queue').update({ detail: ta.value.trim() || null }).eq('id', id).select('*')
      .then(function (r) {
        if (r.error) { toast('บันทึกไม่สำเร็จ: ' + r.error.message, true); return; }
        if (!r.data || !r.data.length) { toast('บันทึกไม่สำเร็จ', true); return; }
        for (var i = 0; i < _items.length; i++) if (_items[i].id === id) _items[i] = r.data[0];
        toast('บันทึกรายละเอียดแล้ว');
        render();
      });
  };

  /* ─────────────────────────── วาดหน้าจอ ─────────────────────────── */
  function opts(list, sel) {
    return list.map(function (x) {
      return '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('');
  }

  function render(editing) {
    var host = $('view-dev-queue-content');
    if (!host) return;
    var f = _filter;
    var vis = _items.filter(function (it) {
      if (f.system && it.system !== f.system) return false;
      if (f.dept && it.dept !== f.dept) return false;
      if (f.q) {
        var hay = ((it.title || '') + ' ' + (it.detail || '') + ' ' + (it.requester || '')).toLowerCase();
        if (hay.indexOf(f.q.toLowerCase()) < 0) return false;
      }
      return true;
    });
    var open = _items.filter(function (it) { return it.stage !== 'done' && it.stage !== 'park'; }).length;
    var doing = _items.filter(function (it) { return it.stage === 'doing'; }).length;
    var done = _items.filter(function (it) { return it.stage === 'done'; }).length;
    var park = _items.filter(function (it) { return it.stage === 'park'; }).length;

    host.innerHTML =
      '<div class="dq-kpis">'
        + kpi('งานค้างทั้งหมด', open)
        + kpi('กำลังทำ', doing, doing > 2)
        + kpi('เสร็จแล้ว', done)
        + kpi('พักไว้', park)
      + '</div>'

      + '<div class="dq-bar">'
        + '<div class="dq-row"><input class="dq-in" id="dq-f-title" placeholder="งานใหม่ — เช่น ซ่อมยอดป้ายไม่ลดหลังกดออกครบ"></div>'
        + '<textarea class="dq-ta" id="dq-f-detail" placeholder="รายละเอียดที่ต้องทำ (ไม่บังคับ) — เขียนยาวได้ เช่น เงื่อนไข หน้าจอไหน ใครเป็นคนบอก ตัวอย่างที่เจอ"></textarea>'
        + '<div class="dq-row">'
          + '<select class="dq-sel" id="dq-f-sys">' + opts(SYSTEMS) + '</select>'
          + '<select class="dq-sel" id="dq-f-dept">' + opts(DEPTS) + '</select>'
          + '<input class="dq-in" id="dq-f-req" style="flex:0 1 160px;min-width:130px" placeholder="คนขอ (ไม่บังคับ)">'
          + '<select class="dq-sel" id="dq-f-imp"><option value="3">ผลกระทบ สูง</option><option value="2" selected>ผลกระทบ กลาง</option><option value="1">ผลกระทบ ต่ำ</option></select>'
          + '<select class="dq-sel" id="dq-f-eff"><option value="1">แรง ชั่วโมง</option><option value="2" selected>แรง วัน</option><option value="3">แรง สัปดาห์</option></select>'
          + '<button class="dq-btn pri" onclick="DQ.add()"><i class="fas fa-plus"></i> เพิ่มเข้าคิว</button>'
        + '</div>'
      + '</div>'

      + '<div class="dq-row" style="margin-bottom:14px;align-items:center">'
        + '<input class="dq-in" style="flex:1 1 200px" placeholder="ค้นหาในชื่องานและรายละเอียด" value="' + esc(f.q) + '" oninput="DQ.setFilter(\'q\',this.value)">'
        + '<select class="dq-sel" onchange="DQ.setFilter(\'system\',this.value)"><option value="">ทุกระบบ</option>' + opts(SYSTEMS, f.system) + '</select>'
        + '<select class="dq-sel" onchange="DQ.setFilter(\'dept\',this.value)"><option value="">ทุกแผนก</option>' + opts(DEPTS, f.dept) + '</select>'
      + '</div>'

      + STAGES.map(function (st) { return groupHtml(st, vis, editing); }).join('')

      + '<div class="dq-note"><b>ทำไมจำกัด "กำลังทำ" ไว้ 2</b> '
        + 'คอขวดคือเวลาคนทำ ไม่ใช่จำนวนงาน เกินแล้วระบบเตือนแต่ไม่ห้าม เพราะบางวันมีงานด่วนแทรกจริง</div>';
  }

  function kpi(k, v, warn) {
    return '<div class="dq-kpi' + (warn ? ' warn' : '') + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div></div>';
  }

  function groupHtml(st, vis, editing) {
    var rows = vis.filter(function (it) { return it.stage === st.k; })
      .sort(function (a, b) { return score(b) - score(a) || new Date(a.created_at) - new Date(b.created_at); });
    var wip = (st.wip && rows.length > st.wip)
      ? '<span class="dq-wip">เกินที่ตั้งไว้ ' + st.wip + ' งาน — ทำพร้อมกันหลายอย่างจะไม่เสร็จสักอย่าง</span>' : '';
    return '<div class="dq-grp"><div class="dq-ghead"><span class="dq-dot" style="background:' + st.c + '"></span>'
      + '<b>' + esc(st.th) + '</b><span class="n">' + rows.length + '</span>' + wip + '</div>'
      + (rows.length
          ? rows.map(function (it) { return itemHtml(it, st, editing); }).join('')
          : '<div class="dq-empty">— ไม่มีงานในกลุ่มนี้ —</div>')
      + '</div>';
  }

  function itemHtml(it, st, editing) {
    var a = [];
    if (it.stage === 'new')    a = [['next', 'เข้าคิว', ''], ['park', 'พักไว้', '']];
    if (it.stage === 'next')   a = [['doing', 'เริ่มทำ', 'go'], ['park', 'พักไว้', '']];
    if (it.stage === 'doing')  a = [['verify', 'ทำเสร็จ ส่งให้ตรวจ', 'fin'], ['next', 'พักกลับคิว', '']];
    if (it.stage === 'verify') a = [['done', 'ผู้ขอยืนยันแล้ว', 'fin'], ['doing', 'ยังไม่ผ่าน', '']];
    if (it.stage === 'done')   a = [['doing', 'เปิดกลับ', '']];
    if (it.stage === 'park')   a = [['next', 'เอาเข้าคิว', '']];
    var acts = a.map(function (x) {
      return '<button class="' + x[2] + '" onclick="DQ.move(' + it.id + ',\'' + x[0] + '\')">' + esc(x[1]) + '</button>';
    }).join('');

    var isOpen = (_openId === it.id);
    var detail = '';
    if (isOpen && editing) {
      detail = '<div class="dq-detail"><div class="lbl">รายละเอียดที่ต้องทำ</div>'
        + '<textarea class="dq-ta" id="dq-edit-' + it.id + '">' + esc(it.detail || '') + '</textarea>'
        + '<div class="dq-acts" style="margin-top:8px">'
          + '<button class="fin" onclick="DQ.saveDetail(' + it.id + ')">บันทึก</button>'
          + '<button onclick="DQ.toggleDetail(' + it.id + ')">ยกเลิก</button></div></div>';
    } else if (isOpen) {
      detail = '<div class="dq-detail"><div class="lbl">รายละเอียดที่ต้องทำ</div>'
        + '<div class="dq-pre">' + (it.detail ? esc(it.detail) : '<span style="color:#94a3b8">ยังไม่ได้เขียนรายละเอียด</span>') + '</div>'
        + '<div class="dq-acts" style="margin-top:8px">'
          + '<button onclick="DQ.editDetail(' + it.id + ')"><i class="fas fa-pen"></i> แก้รายละเอียด</button></div></div>';
    }

    return '<div class="dq-item' + (it.stage === 'done' ? ' done' : '') + '" style="border-left-color:' + st.c + '">'
      + '<div class="dq-top">'
        + '<div class="dq-m" onclick="DQ.toggleDetail(' + it.id + ')">'
          + '<span class="dq-t">' + (it.detail ? '<i class="fas fa-align-left" style="font-size:11px;color:#94a3b8;margin-right:5px"></i>' : '') + esc(it.title) + '</span>'
          + '<div class="dq-meta">'
            + '<span class="dq-tag sys">' + esc(it.system) + '</span>'
            + '<span class="dq-tag">' + esc(it.dept) + '</span>'
            + (it.requester ? '<span class="dq-tag">ขอโดย ' + esc(it.requester) + '</span>' : '')
            + '<span class="dq-tag">ผลกระทบ ' + esc(IMPACT[it.impact] || '-') + '</span>'
            + '<span class="dq-tag">แรง ' + esc(EFFORT[it.effort] || '-') + '</span>'
            + scoreTag(it)
            + '<span class="dq-age">' + esc(ageText(it)) + '</span>'
          + '</div>'
        + '</div>'
        + '<div class="dq-acts">' + acts + '</div>'
      + '</div>' + detail + '</div>';
  }
})();
