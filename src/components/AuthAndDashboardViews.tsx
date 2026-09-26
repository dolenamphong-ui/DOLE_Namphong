import React, { useMemo, useState } from 'react';
import {
  Shield,
  LogIn,
  UserPlus,
  KeyRound,
  FilePlus2,
  History,
  FileText,
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowRight,
  Loader2,
  Lock,
  Check,
  AlertCircle,
  BarChart3,
  Eye,
} from 'lucide-react';
import { LeaveRequest, LeaveType, SystemSettings, User } from '../types.ts';
import { formatThaiDate, parseISODateParts } from '../utils/thaiDate.ts';

// ============================================================================
// 1. WELCOME SCREEN (#35)
// ============================================================================
interface WelcomeScreenProps {
  settings: SystemSettings;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onOpenVerifyModal: () => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  settings,
  isGoogleConnected,
  onConnectGoogle,
  onOpenVerifyModal,
  onGoLogin,
  onGoRegister,
}) => {
  return (
    <div className="min-h-[calc(100vh-70px)] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Royal Blue & Purple Header Banner */}
        <div className="bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-900 px-6 py-9 text-center text-white relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 mx-auto flex items-center justify-center mb-4 shadow-inner">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="โลโก้หน่วยงาน"
                className="w-14 h-14 object-contain"
              />
            ) : (
              <Shield className="w-11 h-11 text-amber-300" />
            )}
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-medium text-amber-200 mb-2">
            กรมส่งเสริมการเรียนรู้ กระทรวงศึกษาธิการ
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
            ระบบบริหารจัดการใบลาออนไลน์
          </h1>
          <p className="text-sm sm:text-base font-semibold text-indigo-100 mt-1">
            {settings.organizationName}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          <p className="text-sm text-slate-600 leading-relaxed">
            “ระบบบริหารจัดการใบลาออนไลน์สำหรับบุคลากรในหน่วยงาน”
            <br />
            <span className="text-xs text-slate-400">
              ยื่นใบลา ตรวจสอบสถานะ อนุมัติ และสร้างเอกสารใบลาราชการ PDF อัตโนมัติ
            </span>
          </p>

          {!isGoogleConnected && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                เชื่อมต่อฐานข้อมูล Google Sheets & Drive ก่อนใช้งาน
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                ระบบนี้บันทึกข้อมูลจริงลงใน Google Sheets และจัดเก็บใบลา PDF บน Google Drive ของหน่วยงาน กรุณากดอนุญาตสิทธิ์ OAuth เพื่อเปิดใช้งานฐานข้อมูล
              </p>
              <button
                type="button"
                onClick={onConnectGoogle}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                เชื่อมต่อ Google Workspace (Sheets & Drive)
              </button>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={onGoLogin}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-900 hover:from-blue-900 hover:to-purple-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>

            <button
              type="button"
              onClick={onGoRegister}
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-indigo-800" />
              สมัครสมาชิกสำหรับบุคลากร
            </button>

            <button
              type="button"
              onClick={onOpenVerifyModal}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4 text-indigo-700" />
              ตรวจสอบ Google Sheets & ทดสอบสร้าง Sheet + CRUD จริง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. LOGIN & FORGOT PASSWORD SCREEN (#7)
// ============================================================================
interface LoginScreenProps {
  settings: SystemSettings;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onForgotPassword: (username: string, contact: string) => Promise<string>;
  onGoRegister: () => void;
  onBackWelcome: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  isGoogleConnected,
  onConnectGoogle,
  onLogin,
  onForgotPassword,
  onGoRegister,
  onBackWelcome,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotContact, setForgotContact] = useState('');
  const [forgotResult, setForgotResult] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotResult('');
    setErrorMsg('');
    setForgotLoading(true);
    try {
      const msg = await onForgotPassword(forgotUsername, forgotContact);
      setForgotResult(msg);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่พบข้อมูลที่ระบุ');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5">
        <div className="text-center space-y-1">
          <div
            onClick={onBackWelcome}
            className="w-14 h-14 rounded-2xl bg-indigo-950 text-amber-300 mx-auto flex items-center justify-center mb-2 cursor-pointer"
          >
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {showForgot ? 'แจ้งลืมรหัสผ่าน' : 'เข้าสู่ระบบใบลาออนไลน์'}
          </h2>
          <p className="text-xs text-slate-500">{settings.organizationName}</p>
        </div>

        {!isGoogleConnected && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-semibold">ยังไม่ได้เชื่อมต่อ Google Sheets & Drive</div>
            <button
              type="button"
              onClick={onConnectGoogle}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              กดเพื่ออนุญาตสิทธิ์ Google Workspace
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {forgotResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {forgotResult}
          </div>
        )}

        {!showForgot ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้งาน"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-700"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setShowForgot(true);
                }}
                className="text-xs font-semibold text-indigo-800 hover:underline cursor-pointer"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-900 hover:from-blue-900 hover:to-purple-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              เข้าสู่ระบบ
            </button>

            <div className="pt-3 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-500">ยังไม่มีบัญชีผู้ใช้งาน?</p>
              <button
                type="button"
                onClick={onGoRegister}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                สมัครสมาชิกใหม่
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-slate-600">
              กรอกชื่อผู้ใช้งานและอีเมลหรือเบอร์โทรศัพท์ที่ลงทะเบียนไว้ ระบบจะส่งคำขอแจ้งผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านให้คุณ
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ใช้งาน *</label>
              <input
                type="text"
                required
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมล หรือ เบอร์โทรศัพท์ที่ลงทะเบียน *
              </label>
              <input
                type="text"
                required
                value={forgotContact}
                onChange={(e) => setForgotContact(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-900 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {forgotLoading ? 'กำลังส่ง...' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. REGISTER SCREEN (#5, #6)
// ============================================================================
interface RegisterScreenProps {
  settings: SystemSettings;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  onRegister: (payload: any) => Promise<string>;
  onGoLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  settings,
  isGoogleConnected,
  onConnectGoogle,
  onRegister,
  onGoLogin,
}) => {
  const [form, setForm] = useState({
    title: settings.titles[0] || 'นาย',
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    position: '',
    role: settings.roles[0] || 'ลูกจ้าง',
    department: settings.organizationName,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredSuccessMsg, setRegisteredSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (form.password !== form.confirmPassword) {
      setErrorMsg('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (form.password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      const msg = await onRegister(form);
      setRegisteredSuccessMsg(
        msg || 'สมัครสมาชิกเรียบร้อยแล้ว กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถสมัครสมาชิกได้');
    } finally {
      setLoading(false);
    }
  };

  if (registeredSuccessMsg) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-lg p-7 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">ลงทะเบียนสำเร็จ</h3>
          <p className="text-sm font-semibold text-indigo-950 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            “{registeredSuccessMsg}”
          </p>
          <p className="text-xs text-slate-500">
            สถานะปัจจุบันของคุณคือ <strong>รออนุมัติ</strong> เมื่อผู้ดูแลระบบอนุมัติแล้ว คุณจะสามารถเข้าสู่ระบบเพื่อยื่นใบลาออนไลน์ได้ทันที
          </p>
          <button
            type="button"
            onClick={onGoLogin}
            className="w-full py-3 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-bold cursor-pointer"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-800" />
            สมัครสมาชิกสำหรับบุคลากร
          </h2>
          <p className="text-xs text-slate-500">{settings.organizationName}</p>
        </div>

        {!isGoogleConnected && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-semibold">กรุณาเชื่อมต่อ Google Sheets ก่อนลงทะเบียน</div>
            <button
              type="button"
              onClick={onConnectGoogle}
              className="w-full py-2 rounded-xl bg-amber-600 text-white font-bold cursor-pointer"
            >
              เชื่อมต่อ Google Workspace
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คำนำหน้า *</label>
              <select
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {settings.titles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">นามสกุล *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username) *
              </label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ยืนยันรหัสผ่าน *</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมล *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08X-XXXXXXX"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง *</label>
              <input
                type="text"
                required
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="เช่น ครู กศน.ตำบล / นักวิชาการศึกษา"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">บทบาทบุคลากร *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-indigo-950"
              >
                {settings.roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หน่วยงาน *</label>
            <input
              type="text"
              required
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onGoLogin}
              className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              กลับหน้าเข้าสู่ระบบ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-900 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              ยืนยันการสมัครสมาชิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. FORCED PASSWORD CHANGE MODAL (#8)
// ============================================================================
interface ForceChangePasswordModalProps {
  user: User;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  user,
  onChangePassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setLoading(true);
    try {
      await onChangePassword(currentPassword, newPassword);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              กำหนดรหัสผ่านใหม่ในการเข้าใช้งานครั้งแรก
            </h3>
            <p className="text-xs text-slate-500">
              บัญชี <strong>{user.username}</strong> จำเป็นต้องเปลี่ยนรหัสผ่านเริ่มต้นเพื่อความปลอดภัย
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่านปัจจุบัน *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่านใหม่ (ห้ามซ้ำกับรหัสผ่านเริ่มต้น) *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ยืนยันรหัสผ่านใหม่ *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 5. DASHBOARD VIEW (#10)
// ============================================================================
interface DashboardViewProps {
  user: User;
  canReviewAllLeaves: boolean;
  users: User[];
  leaves: LeaveRequest[];
  leaveTypes: LeaveType[];
  settings: SystemSettings;
  onNavigate: (tab: string) => void;
  onQuickApproveUser?: (userId: string) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  canReviewAllLeaves,
  users,
  leaves,
  leaveTypes,
  settings,
  onNavigate,
  onQuickApproveUser,
}) => {
  const isAdmin = user.role === 'Admin';
  const myLeaves = useMemo(
    () => leaves.filter((l) => l.userId === user.userId && l.status !== 'ยกเลิก'),
    [leaves, user.userId]
  );

  const myDaysUsed = useMemo(
    () =>
      myLeaves
        .filter((l) => l.status === 'อนุมัติแล้ว')
        .reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0),
    [myLeaves]
  );

  const nowMonth = new Date().getMonth();
  const monthlyLeaveCount = useMemo(() => {
    return leaves.filter((l) => {
      if (l.status === 'ยกเลิก' || l.status === 'ร่าง') return false;
      const parts = parseISODateParts(l.startDate);
      return parts && parts.monthIndex === nowMonth;
    }).length;
  }, [leaves, nowMonth]);

  const leaveTypeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    leaveTypes.forEach((lt) => {
      counts[lt.name] = 0;
    });
    leaves.forEach((l) => {
      if (l.status !== 'ยกเลิก' && l.status !== 'ร่าง') {
        counts[l.leaveTypeName] = (counts[l.leaveTypeName] || 0) + 1;
      }
    });
    return Object.entries(counts);
  }, [leaves, leaveTypes]);

  const pendingMembers = useMemo(
    () => users.filter((u) => u.status === 'รออนุมัติ'),
    [users]
  );

  const pendingLeaves = useMemo(
    () =>
      leaves.filter(
        (l) =>
          l.status === 'รอตรวจสอบ' || l.status === 'รออนุมัติ' || l.status === 'ส่งใบลาแล้ว'
      ),
    [leaves]
  );

  return (
    <div className="space-y-5">
      {/* Welcome Banner Card */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-900 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-amber-200 text-xs font-medium">
            ปีงบประมาณ พ.ศ. {settings.fiscalYear} • {settings.organizationName}
          </div>
          <h2 className="text-lg sm:text-xl font-bold">สวัสดี, {user.fullName}</h2>
          <p className="text-xs text-indigo-100">
            ตำแหน่ง: {user.position || '-'} • บทบาท: <span className="font-semibold text-white">{user.role}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create_leave')}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer shrink-0"
        >
          <FilePlus2 className="w-4 h-4" />
          + สร้างใบลาออนไลน์
        </button>
      </div>

      {/* ADMIN DASHBOARD KPI & CHART (#10) */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-800" />
              ภาพรวมสำหรับผู้ดูแลระบบ (Admin Dashboard)
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div
              onClick={() => onNavigate('members')}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-300 transition"
            >
              <div className="text-xs text-slate-500">สมาชิกทั้งหมด</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
            </div>

            <div
              onClick={() => onNavigate('members')}
              className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs cursor-pointer hover:border-amber-400 transition"
            >
              <div className="text-xs text-amber-800 font-medium">สมาชิกรออนุมัติ</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{pendingMembers.length}</div>
            </div>

            <div
              onClick={() => onNavigate('review_leaves')}
              className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-xs cursor-pointer hover:border-blue-400 transition"
            >
              <div className="text-xs text-blue-800 font-medium">ใบลารอตรวจสอบ</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{pendingLeaves.length}</div>
            </div>

            <div
              onClick={() => onNavigate('review_leaves')}
              className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs cursor-pointer"
            >
              <div className="text-xs text-emerald-800 font-medium">ใบลาอนุมัติแล้ว</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {leaves.filter((l) => l.status === 'อนุมัติแล้ว').length}
              </div>
            </div>

            <div
              onClick={() => onNavigate('review_leaves')}
              className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-xs cursor-pointer"
            >
              <div className="text-xs text-rose-800 font-medium">ใบลาไม่อนุมัติ</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                {leaves.filter((l) => l.status === 'ไม่อนุมัติ').length}
              </div>
            </div>

            <div
              onClick={() => onNavigate('reports')}
              className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 shadow-xs cursor-pointer"
            >
              <div className="text-xs text-purple-800 font-medium">การลาประจำเดือนนี้</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">{monthlyLeaveCount}</div>
            </div>
          </div>

          {/* Pending Member Approvals Alert Box */}
          {pendingMembers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-700" />
                  มีผู้สมัครสมาชิกใหม่รออนุมัติ ({pendingMembers.length} คน)
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('members')}
                  className="text-xs font-semibold text-indigo-900 hover:underline cursor-pointer"
                >
                  จัดการทั้งหมด →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pendingMembers.slice(0, 4).map((pm) => (
                  <div
                    key={pm.userId}
                    className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{pm.fullName}</div>
                      <div className="text-[11px] text-slate-500">
                        {pm.position} • {pm.role}
                      </div>
                    </div>
                    {onQuickApproveUser && (
                      <button
                        type="button"
                        onClick={() => onQuickApproveUser(pm.userId)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        อนุมัติทันที
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart Summary of Leave Types (#10) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">กราฟสรุปประเภทการลาในหน่วยงาน</h4>
              <span className="text-[11px] text-slate-400">ข้อมูลจริงจาก Google Sheets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leaveTypeChartData.map(([typeName, count]) => {
                const maxCount = Math.max(1, ...leaveTypeChartData.map(([, c]) => c));
                const widthPct = Math.round((count / maxCount) * 100);
                return (
                  <div key={typeName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate">{typeName}</span>
                      <span className="font-bold text-indigo-900">{count} ครั้ง</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-800 to-purple-700 rounded-full transition-all"
                        style={{ width: `${ count > 0 ? Math.max(10, widthPct) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STAFF PERSONAL LEAVE SUMMARY CARDS (#10) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">สถิติการลาของฉัน</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500">จำนวนใบลาทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{myLeaves.length}</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs text-amber-700">รอตรวจสอบ/อนุมัติ</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {
                myLeaves.filter(
                  (l) =>
                    l.status === 'รอตรวจสอบ' ||
                    l.status === 'รออนุมัติ' ||
                    l.status === 'ส่งใบลาแล้ว'
                ).length
              }
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs text-emerald-700">อนุมัติแล้ว</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {myLeaves.filter((l) => l.status === 'อนุมัติแล้ว').length}
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs text-rose-700">ไม่อนุมัติ</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {myLeaves.filter((l) => l.status === 'ไม่อนุมัติ').length}
            </div>
          </div>
          <div className="bg-indigo-950 text-white p-3.5 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
            <div className="text-xs text-indigo-200">จำนวนวันลาที่ใช้ไป</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{myDaysUsed} วัน</div>
          </div>
        </div>
      </div>

      {/* 4 Main Action Buttons (#10) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('create_leave')}
          className="bg-white hover:bg-indigo-50/60 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-900 text-white flex items-center justify-center group-hover:scale-105 transition">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">สร้างใบลา</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('my_leaves')}
          className="bg-white hover:bg-indigo-50/60 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-800 text-white flex items-center justify-center group-hover:scale-105 transition">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">ใบลาของฉัน</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('history')}
          className="bg-white hover:bg-indigo-50/60 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-800 text-white flex items-center justify-center group-hover:scale-105 transition">
            <History className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">ประวัติการลา</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="bg-white hover:bg-indigo-50/60 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center group-hover:scale-105 transition">
            <UserCheck className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">ข้อมูลส่วนตัว</span>
        </button>
      </div>

      {/* Inspector / Admin Pending Review Quick Section */}
      {canReviewAllLeaves && pendingLeaves.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              รายการใบลารอตรวจสอบ / รออนุมัติ ({pendingLeaves.length} รายการ)
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('review_leaves')}
              className="text-xs font-semibold text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              เปิดหน้าตรวจสอบใบลา <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingLeaves.slice(0, 5).map((l) => (
              <div
                key={l.leaveId}
                onClick={() => onNavigate('review_leaves')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 flex items-center justify-between gap-2 cursor-pointer transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-900">{l.leaveNumber}</span>
                    <span className="text-xs font-bold text-slate-900">{l.fullName}</span>
                    <span className="text-xs text-slate-600">
                      ({l.leaveTypeName} {l.totalDays} วัน)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    วันที่ลา: {formatThaiDate(l.startDate)} - {formatThaiDate(l.endDate)}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold shrink-0">
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. USER PROFILE & PASSWORD CHANGE VIEW
// ============================================================================
interface ProfileViewProps {
  user: User;
  settings: SystemSettings;
  onUpdateProfile: (payload: any) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  settings,
  onUpdateProfile,
  onChangePassword,
}) => {
  const [form, setForm] = useState({
    title: user.title || 'นาย',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || '',
    position: user.position || '',
    department: user.department || settings.organizationName,
  });
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg('');
    try {
      await onUpdateProfile(form);
      setProfileMsg('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    if (newPw !== confPw) {
      setPwErr('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setPwLoading(true);
    try {
      await onChangePassword(curPw, newPw);
      setPwMsg('เปลี่ยนรหัสผ่านสำเร็จ');
      setCurPw('');
      setNewPw('');
      setConfPw('');
    } catch (err: any) {
      setPwErr(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">ข้อมูลส่วนตัวบุคลากร</h3>
          <p className="text-xs text-slate-500">
            Username: <span className="font-mono">{user.username}</span> • บทบาท: {user.role}
          </p>
        </div>

        {profileMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
            <Check className="w-4 h-4" /> {profileMsg}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">คำนำหน้า</label>
            <select
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              {settings.titles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อ *</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">นามสกุล *</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">ตำแหน่ง</label>
          <input
            type="text"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">หน่วยงาน</label>
          <input
            type="text"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">อีเมล</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
        </button>
      </form>

      <form
        onSubmit={handleSavePw}
        className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 self-start"
      >
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-800" />
            เปลี่ยนรหัสผ่าน
          </h3>
          <p className="text-xs text-slate-500">รหัสผ่านถูกเข้ารหัสแบบ Hash อย่างปลอดภัย</p>
        </div>

        {pwErr && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {pwErr}
          </div>
        )}
        {pwMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
            {pwMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">รหัสผ่านปัจจุบัน *</label>
          <input
            type="password"
            required
            value={curPw}
            onChange={(e) => setCurPw(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">รหัสผ่านใหม่ *</label>
          <input
            type="password"
            required
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่ *</label>
          <input
            type="password"
            required
            value={confPw}
            onChange={(e) => setConfPw(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={pwLoading}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {pwLoading ? 'กำลังอัปเดต...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
        </button>
      </form>
    </div>
  );
};
