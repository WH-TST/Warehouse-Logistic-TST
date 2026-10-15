-- ยกเลิกเคส แทนการลบถาวร
--
-- ระบบนี้มีไว้เป็นหลักฐานว่าของเสียถูกปล่อยมาซ้ำๆ ถ้าลบทิ้งได้จริง
-- พอเอาตัวเลขไปคุยกับผู้บริหาร คำถามแรกคือ "ที่ลบไปมีกี่เคส" แล้วจะตอบไม่ได้
-- จึงไม่เปิดให้ลบถาวรเลย — ยกเลิกแล้วเคสยังอยู่ครบ พร้อมเหตุผลและชื่อคนยกเลิก

alter table dmg_cases drop constraint if exists dmg_cases_status_check;
alter table dmg_cases add constraint dmg_cases_status_check check (status in
  ('Draft','Submitted','New','Under Review','Awaiting Information','Assigned',
   'Investigating','Pending Approval','Corrective Action','Verification',
   'Closed','Reopened','Cancelled'));

alter table dmg_cases add column if not exists cancelled_by text;
comment on column dmg_cases.cancelled_by is 'ชื่อผู้กดยกเลิกเคส · เวลาที่ยกเลิกอยู่ใน deleted_at';

-- ยกเลิกได้จากทุกสถานะ รวมถึงเคสที่ปิดไปแล้ว (เช่น พบภายหลังว่าแจ้งซ้ำ)
insert into dmg_status_transitions (from_status, to_status)
select s, 'Cancelled' from unnest(array[
  'Draft','Submitted','New','Under Review','Awaiting Information','Assigned',
  'Investigating','Pending Approval','Corrective Action','Verification','Closed','Reopened'
]) as s
on conflict do nothing;

-- ประทับตราให้เอง ไม่ฝากความถูกต้องไว้กับฝั่งหน้าเว็บ
-- ชื่อ trigger ขึ้นต้น bu_cancel จึงเรียงมาก่อน dmg_cases_bu_t และทำงานก่อนตัวตรวจ transition
create or replace function dmg_cases_cancel_stamp() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.status = 'Cancelled' and old.status is distinct from 'Cancelled' then
    if coalesce(btrim(new.status_reason),'') = '' then
      raise exception 'ต้องระบุเหตุผลที่ยกเลิกเคส';
    end if;
    new.deleted_at  := now();
    new.cancelled_by := coalesce(nullif(btrim(new.last_actor),''), 'unknown');
  end if;
  if old.status = 'Cancelled' and new.status is distinct from 'Cancelled' then
    raise exception 'เคสที่ยกเลิกแล้ว เปิดกลับมาไม่ได้';
  end if;
  return new;
end $$;

drop trigger if exists dmg_cases_bu_cancel_t on dmg_cases;
create trigger dmg_cases_bu_cancel_t before update on dmg_cases
  for each row execute function dmg_cases_cancel_stamp();

notify pgrst, 'reload schema';

select (select count(*) from dmg_status_transitions where to_status='Cancelled') as "ทางเข้าสู่สถานะยกเลิก",
       (select count(*) from dmg_cases where status='Cancelled') as "เคสที่ยกเลิกแล้ว";
