#!/usr/bin/env python3
# ก็อปไฟล์ทั้งหมดใน bucket delivery-photos จากโปรเจกต์เก่า → ใหม่ ผ่าน Storage REST API
# โครงสร้างเป็น folder ซ้อนหลายชั้น (plan_id/shop_seq/filename) ต้อง list recursive
import urllib.request
import json
import sys

OLD_URL = "https://lkuunmyrxugsoqwrvdby.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXVubXlyeHVnc29xd3J2ZGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4OTk4NywiZXhwIjoyMDk3MTY1OTg3fQ.EdbW2hweln4P0Wf6AS7gYIViOHDxumP5G-o2Z-RRlus"

NEW_URL = "https://akazjfgbnzhykhgeenye.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA2OTgwOSwiZXhwIjoyMTAxNjQ1ODA5fQ.hTyahT_yD2AH9ejh0eMGXYbttCv-LM1REJQWLDDBX1Q"

BUCKET = sys.argv[1] if len(sys.argv) > 1 else "delivery-photos"

def api_post(url, key, path, body):
    req = urllib.request.Request(
        url + path,
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def list_all(prefix=""):
    """คืนรายชื่อ path ไฟล์จริงทั้งหมด (recursive)"""
    result = []
    offset = 0
    limit = 1000
    while True:
        items = api_post(OLD_URL, OLD_KEY, f"/storage/v1/object/list/{BUCKET}",
                          {"prefix": prefix, "limit": limit, "offset": offset,
                           "sortBy": {"column": "name", "order": "asc"}})
        if not items:
            break
        for it in items:
            full = f"{prefix}/{it['name']}" if prefix else it['name']
            if it.get("id") is not None:
                result.append(full)  # ไฟล์จริง
            else:
                result.extend(list_all(full))  # folder → ลงลึกต่อ
        if len(items) < limit:
            break
        offset += limit
    return result

def download(path):
    req = urllib.request.Request(
        f"{OLD_URL}/storage/v1/object/{BUCKET}/{path}",
        headers={"Authorization": "Bearer " + OLD_KEY},
    )
    with urllib.request.urlopen(req) as r:
        return r.read()

def upload(path, data):
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    ctype = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
             "webp": "image/webp", "heic": "image/heic"}.get(ext, "application/octet-stream")
    req = urllib.request.Request(
        f"{NEW_URL}/storage/v1/object/{BUCKET}/{path}",
        data=data,
        headers={"Authorization": "Bearer " + NEW_KEY, "Content-Type": ctype, "x-upsert": "true"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return r.read()

print(f"▶ ดึงรายชื่อไฟล์ทั้งหมดใน bucket '{BUCKET}' (recursive)…")
files = list_all()
print(f"พบไฟล์ทั้งหมด: {len(files)}")

ok, fail = 0, []
for i, path in enumerate(files, 1):
    try:
        data = download(path)
        upload(path, data)
        ok += 1
    except Exception as e:
        fail.append((path, str(e)))
    if i % 50 == 0 or i == len(files):
        print(f"  ...{i}/{len(files)} (ok={ok}, fail={len(fail)})")

print(f"\n✅ เสร็จแล้ว: {ok}/{len(files)} สำเร็จ, {len(fail)} ล้มเหลว")
if fail:
    print("รายการที่พลาด:")
    for p, e in fail[:20]:
        print(f"  {p}: {e}")
