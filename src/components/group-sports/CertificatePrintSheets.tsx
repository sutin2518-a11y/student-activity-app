"use client";
import { useEffect, useState } from "react";
import { qrSvgDataUri } from "@/lib/group-sports/qr-svg";
import type { CertificateDocument } from "@/lib/group-sports/certificates";
import { certificateAward, certificateNumber } from "@/lib/group-sports/certificates";
import "./certificate-print.css";

type Props = {documents: CertificateDocument[]};
export default function CertificatePrintSheets({documents}:Props) {
  const [qrCodes,setQrCodes] = useState<Record<string,string>>({});
  useEffect(()=>{
    const pairs=documents.map(doc=>{
      const url = `${window.location.origin}/group-sports/certificates/verify/${doc.token}`;
      try{return [doc.token,qrSvgDataUri(url)] as const;}
      catch{return [doc.token,""] as const;}
    });
    setQrCodes(Object.fromEntries(pairs));
  },[documents]);

  return <div className="cert-v33-print-pages" aria-label="ต้นฉบับเกียรติบัตรสำหรับพิมพ์">
    {documents.map(doc=><section key={doc.id} className="cert-v33-sheet">
      <div className="cert-v33-frame">
        <div className="cert-v33-corner cert-v33-top-left"/><div className="cert-v33-corner cert-v33-bottom-right"/>
        <div className="cert-v33-header">
          <div className="cert-v33-eyebrow">PHULANGKA GAMES 2026</div>
          <div className="cert-v33-title">{doc.certificate_title || "เกียรติบัตร"}</div>
          <div className="cert-v33-accent"/>
          <p>การแข่งขันกีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ครั้งที่ 30 ประจำปี 2569</p>
        </div>
        <div className="cert-v33-body">
          <p>ขอมอบเกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า</p>
          <h2>{doc.recipient_name}</h2>
          <p>สังกัด {doc.school_name}</p>
          <p>ได้{doc.kind === "participation" ? "เข้าร่วมการแข่งขัน" : "รับรางวัล"} <strong>{certificateAward(doc.rank,doc.kind)}</strong></p>
          <p>รายการ <strong>{doc.event_name}</strong></p>
          <p className="cert-v33-role">{doc.recipient_type === "coach" ? "ครูผู้ควบคุมทีม" : "นักกีฬา"}</p>
        </div>
        <div className="cert-v33-bottom">
          <div className="cert-v33-code">
            {qrCodes[doc.token] ? <img src={qrCodes[doc.token]} alt="QR ตรวจสอบเกียรติบัตร" width="91" height="91"/> : <div className="cert-v33-qr-pending">รหัสตรวจสอบ<br/>ดูด้านล่าง</div>}
            <div>เลขที่ {certificateNumber(doc.id)}</div>
            <div className="cert-v33-tiny">ตรวจสอบได้ผ่าน QR Code</div>
          </div>
          <div className="cert-v33-sign">
            <div className="cert-v33-sign-line">ลงชื่อ ........................................................</div>
            <div>({doc.signer_name || "........................................................"})</div>
            <div>{doc.signer_position || "ผู้ลงนามเกียรติบัตร"}</div>
          </div>
          <div className="cert-v33-issued">
            <span>ออกเอกสารวันที่</span>
            <span>{new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"long",year:"numeric"}).format(new Date(doc.issued_at))}</span>
          </div>
        </div>
      </div>
    </section>)}
  </div>;
}
