// Shared client-side confirmation for the Group Sports subsystem.
// Loaded only when a confirmation is requested; no change to database operations.
let active = false;

const css = `
.gs-dialog-container { z-index: 30000 !important; }
.gs-dialog-popup { width: min(480px, calc(100vw - 32px)) !important; padding: 24px 24px 22px !important; border-radius: 22px !important; border: 1px solid #dce7f5 !important; box-shadow: 0 24px 72px #06174135 !important; font-family: inherit !important; color: #14264a !important; }
.gs-dialog-popup .swal2-icon { margin: 4px auto 14px !important; }
.gs-dialog-symbol { display: block !important; width: 120px !important; max-width: 45% !important; height: auto !important; object-fit: contain !important; margin: 4px auto 14px !important; }
.gs-dialog-title { font-size: 21px !important; font-weight: 800 !important; color: #0c2250 !important; padding: 0 !important; line-height: 1.45 !important; }
.gs-dialog-text { font-size: 15px !important; color: #415675 !important; line-height: 1.7 !important; white-space: pre-wrap !important; overflow-wrap: anywhere; padding: 0 !important; margin: 12px 0 0 !important; max-height: 42vh; overflow-y: auto; text-align: start !important; }
.gs-dialog-actions { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 10px !important; width: 100% !important; margin: 24px 0 0 !important; }
.gs-dialog-actions button { flex: 1 1 120px; min-height: 45px; border-radius: 12px !important; font-size: 15px !important; font-weight: 700 !important; padding: 10px 16px !important; border: 1px solid transparent !important; cursor: pointer; }
.gs-dialog-cancel { background: #fff !important; color: #344767 !important; border-color: #cbd7e8 !important; }
.gs-dialog-confirm { background: #0755ce !important; color: #fff !important; }
.gs-dialog-danger { background: #b91c1c !important; }
.gs-dialog-actions button:focus-visible { outline: 3px solid #93c5fd !important; outline-offset: 3px !important; }
.gs-dialog-actions button:hover { filter: brightness(.95); }
@media (prefers-reduced-motion: reduce) { .gs-dialog-popup { animation: none !important; } }
`;
function ensureStyles() {
  if (document.getElementById('gs-dialog-style-v1')) return;
  const style = document.createElement('style');
  style.id = 'gs-dialog-style-v1';
  style.textContent = css;
  document.head.appendChild(style);
}

export async function sportsConfirm(message: string): Promise<boolean> {
  // Reject duplicate invocations rather than replacing another pending decision.
  if (typeof window === 'undefined' || active) return false;
  active = true;
  const initialUrl = window.location.href;
  const text = String(message);
  const danger = /ลบ|รีเซต|รีเซ็ต|ล้าง|ถอน|อย่างถาวร/.test(text);
  const title = danger ? 'โปรดตรวจสอบก่อนดำเนินการ' : /รายชื่อ|รูปถ่าย|รูปที่เลือก/.test(text) ? 'ยืนยันความถูกต้องของข้อมูล' : 'ยืนยันการดำเนินการ';
  try {
    const { default: Swal } = await import('sweetalert2');
    if (window.location.href !== initialUrl) return false;
    ensureStyles();
    const result = await Swal.fire({
      title, text,
      ...(danger ? { icon: 'warning' as const, iconColor: '#b91c1c' } : {
        imageUrl: '/images/group-sports/phulangka-dialog-symbol.webp',
        imageWidth: 120, imageAlt: 'สัญลักษณ์ภูลังกาเกมส์ ครั้งที่ 30',
      }),
      showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก',
      reverseButtons: true, focusCancel: true, focusConfirm: false,
      allowOutsideClick: false, allowEscapeKey: true, returnFocus: true,
      buttonsStyling: false, heightAuto: false, backdrop: 'rgba(5, 19, 49, 0.52)',
      customClass: {
        container: 'gs-dialog-container', popup: 'gs-dialog-popup', title: 'gs-dialog-title',
        htmlContainer: 'gs-dialog-text', actions: 'gs-dialog-actions', image: 'gs-dialog-symbol',
        confirmButton: `gs-dialog-confirm${danger ? ' gs-dialog-danger' : ''}`, cancelButton: 'gs-dialog-cancel',
      },
    });
    return result.isConfirmed === true && window.location.href === initialUrl;
  } catch (error) {
    // Preserve the confirmation gate if the optional UI chunk cannot load.
    console.error('Group sports confirmation UI failed:', error);
    if (window.location.href !== initialUrl) return false;
    return window.confirm(text);
  } finally { active = false; }
}
