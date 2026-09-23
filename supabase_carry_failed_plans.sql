-- ══════════════════════════════════════════════════════════════════════
--  งานค้างส่ง — แผนที่ส่งไม่สำเร็จ ให้เลื่อนมาแสดงในวันนี้จนกว่าจะปิดงาน
--
--  ที่มา: เดิมพอตั้งสถานะเป็น failed แล้วข้อมูลค้างแบบนั้นตลอดไป
--         ไม่มีที่บันทึกว่า "วันถัดมาวิ่งซ้ำให้แล้ว" หรือ "ลูกค้ายกเลิกแล้ว"
--         ถ้าเลื่อนการ์ดมาวันนี้โดยไม่มีตัวปิด การ์ดค้างจะสะสมไม่มีวันหมด
-- ══════════════════════════════════════════════════════════════════════

-- 1) คอลัมน์ใหม่: เวลาที่ปิดงานค้าง (null = ยังค้างอยู่)
alter table public.logistic_plans
    add column if not exists carried_resolved_at timestamptz;

comment on column public.logistic_plans.carried_resolved_at is
    'เวลาที่ปิดงานค้างส่ง (null = ยังค้าง จะแสดงการ์ดในวันนี้)';

-- 2) ดัชนีช่วยให้ค้นงานค้างเร็ว (แผนที่ failed มีไม่เยอะ แต่ตารางจะโตขึ้นเรื่อยๆ)
create index if not exists idx_logistic_plans_carry
    on public.logistic_plans (status, carried_resolved_at)
    where status = 'failed';

-- 3) ปิดงานค้างเก่าทั้งหมดที่ค้างมานานกว่า 14 วัน
--    (20 รายการ ล่าสุด 23 มิ.ย. — จบไปนานแล้ว แค่ไม่มีใครเปลี่ยนสถานะ)
--    ถ้าไม่ปิด การ์ดค้างย้อนหลัง 5 เดือนจะโผล่มาในวันนี้ทั้งหมด
update public.logistic_plans
   set carried_resolved_at = now()
 where status = 'failed'
   and carried_resolved_at is null
   and plan_date < (current_date at time zone 'Asia/Bangkok') - interval '14 days';

-- ── ตรวจผล (SQL Editor ไม่โชว์ notice ต้องมี select ปิดท้าย) ──────────────
select plan_date,
       coalesce(truck_plate, driver_transport) as รถ,
       fail_reason                             as สาเหตุ,
       case when carried_resolved_at is null then 'ยังค้าง' else 'ปิดแล้ว' end as สถานะงานค้าง
  from public.logistic_plans
 where status = 'failed'
 order by plan_date desc;
