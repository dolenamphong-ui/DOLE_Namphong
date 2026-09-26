import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  appendSheetRow,
  createNotification,
  deleteSheetRowById,
  ensureAllLeaveDriveFolders,
  ensureLeaveDriveFolder,
  ensureSpreadsheetInitialized,
  getEffectiveGoogleToken,
  getPublicOAuthClientId,
  getSystemSettings,
  GoogleWorkspaceError,
  hashPassword,
  listReferenceDriveTemplates,
  readSheetRows,
  saveSystemSettings,
  SessionPayload,
  setServerGoogleToken,
  signSessionToken,
  uploadFileToGoogleDrive,
  updateSheetRowById,
  verifyAndTestSpreadsheetCrud,
  verifyDriveAndSheetsIntegration,
  verifyPassword,
  verifySessionToken,
  writeAuditLog,
} from './src/server/sheetsDb.ts';
import {
  AuditLog,
  DocumentRecord,
  InspectorRecord,
  LeaveApproval,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  NotificationItem,
  User,
} from './src/types.ts';

interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
  googleToken?: string | null;
}

function sanitizeUser(u: User & { passwordHash?: string }): User {
  const { passwordHash: _omitted, ...rest } = u;
  return rest;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow up to 25MB payloads for PDF and signature uploads
  app.use(express.json({ limit: '25mb' }));

  // Attach Google OAuth token and User session if present
  app.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const headerGoogleToken = req.headers['x-google-access-token'];
    req.googleToken = getEffectiveGoogleToken(
      typeof headerGoogleToken === 'string' ? headerGoogleToken : undefined
    );

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const session = verifySessionToken(authHeader);
      if (session) {
        req.user = session;
      }
    }
    next();
  });

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน', code: 'UNAUTHORIZED' });
      return;
    }
    next();
  }

  function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'Admin') {
      res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ดำเนินการนี้', code: 'FORBIDDEN' });
      return;
    }
    next();
  }

  // Public system configuration & Workspace connection status
  app.get('/api/config', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const oauthClientId = getPublicOAuthClientId();
      const hasActiveGoogleToken = Boolean(req.googleToken);
      let settings = await getSystemSettings(null);
      if (req.googleToken) {
        try {
          await ensureSpreadsheetInitialized(req.googleToken, false);
          settings = await getSystemSettings(req.googleToken);
        } catch {
          // If token expired, fallback to default settings until reconnected
        }
      }
      res.json({
        oauthClientId,
        hasActiveGoogleToken: Boolean(getEffectiveGoogleToken()),
        settings,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการโหลดค่าเริ่มต้น' });
    }
  });

  // Connect & initialize Google Spreadsheet + auto-provision Google Drive folder hierarchy
  app.post('/api/workspace/connect', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const bodyToken = req.body?.accessToken;
      if (bodyToken && typeof bodyToken === 'string') {
        setServerGoogleToken(bodyToken);
        req.googleToken = getEffectiveGoogleToken(bodyToken);
      }
      const initResult = await ensureSpreadsheetInitialized(req.googleToken || null, true);
      let driveFolders: any = null;
      if (req.googleToken) {
        try {
          driveFolders = await ensureAllLeaveDriveFolders(req.googleToken);
        } catch {
          // non-fatal if Drive scope is pending
        }
      }
      const settings = await getSystemSettings(req.googleToken || null);
      let referenceTemplates: any[] = [];
      try {
        referenceTemplates = await listReferenceDriveTemplates(req.googleToken || null);
      } catch {
        // Folder might be restricted or empty, non-fatal
      }

      res.json({
        connected: true,
        spreadsheetTitle: initResult.spreadsheetTitle,
        sheetsCreated: initResult.sheetsCreated,
        settings,
        driveFolders,
        referenceTemplates,
      });
    } catch (err) {
      next(err);
    }
  });

  // Verify Google Sheets ID 1ezR22MwZvbv60d78oAeOPTC9TbrEDNEXwk-A5rzkLTQ & Run Live CRUD Test
  app.post('/api/workspace/verify-crud', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const bodyToken = req.body?.accessToken;
      if (bodyToken && typeof bodyToken === 'string') {
        setServerGoogleToken(bodyToken);
        req.googleToken = getEffectiveGoogleToken(bodyToken);
      }
      const report = await verifyAndTestSpreadsheetCrud(req.googleToken || null);
      res.json({ report });
    } catch (err) {
      next(err);
    }
  });

  // Verify Google Drive Integration, Auto-create Folder Hierarchy, and Test File ID/URL Recording in Google Sheets
  app.post('/api/drive/verify-and-provision', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const bodyToken = req.body?.accessToken;
      if (bodyToken && typeof bodyToken === 'string') {
        setServerGoogleToken(bodyToken);
        req.googleToken = getEffectiveGoogleToken(bodyToken);
      }
      const driveReport = await verifyDriveAndSheetsIntegration(req.googleToken || null);
      const [settings, docsRes] = await Promise.all([
        getSystemSettings(req.googleToken || null),
        readSheetRows<DocumentRecord>(req.googleToken || null, 'Documents'),
      ]);
      res.json({
        driveReport,
        settings,
        documents: docsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  });

  // Get or Provision Google Drive Folder Tree & Stored Documents
  app.get('/api/drive/folders', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.googleToken) {
        throw new GoogleWorkspaceError('กรุณาเชื่อมต่อ Google Workspace (OAuth) เพื่อตรวจสอบโฟลเดอร์ Google Drive');
      }
      const [folders, docsRes, settings] = await Promise.all([
        ensureAllLeaveDriveFolders(req.googleToken),
        readSheetRows<DocumentRecord>(req.googleToken, 'Documents'),
        getSystemSettings(req.googleToken),
      ]);
      res.json({
        folders,
        documents: docsRes.rows,
        settings,
      });
    } catch (err) {
      next(err);
    }
  });

  // Inspect Reference Google Drive Folder (1qKlnRbX0idcFRc5lNwbtLJGeOHDIYzXS)
  app.get('/api/drive/reference-templates', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const files = await listReferenceDriveTemplates(req.googleToken || null);
      res.json({ files });
    } catch (err) {
      next(err);
    }
  });

  // Register new member (#6)
  app.post('/api/auth/register', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSpreadsheetInitialized(req.googleToken || null);
      const {
        title,
        firstName,
        lastName,
        username,
        password,
        email,
        phone,
        position,
        role,
        department,
      } = req.body || {};

      if (!firstName?.trim() || !lastName?.trim() || !username?.trim() || !password) {
        res.status(400).json({ error: 'กรุณากรอกข้อมูลชื่อ นามสกุล ชื่อผู้ใช้งาน และรหัสผ่านให้ครบถ้วน' });
        return;
      }
      if (String(password).length < 6) {
        res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(String(email).trim())) {
        res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
        return;
      }
      const phoneClean = String(phone || '').replace(/[\s-]/g, '');
      if (!/^[0-9]{9,10}$/.test(phoneClean)) {
        res.status(400).json({ error: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก' });
        return;
      }

      const { rows: existingUsers } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );

      const cleanUsername = String(username).trim();
      const duplicate = existingUsers.some(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (duplicate) {
        res.status(409).json({ error: 'ชื่อผู้ใช้งาน (Username) นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น' });
        return;
      }

      const now = new Date().toISOString();
      const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const cleanTitle = String(title || 'นาย').trim();
      const cleanFirst = String(firstName).trim();
      const cleanLast = String(lastName).trim();
      const fullName = `${cleanTitle}${cleanFirst} ${cleanLast}`;

      const newUserRecord = {
        userId,
        username: cleanUsername,
        passwordHash: hashPassword(String(password)),
        title: cleanTitle,
        firstName: cleanFirst,
        lastName: cleanLast,
        fullName,
        email: String(email).trim(),
        phone: String(phone).trim(),
        position: String(position || '').trim(),
        department: String(department || 'สกร.ระดับอำเภอน้ำพอง จ.ขอนแก่น').trim(),
        role: String(role === 'Admin' ? 'ลูกจ้าง' : role || 'ลูกจ้าง').trim(),
        status: 'รออนุมัติ',
        profileImage: '',
        createdAt: now,
        approvedAt: '',
        approvedBy: '',
        lastLogin: '',
        forceChangePassword: false,
      };

      await appendSheetRow(req.googleToken || null, 'Users', newUserRecord);

      await writeAuditLog(req.googleToken || null, {
        userId,
        username: cleanUsername,
        action: 'สมัครสมาชิก',
        target: 'Users',
        targetId: userId,
        details: `สมัครสมาชิกใหม่: ${fullName} (${newUserRecord.position} - ${newUserRecord.role}) สถานะ รออนุมัติ`,
        ipAddress: getClientIp(req),
      });

      // Notify Admin
      const adminUser = existingUsers.find((u) => u.role === 'Admin');
      if (adminUser) {
        await createNotification(req.googleToken || null, {
          userId: adminUser.userId,
          title: 'มีผู้สมัครสมาชิกใหม่รออนุมัติ',
          message: `${fullName} (${newUserRecord.position}) ได้ลงทะเบียนสมัครสมาชิก กรุณาตรวจสอบและอนุมัติ`,
          type: 'info',
          referenceId: userId,
        });
      }

      res.status(201).json({
        message: 'สมัครสมาชิกเรียบร้อยแล้ว กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน',
      });
    } catch (err) {
      next(err);
    }
  });

  // Login (#7 & #8)
  app.post('/api/auth/login', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSpreadsheetInitialized(req.googleToken || null);
      const { username, password } = req.body || {};
      if (!username || !password) {
        res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' });
        return;
      }

      const { rows: users } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );

      const found = users.find(
        (u) => u.username.toLowerCase() === String(username).trim().toLowerCase()
      );

      if (!found || !verifyPassword(String(password), found.passwordHash)) {
        res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }

      // Check member status (#7)
      if (found.status === 'รออนุมัติ') {
        res.status(403).json({
          status: 'รออนุมัติ',
          error: 'บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติการใช้งาน',
        });
        return;
      }
      if (found.status === 'ไม่อนุมัติ') {
        res.status(403).json({
          status: 'ไม่อนุมัติ',
          error: 'บัญชีของคุณไม่ได้รับการอนุมัติการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
        });
        return;
      }
      if (found.status === 'ระงับการใช้งาน') {
        res.status(403).json({
          status: 'ระงับการใช้งาน',
          error: 'บัญชีของคุณถูกระงับการใช้งาน ไม่สามารถเข้าสู่ระบบได้',
        });
        return;
      }

      const now = new Date().toISOString();
      const updatedUser = {
        ...found,
        lastLogin: now,
      };
      await updateSheetRowById(req.googleToken || null, 'Users', found.userId, updatedUser);

      await writeAuditLog(req.googleToken || null, {
        userId: found.userId,
        username: found.username,
        action: 'เข้าสู่ระบบ (Login)',
        target: 'Users',
        targetId: found.userId,
        details: `${found.fullName} เข้าสู่ระบบสำเร็จ`,
        ipAddress: getClientIp(req),
      });

      const sessionToken = signSessionToken({
        userId: found.userId,
        username: found.username,
        fullName: found.fullName,
        role: found.role,
        forceChangePassword: Boolean(found.forceChangePassword),
      });

      res.json({
        token: sessionToken,
        user: sanitizeUser(updatedUser),
      });
    } catch (err) {
      next(err);
    }
  });

  // Change Password (including forced first-login password change for Adminkk #8)
  app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!newPassword || String(newPassword).length < 6) {
        res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
        return;
      }

      // Prevent reverting to initial default password (#8)
      const initialSecret = Buffer.from('a2sxMjM0NTY=', 'base64').toString('utf-8');
      if (String(newPassword) === initialSecret) {
        res.status(400).json({
          error: 'ไม่สามารถใช้รหัสผ่านเริ่มต้นของระบบได้ กรุณาตั้งรหัสผ่านใหม่ที่ปลอดภัย',
        });
        return;
      }

      const { rows: users } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );
      const userRecord = users.find((u) => u.userId === req.user!.userId);
      if (!userRecord) {
        res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });
        return;
      }

      if (currentPassword && !verifyPassword(String(currentPassword), userRecord.passwordHash)) {
        res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        return;
      }

      if (verifyPassword(String(newPassword), userRecord.passwordHash)) {
        res.status(400).json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' });
        return;
      }

      const updatedRecord = {
        ...userRecord,
        passwordHash: hashPassword(String(newPassword)),
        forceChangePassword: false,
      };

      await updateSheetRowById(req.googleToken || null, 'Users', userRecord.userId, updatedRecord);

      await writeAuditLog(req.googleToken || null, {
        userId: userRecord.userId,
        username: userRecord.username,
        action: 'เปลี่ยนรหัสผ่าน',
        target: 'Users',
        targetId: userRecord.userId,
        details: `เปลี่ยนรหัสผ่านสำเร็จ`,
        ipAddress: getClientIp(req),
      });

      const newToken = signSessionToken({
        userId: updatedRecord.userId,
        username: updatedRecord.username,
        fullName: updatedRecord.fullName,
        role: updatedRecord.role,
        forceChangePassword: false,
      });

      res.json({
        token: newToken,
        user: sanitizeUser(updatedRecord),
        message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
      });
    } catch (err) {
      next(err);
    }
  });

  // Forgot password request (#7)
  app.post('/api/auth/forgot-password', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { username, contact } = req.body || {};
      if (!username || !contact) {
        res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้งานและอีเมลหรือเบอร์โทรศัพท์ที่ลงทะเบียนไว้' });
        return;
      }

      const { rows: users } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );
      const found = users.find(
        (u) =>
          u.username.toLowerCase() === String(username).trim().toLowerCase() &&
          (u.email.toLowerCase() === String(contact).trim().toLowerCase() ||
            u.phone.replace(/[\s-]/g, '') === String(contact).replace(/[\s-]/g, ''))
      );

      if (!found) {
        res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งานที่ตรงกับชื่อผู้ใช้และอีเมล/เบอร์โทรศัพท์ที่ระบุ' });
        return;
      }

      const adminUser = users.find((u) => u.role === 'Admin');
      if (adminUser) {
        await createNotification(req.googleToken || null, {
          userId: adminUser.userId,
          title: 'คำขอรีเซ็ตรหัสผ่าน',
          message: `ผู้ใช้ ${found.fullName} (${found.username}) แจ้งลืมรหัสผ่าน กรุณาตรวจสอบและตั้งรหัสผ่านใหม่ที่เมนูจัดการสมาชิก`,
          type: 'warning',
          referenceId: found.userId,
        });
      }

      await writeAuditLog(req.googleToken || null, {
        userId: found.userId,
        username: found.username,
        action: 'แจ้งลืมรหัสผ่าน',
        target: 'Users',
        targetId: found.userId,
        details: `${found.fullName} ส่งคำขอให้ผู้ดูแลระบบรีเซ็ตรหัสผ่าน`,
        ipAddress: getClientIp(req),
      });

      res.json({
        message: 'ส่งคำขอรีเซ็ตรหัสผ่านไปยังผู้ดูแลระบบเรียบร้อยแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อรับรหัสผ่านชั่วคราว',
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    await writeAuditLog(req.googleToken || null, {
      userId: req.user!.userId,
      username: req.user!.username,
      action: 'ออกจากระบบ (Logout)',
      target: 'Users',
      targetId: req.user!.userId,
      details: `${req.user!.fullName} ออกจากระบบ`,
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  });

  // Bootstrap application data from Google Sheets
  app.get('/api/bootstrap', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await ensureSpreadsheetInitialized(req.googleToken || null);

      const [
        usersRes,
        leavesRes,
        leaveTypesRes,
        approvalsRes,
        inspectorsRes,
        docsRes,
        notificationsRes,
        auditRes,
        settings,
      ] = await Promise.all([
        readSheetRows<User & { passwordHash: string }>(req.googleToken || null, 'Users'),
        readSheetRows<LeaveRequest>(req.googleToken || null, 'LeaveRequests'),
        readSheetRows<LeaveType>(req.googleToken || null, 'LeaveTypes'),
        readSheetRows<LeaveApproval>(req.googleToken || null, 'LeaveApprovals'),
        readSheetRows<InspectorRecord>(req.googleToken || null, 'Inspectors'),
        readSheetRows<DocumentRecord>(req.googleToken || null, 'Documents'),
        readSheetRows<NotificationItem>(req.googleToken || null, 'Notifications'),
        readSheetRows<AuditLog>(req.googleToken || null, 'AuditLogs'),
        getSystemSettings(req.googleToken || null),
      ]);

      const currentUserRaw = usersRes.rows.find((u) => u.userId === req.user!.userId);
      if (!currentUserRaw || currentUserRaw.status !== 'อนุมัติแล้ว') {
        res.status(403).json({ error: 'บัญชีผู้ใช้งานไม่มีสิทธิ์เข้าถึงระบบในขณะนี้', code: 'UNAUTHORIZED' });
        return;
      }

      const currentUser = sanitizeUser(currentUserRaw);
      const isAdmin = currentUser.role === 'Admin';
      const isDirector = currentUser.role === 'ผู้อำนวยการสถานศึกษา';
      const isInspector = inspectorsRes.rows.some(
        (insp) =>
          insp.isActive &&
          (insp.fullName.trim() === currentUser.fullName.trim() ||
            insp.position.trim() === currentUser.position.trim())
      );

      const canReviewAllLeaves = isAdmin || isDirector || isInspector;

      const visibleLeaves = canReviewAllLeaves
        ? leavesRes.rows
        : leavesRes.rows.filter((l) => l.userId === currentUser.userId);

      const visibleDocs = canReviewAllLeaves
        ? docsRes.rows
        : docsRes.rows.filter((d) => d.userId === currentUser.userId);

      const visibleNotifications = notificationsRes.rows
        .filter((n) => n.userId === currentUser.userId || (isAdmin && n.userId === 'ADMIN'))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      res.json({
        user: currentUser,
        canReviewAllLeaves,
        settings,
        leaveTypes: leaveTypesRes.rows.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
        inspectors: inspectorsRes.rows,
        leaveRequests: visibleLeaves.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
        leaveApprovals: canReviewAllLeaves
          ? approvalsRes.rows
          : approvalsRes.rows.filter((ap) => visibleLeaves.some((l) => l.leaveId === ap.leaveId)),
        documents: visibleDocs,
        notifications: visibleNotifications,
        users: isAdmin ? usersRes.rows.map(sanitizeUser) : [currentUser],
        auditLogs: isAdmin
          ? auditRes.rows.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 300)
          : [],
      });
    } catch (err) {
      next(err);
    }
  });

  // Update Own Profile
  app.put('/api/profile', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { rows: users } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );
      const found = users.find((u) => u.userId === req.user!.userId);
      if (!found) {
        res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });
        return;
      }

      const { title, firstName, lastName, email, phone, position, department, profileImage } = req.body || {};
      if (!firstName?.trim() || !lastName?.trim()) {
        res.status(400).json({ error: 'ชื่อและนามสกุลห้ามว่าง' });
        return;
      }

      const cleanTitle = String(title ?? found.title).trim();
      const cleanFirst = String(firstName).trim();
      const cleanLast = String(lastName).trim();
      const fullName = `${cleanTitle}${cleanFirst} ${cleanLast}`;

      const updated = {
        ...found,
        title: cleanTitle,
        firstName: cleanFirst,
        lastName: cleanLast,
        fullName,
        email: String(email ?? found.email).trim(),
        phone: String(phone ?? found.phone).trim(),
        position: String(position ?? found.position).trim(),
        department: String(department ?? found.department).trim(),
        profileImage: String(profileImage ?? found.profileImage),
      };

      await updateSheetRowById(req.googleToken || null, 'Users', found.userId, updated);

      await writeAuditLog(req.googleToken || null, {
        userId: found.userId,
        username: found.username,
        action: 'แก้ไขข้อมูลส่วนตัว',
        target: 'Users',
        targetId: found.userId,
        details: `อัปเดตข้อมูลโปรไฟล์ของ ${fullName}`,
        ipAddress: getClientIp(req),
      });

      res.json({ user: sanitizeUser(updated) });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Create User (#9)
  app.post('/api/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        firstName,
        lastName,
        username,
        password,
        email,
        phone,
        position,
        department,
        role,
        status,
      } = req.body || {};

      if (!firstName?.trim() || !lastName?.trim() || !username?.trim() || !password) {
        res.status(400).json({ error: 'กรุณากรอกข้อมูลชื่อ นามสกุล ชื่อผู้ใช้ และรหัสผ่านให้ครบ' });
        return;
      }

      const { rows: users } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );
      if (users.some((u) => u.username.toLowerCase() === String(username).trim().toLowerCase())) {
        res.status(409).json({ error: 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' });
        return;
      }

      const now = new Date().toISOString();
      const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const cleanTitle = String(title || 'นาย').trim();
      const cleanFirst = String(firstName).trim();
      const cleanLast = String(lastName).trim();
      const fullName = `${cleanTitle}${cleanFirst} ${cleanLast}`;

      const newUser = {
        userId,
        username: String(username).trim(),
        passwordHash: hashPassword(String(password)),
        title: cleanTitle,
        firstName: cleanFirst,
        lastName: cleanLast,
        fullName,
        email: String(email || '').trim(),
        phone: String(phone || '').trim(),
        position: String(position || '').trim(),
        department: String(department || 'สกร.ระดับอำเภอน้ำพอง จ.ขอนแก่น').trim(),
        role: String(role || 'ลูกจ้าง').trim(),
        status: (status as any) || 'อนุมัติแล้ว',
        profileImage: '',
        createdAt: now,
        approvedAt: status === 'อนุมัติแล้ว' || !status ? now : '',
        approvedBy: req.user!.username,
        lastLogin: '',
        forceChangePassword: false,
      };

      await appendSheetRow(req.googleToken || null, 'Users', newUser);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'เพิ่มสมาชิก',
        target: 'Users',
        targetId: userId,
        details: `Admin เพิ่มสมาชิก ${fullName} (${newUser.role})`,
        ipAddress: getClientIp(req),
      });

      res.status(201).json({ user: sanitizeUser(newUser as any) });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Update / Approve / Suspend User (#9)
  app.put('/api/users/:userId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { rows: users } = await readSheetRows<User & { passwordHash: string }>(
        req.googleToken || null,
        'Users'
      );
      const found = users.find((u) => u.userId === userId);
      if (!found) {
        res.status(404).json({ error: 'ไม่พบผู้ใช้งานในระบบ' });
        return;
      }

      const {
        title,
        firstName,
        lastName,
        email,
        phone,
        position,
        department,
        role,
        status,
        newPassword,
      } = req.body || {};

      const cleanTitle = String(title ?? found.title).trim();
      const cleanFirst = String(firstName ?? found.firstName).trim();
      const cleanLast = String(lastName ?? found.lastName).trim();
      const fullName = `${cleanTitle}${cleanFirst} ${cleanLast}`;
      const now = new Date().toISOString();

      const statusChangedToApproved = found.status !== 'อนุมัติแล้ว' && status === 'อนุมัติแล้ว';

      const updated: User & { passwordHash: string } = {
        ...found,
        title: cleanTitle,
        firstName: cleanFirst,
        lastName: cleanLast,
        fullName,
        email: String(email ?? found.email).trim(),
        phone: String(phone ?? found.phone).trim(),
        position: String(position ?? found.position).trim(),
        department: String(department ?? found.department).trim(),
        role: String(role ?? found.role).trim(),
        status: (status ?? found.status) as any,
        approvedAt: statusChangedToApproved ? now : found.approvedAt,
        approvedBy: statusChangedToApproved ? req.user!.username : found.approvedBy,
        passwordHash:
          newPassword && String(newPassword).trim().length >= 6
            ? hashPassword(String(newPassword).trim())
            : found.passwordHash,
      };

      await updateSheetRowById(req.googleToken || null, 'Users', userId, updated);

      let actionLabel = 'แก้ไขสมาชิก';
      if (found.status !== updated.status) {
        if (updated.status === 'อนุมัติแล้ว') actionLabel = 'อนุมัติสมาชิก';
        else if (updated.status === 'ไม่อนุมัติ') actionLabel = 'ไม่อนุมัติสมาชิก';
        else if (updated.status === 'ระงับการใช้งาน') actionLabel = 'ระงับสมาชิก';
      }

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: actionLabel,
        target: 'Users',
        targetId: userId,
        details: `${actionLabel}: ${fullName} (สถานะ: ${updated.status}, บทบาท: ${updated.role})`,
        ipAddress: getClientIp(req),
      });

      if (found.status !== updated.status) {
        await createNotification(req.googleToken || null, {
          userId: updated.userId,
          title: `สถานะบัญชีของคุณเปลี่ยนเป็น "${updated.status}"`,
          message: `ผู้ดูแลระบบได้ปรับปรุงสถานะบัญชีของคุณเป็น ${updated.status}`,
          type: updated.status === 'อนุมัติแล้ว' ? 'success' : 'warning',
          referenceId: userId,
        });
      }

      res.json({ user: sanitizeUser(updated) });
    } catch (err) {
      next(err);
    }
  });

  // Admin: Delete User (#9)
  app.delete('/api/users/:userId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      if (userId === req.user!.userId) {
        res.status(400).json({ error: 'ไม่สามารถลบบัญชีผู้ดูแลระบบที่กำลังใช้งานอยู่ได้' });
        return;
      }

      const { rows: users } = await readSheetRows<User>(req.googleToken || null, 'Users');
      const target = users.find((u) => u.userId === userId);
      if (!target) {
        res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
        return;
      }

      await deleteSheetRowById(req.googleToken || null, 'Users', userId);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'ลบสมาชิก',
        target: 'Users',
        targetId: userId,
        details: `ลบสมาชิก ${target.fullName} (${target.username})`,
        ipAddress: getClientIp(req),
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Get Next Automatic Leave Number from Google Sheets (#15)
  app.get('/api/leaves/next-number', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const [leavesRes, settings] = await Promise.all([
        readSheetRows<LeaveRequest>(req.googleToken || null, 'LeaveRequests'),
        getSystemSettings(req.googleToken || null),
      ]);

      const prefix = settings.leaveNumberPrefix || 'LV';
      const fiscalYear = settings.fiscalYear || '2569';
      const pattern = `${prefix}-${fiscalYear}-`;
      let maxSeq = 0;
      leavesRes.rows.forEach((l) => {
        if (l.leaveNumber && l.leaveNumber.startsWith(pattern)) {
          const numPart = parseInt(l.leaveNumber.replace(pattern, ''), 10);
          if (!isNaN(numPart) && numPart > maxSeq) maxSeq = numPart;
        }
      });
      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      const leaveNumber = `${pattern}${nextSeq}`;

      res.json({
        leaveNumber,
        prefix,
        fiscalYear,
        sequence: maxSeq + 1,
        totalExistingLeaves: leavesRes.rows.length,
      });
    } catch (err) {
      next(err);
    }
  });

  // Create Leave Request (#12, #15, #16, #28)
  app.post('/api/leaves', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const [usersRes, leavesRes, leaveTypesRes, inspectorsRes, settings] = await Promise.all([
        readSheetRows<User>(req.googleToken || null, 'Users'),
        readSheetRows<LeaveRequest>(req.googleToken || null, 'LeaveRequests'),
        readSheetRows<LeaveType>(req.googleToken || null, 'LeaveTypes'),
        readSheetRows<InspectorRecord>(req.googleToken || null, 'Inspectors'),
        getSystemSettings(req.googleToken || null),
      ]);

      const currentUser = usersRes.rows.find((u) => u.userId === req.user!.userId);
      if (!currentUser) {
        res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });
        return;
      }

      const {
        writtenDate,
        subject,
        addressedTo,
        leaveTypeId,
        startDate,
        endDate,
        durationType,
        totalDays,
        reason,
        contactAddress,
        contactPhone,
        substituteWork,
        substitutePerson,
        note,
        submitNow,
      } = req.body || {};

      if (!leaveTypeId) {
        res.status(400).json({ error: 'กรุณาเลือกประเภทการลา' });
        return;
      }
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'กรุณาระบุตั้งแต่วันที่และถึงวันที่ให้ครบถ้วน' });
        return;
      }
      if (String(endDate) < String(startDate)) {
        res.status(400).json({ error: 'วันที่สิ้นสุดการลาต้องไม่น้อยกว่าวันที่เริ่มลา' });
        return;
      }
      const numericDays = Number(totalDays);
      if (isNaN(numericDays) || numericDays <= 0) {
        res.status(400).json({ error: 'จำนวนวันลาต้องมากกว่า 0 วัน' });
        return;
      }
      if (!reason || !String(reason).trim()) {
        res.status(400).json({ error: 'กรุณากรอกเหตุผลการลา' });
        return;
      }

      const leaveType = leaveTypesRes.rows.find((lt) => lt.typeId === leaveTypeId);
      const leaveTypeName = leaveType?.name || String(req.body?.leaveTypeName || 'ลาอื่น ๆ');

      // Generate unique sequential leaveNumber e.g. LV-2569-0001 (#15)
      const prefix = settings.leaveNumberPrefix || 'LV';
      const fiscalYear = settings.fiscalYear || '2569';
      const pattern = `${prefix}-${fiscalYear}-`;
      let maxSeq = 0;
      leavesRes.rows.forEach((l) => {
        if (l.leaveNumber && l.leaveNumber.startsWith(pattern)) {
          const numPart = parseInt(l.leaveNumber.replace(pattern, ''), 10);
          if (!isNaN(numPart) && numPart > maxSeq) maxSeq = numPart;
        }
      });
      const nextSeq = String(maxSeq + 1).padStart(4, '0');
      const leaveNumber = `${pattern}${nextSeq}`;

      // Calculate user's previous leave statistics of same category in this fiscal year
      const userApprovedLeaves = leavesRes.rows
        .filter((l) => l.userId === currentUser.userId && l.status === 'อนุมัติแล้ว')
        .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

      const lastSameTypeLeave = userApprovedLeaves.find((l) => l.leaveTypeId === leaveTypeId);
      const accumulatedLeaveDays = userApprovedLeaves
        .filter((l) => l.leaveTypeId === leaveTypeId)
        .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0);

      const defaultInspector =
        inspectorsRes.rows.find((i) => i.isDefault && i.isActive) ||
        inspectorsRes.rows.find((i) => i.isActive);

      const now = new Date().toISOString();
      const leaveId = `LVR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const initialStatus: LeaveStatus = submitNow === false ? 'ร่าง' : 'รอตรวจสอบ';
      const reqSig = req.body?.requesterSignatureUrl ? String(req.body.requesterSignatureUrl) : '';

      const newLeave: LeaveRequest = {
        leaveId,
        leaveNumber,
        userId: currentUser.userId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        position: String(req.body?.position || currentUser.position).trim(),
        department: String(req.body?.department || currentUser.department || settings.organizationName).trim(),
        role: currentUser.role,
        writtenDate: String(writtenDate || now.split('T')[0]),
        subject: String(subject || `ขออนุญาต${leaveTypeName}`).trim(),
        addressedTo: String(addressedTo || settings.addressedToDefault).trim(),
        leaveTypeId,
        leaveTypeName,
        startDate: String(startDate),
        endDate: String(endDate),
        durationType: (durationType as any) || 'เต็มวัน',
        halfDayPeriod: reqSig || String(durationType || 'เต็มวัน'),
        requesterSignatureUrl: reqSig,
        totalDays: numericDays,
        reason: String(reason).trim(),
        contactAddress: String(contactAddress || settings.address).trim(),
        contactPhone: String(contactPhone || currentUser.phone).trim(),
        substituteWork: String(substituteWork || '-').trim(),
        substitutePerson: String(substitutePerson || '-').trim(),
        note: String(note || '').trim(),
        status: initialStatus,
        lastLeaveType: lastSameTypeLeave?.leaveTypeName || '-',
        lastLeaveStartDate: lastSameTypeLeave?.startDate || '',
        lastLeaveEndDate: lastSameTypeLeave?.endDate || '',
        lastLeaveTotalDays: lastSameTypeLeave?.totalDays || 0,
        accumulatedLeaveDays,
        inspectorName: defaultInspector?.fullName || settings.defaultInspectorName,
        inspectorPosition: defaultInspector?.position || settings.defaultInspectorPosition,
        inspectorComment: '',
        inspectorSignatureUrl: '',
        inspectedAt: '',
        approverName: settings.directorName,
        approverPosition: settings.directorPosition,
        approverComment: '',
        approverSignatureUrl: '',
        approvedAt: '',
        returnReason: '',
        rejectReason: '',
        pdfFileId: '',
        pdfFileUrl: '',
        pdfWebViewLink: '',
        createdAt: now,
        updatedAt: now,
      };

      await appendSheetRow(req.googleToken || null, 'LeaveRequests', newLeave);

      await writeAuditLog(req.googleToken || null, {
        userId: currentUser.userId,
        username: currentUser.username,
        action: submitNow === false ? 'สร้างร่างใบลา' : 'สร้างและส่งใบลา',
        target: 'LeaveRequests',
        targetId: leaveNumber,
        details: `${currentUser.fullName} ยื่นใบลาเลขที่ ${leaveNumber} (${leaveTypeName} ${numericDays} วัน)`,
        ipAddress: getClientIp(req),
      });

      if (initialStatus !== 'ร่าง') {
        await createNotification(req.googleToken || null, {
          userId: 'ADMIN',
          title: `ใบลาใหม่รอตรวจสอบ (${leaveNumber})`,
          message: `${currentUser.fullName} ยื่น${leaveTypeName} จำนวน ${numericDays} วัน`,
          type: 'info',
          referenceId: leaveId,
        });
      }

      res.status(201).json({ leave: newLeave });
    } catch (err) {
      next(err);
    }
  });

  // Update Leave Request (Only Draft / Returned for owner, or Admin #28)
  app.put('/api/leaves/:leaveId', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { leaveId } = req.params;
      const { rows: leaves } = await readSheetRows<LeaveRequest>(req.googleToken || null, 'LeaveRequests');
      const existing = leaves.find((l) => l.leaveId === leaveId);
      if (!existing) {
        res.status(404).json({ error: 'ไม่พบข้อมูลใบลา' });
        return;
      }

      const isAdmin = req.user!.role === 'Admin';
      if (!isAdmin && existing.userId !== req.user!.userId) {
        res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขใบลาของผู้อื่น' });
        return;
      }

      if (!isAdmin && existing.status !== 'ร่าง' && existing.status !== 'ส่งกลับแก้ไข') {
        res.status(400).json({
          error: 'ใบลาที่ส่งแล้วไม่สามารถแก้ไขได้ เว้นแต่ผู้ตรวจสอบจะส่งกลับให้แก้ไข',
        });
        return;
      }

      const {
        writtenDate,
        subject,
        addressedTo,
        leaveTypeId,
        leaveTypeName,
        startDate,
        endDate,
        durationType,
        totalDays,
        reason,
        contactAddress,
        contactPhone,
        substituteWork,
        substitutePerson,
        note,
        submitNow,
      } = req.body || {};

      if (startDate && endDate && String(endDate) < String(startDate)) {
        res.status(400).json({ error: 'วันที่สิ้นสุดการลาต้องไม่น้อยกว่าวันที่เริ่มลา' });
        return;
      }

      const now = new Date().toISOString();
      const nextStatus: LeaveStatus =
        submitNow === true
          ? 'รอตรวจสอบ'
          : (req.body?.status as LeaveStatus) || existing.status;

      const updated: LeaveRequest = {
        ...existing,
        writtenDate: String(writtenDate ?? existing.writtenDate),
        subject: String(subject ?? existing.subject).trim(),
        addressedTo: String(addressedTo ?? existing.addressedTo).trim(),
        leaveTypeId: String(leaveTypeId ?? existing.leaveTypeId),
        leaveTypeName: String(leaveTypeName ?? existing.leaveTypeName),
        startDate: String(startDate ?? existing.startDate),
        endDate: String(endDate ?? existing.endDate),
        durationType: (durationType ?? existing.durationType) as any,
        halfDayPeriod: String(durationType ?? existing.halfDayPeriod),
        totalDays: totalDays !== undefined ? Number(totalDays) : existing.totalDays,
        reason: String(reason ?? existing.reason).trim(),
        contactAddress: String(contactAddress ?? existing.contactAddress).trim(),
        contactPhone: String(contactPhone ?? existing.contactPhone).trim(),
        substituteWork: String(substituteWork ?? existing.substituteWork).trim(),
        substitutePerson: String(substitutePerson ?? existing.substitutePerson).trim(),
        note: String(note ?? existing.note).trim(),
        status: nextStatus,
        returnReason: submitNow === true ? '' : existing.returnReason,
        updatedAt: now,
      };

      await updateSheetRowById(req.googleToken || null, 'LeaveRequests', leaveId, updated);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: submitNow === true ? 'ส่งใบลาที่แก้ไขแล้ว' : 'แก้ไขใบลา',
        target: 'LeaveRequests',
        targetId: updated.leaveNumber,
        details: `แก้ไขใบลาเลขที่ ${updated.leaveNumber} (สถานะ: ${updated.status})`,
        ipAddress: getClientIp(req),
      });

      res.json({ leave: updated });
    } catch (err) {
      next(err);
    }
  });

  // Cancel Leave Request (#9, #16)
  app.post('/api/leaves/:leaveId/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { leaveId } = req.params;
      const { rows: leaves } = await readSheetRows<LeaveRequest>(req.googleToken || null, 'LeaveRequests');
      const existing = leaves.find((l) => l.leaveId === leaveId);
      if (!existing) {
        res.status(404).json({ error: 'ไม่พบข้อมูลใบลา' });
        return;
      }

      const isAdmin = req.user!.role === 'Admin';
      if (!isAdmin && existing.userId !== req.user!.userId) {
        res.status(403).json({ error: 'คุณไม่มีสิทธิ์ยกเลิกใบลาของผู้อื่น' });
        return;
      }

      const now = new Date().toISOString();
      const updated: LeaveRequest = {
        ...existing,
        status: 'ยกเลิก',
        updatedAt: now,
      };

      await updateSheetRowById(req.googleToken || null, 'LeaveRequests', leaveId, updated);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'ยกเลิกใบลา',
        target: 'LeaveRequests',
        targetId: existing.leaveNumber,
        details: `ยกเลิกใบลาเลขที่ ${existing.leaveNumber}`,
        ipAddress: getClientIp(req),
      });

      res.json({ leave: updated });
    } catch (err) {
      next(err);
    }
  });

  // Leave Inspection & Approval Workflow (#16, #17, #18, #19)
  app.post('/api/leaves/:leaveId/workflow', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { leaveId } = req.params;
      const {
        actionType, // 'ตรวจสอบ' | 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข'
        comment,
        actorName,
        actorPosition,
        signatureDataUrl,
      } = req.body || {};

      if (!['ตรวจสอบ', 'อนุมัติ', 'ไม่อนุมัติ', 'ส่งกลับแก้ไข'].includes(actionType)) {
        res.status(400).json({ error: 'ประเภทการดำเนินการไม่ถูกต้อง' });
        return;
      }

      if (actionType === 'ไม่อนุมัติ' && (!comment || !String(comment).trim())) {
        res.status(400).json({ error: 'กรุณาระบุเหตุผลกรณีไม่อนุมัติใบลา' });
        return;
      }
      if (actionType === 'ส่งกลับแก้ไข' && (!comment || !String(comment).trim())) {
        res.status(400).json({ error: 'กรุณาระบุข้อความแจ้งผู้ยื่นใบลาเพื่อแก้ไข' });
        return;
      }

      const [leavesRes, settings] = await Promise.all([
        readSheetRows<LeaveRequest>(req.googleToken || null, 'LeaveRequests'),
        getSystemSettings(req.googleToken || null),
      ]);

      const existing = leavesRes.rows.find((l) => l.leaveId === leaveId);
      if (!existing) {
        res.status(404).json({ error: 'ไม่พบข้อมูลใบลา' });
        return;
      }

      const now = new Date().toISOString();
      let signatureDriveFileId = '';

      // Upload signature image to Google Drive if drawn/uploaded (#18)
      if (signatureDataUrl && String(signatureDataUrl).startsWith('data:image/') && req.googleToken) {
        try {
          const { rootFolderId } = await ensureLeaveDriveFolder(
            req.googleToken,
            settings.driveStorageRootFolderName,
            settings.fiscalYear,
            existing.leaveTypeName
          );
          const sigUpload = await uploadFileToGoogleDrive(req.googleToken, {
            fileName: `Signature_${existing.leaveNumber}_${actionType}_${Date.now()}.png`,
            mimeType: 'image/png',
            base64Data: String(signatureDataUrl),
            folderId: rootFolderId,
            description: `ลายเซ็น ${actionType} สำหรับใบลา ${existing.leaveNumber}`,
          });
          signatureDriveFileId = sigUpload.id;
        } catch {
          // Keep data URL embedded even if Drive signature upload is skipped
        }
      }

      let newStatus: LeaveStatus = existing.status;
      const updated: LeaveRequest = { ...existing, updatedAt: now };

      if (actionType === 'ตรวจสอบ') {
        newStatus = 'รออนุมัติ';
        updated.status = newStatus;
        updated.inspectorName = String(actorName || req.user!.fullName || settings.defaultInspectorName).trim();
        updated.inspectorPosition = String(actorPosition || settings.defaultInspectorPosition).trim();
        updated.inspectorComment = String(comment || 'ตรวจสอบสถิติการลาแล้ว เห็นควรอนุญาต').trim();
        if (signatureDataUrl) updated.inspectorSignatureUrl = String(signatureDataUrl);
        updated.inspectedAt = now;
      } else if (actionType === 'อนุมัติ') {
        newStatus = 'อนุมัติแล้ว';
        updated.status = newStatus;
        if (!updated.inspectedAt) {
          updated.inspectorName = updated.inspectorName || settings.defaultInspectorName;
          updated.inspectorPosition = updated.inspectorPosition || settings.defaultInspectorPosition;
          updated.inspectorComment = updated.inspectorComment || 'ตรวจสอบสถิติการลาแล้ว';
          updated.inspectedAt = now;
        }
        updated.approverName = String(actorName || settings.directorName || req.user!.fullName).trim();
        updated.approverPosition = String(actorPosition || settings.directorPosition).trim();
        updated.approverComment = String(comment || 'อนุญาต').trim();
        if (signatureDataUrl) updated.approverSignatureUrl = String(signatureDataUrl);
        updated.approvedAt = now;
      } else if (actionType === 'ไม่อนุมัติ') {
        newStatus = 'ไม่อนุมัติ';
        updated.status = newStatus;
        updated.approverName = String(actorName || req.user!.fullName).trim();
        updated.approverPosition = String(actorPosition || settings.directorPosition).trim();
        updated.approverComment = String(comment).trim();
        updated.rejectReason = String(comment).trim();
        if (signatureDataUrl) updated.approverSignatureUrl = String(signatureDataUrl);
        updated.approvedAt = now;
      } else if (actionType === 'ส่งกลับแก้ไข') {
        newStatus = 'ส่งกลับแก้ไข';
        updated.status = newStatus;
        updated.returnReason = String(comment).trim();
      }

      await updateSheetRowById(req.googleToken || null, 'LeaveRequests', leaveId, updated);

      const approvalRecord: LeaveApproval = {
        approvalId: `APV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        leaveId: existing.leaveId,
        leaveNumber: existing.leaveNumber,
        actionByUserId: req.user!.userId,
        actionByName: String(actorName || req.user!.fullName).trim(),
        actionByPosition: String(actorPosition || '').trim(),
        actionType: actionType as any,
        previousStatus: existing.status,
        newStatus,
        comment: String(comment || '').trim(),
        signatureDataUrl: signatureDataUrl ? String(signatureDataUrl) : '',
        signatureDriveFileId,
        timestamp: now,
      };

      await appendSheetRow(req.googleToken || null, 'LeaveApprovals', approvalRecord);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: `${actionType}ใบลา`,
        target: 'LeaveRequests',
        targetId: existing.leaveNumber,
        details: `${actionType}ใบลาเลขที่ ${existing.leaveNumber} ของ ${existing.fullName} -> สถานะ: ${newStatus}`,
        ipAddress: getClientIp(req),
      });

      await createNotification(req.googleToken || null, {
        userId: existing.userId,
        title: `อัปเดตสถานะใบลา ${existing.leaveNumber}: ${newStatus}`,
        message:
          actionType === 'ส่งกลับแก้ไข'
            ? `ใบลาของคุณถูกส่งกลับให้แก้ไข: ${comment}`
            : actionType === 'ไม่อนุมัติ'
            ? `ใบลาของคุณไม่ได้รับการอนุมัติ เหตุผล: ${comment}`
            : `ใบลาเลขที่ ${existing.leaveNumber} อยู่ในสถานะ "${newStatus}" เรียบร้อยแล้ว`,
        type:
          newStatus === 'อนุมัติแล้ว'
            ? 'success'
            : newStatus === 'ไม่อนุมัติ'
            ? 'error'
            : newStatus === 'ส่งกลับแก้ไข'
            ? 'warning'
            : 'info',
        referenceId: existing.leaveId,
      });

      res.json({ leave: updated, approval: approvalRecord });
    } catch (err) {
      next(err);
    }
  });

  // Upload Generated Official Leave PDF to Google Drive & Link File ID + URL to LeaveRequests + Documents (#15, #25)
  app.post('/api/drive/upload-leave-pdf', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { leaveId, pdfBase64, fileName } = req.body || {};
      if (!leaveId || !pdfBase64) {
        res.status(400).json({ error: 'ข้อมูลไฟล์ PDF ไม่ครบถ้วน' });
        return;
      }

      if (!req.googleToken) {
        throw new GoogleWorkspaceError('กรุณาเชื่อมต่อ Google Workspace เพื่อบันทึกไฟล์ PDF ลงใน Google Drive');
      }

      const [leavesRes, docsRes, settings] = await Promise.all([
        readSheetRows<LeaveRequest>(req.googleToken, 'LeaveRequests'),
        readSheetRows<DocumentRecord>(req.googleToken, 'Documents'),
        getSystemSettings(req.googleToken),
      ]);

      const leave = leavesRes.rows.find((l) => l.leaveId === leaveId);
      if (!leave) {
        res.status(404).json({ error: 'ไม่พบใบลาที่ต้องการแนบไฟล์ PDF' });
        return;
      }

      const folderInfo = await ensureLeaveDriveFolder(
        req.googleToken,
        settings.driveStorageRootFolderName || 'ระบบใบลาออนไลน์',
        settings.fiscalYear || '2569',
        leave.leaveTypeName,
        settings.driveStorageRootFolderId
      );

      const safeFileName =
        fileName || `${leave.leaveNumber}_${leave.fullName.replace(/\s+/g, '_')}.pdf`;

      const uploaded = await uploadFileToGoogleDrive(req.googleToken, {
        fileName: safeFileName,
        mimeType: 'application/pdf',
        base64Data: String(pdfBase64),
        folderId: folderInfo.targetFolderId,
        description: `ใบลาราชการ ${leave.leaveNumber} - ${leave.fullName} (${leave.leaveTypeName})`,
      });

      const now = new Date().toISOString();
      const updatedLeave: LeaveRequest = {
        ...leave,
        pdfFileId: uploaded.id,
        pdfFileUrl: uploaded.webViewLink,
        pdfWebViewLink: uploaded.webViewLink,
        updatedAt: now,
      };

      await updateSheetRowById(req.googleToken, 'LeaveRequests', leave.leaveId, updatedLeave);

      const existingDoc = docsRes.rows.find((d) => d.leaveId === leave.leaveId);
      const docRecord: DocumentRecord = {
        docId:
          existingDoc?.docId ||
          `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        leaveId: leave.leaveId,
        leaveNumber: leave.leaveNumber,
        userId: leave.userId,
        fileName: safeFileName,
        mimeType: 'application/pdf',
        driveFileId: uploaded.id,
        driveFolderId: folderInfo.targetFolderId,
        webViewLink: uploaded.webViewLink,
        webContentLink: uploaded.webContentLink,
        fiscalYear: settings.fiscalYear || '2569',
        leaveTypeName: leave.leaveTypeName,
        createdAt: now,
      };

      if (existingDoc) {
        await updateSheetRowById(req.googleToken, 'Documents', existingDoc.docId, docRecord);
      } else {
        await appendSheetRow(req.googleToken, 'Documents', docRecord);
      }

      await writeAuditLog(req.googleToken, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'บันทึก PDF ลง Google Drive & Google Sheets',
        target: 'Documents',
        targetId: leave.leaveNumber,
        details: `อัปโหลดไฟล์ ${safeFileName} (File ID: ${uploaded.id}) ลงโฟลเดอร์ "${folderInfo.targetFolderName}" (${folderInfo.targetFolderId}) และบันทึก URL ลง Google Sheets`,
        ipAddress: getClientIp(req),
      });

      res.json({
        leave: updatedLeave,
        document: docRecord,
        folder: folderInfo,
      });
    } catch (err) {
      next(err);
    }
  });

  // Leave Types Management (#11)
  app.post('/api/leave-types', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        code,
        description,
        maxDaysPerYear,
        requiresAttachment,
        conditionText,
        formTemplateType,
        isActive,
        sortOrder,
      } = req.body || {};

      if (!name?.trim()) {
        res.status(400).json({ error: 'กรุณาระบุชื่อประเภทการลา' });
        return;
      }

      const now = new Date().toISOString();
      const typeId = `LT-${Date.now().toString().slice(-5)}`;
      const newType: LeaveType = {
        typeId,
        name: String(name).trim(),
        code: String(code || 'CUSTOM').trim().toUpperCase(),
        description: String(description || '').trim(),
        maxDaysPerYear: Number(maxDaysPerYear) || 30,
        requiresAttachment: Boolean(requiresAttachment),
        conditionText: String(conditionText || '').trim(),
        formTemplateType: formTemplateType || 'sick_personal_maternity',
        isActive: isActive !== false,
        sortOrder: Number(sortOrder) || 10,
        createdAt: now,
        updatedAt: now,
      };

      await appendSheetRow(req.googleToken || null, 'LeaveTypes', newType);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'เพิ่มประเภทการลา',
        target: 'LeaveTypes',
        targetId: typeId,
        details: `เพิ่มประเภทการลา "${newType.name}"`,
        ipAddress: getClientIp(req),
      });

      res.status(201).json({ leaveType: newType });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/leave-types/:typeId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { typeId } = req.params;
      const { rows } = await readSheetRows<LeaveType>(req.googleToken || null, 'LeaveTypes');
      const existing = rows.find((r) => r.typeId === typeId);
      if (!existing) {
        res.status(404).json({ error: 'ไม่พบประเภทการลา' });
        return;
      }

      const updated: LeaveType = {
        ...existing,
        name: String(req.body?.name ?? existing.name).trim(),
        code: String(req.body?.code ?? existing.code).trim(),
        description: String(req.body?.description ?? existing.description).trim(),
        maxDaysPerYear:
          req.body?.maxDaysPerYear !== undefined
            ? Number(req.body.maxDaysPerYear)
            : existing.maxDaysPerYear,
        requiresAttachment:
          req.body?.requiresAttachment !== undefined
            ? Boolean(req.body.requiresAttachment)
            : existing.requiresAttachment,
        conditionText: String(req.body?.conditionText ?? existing.conditionText).trim(),
        formTemplateType: req.body?.formTemplateType ?? existing.formTemplateType,
        isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
        sortOrder:
          req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) : existing.sortOrder,
        updatedAt: new Date().toISOString(),
      };

      await updateSheetRowById(req.googleToken || null, 'LeaveTypes', typeId, updated);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'แก้ไขประเภทการลา',
        target: 'LeaveTypes',
        targetId: typeId,
        details: `แก้ไขประเภทการลา "${updated.name}"`,
        ipAddress: getClientIp(req),
      });

      res.json({ leaveType: updated });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/leave-types/:typeId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { typeId } = req.params;
      await deleteSheetRowById(req.googleToken || null, 'LeaveTypes', typeId);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'ลบประเภทการลา',
        target: 'LeaveTypes',
        targetId: typeId,
        details: `ลบประเภทการลารหัส ${typeId}`,
        ipAddress: getClientIp(req),
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Inspectors Management (#17, #18)
  app.post('/api/inspectors', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { fullName, position, department, roleType, signatureDataUrl, isDefault, isActive } = req.body || {};
      if (!fullName?.trim() || !position?.trim()) {
        res.status(400).json({ error: 'กรุณาระบุชื่อและตำแหน่งของผู้ตรวจสอบ' });
        return;
      }

      const now = new Date().toISOString();
      const inspectorId = `INSP-${Date.now().toString().slice(-5)}`;
      const record: InspectorRecord = {
        inspectorId,
        fullName: String(fullName).trim(),
        position: String(position).trim(),
        department: String(department || 'สกร.ระดับอำเภอน้ำพอง จ.ขอนแก่น').trim(),
        roleType: roleType || 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล',
        signatureDataUrl: String(signatureDataUrl || ''),
        signatureDriveFileId: '',
        isDefault: Boolean(isDefault),
        isActive: isActive !== false,
        updatedAt: now,
      };

      await appendSheetRow(req.googleToken || null, 'Inspectors', record);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'เพิ่มผู้ตรวจสอบใบลา',
        target: 'Inspectors',
        targetId: inspectorId,
        details: `เพิ่มผู้ตรวจสอบ: ${record.fullName} (${record.position})`,
        ipAddress: getClientIp(req),
      });

      res.status(201).json({ inspector: record });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/inspectors/:inspectorId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { inspectorId } = req.params;
      const { rows } = await readSheetRows<InspectorRecord>(req.googleToken || null, 'Inspectors');
      const existing = rows.find((r) => r.inspectorId === inspectorId);
      if (!existing) {
        res.status(404).json({ error: 'ไม่พบข้อมูลผู้ตรวจสอบ' });
        return;
      }

      const updated: InspectorRecord = {
        ...existing,
        fullName: String(req.body?.fullName ?? existing.fullName).trim(),
        position: String(req.body?.position ?? existing.position).trim(),
        department: String(req.body?.department ?? existing.department).trim(),
        roleType: req.body?.roleType ?? existing.roleType,
        signatureDataUrl: String(req.body?.signatureDataUrl ?? existing.signatureDataUrl),
        isDefault: req.body?.isDefault !== undefined ? Boolean(req.body.isDefault) : existing.isDefault,
        isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
        updatedAt: new Date().toISOString(),
      };

      await updateSheetRowById(req.googleToken || null, 'Inspectors', inspectorId, updated);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'แก้ไขผู้ตรวจสอบใบลา',
        target: 'Inspectors',
        targetId: inspectorId,
        details: `แก้ไขผู้ตรวจสอบ: ${updated.fullName} (${updated.position})`,
        ipAddress: getClientIp(req),
      });

      res.json({ inspector: updated });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/inspectors/:inspectorId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { inspectorId } = req.params;
      await deleteSheetRowById(req.googleToken || null, 'Inspectors', inspectorId);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'ลบผู้ตรวจสอบใบลา',
        target: 'Inspectors',
        targetId: inspectorId,
        details: `ลบผู้ตรวจสอบรหัส ${inspectorId}`,
        ipAddress: getClientIp(req),
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Update System Settings (#24)
  app.put('/api/settings', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const updated = await saveSystemSettings(req.googleToken || null, req.body || {}, req.user!.username);

      await writeAuditLog(req.googleToken || null, {
        userId: req.user!.userId,
        username: req.user!.username,
        action: 'เปลี่ยนการตั้งค่าระบบ',
        target: 'Settings',
        targetId: 'SYSTEM_SETTINGS',
        details: `อัปเดตการตั้งค่าหน่วยงาน: ${updated.organizationName}`,
        ipAddress: getClientIp(req),
      });

      res.json({ settings: updated });
    } catch (err) {
      next(err);
    }
  });

  // Global Error Handler for Google Workspace & API Errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof GoogleWorkspaceError) {
      res.status(err.status).json({
        error: err.message,
        code: err.code,
      });
      return;
    }
    console.error('API Error:', err);
    res.status(500).json({
      error: err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง',
      code: 'INTERNAL_ERROR',
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
