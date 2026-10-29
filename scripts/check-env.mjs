#!/usr/bin/env node
/**
 * ตรวจความครบถ้วนและรูปแบบของ Environment Variables ก่อน deploy
 *
 *   npm run check:env                 # ตรวจ .env.local
 *   npm run check:env -- .env.production
 *
 * หลักการ: ไม่พิมพ์ค่า secret ออกมาเลย (แสดงเฉพาะสถานะ/รูปแบบ)
 * exit code 1 เมื่อมีข้อผิดพลาดที่ทำให้แอปทำงานไม่ได้
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnvFile, PLACEHOLDER } from "./lib/env-file.mjs";

const file = process.argv[2] || ".env.local";
const path = resolve(process.cwd(), file);

const REQUIRED = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", secret: false, hint: "Supabase → Settings → API → Project URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", secret: false, hint: "Supabase → anon / public key" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", secret: true, hint: "Supabase → service_role key" },
  { key: "LINE_CHANNEL_SECRET", secret: true, hint: "LINE Developers → Messaging API → Channel secret" },
  { key: "LINE_CHANNEL_ACCESS_TOKEN", secret: true, hint: "LINE Developers → Channel access token" },
  { key: "NEXT_PUBLIC_LIFF_ID", secret: false, hint: "LINE Developers → LIFF ID" },
  { key: "OPENAI_API_KEY", secret: true, hint: "platform.openai.com → API keys" },
  { key: "CRON_SECRET", secret: true, hint: "สุ่มด้วย: openssl rand -hex 32" },
  { key: "NEXT_PUBLIC_APP_URL", secret: false, hint: "โดเมนที่ deploy จริง (ต้องตรงกับ LIFF Endpoint URL)" },
];

if (!existsSync(path)) {
  console.error(`❌ ไม่พบไฟล์ ${file}`);
  console.error(`   คัดลอกเทมเพลตก่อน: cp .env.example ${file}`);
  process.exit(1);
}

const env = parseEnvFile(readFileSync(path, "utf8"));

const errors = [];
const warnings = [];
const results = [];

function ok(key, note = "OK") {
  results.push({ key, status: "ok", note });
}
function warn(key, note) {
  results.push({ key, status: "warn", note });
  warnings.push(`${key}: ${note}`);
}
function fail(key, note) {
  results.push({ key, status: "fail", note });
  errors.push(`${key}: ${note}`);
}

/** อ่าน claim "role" จาก JWT โดยไม่เปิดเผย key */
function jwtRole(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

function checkUrl(key, value, { allowLocalhost = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return fail(key, "ไม่ใช่ URL ที่ถูกต้อง");
  }
  if (url.protocol !== "https:") {
    return fail(key, "ต้องขึ้นต้นด้วย https:// (LIFF / LINE บังคับ)");
  }
  if (!allowLocalhost && /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(url.hostname)) {
    return fail(key, "ห้ามใช้ localhost สำหรับค่าที่ deploy จริง");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    return fail(key, "ต้องเป็น origin เท่านั้น (ไม่มี path/query และไม่มี / ปิดท้าย)");
  }
  if (value.endsWith("/")) {
    return fail(key, "ห้ามมี / ปิดท้าย");
  }
  ok(key, url.origin);
}

for (const { key, secret, hint } of REQUIRED) {
  const value = (env.get(key) || "").trim();

  if (!value) {
    fail(key, `ยังไม่ได้ตั้งค่า — ${hint}`);
    continue;
  }
  if (PLACEHOLDER.test(value)) {
    fail(key, `ยังเป็นค่า placeholder — ${hint}`);
    continue;
  }

  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value)) {
        warn(key, "รูปแบบไม่ใช่ https://<project-ref>.supabase.co (ถ้าใช้ Supabase ปกติให้ตรวจอีกครั้ง)");
      } else {
        ok(key, "รูปแบบถูกต้อง");
      }
      break;

    case "NEXT_PUBLIC_APP_URL":
      checkUrl(key, value);
      break;

    // รองรับทั้ง API key แบบใหม่ (sb_publishable_ / sb_secret_) และแบบ legacy JWT (eyJ...)
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY": {
      if (value.startsWith("sb_secret_")) {
        fail(key, "นี่คือ secret key ห้ามใช้ฝั่ง browser — ต้องใช้ publishable key");
      } else if (value.startsWith("sb_publishable_")) {
        ok(key, "publishable key (รูปแบบใหม่)");
      } else if (value.startsWith("eyJ")) {
        const role = jwtRole(value);
        if (role && role !== "anon") {
          fail(key, `คีย์นี้มี role="${role}" แต่ต้องเป็น anon key (อาจสลับกับ service role)`);
        } else ok(key, "anon key (legacy JWT)");
      } else {
        fail(key, "รูปแบบไม่ถูกต้อง (ต้องขึ้นต้นด้วย sb_publishable_ หรือ eyJ)");
      }
      break;
    }

    case "SUPABASE_SERVICE_ROLE_KEY": {
      if (value.startsWith("sb_publishable_")) {
        fail(key, "นี่คือ publishable key — ต้องใช้ secret key (sb_secret_...)");
      } else if (value.startsWith("sb_secret_")) {
        ok(key, "secret key (รูปแบบใหม่)");
      } else if (value.startsWith("eyJ")) {
        const role = jwtRole(value);
        if (role && role !== "service_role") {
          fail(key, `คีย์นี้มี role="${role}" แต่ต้องเป็น service_role (อาจสลับกับ anon key)`);
        } else ok(key, "service_role key (legacy JWT)");
      } else {
        fail(key, "รูปแบบไม่ถูกต้อง (ต้องขึ้นต้นด้วย sb_secret_ หรือ eyJ)");
      }
      break;
    }

    case "LINE_CHANNEL_SECRET":
      if (!/^[a-f0-9]{32}$/i.test(value)) fail(key, "Channel secret ต้องเป็น hex 32 ตัวอักษร");
      else ok(key, "hex 32 ตัวอักษร");
      break;

    case "LINE_CHANNEL_ACCESS_TOKEN":
      if (value.length < 100) fail(key, "สั้นเกินไป น่าจะไม่ใช่ channel access token (long-lived)");
      else ok(key, `ความยาว ${value.length} ตัวอักษร`);
      break;

    case "NEXT_PUBLIC_LIFF_ID":
      if (!/^\d{8,}-\w+$/.test(value)) fail(key, "รูปแบบต้องเป็น <ตัวเลข>-<suffix> เช่น 2012284598-NotCayv0");
      else ok(key, `https://liff.line.me/${value}`);
      break;

    case "OPENAI_API_KEY":
      if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(value)) fail(key, "ต้องเริ่มด้วย sk- (API key ของ OpenAI)");
      else ok(key, `ขึ้นต้นด้วย ${value.slice(0, 5)}…`);
      break;

    case "CRON_SECRET":
      if (value.length < 32) warn(key, "สั้นกว่า 32 ตัวอักษร แนะนำ openssl rand -hex 32");
      else ok(key, `ความยาว ${value.length} ตัวอักษร`);
      break;

    default:
      ok(key, secret ? "ตั้งค่าแล้ว" : "ตั้งค่าแล้ว");
  }
}

// ---- ตรวจความสอดคล้องระหว่างค่าต่าง ๆ ----
const liffId = (env.get("NEXT_PUBLIC_LIFF_ID") || "").trim();
const appUrl = (env.get("NEXT_PUBLIC_APP_URL") || "").trim();
const anon = (env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "").trim();
const service = (env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();

if (anon && service && anon === service) {
  fail("NEXT_PUBLIC_SUPABASE_ANON_KEY", "ค่าเดียวกับ SUPABASE_SERVICE_ROLE_KEY (ห้ามใช้ service role ฝั่ง browser)");
}
if (appUrl && /moneyfamily\.vercel\.app$/i.test(appUrl)) {
  warn(
    "NEXT_PUBLIC_APP_URL",
    `ยังเป็นโดเมนตัวอย่าง (${appUrl}) — ต้องแก้เป็นโดเมนจริง และต้องตรงกับ LIFF Endpoint URL`
  );
}
if (liffId && appUrl) {
  console.log(`ℹ️  LIFF Endpoint URL ต้องตั้งเป็น: ${appUrl}`);
  console.log(`ℹ️  ลิงก์เปิดแอป: https://liff.line.me/${liffId}`);
}

// ---- สรุปผล ----
console.log(`\n🔍 ตรวจ ${file} (${env.size} ตัวแปร)\n`);
const icon = { ok: "✅", warn: "⚠️ ", fail: "❌" };
for (const r of results) {
  const label = r.key.padEnd(34);
  console.log(`${icon[r.status]} ${label} ${r.note}`);
}

const extra = [...env.keys()].filter((k) => !REQUIRED.some((r) => r.key === k));
if (extra.length) {
  console.log(`\nℹ️  ตัวแปรนอกเหนือรายการ (ไม่ถูกใช้ในโค้ด): ${extra.join(", ")}`);
}

if (errors.length) {
  console.log(`\n❌ พบข้อผิดพลาด ${errors.length} รายการ:`);
  for (const e of errors) console.log(`   - ${e}`);
}
if (warnings.length) {
  console.log(`\n⚠️  คำเตือน ${warnings.length} รายการ:`);
  for (const w of warnings) console.log(`   - ${w}`);
}

if (errors.length) {
  console.log("\nผลรวม: ไม่พร้อม deploy ❌\n");
  process.exit(1);
}
console.log(
  warnings.length
    ? `\nผลรวม: ผ่าน แต่มี ${warnings.length} คำเตือนที่ควรแก้ก่อน deploy ⚠️\n`
    : "\nผลรวม: พร้อม deploy ✅\n"
);
