import React, { useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  Ban,
  Edit3,
  Trash2,
  Search,
  Building2,
  FileSpreadsheet,
  Printer,
  Plus,
  ShieldCheck,
  History,
  FolderOpen,
  ExternalLink,
  Check,
  Loader2,
  FileText,
  PenTool,
  Sliders,
  HardDrive,
  Download,
} from 'lucide-react';
import {
  AuditLog,
  DocumentRecord,
  DriveIntegrationVerificationReport,
  DriveTemplateFile,
  InspectorRecord,
  LeaveRequest,
  LeaveType,
  SystemSettings,
  User,
  UserStatus,
} from '../types.ts';
import { formatThaiDate, formatThaiDateTime, getThaiMonthName, parseISODateParts } from '../utils/thaiDate.ts';
import { SignaturePad } from './SignaturePad.tsx';

interface MembersViewProps {
  users: User[];
  settings: SystemSettings;
  onCreateUser: (payload: any) => Promise<void>;
  onUpdateUser: (userId: string, payload: any) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export const AdminMembersView: React.FC<MembersViewProps> = ({
  users,
  settings,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    title: 'นาย',
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    position: '',
    department: settings.organizationName,
    role: settings.roles[0] || 'ลูกจ้าง',
    status: 'อนุมัติแล้ว' as UserStatus,
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.position.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [users, statusFilter, roleFilter, search]);

  const openCreateModal = () => {
    setEditingUser(null);
    setErrorMsg('');
    setForm({
      title: settings.titles[0] || 'นาย',
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      position: '',
      department: settings.organizationName,
      role: settings.roles[0] || 'ลูกจ้าง',
      status: 'อนุมัติแล้ว',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setErrorMsg('');
    setForm({
      title: u.title || 'นาย',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      username: u.username,
      password: '',
      email: u.email || '',
      phone: u.phone || '',
      position: u.position || '',
      department: u.department || settings.organizationName,
      role: u.role || 'ลูกจ้าง',
      status: u.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.userId, {
          title: form.title,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          position: form.position,
          department: form.department,
          role: form.role,
          status: form.status,
          newPassword: form.password ? form.password : undefined,
        });
      } else {
        await onCreateUser(form);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = users.filter((u) => u.status === 'รออนุมัติ').length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-800" />
            จัดการบุคลากรและอนุมัติสมาชิก
          </h2>
          <p className="text-xs text-slate-500">
            บุคลากรทั้งหมด {users.length} คน • รออนุมัติ {pendingCount} คน
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          เพิ่มบุคลากรใหม่
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, Username, ตำแหน่ง..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600"
        >
          <option value="ALL">ทุกสถานะสมาชิก ({users.length})</option>
          <option value="รออนุมัติ">รออนุมัติ ({pendingCount})</option>
          <option value="อนุมัติแล้ว">อนุมัติแล้ว</option>
          <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
          <option value="ระงับการใช้งาน">ระงับการใช้งาน</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600"
        >
          <option value="ALL">ทุกบทบาทผู้ใช้งาน</option>
          <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
          {settings.roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredUsers.map((u) => {
          const statusBadge =
            u.status === 'อนุมัติแล้ว'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : u.status === 'รออนุมัติ'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200';

          return (
            <div
              key={u.userId}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{u.fullName}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusBadge}`}>
                      {u.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    ตำแหน่ง: <span className="font-medium text-slate-800">{u.position || '-'}</span> • บทบาท:{' '}
                    <span className="font-semibold text-indigo-800">{u.role}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Username: <span className="font-mono text-slate-700">{u.username}</span> • โทร: {u.phone || '-'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    สังกัด: {u.department} • สมัครเมื่อ: {formatThaiDate(u.createdAt)}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.status !== 'อนุมัติแล้ว' && (
                    <button
                      type="button"
                      onClick={() => onUpdateUser(u.userId, { status: 'อนุมัติแล้ว' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      อนุมัติ
                    </button>
                  )}
                  {u.status === 'รออนุมัติ' && (
                    <button
                      type="button"
                      onClick={() => onUpdateUser(u.userId, { status: 'ไม่อนุมัติ' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      ไม่อนุมัติ
                    </button>
                  )}
                  {u.status === 'อนุมัติแล้ว' && u.role !== 'Admin' && (
                    <button
                      type="button"
                      onClick={() => onUpdateUser(u.userId, { status: 'ระงับการใช้งาน' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      ระงับสิทธิ์
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(u)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    แก้ไข
                  </button>
                  {u.role !== 'Admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`ยืนยันการลบสมาชิก ${u.fullName}?`)) {
                          onDeleteUser(u.userId);
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="ลบสมาชิก"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-xl space-y-4 my-8">
            <h3 className="text-base font-bold text-slate-900">
              {editingUser ? `แก้ไขข้อมูลสมาชิก: ${editingUser.fullName}` : 'เพิ่มบุคลากรใหม่เข้าสู่ระบบ'}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อจริง *</label>
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {editingUser ? 'ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่านเริ่มต้น *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'อย่างน้อย 6 ตัวอักษร'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ตำแหน่ง *</label>
                  <input
                    type="text"
                    required
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="เช่น ครูอาสาสมัครฯ, ครู กศน.ตำบล"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">บทบาท *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {settings.roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">หน่วยงาน/สังกัด</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">สถานะบัญชี</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value="อนุมัติแล้ว">อนุมัติแล้ว</option>
                    <option value="รออนุมัติ">รออนุมัติ</option>
                    <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
                    <option value="ระงับการใช้งาน">ระงับการใช้งาน</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-900 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ADMIN REPORTS VIEW (#31)
// ============================================================================
interface AdminReportsViewProps {
  users: User[];
  leaves: LeaveRequest[];
  leaveTypes: LeaveType[];
  settings: SystemSettings;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  users,
  leaves,
  leaveTypes,
  settings,
}) => {
  const [selectedYearBE, setSelectedYearBE] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (l.status === 'ร่าง' || l.status === 'ยกเลิก') return false;
      const parts = parseISODateParts(l.startDate);
      if (selectedYearBE !== 'ALL' && parts && String(parts.yearBE) !== selectedYearBE) {
        return false;
      }
      if (selectedMonth !== 'ALL' && parts && String(parts.monthIndex) !== selectedMonth) {
        return false;
      }
      if (selectedType !== 'ALL' && l.leaveTypeName !== selectedType) {
        return false;
      }
      return true;
    });
  }, [leaves, selectedYearBE, selectedMonth, selectedType]);

  const totalDaysUsed = useMemo(
    () =>
      filteredLeaves
        .filter((l) => l.status === 'อนุมัติแล้ว')
        .reduce((acc, l) => acc + (Number(l.totalDays) || 0), 0),
    [filteredLeaves]
  );

  const byLeaveType = useMemo(() => {
    const map: Record<string, { count: number; days: number }> = {};
    leaveTypes.forEach((lt) => {
      map[lt.name] = { count: 0, days: 0 };
    });
    filteredLeaves.forEach((l) => {
      if (!map[l.leaveTypeName]) map[l.leaveTypeName] = { count: 0, days: 0 };
      map[l.leaveTypeName].count += 1;
      if (l.status === 'อนุมัติแล้ว') {
        map[l.leaveTypeName].days += Number(l.totalDays) || 0;
      }
    });
    return Object.entries(map).filter(([, v]) => v.count > 0);
  }, [filteredLeaves, leaveTypes]);

  const byStaff = useMemo(() => {
    const map: Record<
      string,
      { fullName: string; position: string; role: string; count: number; approvedDays: number }
    > = {};
    filteredLeaves.forEach((l) => {
      if (!map[l.userId]) {
        map[l.userId] = {
          fullName: l.fullName,
          position: l.position,
          role: l.role,
          count: 0,
          approvedDays: 0,
        };
      }
      map[l.userId].count += 1;
      if (l.status === 'อนุมัติแล้ว') {
        map[l.userId].approvedDays += Number(l.totalDays) || 0;
      }
    });
    return Object.values(map).sort((a, b) => b.approvedDays - a.approvedDays);
  }, [filteredLeaves]);

  const handleExportCSV = () => {
    const headers = [
      'เลขที่ใบลา',
      'ชื่อ-สกุล',
      'ตำแหน่ง',
      'บทบาท',
      'ประเภทการลา',
      'ตั้งแต่วันที่',
      'ถึงวันที่',
      'จำนวนวัน',
      'เหตุผล',
      'สถานะ',
      'ผู้ตรวจสอบ',
      'ผู้อนุมัติ',
    ];
    const rows = filteredLeaves.map((l) => [
      l.leaveNumber,
      l.fullName,
      l.position,
      l.role,
      l.leaveTypeName,
      formatThaiDate(l.startDate),
      formatThaiDate(l.endDate),
      String(l.totalDays),
      (l.reason || '').replace(/"/g, '""'),
      l.status,
      l.inspectorName || '-',
      l.approverName || '-',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายงานสรุปการลา_${settings.organizationShortName}_${settings.fiscalYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">รายงานและสถิติการลาบุคลากร</h2>
          <p className="text-xs text-slate-500">{settings.organizationName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV / Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน PDF
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <select
          value={selectedYearBE}
          onChange={(e) => setSelectedYearBE(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="ALL">ทุกปี พ.ศ.</option>
          <option value="2569">พ.ศ. 2569</option>
          <option value="2568">พ.ศ. 2568</option>
          <option value="2570">พ.ศ. 2570</option>
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="ALL">ทุกเดือน</option>
          {Array.from({ length: 12 }).map((_, idx) => (
            <option key={idx} value={String(idx)}>
              {getThaiMonthName(idx)}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="ALL">ทุกประเภทการลา</option>
          {leaveTypes.map((lt) => (
            <option key={lt.typeId} value={lt.name}>
              {lt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500">บุคลากรทั้งหมด</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{users.length} คน</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500">ใบลาทั้งหมด</div>
          <div className="text-xl font-bold text-indigo-900 mt-1">{filteredLeaves.length} รายการ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500">วันลารวม (อนุมัติ)</div>
          <div className="text-xl font-bold text-purple-800 mt-1">{totalDaysUsed} วัน</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500">รออนุมัติ/ตรวจสอบ</div>
          <div className="text-xl font-bold text-amber-600 mt-1">
            {
              filteredLeaves.filter(
                (l) => l.status === 'รอตรวจสอบ' || l.status === 'รออนุมัติ' || l.status === 'ส่งใบลาแล้ว'
              ).length
            }
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500">อนุมัติแล้ว</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {filteredLeaves.filter((l) => l.status === 'อนุมัติแล้ว').length}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500">ไม่อนุมัติ</div>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {filteredLeaves.filter((l) => l.status === 'ไม่อนุมัติ').length}
          </div>
        </div>
      </div>

      {/* Breakdown by Leave Type */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">สรุปแยกตามประเภทการลา</h3>
        {byLeaveType.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">ยังไม่มีข้อมูลการลาในช่วงที่เลือก</p>
        ) : (
          <div className="space-y-2.5">
            {byLeaveType.map(([typeName, stats]) => {
              const pct = Math.min(100, Math.round((stats.count / Math.max(1, filteredLeaves.length)) * 100));
              return (
                <div key={typeName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{typeName}</span>
                    <span className="text-slate-600">
                      {stats.count} ครั้ง ({stats.days} วันทำการที่อนุมัติ)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-800 to-purple-700 rounded-full"
                      style={{ width: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Breakdown by Staff Member */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">สรุปสถิติการลาแยกรายบุคลากร</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 px-2">ชื่อ-นามสกุล</th>
                <th className="py-2 px-2">ตำแหน่ง</th>
                <th className="py-2 px-2">บทบาท</th>
                <th className="py-2 px-2 text-center">จำนวนครั้ง</th>
                <th className="py-2 px-2 text-right">รวมวันลา (อนุมัติ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byStaff.map((s, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-2 font-semibold text-slate-900">{s.fullName}</td>
                  <td className="py-2.5 px-2 text-slate-600">{s.position}</td>
                  <td className="py-2.5 px-2 text-indigo-800">{s.role}</td>
                  <td className="py-2.5 px-2 text-center">{s.count} ครั้ง</td>
                  <td className="py-2.5 px-2 text-right font-bold text-slate-900">{s.approvedDays} วัน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN SETTINGS, LEAVE TYPES, INSPECTORS, DRIVE TEMPLATES & AUDIT LOGS (#11, #17, #23, #24)
// ============================================================================
interface AdminSettingsViewProps {
  settings: SystemSettings;
  leaveTypes: LeaveType[];
  inspectors: InspectorRecord[];
  auditLogs: AuditLog[];
  referenceTemplates: DriveTemplateFile[];
  documents?: DocumentRecord[];
  leaves?: LeaveRequest[];
  onSaveSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  onCreateLeaveType: (payload: Partial<LeaveType>) => Promise<void>;
  onUpdateLeaveType: (typeId: string, payload: Partial<LeaveType>) => Promise<void>;
  onDeleteLeaveType: (typeId: string) => Promise<void>;
  onCreateInspector: (payload: Partial<InspectorRecord>) => Promise<void>;
  onUpdateInspector: (inspectorId: string, payload: Partial<InspectorRecord>) => Promise<void>;
  onDeleteInspector: (inspectorId: string) => Promise<void>;
  onRefreshReferenceTemplates: () => Promise<void>;
  onVerifyAndProvisionDrive?: () => Promise<DriveIntegrationVerificationReport>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  leaveTypes,
  inspectors,
  auditLogs,
  referenceTemplates,
  documents = [],
  leaves = [],
  onSaveSettings,
  onCreateLeaveType,
  onUpdateLeaveType,
  onDeleteLeaveType,
  onCreateInspector,
  onUpdateInspector,
  onDeleteInspector,
  onRefreshReferenceTemplates,
  onVerifyAndProvisionDrive,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'org' | 'leaveTypes' | 'inspectors' | 'drive' | 'audit'
  >('org');
  const [driveVerificationReport, setDriveVerificationReport] =
    useState<DriveIntegrationVerificationReport | null>(null);
  const [isVerifyingDrive, setIsVerifyingDrive] = useState(false);
  const [driveErrorMsg, setDriveErrorMsg] = useState('');

  const handleRunDriveProvision = async () => {
    if (!onVerifyAndProvisionDrive) return;
    setIsVerifyingDrive(true);
    setDriveErrorMsg('');
    try {
      const report = await onVerifyAndProvisionDrive();
      setDriveVerificationReport(report);
    } catch (err: any) {
      setDriveErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อ Google Drive API ได้');
    } finally {
      setIsVerifyingDrive(false);
    }
  };

  // Org Settings state
  const [orgForm, setOrgForm] = useState<SystemSettings>(settings);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgSavedMsg, setOrgSavedMsg] = useState('');

  // LeaveType Form state
  const [ltModalOpen, setLtModalOpen] = useState(false);
  const [editingLt, setEditingLt] = useState<LeaveType | null>(null);
  const [ltForm, setLtForm] = useState({
    name: '',
    code: '',
    description: '',
    maxDaysPerYear: 30,
    conditionText: '',
    isActive: true,
  });

  // Inspector Form state
  const [inspModalOpen, setInspModalOpen] = useState(false);
  const [editingInsp, setEditingInsp] = useState<InspectorRecord | null>(null);
  const [inspForm, setInspForm] = useState({
    fullName: '',
    position: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล',
    department: settings.organizationName,
    roleType: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล' as InspectorRecord['roleType'],
    signatureDataUrl: '',
    isDefault: true,
    isActive: true,
  });

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    setOrgSavedMsg('');
    try {
      await onSaveSettings(orgForm);
      setOrgSavedMsg('บันทึกการตั้งค่าหน่วยงานลง Google Sheets เรียบร้อยแล้ว');
    } finally {
      setSavingOrg(false);
    }
  };

  const addRole = () => {
    const clean = newRoleInput.trim();
    if (!clean || orgForm.roles.includes(clean)) return;
    setOrgForm({ ...orgForm, roles: [...orgForm.roles, clean] });
    setNewRoleInput('');
  };

  const removeRole = (role: string) => {
    setOrgForm({ ...orgForm, roles: orgForm.roles.filter((r) => r !== role) });
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation pills */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('org')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'org'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          ข้อมูลหน่วยงาน & บทบาท
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leaveTypes')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'leaveTypes'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          จัดการประเภทการลา ({leaveTypes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('inspectors')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'inspectors'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PenTool className="w-4 h-4" />
          ผู้ตรวจสอบ & ลายเซ็น
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('drive')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'drive'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          ต้นแบบเอกสาร Google Drive
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audit')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติการใช้งาน ({auditLogs.length})
        </button>
      </div>

      {/* 1. Organization & System Settings */}
      {activeSubTab === 'org' && (
        <form onSubmit={handleSaveOrg} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">ตั้งค่าข้อมูลหน่วยงานและระบบใบลา</h3>
            <p className="text-xs text-slate-500">
              สามารถเปลี่ยนชื่อหน่วยงาน ปีงบประมาณ ผู้บังคับบัญชา และรายการบทบาทผู้ใช้งานได้ตลอดเวลา
            </p>
          </div>

          {orgSavedMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {orgSavedMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อหน่วยงานราชการ (แสดงบนหัวเอกสารใบลา) *
              </label>
              <input
                type="text"
                required
                value={orgForm.organizationName}
                onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อย่อหน่วยงาน</label>
              <input
                type="text"
                value={orgForm.organizationShortName}
                onChange={(e) => setOrgForm({ ...orgForm, organizationShortName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คำขึ้นต้นช่อง &ldquo;เรียน&rdquo; ในใบลา
              </label>
              <input
                type="text"
                value={orgForm.addressedToDefault}
                onChange={(e) => setOrgForm({ ...orgForm, addressedToDefault: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่หน่วยงาน</label>
              <input
                type="text"
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์หน่วยงาน</label>
              <input
                type="text"
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลหน่วยงาน</label>
              <input
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้อำนวยการสถานศึกษา (ผู้อนุมัติ)</label>
              <input
                type="text"
                value={orgForm.directorName}
                onChange={(e) => setOrgForm({ ...orgForm, directorName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่งผู้อนุมัติ</label>
              <input
                type="text"
                value={orgForm.directorPosition}
                onChange={(e) => setOrgForm({ ...orgForm, directorPosition: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ปีงบประมาณ พ.ศ.</label>
              <input
                type="text"
                value={orgForm.fiscalYear}
                onChange={(e) => setOrgForm({ ...orgForm, fiscalYear: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คำนำหน้าเลขที่ใบลา (เช่น LV → LV-2569-0001)
              </label>
              <input
                type="text"
                value={orgForm.leaveNumberPrefix}
                onChange={(e) => setOrgForm({ ...orgForm, leaveNumberPrefix: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อโฟลเดอร์หลักสำหรับจัดเก็บใบลาบน Google Drive (ระบบจะแยกปี พ.ศ. และประเภทการลาอัตโนมัติ)
              </label>
              <input
                type="text"
                value={orgForm.driveStorageRootFolderName}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, driveStorageRootFolderName: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Director Default Signature */}
          <div className="pt-2">
            <SignaturePad
              label="ลายเซ็นผู้อำนวยการสถานศึกษา (สำหรับประทับเมื่ออนุมัติใบลา)"
              value={orgForm.directorSignatureUrl}
              onChange={(sig) => setOrgForm({ ...orgForm, directorSignatureUrl: sig })}
            />
          </div>

          {/* Manage User Roles (#5) */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              จัดการรายการบทบาทผู้ใช้งาน (เลือกได้ในหน้าสมัครสมาชิก)
            </label>
            <div className="flex flex-wrap gap-2">
              {orgForm.roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-medium"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => removeRole(r)}
                    className="text-indigo-500 hover:text-rose-600 font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newRoleInput}
                onChange={(e) => setNewRoleInput(e.target.value)}
                placeholder="เพิ่มบทบาทใหม่..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={addRole}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                + เพิ่มบทบาท
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingOrg}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกการตั้งค่าระบบทั้งหมด
            </button>
          </div>
        </form>
      )}

      {/* 2. Leave Types Management (#11) */}
      {activeSubTab === 'leaveTypes' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">จัดการประเภทการลา</h3>
              <p className="text-xs text-slate-500">
                เพิ่ม แก้ไข เปิด/ปิดใช้งาน และกำหนดเงื่อนไขของแต่ละประเภทการลา (เก็บใน Sheet LeaveTypes)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLt(null);
                setLtForm({
                  name: '',
                  code: 'CUSTOM',
                  description: '',
                  maxDaysPerYear: 30,
                  conditionText: '',
                  isActive: true,
                });
                setLtModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มประเภทการลา
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leaveTypes.map((lt) => (
              <div
                key={lt.typeId}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{lt.name}</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        lt.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {lt.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{lt.description || '-'}</p>
                  <p className="text-[11px] text-indigo-800 font-medium">
                    เพดานวันลา: {lt.maxDaysPerYear} วัน • เงื่อนไข: {lt.conditionText || 'ตามระเบียบราชการ'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onUpdateLeaveType(lt.typeId, { isActive: !lt.isActive })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    {lt.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLt(lt);
                      setLtForm({
                        name: lt.name,
                        code: lt.code,
                        description: lt.description,
                        maxDaysPerYear: lt.maxDaysPerYear,
                        conditionText: lt.conditionText,
                        isActive: lt.isActive,
                      });
                      setLtModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 text-xs font-medium cursor-pointer"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`ยืนยันการลบประเภทการลา "${lt.name}"?`)) {
                        onDeleteLeaveType(lt.typeId);
                      }
                    }}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {ltModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-3 shadow-xl">
                <h4 className="font-bold text-slate-900">
                  {editingLt ? `แก้ไขประเภทการลา: ${editingLt.name}` : 'เพิ่มประเภทการลาใหม่'}
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อประเภทการลา *</label>
                    <input
                      type="text"
                      value={ltForm.name}
                      onChange={(e) => setLtForm({ ...ltForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">คำอธิบาย</label>
                    <input
                      type="text"
                      value={ltForm.description}
                      onChange={(e) => setLtForm({ ...ltForm, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">จำนวนวันลาสูงสุดต่อปี</label>
                    <input
                      type="number"
                      value={ltForm.maxDaysPerYear}
                      onChange={(e) => setLtForm({ ...ltForm, maxDaysPerYear: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">เงื่อนไขการลา</label>
                    <textarea
                      rows={2}
                      value={ltForm.conditionText}
                      onChange={(e) => setLtForm({ ...ltForm, conditionText: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLtModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ltForm.name.trim()) return;
                      if (editingLt) {
                        await onUpdateLeaveType(editingLt.typeId, ltForm);
                      } else {
                        await onCreateLeaveType(ltForm);
                      }
                      setLtModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Inspectors & Digital Signatures (#17, #18) */}
      {activeSubTab === 'inspectors' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">จัดการผู้ตรวจสอบใบลาและลายมือชื่อ</h3>
              <p className="text-xs text-slate-500">
                ค่าเริ่มต้น: หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล (สามารถเพิ่มหรือเปลี่ยนผู้ตรวจสอบและลายเซ็นได้)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingInsp(null);
                setInspForm({
                  fullName: '',
                  position: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล',
                  department: settings.organizationName,
                  roleType: 'หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล',
                  signatureDataUrl: '',
                  isDefault: inspectors.length === 0,
                  isActive: true,
                });
                setInspModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มผู้ตรวจสอบ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inspectors.map((insp) => (
              <div
                key={insp.inspectorId}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {insp.fullName}
                      {insp.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-semibold">
                          ค่าเริ่มต้น
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">ตำแหน่ง: {insp.position}</div>
                    <div className="text-[11px] text-slate-400">ประเภท: {insp.roleType}</div>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                      insp.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {insp.isActive ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                  </span>
                </div>

                {insp.signatureDataUrl && (
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-center">
                    <img
                      src={insp.signatureDataUrl}
                      alt="ลายเซ็นผู้ตรวจสอบ"
                      className="h-12 object-contain"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInsp(insp);
                      setInspForm({
                        fullName: insp.fullName,
                        position: insp.position,
                        department: insp.department,
                        roleType: insp.roleType,
                        signatureDataUrl: insp.signatureDataUrl,
                        isDefault: insp.isDefault,
                        isActive: insp.isActive,
                      });
                      setInspModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 text-xs font-semibold cursor-pointer"
                  >
                    แก้ไข / ลงลายเซ็น
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`ยืนยันการลบผู้ตรวจสอบ ${insp.fullName}?`)) {
                        onDeleteInspector(insp.inspectorId);
                      }
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {inspModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-3 shadow-xl my-8">
                <h4 className="font-bold text-slate-900">
                  {editingInsp ? 'แก้ไขข้อมูลผู้ตรวจสอบและลายเซ็น' : 'เพิ่มผู้ตรวจสอบใบลา'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ประเภทผู้ตรวจสอบ</label>
                    <select
                      value={inspForm.roleType}
                      onChange={(e) =>
                        setInspForm({
                          ...inspForm,
                          roleType: e.target.value as any,
                          position: e.target.value !== 'อื่น ๆ' ? e.target.value : inspForm.position,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    >
                      <option value="หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล">หัวหน้าเจ้าหน้าที่กลุ่มงานบุคคล</option>
                      <option value="ผู้อำนวยการสถานศึกษา">ผู้อำนวยการสถานศึกษา</option>
                      <option value="ผู้ได้รับมอบหมาย">ผู้ได้รับมอบหมาย</option>
                      <option value="อื่น ๆ">อื่น ๆ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อ-นามสกุลผู้ตรวจสอบ *</label>
                    <input
                      type="text"
                      value={inspForm.fullName}
                      onChange={(e) => setInspForm({ ...inspForm, fullName: e.target.value })}
                      placeholder="เช่น นางสาวสมหญิง ใจดี"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ตำแหน่งที่แสดงในใบลา *</label>
                    <input
                      type="text"
                      value={inspForm.position}
                      onChange={(e) => setInspForm({ ...inspForm, position: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <SignaturePad
                    label="ลายมือชื่อผู้ตรวจสอบ (วาดบนหน้าจอหรืออัปโหลดรูปภาพ)"
                    value={inspForm.signatureDataUrl}
                    onChange={(sig) => setInspForm({ ...inspForm, signatureDataUrl: sig })}
                  />

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inspForm.isDefault}
                      onChange={(e) => setInspForm({ ...inspForm, isDefault: e.target.checked })}
                      className="rounded text-indigo-900"
                    />
                    ตั้งเป็นผู้ตรวจสอบหลัก (ค่าเริ่มต้นของระบบ)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInspModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!inspForm.fullName.trim()) return;
                      if (editingInsp) {
                        await onUpdateInspector(editingInsp.inspectorId, inspForm);
                      } else {
                        await onCreateInspector(inspForm);
                      }
                      setInspModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    บันทึกผู้ตรวจสอบ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Google Drive Auto-Folder & Google Sheets File ID/URL Records (#14, #15) */}
      {activeSubTab === 'drive' && (
        <div className="space-y-4">
          {/* Auto-Folder Provisioning & Verification Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-700" />
                  ระบบสร้างโฟลเดอร์เก็บใบลาอัตโนมัติบน Google Drive &amp; บันทึก File ID / URL ลง Google Sheets
                </h3>
                <p className="text-xs text-slate-600">
                  เมื่อมีการยื่นใบลาหรือกดตรวจสอบ ระบบจะสร้างโฟลเดอร์หลัก <strong>{settings.driveStorageRootFolderName || 'ระบบใบลาออนไลน์'}</strong> แยกตามปีงบประมาณและประเภทการลาอัตโนมัติ พร้อมบันทึก <code className="font-mono font-bold">pdfFileId</code>, <code className="font-mono font-bold">pdfFileUrl</code>, และ <code className="font-mono font-bold">pdfWebViewLink</code> ลงใน Sheet <strong>LeaveRequests</strong> และ <strong>Documents</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onVerifyAndProvisionDrive && (
                  <button
                    type="button"
                    onClick={handleRunDriveProvision}
                    disabled={isVerifyingDrive}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
                  >
                    {isVerifyingDrive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <HardDrive className="w-4 h-4" />
                    )}
                    {isVerifyingDrive
                      ? 'กำลังสร้างโฟลเดอร์ & ทดสอบอัปโหลด...'
                      : 'ตรวจสอบ Google Drive & สร้างโฟลเดอร์อัตโนมัติทันที'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onRefreshReferenceTemplates}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold cursor-pointer"
                >
                  ซิงค์ไฟล์ต้นแบบจาก Drive
                </button>
              </div>
            </div>

            {driveErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {driveErrorMsg}
              </div>
            )}

            {/* Current Root Folder Status from Settings Sheet */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>📁 โครงสร้างโฟลเดอร์จัดเก็บใบลาอัตโนมัติ:</span>
                  <span className="text-indigo-900">
                    {settings.driveStorageRootFolderName || 'ระบบใบลาออนไลน์'} / ปีงบประมาณ {settings.fiscalYear || '2569'} / [ประเภทการลา]
                  </span>
                </div>
                <div className="text-slate-600 font-mono text-[11px]">
                  Root Folder ID ใน Sheet Settings (driveStorageRootFolderId):{' '}
                  <strong className="text-emerald-800">
                    {driveVerificationReport?.rootFolder.id ||
                      settings.driveStorageRootFolderId ||
                      'จะถูกสร้างและบันทึกอัตโนมัติเมื่ออัปโหลดใบลาหรือกดปุ่มตรวจสอบด้านบน'}
                  </strong>
                </div>
              </div>
              {(driveVerificationReport?.rootFolder.id || settings.driveStorageRootFolderId) && (
                <a
                  href={`https://drive.google.com/drive/folders/${
                    driveVerificationReport?.rootFolder.id || settings.driveStorageRootFolderId
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold"
                >
                  เปิดโฟลเดอร์หลักบน Google Drive <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Live Folder Tree Result after clicking Verify & Provision */}
            {driveVerificationReport && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  สร้างและยืนยันโฟลเดอร์เก็บใบลาบน Google Drive ครบทุกประเภทการลาเรียบร้อยแล้ว:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {driveVerificationReport.categoryFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="p-3 rounded-xl bg-white border border-emerald-200 flex flex-col justify-between gap-1"
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
                          className="text-[11px] font-semibold text-indigo-800 hover:underline inline-flex items-center gap-0.5"
                        >
                          เปิดโฟลเดอร์ <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Folder ID: {folder.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recorded Files Table from Google Sheets (LeaveRequests & Documents) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  รายการไฟล์ใบลา PDF ที่บันทึก File ID และ URL ลงใน Google Sheets (ตาราง LeaveRequests &amp; Documents)
                </h4>
                <p className="text-xs text-slate-500">
                  แสดงข้อมูลจริงที่บันทึกอยู่ในคอลัมน์ <code className="font-mono">pdfFileId</code>, <code className="font-mono">pdfFileUrl</code>, <code className="font-mono">pdfWebViewLink</code> ของตาราง LeaveRequests และตาราง Documents
                </p>
              </div>
              <a
                href="https://docs.google.com/spreadsheets/d/1ezR22MwZvbv60d78oAeOPTC9TbrEDNEXwk-A5rzkLTQ/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-800 hover:underline"
              >
                เปิดตาราง Google Sheets <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {leaves.filter((l) => l.pdfFileId).length === 0 && documents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                ยังไม่มีไฟล์ PDF ที่อัปโหลดขึ้น Google Drive หรือกดปุ่ม &ldquo;ตรวจสอบ Google Drive &amp; สร้างโฟลเดอร์อัตโนมัติทันที&rdquo; ด้านบนเพื่อทดสอบบันทึก File ID และ URL ลง Google Sheets
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">เลขที่ใบลา / รหัส</th>
                      <th className="py-2.5 px-3">ผู้ยื่น / ชื่อไฟล์</th>
                      <th className="py-2.5 px-3">โฟลเดอร์บน Google Drive</th>
                      <th className="py-2.5 px-3">Google Drive File ID</th>
                      <th className="py-2.5 px-3">Google Drive URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaves
                      .filter((l) => l.pdfFileId)
                      .map((l) => (
                        <tr key={l.leaveId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-indigo-950 whitespace-nowrap">
                            {l.leaveNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{l.fullName}</div>
                            <div className="text-[11px] text-slate-500">{l.leaveTypeName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            📁 {settings.driveStorageRootFolderName || 'ระบบใบลาออนไลน์'} / ปีงบประมาณ{' '}
                            {settings.fiscalYear || '2569'} / {l.leaveTypeName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-900 font-semibold">
                            {l.pdfFileId}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={
                                  l.pdfWebViewLink ||
                                  `https://drive.google.com/file/d/${l.pdfFileId}/view`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold whitespace-nowrap"
                              >
                                <ExternalLink className="w-3 h-3" />
                                เปิดดูบน Drive
                              </a>
                              {l.pdfFileUrl && (
                                <a
                                  href={l.pdfFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold whitespace-nowrap"
                                >
                                  <Download className="w-3 h-3" />
                                  ดาวน์โหลด
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {documents.map((doc) => (
                      <tr key={doc.docId} className="hover:bg-slate-50 bg-emerald-50/20">
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap">
                          {doc.docId}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 truncate max-w-xs">
                            {doc.fileName}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ตาราง Documents • อ้างอิงใบลา: {doc.leaveNumber || doc.leaveId}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          📁 {settings.driveStorageRootFolderName || 'ระบบใบลาออนไลน์'} / ปี{' '}
                          {doc.fiscalYear || settings.fiscalYear} / {doc.leaveTypeName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-900 font-semibold">
                          {doc.driveFileId}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={
                                doc.webViewLink ||
                                `https://drive.google.com/file/d/${doc.driveFileId}/view`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-white text-[11px] font-semibold whitespace-nowrap"
                            >
                              <ExternalLink className="w-3 h-3" />
                              เปิดดู URL
                            </a>
                            {doc.webContentLink && (
                              <a
                                href={doc.webContentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold whitespace-nowrap"
                              >
                                <Download className="w-3 h-3" />
                                ดาวน์โหลด
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reference Templates Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="text-xs font-bold text-slate-700">
              ไฟล์ต้นแบบที่พบในโฟลเดอร์อ้างอิง ({referenceTemplates.length} ไฟล์):
            </div>
            {referenceTemplates.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                ระบบใช้แม่แบบมาตรฐานราชการไทย (TH-Sarabun-PSK 16 pt) ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลา
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {referenceTemplates.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-indigo-700 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 truncate">{f.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{f.mimeType}</div>
                      </div>
                    </div>
                    {f.webViewLink && (
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 shrink-0"
                        title="เปิดดูไฟล์ต้นฉบับ"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Audit Logs (#23) */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-800" />
                บันทึกประวัติการใช้งานระบบ (Audit Logs)
              </h3>
              <p className="text-xs text-slate-500">
                บันทึกทุกเหตุการณ์สำคัญลงใน Google Sheets (Sheet: AuditLogs)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">วัน-เวลา (พ.ศ.)</th>
                  <th className="py-2.5 px-3">ผู้ใช้งาน</th>
                  <th className="py-2.5 px-3">การกระทำ</th>
                  <th className="py-2.5 px-3">เป้าหมาย</th>
                  <th className="py-2.5 px-3">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-slate-50">
                    <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                      {formatThaiDateTime(log.timestamp)}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">{log.username}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">{log.targetId}</td>
                    <td className="py-2 px-3 text-slate-700">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
