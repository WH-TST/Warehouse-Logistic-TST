-- ══════════════════════════════════════════════════════════════════════
--  ตรวจข้อมูลโหลดจริง — รถ 90-8675 (LD2610054)
--  เอาไว้เทียบว่า "รถแม่" กับ "รถลูก" ได้ของตรงตามแผนแบ่งของหรือไม่
-- ══════════════════════════════════════════════════════════════════════

-- ① แผนแบ่งของ: ใบนี้ตั้งใจให้แม่/ลูก ขนอะไรอย่างละเท่าไหร่
select o.order_no,
       o.truck_plate,
       i.ordinality - 1                       as ลำดับรายการ,
       i.item ->> 'sku'                       as sku,
       (i.item ->> 'qty')::numeric            as สั่งทั้งใบ_เส้น,
       (o.trailer_split -> (i.ordinality-1)::text ->> 'mother_pcs')::numeric  as แม่_เส้น,
       (o.trailer_split -> (i.ordinality-1)::text ->> 'mother_kg')::numeric   as แม่_กก,
       (o.trailer_split -> (i.ordinality-1)::text ->> 'trailer_pcs')::numeric as ลูก_เส้น,
       (o.trailer_split -> (i.ordinality-1)::text ->> 'trailer_kg')::numeric  as ลูก_กก
  from public.loading_orders o,
       lateral jsonb_array_elements(o.items) with ordinality as i(item, ordinality)
 where o.truck_plate = '90-8675'
   and o.load_date   = date '2026-10-06'
 order by i.ordinality;

-- ② โหลดจริง: ทีละหน่วยรถ ทีละรายการ พร้อมรายละเอียดรายลิฟต์
select s.truck_unit                           as หน่วยรถ,
       s.item_idx                             as ลำดับรายการ,
       s.sku,
       s.record_type                          as ประเภทแถว,
       s.qty                                  as โหลดจริง_เส้น,
       s.weight                               as โหลดจริง_กก,
       jsonb_array_length(coalesce(s.lifts,'[]'::jsonb)) as จำนวนลิฟต์,
       s.lifts,
       s.staff_name                           as คนกรอก,
       s.updated_at at time zone 'Asia/Bangkok' as แก้ล่าสุด,
       s.id
  from public.loading_sessions s
  join public.loading_orders   o on o.id = s.order_id
 where o.truck_plate = '90-8675'
   and o.load_date   = date '2026-10-06'
 order by s.truck_unit, s.item_idx, s.record_type;

-- ③ สรุปเทียบ แผน vs จริง — แถวไหนผิดหน่วยจะเห็นทันที
--    "ผิดหน่วย" = แผนไม่ได้แบ่งของให้หน่วยนี้เลย (0 ทั้งเส้นและ กก.) แต่กลับมีตัวเลขโหลด
with plan as (
    select o.id,
           i.ordinality - 1 as item_idx,
           (o.trailer_split -> (i.ordinality-1)::text ->> 'mother_pcs')::numeric  as m_pcs,
           (o.trailer_split -> (i.ordinality-1)::text ->> 'mother_kg')::numeric   as m_kg,
           (o.trailer_split -> (i.ordinality-1)::text ->> 'trailer_pcs')::numeric as t_pcs,
           (o.trailer_split -> (i.ordinality-1)::text ->> 'trailer_kg')::numeric  as t_kg
      from public.loading_orders o,
           lateral jsonb_array_elements(o.items) with ordinality as i(item, ordinality)
     where o.truck_plate = '90-8675'
       and o.load_date   = date '2026-10-06'
)
select s.truck_unit  as หน่วยรถ,
       s.item_idx    as ลำดับรายการ,
       s.sku,
       case when s.truck_unit = 'trailer' then p.t_pcs else p.m_pcs end as แผน_เส้น,
       case when s.truck_unit = 'trailer' then p.t_kg  else p.m_kg  end as แผน_กก,
       s.qty         as จริง_เส้น,
       s.weight      as จริง_กก,
       case
         when case when s.truck_unit='trailer' then coalesce(p.t_pcs,0)+coalesce(p.t_kg,0)
                   else coalesce(p.m_pcs,0)+coalesce(p.m_kg,0) end = 0
              then '⚠ ผิดหน่วย — แผนไม่ได้แบ่งของให้หน่วยนี้'
         when s.qty = 0 and s.weight > 0
              then '⚠ มีน้ำหนักแต่ไม่มีจำนวน'
         when s.weight = 0 and s.qty > 0
              then '⚠ มีจำนวนแต่ไม่มีน้ำหนัก'
         else 'ปกติ'
       end as ผลตรวจ
  from public.loading_sessions s
  join plan p on p.id = s.order_id and p.item_idx = s.item_idx
 where s.record_type <> 'draft'
 order by s.truck_unit, s.item_idx;

-- ④ หาแถวที่ "แม่กับลูกเหมือนกันเป๊ะ" ทั้งระบบ — อาการข้อมูลข้ามหน่วย
--    ถ้าลิฟต์เหมือนกันทุกช่อง แปลว่าคัดลอกมา ไม่ใช่โหลดจริงสองรอบ
select o.order_no, o.truck_plate, o.load_date, a.sku, a.item_idx,
       a.qty as แม่_เส้น, a.weight as แม่_กก,
       b.qty as ลูก_เส้น, b.weight as ลูก_กก
  from public.loading_sessions a
  join public.loading_sessions b
    on b.order_id = a.order_id
   and b.item_idx = a.item_idx
   and b.truck_unit = 'trailer'
   and b.record_type <> 'draft'
  join public.loading_orders o on o.id = a.order_id
 where a.truck_unit = 'mother'
   and a.record_type <> 'draft'
   and a.lifts = b.lifts
   and jsonb_array_length(coalesce(a.lifts,'[]'::jsonb)) > 0
 order by o.load_date desc;
