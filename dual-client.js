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
//  ขอบเขต: ครอบเฉพาะ .from(table) query builder (select/insert/update/upsert/delete
//  + eq/neq/in/gt/gte/lt/lte/is/like/ilike/order/limit/range/single/maybeSingle)
//  ไม่ครอบ storage/realtime/rpc — จัดการแยกทีหลัง (ตกลงกับ user แล้วว่าทำ DB ก่อน)
//
//  ⚠️ ต้องมีคอลัมน์ _dual_deleted_at ในทุกตารางของ DB ใหม่ก่อนใช้งานจริง
//     (รัน add_dual_tracking_column.sql ก่อน)
// ══════════════════════════════════════════════════════════════════════════

function createDualSupabaseClient(oldClient, newClient) {

    // methods ที่ "กรอง" ว่าจะเอาแถวไหน — ส่งไปทั้ง 2 DB ตรงๆ ได้เลย
    var FILTER_METHODS = ['eq','neq','in','gt','gte','lt','lte','is','like','ilike','contains','filter','or','not'];
    // methods ที่ "จัดเรียง/ตัดจำนวน" — ต้องรอ merge 2 ฝั่งเสร็จก่อน ค่อยทำเองใน JS
    var POST_METHODS = ['order','limit','range'];

    // PK จริงของแต่ละตาราง (จาก information_schema.table_constraints ของ DB จริง)
    // ตารางที่ไม่อยู่ในนี้ fallback เป็น ['id']
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

    // หาแถวที่ merge แล้ว (เก่า+ใหม่, ใหม่ชนะ) ตาม filter chain ที่กำหนด — ใช้ทั้งตอน
    // select() ปกติ และตอน update/upsert/delete (ต้องรู้ก่อนว่าแถวเดิมหน้าตาเป็นยังไง)
    function mergedSelect(table, filterChain) {
        var qOld = applyChain(oldClient.from(table).select('*'), filterChain);
        // ฝั่งใหม่: ดึงมาทั้งหมดก่อน (รวมแถวที่ soft-delete ไว้ด้วย) เพื่อให้ tombstone
        // ทับแถวเก่าใน merge ได้ถูกต้อง แล้วค่อยกรองออกทีหลังตอน merge เสร็จ
        var qNew = applyChain(newClient.from(table).select('*'), filterChain);
        return Promise.all([qOld, qNew]).then(function(res) {
            var rOld = res[0] || {}, rNew = res[1] || {};
            var oldRows = rOld.data || [];
            var newRows = rNew.data || [];
            var byId = {};
            oldRows.forEach(function(r) { if (r) byId[rowKey(table, r)] = r; });
            newRows.forEach(function(r) { if (r) byId[rowKey(table, r)] = r; }); // ใหม่ชนะ
            var merged = Object.keys(byId).map(function(k) { return byId[k]; })
                .filter(function(r) { return !r._dual_deleted_at; }); // ตัดที่ถูก soft-delete ออก
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
        var filterChain = [];   // [[method, args], ...]  — เอาไปกรองแถวจริง
        var postChain = [];     // order/limit/range — ทำหลัง merge
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
            // เอาคอลัมน์ภายในออกก่อนคืนค่า ไม่ให้โค้ดเดิมงงกับ field แปลกปลอม
            rows.forEach(function(r) { if (r && ('_dual_deleted_at' in r)) delete r._dual_deleted_at; });
            return rows;
        }

        async function execute() {
            if (op === 'select') {
                var res = await mergedSelect(table, filterChain);
                var rows = finalizeRows(res.rows);
                if (wantSingle) {
                    return { data: rows[0] || null, error: rows.length ? null : (res.error || { message: 'No rows found' }) };
                }
                if (wantMaybeSingle) {
                    return { data: rows[0] || null, error: res.error || null };
                }
                return { data: rows, error: res.error || null };
            }

            if (op === 'insert') {
                // ข้อมูลใหม่ล้วนๆ → เข้า DB ใหม่ตรงๆ ไม่ต้อง merge อะไร
                return applyChain(newClient.from(table).insert.apply(null, opArgs), []).then(function(r) { return r; });
            }

            if (op === 'update' || op === 'upsert') {
                // แก้ record เก่า (หรือใหม่) — ต้องรู้แถวเดิมก่อน (merge เก่า+ใหม่) แล้ว copy
                // "ทั้งแถว" + patch ไปเขียน DB ใหม่ ตามที่ตกลงกันไว้ (ไม่ patch บางส่วน)
                var patch = opArgs[0] || {};
                var pks = pkCols(table);
                var patchHasAllPk = pks.every(function(c) { return patch[c] != null; });
                if (op === 'upsert' && !filterChain.length && patchHasAllPk) {
                    // upsert ตรงๆ ด้วย object ที่มี PK ครบ — หาแถวเดิมด้วย PK นั้น
                    filterChain = pks.map(function(c) { return ['eq', [c, patch[c]]]; });
                }
                var found = await mergedSelect(table, filterChain);
                var targets = found.rows;
                if (!targets.length && op === 'upsert') {
                    // ไม่มีแถวเดิมเลย = สร้างใหม่ล้วนๆ
                    targets = [Object.assign({}, patch)];
                }
                var writes = targets.map(function(row) {
                    var fullRow = Object.assign({}, row, patch);
                    delete fullRow._dual_deleted_at; // แก้ไข = ยืนยันว่ายังไม่ถูกลบ
                    return newClient.from(table).upsert(fullRow, { onConflict: pks.join(',') });
                });
                var results = await Promise.all(writes);
                var errRes = results.find(function(r) { return r && r.error; });
                return { data: null, error: errRes ? errRes.error : null };
            }

            if (op === 'delete') {
                // ลบ record เก่า/ใหม่ = soft-delete — copy ทั้งแถว + ตั้งเวลาไปที่ DB ใหม่
                var pksDel = pkCols(table);
                var foundDel = await mergedSelect(table, filterChain);
                var writesDel = foundDel.rows.map(function(row) {
                    var tomb = Object.assign({}, row, { _dual_deleted_at: new Date().toISOString() });
                    return newClient.from(table).upsert(tomb, { onConflict: pksDel.join(',') });
                });
                var resultsDel = await Promise.all(writesDel);
                var errResDel = resultsDel.find(function(r) { return r && r.error; });
                return { data: null, error: errResDel ? errResDel.error : null };
            }

            return { data: null, error: { message: 'ยังไม่เรียก .select()/.insert()/.update()/.upsert()/.delete()' } };
        }

        // thenable — ให้ใช้ await/​.then() แบบเดิมได้ทุกที่โดยไม่ต้องแก้โค้ดเรียกใช้
        builder.then = function(resolve, reject) { return execute().then(resolve, reject); };
        builder.catch = function(reject) { return execute().catch(reject); };

        return builder;
    }

    return {
        from: makeBuilder,
        // ส่วนอื่น (storage/auth/channel/rpc) ยังไม่ครอบ — ใช้ client ใหม่ตรงๆ ไปก่อน
        storage: newClient.storage,
        auth: newClient.auth,
        channel: function() { return newClient.channel.apply(newClient, arguments); },
        removeChannel: function() { return newClient.removeChannel.apply(newClient, arguments); },
    };
}

window.createDualSupabaseClient = createDualSupabaseClient;
