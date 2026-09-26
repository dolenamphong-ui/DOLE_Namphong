import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shield,
  Home,
  FileText,
  History,
  User as UserIcon,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Bell,
  FilePlus2,
  CheckCheck,
  KeyRound,
  X,
} from 'lucide-react';
import {
  AuditLog,
  DEFAULT_TITLES,
  DEFAULT_USER_ROLES,
  DocumentRecord,
  DriveIntegrationVerificationReport,
  DriveTemplateFile,
  InspectorRecord,
  LeaveRequest,
  LeaveType,
  NotificationItem,
  SystemSettings,
  User,
} from './types.ts';
import {
  DashboardView,
  ForceChangePasswordModal,
  LoginScreen,
  ProfileView,
  RegisterScreen,
  WelcomeScreen,
} from './components/AuthAndDashboardViews.tsx';
import {
  CreateOrEditLeaveView,
  LeaveListAndInspectionView,
} from './components/LeaveWorkflowViews.tsx';
import {
  AdminMembersView,
  AdminReportsView,
  AdminSettingsView,
} from './components/AdminManagementViews.tsx';
import { OfficialLeaveDocument } from './components/OfficialLeaveDocument.tsx';
import {
  DatabaseVerificationModal,
  SpreadsheetCrudVerificationReport,
} from './components/DatabaseVerificationModal.tsx';
import { formatThaiDateTime } from './utils/thaiDate.ts';
import { Database } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';

const DEFAULT_SETTINGS: SystemSettings = {
  organizationName: 'สกร.ระดับอำเภอน้ำพอง จ.ขอนแก่น',
  organizationShortName: 'สกร.อำเภอน้ำพอง',
  address: 'อำเภอน้ำพอง จังหวัดขอนแก่น 40140',
  phone: '043-441000',
  email: 'dolenamphong@gmail.com',
  logoUrl: '',
  addressedToDefault: 'ผู้อำนวยการสกร.ระดับอำเภอน้ำพอง',
  defaultInspectorName: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล',
  defaultInspectorPosition: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล',
  directorName: 'ผู้อำนวยการสกร.ระดับอำเภอน้ำพอง',
  directorPosition: 'ผู้อำนวยการสกร.ระดับอำเภอน้ำพอง',
  directorSignatureUrl: '',
  fiscalYear: '2569',
  leaveNumberPrefix: 'LV',
  driveStorageRootFolderName: 'ระบบใบลาออนไลน์',
  driveStorageRootFolderId: '',
  referenceDriveFolderId: '1qKlnRbX0idcFRc5lNwbtLJGeOHDIYzXS',
  roles: DEFAULT_USER_ROLES,
  titles: DEFAULT_TITLES,
};

export default function App() {
  // Auth & Workspace Connection State
  const [sessionToken, setSessionToken] = useState<string>(
    () => sessionStorage.getItem('namphong_app_session') || ''
  );
  const googleAccessTokenRef = useRef<string>(
    sessionStorage.getItem('namphong_google_oauth_token') || ''
  );
  const [oauthClientId, setOauthClientId] = useState<string>(
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '228882629782-1a3m11o1tt53vbddm3hrgjqhk65a8abe.apps.googleusercontent.com'
  );
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(
    Boolean(sessionStorage.getItem('namphong_google_oauth_token'))
  );
  const [connectingGoogle, setConnectingGoogle] = useState<boolean>(false);
  const [workspaceStatusBanner, setWorkspaceStatusBanner] = useState<string>('');
  const [showOAuthHelpModal, setShowOAuthHelpModal] = useState<boolean>(false);
  const [showVerifyDbModal, setShowVerifyDbModal] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [customClientIdInput, setCustomClientIdInput] = useState<string>(
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '228882629782-1a3m11o1tt53vbddm3hrgjqhk65a8abe.apps.googleusercontent.com'
  );

  // Public Screen Navigation (when not logged in)
  const [publicScreen, setPublicScreen] = useState<'welcome' | 'login' | 'register'>('welcome');

  // Authenticated App State
  const [user, setUser] = useState<User | null>(null);
  const [canReviewAllLeaves, setCanReviewAllLeaves] = useState<boolean>(false);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [inspectors, setInspectors] = useState<InspectorRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [referenceTemplates, setReferenceTemplates] = useState<DriveTemplateFile[]>([]);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [justCreatedLeave, setJustCreatedLeave] = useState<LeaveRequest | null>(null);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false);
  const [loadingBootstrap, setLoadingBootstrap] = useState<boolean>(false);

  // PWA Install State (#34)
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
  const [showIosInstallModal, setShowIosInstallModal] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt();
      await deferredPwaPrompt.userChoice;
      setDeferredPwaPrompt(null);
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      setShowIosInstallModal(true);
    } else {
      setShowIosInstallModal(true);
    }
  };

  // Central API Helper
  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };
      if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      if (googleAccessTokenRef.current) {
        headers['X-Google-Access-Token'] = googleAccessTokenRef.current;
      }

      const res = await fetch(path, {
        ...options,
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === 'GOOGLE_AUTH_REQUIRED' || data?.code === 'GOOGLE_AUTH_EXPIRED') {
          setIsGoogleConnected(false);
        }
        throw new Error(data?.error || `เกิดข้อผิดพลาด (${res.status})`);
      }
      return data;
    },
    [sessionToken]
  );

  // Load Initial Server Config
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.oauthClientId) {
          setOauthClientId(data.oauthClientId);
          setCustomClientIdInput(data.oauthClientId);
        }
        if (data.hasActiveGoogleToken) {
          setIsGoogleConnected(true);
        }
        if (data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Load Bootstrap Data when Authenticated
  const fetchBootstrapData = useCallback(async () => {
    if (!sessionToken) return;
    setLoadingBootstrap(true);
    try {
      const data = await apiFetch('/api/bootstrap');
      setUser(data.user);
      setCanReviewAllLeaves(Boolean(data.canReviewAllLeaves));
      if (data.settings) setSettings(data.settings);
      if (data.leaveTypes) setLeaveTypes(data.leaveTypes);
      if (data.inspectors) setInspectors(data.inspectors);
      if (data.leaveRequests) setLeaveRequests(data.leaveRequests);
      if (data.users) setUsers(data.users);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.notifications) setNotifications(data.notifications);
      if (data.documents) setDocuments(data.documents);
      setIsGoogleConnected(true);
    } catch (err: any) {
      if (err.message?.includes('เข้าสู่ระบบ')) {
        sessionStorage.removeItem('namphong_app_session');
        setSessionToken('');
        setUser(null);
      }
    } finally {
      setLoadingBootstrap(false);
    }
  }, [apiFetch, sessionToken]);

  useEffect(() => {
    if (sessionToken) {
      fetchBootstrapData();
    }
  }, [sessionToken, fetchBootstrapData]);

  // Connect Google Workspace via GIS Popup
  const connectWithAccessToken = async (accessToken: string) => {
    googleAccessTokenRef.current = accessToken;
    sessionStorage.setItem('namphong_google_oauth_token', accessToken);
    setConnectingGoogle(true);
    setWorkspaceStatusBanner('');
    try {
      const res = await apiFetch('/api/workspace/connect', {
        method: 'POST',
        body: JSON.stringify({ accessToken }),
      });
      setIsGoogleConnected(true);
      if (res.settings) setSettings(res.settings);
      if (res.referenceTemplates) setReferenceTemplates(res.referenceTemplates);
      setWorkspaceStatusBanner(
        `เชื่อมต่อฐานข้อมูล Google Sheets (${res.spreadsheetTitle}) และ Google Drive สำเร็จ`
      );
      setShowOAuthHelpModal(false);
      if (sessionToken) {
        await fetchBootstrapData();
      }
    } catch (err: any) {
      setWorkspaceStatusBanner(err.message || 'ไม่สามารถเชื่อมต่อ Google Sheets ได้');
      setShowOAuthHelpModal(true);
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleRunCrudVerification = async (): Promise<SpreadsheetCrudVerificationReport> => {
    const res = await apiFetch('/api/workspace/verify-crud', {
      method: 'POST',
      body: JSON.stringify({ accessToken: googleAccessTokenRef.current }),
    });
    setIsGoogleConnected(true);
    if (sessionToken) {
      await fetchBootstrapData();
    }
    return res.report;
  };

  const handleVerifyAndProvisionDrive =
    async (): Promise<DriveIntegrationVerificationReport> => {
      const res = await apiFetch('/api/drive/verify-and-provision', {
        method: 'POST',
        body: JSON.stringify({ accessToken: googleAccessTokenRef.current }),
      });
      setIsGoogleConnected(true);
      if (res.report?.rootFolder?.id) {
        setSettings((prev) => ({
          ...prev,
          driveStorageRootFolderId: res.report.rootFolder.id,
        }));
      }
      if (sessionToken) {
        await fetchBootstrapData();
      }
      return res.report;
    };

  const handleConnectGoogleAndVerify = async (): Promise<void> => {
    const activeClientId = customClientIdInput.trim() || oauthClientId.trim();
    if (!window.google?.accounts?.oauth2 || !activeClientId) {
      setShowOAuthHelpModal(true);
      return;
    }
    return new Promise((resolve) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: GOOGLE_SCOPES,
        callback: async (response: any) => {
          if (response.access_token) {
            await connectWithAccessToken(response.access_token);
          }
          resolve();
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  };

  const handleConnectGoogleWorkspace = () => {
    const activeClientId = customClientIdInput.trim() || oauthClientId.trim();
    if (!window.google?.accounts?.oauth2 || !activeClientId) {
      setShowOAuthHelpModal(true);
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: GOOGLE_SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            setWorkspaceStatusBanner(`Google OAuth Error: ${response.error}`);
            setShowOAuthHelpModal(true);
            return;
          }
          if (response.access_token) {
            await connectWithAccessToken(response.access_token);
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch {
      setShowOAuthHelpModal(true);
    }
  };

  // Auth Handlers
  const handleLogin = async (username: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    sessionStorage.setItem('namphong_app_session', res.token);
    setSessionToken(res.token);
    setUser(res.user);
    setActiveTab('dashboard');
  };

  const handleRegister = async (payload: any): Promise<string> => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.message;
  };

  const handleForgotPassword = async (username: string, contact: string): Promise<string> => {
    const res = await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ username, contact }),
    });
    return res.message;
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const res = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    sessionStorage.setItem('namphong_app_session', res.token);
    setSessionToken(res.token);
    setUser(res.user);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    sessionStorage.removeItem('namphong_app_session');
    setSessionToken('');
    setUser(null);
    setPublicScreen('welcome');
  };

  // Leave CRUD & Workflow Handlers
  const handleSubmitLeave = async (
    payload: any,
    existingLeaveId?: string
  ): Promise<LeaveRequest> => {
    if (existingLeaveId) {
      const res = await apiFetch(`/api/leaves/${existingLeaveId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      await fetchBootstrapData();
      return res.leave;
    } else {
      const res = await apiFetch('/api/leaves', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await fetchBootstrapData();
      return res.leave;
    }
  };

  const handleUploadPdfToDrive = async (
    leaveId: string,
    pdfBase64: string,
    fileName: string
  ): Promise<LeaveRequest | void> => {
    const res = await apiFetch('/api/drive/upload-leave-pdf', {
      method: 'POST',
      body: JSON.stringify({ leaveId, pdfBase64, fileName }),
    });
    if (res.leave) {
      setLeaveRequests((prev) =>
        prev.map((l) => (l.leaveId === res.leave.leaveId ? res.leave : l))
      );
      if (justCreatedLeave && justCreatedLeave.leaveId === res.leave.leaveId) {
        setJustCreatedLeave(res.leave);
      }
    }
    if (res.document) {
      setDocuments((prev) => [
        res.document,
        ...prev.filter((d) => d.docId !== res.document.docId),
      ]);
    }
    if (sessionToken) {
      await fetchBootstrapData();
    }
    return res.leave;
  };

  const handleCancelLeave = async (leaveId: string) => {
    await apiFetch(`/api/leaves/${leaveId}/cancel`, { method: 'POST' });
    await fetchBootstrapData();
  };

  const handleWorkflowAction = async (
    leaveId: string,
    payload: {
      actionType: 'ตรวจสอบ' | 'อนุมัติ' | 'ไม่อนุมัติ' | 'ส่งกลับแก้ไข';
      comment: string;
      actorName: string;
      actorPosition: string;
      signatureDataUrl: string;
    }
  ): Promise<LeaveRequest> => {
    const res = await apiFetch(`/api/leaves/${leaveId}/workflow`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
    return res.leave;
  };

  // Admin Handlers
  const handleCreateUser = async (payload: any) => {
    await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
  };

  const handleUpdateUser = async (userId: string, payload: any) => {
    await apiFetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
  };

  const handleDeleteUser = async (userId: string) => {
    await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
    await fetchBootstrapData();
  };

  const handleUpdateProfile = async (payload: any) => {
    const res = await apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setUser(res.user);
    await fetchBootstrapData();
  };

  const handleSaveSettings = async (updates: Partial<SystemSettings>) => {
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setSettings(res.settings);
    await fetchBootstrapData();
  };

  const handleCreateLeaveType = async (payload: Partial<LeaveType>) => {
    await apiFetch('/api/leave-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
  };

  const handleUpdateLeaveType = async (typeId: string, payload: Partial<LeaveType>) => {
    await apiFetch(`/api/leave-types/${typeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
  };

  const handleDeleteLeaveType = async (typeId: string) => {
    await apiFetch(`/api/leave-types/${typeId}`, { method: 'DELETE' });
    await fetchBootstrapData();
  };

  const handleCreateInspector = async (payload: Partial<InspectorRecord>) => {
    await apiFetch('/api/inspectors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
  };

  const handleUpdateInspector = async (
    inspectorId: string,
    payload: Partial<InspectorRecord>
  ) => {
    await apiFetch(`/api/inspectors/${inspectorId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await fetchBootstrapData();
  };

  const handleDeleteInspector = async (inspectorId: string) => {
    await apiFetch(`/api/inspectors/${inspectorId}`, { method: 'DELETE' });
    await fetchBootstrapData();
  };

  const handleRefreshReferenceTemplates = async () => {
    const res = await apiFetch('/api/drive/reference-templates');
    if (res.files) setReferenceTemplates(res.files);
  };

  const isAdmin = user?.role === 'Admin';
  const pendingLeavesCount = leaveRequests.filter(
    (l) =>
      l.status === 'รอตรวจสอบ' || l.status === 'รออนุมัติ' || l.status === 'ส่งใบลาแล้ว'
  ).length;
  const pendingUsersCount = users.filter((u) => u.status === 'รออนุมัติ').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      {/* Top Official Header Bar */}
      <header className="no-print sticky top-0 z-40 bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div
            onClick={() => {
              if (user) {
                setJustCreatedLeave(null);
                setEditingLeave(null);
                setActiveTab('dashboard');
              } else {
                setPublicScreen('welcome');
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-300" />
            </div>
            <div className="truncate">
              <div className="text-sm font-bold leading-tight truncate">
                ระบบบริหารจัดการใบลาออนไลน์
              </div>
              <div className="text-[11px] text-indigo-200 truncate">
                {settings.organizationName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Google Workspace Connection Status Button */}
            <button
              type="button"
              onClick={handleConnectGoogleWorkspace}
              disabled={connectingGoogle}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isGoogleConnected
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                  : 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300 font-bold'
              }`}
              title="สถานะการเชื่อมต่อ Google Sheets & Google Drive"
            >
              {connectingGoogle ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isGoogleConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-slate-950" />
              )}
              <span className="hidden sm:inline">
                {isGoogleConnected ? 'เชื่อม Google Sheets แล้ว' : 'เชื่อมต่อ Google Sheets'}
              </span>
            </button>

            {/* Database & CRUD Verification Console Button */}
            <button
              type="button"
              onClick={() => setShowVerifyDbModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold transition cursor-pointer"
              title="ตรวจสอบ Google Sheets ID: 1ezR22MwZvbv60d78oAeOPTC9TbrEDNEXwk-A5rzkLTQ และทดสอบ CRUD จริง"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">ทดสอบ DB & CRUD</span>
            </button>

            {/* PWA Install Button (#34) */}
            <button
              type="button"
              onClick={handleInstallPwa}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="ติดตั้งแอปลงหน้าจอมือถือ (PWA)"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {user && (
              <>
                {/* Notifications Bell */}
                <button
                  type="button"
                  onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
                  className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="การแจ้งเตือน"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                      {Math.min(9, notifications.length)}
                    </span>
                  )}
                </button>

                {/* Refresh Data Button */}
                <button
                  type="button"
                  onClick={fetchBootstrapData}
                  disabled={loadingBootstrap}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="รีเฟรชข้อมูลจาก Google Sheets"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBootstrap ? 'animate-spin' : ''}`} />
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-100 text-xs font-semibold transition cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ออกระบบ</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop Sub-Navigation Bar */}
        {user && (
          <div className="hidden md:block bg-indigo-950/80 border-t border-white/10">
            <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 py-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setEditingLeave(null);
                  setActiveTab('dashboard');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                หน้าหลัก
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setEditingLeave(null);
                  setActiveTab('create_leave');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'create_leave'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                สร้างใบลา
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setEditingLeave(null);
                  setActiveTab('my_leaves');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'my_leaves'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                ใบลาของฉัน
              </button>

              {canReviewAllLeaves && (
                <button
                  type="button"
                  onClick={() => {
                    setJustCreatedLeave(null);
                    setEditingLeave(null);
                    setActiveTab('review_leaves');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'review_leaves'
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'text-indigo-100 hover:bg-white/10'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  ตรวจสอบใบลา
                  {pendingLeavesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
                      {pendingLeavesCount}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setEditingLeave(null);
                  setActiveTab('history');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                ประวัติการลา
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setJustCreatedLeave(null);
                      setEditingLeave(null);
                      setActiveTab('members');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'members'
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-indigo-100 hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    สมาชิก
                    {pendingUsersCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
                        {pendingUsersCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJustCreatedLeave(null);
                      setEditingLeave(null);
                      setActiveTab('reports');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'reports'
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-indigo-100 hover:bg-white/10'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    รายงาน
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setJustCreatedLeave(null);
                      setEditingLeave(null);
                      setActiveTab('settings');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-indigo-100 hover:bg-white/10'
                    }`}
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    ตั้งค่าระบบ
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setEditingLeave(null);
                  setActiveTab('profile');
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ml-auto ${
                  activeTab === 'profile'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                โปรไฟล์ ({user.username})
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Workspace Status Feedback Banner */}
      {workspaceStatusBanner && (
        <div className="no-print max-w-6xl mx-auto w-full px-4 pt-3">
          <div className="bg-indigo-950 text-white px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-xs">
            <span>{workspaceStatusBanner}</span>
            <button
              type="button"
              onClick={() => setWorkspaceStatusBanner('')}
              className="text-indigo-200 hover:text-white cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4">
        {!user ? (
          <>
            {publicScreen === 'welcome' && (
              <WelcomeScreen
                settings={settings}
                isGoogleConnected={isGoogleConnected}
                onConnectGoogle={handleConnectGoogleWorkspace}
                onOpenVerifyModal={() => setShowVerifyDbModal(true)}
                onGoLogin={() => setPublicScreen('login')}
                onGoRegister={() => setPublicScreen('register')}
              />
            )}
            {publicScreen === 'login' && (
              <LoginScreen
                settings={settings}
                isGoogleConnected={isGoogleConnected}
                onConnectGoogle={handleConnectGoogleWorkspace}
                onLogin={handleLogin}
                onForgotPassword={handleForgotPassword}
                onGoRegister={() => setPublicScreen('register')}
                onBackWelcome={() => setPublicScreen('welcome')}
              />
            )}
            {publicScreen === 'register' && (
              <RegisterScreen
                settings={settings}
                isGoogleConnected={isGoogleConnected}
                onConnectGoogle={handleConnectGoogleWorkspace}
                onRegister={handleRegister}
                onGoLogin={() => setPublicScreen('login')}
              />
            )}
          </>
        ) : (
          <>
            {/* Force Password Change on First Login for Adminkk (#8) */}
            {user.forceChangePassword && (
              <ForceChangePasswordModal
                user={user}
                onChangePassword={handleChangePassword}
              />
            )}

            {/* If user just created a leave, show the Official A4 Document Preview (#15) */}
            {justCreatedLeave ? (
              <div className="space-y-4">
                <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        บันทึกใบลาเลขที่ {justCreatedLeave.leaveNumber} ลง Google Sheets และสร้างเอกสารราชการเรียบร้อยแล้ว
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        สถานะปัจจุบัน: {justCreatedLeave.status} • คุณสามารถดาวน์โหลด PDF หรือพิมพ์เอกสาร A4 ได้ทันที
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setJustCreatedLeave(null);
                      setActiveTab('my_leaves');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    ไปยังรายการใบลาของฉัน
                  </button>
                </div>

                <OfficialLeaveDocument
                  leave={justCreatedLeave}
                  settings={settings}
                  onClose={() => {
                    setJustCreatedLeave(null);
                    setActiveTab('my_leaves');
                  }}
                  onUploadToDrive={handleUploadPdfToDrive}
                />
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    user={user}
                    canReviewAllLeaves={canReviewAllLeaves}
                    users={users}
                    leaves={leaveRequests}
                    leaveTypes={leaveTypes}
                    settings={settings}
                    onNavigate={(tab) => {
                      setEditingLeave(null);
                      setActiveTab(tab);
                    }}
                    onQuickApproveUser={
                      isAdmin
                        ? async (uid) => {
                            await handleUpdateUser(uid, { status: 'อนุมัติแล้ว' });
                          }
                        : undefined
                    }
                  />
                )}

                {activeTab === 'create_leave' && (
                  <CreateOrEditLeaveView
                    user={user}
                    settings={settings}
                    leaveTypes={leaveTypes}
                    existingLeaves={leaveRequests}
                    inspectors={inspectors}
                    editingLeave={editingLeave}
                    onSubmitLeave={handleSubmitLeave}
                    onUploadPdfToDrive={handleUploadPdfToDrive}
                    onCancelEdit={
                      editingLeave
                        ? () => {
                            setEditingLeave(null);
                            setActiveTab('my_leaves');
                          }
                        : undefined
                    }
                    onFinished={(created) => {
                      setEditingLeave(null);
                      setJustCreatedLeave(created);
                    }}
                  />
                )}

                {activeTab === 'my_leaves' && (
                  <LeaveListAndInspectionView
                    user={user}
                    canReviewAllLeaves={canReviewAllLeaves}
                    leaves={leaveRequests}
                    leaveTypes={leaveTypes}
                    inspectors={inspectors}
                    settings={settings}
                    mode="my_leaves"
                    onEditLeave={(l) => {
                      setEditingLeave(l);
                      setActiveTab('create_leave');
                    }}
                    onCancelLeave={handleCancelLeave}
                    onWorkflowAction={handleWorkflowAction}
                    onUploadPdfToDrive={handleUploadPdfToDrive}
                  />
                )}

                {activeTab === 'review_leaves' && (
                  <LeaveListAndInspectionView
                    user={user}
                    canReviewAllLeaves={canReviewAllLeaves}
                    leaves={leaveRequests}
                    leaveTypes={leaveTypes}
                    inspectors={inspectors}
                    settings={settings}
                    mode="review"
                    onEditLeave={(l) => {
                      setEditingLeave(l);
                      setActiveTab('create_leave');
                    }}
                    onCancelLeave={handleCancelLeave}
                    onWorkflowAction={handleWorkflowAction}
                    onUploadPdfToDrive={handleUploadPdfToDrive}
                  />
                )}

                {activeTab === 'history' && (
                  <LeaveListAndInspectionView
                    user={user}
                    canReviewAllLeaves={canReviewAllLeaves}
                    leaves={leaveRequests}
                    leaveTypes={leaveTypes}
                    inspectors={inspectors}
                    settings={settings}
                    mode="history"
                    onEditLeave={(l) => {
                      setEditingLeave(l);
                      setActiveTab('create_leave');
                    }}
                    onCancelLeave={handleCancelLeave}
                    onWorkflowAction={handleWorkflowAction}
                    onUploadPdfToDrive={handleUploadPdfToDrive}
                  />
                )}

                {activeTab === 'members' && isAdmin && (
                  <AdminMembersView
                    users={users}
                    settings={settings}
                    onCreateUser={handleCreateUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                  />
                )}

                {activeTab === 'reports' && isAdmin && (
                  <AdminReportsView
                    users={users}
                    leaves={leaveRequests}
                    leaveTypes={leaveTypes}
                    settings={settings}
                  />
                )}

                {activeTab === 'settings' && isAdmin && (
                  <AdminSettingsView
                    settings={settings}
                    leaveTypes={leaveTypes}
                    inspectors={inspectors}
                    auditLogs={auditLogs}
                    referenceTemplates={referenceTemplates}
                    documents={documents}
                    leaves={leaveRequests}
                    onSaveSettings={handleSaveSettings}
                    onCreateLeaveType={handleCreateLeaveType}
                    onUpdateLeaveType={handleUpdateLeaveType}
                    onDeleteLeaveType={handleDeleteLeaveType}
                    onCreateInspector={handleCreateInspector}
                    onUpdateInspector={handleUpdateInspector}
                    onDeleteInspector={handleDeleteInspector}
                    onRefreshReferenceTemplates={handleRefreshReferenceTemplates}
                    onVerifyAndProvisionDrive={handleVerifyAndProvisionDrive}
                  />
                )}

                {activeTab === 'profile' && (
                  <ProfileView
                    user={user}
                    settings={settings}
                    onUpdateProfile={handleUpdateProfile}
                    onChangePassword={handleChangePassword}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (#27) */}
      {user && (
        <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5">
          {isAdmin ? (
            <div className="grid grid-cols-5 gap-1">
              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('dashboard');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'dashboard' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <Home className="w-5 h-5 mb-0.5" />
                หน้าหลัก
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('review_leaves');
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'review_leaves' || activeTab === 'create_leave'
                    ? 'text-indigo-900 bg-indigo-50'
                    : 'text-slate-500'
                }`}
              >
                <FileText className="w-5 h-5 mb-0.5" />
                ใบลา
                {pendingLeavesCount > 0 && (
                  <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                    {pendingLeavesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('members');
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'members' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <Users className="w-5 h-5 mb-0.5" />
                สมาชิก
                {pendingUsersCount > 0 && (
                  <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                    {pendingUsersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('reports');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'reports' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <BarChart3 className="w-5 h-5 mb-0.5" />
                รายงาน
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('settings');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'settings' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <SettingsIcon className="w-5 h-5 mb-0.5" />
                ตั้งค่า
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('dashboard');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'dashboard' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <Home className="w-5 h-5 mb-0.5" />
                หน้าหลัก
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setEditingLeave(null);
                  setActiveTab('create_leave');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'create_leave' || activeTab === 'my_leaves'
                    ? 'text-indigo-900 bg-indigo-50'
                    : 'text-slate-500'
                }`}
              >
                <FilePlus2 className="w-5 h-5 mb-0.5" />
                ใบลา
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('history');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'history' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <History className="w-5 h-5 mb-0.5" />
                ประวัติ
              </button>

              <button
                type="button"
                onClick={() => {
                  setJustCreatedLeave(null);
                  setActiveTab('profile');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer ${
                  activeTab === 'profile' ? 'text-indigo-900 bg-indigo-50' : 'text-slate-500'
                }`}
              >
                <UserIcon className="w-5 h-5 mb-0.5" />
                โปรไฟล์
              </button>
            </div>
          )}
        </nav>
      )}

      {/* Notifications Drawer */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end">
          <div className="bg-white w-full max-w-sm h-full p-5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-800" />
                  การแจ้งเตือน ({notifications.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNotificationsDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">ยังไม่มีการแจ้งเตือนใหม่</p>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.notificationId}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1"
                    >
                      <div className="text-xs font-bold text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-600">{n.message}</div>
                      <div className="text-[10px] text-slate-400">
                        {formatThaiDateTime(n.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OAuth Connection & Troubleshooting Modal */}
      {showOAuthHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-800" />
                ตั้งค่าการเชื่อมต่อ Google Workspace
              </h3>
              <button
                type="button"
                onClick={() => setShowOAuthHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบใช้ Google OAuth เพื่อเชื่อมต่อกับฐานข้อมูล Google Sheets และจัดเก็บใบลาใน Google Drive โดยตรง
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  value={customClientIdInput}
                  onChange={(e) => setCustomClientIdInput(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleConnectGoogleWorkspace}
                className="w-full py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer"
              >
                เข้าสู่ระบบด้วยบัญชี Google (Popup OAuth)
              </button>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  หรือวาง Google OAuth Access Token โดยตรง (กรณีทดสอบผ่าน OAuth Playground)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="ya29.a0..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualTokenInput.trim()) {
                        connectWithAccessToken(manualTokenInput.trim());
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    เชื่อมต่อ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Database & CRUD Verification Modal */}
      <DatabaseVerificationModal
        isOpen={showVerifyDbModal}
        onClose={() => setShowVerifyDbModal(false)}
        isGoogleConnected={isGoogleConnected}
        onConnectGoogleAndRunTest={handleConnectGoogleAndVerify}
        onRunCrudTest={handleRunCrudVerification}
        onRunDriveVerification={handleVerifyAndProvisionDrive}
        oauthClientId={customClientIdInput}
        onUpdateClientId={setCustomClientIdInput}
        onManualTokenConnect={connectWithAccessToken}
      />

      {/* PWA Install Guide Modal (#34) */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-amber-300 mx-auto flex items-center justify-center">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ติดตั้งแอป &ldquo;ระบบใบลา สกร.น้ำพอง&rdquo;
            </h3>
            <div className="text-xs text-slate-600 text-left space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p>
                <strong>สำหรับ iPhone / iPad (Safari):</strong> แตะปุ่ม <strong>แชร์ (Share)</strong> ด้านล่างหน้าจอ แล้วเลือก <strong>&ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo; (Add to Home Screen)</strong>
              </p>
              <p>
                <strong>สำหรับ Android (Chrome):</strong> แตะเมนูจุด 3 จุดมุมขวาบน แล้วเลือก <strong>&ldquo;ติดตั้งแอป&rdquo; (Install App)</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-900 text-white text-xs font-bold cursor-pointer"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
