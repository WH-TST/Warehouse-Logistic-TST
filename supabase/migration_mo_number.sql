-- ── เลข MO ของสินค้า มอก. ─────────────────────────────────────────────────────
--
-- (เจ้าของสั่ง 7 ต.ค. 69) "ในแต่ละแถวสินค้า ถ้าสินค้านั้นมีรหัสสินค้าที่ลงท้าย
-- ด้วย T แถวนั้นจะต้องมีช่องให้กรอก MO … เพราะประเทศไทยประกาศกฎหมายเรื่องสินค้า
-- สมอ. เป็นคนควบคุมดูแลเรื่อง มอก. จะได้สอบกลับได้ · 1 แถวสินค้า กรอกแค่ 1 ครั้ง"
--
-- เก็บเป็นตัวเลขล้วน ไม่มีขีด ไม่มีคำว่า MO (พนักงานหน้างานพิมพ์บนมือถือ
-- ยิ่งน้อยปุ่มยิ่งผิดน้อย · หน้าจอกรองอักขระอื่นทิ้งให้เองตอนพิมพ์)
--
-- ⚠ เพิ่มคอลัมน์อย่างเดียว ไม่แก้ ไม่ลบของเดิม — แถวเก่าเป็น null ซึ่งถูกต้อง
-- เพราะก่อนหน้านี้ยังไม่มีการเก็บเลข MO
alter table loading_sessions
  add column if not exists mo_number text;

-- ค้นหาย้อนกลับตอนถูกเรียกตรวจ: "ของจาก MO นี้ ส่งไปที่ไหนบ้าง"
create index if not exists loading_sessions_mo_number_idx
  on loading_sessions (mo_number) where mo_number is not null;

-- ── ตรวจผล ──
-- ① ต้องเห็นคอลัมน์ mo_number ชนิด text
-- ② แถวที่มีเลข MO แล้ว = 0 (ยังไม่เริ่มกรอก) — จะเริ่มมีหลังหน้างานใช้ฟอร์มใหม่
select (select count(*) from information_schema.columns
         where table_name = 'loading_sessions' and column_name = 'mo_number') as มีคอลัมน์,
       (select count(*) from loading_sessions where mo_number is not null)    as แถวที่มีเลข_MO;
