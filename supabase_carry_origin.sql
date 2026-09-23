-- ══════════════════════════════════════════════════════════════════════
--  เก็บ "ต้นทางแผน" ของงานค้างส่ง
--
--  ที่มา: งานที่ค้างมาจากวันก่อนต้องจัดใหม่ได้ (เปลี่ยนรถ/คนขับ) เพราะรถเดิม
--         อาจติดงานอื่นไปแล้ว แต่ถ้าแก้ทับลงไปเลยจะไม่มีทางรู้ว่าเดิมวางให้ใคร
--         จึงเก็บค่าเดิมไว้ครั้งแรกที่มีการแก้ แล้วแสดงบนการ์ดเป็นกรอบเล็กๆ
-- ══════════════════════════════════════════════════════════════════════

alter table public.logistic_plans
    add column if not exists origin_truck_plate text,
    add column if not exists origin_driver      text;

comment on column public.logistic_plans.origin_truck_plate is
    'ทะเบียนรถที่วางไว้ตอนแรก — บันทึกครั้งแรกที่งานค้างถูกย้ายไปรถคันอื่น';
comment on column public.logistic_plans.origin_driver is
    'คนขับที่วางไว้ตอนแรก — บันทึกครั้งแรกที่งานค้างถูกเปลี่ยนคนขับ';

-- ตรวจผล
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'logistic_plans'
   and column_name in ('origin_truck_plate','origin_driver','carried_resolved_at')
 order by column_name;
