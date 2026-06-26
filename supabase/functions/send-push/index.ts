import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC  = 'BNdLqIxx-vQ3oAP2-oxI2CGMou6ZF2aEcz3fbRLMOo2643ABKG8sUi7515YfrUAJIcM9xxo5u8g_5n0LU8upcb0';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = 'mailto:s.chakkarin@tstandardsteel.com';

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importPrivateKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function makeVapidHeader(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })));
  const signing = new TextEncoder().encode(`${header}.${payload}`);
  const key = await importPrivateKey(VAPID_PRIVATE);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signing);
  return `vapid t=${header}.${payload}.${b64url(sig)},k=${VAPID_PUBLIC}`;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<boolean> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const authHeader = await makeVapidHeader(audience);

  // Encrypt payload using Web Push encryption (RFC 8291)
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPublicRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey);

  const clientPublicRaw = Uint8Array.from(atob(sub.p256dh.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  const clientPublic = await crypto.subtle.importKey('raw', clientPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const authRaw = Uint8Array.from(atob(sub.auth.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));

  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublic }, serverKeys.privateKey, 256);

  const prk = await crypto.subtle.importKey('raw', new Uint8Array(sharedBits), { name: 'HKDF' }, false, ['deriveBits']);
  const context = new Uint8Array([...encoder.encode('P-256'), 0, 0, 65, ...clientPublicRaw, 0, 65, ...new Uint8Array(serverPublicRaw)]);

  const prkInfo = new Uint8Array([...encoder.encode('Content-Encoding: auth\0')]);
  const ikm = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authRaw, info: prkInfo }, prk, 256);

  const cekInfo = new Uint8Array([...encoder.encode('Content-Encoding: aesgcm\0'), ...context]);
  const ivInfo  = new Uint8Array([...encoder.encode('Content-Encoding: nonce\0'),  ...context]);

  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, ikmKey, 128);
  const ivBits  = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: ivInfo  }, ikmKey, 96);

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);
  const padded = new Uint8Array([0, 0, ...encoder.encode(payload)]);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBits }, cek, padded);

  const body = new Uint8Array([...salt, ...new Uint8Array(4).fill(4096 >> 0 & 0xff), ...[0x01, new Uint8Array(serverPublicRaw).length], ...new Uint8Array(serverPublicRaw), ...new Uint8Array(encrypted)]);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${b64url(salt.buffer)}`,
      'Crypto-Key': `dh=${b64url(serverPublicRaw)}`,
      'TTL': '86400',
    },
    body
  });
  return res.ok || res.status === 201;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });

  const { title, body, tag, url: notifUrl } = await req.json().catch(() => ({}));
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: subs } = await sb.from('push_subscriptions').select('*');
  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  const payload = JSON.stringify({ title: title || '🚛 งานโหลดใหม่เข้ามา!', body: body || 'มีงานใหม่รอโหลด', tag: tag || 'ld-order', url: notifUrl || '/' });
  let sent = 0;
  const dead: string[] = [];
  for (const s of subs) {
    try {
      const ok = await sendPush(s, payload);
      if (ok) sent++;
      else dead.push(s.endpoint);
    } catch { dead.push(s.endpoint); }
  }
  if (dead.length) await sb.from('push_subscriptions').delete().in('endpoint', dead);

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
