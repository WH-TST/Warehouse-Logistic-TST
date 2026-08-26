#!/usr/bin/env python3
# ก็อปไฟล์ storage: lkuun → akaz
# ปรับปรุงจากรอบที่แล้ว: มี retry (เน็ตหลุดแล้วลองใหม่) + resume (ข้ามไฟล์ที่ก็อปแล้ว)
import urllib.request, urllib.error, json, sys, time, os

OLD_URL = "https://lkuunmyrxugsoqwrvdby.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXVubXlyeHVnc29xd3J2ZGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4OTk4NywiZXhwIjoyMDk3MTY1OTg3fQ.EdbW2hweln4P0Wf6AS7gYIViOHDxumP5G-o2Z-RRlus"
NEW_URL = "https://akazjfgbnzhykhgeenye.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA2OTgwOSwiZXhwIjoyMTAxNjQ1ODA5fQ.hTyahT_yD2AH9ejh0eMGXYbttCv-LM1REJQWLDDBX1Q"
BUCKET = "delivery-photos"
STATE = "/Users/warehouse/WMS/_migrate2/copied.txt"

def api_post(base, key, path, body, retries=3):
    for a in range(retries):
        try:
            req = urllib.request.Request(base+path, data=json.dumps(body).encode(),
                headers={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            if a == retries-1: raise
            time.sleep(2*(a+1))

def list_all(base, key, prefix=""):
    out, off = [], 0
    while True:
        items = api_post(base, key, f"/storage/v1/object/list/{BUCKET}",
                         {"prefix":prefix,"limit":1000,"offset":off,"sortBy":{"column":"name","order":"asc"}})
        if not items: break
        for it in items:
            full = f"{prefix}/{it['name']}" if prefix else it["name"]
            if it.get("id") is not None: out.append(full)
            else: out.extend(list_all(base, key, full))
        if len(items) < 1000: break
        off += 1000
    return out

def download(path, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(f"{OLD_URL}/storage/v1/object/{BUCKET}/{path}",
                                         headers={"Authorization":"Bearer "+OLD_KEY})
            with urllib.request.urlopen(req, timeout=90) as r: return r.read()
        except Exception:
            if a == retries-1: raise
            time.sleep(2*(a+1))

def upload(path, data, retries=4):
    ext = path.rsplit(".",1)[-1].lower() if "." in path else ""
    ct = {"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","webp":"image/webp","heic":"image/heic"}.get(ext,"application/octet-stream")
    for a in range(retries):
        try:
            req = urllib.request.Request(f"{NEW_URL}/storage/v1/object/{BUCKET}/{path}", data=data,
                headers={"Authorization":"Bearer "+NEW_KEY,"Content-Type":ct,"x-upsert":"true"}, method="POST")
            with urllib.request.urlopen(req, timeout=120) as r: return r.read()
        except Exception:
            if a == retries-1: raise
            time.sleep(2*(a+1))

# resume: อ่านรายการที่ก็อปสำเร็จแล้ว
done = set()
if os.path.exists(STATE):
    done = set(l.strip() for l in open(STATE) if l.strip())

print(f"▶ ดึงรายชื่อไฟล์จากต้นทาง…", flush=True)
files = list_all(OLD_URL, OLD_KEY)
todo = [f for f in files if f not in done]
print(f"ทั้งหมด {len(files)} ไฟล์ | ก็อปแล้ว {len(done)} | ต้องทำ {len(todo)}", flush=True)

ok, fail = 0, []
with open(STATE, "a") as state:
    for i, p in enumerate(todo, 1):
        try:
            upload(p, download(p))
            state.write(p+"\n"); state.flush()
            ok += 1
        except Exception as e:
            fail.append((p, str(e)[:120]))
        if i % 25 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)}  สำเร็จ={ok} ล้มเหลว={len(fail)}", flush=True)

print(f"\n✅ เสร็จ: สำเร็จ {ok} | ล้มเหลว {len(fail)}")
for p, e in fail[:10]: print(f"   ❌ {p}: {e}")
if fail: print("   (รันสคริปต์ซ้ำเพื่อลองไฟล์ที่เหลืออีกครั้ง — resume ได้)")
