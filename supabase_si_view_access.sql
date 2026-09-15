-- ══════════════════════════════════════════════════════════════════════
--  ตารางใบอนุญาตเข้าดูหน้า "สรุป SI" แบบ read-only (ให้ฝ่ายขายฝัง iframe)
--
--  ทำไมไม่เก็บใน app_config:
--    app_config เปิดให้ anon อ่านได้ และ anon key ฝังอยู่ใน index.html
--    แบบเปิดเผย (เป็น static site) ใครเปิด view-source ก็ได้ token ไป
--    ตารางนี้จึงเปิด RLS แล้ว "ไม่สร้าง policy ใดๆ" = anon อ่านไม่ได้เลย
--    เหลือแค่ service_role (ซึ่ง bypass RLS) ที่ Edge Function ใช้
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.si_view_access (
    token       text primary key,
    label       text,                       -- ออกให้ใคร เอาไว้ไล่ย้อนตอน token รั่ว
    origins     text[] not null default '{}',-- origin ที่ยอมให้เรียก (ว่าง = ไม่จำกัด)
    expires     date,                       -- null = ไม่หมดอายุ
    created_at  timestamptz not null default now(),
    last_used   timestamptz,
    use_count   bigint not null default 0
);

alter table public.si_view_access enable row level security;

-- ไม่มี policy โดยตั้งใจ — anon / authenticated เข้าไม่ถึงทั้งอ่านและเขียน
revoke all on public.si_view_access from anon, authenticated;

-- ── ออกใบอนุญาตให้ฝ่ายขาย ────────────────────────────────────────────────
-- เพิกถอน: delete from public.si_view_access where token = '...';
insert into public.si_view_access (token, label, origins, expires)
values (
    '7ec0fd111aad0952fad75fd39d9a2e019c201883eb675245',
    'ฝ่ายขาย — โปรแกรม Sale (iframe)',
    array['https://wh-tst.github.io'],
    '2027-09-30'
)
on conflict (token) do nothing;

-- ตรวจผล (SQL Editor ไม่โชว์ notice ต้องมี select ปิดท้าย)
select token, label, origins, expires from public.si_view_access;
