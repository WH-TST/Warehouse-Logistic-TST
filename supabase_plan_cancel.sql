-- ══════════════════════════════════════════════════════════════════════
--  ยกเลิกแผน (ลบงานค้างทิ้ง) โดยไม่ลบข้อมูลจริง
--
--  ที่มา: งานค้างบางงานจะไม่มีวันได้ส่ง (ลูกค้ายกเลิก / เปิดแผนใหม่แทนแล้ว)
--         ต้องเอาออกจากรายการงานค้างได้ แต่ห้ามลบแถวทิ้ง เพราะจะไม่เหลือ
--         ร่องรอยว่าเคยวางแผนไว้แล้วเกิดอะไรขึ้น
--         การ์ดที่วันเดิมจะยังอยู่ แต่ขึ้นว่า "ถูกลบทิ้ง"
-- ══════════════════════════════════════════════════════════════════════

alter table public.logistic_plans
    add column if not exists cancelled_at    timestamptz,
    add column if not exists cancelled_by    text,
    add column if not exists origin_plan_date date;

comment on column public.logistic_plans.cancelled_at is
    'เวลาที่ยกเลิกแผน — การ์ดยังอยู่ที่วันเดิมแต่ขึ้นว่า "ถูกลบทิ้ง" และเลิกยกมาเป็นงานค้าง';
comment on column public.logistic_plans.cancelled_by is
    'ผู้ใช้ที่กดยกเลิก';
comment on column public.logistic_plans.origin_plan_date is
    'วันที่วางแผนครั้งแรก — บันทึกครั้งแรกที่งานค้างถูกย้ายวัน ถ้าไม่เก็บ พอ plan_date ถูกทับ จะไม่เหลือร่องรอยว่างานนี้ค้างมาจากวันไหน';

create index if not exists idx_logistic_plans_cancelled
    on public.logistic_plans (cancelled_at)
    where cancelled_at is not null;

-- ── ซ่อมข้อมูลที่ลากไปแล้วก่อนมีคอลัมน์นี้ ────────────────────────────
-- WLTST2609104 ถูกลากจาก 19/09 ไป 24/09 ตอนที่ยังไม่มีที่เก็บวันต้นทาง
update public.logistic_plans
   set origin_plan_date = date '2026-09-19'
 where plan_id = 'WLTST2609104' and origin_plan_date is null;

-- ตรวจผล
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'logistic_plans'
   and column_name in ('cancelled_at','cancelled_by','origin_plan_date','origin_truck_plate','origin_driver','carried_resolved_at')
 order by column_name;
