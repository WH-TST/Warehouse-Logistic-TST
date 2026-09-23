-- ══════════════════════════════════════════════════════════════════════
--  ปิดงานค้างเก่าค้างสะสม ก่อนเปิดใช้กฎ "แผนที่ไม่จบงานยกมาวันถัดไป"
--
--  ที่มา: ระบบเดิมไม่เคยบังคับให้ปิดงาน แผนที่ไม่มีใครกดอะไรเลยจึงค้างเป็น
--         planned / inprogress สะสมมาตั้งแต่กรกฎาคม พอเปิดกฎยกมาอัตโนมัติ
--         งานพวกนี้จะไหลมากองที่วันนี้ทั้งหมด
--
--  ตรวจก่อนรัน: ดูว่าจะปิดอะไรบ้าง
-- ══════════════════════════════════════════════════════════════════════
select plan_date,
       plan_id,
       coalesce(truck_plate, driver_transport) as รถ,
       status,
       job_type,
       (current_date at time zone 'Asia/Bangkok') - plan_date as ค้างมากี่วัน
  from public.logistic_plans
 where status <> 'success'
   and carried_resolved_at is null
   and plan_date < (current_date at time zone 'Asia/Bangkok') - interval '7 days'
 order by plan_date;

-- ── ปิดงานที่ค้างเกิน 7 วัน (48 แผนค้างเกิน 30 วัน + 11 แผน 8–30 วัน) ──
-- ไม่แตะสถานะเดิม แค่บอกว่า "เลิกยกมาแล้ว" การ์ดยังอยู่ที่วันของมันตามเดิม
update public.logistic_plans
   set carried_resolved_at = now()
 where status <> 'success'
   and carried_resolved_at is null
   and plan_date < (current_date at time zone 'Asia/Bangkok') - interval '7 days';

-- ตรวจผล: เหลืองานค้างที่จะยกมาวันนี้กี่แผน
select count(*) as งานค้างที่จะยกมา
  from public.logistic_plans
 where status <> 'success'
   and carried_resolved_at is null
   and plan_date < (current_date at time zone 'Asia/Bangkok')
   and job_type <> 'maintenance_pm';
