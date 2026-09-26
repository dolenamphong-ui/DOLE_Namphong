import React, { useState } from 'react';
import {
  Download,
  Printer,
  ExternalLink,
  CloudUpload,
  CheckCircle2,
  Loader2,
  X,
  FileCheck2,
  Eye,
} from 'lucide-react';
import { LeaveRequest, SystemSettings } from '../types.ts';
import { formatThaiDate, parseISODateParts } from '../utils/thaiDate.ts';
import { generateOfficialLeavePdf } from '../utils/pdfGenerator.ts';

interface OfficialLeaveDocumentProps {
  leave: LeaveRequest;
  settings: SystemSettings;
  onClose?: () => void;
  onUploadToDrive?: (
    leaveId: string,
    pdfBase64: string,
    fileName: string
  ) => Promise<LeaveRequest | void>;
  compactToolbar?: boolean;
}

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

function getCategorySubfolderName(leaveTypeName: string): string {
  if (leaveTypeName.includes('ป่วย')) return 'ใบลาป่วย';
  if (leaveTypeName.includes('กิจ')) return 'ลากิจส่วนตัว';
  if (leaveTypeName.includes('พักผ่อน')) return 'ลาพักผ่อน';
  if (leaveTypeName.includes('คลอด')) return 'ลาคลอดบุตร';
  if (leaveTypeName.includes('อุปสมบท')) return 'ลาอุปสมบท';
  return 'ประเภทอื่น ๆ';
}

export const OfficialLeaveDocument: React.FC<OfficialLeaveDocumentProps> = ({
  leave,
  settings,
  onClose,
  onUploadToDrive,
  compactToolbar = false,
}) => {
  const [localUpdatedLeave, setLocalUpdatedLeave] = useState<LeaveRequest | null>(null);
  const activeLeave =
    localUpdatedLeave && localUpdatedLeave.leaveId === leave.leaveId ? localUpdatedLeave : leave;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isOpeningPdfViewer, setIsOpeningPdfViewer] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  const writtenParts = parseISODateParts(activeLeave.writtenDate);
  const dayStr = writtenParts ? String(writtenParts.day) : '-';
  const monthStr = writtenParts ? THAI_MONTHS[writtenParts.monthIndex] : '-';
  const yearStr = writtenParts ? String(writtenParts.yearBE) : '2569';

  const isSickPersonalMaternity =
    activeLeave.leaveTypeName.includes('ป่วย') ||
    activeLeave.leaveTypeName.includes('กิจ') ||
    activeLeave.leaveTypeName.includes('คลอด');

  let formTitle = 'แบบใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว';
  if (activeLeave.leaveTypeName.includes('พักผ่อน')) {
    formTitle = 'แบบใบลาพักผ่อน';
  } else if (activeLeave.leaveTypeName.includes('อุปสมบท')) {
    formTitle = 'แบบใบลาอุปสมบท';
  } else if (!isSickPersonalMaternity) {
    formTitle = `แบบใบขออนุญาต${activeLeave.leaveTypeName}`;
  }

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const { pdfBlob, fileName } = await generateOfficialLeavePdf(activeLeave, settings);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenNativePdfViewer = async () => {
    try {
      setIsOpeningPdfViewer(true);
      const { pdfBlob, fileName } = await generateOfficialLeavePdf(activeLeave, settings);
      if (pdfViewerUrl) URL.revokeObjectURL(pdfViewerUrl);
      const url = URL.createObjectURL(pdfBlob);
      setPdfFileName(fileName);
      setPdfViewerUrl(url);
    } finally {
      setIsOpeningPdfViewer(false);
    }
  };

  const handleSaveToGoogleDrive = async () => {
    if (!onUploadToDrive || !activeLeave.leaveId || activeLeave.leaveId.startsWith('PREVIEW')) return;
    try {
      setIsUploadingDrive(true);
      setUploadSuccessMsg('');
      setUploadErrorMsg('');
      const { pdfBase64, fileName } = await generateOfficialLeavePdf(activeLeave, settings);
      const result = await onUploadToDrive(activeLeave.leaveId, pdfBase64, fileName);
      if (result) {
        setLocalUpdatedLeave(result);
      }
      setUploadSuccessMsg(
        `สร้างโฟลเดอร์และอัปโหลดไฟล์ PDF ลง Google Drive พร้อมบันทึก File ID (${
          result?.pdfFileId || 'สำเร็จ'
        }) และ URL ลงใน Google Sheets เรียบร้อยแล้ว`
      );
    } catch (err: any) {
      setUploadErrorMsg(err.message || 'ไม่สามารถอัปโหลดไฟล์ PDF ลง Google Drive ได้');
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reqSigSource =
    activeLeave.requesterSignatureUrl ||
    (activeLeave.halfDayPeriod?.startsWith('data:image/') ? activeLeave.halfDayPeriod : '');

  const statRows = [
    { label: 'ป่วย', active: activeLeave.leaveTypeName.includes('ป่วย') },
    { label: 'กิจส่วนตัว', active: activeLeave.leaveTypeName.includes('กิจ') },
    { label: 'พักผ่อน', active: activeLeave.leaveTypeName.includes('พักผ่อน') },
    {
      label:
        !activeLeave.leaveTypeName.includes('ป่วย') &&
        !activeLeave.leaveTypeName.includes('กิจ') &&
        !activeLeave.leaveTypeName.includes('พักผ่อน')
          ? activeLeave.leaveTypeName.replace(/^ลา/, '')
          : 'คลอดบุตร / อื่น ๆ',
      active:
        !activeLeave.leaveTypeName.includes('ป่วย') &&
        !activeLeave.leaveTypeName.includes('กิจ') &&
        !activeLeave.leaveTypeName.includes('พักผ่อน'),
    },
  ];

  const autoDriveFolderPath = `${
    settings.driveStorageRootFolderName || 'ระบบใบลาออนไลน์'
  } / ปี ${settings.fiscalYear || '2569'} / ${getCategorySubfolderName(activeLeave.leaveTypeName)}`;
  const driveViewUrl = activeLeave.pdfWebViewLink || activeLeave.pdfFileUrl;

  return (
    <div className="space-y-4">
      {/* Action Toolbar (Hidden when printing) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-indigo-950 text-amber-300 font-mono font-bold text-xs shadow-2xs">
            เลขที่ใบลา: {activeLeave.leaveNumber}
          </span>
          {!compactToolbar && (
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              มาตรฐานราชการไทย A4 (210×297 มม.) • ฟอนต์ TH-Sarabun-PSK 16 pt
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            ดาวน์โหลด PDF จริง (.pdf)
          </button>

          <button
            type="button"
            onClick={handleOpenNativePdfViewer}
            disabled={isOpeningPdfViewer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {isOpeningPdfViewer ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            เปิดดูไฟล์ PDF จริง
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ใบลา A4
          </button>

          {onUploadToDrive && activeLeave.leaveId && !activeLeave.leaveId.startsWith('PREVIEW') && (
            <button
              type="button"
              onClick={handleSaveToGoogleDrive}
              disabled={isUploadingDrive}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
            >
              {isUploadingDrive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              {activeLeave.pdfFileId ? 'อัปเดต PDF บน Drive' : 'บันทึก PDF ลง Drive'}
            </button>
          )}

          {driveViewUrl && (
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              เปิดใน Google Drive
            </a>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Google Drive Folder & Google Sheets File ID/URL Status Bar */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap text-slate-700">
          <span className="font-semibold text-indigo-950">📁 โฟลเดอร์จัดเก็บอัตโนมัติบน Drive:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 font-medium text-slate-800">
            {autoDriveFolderPath}
          </span>
        </div>

        {activeLeave.pdfFileId ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              File ID: {activeLeave.pdfFileId}
            </span>
            {driveViewUrl && (
              <a
                href={driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-800 hover:underline font-semibold inline-flex items-center gap-1"
              >
                URL ใน Google Sheets <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">
            {activeLeave.leaveId.startsWith('PREVIEW')
              ? 'เมื่อกดยืนยันส่งใบลา ระบบจะสร้างโฟลเดอร์ อัปโหลด PDF และบันทึก File ID + URL ลง Google Sheets อัตโนมัติ'
              : 'ยังไม่ได้ซิงค์ไฟล์ PDF ขึ้น Google Drive (กดปุ่ม "บันทึก PDF ลง Drive" เพื่ออัปโหลดทันที)'}
          </span>
        )}
      </div>

      {uploadSuccessMsg && (
        <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {uploadSuccessMsg}
        </div>
      )}

      {uploadErrorMsg && (
        <div className="no-print bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
          <X className="w-4 h-4 text-rose-600 shrink-0" />
          {uploadErrorMsg}
        </div>
      )}

      {/* Official Thai Government A4 Paper Sheet (210mm x 297mm, TH Sarabun PSK 16pt) */}
      <div className="overflow-x-auto pb-4">
        <div
          className="print-only-a4 font-gov-sarabun bg-white text-black mx-auto shadow-xl border border-slate-300 relative"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm 20mm 20mm 25mm',
            fontFamily: "'TH Sarabun PSK', 'TH-Sarabun-PSK', 'THSarabunNew', 'Sarabun', sans-serif",
            fontSize: '16pt',
            lineHeight: 1.38,
          }}
        >
          {/* Top-right Official Registration Box */}
          <div className="flex justify-end mb-2">
            <div
              className="border border-slate-900 px-3.5 py-1.5 text-left min-w-[66mm]"
              style={{ fontSize: '14pt', lineHeight: 1.25 }}
            >
              <div className="font-bold text-slate-900">
                ทะเบียนใบลา {settings.organizationShortName || 'สกร.อำเภอน้ำพอง'}
              </div>
              <div className="font-bold">เลขที่ใบลา: {leave.leaveNumber}</div>
              <div>
                วันที่ยื่น: {formatThaiDate(leave.writtenDate)} ({leave.status})
              </div>
            </div>
          </div>

          {/* Centered Official Form Title (20 pt Bold) */}
          <h1
            className="text-center font-bold mb-3 tracking-normal"
            style={{ fontSize: '20pt', lineHeight: 1.3 }}
          >
            {formTitle}
          </h1>

          {/* Written At & Date (Right-aligned) */}
          <div className="flex flex-col items-end space-y-1 mb-3">
            <div>
              เขียนที่{' '}
              <span className="border-b border-dotted border-slate-800 px-3 inline-block min-w-[68mm]">
                {settings.organizationName || leave.department}
              </span>
            </div>
            <div>
              วันที่{' '}
              <span className="border-b border-dotted border-slate-800 px-3 inline-block min-w-[14mm] text-center font-semibold">
                {dayStr}
              </span>{' '}
              เดือน{' '}
              <span className="border-b border-dotted border-slate-800 px-4 inline-block min-w-[32mm] text-center font-semibold">
                {monthStr}
              </span>{' '}
              พ.ศ.{' '}
              <span className="border-b border-dotted border-slate-800 px-3 inline-block min-w-[20mm] text-center font-semibold">
                {yearStr}
              </span>
            </div>
          </div>

          {/* Subject & AddressedTo */}
          <div className="space-y-1 mb-2.5">
            <div className="flex items-baseline gap-2">
              <span className="font-bold w-12 shrink-0">เรื่อง</span>
              <span className="border-b border-dotted border-slate-800 flex-1 px-2">
                {leave.subject || `ขออนุญาต${leave.leaveTypeName}`}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold w-12 shrink-0">เรียน</span>
              <span className="border-b border-dotted border-slate-800 flex-1 px-2">
                {leave.addressedTo || settings.addressedToDefault}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-1.5 text-justify">
            <div className="flex flex-wrap items-baseline gap-x-2" style={{ textIndent: '25mm' }}>
              <span>ข้าพเจ้า</span>
              <span
                className="border-b border-dotted border-slate-800 px-4 font-bold inline-block min-w-[58mm]"
                style={{ textIndent: 0 }}
              >
                {leave.fullName}
              </span>
              <span style={{ textIndent: 0 }}>ตำแหน่ง</span>
              <span
                className="border-b border-dotted border-slate-800 px-3 flex-1 inline-block min-w-[45mm]"
                style={{ textIndent: 0 }}
              >
                {leave.position || '-'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <span>สังกัด</span>
              <span className="border-b border-dotted border-slate-800 px-3 flex-1 inline-block min-w-[65mm]">
                {leave.department || settings.organizationName}
              </span>
              <span>ประเภทบุคลากร</span>
              <span className="border-b border-dotted border-slate-800 px-3 inline-block min-w-[38mm]">
                {leave.role || '-'}
              </span>
            </div>

            {/* Leave Type Checkboxes */}
            <div className="pt-1" style={{ paddingLeft: '25mm' }}>
              {isSickPersonalMaternity ? (
                <div className="flex flex-wrap items-center gap-x-6 font-bold">
                  <span>ขอลา</span>
                  <span>[ {leave.leaveTypeName.includes('ป่วย') ? '✓' : ' '} ] ลาป่วย</span>
                  <span>[ {leave.leaveTypeName.includes('กิจ') ? '✓' : ' '} ] ลากิจส่วนตัว</span>
                  <span>[ {leave.leaveTypeName.includes('คลอด') ? '✓' : ' '} ] ลาคลอดบุตร</span>
                  <span className="font-normal text-slate-800">
                    ({leave.durationType || 'เต็มวัน'})
                  </span>
                </div>
              ) : (
                <div className="font-bold">
                  มีความประสงค์ขอ [ ✓ ] {leave.leaveTypeName}{' '}
                  <span className="font-normal">({leave.durationType || 'เต็มวัน'})</span>
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="shrink-0">เนื่องจาก</span>
              <span className="border-b border-dotted border-slate-800 flex-1 px-2">
                {leave.reason || '-'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <span>ตั้งแต่วันที่</span>
              <span className="border-b border-dotted border-slate-800 px-3 font-semibold inline-block min-w-[42mm] text-center">
                {formatThaiDate(leave.startDate)}
              </span>
              <span>ถึงวันที่</span>
              <span className="border-b border-dotted border-slate-800 px-3 font-semibold inline-block min-w-[42mm] text-center">
                {formatThaiDate(leave.endDate)}
              </span>
              <span>มีกำหนด</span>
              <span className="border-b border-dotted border-slate-800 px-3 font-bold inline-block min-w-[16mm] text-center">
                {leave.totalDays}
              </span>
              <span>วัน</span>
            </div>

            <div>
              {leave.lastLeaveStartDate ? (
                <>
                  ข้าพเจ้าได้{' '}
                  <span className="border-b border-dotted border-slate-800 px-2 font-semibold">
                    {leave.lastLeaveType || leave.leaveTypeName}
                  </span>{' '}
                  ครั้งสุดท้าย ตั้งแต่วันที่{' '}
                  <span className="border-b border-dotted border-slate-800 px-2">
                    {formatThaiDate(leave.lastLeaveStartDate)}
                  </span>{' '}
                  ถึงวันที่{' '}
                  <span className="border-b border-dotted border-slate-800 px-2">
                    {formatThaiDate(leave.lastLeaveEndDate)}
                  </span>{' '}
                  มีกำหนด{' '}
                  <span className="border-b border-dotted border-slate-800 px-2 font-semibold">
                    {leave.lastLeaveTotalDays}
                  </span>{' '}
                  วัน
                </>
              ) : (
                <>ข้าพเจ้าไม่เคย{leave.leaveTypeName}ในปีงบประมาณ พ.ศ. {yearStr} นี้มาก่อน</>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <span>ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่</span>
              <span className="border-b border-dotted border-slate-800 px-3 flex-1 inline-block min-w-[55mm]">
                {leave.contactAddress || '-'}
              </span>
              <span>โทรศัพท์</span>
              <span className="border-b border-dotted border-slate-800 px-3 font-semibold inline-block min-w-[32mm]">
                {leave.contactPhone || '-'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <span>มอบหมายงานในหน้าที่ให้</span>
              <span className="border-b border-dotted border-slate-800 px-3 flex-1">
                {leave.substitutePerson && leave.substitutePerson !== '-'
                  ? `${leave.substitutePerson} (${leave.substituteWork || 'ปฏิบัติหน้าที่แทน'})`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Requester Signature Block */}
          <div className="flex justify-end mt-5 mb-5">
            <div className="w-72 text-center space-y-0.5">
              <div>ขอแสดงความนับถือ</div>
              <div className="pt-2 min-h-[48px] flex flex-col items-center justify-end">
                {reqSigSource && (
                  <img
                    src={reqSigSource}
                    alt="ลายมือชื่อผู้ขอลา"
                    className="h-11 object-contain mb-0.5"
                  />
                )}
                <div>
                  (ลงชื่อ){' '}
                  <span className="border-b border-dotted border-slate-800 px-6 italic">
                    {!reqSigSource ? leave.fullName : ''}
                  </span>
                </div>
              </div>
              <div>( {leave.fullName} )</div>
              <div>ตำแหน่ง {leave.position || '-'}</div>
            </div>
          </div>

          {/* Two-Column Bottom Section: Statistics + Inspector (Left) & Director Approval (Right) */}
          <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-400">
            {/* Left Column: Leave Statistics & Inspector */}
            <div className="space-y-2.5">
              <div className="font-bold">สถิติการลาในปีงบประมาณนี้ (วันทำการ)</div>
              <table
                className="w-full border-collapse border border-slate-900 text-center"
                style={{ fontSize: '14pt', lineHeight: 1.25 }}
              >
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-900 py-1 px-1.5">ประเภทลา</th>
                    <th className="border border-slate-900 py-1 px-1">ลามาแล้ว</th>
                    <th className="border border-slate-900 py-1 px-1">ลาครั้งนี้</th>
                    <th className="border border-slate-900 py-1 px-1">รวมเป็น</th>
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((sr, idx) => {
                    const prev = sr.active ? leave.accumulatedLeaveDays || 0 : '-';
                    const cur = sr.active ? leave.totalDays : '-';
                    const total = sr.active
                      ? (Number(leave.accumulatedLeaveDays) || 0) + Number(leave.totalDays)
                      : '-';
                    return (
                      <tr key={idx}>
                        <td className="border border-slate-900 py-1 px-1.5 text-left">
                          {sr.label}
                        </td>
                        <td className="border border-slate-900 py-1 px-1">{prev}</td>
                        <td className="border border-slate-900 py-1 px-1 font-semibold">{cur}</td>
                        <td className="border border-slate-900 py-1 px-1 font-bold">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Inspector Signature Box */}
              <div className="pt-1.5 space-y-0.5 text-center">
                <div className="text-left font-bold">ความเห็นผู้ตรวจสอบสถิติการลา:</div>
                <div className="text-left border-b border-dotted border-slate-800 min-h-[24px] px-1">
                  {leave.inspectorComment || 'ตรวจสอบสถิติการลาแล้ว เห็นควรอนุญาต'}
                </div>

                <div className="pt-2.5 min-h-[50px] flex flex-col items-center justify-end">
                  {leave.inspectorSignatureUrl && (
                    <img
                      src={leave.inspectorSignatureUrl}
                      alt="ลายเซ็นผู้ตรวจสอบ"
                      className="h-11 object-contain mb-0.5"
                    />
                  )}
                  <div>
                    (ลงชื่อ){' '}
                    <span className="border-b border-dotted border-slate-800 px-6">
                      {!leave.inspectorSignatureUrl && leave.inspectorName
                        ? leave.inspectorName
                        : ''}
                    </span>{' '}
                    ผู้ตรวจสอบ
                  </div>
                </div>
                <div>
                  ( {leave.inspectorName || settings.defaultInspectorName || '............................................'} )
                </div>
                <div>
                  ตำแหน่ง {leave.inspectorPosition || settings.defaultInspectorPosition}
                </div>
                <div>
                  วันที่{' '}
                  {leave.inspectedAt
                    ? formatThaiDate(leave.inspectedAt)
                    : '....... / ...................... / .............'}
                </div>
              </div>
            </div>

            {/* Right Column: Supervisor & Director Order */}
            <div className="space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="font-bold">ความเห็นผู้บังคับบัญชา</div>
                <div className="border-b border-dotted border-slate-800 px-2 pb-0.5">
                  เห็นควรอนุญาต
                </div>

                <div className="font-bold pt-2">คำสั่ง ผู้อำนวยการสถานศึกษา</div>
                <div className="flex items-center gap-6 py-0.5 font-bold">
                  <span>[ {leave.status === 'อนุมัติแล้ว' ? '✓' : ' '} ] อนุญาต</span>
                  <span>[ {leave.status === 'ไม่อนุมัติ' ? '✓' : ' '} ] ไม่อนุญาต</span>
                </div>
                <div>
                  ความเห็น:{' '}
                  <span className="border-b border-dotted border-slate-800 px-2">
                    {leave.approverComment ||
                      leave.rejectReason ||
                      '....................................................................'}
                  </span>
                </div>
              </div>

              <div className="pt-3 text-center space-y-0.5">
                <div className="min-h-[50px] flex flex-col items-center justify-end">
                  {(leave.approverSignatureUrl ||
                    (leave.status === 'อนุมัติแล้ว' && settings.directorSignatureUrl)) && (
                    <img
                      src={leave.approverSignatureUrl || settings.directorSignatureUrl}
                      alt="ลายเซ็นผู้อนุมัติ"
                      className="h-11 object-contain mb-0.5"
                    />
                  )}
                  <div>
                    (ลงชื่อ){' '}
                    <span className="border-b border-dotted border-slate-800 px-8">
                      {!leave.approverSignatureUrl &&
                      leave.status === 'อนุมัติแล้ว' &&
                      leave.approverName
                        ? leave.approverName
                        : ''}
                    </span>
                  </div>
                </div>
                <div>
                  ( {leave.approverName || settings.directorName || '............................................'} )
                </div>
                <div>
                  ตำแหน่ง {leave.approverPosition || settings.directorPosition}
                </div>
                <div>
                  วันที่{' '}
                  {leave.approvedAt
                    ? formatThaiDate(leave.approvedAt)
                    : '....... / ...................... / .............'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Native PDF Binary Viewer Modal */}
      {pdfViewerUrl && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-indigo-950 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-300" />
                <div>
                  <div className="text-sm font-bold">{pdfFileName}</div>
                  <div className="text-[11px] text-indigo-200">
                    ไฟล์เอกสาร PDF มาตรฐานราชการไทย A4 (TH Sarabun PSK 16 pt)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfViewerUrl}
                  download={pdfFileName}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลด PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(pdfViewerUrl);
                    setPdfViewerUrl(null);
                  }}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfViewerUrl}
              title="Official Leave PDF Preview"
              className="flex-1 w-full bg-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
