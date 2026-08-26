# สถานะการย้าย WMS DB

## ✅ เสร็จ — ฝั่งเก่า (lkuunmyrxugsoqwrvdby, org Chakkarin Sombun FREE)
- pooler host: aws-1-ap-southeast-1.pooler.supabase.com (Session pooler, port 5432)
- user: postgres.lkuunmyrxugsoqwrvdby / pw: @Sak26052540
- dump_public.sql = schema+data 56 ตาราง + 74 policies + grants (12MB)
- buckets (public): delivery-photos(574 ไฟล์), damage-photos(0), training-photos(0)

## ⏳ ค้าง — ฝั่งใหม่ (akazjfgbnzhykhgeenye, org TST PRO)
- ต้องการ: DB password (reset ถูกบล็อกเพราะ user ไม่ใช่ owner org TST)
- host ใหม่ (direct IPv6): db.akazjfgbnzhykhgeenye.supabase.co  → ต้องหา pooler host เหมือนกัน
- ขั้นต่อไป:
  1. psql <NEW> -f dump_public.sql   (restore schema+data)
  2. สร้าง 3 buckets ให้ public + copy 574 ไฟล์ delivery-photos
  3. deploy edge functions send-push (+VAPID secret) และ blocklist
  4. push โค้ด WMS (index.html/code.js) — code.js ต้องวางใน Apps Script editor ด้วย
