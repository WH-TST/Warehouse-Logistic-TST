#!/usr/bin/env bash
# ── ย้าย DB WMS จากโปรเจกต์เก่า → ใหม่ ────────────────────────────────
# ก่อนรัน: เติม password ของ DB ทั้งสองโปรเจกต์ (เอาจาก Supabase Dashboard →
#   Project Settings → Database → Connection string → เลือก "URI" (Session pooler))
# ต้องมี pg_dump/psql: ถ้ายังไม่มี →  brew install postgresql@16
#   แล้ว  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
set -euo pipefail

export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # psql/pg_dump (libpq keg-only)

OLD_REF="lkuunmyrxugsoqwrvdby"
NEW_REF="akazjfgbnzhykhgeenye"

# ⚠️ เติม password ตรงนี้ (URL-encode อักขระพิเศษถ้ามี)
OLD_PW="__OLD_DB_PASSWORD__"
NEW_PW="__NEW_DB_PASSWORD__"

# Session pooler host — แก้ region ให้ตรงกับโปรเจกต์ (ดูจาก connection string จริง)
OLD_URL="postgresql://postgres.${OLD_REF}:${OLD_PW}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEW_URL="postgresql://postgres.${NEW_REF}:${NEW_PW}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

cd "$(dirname "$0")"
mkdir -p _migrate && cd _migrate

echo "▶ 1/4 dump schema (public + storage)…"
supabase db dump --db-url "$OLD_URL" -f schema.sql

echo "▶ 2/4 dump data (COPY format)…"
supabase db dump --db-url "$OLD_URL" -f data.sql --data-only --use-copy

echo "▶ 3/4 restore schema → โปรเจกต์ใหม่…"
psql "$NEW_URL" -v ON_ERROR_STOP=1 -f schema.sql

echo "▶ 4/4 restore data → โปรเจกต์ใหม่…"
psql "$NEW_URL" -f data.sql   # data ไม่ ON_ERROR_STOP กันสะดุด seed ซ้ำ

echo "✅ DB เสร็จ — ตรวจจำนวนแถวเทียบเก่า/ใหม่ก่อนไปต่อ storage/functions"
