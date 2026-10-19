-- ── คิวงานพัฒนาระบบ ─────────────────────────────────────────────────────
-- รับคำขอจากทุกแผนกไว้ที่เดียว เรียงตามความคุ้ม และติดตามว่าทำถึงไหน
-- ใช้คนเดียว (ผู้พัฒนา) จึงไม่มีระบบมอบหมายงาน

create table if not exists dev_queue (
  id          bigint generated always as identity primary key,
  title       text not null check (btrim(title) <> ''),
  detail      text,                                   -- รายละเอียดว่าต้องทำอะไรบ้าง พิมพ์ได้ยาว
  system      text not null default 'WMS',            -- WMS / ผลิต / ทั้งสองระบบ
  dept        text not null default 'คลังสินค้า',      -- แผนกที่ขอ
  requester   text,                                   -- ชื่อคนขอ (ถ้ามี)
  impact      smallint not null default 2 check (impact between 1 and 3),
  effort      smallint not null default 2 check (effort between 1 and 3),
  stage       text not null default 'new'
              check (stage in ('new','next','doing','verify','done','park')),
  -- เวลาแต่ละช่วง ไว้ดูย้อนหลังว่างานค้างนานแค่ไหน และทำจริงกี่วัน
  started_at  timestamptz,
  done_at     timestamptz,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists dev_queue_stage_idx on dev_queue (stage);
create index if not exists dev_queue_created_idx on dev_queue (created_at desc);

-- ประทับเวลาให้เอง ไม่ฝากไว้กับหน้าเว็บ
create or replace function dev_queue_stamp() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    if new.stage = 'doing' and new.started_at is null then new.started_at := now(); end if;
    if new.stage = 'done' then new.done_at := now();
    elsif old.stage = 'done' then new.done_at := null; end if;   -- เปิดกลับมาทำใหม่
  end if;
  return new;
end $$;

drop trigger if exists dev_queue_bu_t on dev_queue;
create trigger dev_queue_bu_t before insert or update on dev_queue
  for each row execute function dev_queue_stamp();

alter table dev_queue enable row level security;
-- สิทธิ์จริงอยู่ที่การซ่อนแท็บในแอป (ทุกคนใช้ anon key ตัวเดียวกัน)
-- ไม่เปิด DELETE — งานที่ไม่ทำให้ย้ายไป "พักไว้" จะได้เห็นว่าเคยขออะไรมาบ้าง
drop policy if exists dev_queue_sel on dev_queue;
drop policy if exists dev_queue_ins on dev_queue;
drop policy if exists dev_queue_upd on dev_queue;
create policy dev_queue_sel on dev_queue for select using (true);
create policy dev_queue_ins on dev_queue for insert with check (true);
create policy dev_queue_upd on dev_queue for update using (true) with check (true);

notify pgrst, 'reload schema';
select count(*) as "แถวในคิว" from dev_queue;
