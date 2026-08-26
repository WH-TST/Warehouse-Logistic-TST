#!/usr/bin/env bash
# ก็อปไฟล์ทั้งหมดใน bucket delivery-photos จากโปรเจกต์เก่า → ใหม่ ผ่าน Storage REST API
# ใช้ service_role key (ไม่ต้องพึ่งรหัส DB) — รันหลังจากสร้าง bucket ในโปรเจกต์ใหม่แล้ว
set -euo pipefail

OLD_URL="https://lkuunmyrxugsoqwrvdby.supabase.co"
OLD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXVubXlyeHVnc29xd3J2ZGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4OTk4NywiZXhwIjoyMDk3MTY1OTg3fQ.EdbW2hweln4P0Wf6AS7gYIViOHDxumP5G-o2Z-RRlus"

NEW_URL="https://akazjfgbnzhykhgeenye.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA2OTgwOSwiZXhwIjoyMTAxNjQ1ODA5fQ.hTyahT_yD2AH9ejh0eMGXYbttCv-LM1REJQWLDDBX1Q"

BUCKET="delivery-photos"
LIST_FILE="/tmp/delivery_photos_list.json"
TMPDIR="/tmp/delivery_photos_copy"
mkdir -p "$TMPDIR"

echo "▶ ดึงรายชื่อไฟล์ทั้งหมดใน bucket $BUCKET (เก่า)…"
> "$LIST_FILE.all"
OFFSET=0
LIMIT=1000
while true; do
  curl -s -X POST "$OLD_URL/storage/v1/object/list/$BUCKET" \
    -H "Authorization: Bearer $OLD_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"prefix\":\"\",\"limit\":$LIMIT,\"offset\":$OFFSET,\"sortBy\":{\"column\":\"name\",\"order\":\"asc\"}}" \
    > "/tmp/_page.json"
  COUNT=$(python3 -c "import json;print(len(json.load(open('/tmp/_page.json'))))" 2>/dev/null || echo 0)
  if [ "$COUNT" -eq 0 ]; then break; fi
  python3 -c "import json;[print(o['name']) for o in json.load(open('/tmp/_page.json')) if o.get('id')]" >> "$LIST_FILE.all"
  OFFSET=$((OFFSET+LIMIT))
  if [ "$COUNT" -lt "$LIMIT" ]; then break; fi
done

TOTAL=$(wc -l < "$LIST_FILE.all" | tr -d ' ')
echo "พบไฟล์ทั้งหมด: $TOTAL"

echo "▶ ดาวน์โหลด + อัปโหลดทีละไฟล์…"
i=0
while IFS= read -r fname; do
  i=$((i+1))
  curl -s "$OLD_URL/storage/v1/object/$BUCKET/$fname" \
    -H "Authorization: Bearer $OLD_KEY" \
    -o "$TMPDIR/tmpfile"
  # เดา content-type จากนามสกุลไฟล์ (ส่วนใหญ่เป็นรูป jpg)
  ext="${fname##*.}"
  case "$ext" in
    jpg|jpeg) ctype="image/jpeg" ;;
    png) ctype="image/png" ;;
    webp) ctype="image/webp" ;;
    *) ctype="application/octet-stream" ;;
  esac
  curl -s -X POST "$NEW_URL/storage/v1/object/$BUCKET/$fname" \
    -H "Authorization: Bearer $NEW_KEY" \
    -H "Content-Type: $ctype" \
    -H "x-upsert: true" \
    --data-binary "@$TMPDIR/tmpfile" > /tmp/_upload_resp.json
  if grep -q '"error"' /tmp/_upload_resp.json 2>/dev/null; then
    echo "❌ $fname : $(cat /tmp/_upload_resp.json)"
  else
    if [ $((i % 50)) -eq 0 ]; then echo "  ...$i/$TOTAL"; fi
  fi
done < "$LIST_FILE.all"

echo "✅ เสร็จแล้ว: $i/$TOTAL ไฟล์"
