export type UserStatus = 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ' | 'ระงับการใช้งาน';

export type LeaveStatus =
  | 'ร่าง'
  | 'ส่งใบลาแล้ว'
  | 'รอตรวจสอบ'
  | 'รออนุมัติ'
  | 'ส่งกลับแก้ไข'
  | 'อนุมัติแล้ว'
  | 'ไม่อนุมัติ'
  | 'ยกเลิก';

export type LeaveDurationType =
  | 'เต็มวัน'
  | 'ครึ่งวันเช้า (08.30 - 12.00 น.)'
  | 'ครึ่งวันบ่าย (13.00 - 16.30 น.)';

export interface User {
  userId: string;
  username: string;
  title: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: string;
  status: UserStatus;
  profileImage: string;
  createdAt: string;
  approvedAt: string;
  approvedBy: string;
  lastLogin: string;
  forceChangePassword: boolean;
}

export interface LeaveType {
  typeId: string;
  name: string;
  code: string;
  description: string;
  maxDaysPerYear: number;
  requiresAttachment: boolean;
  conditionText: string;
  formTemplateType: 'sick_personal_maternity' | 'vacation' | 'ordination' | 'general_memo';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  leaveId: string;
  leaveNumber: string;
  userId: string;
  username: string;
  fullName: string;
  position: string;
  department: string;
  role: string;
  writtenDate: string; // ISO YYYY-MM-DD
  subject: string;
  addressedTo: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  durationType: LeaveDurationType;
  halfDayPeriod: string;
  requesterSignatureUrl?: string;
  totalDays: number;
  reason: string;
  contactAddress: string;
  contactPhone: string;
  substituteWork: string;
  substitutePerson: string;
  note: string;
  status: LeaveStatus;
  lastLeaveType: string;
  lastLeaveStartDate: string;
  lastLeaveEndDate: string;
  lastLeaveTotalDays: number;
  accumulatedLeaveDays: number;
  inspectorName: string;
  inspectorPosition: string;
  inspectorComment: string;
  inspectorSignatureUrl: string;
  inspectedAt: string;
  approverName: string;
  approverPosition: string;
  approverComment: string;
  approverSignatureUrl: string;
  approvedAt: string;
  returnReason: string;
  rejectReason: string;
  pdfFileId: string;
  pdfFileUrl: string;
  pdfWebViewLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApproval {
  approvalId: string;
  leaveId: string;
  leaveNumber: string;
  actionByUserId: string;
  actionByName: string;
  actionByPosition: string;
  actionType: 'ตรวจสอบ' | 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข' | 'ยกเลิก';
  previousStatus: string;
  newStatus: string;
  comment: string;
  signatureDataUrl: string;
  signatureDriveFileId: string;
  timestamp: string;
}

export interface InspectorRecord {
  inspectorId: string;
  fullName: string;
  position: string;
  department: string;
  roleType: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล' | 'ผู้อำนวยการสถานศึกษา' | 'ผู้ได้รับมอบหมาย' | 'อื่น ๆ';
  signatureDataUrl: string;
  signatureDriveFileId: string;
  isDefault: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface DocumentRecord {
  docId: string;
  leaveId: string;
  leaveNumber: string;
  userId: string;
  fileName: string;
  mimeType: string;
  driveFileId: string;
  driveFolderId: string;
  webViewLink: string;
  webContentLink: string;
  fiscalYear: string;
  leaveTypeName: string;
  createdAt: string;
}

export interface AuditLog {
  logId: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  target: string;
  targetId: string;
  details: string;
  ipAddress: string;
}

export interface NotificationItem {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  referenceId: string;
  isRead: boolean;
  createdAt: string;
}

export interface SystemSettings {
  organizationName: string;
  organizationShortName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  addressedToDefault: string;
  defaultInspectorName: string;
  defaultInspectorPosition: string;
  directorName: string;
  directorPosition: string;
  directorSignatureUrl: string;
  fiscalYear: string;
  leaveNumberPrefix: string;
  driveStorageRootFolderName: string;
  driveStorageRootFolderId: string;
  referenceDriveFolderId: string;
  roles: string[];
  titles: string[];
}

export interface DriveTemplateFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export interface DriveFolderNode {
  category?: string;
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveIntegrationVerificationReport {
  verifiedAt: string;
  spreadsheetId: string;
  rootFolder: DriveFolderNode;
  yearFolder: DriveFolderNode;
  categoryFolders: DriveFolderNode[];
  referenceTemplatesCount: number;
  storedDocumentsCount: number;
  testUpload: {
    passed: boolean;
    fileId: string;
    fileName: string;
    folderId: string;
    webViewLink: string;
    webContentLink: string;
    savedToSheetsVerified: boolean;
  };
}

export const DEFAULT_USER_ROLES: string[] = [
  'ลูกจ้าง',
  'ครูประจำศูนย์การเรียนชุมชน',
  'ครูศูนย์การเรียนรู้',
  'ข้าราชการครู',
  'ข้าราชการบรรณารักษ์',
  'ผู้อำนวยการสถานศึกษา',
];

export const DEFAULT_TITLES: string[] = [
  'นาย',
  'นาง',
  'นางสาว',
  'ว่าที่ร้อยตรี',
  'ว่าที่ร้อยตรีหญิง',
  'ดร.',
];
