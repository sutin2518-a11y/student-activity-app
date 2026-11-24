import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน | CKW Student Activity",
  description: "ระบบกิจกรรมพัฒนาผู้เรียนและกีฬากลุ่ม",
};

const sections = [
  [
    "1. ขอบเขตบริการ",
    "ระบบนี้ใช้สำหรับสนับสนุนงานกิจกรรมพัฒนาผู้เรียนและการจัดการแข่งขันกีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ผู้ใช้งานควรใช้บริการตามวัตถุประสงค์และระเบียบของโรงเรียนหรือการแข่งขัน"
  ],
  [
    "2. บัญชีและสิทธิ์ผู้ใช้งาน",
    "ใช้บัญชีของตนเองหรือบัญชีที่ผู้ดูแลออกให้ตามบทบาท ห้ามส่งต่อรหัสผ่าน เข้าถึงบัญชีของผู้อื่น หรือพยายามเข้าถึงข้อมูลนอกเหนือจากสิทธิ์ที่ได้รับ การยืนยันตัวตนผ่าน Google ไม่ได้หมายความว่าได้รับสิทธิ์ใช้งานข้อมูลภายในโดยอัตโนมัติ"
  ],
  [
    "3. ความถูกต้องของข้อมูล",
    "ผู้มีหน้าที่ลงทะเบียน บันทึกกิจกรรม บันทึกผล และออกเกียรติบัตร ต้องตรวจสอบความถูกต้องก่อนส่งข้อมูล หากพบข้อผิดพลาดให้แจ้งผู้รับผิดชอบเพื่อแก้ไขตามขั้นตอน"
  ],
  [
    "4. การคุ้มครองข้อมูลส่วนบุคคล",
    "ห้ามคัดลอก เผยแพร่ หรือนำข้อมูลส่วนบุคคลของนักเรียน ครู นักกีฬา และบุคคลอื่นไปใช้โดยไม่มีอำนาจหรือเหตุที่ชอบด้วยกฎหมาย โปรดอ่านนโยบายความเป็นส่วนตัวของระบบประกอบ"
  ],
  [
    "5. ผลการแข่งขันและเกียรติบัตร",
    "ให้ยึดผลการแข่งขันและเอกสารที่ผ่านการรับรองจากผู้มีหน้าที่รับผิดชอบ หากมีข้อโต้แย้งให้ประสานคณะกรรมการตามระเบียบการแข่งขัน ห้ามดัดแปลงเอกสารหรือแสดงข้อมูลอันเป็นเท็จ"
  ],
  [
    "6. การดูแลบริการและการติดต่อ",
    "ผู้ดูแลอาจปรับปรุงบริการหรือระงับการเข้าถึงที่ไม่เป็นไปตามสิทธิ์เพื่อดูแลความปลอดภัยและความถูกต้องของข้อมูล หากมีปัญหาหรือข้อสงสัย ติดต่อผ่านงานกิจกรรมพัฒนาผู้เรียนหรือสำนักงานโรงเรียนเชียงคำวิทยาคม"
  ]
];

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800 md:py-12">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-red-800 px-6 py-8 text-white md:px-10">
          <p className="text-sm font-semibold text-red-100">CKW Student Activity</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">ข้อกำหนดการใช้งาน</h1>
          <p className="mt-2 text-sm leading-relaxed text-red-100">ระบบกิจกรรมพัฒนาผู้เรียนและกีฬากลุ่ม</p>
        </header>
        <div className="space-y-6 px-6 py-8 leading-relaxed md:px-10">
          {sections.map(([heading, body]) => (
            <section key={heading} className="space-y-2">
              <h2 className="text-lg font-bold text-red-900">{heading}</h2>
              <p className="text-sm md:text-base">{body}</p>
            </section>
          ))}
          <nav aria-label="ข้อมูลนโยบาย" className="flex flex-wrap gap-4 border-t border-slate-200 pt-5 text-sm font-semibold text-red-800">
            <Link href="/" className="underline underline-offset-2">กลับหน้าหลัก</Link>
            <Link href="/privacy" className="underline underline-offset-2">นโยบายความเป็นส่วนตัว</Link>
          </nav>
        </div>
      </article>
    </div>
  );
}
