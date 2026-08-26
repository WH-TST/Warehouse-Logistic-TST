# ย้าย DB WMS: `lkuunmyrxugsoqwrvdby` → `akazjfgbnzhykhgeenye`

ย้าย **เฉพาะ WMS** — tst-production-app ยังอยู่ DB เก่า (แยกกันเดินตั้งแต่จุดนี้)

## ลำดับต้องทำ (สำคัญ: ย้าย DB ให้เสร็จ *ก่อน* push โค้ด)

### 0) เตรียมเครื่องมือ
```bash
brew install postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"   # ให้มี pg_dump/psql
```

### 1) ย้าย schema + data
- เปิด `migrate_db.sh` เติม `OLD_PW` / `NEW_PW` (จาก Dashboard → Settings → Database → URI, Session pooler) และเช็ค region ใน host ให้ตรง
```bash
bash migrate_db.sh
```
- ตรวจจำนวนแถวตารางหลักเทียบเก่า/ใหม่ (loading_orders, loading_sessions, products, zone_stock, stock_count…)

### 2) Storage bucket `delivery-photos` (รูปการโหลด)
สร้าง bucket ในโปรเจกต์ใหม่ก่อน (ตั้ง public/policy ให้เหมือนเดิม) แล้วก็อปไฟล์:
```bash
# ดาวน์โหลดจากเก่า
supabase storage cp --recursive --project-ref lkuunmyrxugsoqwrvdby \
  ss://delivery-photos ./_migrate/delivery-photos
# อัปขึ้นใหม่
supabase storage cp --recursive --project-ref akazjfgbnzhykhgeenye \
  ./_migrate/delivery-photos ss://delivery-photos
```
(ถ้า `supabase storage` ใช้ไม่ได้ → ก็อปผ่าน rclone/S3 หรืออัปมือผ่าน dashboard)

### 3) Edge functions
- **send-push** (มี source ในเครื่อง):
```bash
supabase functions deploy send-push --project-ref akazjfgbnzhykhgeenye
supabase secrets set VAPID_PRIVATE_KEY='<ค่าเดิมจากโปรเจกต์เก่า>' --project-ref akazjfgbnzhykhgeenye
```
  (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` Supabase ใส่ให้อัตโนมัติ)
- **blocklist** ⚠️ ไม่มี source ในเครื่อง — ต้องดึง source จากโปรเจกต์เก่า
  (`supabase functions download blocklist --project-ref lkuunmyrxugsoqwrvdby`) แล้ว deploy เข้าใหม่

### 4) โค้ด (ผมแก้ให้แล้ว — push เมื่อ 1–3 เสร็จ)
- `index.html`  → URL + anon key + edge-function URL (blocklist, send-push)
- `code.js`     → URL + service_role key (Apps Script — **ต้องวางทับใน Apps Script editor เองด้วย** ไม่ใช่แค่ push git)
```bash
git add index.html code.js && git commit -m "chore: ย้าย Supabase → akazjfgbnzhykhgeenye" && git push
```

### 5) ตรวจหลังย้าย
- เปิด WMS → โหลดข้อมูล, ลองบันทึกโหลด, อัปรูป, กด push notification
- เช็ค realtime (WMS Monitor) ยังเด้ง live

## Rollback
โค้ดยัง track ใน git — ถ้าพัง `git revert` แล้ว push, และกลับ key เดิมใน Apps Script
