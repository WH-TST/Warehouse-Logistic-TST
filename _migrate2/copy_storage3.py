#!/usr/bin/env python3
# ก็อป storage แบบขนาน (เร็วกว่าเดิม ~10 เท่า) + retry + resume
import urllib.request, json, time, os, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

OLD_URL = "https://lkuunmyrxugsoqwrvdby.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdXVubXlyeHVnc29xd3J2ZGJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU4OTk4NywiZXhwIjoyMDk3MTY1OTg3fQ.EdbW2hweln4P0Wf6AS7gYIViOHDxumP5G-o2Z-RRlus"
NEW_URL = "https://akazjfgbnzhykhgeenye.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA2OTgwOSwiZXhwIjoyMTAxNjQ1ODA5fQ.hTyahT_yD2AH9ejh0eMGXYbttCv-LM1REJQWLDDBX1Q"
BUCKET = "delivery-photos"
STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "copied.txt")
WORKERS = 12

lock = threading.Lock()
counter = {"ok": 0, "fail": 0}

def api_post(base, key, path, body, retries=3):
    for a in range(retries):
        try:
            req = urllib.request.Request(base+path, data=json.dumps(body).encode(),
                headers={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read())
        except Exception:
            if a == retries-1: raise
            time.sleep(1.5*(a+1))

def list_all(prefix=""):
    out, off = [], 0
    while True:
        items = api_post(OLD_URL, OLD_KEY, f"/storage/v1/object/list/{BUCKET}",
                         {"prefix":prefix,"limit":1000,"offset":off,"sortBy":{"column":"name","order":"asc"}})
        if not items: break
        for it in items:
            full = f"{prefix}/{it['name']}" if prefix else it["name"]
            if it.get("id") is not None: out.append(full)
            else: out.extend(list_all(full))
        if len(items) < 1000: break
        off += 1000
    return out

def copy_one(path, retries=3):
    ext = path.rsplit(".",1)[-1].lower() if "." in path else ""
    ct = {"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","webp":"image/webp","heic":"image/heic"}.get(ext,"application/octet-stream")
    for a in range(retries):
        try:
            rq = urllib.request.Request(f"{OLD_URL}/storage/v1/object/{BUCKET}/{path}",
                                        headers={"Authorization":"Bearer "+OLD_KEY})
            with urllib.request.urlopen(rq, timeout=60) as r: data = r.read()
            up = urllib.request.Request(f"{NEW_URL}/storage/v1/object/{BUCKET}/{path}", data=data,
                headers={"Authorization":"Bearer "+NEW_KEY,"Content-Type":ct,"x-upsert":"true"}, method="POST")
            with urllib.request.urlopen(up, timeout=90) as r: r.read()
            with lock:
                with open(STATE,"a") as f: f.write(path+"\n")
                counter["ok"] += 1
                n = counter["ok"] + counter["fail"]
                if n % 25 == 0: print(f"  {n} ไฟล์ (ok={counter['ok']} fail={counter['fail']})", flush=True)
            return True
        except Exception as e:
            if a == retries-1:
                with lock:
                    counter["fail"] += 1
                return False
            time.sleep(1.5*(a+1))

done = set()
if os.path.exists(STATE):
    done = set(l.strip() for l in open(STATE) if l.strip())

print("▶ ดึงรายชื่อไฟล์…", flush=True)
files = list_all()
todo = [f for f in files if f not in done]
print(f"ทั้งหมด {len(files)} | ก็อปแล้ว {len(done)} | ต้องทำ {len(todo)} | ขนาน {WORKERS} เส้น", flush=True)

t0 = time.time()
with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    list(ex.map(copy_one, todo))

el = time.time()-t0
print(f"\n✅ เสร็จใน {el:.0f} วิ | สำเร็จ {counter['ok']} | ล้มเหลว {counter['fail']}")
print(f"รวมก็อปแล้วทั้งหมด: {len(set(l.strip() for l in open(STATE)))} / {len(files)}")
