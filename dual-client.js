// ══════════════════════════════════════════════════════════════════════════
//  Dual-DB Client — ครอบ Supabase client 2 ตัว (เก่า=อ่านอย่างเดียว, ใหม่=อ่าน+เขียน)
//
//  หลักการ (ตกลงกับ user แล้ว):
//  - ข้อมูลใหม่ทั้งหมด → เขียนลง DB ใหม่เท่านั้น (DB เก่าไม่ถูกแตะเลยตั้งแต่วันสวิตช์)
//  - แก้ไข record เก่า (เช่น อัปเดตสถานะจากคนขับ) → copy "ทั้งแถว" (เก่า + patch)
//    ไปเขียนที่ DB ใหม่ ด้วย PK เดิม — DB เก่ายังอยู่เหมือนเดิมไม่เปลี่ยน
//  - อ่านข้อมูล → ดึงทั้ง 2 DB มา merge ด้วย PK, ถ้าซ้ำกัน "DB ใหม่ชนะ"
//  - ลบ record เก่า → ลบต้นทางไม่ได้ (DB เก่า read-only) → ใช้ soft-delete:
//    copy ทั้งแถวไป DB ใหม่ พร้อม _dual_deleted_at = now() แล้วกรองออกตอนอ่าน
//
//  ⚠️ ไม่ใช่ทุกตารางใช้ "id" เป็น primary key! บางตัวใช้คอลัมน์อื่น (username, sku,
//  plan_id, ...) บางตัวเป็น composite key (onhand: sku+warehouse) — ดู TABLE_PK
//  ด้านล่าง ต้องอัปเดตถ้ามีตารางใหม่ที่ PK ไม่ใช่ "id"
//
//  ⚠️ upsert() รองรับทั้ง object เดี่ยวและ array หลายแถว (bulk save) — จับคู่แถวเดิม
//  ด้วย PK ที่อยู่ใน patch เอง ไม่ใช่ filterChain ต่างจาก update() ที่ patch เป็น
//  object เดี่ยวเสมอและใช้ filterChain (.eq()) บอกว่าจะแก้แถวไหน
//
//  ขอบเขต: ครอบเฉพาะ .from(table) query builder (select/insert/update/upsert/delete
//  + eq/neq/in/gt/gte/lt/lte/is/like/ilike/order/limit/range/single/maybeSingle)
//  ไม่ครอบ storage/realtime/rpc — จัดการแยกทีหลัง (ตกลงกับ user แล้วว่าทำ DB ก่อน)
//
//  ⚠️ ต้องมีคอลัมน์ _dual_deleted_at ในทุกตารางของ DB ใหม่ก่อนใช้งานจริง
//     (รัน add_dual_tracking_column.sql ก่อน)
// ══════════════════════════════════════════════════════════════════════════

function createDualSupabaseClient(oldClient, newClient) {

    var FILTER_METHODS = ['eq','neq','in','gt','gte','lt','lte','is','like','ilike','contains','filter','or','not'];
    var POST_METHODS = ['order','limit','range'];

    var TABLE_PK = {
        analytics_cache: ['cache_key'],
        app_config: ['key'],
        holidays: ['holiday_date'],
        inventory_daily_snapshot: ['snapshot_date'],
        logi_trucks: ['plate'],
        logistic_plans: ['plan_id'],
        onhand: ['sku', 'warehouse'],
        onhand_fg: ['item_number', 'warehouse'],
        onhand_semi: ['item_number', 'warehouse', 'serial_number'],
        production_block_cache: ['month_key'],
        production_plan_cache: ['month_key'],
        products: ['sku'],
        trip_logs: ['plan_id'],
        wms_users: ['username'],
        zone_configs: ['key'],
        zone_stock: ['zone', 'sku'],
    };
    function pkCols(table) { return TABLE_PK[table] || ['id']; }
    function rowKey(table, row) {
        return pkCols(table).map(function(c) { return row[c]; }).join('');
    }

    function applyChain(qb, chain) {
        chain.forEach(function(c) {
            if (qb && typeof qb[c[0]] === 'function') qb = qb[c[0]].apply(qb, c[1]);
        });
        return qb;
    }

    function mergedSelect(table, filterChain) {
        var qOld = applyChain(oldClient.from(table).select('*'), filterChain);
        var qNew = applyChain(newClient.from(table).select('*'), filterChain);
        return Promise.all([qOld, qNew]).then(function(res) {
            var rOld = res[0] || {}, rNew = res[1] || {};
            var oldRows = rOld.data || [];
            var newRows = rNew.data || [];
            var byId = {};
            oldRows.forEach(function(r) { if (r) byId[rowKey(table, r)] = r; });
            newRows.forEach(function(r) { if (r) byId[rowKey(table, r)] = r; }); // ใหม่ชนะ
            var merged = Object.keys(byId).map(function(k) { return byId[k]; })
                .filter(function(r) { return !r._dual_deleted_at; });
            var err = (rNew.error && oldRows.length === 0) ? rNew.error : null;
            return { rows: merged, error: err };
        });
    }

    function applyOrder(rows, args) {
        var col = args[0], opts = args[1] || {};
        var asc = opts.ascending !== false;
        rows.sort(function(a, b) {
            var av = a[col], bv = b[col];
            if (av == null && bv == null) return 0;
            if (av == null) return asc ? -1 : 1;
            if (bv == null) return asc ? 1 : -1;
            if (av < bv) return asc ? -1 : 1;
            if (av > bv) return asc ? 1 : -1;
            return 0;
        });
        return rows;
    }

    function makeBuilder(table) {
        var op = null, opArgs = null;
        var filterChain = [];
        var postChain = [];
        var wantSingle = false, wantMaybeSingle = false;

        var builder = {};

        ['select', 'insert', 'update', 'upsert', 'delete'].forEach(function(opName) {
            builder[opName] = function() {
                op = opName; opArgs = Array.prototype.slice.call(arguments);
                return builder;
            };
        });

        FILTER_METHODS.forEach(function(m) {
            builder[m] = function() {
                filterChain.push([m, Array.prototype.slice.call(arguments)]);
                return builder;
            };
        });

        POST_METHODS.forEach(function(m) {
            builder[m] = function() {
                postChain.push([m, Array.prototype.slice.call(arguments)]);
                return builder;
            };
        });

        builder.single = function() { wantSingle = true; return builder; };
        builder.maybeSingle = function() { wantMaybeSingle = true; return builder; };

        function finalizeRows(rows) {
            postChain.forEach(function(c) {
                if (c[0] === 'order') rows = applyOrder(rows, c[1]);
                else if (c[0] === 'limit') rows = rows.slice(0, c[1][0]);
                else if (c[0] === 'range') rows = rows.slice(c[1][0], c[1][1] + 1);
            });
            rows.forEach(function(r) { if (r && ('_dual_deleted_at' in r)) delete r._dual_deleted_at; });
            return rows;
        }

        async function execute() {
            if (op === 'select') {
                var res = await mergedSelect(table, filterChain);
                var rows = finalizeRows(res.rows);
                if (wantSingle) return { data: rows[0] || null, error: rows.length ? null : (res.error || { message: 'No rows found' }) };
                if (wantMaybeSingle) return { data: rows[0] || null, error: res.error || null };
                return { data: rows, error: res.error || null };
            }

            if (op === 'insert') {
                // ข้อมูลใหม่ล้วนๆ (object หรือ array) → เข้า DB ใหม่ตรงๆ ไม่ต้อง merge
                // ⚠️ ต้อง apply(qb, ...) ไม่ใช่ apply(null, ...) — insert() พึ่ง this
                // internal ของ query builder ถ้า this=null จะพังทันที (bug ที่แก้ไปแล้ว)
                var qbIns = newClient.from(table);
                return qbIns.insert.apply(qbIns, opArgs);
            }

            if (op === 'update') {
                // update(patch).eq(...) — patch เป็น object เดี่ยวเสมอ, filterChain บอกว่าแก้แถวไหน
                // (อาจกรองด้วยคอลัมน์ใดก็ได้ ไม่ต้องเป็น PK) — copy ทั้งแถวเดิม+patch ไปเขียน
                var patch1 = opArgs[0] || {};
                var pks1 = pkCols(table);
                var found1 = await mergedSelect(table, filterChain);
                var fullRows1 = found1.rows.map(function(row) {
                    var fullRow = Object.assign({}, row, patch1);
                    delete fullRow._dual_deleted_at;
                    return fullRow;
                });
                if (!fullRows1.length) return { data: null, error: null };
                var wr1 = await newClient.from(table).upsert(fullRows1, { onConflict: pks1.join(',') });
                return { data: null, error: wr1.error || null };
            }

            if (op === 'upsert') {
                // upsert(rowOrRows, {onConflict}) — รองรับทั้ง object เดี่ยวและ array หลายแถว (bulk save)
                // จับคู่แถวเดิมด้วย PK ที่อยู่ใน patch เอง (ไม่ใช่ filterChain) แล้ว copy ทั้งแถว
                var patchInput = opArgs[0] || {};
                var patchArray = Array.isArray(patchInput) ? patchInput : [patchInput];
                var pks2 = pkCols(table);
                var found2;
                if (filterChain.length && patchArray.length === 1) {
                    found2 = await mergedSelect(table, filterChain);
                } else if (pks2.length === 1) {
                    var pkVals = patchArray.map(function(p) { return p[pks2[0]]; }).filter(function(v) { return v != null; });
                    found2 = pkVals.length ? await mergedSelect(table, [['in', [pks2[0], pkVals]]]) : { rows: [] };
                } else {
                    // composite PK — ตารางกลุ่มนี้ไม่ใหญ่ ดึงทั้งตารางมาจับคู่ได้ไม่กระทบ perf
                    found2 = await mergedSelect(table, []);
                }
                var byKey2 = {};
                found2.rows.forEach(function(r) { byKey2[rowKey(table, r)] = r; });
                var fullRows2 = patchArray.map(function(patch) {
                    var existing = byKey2[rowKey(table, patch)];
                    var fullRow = existing ? Object.assign({}, existing, patch) : Object.assign({}, patch);
                    delete fullRow._dual_deleted_at;
                    return fullRow;
                });
                var wr2 = await newClient.from(table).upsert(fullRows2, { onConflict: pks2.join(',') });
                return { data: null, error: wr2.error || null };
            }

            if (op === 'delete') {
                // ลบ record เก่า/ใหม่ = soft-delete — copy ทั้งแถว + ตั้งเวลาไปที่ DB ใหม่ (bulk write เดียว)
                var pksDel = pkCols(table);
                var foundDel = await mergedSelect(table, filterChain);
                var tombs = foundDel.rows.map(function(row) {
                    return Object.assign({}, row, { _dual_deleted_at: new Date().toISOString() });
                });
                if (!tombs.length) return { data: null, error: null };
                var wrDel = await newClient.from(table).upsert(tombs, { onConflict: pksDel.join(',') });
                return { data: null, error: wrDel.error || null };
            }

            return { data: null, error: { message: 'ยังไม่เรียก .select()/.insert()/.update()/.upsert()/.delete()' } };
        }

        builder.then = function(resolve, reject) { return execute().then(resolve, reject); };
        builder.catch = function(reject) { return execute().catch(reject); };

        return builder;
    }

    return {
        from: makeBuilder,
        storage: newClient.storage,
        auth: newClient.auth,
        channel: function() { return newClient.channel.apply(newClient, arguments); },
        removeChannel: function() { return newClient.removeChannel.apply(newClient, arguments); },
    };
}

window.createDualSupabaseClient = createDualSupabaseClient;
