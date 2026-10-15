-- เก็บว่า "เจอตอนไหน" — ตอนโหลดสินค้า / ตอนนับสต๊อก / ตอนจัดพื้นที่
--
-- แยกจาก incident_location ที่บอกว่าเจอ "ที่ไหน" (โซน C4 P1 ...)
-- อันนี้บอกว่าเจอ "ระหว่างทำอะไรอยู่" ซึ่งคนละเรื่องกัน และใช้ตอบคำถามต่างกัน:
--   เจอตอนโหลด = ของหลุดไปจ่อขึ้นรถแล้ว รุนแรงกว่าเจอตอนนับสต๊อก
--
-- ไม่ตั้ง check constraint เพราะรายการจะถูกเพิ่มทีหลัง ไม่อยากต้องทำ migration ใหม่ทุกครั้ง
alter table dmg_cases add column if not exists found_during text;

comment on column dmg_cases.found_during is
  'เจอของเสียระหว่างทำอะไร: loading (โหลดสินค้า) · stock_count (นับสต๊อก) · zone_arrange (จัดพื้นที่)';

create index if not exists dmg_cases_during_idx on dmg_cases (found_during);

notify pgrst, 'reload schema';

select count(*) as "แถวทั้งหมด", count(found_during) as "ระบุแล้ว" from dmg_cases;
