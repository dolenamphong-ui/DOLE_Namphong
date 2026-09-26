import { LeaveRequest, SystemSettings } from '../types.ts';
import { formatThaiDate, parseISODateParts } from './thaiDate.ts';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src || !src.startsWith('data:image/') && !src.startsWith('http')) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return ['-'];
  const chars = Array.from(text);
  const lines: string[] = [];
  let currentLine = '';

  for (const ch of chars) {
    const testLine = currentLine + ch;
    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawDottedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number
) {
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2.5, 3.5]);
  ctx.beginPath();
  ctx.moveTo(x1, y + 6);
  ctx.lineTo(x2, y + 6);
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the official Thai Government Leave Request on a high-DPI A4 canvas
 * (210mm x 297mm) using TH Sarabun PSK 16pt proportions, then packages it into a
 * standard ISO %PDF-1.4 binary (base64 + Blob) for Google Drive & local download.
 */
export async function generateOfficialLeavePdf(
  leave: LeaveRequest,
  settings: SystemSettings
): Promise<{ pdfBase64: string; pdfBlob: Blob; fileName: string }> {
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('16pt "TH-Sarabun-PSK"'),
        document.fonts.load('bold 16pt "TH-Sarabun-PSK"'),
        document.fonts.load('16pt "TH Sarabun PSK"'),
        document.fonts.load('bold 16pt "TH Sarabun PSK"'),
        document.fonts.load('16pt "Sarabun"'),
        document.fonts.ready,
      ]);
    } catch {
      // fallback if font loader fails
    }
  }

  // Exact A4 @ ~180 DPI (1488 x 2105 px) -> 16pt = 30px
  const W = 1488;
  const H = 2105;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White A4 Paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const fontStack = '"TH-Sarabun-PSK", "TH Sarabun PSK", "THSarabunNew", "Sarabun", sans-serif';
  // Thai Government Standard Margins: Left 2.5cm (~177px), Right 2.0cm (~142px), Top 2.0cm (~142px)
  const marginLeft = 175;
  const marginRight = 140;
  const contentWidth = W - marginLeft - marginRight;

  // 1. Top-Right Official Registration Box (กรอบเลขทะเบียนรับใบลา)
  const boxW = 350;
  const boxH = 104;
  const boxX = W - marginRight - boxW;
  const boxY = 95;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = `bold 24px ${fontStack}`;
  ctx.fillText(`ทะเบียนใบลา สกร.ระดับอำเภอน้ำพอง`, boxX + 14, boxY + 30);
  ctx.font = `bold 25px ${fontStack}`;
  ctx.fillText(`เลขที่ใบลา: ${leave.leaveNumber || 'LV-2569-XXXX'}`, boxX + 14, boxY + 62);
  ctx.font = `22px ${fontStack}`;
  ctx.fillText(
    `วันที่ยื่น: ${formatThaiDate(leave.writtenDate)} (${leave.status || 'รอตรวจสอบ'})`,
    boxX + 14,
    boxY + 90
  );

  // 2. Determine Official Form Title
  const isSickPersonalMaternity =
    leave.leaveTypeName.includes('ป่วย') ||
    leave.leaveTypeName.includes('กิจ') ||
    leave.leaveTypeName.includes('คลอด');

  let formTitle = 'แบบใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว';
  if (leave.leaveTypeName.includes('พักผ่อน')) {
    formTitle = 'แบบใบลาพักผ่อน';
  } else if (leave.leaveTypeName.includes('อุปสมบท')) {
    formTitle = 'แบบใบลาอุปสมบท';
  } else if (!isSickPersonalMaternity) {
    formTitle = `แบบใบขออนุญาต${leave.leaveTypeName}`;
  }

  // Main Centered Form Title (20pt bold -> ~38px)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = `bold 38px ${fontStack}`;
  ctx.fillText(formTitle, W / 2, 255);

  // 3. Written At & Date (Right-aligned, 16pt -> 29px)
  const writtenParts = parseISODateParts(leave.writtenDate);
  const dayStr = writtenParts ? String(writtenParts.day) : '-';
  const monthStr = writtenParts ? THAI_MONTHS[writtenParts.monthIndex] : '-';
  const yearStr = writtenParts ? String(writtenParts.yearBE) : '2569';

  let y = 320;
  ctx.textAlign = 'left';
  ctx.font = `29px ${fontStack}`;
  const writtenAtX = W - marginRight - 520;
  ctx.fillText('เขียนที่', writtenAtX, y);
  drawDottedLine(ctx, writtenAtX + 75, W - marginRight, y);
  ctx.fillText(
    settings.organizationName || leave.department || 'สกร.ระดับอำเภอน้ำพอง จ.ขอนแก่น',
    writtenAtX + 85,
    y
  );

  y += 46;
  const dateLineX = W - marginRight - 480;
  ctx.fillText('วันที่', dateLineX, y);
  drawDottedLine(ctx, dateLineX + 52, dateLineX + 125, y);
  ctx.fillText(dayStr, dateLineX + 75, y);

  ctx.fillText('เดือน', dateLineX + 135, y);
  drawDottedLine(ctx, dateLineX + 190, dateLineX + 335, y);
  ctx.fillText(monthStr, dateLineX + 210, y);

  ctx.fillText('พ.ศ.', dateLineX + 345, y);
  drawDottedLine(ctx, dateLineX + 395, W - marginRight, y);
  ctx.fillText(yearStr, dateLineX + 410, y);

  // 4. Subject & AddressedTo
  y += 50;
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText('เรื่อง', marginLeft, y);
  ctx.font = `29px ${fontStack}`;
  drawDottedLine(ctx, marginLeft + 70, marginLeft + 680, y);
  ctx.fillText(leave.subject || `ขออนุญาต${leave.leaveTypeName}`, marginLeft + 82, y);

  y += 46;
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText('เรียน', marginLeft, y);
  ctx.font = `29px ${fontStack}`;
  drawDottedLine(ctx, marginLeft + 70, marginLeft + 680, y);
  ctx.fillText(
    leave.addressedTo || settings.addressedToDefault || 'ผู้อำนวยการสกร.ระดับอำเภอน้ำพอง',
    marginLeft + 82,
    y
  );

  // 5. Requester Details (Indented 2.5cm -> +100px)
  y += 54;
  const indentX = marginLeft + 95;
  ctx.fillText('ข้าพเจ้า', indentX, y);
  drawDottedLine(ctx, indentX + 85, indentX + 520, y);
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText(leave.fullName || '-', indentX + 100, y);

  ctx.font = `29px ${fontStack}`;
  ctx.fillText('ตำแหน่ง', indentX + 535, y);
  drawDottedLine(ctx, indentX + 625, W - marginRight, y);
  ctx.fillText(leave.position || '-', indentX + 640, y);

  y += 46;
  ctx.fillText('สังกัด', marginLeft, y);
  drawDottedLine(ctx, marginLeft + 65, marginLeft + 680, y);
  ctx.fillText(
    leave.department || settings.organizationName || 'สกร.ระดับอำเภอน้ำพอง จ.ขอนแก่น',
    marginLeft + 80,
    y
  );
  ctx.fillText('ประเภทบุคลากร', marginLeft + 700, y);
  drawDottedLine(ctx, marginLeft + 855, W - marginRight, y);
  ctx.fillText(leave.role || '-', marginLeft + 870, y);

  // 6. Leave Type Checkboxes & Reason
  y += 52;
  if (isSickPersonalMaternity) {
    const isSick = leave.leaveTypeName.includes('ป่วย');
    const isPersonal = leave.leaveTypeName.includes('กิจ');
    const isMaternity = leave.leaveTypeName.includes('คลอด');
    ctx.font = `bold 29px ${fontStack}`;
    ctx.fillText(
      `ขอลา    [ ${isSick ? '✓' : '  '} ] ลาป่วย      [ ${isPersonal ? '✓' : '  '} ] ลากิจส่วนตัว      [ ${
        isMaternity ? '✓' : '  '
      } ] ลาคลอดบุตร`,
      indentX,
      y
    );
    ctx.font = `27px ${fontStack}`;
    ctx.fillText(`(${leave.durationType || 'เต็มวัน'})`, indentX + 730, y);
  } else {
    ctx.font = `bold 29px ${fontStack}`;
    ctx.fillText(
      `มีความประสงค์ขอ  [ ✓ ] ${leave.leaveTypeName}   (${leave.durationType || 'เต็มวัน'})`,
      indentX,
      y
    );
  }

  y += 48;
  ctx.font = `29px ${fontStack}`;
  ctx.fillText('เนื่องจาก', marginLeft, y);
  drawDottedLine(ctx, marginLeft + 95, W - marginRight, y);
  const reasonLines = wrapText(ctx, leave.reason || '-', contentWidth - 110);
  ctx.fillText(reasonLines[0] || '-', marginLeft + 108, y);

  if (reasonLines.length > 1) {
    y += 44;
    drawDottedLine(ctx, marginLeft, W - marginRight, y);
    ctx.fillText(reasonLines.slice(1).join(' '), marginLeft + 12, y);
  }

  // 7. Date Range & Total Days
  y += 48;
  const startFormatted = formatThaiDate(leave.startDate);
  const endFormatted = formatThaiDate(leave.endDate);

  ctx.fillText('ตั้งแต่วันที่', marginLeft, y);
  drawDottedLine(ctx, marginLeft + 100, marginLeft + 430, y);
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText(startFormatted, marginLeft + 120, y);

  ctx.font = `29px ${fontStack}`;
  ctx.fillText('ถึงวันที่', marginLeft + 445, y);
  drawDottedLine(ctx, marginLeft + 520, marginLeft + 850, y);
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText(endFormatted, marginLeft + 540, y);

  ctx.font = `29px ${fontStack}`;
  ctx.fillText('มีกำหนด', marginLeft + 865, y);
  drawDottedLine(ctx, marginLeft + 950, marginLeft + 1075, y);
  ctx.font = `bold 30px ${fontStack}`;
  ctx.fillText(String(leave.totalDays), marginLeft + 995, y);
  ctx.font = `29px ${fontStack}`;
  ctx.fillText('วัน', marginLeft + 1090, y);

  // 8. Previous Leave History Line
  y += 48;
  if (leave.lastLeaveStartDate) {
    ctx.fillText(
      `ข้าพเจ้าได้ ${leave.lastLeaveType || leave.leaveTypeName} ครั้งสุดท้าย ตั้งแต่วันที่ ${formatThaiDate(
        leave.lastLeaveStartDate
      )} ถึงวันที่ ${formatThaiDate(leave.lastLeaveEndDate)} มีกำหนด ${
        leave.lastLeaveTotalDays
      } วัน`,
      marginLeft,
      y
    );
    drawDottedLine(ctx, marginLeft + 105, W - marginRight, y);
  } else {
    ctx.fillText(
      `ข้าพเจ้าไม่เคย${leave.leaveTypeName}ในปีงบประมาณ พ.ศ. ${yearStr} นี้มาก่อน`,
      marginLeft,
      y
    );
  }

  // 9. Contact Address & Phone During Leave
  y += 48;
  ctx.fillText('ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่', marginLeft, y);
  drawDottedLine(ctx, marginLeft + 310, marginLeft + 820, y);
  ctx.fillText(
    (leave.contactAddress || '-').slice(0, 42),
    marginLeft + 322,
    y
  );
  ctx.fillText('โทรศัพท์', marginLeft + 835, y);
  drawDottedLine(ctx, marginLeft + 920, W - marginRight, y);
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText(leave.contactPhone || '-', marginLeft + 935, y);

  // 10. Work Handover / Substitute Person
  y += 46;
  ctx.font = `29px ${fontStack}`;
  ctx.fillText('มอบหมายงานในหน้าที่ให้', marginLeft, y);
  drawDottedLine(ctx, marginLeft + 230, W - marginRight, y);
  const subText =
    leave.substitutePerson && leave.substitutePerson !== '-'
      ? `${leave.substitutePerson} (${leave.substituteWork || 'ปฏิบัติหน้าที่แทน'})`
      : '-';
  ctx.fillText(subText, marginLeft + 245, y);

  // 11. Requester Signature Block (Right column)
  const reqSigCenterX = W - marginRight - 270;
  y += 52;
  ctx.textAlign = 'center';
  ctx.font = `29px ${fontStack}`;
  ctx.fillText('ขอแสดงความนับถือ', reqSigCenterX, y);

  y += 80;
  const reqSigSource =
    leave.requesterSignatureUrl ||
    (leave.halfDayPeriod?.startsWith('data:image/') ? leave.halfDayPeriod : '');
  const reqSigImg = await loadImage(reqSigSource);
  if (reqSigImg) {
    ctx.drawImage(reqSigImg, reqSigCenterX - 105, y - 68, 210, 64);
  } else {
    ctx.font = `italic 27px ${fontStack}`;
    ctx.fillText(leave.fullName, reqSigCenterX, y - 8);
  }

  ctx.font = `29px ${fontStack}`;
  ctx.fillText('(ลงชื่อ) ............................................................', reqSigCenterX, y);
  y += 42;
  ctx.fillText(`( ${leave.fullName} )`, reqSigCenterX, y);
  y += 40;
  ctx.fillText(`ตำแหน่ง ${leave.position || '-'}`, reqSigCenterX, y);

  // 12. Two-Column Official Bottom Section (Statistics + Inspector on Left, Supervisor/Director on Right)
  const bottomTopY = Math.max(y + 45, 1210);
  const leftColX = marginLeft;
  const leftColW = 550;
  const rightColX = marginLeft + 600;
  const rightColW = contentWidth - 600;

  // Left Column: Leave Statistics Table
  ctx.textAlign = 'left';
  ctx.font = `bold 28px ${fontStack}`;
  ctx.fillText('สถิติการลาในปีงบประมาณนี้ (วันทำการ)', leftColX, bottomTopY);

  const tableY = bottomTopY + 18;
  const rowH = 48;
  const colWidths = [210, 110, 110, 120];

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.4;

  const headers = ['ประเภทลา', 'ลามาแล้ว', 'ลาครั้งนี้', 'รวมเป็น'];
  let curX = leftColX;
  ctx.font = `bold 24px ${fontStack}`;
  ctx.textAlign = 'center';
  headers.forEach((h, i) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(curX, tableY, colWidths[i], rowH);
    ctx.fillStyle = '#000000';
    ctx.strokeRect(curX, tableY, colWidths[i], rowH);
    ctx.fillText(h, curX + colWidths[i] / 2, tableY + 32);
    curX += colWidths[i];
  });

  const statRows = [
    { label: 'ป่วย', active: leave.leaveTypeName.includes('ป่วย') },
    { label: 'กิจส่วนตัว', active: leave.leaveTypeName.includes('กิจ') },
    { label: 'พักผ่อน', active: leave.leaveTypeName.includes('พักผ่อน') },
    {
      label:
        !leave.leaveTypeName.includes('ป่วย') &&
        !leave.leaveTypeName.includes('กิจ') &&
        !leave.leaveTypeName.includes('พักผ่อน')
          ? leave.leaveTypeName.replace(/^ลา/, '')
          : 'คลอดบุตร / อื่น ๆ',
      active:
        !leave.leaveTypeName.includes('ป่วย') &&
        !leave.leaveTypeName.includes('กิจ') &&
        !leave.leaveTypeName.includes('พักผ่อน'),
    },
  ];

  ctx.font = `25px ${fontStack}`;
  statRows.forEach((sr, rIdx) => {
    const ry = tableY + rowH * (rIdx + 1);
    let cx = leftColX;
    const prevDays = sr.active ? leave.accumulatedLeaveDays || 0 : '-';
    const curDays = sr.active ? leave.totalDays : '-';
    const sumDays = sr.active
      ? (Number(leave.accumulatedLeaveDays) || 0) + Number(leave.totalDays)
      : '-';
    const vals = [sr.label, String(prevDays), String(curDays), String(sumDays)];

    vals.forEach((v, cIdx) => {
      ctx.strokeRect(cx, ry, colWidths[cIdx], rowH);
      ctx.fillText(v, cx + colWidths[cIdx] / 2, ry + 32);
      cx += colWidths[cIdx];
    });
  });

  // Inspector Signature Block (Left Column below table)
  let inspY = tableY + rowH * 5 + 48;
  ctx.textAlign = 'left';
  ctx.font = `bold 27px ${fontStack}`;
  ctx.fillText('ความเห็นผู้ตรวจสอบสถิติการลา', leftColX, inspY);
  inspY += 38;
  ctx.font = `27px ${fontStack}`;
  drawDottedLine(ctx, leftColX, leftColX + leftColW, inspY);
  ctx.fillText(
    leave.inspectorComment || 'ตรวจสอบสถิติการลาแล้ว เห็นควรอนุญาต',
    leftColX + 10,
    inspY
  );

  inspY += 85;
  const inspCenterX = leftColX + leftColW / 2;
  ctx.textAlign = 'center';

  const inspectorSigImg = await loadImage(leave.inspectorSignatureUrl);
  if (inspectorSigImg) {
    ctx.drawImage(inspectorSigImg, inspCenterX - 105, inspY - 70, 210, 64);
  }

  ctx.fillText(
    '(ลงชื่อ) .................................................... ผู้ตรวจสอบ',
    inspCenterX,
    inspY
  );
  inspY += 40;
  ctx.fillText(
    `( ${leave.inspectorName || settings.defaultInspectorName || '............................................'} )`,
    inspCenterX,
    inspY
  );
  inspY += 38;
  ctx.fillText(
    `ตำแหน่ง ${
      leave.inspectorPosition ||
      settings.defaultInspectorPosition ||
      'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล'
    }`,
    inspCenterX,
    inspY
  );
  inspY += 38;
  ctx.fillText(
    `วันที่ ${
      leave.inspectedAt
        ? formatThaiDate(leave.inspectedAt)
        : '....... / ...................... / .............'
    }`,
    inspCenterX,
    inspY
  );

  // Right Column: Supervisor Comment & Director Order Box
  let appY = bottomTopY;
  ctx.textAlign = 'left';
  ctx.font = `bold 28px ${fontStack}`;
  ctx.fillText('ความเห็นผู้บังคับบัญชา', rightColX, appY);

  appY += 42;
  ctx.font = `27px ${fontStack}`;
  drawDottedLine(ctx, rightColX, rightColX + rightColW, appY);
  ctx.fillText('เห็นควรอนุญาต', rightColX + 15, appY);

  appY += 64;
  ctx.font = `bold 28px ${fontStack}`;
  ctx.fillText('คำสั่ง ผู้อำนวยการสถานศึกษา', rightColX, appY);

  appY += 46;
  const isApproved = leave.status === 'อนุมัติแล้ว';
  const isRejected = leave.status === 'ไม่อนุมัติ';
  ctx.font = `bold 29px ${fontStack}`;
  ctx.fillText(
    `[ ${isApproved ? '✓' : '  '} ] อนุญาต            [ ${isRejected ? '✓' : '  '} ] ไม่อนุญาต`,
    rightColX + 15,
    appY
  );

  appY += 44;
  ctx.font = `27px ${fontStack}`;
  drawDottedLine(ctx, rightColX, rightColX + rightColW, appY);
  const appComment = leave.approverComment || leave.rejectReason || '';
  if (appComment) {
    ctx.fillText(`ความเห็น: ${appComment}`, rightColX + 10, appY);
  }

  let dirSigY = inspY - 114;
  const rightCenterX = rightColX + rightColW / 2;
  ctx.textAlign = 'center';

  const approverSigImg = await loadImage(
    leave.approverSignatureUrl || (isApproved ? settings.directorSignatureUrl : '')
  );
  if (approverSigImg) {
    ctx.drawImage(approverSigImg, rightCenterX - 105, dirSigY - 70, 210, 64);
  }

  ctx.fillText(
    '(ลงชื่อ) ............................................................',
    rightCenterX,
    dirSigY
  );
  dirSigY += 40;
  ctx.fillText(
    `( ${leave.approverName || settings.directorName || '............................................'} )`,
    rightCenterX,
    dirSigY
  );
  dirSigY += 38;
  ctx.fillText(
    `ตำแหน่ง ${leave.approverPosition || settings.directorPosition || 'ผู้อำนวยการสถานศึกษา'}`,
    rightCenterX,
    dirSigY
  );
  dirSigY += 38;
  ctx.fillText(
    `วันที่ ${
      leave.approvedAt
        ? formatThaiDate(leave.approvedAt)
        : '....... / ...................... / .............'
    }`,
    rightCenterX,
    dirSigY
  );

  // Footer Official Verification Reference
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = `20px ${fontStack}`;
  ctx.fillText(
    `เอกสารราชการอิเล็กทรอนิกส์ (TH Sarabun PSK 16 pt) • ${settings.organizationName} • เลขที่ใบลา ${leave.leaveNumber}`,
    W / 2,
    H - 55
  );

  // Convert Canvas JPEG into valid ISO %PDF-1.4 binary
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const jpegBase64 = jpegDataUrl.split(',')[1];
  const jpegBytes = Uint8Array.from(atob(jpegBase64), (c) => c.charCodeAt(0));

  const pdfBytes = buildPdfFromJpeg(jpegBytes, W, H, leave.leaveNumber);
  const pdfBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const pdfBase64 = uint8ArrayToBase64(pdfBytes);
  const fileName = `${leave.leaveNumber}_${leave.fullName.replace(/\s+/g, '_')}.pdf`;

  return { pdfBase64, pdfBlob, fileName };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Packages a raw JPEG byte array into a standards-compliant A4 PDF-1.4 document.
 */
function buildPdfFromJpeg(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number,
  leaveNumber: string
): Uint8Array {
  const pageWidthPt = 595.28; // 210mm in pt
  const pageHeightPt = 841.89; // 297mm in pt
  const encoder = new TextEncoder();

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  function pushStr(str: string) {
    const b = encoder.encode(str);
    chunks.push(b);
    currentOffset += b.length;
  }

  function pushBytes(b: Uint8Array) {
    chunks.push(b);
    currentOffset += b.length;
  }

  function startObj(id: number) {
    offsets[id] = currentOffset;
    pushStr(`${id} 0 obj\n`);
  }

  function endObj() {
    pushStr(`\nendobj\n`);
  }

  pushStr(`%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`);

  // 1: Catalog
  startObj(1);
  pushStr(`<< /Type /Catalog /Pages 2 0 R >>`);
  endObj();

  // 2: Pages
  startObj(2);
  pushStr(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  endObj();

  // 3: Page (A4 Portrait 210mm x 297mm)
  startObj(3);
  pushStr(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> /Font << /F1 7 0 R >> >> /Contents 5 0 R >>`
  );
  endObj();

  // 4: Image XObject (DCTDecode = JPEG)
  startObj(4);
  pushStr(
    `<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr(`\nendstream`);
  endObj();

  // 5: Content Stream (includes invisible searchable TH-Sarabun-PSK 16pt header + full-bleed A4 graphic stream)
  const safeLeaveNum = (leaveNumber || 'LV-2569-0001').replace(/[()\\]/g, '');
  const contentStream = `BT\n3 Tr\n/F1 16 Tf\n480 800 Td\n(${safeLeaveNum}) Tj\nET\nq\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  startObj(5);
  pushStr(`<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushStr(`endstream`);
  endObj();

  // 6: Document Info Dictionary
  startObj(6);
  pushStr(
    `<< /Title (Official Thai Government Leave Form A4 - ${safeLeaveNum}) /Creator (Namphong DOLE Leave System - TH-Sarabun-PSK 16 pt) /Producer (Namphong DOLE A4 PDF Engine) >>`
  );
  endObj();

  // 7: Font Dictionary (TH-Sarabun-PSK 16pt)
  startObj(7);
  pushStr(`<< /Type /Font /Subtype /Type1 /BaseFont /TH-Sarabun-PSK >>`);
  endObj();

  const xrefOffset = currentOffset;
  pushStr(`xref\n0 8\n0000000000 65535 f \n`);
  for (let i = 1; i <= 7; i++) {
    const padded = String(offsets[i]).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size 8 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}
