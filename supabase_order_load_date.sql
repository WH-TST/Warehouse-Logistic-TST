-- ══════════════════════════════════════════════════════════════════════
--  วันที่โหลดเสร็จ ระดับ "ทั้งคัน" — loading_orders.load_date
--
--  ที่มา: ออเดอร์เดียวโหลดคร่อมวันได้ (เจอจริง LD2609209 — 12 รายการจบ
--         22/09 17:55 อีก 11 รายการจบ 23/09 09:01) ถ้านับแยกรายแถว
--         ของคันเดียวกันจะกระจายอยู่สองวัน และ scale_diff ที่ผูกกับทั้งคัน
--         จะถูกเอาไปกระจายลงเฉพาะแถวของวันนั้น ทำให้น้ำหนัก FINAL เพี้ยน
--
--  กฎ: ทั้งคันเป็นก้อนเดียว ยึดวันที่โหลดคันนั้นเสร็จ (session ที่จบท้ายสุด)
--
--  ต้องรัน supabase_loading_load_date.sql ก่อน (สร้าง loading_sessions.load_date)
-- ══════════════════════════════════════════════════════════════════════

alter table public.loading_orders
    add column if not exists load_date date;

comment on column public.loading_orders.load_date is
    'วันที่โหลดคันนี้เสร็จ (เวลาไทย) — DB เขียนเองจาก session ที่จบท้ายสุด ห้ามกรอกมือ ต่างจาก order_date ที่เป็นวันของแผน';

-- ── DB เขียนให้เองทุกครั้งที่ session เปลี่ยน ──────────────────────────
create or replace function public.loading_orders_sync_load_date()
returns trigger
language plpgsql
as $$
declare
    _oid text;
begin
    _oid := coalesce(new.order_id::text, old.order_id::text);
    if _oid is null then return null; end if;

    update public.loading_orders o
       set load_date = (
           select max(s.load_date)
             from public.loading_sessions s
            where s.order_id::text = _oid
              and s.record_type <> 'draft'
       )
     where o.id::text = _oid;

    return null;
end;
$$;

drop trigger if exists trg_loading_orders_load_date on public.loading_sessions;
create trigger trg_loading_orders_load_date
    after insert or update or delete on public.loading_sessions
    for each row execute function public.loading_orders_sync_load_date();

-- ── เติมข้อมูลเก่าย้อนหลัง ────────────────────────────────────────────
update public.loading_orders o
   set load_date = x.d
  from (
        select order_id, max(load_date) as d
          from public.loading_sessions
         where record_type <> 'draft'
         group by order_id
       ) x
 where o.id = x.order_id
   and o.load_date is distinct from x.d;

create index if not exists idx_loading_orders_load_date
    on public.loading_orders (load_date);

-- ── ตรวจผล ────────────────────────────────────────────────────────────
-- LD2609209 ต้องได้ load_date = 2026-09-23 (วันที่โหลดคันนั้นเสร็จ)
select order_no, truck_plate, order_date as วันที่แผน, load_date as วันโหลดเสร็จ, status
  from public.loading_orders
 where load_date >= date '2026-09-22'
 order by load_date, order_no;
