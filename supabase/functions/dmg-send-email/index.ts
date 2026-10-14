// ══════════════════════════════════════════════════════════════════════════
//  Edge Function: ส่งอีเมลของระบบแจ้งสินค้าเสียหาย ผ่าน Resend
//  ───────────────────────────────────────────────────────────────────────
//  ทำไมต้องส่งจากฝั่งนี้ ไม่ใช่จากหน้าเว็บ:
//    - ต้องใช้ RESEND_API_KEY ซึ่งเป็นความลับ ห้ามอยู่ใน client-side code
//    - ต้องได้ "ผลยืนยันจริง" จาก Provider ก่อนบอกว่าส่งสำเร็จ (ตามข้อกำหนด)
//
//  รับ: { email_log_id: uuid }  (แถวที่มีอยู่แล้วใน dmg_email_logs, status='pending')
//  ทำ : ส่งอีเมลจริง แล้วอัปเดตแถวเดิมเป็น sent/failed ตามผลจริงจาก Resend
//       ไม่เคยสร้างแถวใหม่ และไม่เคยเขียน status='sent' โดยไม่มี provider_message_id
//
//  Deploy: supabase functions deploy dmg-send-email
//  ตั้งค่า secret ก่อน: supabase secrets set RESEND_API_KEY=re_xxx
//  ยังไม่ตั้ง secret → ฟังก์ชันตอบ 200 พร้อม status='failed' เสมอ (ไม่ throw, ไม่ค้าง)
//    เพื่อให้หน้าจอขึ้น "ส่งไม่สำเร็จ" ตามจริง แทนที่จะโชว์ error ดิบใส่ผู้ใช้
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_ADDRESS    = Deno.env.get('DMG_FROM_EMAIL') || 'Damage Report <onboarding@resend.dev>';
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { email_log_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  if (!body.email_log_id) return json({ error: 'email_log_id required' }, 400);

  // service role: ตารางนี้ client แก้ status เป็น sent/failed ไม่ได้ (ดู RLS ใน migration)
  // ฟังก์ชันนี้เป็นทางเดียวที่เปลี่ยนสถานะได้จริง
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: row, error: readErr } = await sb
    .from('dmg_email_logs').select('*').eq('id', body.email_log_id).maybeSingle();
  if (readErr) return json({ error: readErr.message }, 500);
  if (!row) return json({ error: 'email_log row not found' }, 404);
  if (row.status === 'sent') return json({ ok: true, already_sent: true });

  async function markFailed(msg: string) {
    await sb.from('dmg_email_logs').update({
      status: 'failed', error_message: msg, attempts: (row.attempts || 0) + 1,
    }).eq('id', row.id).eq('status', row.status); // กันแก้ทับถ้ามีคนกดส่งซ้ำพร้อมกัน
    return json({ ok: false, status: 'failed', error: msg });
  }

  if (!RESEND_API_KEY) {
    return await markFailed('ยังไม่ได้ตั้งค่า RESEND_API_KEY — ติดต่อผู้ดูแลระบบให้เปิดใช้งานอีเมลก่อน');
  }

  try {
    const payload: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: [row.recipient],
      subject: row.subject,
      text: row.body || '',
    };
    if (row.cc) payload.cc = String(row.cc).split(',').map((s: string) => s.trim()).filter(Boolean);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const resJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      return await markFailed(resJson?.message || `Resend ตอบรหัส ${res.status}`);
    }

    const { error: upErr } = await sb.from('dmg_email_logs').update({
      status: 'sent',
      provider_message_id: resJson?.id || null,
      sent_at: new Date().toISOString(),
      attempts: (row.attempts || 0) + 1,
    }).eq('id', row.id).eq('status', row.status);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, status: 'sent', provider_message_id: resJson?.id || null });
  } catch (e) {
    return await markFailed(String(e && (e as Error).message || e));
  }
});
