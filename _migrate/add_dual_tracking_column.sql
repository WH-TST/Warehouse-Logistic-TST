-- ══════════════════════════════════════════════════════════════════
-- รันบน "โปรเจกต์ใหม่" (akaz) หลัง restore schema+data จากเก่าเสร็จแล้ว
-- เพิ่มคอลัมน์ tombstone ให้ทุกตารางอัตโนมัติ (ไม่ hardcode รายชื่อตาราง กันตกหล่น)
-- ใช้เป็น soft-delete flag: record ที่ "ลบ" จริงๆ (มาจาก DB เก่า ลบต้นทางไม่ได้)
-- จะถูก copy ทั้งแถวมาไว้ที่นี่ พร้อมตั้งเวลาลบ แทนการ DELETE จริง
-- ══════════════════════════════════════════════════════════════════
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS _dual_deleted_at timestamptz', r.tablename);
  END LOOP;
END $$;

-- ตรวจสอบ: ทุกตารางควรมีคอลัมน์นี้แล้ว
SELECT table_name FROM information_schema.columns
WHERE table_schema='public' AND column_name='_dual_deleted_at'
ORDER BY table_name;
