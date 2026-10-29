/** ตัวช่วยอ่านไฟล์ .env แบบง่าย (ใช้ร่วมกันหลายสคริปต์) */
export function parseEnvFile(text) {
  const out = new Map();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out.set(key, value);
  }
  return out;
}

export const PLACEHOLDER = /^(|your[_-].*|xxx+|<.*>|changeme|placeholder|todo)$/i;
