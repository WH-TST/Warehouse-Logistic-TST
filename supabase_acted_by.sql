-- ══════════════════════════════════════════════════════════════════════
--  บันทึกว่า "ใครเป็นคนกดสถานะ" — trip_logs.acted_by / shop_visits.acted_by
--
--  ที่มา: คนขับบางคนไม่กดสถานะหน้างาน สุดท้ายออฟฟิศต้องเข้าไปกดแทนผ่าน
--         Driver Monitor เวลาที่บันทึกได้จึงไม่ใช่เวลาที่เกิดขึ้นจริง
--         แต่ระบบไม่เก็บว่าใครกด รายงานสรุปการทำงานคนขับเลยแยกไม่ออกว่า
--         แถวไหนคนขับกดเอง แถวไหนคนอื่นกดให้
--
--  ค่าที่เขียน:
--    คนขับกดเอง        → username ของคนขับ
--    ออฟฟิศกดแทน       → 'ADMIN:<username>'
--    ข้อมูลเก่าก่อนมีคอลัมน์นี้ → null (รายงานจะไม่ติดป้ายอะไร)
-- ══════════════════════════════════════════════════════════════════════

alter table public.trip_logs   add column if not exists acted_by text;
alter table public.shop_visits add column if not exists acted_by text;

-- ออฟฟิศเปลี่ยนสถานะเองจากตารางรายการแผน / บล็อก — ไม่ผ่าน trip_logs เลย
alter table public.logistic_plans add column if not exists status_by text;

comment on column public.trip_logs.acted_by is
    'ผู้กดสถานะล่าสุด — ขึ้นต้นด้วย ADMIN: คือออฟฟิศกดแทนคนขับ';
comment on column public.shop_visits.acted_by is
    'ผู้กดถึงร้าน/ออกจากร้านล่าสุด — ขึ้นต้นด้วย ADMIN: คือออฟฟิศกดแทนคนขับ';
comment on column public.logistic_plans.status_by is
    'ผู้เปลี่ยนสถานะแผนล่าสุดจากฝั่งออฟฟิศ (ADMIN:<username>) — ถ้าเป็น null คือสถานะมาจากการทำงานของคนขับ';

-- ── ข้อมูลเก่าที่พอกู้ได้ ─────────────────────────────────────────────
-- Driver Monitor รุ่นก่อนเขียน driver_username = 'admin-override' ไว้ตอนเริ่มงาน
-- ยังไม่รู้ว่าใครกด แต่รู้ว่าไม่ใช่คนขับ
update public.trip_logs
   set acted_by = 'ADMIN:(ไม่ทราบผู้ใช้)'
 where acted_by is null and driver_username = 'admin-override';

-- ตรวจผล
select count(*) filter (where acted_by is null)            as ยังไม่มีข้อมูลผู้กด,
       count(*) filter (where acted_by like 'ADMIN:%')     as ออฟฟิศกดแทน,
       count(*) filter (where acted_by is not null
                          and acted_by not like 'ADMIN:%') as คนขับกดเอง
  from public.trip_logs;
