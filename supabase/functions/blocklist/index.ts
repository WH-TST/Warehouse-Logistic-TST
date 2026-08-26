import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  const today = new Date().toISOString().slice(0, 10)

  const { data: rules } = await supabase
    .from('block_rules')
    .select('domain, start_date, end_date')
    .eq('active', true)

  const blocked = (rules || []).filter((r: any) => {
    if (!r.start_date && !r.end_date) return true
    return today >= r.start_date && today <= r.end_date
  }).map((r: any) => r.domain)

  return new Response(blocked.join('\n'), {
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  })
})