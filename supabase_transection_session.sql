-- ── Session การนำเข้า transection_fg ────────────────────────────────────────
--
-- ตารางนี้เป็นการ "ต่อท้าย" ล้วน ไม่มีคีย์กันซ้ำ นำเข้าไฟล์เดิม 2 ครั้ง = ข้อมูลซ้ำทั้งชุด
-- (ตรวจแล้วเกิดขึ้นจริงกับ tst_pd_date = 2026-09-02 — นำเข้าซ้ำ 247 แถว)
--
-- หาคีย์ธรรมชาติมากันซ้ำไม่ได้:
--   · serial_number ว่างทุกแถวฝั่ง FG
--   · แถวที่เนื้อหาเหมือนกันเป๊ะเป็นของจริง (มัดน้ำหนักเท่ากันหลายมัดในล็อตเดียว)
-- จึงใช้ "session" แทน — ทุกแถวรู้ว่ามาจากการนำเข้าครั้งไหน แล้วปิดชุดที่ถูกแทนที่
--
-- ไม่ลบข้อมูลจริง ใช้ is_active = false — ย้อนได้และยังสอบกลับได้

alter table public.transection_fg
  add column if not exists import_session_id uuid,
  add column if not exists is_active boolean not null default true;

-- backfill ของเดิม: แถวที่นำเข้าพร้อมกัน (tst_pd_date + imported_at เดียวกัน) = session เดียวกัน
update public.transection_fg t
set import_session_id = s.sid
from (
  select tst_pd_date, imported_at, gen_random_uuid() as sid
  from public.transection_fg
  where import_session_id is null
  group by tst_pd_date, imported_at
) s
where t.import_session_id is null
  and t.tst_pd_date is not distinct from s.tst_pd_date
  and t.imported_at  is not distinct from s.imported_at;

create index if not exists idx_transection_fg_session
  on public.transection_fg (import_session_id);
create index if not exists idx_transection_fg_date_active
  on public.transection_fg (tst_pd_date) where is_active;

comment on column public.transection_fg.import_session_id is
  'รหัสการนำเข้าครั้งนั้น — ทุกแถวที่มาจากไฟล์เดียวกันใช้ค่าเดียวกัน';
comment on column public.transection_fg.is_active is
  'false = ถูกแทนที่ด้วยการนำเข้าครั้งใหม่ของวันเดียวกัน ทุกหน้าที่อ่านต้องกรอง is_active = true';
