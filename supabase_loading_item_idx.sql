-- ══════════════════════════════════════════════════════════════════════
--  ระบุว่าแถวโหลดนี้คือ "รายการที่เท่าไหร่" ของออเดอร์ — loading_sessions.item_idx
--
--  ที่มา: ออเดอร์หนึ่งใบมี SKU ซ้ำกันหลายแถวได้ (เจอจริง 12 ใบใน 5 วัน
--         ใบหนึ่งซ้ำถึง 4 SKU) แต่ loading_sessions ไม่มีอะไรบอกว่าแถวนั้น
--         ผูกกับรายการไหนของออเดอร์ ทุกจุดจึงจับคู่ด้วย sku
--
--  ผลที่เกิด:
--    • กรอกแถวบน ค่าไปโผล่แถวล่าง (และกลับกัน) เพราะถือว่าเป็นแถวเดียวกัน
--    • โค้ดกันข้อมูลซ้ำ "เก็บแถวล่าสุดต่อ sku" ลบแถวที่สองทิ้ง ข้อมูลหาย
--    • คนอื่นเปิดดูแล้วไม่เห็นของที่เพื่อนกรอกค้างไว้
--
--  แก้: เก็บ index ของรายการในออเดอร์ไว้ตรงๆ แล้วให้ทุกจุดจับคู่ด้วย
--       (order_id, truck_unit, item_idx) ซึ่งไม่มีทางชนกัน
--       แถวเก่าที่ยังเป็น null ให้ fallback ไปใช้ sku เหมือนเดิม
-- ══════════════════════════════════════════════════════════════════════

alter table public.loading_sessions
    add column if not exists item_idx int;

comment on column public.loading_sessions.item_idx is
    'ลำดับรายการในออเดอร์ (index ของ loading_orders.items) — ใช้จับคู่แทน sku เพราะ SKU ซ้ำกันในใบเดียวได้';

create index if not exists idx_loading_sessions_item
    on public.loading_sessions (order_id, truck_unit, item_idx);

-- ── ตรวจผล ────────────────────────────────────────────────────────────
select count(*)                                   as ทั้งหมด,
       count(*) filter (where item_idx is null)   as ยังไม่มีลำดับ
  from public.loading_sessions;
