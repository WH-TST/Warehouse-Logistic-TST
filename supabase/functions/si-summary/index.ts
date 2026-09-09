// ══════════════════════════════════════════════════════════════════
//  si-summary — สรุป SI (ยอดโหลดสินค้าส่งจริงรายวัน) แบบ JSON API
//  ให้ระบบอื่นดึงข้อมูลชุดเดียวกับที่หน้า "สรุป SI" ใน WMS แสดง
//  โดยไม่ต้อง reverse-engineer logic การกระจายน้ำหนัก/จำแนกประเภทรถเอง
//
//  GET /si-summary?from=YYYY-MM-DD&to=YYYY-MM-DD[&team=A][&truck=company|hired|self][&range=ok|out]
//
//  หมายเหตุ: พอร์ตมาจาก siLoad()/_ldComputeFinalWeights() ใน index.html
//  ถ้าแก้สูตรฝั่ง index.html ต้องแก้ที่นี่ให้ตรงกันด้วย (ยังไม่มี source
//  กลางเดียวใช้ร่วมกันระหว่าง browser กับ Edge Function)
// ══════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Session = {
  id: string
  order_id: string | null
  plan_date: string
  sku: string | null
  product_name: string | null
  qty: number | string | null
  weight: number | string | null
  team: string | null
  end_time: string | null
  updated_at: string | null
  created_at: string | null
}

type Product = { sku: string; min_w: number | null; max_w: number | null }

// ── พอร์ตตรงจาก _ldComputeFinalWeights ในหน้าเว็บ (key ต่อ session ไม่ใช่ต่อ SKU) ──
function computeFinalWeights(
  sessions: Session[],
  diff: number,
  productMap: Record<string, Product>
): Record<string, { finalKg: number }> {
  const sm: Record<string, { sku: string; qty: number; weight: number }> = {}
  const keys: string[] = []
  sessions.forEach((r, idx) => {
    if (!r.sku) return
    const k = r.id != null ? String(r.id) : 'i' + idx
    sm[k] = { sku: r.sku, qty: parseFloat(String(r.qty)) || 0, weight: parseFloat(String(r.weight)) || 0 }
    keys.push(k)
  })
  if (!keys.length) return {}

  const adds: Record<string, number> = {}
  keys.forEach((k) => (adds[k] = 0))
  let rem = diff

  if (diff > 0) {
    keys
      .filter((k) => {
        const p = productMap[sm[k].sku] || ({} as Product)
        const r = sm[k]
        return p.min_w != null && r.qty > 0 && r.weight / r.qty < p.min_w
      })
      .forEach((k) => {
        if (rem <= 0) return
        const r = sm[k]
        const p = productMap[r.sku] || ({} as Product)
        const give = Math.min((p.min_w! - r.weight / r.qty) * r.qty, rem)
        adds[k] += give
        rem -= give
      })

    let iter = 0
    while (rem > 0.01 && iter++ < 30) {
      const elig = keys.filter((k) => {
        const p = productMap[sm[k].sku] || ({} as Product)
        const r = sm[k]
        if (!r.qty) return false
        return p.max_w == null || (r.weight + adds[k]) / r.qty < p.max_w - 0.0001
      })
      if (!elig.length) {
        const tAll = keys.reduce((s, k) => s + sm[k].qty, 0)
        keys.forEach((k) => (adds[k] += tAll > 0 ? rem * (sm[k].qty / tAll) : rem / keys.length))
        rem = 0
        break
      }
      const tQ = elig.reduce((s, k) => s + sm[k].qty, 0)
      let used = 0
      elig.forEach((k) => {
        const p = productMap[sm[k].sku] || ({} as Product)
        const r = sm[k]
        let share = rem * (r.qty / tQ)
        if (p.max_w != null) share = Math.min(share, Math.max(0, (p.max_w - (r.weight + adds[k]) / r.qty) * r.qty))
        adds[k] += share
        used += share
      })
      rem -= used
      if (used < 0.001) break
    }
  } else {
    let rem2 = diff
    keys
      .filter((k) => {
        const p = productMap[sm[k].sku] || ({} as Product)
        const r = sm[k]
        return p.max_w != null && r.qty > 0 && r.weight / r.qty > p.max_w
      })
      .forEach((k) => {
        if (rem2 >= 0) return
        const r = sm[k]
        const p = productMap[r.sku] || ({} as Product)
        const take = Math.max(-((r.weight / r.qty) - p.max_w!) * r.qty, rem2)
        adds[k] += take
        rem2 -= take
      })

    let iter2 = 0
    while (rem2 < -0.01 && iter2++ < 30) {
      const elig2 = keys.filter((k) => {
        const p = productMap[sm[k].sku] || ({} as Product)
        const r = sm[k]
        if (!r.qty) return false
        return p.min_w == null || (r.weight + adds[k]) / r.qty > p.min_w + 0.0001
      })
      if (!elig2.length) {
        const tAll2 = keys.reduce((s, k) => s + sm[k].qty, 0)
        keys.forEach((k) => (adds[k] += tAll2 > 0 ? rem2 * (sm[k].qty / tAll2) : rem2 / keys.length))
        rem2 = 0
        break
      }
      const tQ2 = elig2.reduce((s, k) => s + sm[k].qty, 0)
      let used2 = 0
      elig2.forEach((k) => {
        const p = productMap[sm[k].sku] || ({} as Product)
        const r = sm[k]
        let share = rem2 * (r.qty / tQ2)
        if (p.min_w != null) share = Math.max(share, -Math.max(0, (r.weight + adds[k]) / r.qty - p.min_w) * r.qty)
        adds[k] += share
        used2 += share
      })
      rem2 -= used2
      if (Math.abs(used2) < 0.001) break
    }
  }

  // largest remainder method — floor แต่ละ session แล้วแจก +1 ตามลำดับ fractional สูงสุด จนผลรวม = target พอดี
  const target = Math.round(keys.reduce((s, k) => s + sm[k].weight, 0) + diff)
  const floors: Record<string, number> = {}
  const fracs: { k: string; frac: number }[] = []
  keys.forEach((k) => {
    const raw = Math.max(0, sm[k].weight + adds[k])
    floors[k] = Math.floor(raw)
    fracs.push({ k, frac: raw - Math.floor(raw) })
  })
  const floorSum = keys.reduce((s, k) => s + floors[k], 0)
  const remainder = target - floorSum
  fracs.sort((a, b) => b.frac - a.frac)
  for (let i = 0; i < remainder && i < fracs.length; i++) floors[fracs[i].k]++

  const result: Record<string, { finalKg: number }> = {}
  keys.forEach((k) => (result[k] = { finalKg: floors[k] }))
  return result
}

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const url = new URL(req.url)
    const fromV = url.searchParams.get('from')
    const toV = url.searchParams.get('to')
    if (!fromV || !toV) {
      return new Response(JSON.stringify({ error: 'ต้องระบุ from และ to (YYYY-MM-DD)' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const fTeam = url.searchParams.get('team') || ''
    const fTruck = url.searchParams.get('truck') || ''
    const fRange = url.searchParams.get('range') || ''

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)

    // 1. Session ที่ปิดงานแล้ว
    const { data: sessionsRaw, error: sErr } = await supabase
      .from('loading_sessions')
      .select('id,order_id,plan_date,sku,product_name,qty,weight,team,end_time,updated_at,created_at')
      .neq('record_type', 'draft')
      .gte('plan_date', fromV)
      .lte('plan_date', toV)
      .range(0, 19999)
    if (sErr) throw sErr
    const sessions = (sessionsRaw || []) as Session[]
    if (!sessions.length) {
      return new Response(JSON.stringify({ rows: [] }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const orderIds = Array.from(new Set(sessions.map((s) => s.order_id).filter(Boolean))) as string[]

    // 2. Loading orders
    const { data: orders } = await supabase
      .from('loading_orders')
      .select('id,order_no,customer_name,truck_plate,scale_diff,order_date')
      .in('id', orderIds.length ? orderIds : ['__none__'])
    const orderMap: Record<string, any> = {}
    ;(orders || []).forEach((o: any) => (orderMap[o.id] = o))

    // 3. Products
    const skus = Array.from(new Set(sessions.map((s) => s.sku).filter(Boolean))) as string[]
    const { data: products } = await supabase.from('products').select('sku,min_w,max_w').in('sku', skus.length ? skus : ['__none__'])
    const prodMap: Record<string, Product> = {}
    ;(products || []).forEach((p: any) => (prodMap[p.sku] = p))

    // 4. Sale
    const custNames = Array.from(new Set((orders || []).map((o: any) => o.customer_name).filter(Boolean))) as string[]
    const { data: shops } = await supabase.from('logi_shops').select('name,sale').in('name', custNames.length ? custNames : ['__none__'])
    const saleMap: Record<string, string> = {}
    ;(shops || []).forEach((s: any) => (saleMap[s.name] = s.sale))

    // 5. จำแนกประเภทรถ
    const plates = Array.from(new Set((orders || []).map((o: any) => o.truck_plate).filter(Boolean))) as string[]
    const [companyRes, hiredRes] = await Promise.all([
      supabase.from('logi_trucks').select('plate').in('plate', plates.length ? plates : ['__none__']),
      supabase
        .from('logistic_plans')
        .select('truck_plate,driver_transport,plan_date')
        .eq('truck_type', 'hire')
        .in('truck_plate', plates.length ? plates : ['__none__'])
        .gte('plan_date', fromV)
        .lte('plan_date', toV),
    ])
    const companySet = new Set((companyRes.data || []).map((t: any) => t.plate))
    const hiredMap: Record<string, string> = {}
    ;(hiredRes.data || []).forEach((p: any) => (hiredMap[p.truck_plate + '|' + p.plan_date] = p.driver_transport))

    function classifyTruck(plate: string | null, dateStr: string) {
      if (!plate) return { type: 'self', label: '—' }
      if (companySet.has(plate)) return { type: 'company', label: plate }
      const carrier = hiredMap[plate + '|' + dateStr]
      if (carrier) return { type: 'hired', label: carrier }
      return { type: 'self', label: plate }
    }

    // 6. รวม session ต่อ order → คำนวณน้ำหนัก Final
    const byOrder: Record<string, Session[]> = {}
    sessions.forEach((s) => {
      const k = String(s.order_id)
      ;(byOrder[k] = byOrder[k] || []).push(s)
    })

    type Row = {
      date: string
      time: string
      customer: string
      sale: string
      sku: string
      name: string
      qty: number
      finalKg: number
      perUnit: number
      rangeStatus: 'ok' | 'over' | 'under'
      team: string
      truckType: string
      truckLabel: string
      _sortKey: string
    }
    const rows: Row[] = []

    Object.keys(byOrder).forEach((oid) => {
      const order = orderMap[oid]
      if (!order) return
      const sess = byOrder[oid]
      const diff = order.scale_diff != null ? parseFloat(order.scale_diff) || 0 : 0
      const finalMap = diff ? computeFinalWeights(sess, diff, prodMap) : null

      const bySku: Record<string, { sku: string; product_name: string; qty: number; weight: number; finalKg: number; team: string; _t: string }> = {}
      sess.forEach((s, idx) => {
        const k = s.sku || '?'
        if (!bySku[k]) bySku[k] = { sku: k, product_name: s.product_name || k, qty: 0, weight: 0, finalKg: 0, team: s.team || '—', _t: '' }
        const sessKey = s.id != null ? String(s.id) : 'i' + idx
        const fw = finalMap && finalMap[sessKey] ? finalMap[sessKey].finalKg : parseFloat(String(s.weight)) || 0
        bySku[k].qty += parseFloat(String(s.qty)) || 0
        bySku[k].weight += parseFloat(String(s.weight)) || 0
        bySku[k].finalKg += fw
        const t = s.end_time || s.updated_at || s.created_at || ''
        if (t > bySku[k]._t) {
          bySku[k]._t = t
          bySku[k].team = s.team || bySku[k].team
        }
      })

      const truck = classifyTruck(order.truck_plate, order.order_date || fromV)

      Object.keys(bySku).forEach((sk) => {
        const r = bySku[sk]
        const finalKg = r.finalKg
        const perUnit = r.qty > 0 ? finalKg / r.qty : 0
        const prod = prodMap[sk] || ({} as Product)
        let rangeStatus: 'ok' | 'over' | 'under' = 'ok'
        if (prod.max_w != null && perUnit > prod.max_w) rangeStatus = 'over'
        else if (prod.min_w != null && perUnit < prod.min_w) rangeStatus = 'under'

        rows.push({
          date: order.order_date || fromV,
          time: r._t ? new Date(r._t).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '—',
          customer: order.customer_name || '—',
          sale: saleMap[order.customer_name] || '—',
          sku: sk,
          name: r.product_name,
          qty: Number(r.qty.toFixed(2)),
          finalKg: Number(finalKg.toFixed(2)),
          perUnit: Number(perUnit.toFixed(2)),
          rangeStatus,
          team: r.team,
          truckType: truck.type,
          truckLabel: truck.label,
          _sortKey: r._t || '',
        })
      })
    })

    rows.sort((a, b) => a._sortKey.localeCompare(b._sortKey))

    const filtered = rows
      .filter((r) => !fTeam || r.team === fTeam)
      .filter((r) => !fTruck || r.truckType === fTruck)
      .filter((r) => !fRange || (fRange === 'ok' ? r.rangeStatus === 'ok' : r.rangeStatus !== 'ok'))
      .map(({ _sortKey, ...rest }) => rest)

    return new Response(JSON.stringify({ from: fromV, to: toV, count: filtered.length, rows: filtered }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
