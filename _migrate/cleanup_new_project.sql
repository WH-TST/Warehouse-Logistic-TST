-- ══════════════════════════════════════════════════════════════════════════
--  ล้างข้อมูลทั้งหมดในโปรเจกต์ที่เคยจะย้ายไป (akazjfgbnzhykhgeenye)
--  ⚠️ ห้ามรันในโปรเจกต์เดิม (lkuunmyrxugsoqwrvdby) เด็ดขาด — ข้อมูลจริงอยู่ที่นั่น
--
--  มี GUARD ในตัว: สคริปต์จะเช็คว่ามีคอลัมน์ "_dual_deleted_at" อยู่หรือไม่
--  (คอลัมน์นี้มีเฉพาะโปรเจกต์ใหม่เท่านั้น — เราเพิ่มไว้ตอนทำ dual-client)
--  ถ้ารันผิดโปรเจกต์ → จะ ERROR แล้วหยุดทันที ไม่มีอะไรถูกลบ
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  ส่วนที่ 1: ลบ "ข้อมูล" ทั้งหมด แต่เก็บโครงสร้างตารางไว้
--  (ใช้อันนี้ถ้าอาจกลับมาใช้โปรเจกต์นี้อีกในอนาคต)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  guard_count int;
  total_tables int := 0;
BEGIN
  -- GUARD: ต้องเป็นโปรเจกต์ใหม่เท่านั้น
  SELECT count(*) INTO guard_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name = '_dual_deleted_at';

  IF guard_count = 0 THEN
    RAISE EXCEPTION 'หยุด! ไม่พบคอลัมน์ _dual_deleted_at — แสดงว่านี่ไม่ใช่โปรเจกต์ใหม่ (akaz) อาจเป็นโปรเจกต์เดิมที่มีข้อมูลจริง ยกเลิกการลบทั้งหมด';
  END IF;

  RAISE NOTICE 'ยืนยันแล้วว่าเป็นโปรเจกต์ใหม่ (พบ _dual_deleted_at ใน % ตาราง) — เริ่มล้างข้อมูล', guard_count;

  -- ปิด FK constraint ชั่วคราวด้วยการ truncate พร้อมกันทั้งหมด (CASCADE)
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
    total_tables := total_tables + 1;
  END LOOP;

  RAISE NOTICE 'ล้างข้อมูลเสร็จ: % ตาราง (โครงสร้างตารางยังอยู่ครบ)', total_tables;
END $$;

-- ตรวจสอบผล: ทุกตารางควรเหลือ 0 แถว
SELECT relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND n_live_tup > 0
ORDER BY n_live_tup DESC;
-- ↑ ถ้าไม่มีผลลัพธ์เลย = ล้างครบทุกตารางแล้ว


-- ══════════════════════════════════════════════════════════════════════════
--  ส่วนที่ 2 (ไม่บังคับ): ลบ "ตาราง" ทิ้งทั้งหมด ให้โปรเจกต์ว่างเปล่าจริงๆ
--  ⚠️ ใช้เฉพาะเมื่อแน่ใจว่าจะไม่กลับมาใช้โปรเจกต์นี้อีกแล้ว
--  วิธีใช้: ลบเครื่องหมาย /* */ ออก แล้วรันใหม่
-- ══════════════════════════════════════════════════════════════════════════
/*
DO $$
DECLARE
  r RECORD;
  guard_count int;
BEGIN
  SELECT count(*) INTO guard_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name = '_dual_deleted_at';

  IF guard_count = 0 THEN
    RAISE EXCEPTION 'หยุด! ไม่ใช่โปรเจกต์ใหม่ ยกเลิกการลบ';
  END IF;

  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;

  RAISE NOTICE 'ลบตารางทั้งหมดเรียบร้อย — โปรเจกต์ว่างเปล่าแล้ว';
END $$;
*/


-- ══════════════════════════════════════════════════════════════════════════
--  ส่วนที่ 3 (ไม่บังคับ): ล้างไฟล์ใน Storage
--  หมายเหตุ: ลบ record ใน storage.objects จะทำให้ไฟล์ไม่ปรากฏในระบบ
--  แต่ไฟล์จริงอาจยังค้างอยู่ — แนะนำลบ bucket ผ่านหน้า Dashboard แทน
--  (Storage → เลือก bucket → Delete bucket) จะสะอาดกว่า
-- ══════════════════════════════════════════════════════════════════════════
/*
DELETE FROM storage.objects WHERE bucket_id IN ('delivery-photos','damage-photos','training-photos');
DELETE FROM storage.buckets WHERE id IN ('delivery-photos','damage-photos','training-photos');
*/
