# ค่า Credentials โปรเจกต์ใหม่ (akaz) — รอวันย้าย DB จริง

**index.html** บรรทัด ~25-27:
```
var SUPA_URL = 'https://akazjfgbnzhykhgeenye.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjk4MDksImV4cCI6MjEwMTY0NTgwOX0.3XQowwoh5C9loTu9WpEz4sdKxGzRFlYEOrqNBYtqunA';
```
+ blocklist URL (~8108) และ send-push URL (~27134) เปลี่ยน lkuunmyrxugsoqwrvdby → akazjfgbnzhykhgeenye

**code.js** บรรทัด 73-74:
```
const SB_URL = 'https://akazjfgbnzhykhgeenye.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYXpqZmdibnpoeWtoZ2VlbnllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA2OTgwOSwiZXhwIjoyMTAxNjQ1ODA5fQ.hTyahT_yD2AH9ejh0eMGXYbttCv-LM1REJQWLDDBX1Q'; // service_role JWT (akazjfgbnzhykhgeenye)
```

⚠️ วันย้ายจริง: ใส่ค่านี้กลับ + push แยก commit เดี่ยวๆ (อย่าพ่วง fix อื่น) ตามบทเรียนจากรอบนี้
