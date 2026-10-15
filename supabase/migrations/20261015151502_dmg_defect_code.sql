-- เก็บ "อาการเสีย" เป็นรหัสคงที่ เพื่อให้นับรวมเป็นกราฟบนมอนิเตอร์ผลิตได้
--
-- ทำไมต้องมีคอลัมน์แยก ไม่ใช้ symptom ที่เป็นข้อความ:
--   symptom เป็นข้อความอิสระ ถ้านับจากข้อความ พอใครพิมพ์ต่างกันนิดเดียวก็กลายเป็นคนละกลุ่ม
--   คอลัมน์นี้เก็บรหัสที่ตายตัว (zinc_peel, seam_crack, ...) ส่วน symptom เก็บคำไทยไว้อ่าน
--
-- ไม่ตั้ง check constraint ไว้ เพราะรายการอาการจะถูกเพิ่มทีหลังแน่ๆ
-- ถ้าล็อกไว้ที่ฐานข้อมูล จะต้องทำ migration ใหม่ทุกครั้งที่หน้างานขอเพิ่มอาการ

alter table dmg_cases add column if not exists defect_code text;

comment on column dmg_cases.defect_code is
  'รหัสอาการเสียที่ผู้แจ้งเลือก เช่น zinc_peel seam_crack — ใช้สำหรับนับจัดกลุ่ม ส่วนคำไทยอยู่ใน symptom';

create index if not exists dmg_cases_defect_idx on dmg_cases (defect_code);

notify pgrst, 'reload schema';

select count(*) as "แถวทั้งหมด",
       count(defect_code) as "มีรหัสอาการแล้ว"
from dmg_cases;
