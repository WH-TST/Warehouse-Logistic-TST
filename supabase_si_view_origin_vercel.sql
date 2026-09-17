-- เพิ่ม origin ของ Vercel (URL ที่พนักงานและฝ่ายขายใช้จริง) เข้าใบอนุญาตฝ่ายขาย
-- เดิมล็อกไว้เฉพาะ wh-tst.github.io ซึ่งกำลังจะเลิกใช้
update public.si_view_access
   set origins = array['https://warehouse-logistic-tst.vercel.app',
                       'https://wh-tst.github.io']   -- คงตัวเก่าไว้ช่วงเปลี่ยนผ่าน
 where token = '7ec0fd111aad0952fad75fd39d9a2e019c201883eb675245';

select token, label, origins, expires, use_count from public.si_view_access;
