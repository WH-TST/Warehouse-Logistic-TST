-- ══════════════════════════════════════════════════════════════════════════
--  ระบบแจ้งสินค้าเสียหายและติดตามความรับผิดชอบ (Product Damage Management)
--  Migration หลัก — รันใน Supabase SQL Editor ของโปรเจกต์ WMS (akazjfgbnzhykhgeenye)
--
--  รันซ้ำได้ปลอดภัย (create if not exists / create or replace / on conflict)
--  ไม่แตะตารางเดิมของ WMS ทุกตาราง (รวม damage_requests ที่เป็นฟอร์มอีเมลในหน้าสต๊อก)
--  ตารางทั้งหมดขึ้นต้นด้วย dmg_ เพื่อไม่ชนกับตารางอื่นในโปรเจกต์เดียวกัน
--
--  ⚠ ข้อจำกัดที่ต้องรู้ (ระบบล็อกอินของ WMS ไม่ใช่ Supabase Auth):
--    - ฐานข้อมูลไม่รู้ว่า "ใครเป็นใคร" จึงเช็กสิทธิ์รายบทบาทไม่ได้ สิทธิ์รายบทบาทเช็กที่หน้าจอเหมือนทุกโมดูลของ WMS
--    - สิ่งที่ฐานข้อมูลบังคับให้จริง (ใครก็ข้ามไม่ได้):
--        1) เลขเคสออกจากฐานข้อมูล ไม่ซ้ำ
--        2) ลำดับการเปลี่ยนสถานะ + เงื่อนไขก่อนเปลี่ยน (ต้องมีสาเหตุก่อนส่งอนุมัติ ฯลฯ)
--        3) ประวัติ (dmg_activity_logs) เขียนโดย trigger เท่านั้น แก้/ลบ/เพิ่มเองไม่ได้
--        4) ไม่มีใครลบข้อมูลถาวรได้ (ไม่มี DELETE) ใช้ soft delete
--        5) สถานะอีเมลเป็น sent ได้เฉพาะ Edge Function ที่ได้ผลยืนยันจาก Email Provider
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. แผนก ───────────────────────────────────────────────────────────────
create table if not exists dmg_departments (
  code        text primary key,
  name        text not null,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

insert into dmg_departments (code, name, sort_order) values
  ('PROD','ฝ่ายผลิต',10),
  ('QC','ฝ่ายควบคุมคุณภาพ (QC)',20),
  ('WH','คลังสินค้า',30),
  ('TRN','ขนส่ง',40),
  ('SAL','ฝ่ายขาย',50),
  ('PUR','จัดซื้อ',60),
  ('OFF','ออฟฟิศ / จัดส่ง',70)
on conflict (code) do nothing;

-- ── 2. ผู้ใช้ในโมดูลนี้ (ตัวตนล็อกอินยังอยู่ที่ wms_users / logi_wh_staff) ──────
--  role: coordinator = เจ้าหน้าที่รับเรื่อง · investigator = หัวหน้าแผนก/ผู้สอบสวน · viewer = ดูอย่างเดียว
--  ผู้ดูแลระบบ (isAdmin ของ WMS) เป็น Admin ในโมดูลนี้อัตโนมัติ ไม่ต้องมีแถวในตารางนี้
create table if not exists dmg_staff (
  username         text primary key,
  display_name     text,
  department_code  text references dmg_departments(code),
  role             text not null default 'coordinator'
                   check (role in ('coordinator','investigator','viewer')),
  can_approve      boolean not null default false,
  email            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── 3. ตัวนับเลขเคส ─────────────────────────────────────────────────────────
create table if not exists dmg_case_counters (
  year     int primary key,
  last_no  int not null default 0
);

create or replace function dmg_next_case_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int;
  n int;
begin
  -- upsert แบบ atomic: สองคนส่งพร้อมกันได้เลขคนละตัวเสมอ
  insert into dmg_case_counters (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = dmg_case_counters.last_no + 1
  returning last_no into n;
  return 'DMG-' || y::text || '-' || lpad(n::text, 4, '0');
end $$;

-- ── 4. เคส ────────────────────────────────────────────────────────────────
create table if not exists dmg_cases (
  id                       uuid primary key default gen_random_uuid(),
  case_number              text unique,                 -- ออกตอนส่งเรื่อง (Draft ยังไม่มีเลข)
  client_token             uuid unique,                 -- กันกดส่งซ้ำ: token เดียวกัน = เคสเดียวกัน
  title                    text,
  description              text,
  -- ผู้แจ้ง
  reporter_username        text not null,
  reporter_name            text,
  reporter_emp_id          text,
  department_code          text references dmg_departments(code),   -- แผนกที่ "พบเหตุ"
  -- เหตุการณ์ (ผู้แจ้งเป็นคนเลือก ไม่ใช่ข้อสรุป)
  incident_type            text check (incident_type in
                             ('production','qc_escape','warehouse_storage','pick_pack',
                              'loading','transport','customer_found','unknown','other')),
  incident_location        text,
  incident_area            text,
  incident_datetime        timestamptz,
  suspected_stage          text,                        -- ข้อสงสัยของผู้แจ้งเท่านั้น
  symptom                  text,                        -- พบอย่างไร / สิ่งผิดปกติ
  condition_on_found       text,
  delivery_impact          boolean,
  initial_action_taken     boolean,
  initial_action_detail    text,
  -- สินค้า
  product_code             text,
  product_name             text,
  lot_number               text,
  production_order         text,
  delivery_reference       text,
  damaged_quantity         numeric,
  unit                     text,
  estimated_damage_value   numeric,
  currency                 text not null default 'THB',
  priority                 text not null default 'normal'
                           check (priority in ('low','normal','high','urgent')),
  -- สถานะ
  status                   text not null default 'Draft'
                           check (status in ('Draft','Submitted','New','Under Review','Awaiting Information',
                             'Assigned','Investigating','Pending Approval','Corrective Action',
                             'Verification','Closed','Reopened')),
  status_reason            text,                        -- เหตุผลของการเปลี่ยนสถานะล่าสุด
  due_at                   timestamptz,
  -- ผลสอบสวน / ข้อสรุป (สรุปหลังตรวจสอบ ห้ามออกอัตโนมัติ)
  root_cause               text,
  root_cause_category      text,
  involved_departments     text[] not null default '{}',   -- หลายแผนกได้ ไม่บังคับฝ่ายเดียว
  conclusion               text check (conclusion in
                             ('production','qc','warehouse','transport','multiple',
                              'process_standard','inconclusive','other')),
  conclusion_reason        text,
  conclusion_evidence      text,
  conclusion_by            text,
  conclusion_at            timestamptz,
  conclusion_approved_by   text,
  conclusion_approved_at   timestamptz,
  dispute_note             text,                        -- ใครมีสิทธิ์ทบทวน/โต้แย้งผล
  -- ระบบ
  is_demo                  boolean not null default false,
  last_actor               text,                        -- ผู้ทำรายการล่าสุด (ใช้บันทึกใน Timeline)
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  closed_at                timestamptz
);

create index if not exists dmg_cases_status_idx   on dmg_cases (status) where deleted_at is null;
create index if not exists dmg_cases_created_idx  on dmg_cases (created_at desc);
create index if not exists dmg_cases_reporter_idx on dmg_cases (reporter_username);
create index if not exists dmg_cases_product_idx  on dmg_cases (product_code, lot_number);
create index if not exists dmg_cases_due_idx      on dmg_cases (due_at) where status <> 'Closed' and deleted_at is null;

-- ── 5. ตารางลูกของเคส ──────────────────────────────────────────────────────
create table if not exists dmg_attachments (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references dmg_cases(id),
  storage_path    text not null,          -- URL ของไฟล์ (Cloudinary — ดูข้อจำกัดใน README)
  file_name       text,
  mime_type       text,
  file_size       bigint,
  attachment_type text not null default 'overview'
                  check (attachment_type in ('overview','closeup','document','investigation','capa','email')),
  uploaded_by     text,
  uploaded_at     timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      text
);
create index if not exists dmg_attachments_case_idx on dmg_attachments (case_id);

create table if not exists dmg_assignments (
  id                 uuid primary key default gen_random_uuid(),
  case_id            uuid not null references dmg_cases(id),
  department_code    text references dmg_departments(code),
  assignee_username  text,
  assigned_by        text,
  assigned_at        timestamptz not null default now(),
  due_at             timestamptz,
  assignment_status  text not null default 'open'
                     check (assignment_status in ('open','submitted','done','cancelled')),
  notes              text
);
create index if not exists dmg_assignments_case_idx     on dmg_assignments (case_id);
create index if not exists dmg_assignments_assignee_idx on dmg_assignments (assignee_username);

create table if not exists dmg_investigations (
  id                    uuid primary key default gen_random_uuid(),
  case_id               uuid not null references dmg_cases(id),
  department_code       text references dmg_departments(code),
  investigator_username text,
  investigation_summary text,
  dept_statement        text,             -- คำชี้แจงข้อเท็จจริงของแผนก
  process_involved      text,
  root_cause_category   text,
  root_cause            text,
  evidence_summary      text,
  conclusion            text,
  investigated_at       timestamptz not null default now(),
  submitted_at          timestamptz,
  approved_by           text,
  approved_at           timestamptz
);
create index if not exists dmg_investigations_case_idx on dmg_investigations (case_id);

create table if not exists dmg_corrective_actions (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references dmg_cases(id),
  action_type       text not null default 'preventive'
                    check (action_type in ('immediate','preventive')),
  description       text not null,
  owner_username    text,
  department_code   text references dmg_departments(code),
  due_at            timestamptz,
  status            text not null default 'open'
                    check (status in ('open','in_progress','done','verified','cancelled')),
  completion_notes  text,
  evidence_path     text,
  completed_at      timestamptz,
  verified_by       text,
  verified_at       timestamptz,
  created_by        text,
  last_actor        text,
  created_at        timestamptz not null default now()
);
create index if not exists dmg_capa_case_idx on dmg_corrective_actions (case_id);

create table if not exists dmg_comments (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references dmg_cases(id),
  username      text,
  display_name  text,
  kind          text not null default 'comment'
                check (kind in ('comment','info_request','info_response','dispute')),
  comment       text not null,
  visibility    text not null default 'public' check (visibility in ('public','internal')),
  created_at    timestamptz not null default now()
);
create index if not exists dmg_comments_case_idx on dmg_comments (case_id);

create table if not exists dmg_email_logs (
  id                   uuid primary key default gen_random_uuid(),
  case_id              uuid not null references dmg_cases(id),
  recipient            text not null,
  cc                   text,
  subject              text not null,
  body                 text,
  email_type           text,
  provider_message_id  text,
  status               text not null default 'pending'
                       check (status in ('pending','sent','failed')),
  error_message        text,
  attempts             int not null default 0,
  sent_by              text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists dmg_email_logs_case_idx on dmg_email_logs (case_id);

create table if not exists dmg_activity_logs (
  id          bigserial primary key,
  case_id     uuid not null references dmg_cases(id),
  actor       text,
  action      text not null,
  old_value   text,
  new_value   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists dmg_activity_case_idx on dmg_activity_logs (case_id, created_at);

-- ── 6. ลำดับสถานะที่ยอมให้เปลี่ยน ───────────────────────────────────────────
create table if not exists dmg_status_transitions (
  from_status text not null,
  to_status   text not null,
  primary key (from_status, to_status)
);

insert into dmg_status_transitions (from_status, to_status) values
  ('Draft','Submitted'),
  ('Submitted','New'),
  ('New','Under Review'),
  ('New','Awaiting Information'),
  ('New','Assigned'),
  ('Under Review','Awaiting Information'),
  ('Under Review','Assigned'),
  ('Under Review','Closed'),
  ('Awaiting Information','Under Review'),
  ('Assigned','Investigating'),
  ('Assigned','Awaiting Information'),
  ('Assigned','Under Review'),
  ('Investigating','Pending Approval'),
  ('Investigating','Awaiting Information'),
  ('Pending Approval','Corrective Action'),
  ('Pending Approval','Investigating'),
  ('Pending Approval','Closed'),
  ('Corrective Action','Verification'),
  ('Verification','Closed'),
  ('Verification','Corrective Action'),
  ('Closed','Reopened'),
  ('Reopened','Under Review'),
  ('Reopened','Investigating'),
  ('Reopened','Corrective Action')
on conflict do nothing;

-- ── 7. บันทึกประวัติ (เขียนโดย trigger เท่านั้น) ─────────────────────────────
create or replace function dmg_write_log(p_case uuid, p_actor text, p_action text,
                                         p_old text, p_new text, p_details jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into dmg_activity_logs (case_id, actor, action, old_value, new_value, details)
  values (p_case, coalesce(nullif(p_actor,''),'system'), p_action, p_old, p_new, p_details);
end $$;

-- ── 8. Trigger ของเคส: เลขเคส · ลำดับสถานะ · เงื่อนไข · ประวัติ ───────────────
create or replace function dmg_cases_bi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- ข้อมูลตัวอย่างสำหรับ seed เท่านั้น: เปิดผ่าน set_config('dmg.seed','on',true) ในไฟล์ seed
  if coalesce(current_setting('dmg.seed', true),'') = 'on' then
    return new;
  end if;

  if new.status not in ('Draft','Submitted') then
    raise exception 'สร้างเคสใหม่ได้เฉพาะสถานะ Draft หรือ Submitted';
  end if;
  if new.status = 'Submitted' then
    new.status := 'New';
  end if;
  if new.status = 'New' and new.case_number is null then
    new.case_number := dmg_next_case_number();
  end if;
  if new.status = 'New' and new.due_at is null then
    begin
      new.due_at := now() + make_interval(days => coalesce(
        (select nullif(value::text,'')::int from app_config where key = 'dmg_due_days'), 7));
    exception when others then
      new.due_at := now() + interval '7 days';
    end;
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

create or replace function dmg_cases_ai()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dmg.seed', true),'') = 'on' then
    return new;
  end if;
  perform dmg_write_log(new.id, new.reporter_username,
    case when new.status = 'Draft' then 'created_draft' else 'submitted' end,
    null, new.status,
    jsonb_build_object('case_number', new.case_number, 'priority', new.priority,
                       'incident_type', new.incident_type));
  return new;
end $$;

create or replace function dmg_cases_bu()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  total_capa int;
  active_assign int;
begin
  if coalesce(current_setting('dmg.seed', true),'') = 'on' then
    return new;
  end if;

  -- ฟิลด์ที่ห้ามเปลี่ยนหลังสร้าง
  if old.case_number is not null and new.case_number is distinct from old.case_number then
    raise exception 'แก้เลขที่เคสไม่ได้';
  end if;
  if new.client_token is distinct from old.client_token then
    raise exception 'แก้ client_token ไม่ได้';
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();

  -- Draft ส่งเรื่อง: ออกเลขเคส แล้วเข้าคิว "รับเรื่องใหม่" ทันที
  if old.status = 'Draft' and new.status = 'Submitted' then
    new.status := 'New';
    if new.case_number is null then new.case_number := dmg_next_case_number(); end if;
    if new.due_at is null then
      begin
        new.due_at := now() + make_interval(days => coalesce(
          (select nullif(value::text,'')::int from app_config where key = 'dmg_due_days'), 7));
      exception when others then
        new.due_at := now() + interval '7 days';
      end;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not exists (select 1 from dmg_status_transitions
                   where from_status = old.status and to_status = new.status) then
      raise exception 'เปลี่ยนสถานะจาก % ไปเป็น % ไม่ได้', old.status, new.status;
    end if;

    select count(*) into active_assign from dmg_assignments
      where case_id = new.id and assignment_status <> 'cancelled';
    select count(*) into total_capa from dmg_corrective_actions
      where case_id = new.id and status <> 'cancelled';

    if new.status = 'Awaiting Information' and coalesce(btrim(new.status_reason),'') = '' then
      raise exception 'ต้องระบุว่าขอข้อมูลอะไรเพิ่ม (status_reason)';
    end if;
    if new.status = 'Reopened' and coalesce(btrim(new.status_reason),'') = '' then
      raise exception 'ต้องระบุเหตุผลที่เปิดเคสอีกครั้ง (status_reason)';
    end if;
    if new.status = 'Assigned' and active_assign = 0 then
      raise exception 'ต้องมอบหมายผู้รับผิดชอบอย่างน้อย 1 รายการก่อน';
    end if;
    if new.status = 'Pending Approval' and (
         coalesce(btrim(new.root_cause),'') = '' or new.conclusion is null
         or coalesce(btrim(new.conclusion_reason),'') = '') then
      raise exception 'ต้องบันทึกสาเหตุราก ข้อสรุป และเหตุผลก่อนส่งขออนุมัติ';
    end if;
    if new.status = 'Pending Approval' then
      new.conclusion_by := coalesce(nullif(new.last_actor,''), new.conclusion_by);
      new.conclusion_at := now();
      new.conclusion_approved_by := null;
      new.conclusion_approved_at := null;
    end if;
    if new.status = 'Corrective Action' and old.status = 'Pending Approval' then
      new.conclusion_approved_by := coalesce(nullif(new.last_actor,''),'unknown');
      new.conclusion_approved_at := now();
    end if;
    if new.status = 'Verification' and (total_capa = 0 or exists (
         select 1 from dmg_corrective_actions where case_id = new.id and status in ('open','in_progress'))) then
      raise exception 'ต้องมีมาตรการแก้ไขและทำเสร็จทุกข้อก่อนส่งตรวจผล';
    end if;
    if new.status = 'Closed' then
      if new.conclusion is null or coalesce(btrim(new.conclusion_reason),'') = '' then
        raise exception 'ต้องมีข้อสรุปและเหตุผลก่อนปิดเคส';
      end if;
      if exists (select 1 from dmg_corrective_actions
                 where case_id = new.id and status in ('open','in_progress','done')) then
        raise exception 'ยังมีมาตรการแก้ไขที่ยังไม่ได้ตรวจสอบผล ปิดเคสไม่ได้';
      end if;
      new.closed_at := now();
    end if;
    if old.status = 'Closed' then
      new.closed_at := null;
    end if;
  end if;
  return new;
end $$;

create or replace function dmg_cases_au()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dmg.seed', true),'') = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status then
    perform dmg_write_log(new.id, new.last_actor, 'status_changed', old.status, new.status,
      jsonb_build_object('reason', new.status_reason));
  end if;
  if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
    perform dmg_write_log(new.id, new.last_actor, 'case_deleted', null, null, null);
  end if;
  if new.priority is distinct from old.priority then
    perform dmg_write_log(new.id, new.last_actor, 'priority_changed', old.priority, new.priority, null);
  end if;
  if new.conclusion is distinct from old.conclusion
     or new.conclusion_reason is distinct from old.conclusion_reason then
    perform dmg_write_log(new.id, new.last_actor, 'conclusion_saved', old.conclusion, new.conclusion,
      jsonb_build_object('reason', new.conclusion_reason, 'involved', new.involved_departments));
  end if;
  if new.conclusion_approved_by is distinct from old.conclusion_approved_by
     and new.conclusion_approved_by is not null then
    perform dmg_write_log(new.id, new.conclusion_approved_by, 'conclusion_approved', null, new.conclusion, null);
  end if;
  return new;
end $$;

drop trigger if exists dmg_cases_bi_t on dmg_cases;
create trigger dmg_cases_bi_t before insert on dmg_cases for each row execute function dmg_cases_bi();
drop trigger if exists dmg_cases_ai_t on dmg_cases;
create trigger dmg_cases_ai_t after insert on dmg_cases for each row execute function dmg_cases_ai();
drop trigger if exists dmg_cases_bu_t on dmg_cases;
create trigger dmg_cases_bu_t before update on dmg_cases for each row execute function dmg_cases_bu();
drop trigger if exists dmg_cases_au_t on dmg_cases;
create trigger dmg_cases_au_t after update on dmg_cases for each row execute function dmg_cases_au();

-- ── 9. Trigger ประวัติของตารางลูก ───────────────────────────────────────────
create or replace function dmg_child_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dmg.seed', true),'') = 'on' then
    return new;
  end if;

  if tg_table_name = 'dmg_attachments' then
    if tg_op = 'INSERT' then
      perform dmg_write_log(new.case_id, new.uploaded_by, 'attachment_added', null, new.file_name,
        jsonb_build_object('type', new.attachment_type, 'size', new.file_size));
    elsif new.deleted_at is not null and old.deleted_at is null then
      perform dmg_write_log(new.case_id, new.deleted_by, 'attachment_removed', new.file_name, null, null);
    end if;

  elsif tg_table_name = 'dmg_assignments' then
    if tg_op = 'INSERT' then
      perform dmg_write_log(new.case_id, new.assigned_by, 'assigned', null, new.assignee_username,
        jsonb_build_object('department', new.department_code, 'due_at', new.due_at, 'notes', new.notes));
    elsif new.assignment_status is distinct from old.assignment_status then
      perform dmg_write_log(new.case_id, new.assigned_by, 'assignment_' || new.assignment_status,
        old.assignment_status, new.assignment_status,
        jsonb_build_object('assignee', new.assignee_username));
    end if;

  elsif tg_table_name = 'dmg_investigations' then
    if tg_op = 'INSERT' then
      perform dmg_write_log(new.case_id, new.investigator_username, 'investigation_saved', null, null,
        jsonb_build_object('department', new.department_code));
    elsif new.submitted_at is not null and old.submitted_at is null then
      perform dmg_write_log(new.case_id, new.investigator_username, 'investigation_submitted', null, null, null);
    end if;

  elsif tg_table_name = 'dmg_corrective_actions' then
    if tg_op = 'INSERT' then
      perform dmg_write_log(new.case_id, new.created_by, 'capa_added', null, new.description,
        jsonb_build_object('type', new.action_type, 'owner', new.owner_username, 'due_at', new.due_at));
    elsif new.status is distinct from old.status then
      perform dmg_write_log(new.case_id, coalesce(nullif(new.last_actor,''), new.verified_by, new.owner_username),
        'capa_' || new.status, old.status, new.status, jsonb_build_object('capa', new.description));
    end if;

  elsif tg_table_name = 'dmg_comments' then
    if tg_op = 'INSERT' then
      perform dmg_write_log(new.case_id, new.username,
        case new.kind when 'info_request' then 'info_requested'
                      when 'info_response' then 'info_provided'
                      when 'dispute' then 'result_disputed'
                      else 'comment_added' end,
        null, left(new.comment, 200), null);
    end if;

  elsif tg_table_name = 'dmg_email_logs' then
    if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('sent','failed') then
      perform dmg_write_log(new.case_id, new.sent_by, 'email_' || new.status, null, new.subject,
        jsonb_build_object('recipient', new.recipient, 'error', new.error_message));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists dmg_attachments_log_t on dmg_attachments;
create trigger dmg_attachments_log_t after insert or update on dmg_attachments for each row execute function dmg_child_log();
drop trigger if exists dmg_assignments_log_t on dmg_assignments;
create trigger dmg_assignments_log_t after insert or update on dmg_assignments for each row execute function dmg_child_log();
drop trigger if exists dmg_investigations_log_t on dmg_investigations;
create trigger dmg_investigations_log_t after insert or update on dmg_investigations for each row execute function dmg_child_log();
drop trigger if exists dmg_capa_log_t on dmg_corrective_actions;
create trigger dmg_capa_log_t after insert or update on dmg_corrective_actions for each row execute function dmg_child_log();
drop trigger if exists dmg_comments_log_t on dmg_comments;
create trigger dmg_comments_log_t after insert on dmg_comments for each row execute function dmg_child_log();
drop trigger if exists dmg_email_log_t on dmg_email_logs;
create trigger dmg_email_log_t after update on dmg_email_logs for each row execute function dmg_child_log();

-- ── 10. ค่าตั้งต้นของระบบ (ปรับได้ที่หน้าตั้งค่า) ───────────────────────────
--  app_config เป็นตาราง key/value เดิมของ WMS
insert into app_config (key, value, updated_at) values
  ('dmg_max_photos','10', now()),
  ('dmg_max_photo_mb','10', now()),
  ('dmg_due_days','7', now()),
  ('dmg_company_name','บริษัท ที.แสตนดาร์ด สตีล จำกัด', now())
on conflict (key) do nothing;

-- ── 11. สิทธิ์การเข้าถึง (RLS) ─────────────────────────────────────────────
--  WMS ใช้ anon key กับระบบล็อกอินของตัวเอง ฐานข้อมูลแยกตัวบุคคลไม่ได้
--  จึงให้ select/insert/update ตามปกติ แต่ปิดสิ่งที่ต้องห้ามจริง: ลบ · แก้ประวัติ · ข้ามตัวนับ
alter table dmg_departments          enable row level security;
alter table dmg_staff                enable row level security;
alter table dmg_case_counters        enable row level security;
alter table dmg_cases                enable row level security;
alter table dmg_attachments          enable row level security;
alter table dmg_assignments          enable row level security;
alter table dmg_investigations       enable row level security;
alter table dmg_corrective_actions   enable row level security;
alter table dmg_comments             enable row level security;
alter table dmg_email_logs           enable row level security;
alter table dmg_activity_logs        enable row level security;
alter table dmg_status_transitions   enable row level security;

do $$
declare t text;
begin
  -- ตารางที่ client อ่าน/เพิ่ม/แก้ได้ (ห้ามลบ)
  foreach t in array array['dmg_departments','dmg_staff','dmg_cases','dmg_attachments','dmg_assignments',
                           'dmg_investigations','dmg_corrective_actions','dmg_comments'] loop
    execute format('drop policy if exists %I on %I', t||'_sel', t);
    execute format('drop policy if exists %I on %I', t||'_ins', t);
    execute format('drop policy if exists %I on %I', t||'_upd', t);
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t||'_sel', t);
    execute format('create policy %I on %I for insert to anon, authenticated with check (true)', t||'_ins', t);
    execute format('create policy %I on %I for update to anon, authenticated using (true) with check (true)', t||'_upd', t);
  end loop;
end $$;

-- อีเมล: client เพิ่มรายการ (pending) และอ่านได้ แต่ "แก้สถานะ" ไม่ได้ — มีแต่ Edge Function (service role) ที่เปลี่ยนเป็น sent/failed
drop policy if exists dmg_email_logs_sel on dmg_email_logs;
drop policy if exists dmg_email_logs_ins on dmg_email_logs;
create policy dmg_email_logs_sel on dmg_email_logs for select to anon, authenticated using (true);
create policy dmg_email_logs_ins on dmg_email_logs for insert to anon, authenticated
  with check (status = 'pending' and provider_message_id is null);

-- ประวัติ + ลำดับสถานะ: อ่านได้อย่างเดียว (trigger เขียนผ่าน security definer)
drop policy if exists dmg_activity_logs_sel on dmg_activity_logs;
create policy dmg_activity_logs_sel on dmg_activity_logs for select to anon, authenticated using (true);
drop policy if exists dmg_status_transitions_sel on dmg_status_transitions;
create policy dmg_status_transitions_sel on dmg_status_transitions for select to anon, authenticated using (true);
-- dmg_case_counters ไม่มี policy เลย: client แตะไม่ได้ ใช้ผ่านฟังก์ชันเท่านั้น

grant select, insert, update on dmg_departments, dmg_staff, dmg_cases, dmg_attachments, dmg_assignments,
      dmg_investigations, dmg_corrective_actions, dmg_comments to anon, authenticated;
grant select, insert on dmg_email_logs to anon, authenticated;
grant select on dmg_activity_logs, dmg_status_transitions to anon, authenticated;
grant usage, select on sequence dmg_activity_logs_id_seq to anon, authenticated;
revoke delete, truncate on dmg_departments, dmg_staff, dmg_cases, dmg_attachments, dmg_assignments,
      dmg_investigations, dmg_corrective_actions, dmg_comments, dmg_email_logs,
      dmg_activity_logs, dmg_status_transitions, dmg_case_counters from anon, authenticated;
revoke insert, update on dmg_activity_logs, dmg_status_transitions, dmg_case_counters from anon, authenticated;
revoke all on dmg_case_counters from anon, authenticated;

-- ฟังก์ชัน security definer เรียกผ่าน API (/rpc) ได้ตามค่าปริยาย → ต้องปิด ไม่งั้นใครก็ปลอมประวัติหรือเบิกเลขเคสทิ้งได้
-- (trigger ยังเรียกใช้ได้ตามปกติ เพราะรันด้วยสิทธิ์เจ้าของฟังก์ชัน)
revoke execute on function dmg_write_log(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function dmg_next_case_number() from public, anon, authenticated;

-- ให้ PostgREST เห็นตารางใหม่ทันที (ไม่งั้นจะขึ้น PGRST205 "Could not find the table")
notify pgrst, 'reload schema';

-- ── 12. ตรวจผลหลังรัน (SQL Editor ไม่โชว์ notice จึงแนบ SELECT ไว้ให้) ─────────
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name like 'dmg\_%')            as dmg_tables_expected_12,
  (select count(*) from pg_policies where schemaname = 'public'
    and tablename like 'dmg\_%')                                           as policies,
  (select count(*) from dmg_status_transitions)                            as transitions_expected_24,
  (select count(*) from dmg_departments)                                   as departments_expected_7,
  (select count(*) from pg_trigger where tgname like 'dmg\_%' and not tgisinternal) as triggers_expected_10;
