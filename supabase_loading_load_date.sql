-- ══════════════════════════════════════════════════════════════════════
--  วันที่โหลดจริง — loading_sessions.load_date
--
--  ที่มา: ตอนสร้างออเดอร์โหลด order_date = "วันที่ของแผน" แล้ว session
--         ก็ก็อป plan_date = order_date ต่อ ไม่มีใครเขียนวันที่โหลดจริงลงไป
--         พอวางแผนวันที่ 22 แต่โหลดจริงวันที่ 23 หน้า SI/สถิติที่กรองด้วย
--         plan_date จะไปโผล่วันที่ 22 ทั้งที่ของออกจากคลังวันที่ 23
--         (ตรวจแล้วเจอ 128 แถวจาก 2,830 แถวที่วันไม่ตรงกัน)
--
--  ทำไมต้องเป็นคอลัมน์ ไม่ใช่คำนวณตอนแสดงผล:
--         หน้า Monitor คำนวณเอาเองตอน render ได้เพราะดึงข้อมูลมาทั้งก้อน
--         แต่หน้าที่กรองช่วงวันบน DB (SI, สถิติรวม) เอาสูตรนั้นไปใช้ไม่ได้
--         ถ้าไม่เก็บเป็นคอลัมน์ ทุกหน้าใหม่ที่เขียนต่อจากนี้จะพลาดซ้ำอีก
-- ══════════════════════════════════════════════════════════════════════

alter table public.loading_sessions
    add column if not exists load_date date;

comment on column public.loading_sessions.load_date is
    'วันที่โหลดจริง (เวลาไทย) — DB เขียนเองจาก end_time/start_time/created_at ห้ามกรอกมือ ต่างจาก plan_date ที่เป็นวันของแผน';

-- ── DB เขียนให้เองทุกครั้ง ────────────────────────────────────────────
-- ไล่จาก end_time (เวลาที่โหลดเสร็จ) → start_time → created_at
-- แถว draft ที่ยังไม่มีเวลาเลยก็ยังได้วันของวันที่สร้าง ไม่มีทางเป็น null
create or replace function public.loading_sessions_set_load_date()
returns trigger
language plpgsql
as $$
begin
    new.load_date := (
        coalesce(new.end_time, new.start_time, new.created_at, now())::timestamptz
        at time zone 'Asia/Bangkok'
    )::date;
    return new;
end;
$$;

drop trigger if exists trg_loading_sessions_load_date on public.loading_sessions;
create trigger trg_loading_sessions_load_date
    before insert or update on public.loading_sessions
    for each row execute function public.loading_sessions_set_load_date();

-- ── เติมข้อมูลเก่าย้อนหลัง ────────────────────────────────────────────
update public.loading_sessions
   set load_date = (coalesce(end_time, start_time, created_at, now())::timestamptz
                    at time zone 'Asia/Bangkok')::date
 where load_date is null;

create index if not exists idx_loading_sessions_load_date
    on public.loading_sessions (load_date);

-- ── ตรวจผล ────────────────────────────────────────────────────────────
-- แถวที่ load_date ต่างจาก plan_date = แถวที่เคยแสดงผิดวัน ตอนนี้จะถูกแล้ว
select count(*)                                                as ทั้งหมด,
       count(*) filter (where load_date is null)                as ยังว่าง,
       count(*) filter (where load_date <> plan_date::date)     as วันไม่ตรงแผน
  from public.loading_sessions
 where record_type <> 'draft';
