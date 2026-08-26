#!/usr/bin/env python3
# ══════════════════════════════════════════════════════════════════════════
# ROLLBACK: ย้ายข้อมูลที่เกิดขึ้นใน DB ใหม่ (17 ส.ค.) กลับไป DB เก่า
# เพื่อกลับไปใช้โปรเจกต์เดิมทั้งหมดโดยไม่มีข้อมูลหาย
#
# หลักการ:
# - เทียบ PK ระหว่าง 2 ฐาน → แถวที่มีแค่ใน "ใหม่" = เกิดขึ้นหลัง migrate → ต้องกู้กลับ
# - ข้ามแถวที่ถูก soft-delete (_dual_deleted_at != null) = ผู้ใช้ลบไปแล้ว
# - ข้ามข้อมูลทดสอบที่ Claude สร้างระหว่าง debug (DIAG/__final_test__)
# - ตัดคอลัมน์ _dual_deleted_at ออกก่อน insert (DB เก่าไม่มีคอลัมน์นี้)
# ══════════════════════════════════════════════════════════════════════════
import urllib.request
import json
import sys

OLD_URL = "https://lkuunmyrxugsoqwrvdby.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXVubXlyeHVnc29xd3J2ZGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4OTk4NywiZXhwIjoyMDk3MTY1OTg3fQ.EdbW2hweln4P0Wf6AS7gYIViOHDxumP5G-o2Z-RRlus"

NEW_URL = "https://akazjfgbnzhykhgeenye.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA2OTgwOSwiZXhwIjoyMTAxNjQ1ODA5fQ.hTyahT_yD2AH9ejh0eMGXYbttCv-LM1REJQWLDDBX1Q"

# ตาราง: PK columns (จาก information_schema จริง)
TABLES = [
    ("loading_orders",    ["id"]),
    ("loading_sessions",  ["id"]),
    ("truck_inspections", ["id"]),
    ("logistic_plans",    ["plan_id"]),
    ("app_config",        ["key"]),
    ("stock_count_items", ["id"]),
    ("counting",          ["id"]),
    ("transection_fg",    ["id"]),
    ("transection_semi",  ["id"]),
    ("onhand_fg",         ["item_number", "warehouse"]),
    ("onhand_rm",         ["id"]),
]

# ข้อมูลทดสอบที่ Claude สร้างระหว่าง debug — ไม่ต้องกู้กลับ
def is_test_row(row):
    blob = json.dumps(row, ensure_ascii=False)
    for marker in ["DIAGSKU", "__DIAG_TEST", "__DIAGTEST", "__final_test__", "__diag_test"]:
        if marker in blob:
            return True
    return False

def fetch_all(base, key, table, select="*"):
    """ดึงทุกแถวแบบ paginate (REST API จำกัด 1000/ครั้ง)"""
    rows = []
    offset = 0
    page = 1000
    while True:
        url = f"{base}/rest/v1/{table}?select={select}&limit={page}&offset={offset}"
        req = urllib.request.Request(url, headers={
            "apikey": key, "Authorization": "Bearer " + key,
        })
        with urllib.request.urlopen(req) as r:
            batch = json.loads(r.read())
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows

def insert_rows(base, key, table, rows, chunk=200):
    ok, fail = 0, []
    for i in range(0, len(rows), chunk):
        part = rows[i:i+chunk]
        req = urllib.request.Request(
            f"{base}/rest/v1/{table}",
            data=json.dumps(part, ensure_ascii=False).encode(),
            headers={
                "apikey": key, "Authorization": "Bearer " + key,
                "Content-Type": "application/json", "Prefer": "return=minimal",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                r.read()
            ok += len(part)
        except urllib.error.HTTPError as e:
            fail.append((i, e.read().decode()[:300]))
        except Exception as e:
            fail.append((i, str(e)[:300]))
    return ok, fail

def keyof(row, pks):
    return "|".join(str(row.get(c)) for c in pks)

DRY_RUN = "--apply" not in sys.argv
print("=" * 70)
print("ROLLBACK SYNC: DB ใหม่ → DB เก่า" + ("   [DRY RUN — ยังไม่เขียนจริง]" if DRY_RUN else "   [APPLY — เขียนจริง]"))
print("=" * 70)

grand_total = 0
for table, pks in TABLES:
    try:
        new_rows = fetch_all(NEW_URL, NEW_KEY, table)
        old_rows = fetch_all(OLD_URL, OLD_KEY, table, select=",".join(pks))
    except Exception as e:
        print(f"❌ {table}: อ่านไม่สำเร็จ — {e}")
        continue

    old_keys = {keyof(r, pks) for r in old_rows}
    missing = [r for r in new_rows if keyof(r, pks) not in old_keys]

    tombstoned = [r for r in missing if r.get("_dual_deleted_at")]
    test_rows  = [r for r in missing if not r.get("_dual_deleted_at") and is_test_row(r)]
    to_restore = [r for r in missing if not r.get("_dual_deleted_at") and not is_test_row(r)]

    # ตัดคอลัมน์ภายในออก (DB เก่าไม่มี)
    for r in to_restore:
        r.pop("_dual_deleted_at", None)

    note = []
    if tombstoned: note.append(f"ข้าม soft-deleted {len(tombstoned)}")
    if test_rows:  note.append(f"ข้าม test {len(test_rows)}")
    note_s = ("  (" + ", ".join(note) + ")") if note else ""

    if not to_restore:
        print(f"   {table}: ไม่มีอะไรต้องกู้{note_s}")
        continue

    print(f"⚠️  {table}: ต้องกู้ {len(to_restore)} แถว{note_s}")
    grand_total += len(to_restore)
    if not DRY_RUN:
        ok, fail = insert_rows(OLD_URL, OLD_KEY, table, to_restore)
        print(f"      → เขียนสำเร็จ {ok}/{len(to_restore)}")
        for idx, err in fail[:3]:
            print(f"      ❌ chunk@{idx}: {err}")

print("=" * 70)
print(f"รวมที่ต้องกู้: {grand_total} แถว")
if DRY_RUN:
    print("นี่คือ DRY RUN — รันซ้ำด้วย --apply เพื่อเขียนจริง")
