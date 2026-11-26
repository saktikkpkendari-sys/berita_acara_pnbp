import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FilePlus2,
  FileSpreadsheet,
  FolderSync,
  Globe,
  Hash,
  KeyRound,
  Link2,
  LogOut,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import {
  AgencySettings,
  BeritaAcaraPNBP,
  RoleSecurityConfig,
  SequenceResetMode,
  SpreadsheetInfo,
  UserRole,
} from '../types';
import {
  computeNextBeritaAcaraInfo,
  DriveSpreadsheetItem,
} from '../services/googleSheets';
import { formatRupiah, KOP_SURAT_IMAGE_URL } from '../services/pdfGenerator';
import { generateFreeAppsScript } from '../services/appsScriptTemplate';
import { hashPassword, validateAppsScriptUrl } from '../services/roleAuth';

interface SuperAdminSheetModalProps {
  open: boolean;
  role: UserRole;
  userEmail: string;
  hasGoogleAuth: boolean;
  isLoggingInGoogle: boolean;
  spreadsheet: SpreadsheetInfo | null;
  driveSpreadsheets: DriveSpreadsheetItem[];
  loadingDriveList: boolean;
  loadingData: boolean;
  entries: BeritaAcaraPNBP[];
  agency: AgencySettings;
  securityConfig: RoleSecurityConfig;
  bridgeUrl: string;
  onClose: () => void;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onCreateSpreadsheet: (title: string, includeSample: boolean) => void;
  onConnectSpreadsheet: (urlOrId: string) => void;
  onSelectDriveSpreadsheet: (id: string) => void;
  onChangeDataSheet: (tabName: string) => void;
  onRefreshDriveList: () => void;
  onSaveAgencySettings: (updated: AgencySettings) => void;
  onSaveSecurityConfig: (updated: RoleSecurityConfig) => Promise<void>;
  onSaveBridgeUrl: (url: string) => Promise<void>;
  onDeleteEntry: (entry: BeritaAcaraPNBP) => void;
}

export const SuperAdminSheetModal: React.FC<SuperAdminSheetModalProps> = ({
  open,
  role,
  userEmail,
  hasGoogleAuth,
  isLoggingInGoogle,
  spreadsheet,
  driveSpreadsheets,
  loadingDriveList,
  loadingData,
  entries,
  agency,
  securityConfig,
  bridgeUrl,
  onClose,
  onGoogleLogin,
  onGoogleLogout,
  onCreateSpreadsheet,
  onConnectSpreadsheet,
  onSelectDriveSpreadsheet,
  onChangeDataSheet,
  onRefreshDriveList,
  onSaveAgencySettings,
  onSaveSecurityConfig,
  onSaveBridgeUrl,
  onDeleteEntry,
}) => {
  const [section, setSection] = useState<
    'sheet' | 'nomor' | 'hapus' | 'sandi' | 'instansi' | 'script'
  >('sheet');
  const [deleteSearch, setDeleteSearch] = useState<string>('');
  const [deleteStatusFilter, setDeleteStatusFilter] = useState<
    'Semua' | 'Disetujui' | 'Menunggu Validasi' | 'Ditolak'
  >('Semua');
  const [newTitle, setNewTitle] = useState<string>(
    'Berita Acara PNBP Tunai & Rekap Bulanan - BKK Kelas I Kendari'
  );
  const [includeSample, setIncludeSample] = useState<boolean>(true);
  const [connectUrl, setConnectUrl] = useState<string>('');
  const [agencyForm, setAgencyForm] = useState<AgencySettings>(agency);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const [bridgeInput, setBridgeInput] = useState<string>(bridgeUrl);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [savingBridge, setSavingBridge] = useState<boolean>(false);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  // Password management state
  const [adminPass, setAdminPass] = useState<string>('');
  const [adminPassConfirm, setAdminPassConfirm] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);
  const [superPass, setSuperPass] = useState<string>('');
  const [superPassConfirm, setSuperPassConfirm] = useState<string>('');
  const [showSuperPass, setShowSuperPass] = useState<boolean>(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<string | null>(
    null
  );
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  useEffect(() => {
    setAgencyForm(agency);
  }, [agency]);

  useEffect(() => {
    setBridgeInput(bridgeUrl);
  }, [bridgeUrl]);

  useEffect(() => {
    if (open) {
      setPasswordStatusMsg(null);
      setPasswordErrorMsg(null);
      setBridgeError(null);
    }
  }, [open]);

  if (!open) return null;

  const isSuperAdmin = role === 'superadmin';
  const scriptCode = generateFreeAppsScript(
    spreadsheet?.activeDataSheet || 'Data_BA_PNBP',
    agency
  );

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleSaveBridgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBridgeError(null);
    const trimmed = bridgeInput.trim();
    if (trimmed) {
      const validated = validateAppsScriptUrl(trimmed);
      if (!validated) {
        setBridgeError(
          'URL harus berupa tautan HTTPS Google Apps Script (https://script.google.com/...).'
        );
        return;
      }
    }
    setSavingBridge(true);
    try {
      await onSaveBridgeUrl(trimmed);
    } catch (err) {
      setBridgeError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan URL jembatan Google Sheet.'
      );
    } finally {
      setSavingBridge(false);
    }
  };

  const handleCopyPublicShareLink = async () => {
    const valid = validateAppsScriptUrl(bridgeInput);
    if (!valid) return;
    const base = `${window.location.origin}${window.location.pathname}`;
    const full = `${base}?api=${encodeURIComponent(valid)}`;
    await navigator.clipboard.writeText(full);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2200);
  };

  const handleSaveRolePassword = async (
    target: 'admin' | 'superadmin',
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setPasswordStatusMsg(null);
    setPasswordErrorMsg(null);

    const pass = target === 'admin' ? adminPass : superPass;
    const confirm = target === 'admin' ? adminPassConfirm : superPassConfirm;
    const label = target === 'admin' ? 'Admin' : 'Super Admin';

    if (pass.length < 6) {
      setPasswordErrorMsg(`Sandi ${label} minimal 6 karakter.`);
      return;
    }
    if (pass !== confirm) {
      setPasswordErrorMsg(`Konfirmasi sandi ${label} tidak cocok.`);
      return;
    }

    setSavingPassword(true);
    try {
      const cred = await hashPassword(pass);
      const nextConfig: RoleSecurityConfig = {
        ...securityConfig,
        [target]: cred,
      };
      await onSaveSecurityConfig(nextConfig);
      if (target === 'admin') {
        setAdminPass('');
        setAdminPassConfirm('');
      } else {
        setSuperPass('');
        setSuperPassConfirm('');
      }
      setPasswordStatusMsg(`Sandi ${label} berhasil diperbarui & diamankan.`);
    } catch (err) {
      setPasswordErrorMsg(
        err instanceof Error ? err.message : `Gagal menyimpan sandi ${label}.`
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Super Admin"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Menu Super Admin · Google Sheet, Instansi & Sandi
            </h2>
            <p className="text-xs text-slate-500">
              Kelola koneksi Google Sheet, tautan akses publik User, Kop Surat,
              dan pengaturan sandi Admin & Super Admin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup panel Super Admin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Guard if not Super Admin */}
        {!isSuperAdmin ? (
          <div className="p-6 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Akses Terbatas untuk Super Admin
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600">
              Peran Anda saat ini adalah{' '}
              <strong className="uppercase">{role}</strong>. Menu pengelolaan
              Google Sheet dan pengaturan sandi hanya tersedia untuk{' '}
              <strong>Super Admin</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Inner Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-5 py-2.5 sm:px-6">
              {(
                [
                  { id: 'sheet', label: 'Google Sheet & Publik' },
                  { id: 'nomor', label: 'Nomor Urut BA' },
                  { id: 'hapus', label: 'Hapus Berita Acara' },
                  { id: 'sandi', label: 'Pengaturan Sandi' },
                  { id: 'instansi', label: 'Kop Surat & Pejabat' },
                  { id: 'script', label: 'Apps Script Gratis' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id)}
                  className={`min-h-[36px] whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    section === tab.id
                      ? tab.id === 'hapus'
                        ? 'bg-[#c00000] text-white'
                        : 'bg-[#007376] text-white'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
              {section === 'sheet' && (
                <>
                  {/* Public Web App Bridge URL */}
                  <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Globe className="h-4 w-4 text-teal-700" />
                      Koneksi Publik Tanpa Login Google (Apps Script Web App)
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Tempel URL Web App dari tab{' '}
                      <strong>Apps Script Gratis</strong> agar siapapun yang
                      membuka aplikasi sebagai <strong>User</strong> langsung
                      terhubung ke Google Sheet pusat tanpa perlu masuk Google.
                    </p>
                    <form
                      onSubmit={handleSaveBridgeSubmit}
                      className="mt-3 flex flex-col gap-2 sm:flex-row"
                    >
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={bridgeInput}
                        onChange={(e) => setBridgeInput(e.target.value)}
                        className="min-h-[42px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={savingBridge}
                        className="min-h-[42px] whitespace-nowrap rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57] disabled:opacity-60"
                      >
                        {savingBridge ? 'Menyimpan...' : 'Simpan URL Publik'}
                      </button>
                    </form>
                    {bridgeError && (
                      <p className="mt-2 text-xs font-medium text-red-700">
                        {bridgeError}
                      </p>
                    )}
                    {validateAppsScriptUrl(bridgeInput) && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-teal-200/70 pt-3 text-xs">
                        <span className="text-teal-800 font-medium">
                          Bagikan tautan ini agar perangkat User otomatis
                          tersambung:
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyPublicShareLink}
                          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-teal-700/30 bg-white px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                        >
                          {copiedShareLink ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-lime-600" />
                              Tautan Tersalin
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3.5 w-3.5" />
                              Salin Tautan Publik User
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Google Account Connection */}
                  <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Akun Google Workspace Super Admin
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {hasGoogleAuth
                            ? `Terhubung sebagai ${userEmail}`
                            : 'Masuk dengan akun Google untuk membuat atau mengedit Google Sheet secara langsung dari aplikasi.'}
                        </p>
                      </div>

                      {!hasGoogleAuth ? (
                        <button
                          type="button"
                          onClick={onGoogleLogin}
                          disabled={isLoggingInGoogle}
                          className="gsi-material-button"
                        >
                          <div className="gsi-material-button-state" />
                          <div className="gsi-material-button-content-wrapper">
                            <div className="gsi-material-button-icon">
                              <svg
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 48 48"
                                style={{ display: 'block' }}
                              >
                                <path
                                  fill="#EA4335"
                                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                                />
                                <path
                                  fill="#4285F4"
                                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                                />
                                <path fill="none" d="M0 0h48v48H0z" />
                              </svg>
                            </div>
                            <span className="gsi-material-button-contents">
                              {isLoggingInGoogle
                                ? 'Menghubungkan...'
                                : 'Sign in with Google'}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onGoogleLogout}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Putus Google
                        </button>
                      )}
                    </div>
                  </div>

                  {hasGoogleAuth && (
                    <>
                      {/* Create New Sheet */}
                      <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <FilePlus2 className="h-4 w-4 text-teal-700" />
                          Buat Google Sheet PNBP Baru di Drive
                        </div>
                        <div className="mt-3 space-y-3">
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="min-h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                          />
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeSample}
                              onChange={(e) =>
                                setIncludeSample(e.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-teal-700"
                            />
                            Sertakan 2 contoh Berita Acara PNBP awal & 72
                            Referensi Petugas
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              onCreateSpreadsheet(newTitle, includeSample)
                            }
                            disabled={loadingData}
                            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57] disabled:opacity-60"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Buat Google Sheet Sekarang
                          </button>
                        </div>
                      </div>

                      {/* Connect Existing */}
                      <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <FolderSync className="h-4 w-4 text-slate-700" />
                          Hubungkan Google Sheet yang Sudah Ada
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            onConnectSpreadsheet(connectUrl);
                          }}
                          className="mt-3 flex flex-col gap-2 sm:flex-row"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Tempel URL atau ID Google Spreadsheet..."
                            value={connectUrl}
                            onChange={(e) => setConnectUrl(e.target.value)}
                            className="min-h-[42px] flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={loadingData}
                            className="min-h-[42px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            Hubungkan
                          </button>
                        </form>

                        {spreadsheet && (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                            <div>
                              Aktif: <strong>{spreadsheet.title}</strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Tab Data:</span>
                              <select
                                value={spreadsheet.activeDataSheet}
                                onChange={(e) =>
                                  onChangeDataSheet(e.target.value)
                                }
                                className="rounded border border-slate-300 px-2 py-1 font-mono text-xs"
                              >
                                {spreadsheet.sheetNames.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                              <a
                                href={spreadsheet.spreadsheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-teal-700 font-medium hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Buka Sheet
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Drive Spreadsheet List */}
                      <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              Google Sheet di Drive ({userEmail})
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={onRefreshDriveList}
                            disabled={loadingDriveList}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                loadingDriveList ? 'animate-spin' : ''
                              }`}
                            />
                            Muat Ulang
                          </button>
                        </div>

                        {driveSpreadsheets.length === 0 ? (
                          <p className="mt-3 text-xs text-slate-500">
                            Belum ada Google Sheet yang terdaftar melalui
                            aplikasi ini di Drive Anda.
                          </p>
                        ) : (
                          <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
                            {driveSpreadsheets.map((file) => (
                              <div
                                key={file.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 truncate">
                                    {file.name}
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-500">
                                    {file.modifiedTime.slice(0, 10)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded border border-slate-300 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Buka Drive
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectDriveSpreadsheet(file.id)
                                    }
                                    className="rounded bg-slate-900 px-2.5 py-1 font-medium text-white hover:bg-slate-800"
                                  >
                                    {spreadsheet?.spreadsheetId === file.id
                                      ? 'Aktif'
                                      : 'Pilih'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {section === 'nomor' && (() => {
                const previewInfo = computeNextBeritaAcaraInfo(
                  entries,
                  agencyForm,
                  new Date().toISOString().slice(0, 10)
                );
                return (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSaveAgencySettings(agencyForm);
                    }}
                    className="space-y-5"
                  >
                    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs text-teal-950 leading-relaxed">
                      <strong>Pengaturan Nomor Urut Berita Acara (Khusus Super Admin):</strong>{' '}
                      Tentukan nomor urut awal, panjang digit, prefix kode surat, siklus reset,
                      dan kunci penomoran otomatis agar penomoran Berita Acara tetap tertib dan
                      tidak dapat diubah sembarangan oleh User.
                    </div>

                    {/* Live Preview Box */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <Hash className="h-4 w-4 text-teal-700" />
                        Pratinjau Penomoran Otomatis Berikutnya
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[11px] text-slate-500">
                            Nomor BA Berikutnya
                          </div>
                          <div className="mt-0.5 font-mono text-sm font-bold text-teal-800 break-all">
                            {previewInfo.formattedNomorBA}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[11px] text-slate-500">
                            Urutan Berikutnya
                          </div>
                          <div className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                            #{previewInfo.nextSequence}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[11px] text-slate-500">
                            Urutan Tertinggi Tercatat
                          </div>
                          <div className="mt-0.5 font-mono text-sm font-semibold text-slate-700">
                            {previewInfo.highestExistingSeq > 0
                              ? `#${previewInfo.highestExistingSeq}`
                              : 'Belum ada data'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Nomor Urut Awal / Minimal Berikutnya
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={agencyForm.nomorUrutMulai || 1}
                          onChange={(e) =>
                            setAgencyForm({
                              ...agencyForm,
                              nomorUrutMulai: Math.max(
                                1,
                                Number(e.target.value) || 1
                              ),
                            })
                          }
                          className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          Jika belum ada nomor yang lebih besar di periode aktif,
                          penomoran akan dimulai dari angka ini.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Format Prefix / Kode Surat
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="BA-PNBP/BKK-KDI"
                          value={agencyForm.kodeSuratPrefix}
                          onChange={(e) =>
                            setAgencyForm({
                              ...agencyForm,
                              kodeSuratPrefix: e.target.value,
                            })
                          }
                          className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        />
                        <p className="mt-1 text-[11px] text-slate-500">
                          Format lengkap: [Urut]/[Prefix]/[Bulan Romawi]/[Tahun]
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Jumlah Digit Nomor Urut
                        </label>
                        <select
                          value={agencyForm.digitNomorUrut || 3}
                          onChange={(e) =>
                            setAgencyForm({
                              ...agencyForm,
                              digitNomorUrut: Number(e.target.value) || 3,
                            })
                          }
                          className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        >
                          <option value={2}>2 digit (01, 02, ...)</option>
                          <option value={3}>3 digit (001, 002, ...)</option>
                          <option value={4}>4 digit (0001, 0002, ...)</option>
                          <option value={5}>5 digit (00001, 00002, ...)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Siklus Reset Nomor Urut
                        </label>
                        <select
                          value={agencyForm.resetNomorMode || 'tahunan'}
                          onChange={(e) =>
                            setAgencyForm({
                              ...agencyForm,
                              resetNomorMode: e.target.value as SequenceResetMode,
                            })
                          }
                          className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        >
                          <option value="tahunan">
                            Reset Setiap Tahun (Per Tahun Anggaran)
                          </option>
                          <option value="bulanan">
                            Reset Setiap Bulan (Per Bulan)
                          </option>
                          <option value="lanjut">
                            Berlanjut Terus (Tanpa Reset)
                          </option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agencyForm.kunciNomorUrutUntukUser}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            kunciNomorUrutUntukUser: e.target.checked,
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700"
                      />
                      <span>
                        <strong className="text-slate-900">
                          Kunci Nomor Berita Acara pada tampilan User & Admin
                        </strong>
                        <span className="block mt-0.5 text-slate-500">
                          Jika diaktifkan, kolom Nomor Berita Acara terisi otomatis
                          mengikuti pengaturan Super Admin dan tidak dapat diubah
                          secara manual oleh User maupun Admin.
                        </span>
                      </span>
                    </label>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57]"
                      >
                        <Save className="h-4 w-4" />
                        Simpan Pengaturan Nomor Urut
                      </button>
                    </div>
                  </form>
                );
              })()}

              {section === 'hapus' && (() => {
                const q = deleteSearch.trim().toLowerCase();
                const filteredForDelete = entries.filter((item) => {
                  if (
                    deleteStatusFilter !== 'Semua' &&
                    item.statusValidasi !== deleteStatusFilter
                  ) {
                    return false;
                  }
                  if (!q) return true;
                  return (
                    item.nomorBA.toLowerCase().includes(q) ||
                    item.namaWajibBayar.toLowerCase().includes(q) ||
                    item.namaPetugas.toLowerCase().includes(q) ||
                    item.tanggalInput.toLowerCase().includes(q)
                  );
                });

                return (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#c00000]/30 bg-red-50/70 p-4 text-xs text-[#c00000] leading-relaxed">
                      <strong>Menu Hapus Berita Acara (Khusus Super Admin):</strong>{' '}
                      Anda dapat menghapus Berita Acara dan Rekapitulasi baik
                      yang sudah divalidasi (<em>Disetujui</em>) maupun yang
                      belum divalidasi. Nomor Urut Berita Acara berikutnya akan
                      otomatis menyesuaikan kembali ke nomor urut BA yang
                      dihapus.
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari Nomor BA, nama petugas, pengguna jasa, atau tanggal..."
                          value={deleteSearch}
                          onChange={(e) => setDeleteSearch(e.target.value)}
                          className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 focus:border-[#007376] focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                        {(
                          [
                            'Semua',
                            'Disetujui',
                            'Menunggu Validasi',
                            'Ditolak',
                          ] as const
                        ).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setDeleteStatusFilter(st)}
                            className={`min-h-[32px] whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              deleteStatusFilter === st
                                ? 'bg-[#007376] text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {st === 'Menunggu Validasi' ? 'Menunggu' : st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredForDelete.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-xs text-slate-500">
                        Tidak ada Berita Acara yang cocok dengan filter.
                      </div>
                    ) : (
                      <div className="max-h-96 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200">
                        {filteredForDelete.map((item) => (
                          <div
                            key={`${item.rowNumber}-${item.idBA}`}
                            className="flex flex-col gap-2.5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-[#007376]">
                                  {item.nomorBA}
                                </span>
                                <span
                                  className={`font-semibold ${
                                    item.statusValidasi === 'Disetujui'
                                      ? 'text-[#43b178]'
                                      : item.statusValidasi === 'Ditolak'
                                      ? 'text-[#c00000]'
                                      : 'text-[#e4872d]'
                                  }`}
                                >
                                  · {item.statusValidasi}
                                </span>
                              </div>
                              <div className="text-slate-800">
                                Petugas: <strong>{item.namaPetugas}</strong> ·
                                Pengguna Jasa:{' '}
                                <strong>{item.namaWajibBayar}</strong>
                              </div>
                              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                {item.tanggalInput} ·{' '}
                                {formatRupiah(item.nominalAngka)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onDeleteEntry(item)}
                              className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#c00000]/30 bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#c00000] transition-colors hover:bg-[#c00000] hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus BA
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {section === 'sandi' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs text-teal-950 leading-relaxed">
                    <strong>Pengaturan Sandi Admin & Super Admin:</strong>{' '}
                    Sandi disimpan dalam bentuk hash terenkripsi (PBKDF2-SHA256)
                    dan disinkronkan ke tab <code>Pengaturan_Instansi</code>{' '}
                    Google Sheet apabila terhubung.
                  </div>

                  {passwordStatusMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-medium text-teal-900">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                      <span>{passwordStatusMsg}</span>
                    </div>
                  )}

                  {passwordErrorMsg && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                      {passwordErrorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {/* Admin Password Form */}
                    <form
                      onSubmit={(e) => handleSaveRolePassword('admin', e)}
                      className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <KeyRound className="h-4 w-4 text-teal-700" />
                          Sandi Admin (Validator)
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            securityConfig.admin
                              ? 'text-teal-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {securityConfig.admin
                            ? 'Sudah Diatur'
                            : 'Belum Diatur'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Sandi Admin Baru
                        </label>
                        <div className="relative mt-1">
                          <input
                            type={showAdminPass ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="Minimal 6 karakter"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            className="min-h-[42px] w-full rounded-lg border border-slate-300 pl-3 pr-10 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPass((v) => !v)}
                            className="absolute right-1.5 top-1 flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:text-slate-700"
                            aria-label="Tampilkan sandi admin"
                          >
                            {showAdminPass ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Konfirmasi Sandi Admin
                        </label>
                        <input
                          type={showAdminPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Ketik ulang sandi Admin..."
                          value={adminPassConfirm}
                          onChange={(e) => setAdminPassConfirm(e.target.value)}
                          className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57] disabled:opacity-60"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Simpan Sandi Admin
                      </button>
                    </form>

                    {/* Super Admin Password Form */}
                    <form
                      onSubmit={(e) => handleSaveRolePassword('superadmin', e)}
                      className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <KeyRound className="h-4 w-4 text-teal-700" />
                          Sandi Super Admin
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            securityConfig.superadmin
                              ? 'text-teal-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {securityConfig.superadmin
                            ? 'Sudah Diatur'
                            : 'Belum Diatur'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Sandi Super Admin Baru
                        </label>
                        <div className="relative mt-1">
                          <input
                            type={showSuperPass ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="Minimal 6 karakter"
                            value={superPass}
                            onChange={(e) => setSuperPass(e.target.value)}
                            className="min-h-[42px] w-full rounded-lg border border-slate-300 pl-3 pr-10 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSuperPass((v) => !v)}
                            className="absolute right-1.5 top-1 flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:text-slate-700"
                            aria-label="Tampilkan sandi super admin"
                          >
                            {showSuperPass ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Konfirmasi Sandi Super Admin
                        </label>
                        <input
                          type={showSuperPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Ketik ulang sandi Super Admin..."
                          value={superPassConfirm}
                          onChange={(e) => setSuperPassConfirm(e.target.value)}
                          className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Perbarui Sandi Super Admin
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {section === 'instansi' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSaveAgencySettings(agencyForm);
                  }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        Kop Surat Resmi Berita Acara & Rekapitulasi (Otomatis Tercetak)
                      </span>
                      <span className="font-mono text-[11px] text-teal-700">
                        Aktif di PDF & Cetak A4
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <img
                        src={KOP_SURAT_IMAGE_URL}
                        alt="Kop Surat Kemenkes BKK Kelas I Kendari"
                        className="w-full h-auto max-h-24 object-contain"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Nama Kementerian / Instansi
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyForm.namaInstansi}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            namaInstansi: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Nama Balai / Satuan Kerja
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyForm.subUnit}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            subUnit: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Alamat Instansi
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyForm.alamatInstansi}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            alamatInstansi: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Nama Jabatan Pengesahan Rekap
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Kepala Balai Kekarantinaan Kesehatan Kelas I Kendari"
                        value={agencyForm.jabatanPimpinan}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            jabatanPimpinan: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-[#007376] focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Akan tercetak otomatis di atas nama pejabat pengesah pada
                        dokumen Cetak Rekapitulasi Bulanan (A4 &amp; PDF).
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Nama Pimpinan Pengesah Rekap
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyForm.namaPimpinan}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            namaPimpinan: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-[#007376] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        NIP Pimpinan
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyForm.nipPimpinan}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            nipPimpinan: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-xs text-slate-900 focus:border-[#007376] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Kota Pengesahan Rekap
                      </label>
                      <input
                        type="text"
                        required
                        value={agencyForm.kota}
                        onChange={(e) =>
                          setAgencyForm({
                            ...agencyForm,
                            kota: e.target.value,
                          })
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-[#007376] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#007376] px-4 py-2 text-xs font-semibold text-white hover:bg-[#005a5d]"
                    >
                      <Save className="h-4 w-4" />
                      Simpan Pengaturan Instansi
                    </button>
                  </div>
                </form>
              )}

              {section === 'script' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-600">
                      Salin skrip <code>Code.gs</code> berikut lalu{' '}
                      <strong>Deploy &rarr; Web app (Who has access: Anyone)</strong>{' '}
                      agar User publik bisa memakai Google Sheet tanpa login
                      Google.
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-lime-400" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Salin Skrip
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100">
                    <code>{scriptCode}</code>
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
