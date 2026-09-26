import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  ExternalLink,
  X,
  KeyRound,
  ShieldCheck,
  Table,
  FolderOpen,
  FileCheck2,
  HardDrive,
} from 'lucide-react';
import { DriveIntegrationVerificationReport } from '../types.ts';
import { formatThaiDateTime } from '../utils/thaiDate.ts';

export interface SheetVerificationItem {
  sheetName: string;
  exists: boolean;
  headerCount: number;
  expectedHeaderCount: number;
  headersMatch: boolean;
  rowCount: number;
  crudStatus: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  durationMs: number;
  sampleHeaders: string[];
}

export interface SpreadsheetCrudVerificationReport {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  verifiedAt: string;
  sheetsCreated: string[];
  sheets: SheetVerificationItem[];
  allPassed: boolean;
}

interface DatabaseVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected: boolean;
  onConnectGoogleAndRunTest: () => Promise<void>;
  onRunCrudTest: () => Promise<SpreadsheetCrudVerificationReport>;
  onRunDriveVerification?: () => Promise<DriveIntegrationVerificationReport>;
  oauthClientId: string;
  onUpdateClientId: (id: string) => void;
  onManualTokenConnect: (token: string) => Promise<void>;
}

export const DatabaseVerificationModal: React.FC<DatabaseVerificationModalProps> = ({
  isOpen,
  onClose,
  isGoogleConnected,
  onConnectGoogleAndRunTest,
  onRunCrudTest,
  onRunDriveVerification,
  oauthClientId,
  onUpdateClientId,
  onManualTokenConnect,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningDrive, setIsRunningDrive] = useState(false);
  const [report, setReport] = useState<SpreadsheetCrudVerificationReport | null>(null);
  const [driveReport, setDriveReport] = useState<DriveIntegrationVerificationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false);
  const [manualToken, setManualToken] = useState('');

  if (!isOpen) return null;

  const handleStartTest = async () => {
    setErrorMsg('');
    setIsRunning(true);
    try {
      const res = await onRunCrudTest();
      setReport(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อ Google Sheets API ได้');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartDriveTest = async () => {
    if (!onRunDriveVerification) return;
    setErrorMsg('');
    setIsRunningDrive(true);
    try {
      const res = await onRunDriveVerification();
      setDriveReport(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อ Google Drive API ได้');
    } finally {
      setIsRunningDrive(false);
    }
  };

  const handleRunBothTests = async () => {
    await handleStartTest();
    if (onRunDriveVerification) {
      await handleStartDriveTest();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8 border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950 text-amber-300 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ตรวจสอบ Google Sheets CRUD &amp; Google Drive Integration จริง
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Spreadsheet ID: 1ezR22MwZvbv60d78oAeOPTC9TbrEDNEXwk-A5rzkLTQ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection & Action Banner */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isGoogleConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {isGoogleConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    เชื่อมต่อ OAuth (Sheets + Drive) พร้อมใช้งาน
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    รอการอนุญาตสิทธิ์ Google OAuth
                  </>
                )}
              </span>
              <a
                href="https://docs.google.com/spreadsheets/d/1ezR22MwZvbv60d78oAeOPTC9TbrEDNEXwk-A5rzkLTQ/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-800 hover:underline"
              >
                เปิดดูไฟล์ Google Sheets จริง <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-xs text-slate-600">
              ตรวจสอบตารางฐานข้อมูล Google Sheets ทั้งหมด พร้อมทดสอบสร้างโฟลเดอร์เก็บใบลาอัตโนมัติใน <strong>Google Drive</strong> และบันทึก <strong>File ID + URL</strong> ลงใน Google Sheets จริง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isGoogleConnected ? (
              <button
                type="button"
                onClick={async () => {
                  await onConnectGoogleAndRunTest();
                  await handleRunBothTests();
                }}
                disabled={isRunning || isRunningDrive}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                1. เชื่อมต่อ Google OAuth &amp; ทดสอบทันที
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={isRunning || isRunningDrive}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunning ? 'กำลังทดสอบ Sheets CRUD...' : 'ทดสอบ Google Sheets CRUD'}
                </button>

                {onRunDriveVerification && (
                  <button
                    type="button"
                    onClick={handleStartDriveTest}
                    disabled={isRunning || isRunningDrive}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    {isRunningDrive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <HardDrive className="w-4 h-4" />
                    )}
                    {isRunningDrive
                      ? 'กำลังสร้างโฟลเดอร์ Drive & บันทึก Sheets...'
                      : 'ตรวจสอบ Google Drive & สร้างโฟลเดอร์อัตโนมัติ'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ผลการตรวจสอบแจ้งเตือน:
            </div>
            <p>{errorMsg}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={onConnectGoogleAndRunTest}
                className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold cursor-pointer"
              >
                อนุญาตสิทธิ์ผ่าน Google OAuth Popup ใหม่
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-800 font-semibold cursor-pointer"
              >
                ตั้งค่า OAuth Token ขั้นสูง
              </button>
            </div>
          </div>
        )}

        {/* Live Google Drive Auto-Folder & Sheets File ID/URL Verification Report */}
        {driveReport && (
          <div className="space-y-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-6 h-6 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-950">
                    ยืนยัน Google Drive Integration &amp; สร้างโฟลเดอร์เก็บใบลาอัตโนมัติสำเร็จ
                  </div>
                  <div className="text-xs text-emerald-800">
                    ตรวจสอบเมื่อ: {formatThaiDateTime(driveReport.verifiedAt)} • บันทึก{' '}
                    <code className="font-mono font-bold">driveStorageRootFolderId</code> ลงตาราง{' '}
                    <strong>Settings</strong> และบันทึก <strong>File ID + URL</strong> ลงตาราง{' '}
                    <strong>Documents</strong> เรียบร้อยแล้ว
                  </div>
                </div>
              </div>
              <a
                href={driveReport.rootFolder.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                เปิดโฟลเดอร์หลักบน Google Drive <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Root & Fiscal Year Folder Hierarchy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">
                  1. โฟลเดอร์หลักระบบใบลา (บันทึกใน Settings.driveStorageRootFolderId)
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
                  {driveReport.rootFolder.name}
                </div>
                <div className="text-[11px] font-mono text-slate-600 break-all">
                  Folder ID: <strong>{driveReport.rootFolder.id}</strong>
                </div>
                <a
                  href={driveReport.rootFolder.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800 hover:underline"
                >
                  {driveReport.rootFolder.webViewLink} <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">
                  2. โฟลเดอร์ปีงบประมาณปัจจุบัน (สร้างอัตโนมัติภายใต้โฟลเดอร์หลัก)
                </div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-indigo-700 shrink-0" />
                  {driveReport.yearFolder.name}
                </div>
                <div className="text-[11px] font-mono text-slate-600 break-all">
                  Folder ID: <strong>{driveReport.yearFolder.id}</strong>
                </div>
                <a
                  href={driveReport.yearFolder.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800 hover:underline"
                >
                  {driveReport.yearFolder.webViewLink} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Category Subfolders Grid */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-emerald-950">
                3. โฟลเดอร์ย่อยแยกตามประเภทการลา (สร้างอัตโนมัติครบทั้ง {driveReport.categoryFolders.length} ประเภท):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {driveReport.categoryFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-2.5 rounded-xl bg-white border border-emerald-200 flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {folder.name}
                      </span>
                      <a
                        href={folder.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-indigo-800 hover:underline font-semibold inline-flex items-center gap-0.5"
                      >
                        เปิดดู <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      ID: {folder.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Uploaded Test PDF & Sheets Sync Proof */}
            {driveReport.testUpload && (
              <div className="p-3 rounded-xl bg-white border border-emerald-300 space-y-1.5">
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  4. ทดสอบอัปโหลดไฟล์ PDF จริง และบันทึก File ID + URL ลง Google Sheets (ตาราง Documents) สำเร็จ:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">ชื่อไฟล์ PDF:</span>{' '}
                    <strong className="font-mono text-slate-900">
                      {driveReport.testUpload.fileName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">สถานะบันทึกใน Google Sheets:</span>{' '}
                    <strong className="font-mono text-emerald-800">
                      {driveReport.testUpload.savedToSheetsVerified
                        ? '✓ บันทึกและอ่านยืนยันจาก Sheet Documents สำเร็จ'
                        : 'รอการยืนยัน'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Google Drive File ID:</span>{' '}
                    <strong className="font-mono text-emerald-900">
                      {driveReport.testUpload.fileId}
                    </strong>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500">Google Drive URL:</span>{' '}
                    <a
                      href={driveReport.testUpload.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-indigo-800 hover:underline"
                    >
                      {driveReport.testUpload.webViewLink}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live CRUD Verification Results Table */}
        {report && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-950">
                    ยืนยันการเชื่อมต่อสำเร็จ: &ldquo;{report.spreadsheetTitle}&rdquo;
                  </div>
                  <div className="text-xs text-emerald-800">
                    ตรวจสอบเมื่อ: {formatThaiDateTime(report.verifiedAt)} •{' '}
                    {report.sheetsCreated.length > 0
                      ? `สร้าง Sheet ใหม่อัตโนมัติ: ${report.sheetsCreated.join(', ')}`
                      : 'พบครบทุก Sheet ในฐานข้อมูลแล้ว'}
                  </div>
                </div>
              </div>
              <a
                href={report.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                เปิดดูข้อมูลใน Google Sheets <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">ชื่อ Sheet</th>
                    <th className="py-3 px-3 text-center">โครงสร้าง Header</th>
                    <th className="py-3 px-3 text-center">CREATE (เพิ่ม)</th>
                    <th className="py-3 px-3 text-center">READ (อ่าน)</th>
                    <th className="py-3 px-3 text-center">UPDATE (แก้ไข)</th>
                    <th className="py-3 px-3 text-center">DELETE (ลบ)</th>
                    <th className="py-3 px-3 text-center">ข้อมูลจริง</th>
                    <th className="py-3 px-3 text-right">เวลาที่ใช้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.sheets.map((s) => (
                    <tr key={s.sheetName} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-indigo-950 flex items-center gap-1.5">
                        <Table className="w-4 h-4 text-indigo-700 shrink-0" />
                        {s.sheetName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          ✓ {s.headerCount} คอลัมน์
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.crudStatus.create ? (
                          <span className="text-emerald-700 font-bold">✓ ผ่าน</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✗ ล้มเหลว</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.crudStatus.read ? (
                          <span className="text-emerald-700 font-bold">✓ ผ่าน</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✗ ล้มเหลว</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.crudStatus.update ? (
                          <span className="text-emerald-700 font-bold">✓ ผ่าน</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✗ ล้มเหลว</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.crudStatus.delete ? (
                          <span className="text-emerald-700 font-bold">✓ ผ่าน</span>
                        ) : (
                          <span className="text-rose-600 font-bold">✗ ล้มเหลว</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800">
                        {s.rowCount} แถว
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {s.durationMs} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Collapsible Advanced OAuth Section */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
            className="text-xs text-slate-500 hover:text-indigo-800 font-medium cursor-pointer"
          >
            {showAdvancedOAuth ? '▼ ซ่อนตั้งค่า OAuth ขั้นสูง' : '▶ ตั้งค่า OAuth Client ID หรือ Access Token ขั้นสูง'}
          </button>

          {showAdvancedOAuth && (
            <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={oauthClientId}
                  onChange={(e) => onUpdateClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หรือวาง Google OAuth Access Token โดยตรง (Scopes: spreadsheets, drive)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="ya29.a0..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (manualToken.trim()) {
                        await onManualTokenConnect(manualToken.trim());
                        await handleStartTest();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                  >
                    ใช้ Token & ทดสอบ CRUD
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
