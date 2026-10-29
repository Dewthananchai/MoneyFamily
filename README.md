# 👨‍👩‍👧‍👦 MoneyFamily (แอปจัดการเงินครอบครัวบน LINE + PWA)

แอปพลิเคชันจัดการการเงินและหารค่าใช้จ่ายในครอบครัว เชื่อมต่อการใช้งานผ่าน **LINE Messaging API**, **LINE LIFF** และ **PWA (Progressive Web App)** พัฒนาด้วย Next.js (App Router), Supabase PostgreSQL, OpenAI (Structured Outputs & Vision OCR)

---

## ✨ ฟีเจอร์หลัก (Key Features)

1. **จดบันทึกรายรับ-รายจ่ายผ่าน LINE แชท:**
   - พิมพ์ข้อความภาษาไทยธรรมดา เช่น *"กาแฟ 60 ด้วย SCB"* หรือ *"ข้าวเที่ยง 80"* ระบบใช้ OpenAI Structured Outputs สกัดเป็นข้อมูลบันทึกลงระบบทันที
2. **สแกนสลิปโอนเงินอัตโนมัติ (Slip OCR - Process & Purge):**
   - ส่งรูปสลิปในแชท ระบบดึงข้อมูลยอดเงิน ร้านค้า วันที่ ในหน่วยความจำ (RAM Buffer) และล้างข้อมูลรูปภาพทิ้งทันทีโดยไม่เปลือง Storage
3. **ระบบหารบิลกับคนในบ้าน (Split Bill Interactive Screen):**
   - แตะปุ่ม *"หารกับคนในบ้าน"* เพื่อเลือกสมาชิก (Checkbox), โหมด 50/50, หรือปรับเปอร์เซ็นต์สัดส่วน
4. **สรุปหนี้สินและ PromptPay QR Code:**
   - พิมพ์ *"สรุปหนี้"* บอทจะคำนวณหักลบกลบลบหนี้ (Debt Netting) และสร้างรูปภาพ PromptPay QR Code ให้สแกนโอนเงินคืนกันได้ทันที
5. **แจ้งเตือนบิลประจำรอบ (Recurring Bills & Vercel Cron):**
   - พิมพ์ *"Netflix 419 ทุกเดือน"* ระบบจะตั้งรอบบิล และ Cron Job จะส่ง Push Notification เตือนในวันครบกำหนด (Due Date)
6. **Dashboard และ PWA:**
   - รองรับการติดตั้งแบบ PWA บนหน้าจอมือถือ (iOS/Android)
   - Auto-login ด้วย LINE LIFF SDK
   - แสดงสถิติกราฟกระแสเงินสดด้วย Recharts และตารางเดินบัญชี

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS (CI: Navy `#0F2038` & Amber/Orange `#F59E0B`)
- **Database & Auth:** Supabase PostgreSQL, Row Level Security (RLS)
- **AI & OCR:** OpenAI API (GPT-4o-mini & Vision)
- **LINE Platform:** LINE Messaging API (`@line/bot-sdk`), LINE LIFF SDK (`@line/liff`)
- **Payment & QR:** `promptpay-qr`, `qrcode`
- **Charts:** `recharts`
- **Deployment:** Vercel (Cron Jobs & Serverless Route Handlers)

---

## 🚀 เริ่มต้นใช้งาน (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอก `.env.example` ไปเป็น `.env.local` แล้วใส่ API Keys:
```bash
cp .env.example .env.local
```

### 3. รัน Development Server
```bash
npm run dev
```
เปิด [http://localhost:3000](http://localhost:3000) บนเบราว์เซอร์
