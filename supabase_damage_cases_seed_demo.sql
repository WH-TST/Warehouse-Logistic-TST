-- ══════════════════════════════════════════════════════════════════════════
--  ข้อมูลตัวอย่าง (DEMO) สำหรับระบบแจ้งสินค้าเสียหาย
--  รันหลัง supabase_damage_cases.sql  ·  ไม่บังคับ
--
--  ⚠ ทุกแถวมี is_demo = true  และเลขเคสขึ้นต้น DMG-DEMO-
--     หน้าจอมีสวิตช์ซ่อน/แสดงข้อมูลตัวอย่าง และติดป้าย "ตัวอย่าง" ให้เห็นชัด
--     ไม่ใช้ชื่อหรือข้อมูลส่วนบุคคลจริง · ไม่มีรูปจริง (ช่องรูปเว้นว่าง)
--
--  ลบข้อมูลตัวอย่างทั้งหมด (รันเป็น service_role / ใน SQL Editor):
--    delete from dmg_activity_logs      where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_email_logs         where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_comments           where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_corrective_actions where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_investigations     where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_assignments        where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_attachments        where case_id in (select id from dmg_cases where is_demo);
--    delete from dmg_cases              where is_demo;
-- ══════════════════════════════════════════════════════════════════════════

do $seed$
declare
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  c6 uuid; c7 uuid; c8 uuid; c9 uuid; c10 uuid;
  n timestamptz := now();
begin
  -- ปิด trigger ตรวจลำดับสถานะชั่วคราว เพื่อสร้างเคสที่อยู่กลางทางได้ตามจริง
  perform set_config('dmg.seed', 'on', true);

  if exists (select 1 from dmg_cases where is_demo) then
    raise notice 'มีข้อมูลตัวอย่างอยู่แล้ว — ข้ามการสร้างซ้ำ';
    return;
  end if;

  -- พนักงานตัวอย่าง (ชื่อสมมติ)
  insert into dmg_staff (username, display_name, department_code, role, can_approve, email) values
    ('demo.coord','เจ้าหน้าที่รับเรื่อง (ตัวอย่าง)','OFF','coordinator',true ,'coordinator@example.com'),
    ('demo.prod' ,'หัวหน้าฝ่ายผลิต (ตัวอย่าง)'   ,'PROD','investigator',false,'production@example.com'),
    ('demo.qc'   ,'หัวหน้า QC (ตัวอย่าง)'        ,'QC'  ,'investigator',false,'qc@example.com'),
    ('demo.wh'   ,'หัวหน้าคลังสินค้า (ตัวอย่าง)' ,'WH'  ,'investigator',true ,'warehouse@example.com'),
    ('demo.trn'  ,'หัวหน้าขนส่ง (ตัวอย่าง)'      ,'TRN' ,'investigator',false,'transport@example.com')
  on conflict (username) do nothing;

  -- 1. เสียหายในขั้นตอนผลิต — ปิดเคสแล้ว มีมาตรการป้องกัน
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name, lot_number,
    damaged_quantity, unit, estimated_damage_value, priority, status, root_cause, root_cause_category,
    involved_departments, conclusion, conclusion_reason, conclusion_by, conclusion_at,
    conclusion_approved_by, conclusion_approved_at, due_at, closed_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0001','ท่อเหล็กมีรอยบุบจากลูกกลิ้ง','demo.wh','หัวหน้าคลังสินค้า (ตัวอย่าง)','WH','production',
    'คลัง P1 จุดรับเข้า', n - interval '28 days','พบรอยบุบเป็นแนวยาวด้านข้างท่อ ลักษณะเดียวกันทั้งมัด','ผลิต',
    '0SQG200140','แป๊ปสี่เหลี่ยม GI 2"x1"x1.4 มม.','P229/07', 120,'เส้น', 18500,'high','Closed',
    'ลูกกลิ้งป้อนชุดที่ 3 สึก ทำให้ผิวท่อถูกกดเป็นรอยขณะรีด','เครื่องจักร (Machine)',
    array['PROD'],'production','หลักฐานภาพถ่ายและบันทึกการตรวจเครื่องตรงกันว่าเกิดที่ขั้นตอนรีด',
    'demo.prod', n - interval '24 days','demo.wh', n - interval '23 days',
    n - interval '21 days', n - interval '20 days', true, n - interval '28 days', n - interval '20 days')
  returning id into c1;

  -- 2. QC ปล่อยสินค้าที่มีตำหนิ — อยู่ระหว่างดำเนินการแก้ไข
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name, lot_number,
    damaged_quantity, unit, estimated_damage_value, priority, status, root_cause, root_cause_category,
    involved_departments, conclusion, conclusion_reason, conclusion_by, conclusion_at,
    conclusion_approved_by, conclusion_approved_at, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0002','สีเคลือบลอกเป็นหย่อม หลุดจากการตรวจ QC','demo.wh','หัวหน้าคลังสินค้า (ตัวอย่าง)','WH','qc_escape',
    'คลัง P2', n - interval '12 days','สีลอกเป็นหย่อมบริเวณปลายท่อ พบตอนจัดเตรียมส่ง','QC',
    '0RTG40.1400','แป๊ปแบน GI 4"x2"x1.4 มม.','P228/08', 60,'เส้น', 9200,'normal','Corrective Action',
    'จุดตรวจ QC ไม่ได้กำหนดให้ตรวจผิวเคลือบที่ปลายท่อ','วิธีการ / ขั้นตอน (Method)',
    array['QC','PROD'],'qc','เอกสารแผนการตรวจไม่ครอบคลุมจุดที่พบตำหนิ',
    'demo.qc', n - interval '8 days','demo.wh', n - interval '7 days', n - interval '2 days', true,
    n - interval '12 days', n - interval '7 days')
  returning id into c2;

  -- 3. เสียหายระหว่างจัดเก็บ — รอตรวจผลการแก้ไข
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, root_cause, root_cause_category,
    involved_departments, conclusion, conclusion_reason, conclusion_by, conclusion_at,
    conclusion_approved_by, conclusion_approved_at, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0003','กองสินค้าล้มระหว่างจัดเก็บ','demo.coord','เจ้าหน้าที่รับเรื่อง (ตัวอย่าง)','OFF','warehouse_storage',
    'คลัง P3 ช่อง B4', n - interval '9 days','กองบนสุดเอียงและล้มทับกองข้างเคียง','รับเข้า / จัดเก็บ',
    '0SQG150140','แป๊ปสี่เหลี่ยม GI 1.5"x1.5"x1.4 มม.', 45,'เส้น', 6800,'normal','Verification',
    'วางซ้อนเกินจำนวนชั้นที่กำหนดบนฉลาก 2 ชั้น','คน (Man)',
    array['WH'],'warehouse','ภาพถ่ายก่อนล้มแสดงจำนวนชั้นเกินมาตรฐานชัดเจน',
    'demo.wh', n - interval '5 days','demo.wh', n - interval '5 days', n - interval '1 day', true,
    n - interval '9 days', n - interval '3 days')
  returning id into c3;

  -- 4. เสียหายจากการหยิบ/แพ็ก — รออนุมัติแนวทางแก้ไข
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, root_cause, root_cause_category,
    involved_departments, conclusion, conclusion_reason, conclusion_by, conclusion_at, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0004','มัดสินค้าหลุดระหว่างหยิบของ','demo.wh','หัวหน้าคลังสินค้า (ตัวอย่าง)','WH','pick_pack',
    'คลัง P1 โซนหยิบ', n - interval '6 days','สายรัดขาด สินค้าร่วงกระแทกพื้น','หยิบ / แพ็ก',
    '0RTG20.1400','แป๊ปแบน GS 2"x1"x1.4 มม.', 30,'เส้น', 4100,'normal','Pending Approval',
    'ใช้สายรัดผิดขนาดกับมัดที่มีน้ำหนักเกิน 400 กก.','วัสดุ (Material)',
    array['WH'],'warehouse','ตรวจสอบสายรัดที่ขาดพบว่าเป็นขนาดสำหรับมัดเบา',
    'demo.wh', n - interval '3 days', n + interval '1 day', true, n - interval '6 days', n - interval '3 days')
  returning id into c4;

  -- 5. เสียหายระหว่างโหลด — อยู่ระหว่างสอบสวน
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0005','สินค้าครูดกับขอบกระบะรถขณะโหลด','demo.wh','หัวหน้าคลังสินค้า (ตัวอย่าง)','WH','loading',
    'จุดโหลด 2', n - interval '4 days','ผิวเคลือบเป็นรอยครูดยาวตลอดเส้น','โหลดสินค้า',
    '0SQG400160','แป๊ปสี่เหลี่ยม GI 4"x4"x1.6 มม.', 25,'เส้น', 7300,'high','Investigating',
    n + interval '2 days', true, n - interval '4 days', n - interval '2 days')
  returning id into c5;

  -- 6. ลูกค้าแจ้งหลังส่งมอบ — มอบหมายแล้ว
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, delivery_reference, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0006','ลูกค้าแจ้งสินค้าบุบเมื่อเปิดมัด','demo.coord','เจ้าหน้าที่รับเรื่อง (ตัวอย่าง)','OFF','customer_found',
    'หน้างานลูกค้า', n - interval '3 days','ลูกค้าส่งรูปแสดงรอยบุบ 3 จุดบนเส้นเดียวกัน','ไม่ทราบ',
    '0SQG200120','แป๊ปสี่เหลี่ยม GI 2"x2"x1.2 มม.', 18,'เส้น', 2600,'high','Assigned',
    'LD2610041', n + interval '3 days', true, n - interval '3 days', n - interval '1 day')
  returning id into c6;

  -- 7. เสียหายระหว่างขนส่ง — ตรวจสอบข้อมูล
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, delivery_reference, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0007','สินค้าเลื่อนชนกันระหว่างขนส่ง','demo.trn','หัวหน้าขนส่ง (ตัวอย่าง)','TRN','transport',
    'ระหว่างทาง', n - interval '2 days','ปลายเส้นบุบจากการกระแทกกันเอง คาดว่ารัดยึดไม่แน่น','ขนส่ง',
    '0RTG600210','แป๊ปแบน GI 6"x2"x1.0 มม.', 40,'เส้น', 11200,'normal','Under Review',
    'LD2610052', n + interval '4 days', true, n - interval '2 days', n - interval '1 day')
  returning id into c7;

  -- 8. ยังหาต้นเหตุไม่ได้ — รอข้อมูลเพิ่มเติม
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, status_reason, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0008','พบรอยร้าวไม่ทราบสาเหตุ','demo.wh','หัวหน้าคลังสินค้า (ตัวอย่าง)','WH','unknown',
    'คลัง P2', n - interval '2 days','รอยร้าวเล็กที่รอยเชื่อม ไม่แน่ใจว่าเกิดขั้นตอนใด','ไม่ทราบ',
    '0SQG150160','แป๊ปสี่เหลี่ยม GI 1.5"x1.5"x1.6 มม.', 12,'เส้น', 1800,'normal','Awaiting Information',
    'ขอรูปถ่ายระยะใกล้ของรอยร้าว และเลขล็อตผลิตที่ชัดเจน', n + interval '5 days', true, n - interval '2 days', n - interval '1 day')
  returning id into c8;

  -- 9. หลายฝ่ายเกี่ยวข้อง — ดำเนินการแก้ไข
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, root_cause, root_cause_category,
    involved_departments, conclusion, conclusion_reason, conclusion_by, conclusion_at,
    conclusion_approved_by, conclusion_approved_at, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0009','สินค้าเสียหายจากหลายขั้นตอนต่อเนื่อง','demo.coord','เจ้าหน้าที่รับเรื่อง (ตัวอย่าง)','OFF','warehouse_storage',
    'คลัง P4 และจุดโหลด 1', n - interval '15 days','พบทั้งรอยบุบเดิมจากการจัดเก็บ และรอยครูดใหม่จากการโหลด','ไม่ทราบ',
    '0SQG3002100','แป๊ปสี่เหลี่ยม GI 3"x1.5"x2.1 มม.', 55,'เส้น', 14500,'urgent','Corrective Action',
    'กองสินค้าสูงเกินมาตรฐาน ร่วมกับการใช้สลิงผิดประเภทตอนยกขึ้นรถ','การจัดการ / การขนย้าย',
    array['WH','TRN'],'multiple','หลักฐานภาพถ่ายสองช่วงเวลาแสดงความเสียหายคนละลักษณะ',
    'demo.wh', n - interval '9 days','demo.wh', n - interval '8 days', n - interval '3 days', true,
    n - interval '15 days', n - interval '8 days')
  returning id into c9;

  -- 10. เคสใหม่ยังไม่ได้ดำเนินการ
  insert into dmg_cases (case_number, title, reporter_username, reporter_name, department_code, incident_type,
    incident_location, incident_datetime, symptom, suspected_stage, product_code, product_name,
    damaged_quantity, unit, estimated_damage_value, priority, status, due_at, is_demo, created_at, updated_at)
  values ('DMG-DEMO-0010','พบสินค้าบุบตอนรับเข้าคลัง','demo.wh','หัวหน้าคลังสินค้า (ตัวอย่าง)','WH','warehouse_storage',
    'จุดรับเข้า', n - interval '6 hours','มุมมัดบุบ พบตั้งแต่ก่อนนำเข้าช่องเก็บ','รับเข้า / จัดเก็บ',
    '0RTG30.1400','แป๊ปแบน GS 3"x1.5"x1.4 มม.', 22,'เส้น', 3200,'normal','New',
    n + interval '7 days', true, n - interval '6 hours', n - interval '6 hours')
  returning id into c10;

  -- มอบหมาย
  insert into dmg_assignments (case_id, department_code, assignee_username, assigned_by, assigned_at, due_at, assignment_status, notes) values
    (c1,'PROD','demo.prod','demo.coord', n - interval '27 days', n - interval '24 days','done','ขอให้ตรวจสอบเครื่องรีดและบันทึกการบำรุงรักษา'),
    (c2,'QC'  ,'demo.qc'  ,'demo.coord', n - interval '11 days', n - interval '8 days' ,'done','ขอให้ทบทวนแผนการตรวจผิวเคลือบ'),
    (c3,'WH'  ,'demo.wh'  ,'demo.coord', n - interval '8 days' , n - interval '5 days' ,'done','ตรวจสอบมาตรฐานการวางซ้อน'),
    (c4,'WH'  ,'demo.wh'  ,'demo.coord', n - interval '5 days' , n - interval '3 days' ,'done','ตรวจสอบสเปกสายรัด'),
    (c5,'WH'  ,'demo.wh'  ,'demo.coord', n - interval '3 days' , n + interval '2 days' ,'open','ขอผลตรวจสอบขั้นตอนการโหลด'),
    (c5,'TRN' ,'demo.trn' ,'demo.coord', n - interval '3 days' , n + interval '2 days' ,'open','ขอตรวจสภาพกระบะรถคันที่ใช้'),
    (c6,'WH'  ,'demo.wh'  ,'demo.coord', n - interval '1 day'  , n + interval '3 days' ,'open','ตรวจสอบภาพถ่ายตอนโหลดเทียบกับภาพจากลูกค้า'),
    (c7,'TRN' ,'demo.trn' ,'demo.coord', n - interval '1 day'  , n + interval '4 days' ,'open','ตรวจสอบการรัดยึดสินค้า'),
    (c9,'WH'  ,'demo.wh'  ,'demo.coord', n - interval '14 days', n - interval '9 days' ,'done','ตรวจสอบมาตรฐานการจัดเก็บ'),
    (c9,'TRN' ,'demo.trn' ,'demo.coord', n - interval '14 days', n - interval '9 days' ,'done','ตรวจสอบอุปกรณ์ยก');

  -- ผลสอบสวน
  insert into dmg_investigations (case_id, department_code, investigator_username, investigation_summary, dept_statement,
    process_involved, root_cause_category, root_cause, evidence_summary, conclusion, investigated_at, submitted_at, approved_by, approved_at) values
    (c1,'PROD','demo.prod','ตรวจสอบเครื่องรีดและบันทึกการบำรุงรักษาย้อนหลัง 3 เดือน',
      'ยอมรับว่าเกิดจากเครื่องจักรของฝ่ายผลิต ลูกกลิ้งเลยรอบเปลี่ยนมา 2 สัปดาห์','ผลิต','เครื่องจักร (Machine)',
      'ลูกกลิ้งป้อนชุดที่ 3 สึก','ภาพถ่ายรอยบุบ + บันทึกการตรวจเครื่อง + ชิ้นงานตัวอย่าง','เกิดจากฝ่ายผลิต',
      n - interval '25 days', n - interval '24 days','demo.wh', n - interval '23 days'),
    (c2,'QC','demo.qc','ทบทวนแผนการตรวจและสุ่มตรวจล็อตเดียวกันเพิ่ม',
      'แผนการตรวจเดิมไม่ได้ระบุให้ตรวจผิวเคลือบบริเวณปลายท่อ','ตรวจ QC','วิธีการ / ขั้นตอน (Method)',
      'จุดตรวจไม่ครอบคลุม','เอกสารแผนการตรวจ + ผลสุ่มตรวจล็อตเดียวกัน','เกิดจากกระบวนการ QC',
      n - interval '9 days', n - interval '8 days','demo.wh', n - interval '7 days'),
    (c9,'WH','demo.wh','ตรวจสอบภาพถ่ายจากกล้องวงจรปิดช่วงจัดเก็บและช่วงโหลด',
      'พบว่ากองสูงเกินมาตรฐาน และตอนยกใช้สลิงผิดประเภท','จัดเก็บ','การจัดการ / การขนย้าย',
      'กองสูงเกินมาตรฐานร่วมกับอุปกรณ์ยกผิดประเภท','ภาพกล้องวงจรปิด 2 ช่วงเวลา','หลายฝ่ายเกี่ยวข้อง',
      n - interval '10 days', n - interval '9 days','demo.wh', n - interval '8 days');

  -- มาตรการแก้ไข
  insert into dmg_corrective_actions (case_id, action_type, description, owner_username, department_code,
    due_at, status, completion_notes, completed_at, verified_by, verified_at, created_by, created_at) values
    (c1,'immediate','คัดแยกสินค้าที่มีรอยบุบออกทั้งล็อต','demo.prod','PROD', n - interval '26 days','verified',
      'คัดแยกครบ 120 เส้น', n - interval '26 days','demo.wh', n - interval '21 days','demo.coord', n - interval '27 days'),
    (c1,'preventive','เพิ่มรอบตรวจลูกกลิ้งเป็นทุกสัปดาห์ และกำหนดรอบเปลี่ยนตามชั่วโมงใช้งาน','demo.prod','PROD',
      n - interval '22 days','verified','ปรับแผนบำรุงรักษาแล้ว', n - interval '22 days','demo.wh', n - interval '21 days','demo.prod', n - interval '24 days'),
    (c2,'immediate','กักสินค้าล็อตเดียวกันทั้งหมดเพื่อตรวจซ้ำ','demo.qc','QC', n - interval '7 days','done',
      'กักและตรวจซ้ำครบแล้ว', n - interval '6 days', null, null,'demo.coord', n - interval '8 days'),
    (c2,'preventive','แก้แผนการตรวจ QC ให้รวมการตรวจผิวเคลือบปลายท่อทุกล็อต','demo.qc','QC', n + interval '3 days','in_progress',
      null, null, null, null,'demo.qc', n - interval '7 days'),
    (c3,'immediate','จัดกองใหม่ให้อยู่ในจำนวนชั้นที่กำหนด','demo.wh','WH', n - interval '4 days','done',
      'จัดกองใหม่ทั้งช่อง B4', n - interval '4 days', null, null,'demo.wh', n - interval '5 days'),
    (c3,'preventive','ติดป้ายจำนวนชั้นสูงสุดที่หน้าช่องเก็บทุกช่อง','demo.wh','WH', n - interval '1 day','done',
      'ติดป้ายครบทุกช่องในคลัง P3', n - interval '2 days', null, null,'demo.wh', n - interval '4 days'),
    (c9,'immediate','แยกสินค้าที่เสียหายออกและแจ้งฝ่ายขาย','demo.wh','WH', n - interval '8 days','verified',
      'แยกครบและแจ้งแล้ว', n - interval '8 days','demo.wh', n - interval '4 days','demo.coord', n - interval '9 days'),
    (c9,'preventive','อบรมการใช้สลิงให้ถูกประเภท และทบทวนมาตรฐานความสูงกอง','demo.wh','WH', n + interval '2 days','in_progress',
      null, null, null, null,'demo.wh', n - interval '8 days');

  -- ความคิดเห็น / การขอข้อมูล
  insert into dmg_comments (case_id, username, display_name, kind, comment, created_at) values
    (c8,'demo.coord','เจ้าหน้าที่รับเรื่อง (ตัวอย่าง)','info_request','ขอรูปถ่ายระยะใกล้ของรอยร้าว และเลขล็อตผลิตที่อ่านได้ชัด', n - interval '1 day'),
    (c5,'demo.trn' ,'หัวหน้าขนส่ง (ตัวอย่าง)'      ,'comment'     ,'ขอดูภาพตอนจัดวางบนรถก่อนออกด้วย เพื่อเทียบกับสภาพตอนถึงปลายทาง', n - interval '1 day'),
    (c1,'demo.prod','หัวหน้าฝ่ายผลิต (ตัวอย่าง)'   ,'comment'     ,'ได้ปรับแผนบำรุงรักษาเรียบร้อยแล้ว', n - interval '22 days');

  -- ประวัติเคส (ปกติ trigger เขียนให้ — seed ปิด trigger ไว้จึงใส่เองให้ timeline มีข้อมูล)
  insert into dmg_activity_logs (case_id, actor, action, old_value, new_value, created_at) values
    (c1,'demo.wh'   ,'submitted'           ,null  ,'New'              , n - interval '28 days'),
    (c1,'demo.coord','assigned'            ,null  ,'demo.prod'        , n - interval '27 days'),
    (c1,'demo.prod' ,'investigation_saved' ,null  ,null               , n - interval '25 days'),
    (c1,'demo.wh'   ,'conclusion_approved' ,null  ,'production'       , n - interval '23 days'),
    (c1,'demo.wh'   ,'status_changed'      ,'Verification','Closed'   , n - interval '20 days'),
    (c2,'demo.wh'   ,'submitted'           ,null  ,'New'              , n - interval '12 days'),
    (c2,'demo.coord','assigned'            ,null  ,'demo.qc'          , n - interval '11 days'),
    (c2,'demo.wh'   ,'conclusion_approved' ,null  ,'qc'               , n - interval '7 days'),
    (c10,'demo.wh'  ,'submitted'           ,null  ,'New'              , n - interval '6 hours');

  -- อีเมล: ตัวอย่างทั้งสำเร็จและล้มเหลว (สถานะต้องตรงกับผลจริงเสมอ)
  insert into dmg_email_logs (case_id, recipient, subject, body, email_type, status, provider_message_id,
    error_message, attempts, sent_by, sent_at, created_at) values
    (c1,'production@example.com','[Damage Report] DMG-DEMO-0001 - ขอให้ตรวจสอบสินค้าเสียหาย',
      'เรียน ฝ่ายที่เกี่ยวข้อง ...','request_review','sent','demo-msg-0001', null, 1,'demo.coord',
      n - interval '27 days', n - interval '27 days'),
    (c2,'qc@example.com','[Damage Report] DMG-DEMO-0002 - ขอให้ตรวจสอบสินค้าเสียหาย',
      'เรียน ฝ่ายที่เกี่ยวข้อง ...','request_review','sent','demo-msg-0002', null, 1,'demo.coord',
      n - interval '11 days', n - interval '11 days'),
    (c8,'warehouse@example.com','[Damage Report] DMG-DEMO-0008 - ขอข้อมูลเพิ่มเติม',
      'เรียน ผู้แจ้ง ...','request_info','failed', null,'ยังไม่ได้ตั้งค่า Email Provider (RESEND_API_KEY)', 1,
      'demo.coord', null, n - interval '1 day');

  raise notice 'สร้างข้อมูลตัวอย่าง 10 เคสเรียบร้อย';
end $seed$;

-- ตรวจผล
select
  (select count(*) from dmg_cases where is_demo)                                         as demo_cases_expected_10,
  (select count(*) from dmg_assignments where case_id in (select id from dmg_cases where is_demo))        as assignments,
  (select count(*) from dmg_corrective_actions where case_id in (select id from dmg_cases where is_demo)) as capa,
  (select count(*) from dmg_investigations where case_id in (select id from dmg_cases where is_demo))     as investigations,
  (select count(*) from dmg_email_logs where case_id in (select id from dmg_cases where is_demo))         as emails,
  (select count(*) from dmg_staff where username like 'demo.%')                          as demo_staff_expected_5;
