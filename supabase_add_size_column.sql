-- เพิ่มคอลัมน์ size (Size/ขนาด) เข้าตาราง products ของ WMS
-- ใช้แสดงบน Print Tag แทนการดึงจาก Google Sheet ผ่าน GAS
alter table public.products
  add column if not exists size text;

comment on column public.products.size is 'Size / ขนาด — แสดงบน Print Tag (เดิมดึงจาก Google Sheet ผ่าน GAS, ย้ายมาเก็บที่นี่)';
