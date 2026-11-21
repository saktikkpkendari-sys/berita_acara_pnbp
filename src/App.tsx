import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Database,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  LogOut,
  Printer,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  AgencySettings,
  BeritaAcaraPNBP,
  PendingConfirmation,
  SpreadsheetInfo,
  UserRole,
} from './types';
import { googleSignIn, initAuth, logout } from './services/googleAuth';
import {
  appendBeritaAcaraRow,
  createAutomatedSpreadsheet,
  DEFAULT_AGENCY_SETTINGS,
  DriveSpreadsheetItem,
  fetchAgencySettings,
  fetchSheetEntries,
  inspectSpreadsheet,
  listAppSpreadsheets,
  saveAgencySettingsToSheet,
  updateRowPdfLink,
  updateRowValidation,
  uploadPdfToDrive,
} from './services/googleSheets';
import { formatRupiah } from './services/pdfGenerator';
import { ConfirmModal } from './components/ConfirmModal';
import { BeritaAcaraPreviewModal } from './components/BeritaAcaraPreviewModal';
import { CreateBeritaAcaraView } from './components/CreateBeritaAcaraView';
import { CetakBeritaAcaraView } from './components/CetakBeritaAcaraView';
import { MonthlyRecapView } from './components/MonthlyRecapView';
import { SuperAdminSheetModal } from './components/SuperAdminSheetModal';

const MENU_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'buat',
    label: '1. Buat Berita Acara',
    mobileLabel: 'Buat BA',
    icon: FilePlus2,
  },
  {
    id: 'cetak',
    label: '2. Cetak Berita Acara',
    mobileLabel: 'Cetak BA',
    icon: Printer,
  },
  {
    id: 'rekap',
    label: '3. Cetak Rekapitulasi Bulanan',
    mobileLabel: 'Rekap Bulanan',
    icon: FileText,
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User (Petugas)',
  admin: 'Admin (Validator)',
  superadmin: 'Super Admin',
};

export default function App() {
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [role, setRole] = useState<UserRole>('superadmin');
  const [activeTab, setActiveTab] = useState<ActiveTab>('buat');

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [entries, setEntries] = useState<BeritaAcaraPNBP[]>([]);
  const [agency, setAgency] = useState<AgencySettings>(DEFAULT_AGENCY_SETTINGS);
  const [driveSpreadsheets, setDriveSpreadsheets] = useState<
    DriveSpreadsheetItem[]
  >([]);
  const [loadingDriveList, setLoadingDriveList] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [previewEntry, setPreviewEntry] = useState<BeritaAcaraPNBP | null>(
    null
  );
  const [sheetModalOpen, setSheetModalOpen] = useState<boolean>(false);

  const [reviewTarget, setReviewTarget] = useState<{
    entry: BeritaAcaraPNBP;
    decision: 'Disetujui' | 'Ditolak';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null
  );

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? null : prev));
    }, 4500);
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      (maybeUser) => {
        setUser(maybeUser);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadSpreadsheetData = useCallback(
    async (token: string, info: SpreadsheetInfo) => {
      setLoadingData(true);
      setErrorMsg(null);
      try {
        const [loadedEntries, loadedSettings] = await Promise.all([
          fetchSheetEntries(token, info.spreadsheetId, info.activeDataSheet),
          fetchAgencySettings(token, info.spreadsheetId, info.sheetNames),
        ]);
        setEntries(loadedEntries);
        setAgency(loadedSettings);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Gagal membaca data dari Google Spreadsheet.'
        );
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  const refreshDriveList = useCallback(
    async (token: string, autoLoadFirst = false) => {
      setLoadingDriveList(true);
      try {
        const files = await listAppSpreadsheets(token);
        setDriveSpreadsheets(files);
        if (autoLoadFirst && files.length > 0) {
          const preferred =
            files.find((f) => f.name.toLowerCase().includes('pnbp')) ||
            files[0];
          const info = await inspectSpreadsheet(token, preferred.id);
          setSpreadsheet(info);
          await loadSpreadsheetData(token, info);
        }
      } catch {
        // Ignore if empty
      } finally {
        setLoadingDriveList(false);
      }
    },
    [loadSpreadsheetData]
  );

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
        showToast(`Terhubung sebagai ${res.user.email || res.user.displayName}`);
        await refreshDriveList(res.accessToken, true);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Pastikan pop-up browser diizinkan.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setSpreadsheet(null);
    setEntries([]);
    setDriveSpreadsheets([]);
  };

  const handleCreateSpreadsheet = (title: string, includeSample: boolean) => {
    if (!accessToken || role !== 'superadmin') return;
    setConfirmation({
      title: 'Buat Google Sheet PNBP Baru di Drive?',
      description:
        'Tindakan ini akan membuat file Google Spreadsheet khusus PNBP BKK Kelas I Kendari lengkap dengan 72 Referensi Petugas & NIP, tab Rekap Bulanan, dan validasi Admin.',
      details: [
        `Nama File: ${title}`,
        'Tab: Data_BA_PNBP, Rekap_Bulanan_PNBP, Referensi_Petugas, Pengaturan_Instansi',
      ],
      confirmLabel: 'Buat Google Sheet',
      onConfirm: async () => {
        setLoadingData(true);
        setErrorMsg(null);
        try {
          const info = await createAutomatedSpreadsheet(
            accessToken,
            title,
            agency,
            includeSample
          );
          setSpreadsheet(info);
          await Promise.all([
            loadSpreadsheetData(accessToken, info),
            refreshDriveList(accessToken, false),
          ]);
          setSheetModalOpen(false);
          showToast(`Google Sheet "${info.title}" berhasil dibuat di Drive.`);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Gagal membuat Google Spreadsheet.';
          setErrorMsg(message);
          throw err;
        } finally {
          setLoadingData(false);
        }
      },
    });
  };

  const handleConnectSpreadsheet = async (urlOrId: string) => {
    if (!accessToken || role !== 'superadmin') return;
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const info = await inspectSpreadsheet(accessToken, urlOrId);
      setSpreadsheet(info);
      await loadSpreadsheetData(accessToken, info);
      setSheetModalOpen(false);
      showToast(`Terhubung ke "${info.title}" (Tab: ${info.activeDataSheet})`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Tidak dapat membuka Google Spreadsheet tersebut.'
      );
    } finally {
      setLoadingData(false);
    }
  };

  const handleChangeDataSheet = async (tabName: string) => {
    if (!accessToken || !spreadsheet || role !== 'superadmin') return;
    const updated = { ...spreadsheet, activeDataSheet: tabName };
    setSpreadsheet(updated);
    await loadSpreadsheetData(accessToken, updated);
  };

  const handleSubmitBeritaAcara = (
    payload: Omit<
      BeritaAcaraPNBP,
      | 'rowNumber'
      | 'statusValidasi'
      | 'validatorAdmin'
      | 'tanggalValidasi'
      | 'catatanAdmin'
      | 'linkPdfBA'
    >
  ) => {
    if (!accessToken || !spreadsheet) return;
    setConfirmation({
      title: 'Simpan Berita Acara PNBP ke Google Sheet?',
      description: `Data beserta tanda tangan digital Pihak Pertama dan Pihak Kedua akan dikirim ke tab ${spreadsheet.activeDataSheet} dengan status awal "Menunggu Validasi".`,
      details: [
        `Nomor BA: ${payload.nomorBA}`,
        `Petugas: ${payload.namaPetugas} (NIP. ${payload.nipPetugas})`,
        `Wajib Bayar: ${payload.namaWajibBayar}`,
        `Nominal PNBP: ${formatRupiah(payload.nominalAngka)}`,
      ],
      confirmLabel: 'Simpan Berita Acara',
      onConfirm: async () => {
        await appendBeritaAcaraRow(
          accessToken,
          spreadsheet.spreadsheetId,
          spreadsheet.activeDataSheet,
          payload
        );
        await loadSpreadsheetData(accessToken, spreadsheet);
        showToast(
          `Berita Acara ${payload.nomorBA} tersimpan. Menunggu validasi Admin.`
        );
        setActiveTab('cetak');
      },
    });
  };

  const handleSubmitReviewDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || !accessToken || !spreadsheet) return;
    if (role === 'user') return;

    const { entry, decision } = reviewTarget;
    const validatorName =
      user?.displayName || user?.email || agency.namaPimpinan;
    const noteText = reviewNotes.trim();

    setReviewTarget(null);
    setConfirmation({
      title:
        decision === 'Disetujui'
          ? 'Konfirmasi Validasi & Persetujuan Cetak PDF'
          : 'Konfirmasi Penolakan Berita Acara',
      description:
        decision === 'Disetujui'
          ? `Berita Acara ${entry.nomorBA} akan disetujui sehingga PDF resmi dan Rekapitulasi Bulanan dapat dicetak.`
          : `Berita Acara ${entry.nomorBA} akan ditolak dan tetap terkunci dari pencetakan PDF.`,
      details: [
        `Wajib Bayar: ${entry.namaWajibBayar}`,
        `Nominal PNBP: ${formatRupiah(entry.nominalAngka)}`,
        `Validator: ${validatorName}`,
        `Catatan: ${noteText || '-'}`,
      ],
      confirmLabel:
        decision === 'Disetujui' ? 'Validasi & Setujui' : 'Tolak Berkas',
      variant: decision === 'Ditolak' ? 'danger' : 'primary',
      onConfirm: async () => {
        await updateRowValidation(
          accessToken,
          spreadsheet.spreadsheetId,
          spreadsheet.activeDataSheet,
          entry.rowNumber,
          decision,
          validatorName,
          noteText
        );
        await loadSpreadsheetData(accessToken, spreadsheet);
        showToast(
          `Berita Acara ${entry.nomorBA} berhasil diperbarui menjadi "${decision}".`
        );
      },
    });
  };

  const handleRevokeValidation = (entry: BeritaAcaraPNBP) => {
    if (!accessToken || !spreadsheet || role === 'user') return;
    setConfirmation({
      title: 'Batalkan Validasi Berita Acara?',
      description: `Status baris ${entry.rowNumber} akan dikembalikan ke "Menunggu Validasi" dan pencetakan PDF dikunci kembali.`,
      details: [
        `Nomor BA: ${entry.nomorBA}`,
        `Wajib Bayar: ${entry.namaWajibBayar}`,
      ],
      confirmLabel: 'Batalkan Validasi',
      variant: 'danger',
      onConfirm: async () => {
        await updateRowValidation(
          accessToken,
          spreadsheet.spreadsheetId,
          spreadsheet.activeDataSheet,
          entry.rowNumber,
          'Menunggu Validasi',
          '',
          ''
        );
        await loadSpreadsheetData(accessToken, spreadsheet);
        showToast(`Validasi ${entry.nomorBA} dibatalkan.`);
      },
    });
  };

  const handleSaveBeritaAcaraToDrive = (
    entry: BeritaAcaraPNBP,
    pdfBlob: Blob,
    fileName: string
  ) => {
    if (!accessToken || !spreadsheet) return;
    setConfirmation({
      title: 'Simpan PDF Berita Acara ke Google Drive?',
      description:
        'PDF Berita Acara PNBP resmi akan disimpan ke Google Drive Anda dan tautannya dicatat ke kolom Link_PDF_BA.',
      details: [`Nama File: ${fileName}`, `Nomor BA: ${entry.nomorBA}`],
      confirmLabel: 'Unggah ke Drive',
      onConfirm: async () => {
        const uploaded = await uploadPdfToDrive(accessToken, fileName, pdfBlob);
        await updateRowPdfLink(
          accessToken,
          spreadsheet.spreadsheetId,
          spreadsheet.activeDataSheet,
          entry.rowNumber,
          uploaded.webViewLink
        );
        await loadSpreadsheetData(accessToken, spreadsheet);
        setPreviewEntry((prev) =>
          prev && prev.rowNumber === entry.rowNumber
            ? { ...prev, linkPdfBA: uploaded.webViewLink }
            : prev
        );
        showToast(`PDF "${fileName}" tersimpan di Google Drive.`);
      },
    });
  };

  const handleSaveRecapToDrive = (
    pdfBlob: Blob,
    fileName: string,
    summaryText: string
  ) => {
    if (!accessToken) return;
    setConfirmation({
      title: 'Simpan PDF Rekapitulasi Bulanan ke Drive?',
      description:
        'Laporan Rekapitulasi Bulanan PNBP Tunai tervalidasi akan diunggah ke akun Google Drive Anda.',
      details: [`File: ${fileName}`, `Cakupan: ${summaryText}`],
      confirmLabel: 'Unggah Rekap PDF',
      onConfirm: async () => {
        await uploadPdfToDrive(accessToken, fileName, pdfBlob);
        showToast(`Rekap "${fileName}" berhasil disimpan di Google Drive.`);
      },
    });
  };

  const handleSaveAgencySettings = (updated: AgencySettings) => {
    if (!accessToken || !spreadsheet || role !== 'superadmin') return;
    setConfirmation({
      title: 'Simpan Pengaturan Kop Surat Instansi?',
      description: `Identitas kop surat dan pimpinan pengesah akan diperbarui pada tab Pengaturan_Instansi di "${spreadsheet.title}".`,
      details: [
        `Instansi: ${updated.namaInstansi}`,
        `Satuan Kerja: ${updated.subUnit}`,
        `Pimpinan: ${updated.namaPimpinan}`,
      ],
      confirmLabel: 'Simpan Pengaturan',
      onConfirm: async () => {
        await saveAgencySettingsToSheet(
          accessToken,
          spreadsheet.spreadsheetId,
          spreadsheet.sheetNames,
          updated
        );
        setAgency(updated);
        if (!spreadsheet.sheetNames.includes('Pengaturan_Instansi')) {
          setSpreadsheet({
            ...spreadsheet,
            sheetNames: [...spreadsheet.sheetNames, 'Pengaturan_Instansi'],
          });
        }
        showToast('Pengaturan instansi tersimpan di Google Sheet.');
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F3F8F8] text-slate-900">
      {/* Top Bar (3-zone contract on desktop, compact <=56px on mobile) */}
      <header className="no-print sticky top-0 z-30 border-b border-teal-900/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:gap-8 lg:px-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('buat')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F766E] font-display text-xs font-bold text-white">
              BK
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              PNBP BKK Kendari
            </span>
          </button>

          {/* Zone 2: 3 Concise Menu Links (Desktop) */}
          <nav
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600"
            aria-label="Menu Utama"
          >
            {MENU_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`whitespace-nowrap shrink-0 border-b-2 py-5 transition-colors ${
                    isActive
                      ? 'border-[#0F766E] font-semibold text-[#0F766E]'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action / Auth */}
          <div className="flex items-center gap-2.5 shrink-0">
            {needsAuth || !accessToken ? (
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
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
                    {isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Workspace Control Strip (Role Switcher & Google Sheet Status) */}
      {!needsAuth && accessToken && (
        <div className="no-print border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                <UserCog className="h-3.5 w-3.5 text-teal-700" />
                Peran Akses:
              </span>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                {(['user', 'admin', 'superadmin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`min-h-[32px] whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      role === r
                        ? 'bg-[#0F766E] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-500 truncate max-w-[220px]">
                {spreadsheet ? (
                  <>
                    Sheet:{' '}
                    <strong className="text-slate-800">
                      {spreadsheet.title}
                    </strong>
                  </>
                ) : (
                  'Belum ada Google Sheet aktif'
                )}
              </span>

              {role === 'superadmin' && (
                <button
                  type="button"
                  onClick={() => setSheetModalOpen(true)}
                  className="inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-teal-700/30 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                >
                  <Database className="h-3.5 w-3.5" />
                  Kelola Google Sheet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts / Toasts */}
      <div className="no-print mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {errorMsg && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 sm:text-sm">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-700 hover:text-red-900"
              aria-label="Tutup pesan galat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {toastMsg && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-900 sm:text-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
              <span>{toastMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-teal-700 hover:text-teal-900"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {needsAuth || !accessToken ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
                Kementerian Kesehatan RI · BKK Kelas I Kendari
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Berita Acara Pembayaran PNBP Tunai & Rekapitulasi Bulanan
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Aplikasi mobile-friendly untuk pencatatan pembayaran PNBP tunai
                saat gangguan sistem elektronik, dilengkapi tanda tangan digital
                langsung pada layar smartphone, validasi oleh Admin, serta
                pencetakan PDF resmi dan penyimpanan Google Sheets yang dikelola
                oleh Super Admin.
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
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
                      {isLoggingIn
                        ? 'Menghubungkan ke Google...'
                        : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <div className="font-semibold text-slate-900">
                    1. Buat Berita Acara
                  </div>
                  <p className="mt-1">
                    Dropdown Nama & NIP Petugas BKK Kendari, nominal otomatis
                    terbilang, dan tanda tangan langsung di smartphone.
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    2. Cetak Berita Acara
                  </div>
                  <p className="mt-1">
                    Admin memvalidasi pengajuan sebelum PDF resmi sesuai
                    template BKK Kelas I Kendari dapat dicetak.
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    3. Cetak Rekapitulasi Bulanan
                  </div>
                  <p className="mt-1">
                    Rekapitulasi PNBP tunai per bulan khusus berkas tervalidasi,
                    siap unduh PDF atau simpan ke Google Drive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Quick prompt if signed in without active spreadsheet */}
            {!spreadsheet && (
              <div className="no-print mb-5 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Siapkan Google Sheet PNBP Tunai
                    </div>
                    <p className="text-xs text-slate-600">
                      {role === 'superadmin'
                        ? 'Buat Google Sheet baru dengan struktur PNBP BKK Kendari atau pilih sheet yang sudah ada di Drive.'
                        : 'Ubah peran ke Super Admin untuk membuat atau menghubungkan Google Sheet penyimpanan data.'}
                    </p>
                  </div>
                </div>
                {role === 'superadmin' ? (
                  <button
                    type="button"
                    onClick={() => setSheetModalOpen(true)}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57]"
                  >
                    <Database className="h-4 w-4" />
                    Buat / Pilih Google Sheet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRole('superadmin')}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-700/30 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Buka Mode Super Admin
                  </button>
                )}
              </div>
            )}

            {activeTab === 'buat' && (
              <CreateBeritaAcaraView
                agency={agency}
                nextSequence={entries.length + 1}
                hasSpreadsheet={Boolean(spreadsheet)}
                onSubmitBeritaAcara={handleSubmitBeritaAcara}
                onRequireAuthOrSheet={() => {
                  if (role !== 'superadmin') setRole('superadmin');
                  setSheetModalOpen(true);
                }}
              />
            )}

            {activeTab === 'cetak' && (
              <CetakBeritaAcaraView
                entries={entries}
                agency={agency}
                role={role}
                loading={loadingData}
                hasSpreadsheet={Boolean(spreadsheet)}
                onRefresh={() =>
                  accessToken &&
                  spreadsheet &&
                  loadSpreadsheetData(accessToken, spreadsheet)
                }
                onPreview={(item) => setPreviewEntry(item)}
                onReviewDecision={(item, decision) => {
                  setReviewNotes(item.catatanAdmin || '');
                  setReviewTarget({ entry: item, decision });
                }}
                onRevokeValidation={handleRevokeValidation}
                onGoCreate={() => setActiveTab('buat')}
                onRequireAuthOrSheet={() => {
                  if (role !== 'superadmin') setRole('superadmin');
                  setSheetModalOpen(true);
                }}
              />
            )}

            {activeTab === 'rekap' && (
              <MonthlyRecapView
                entries={entries}
                agency={agency}
                hasSpreadsheet={Boolean(spreadsheet)}
                onRequestSaveRecapToDrive={handleSaveRecapToDrive}
                onRequireAuthOrSheet={() => {
                  if (role !== 'superadmin') setRole('superadmin');
                  setSheetModalOpen(true);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Thumb Zone, 3 Exact Menus) */}
      {!needsAuth && accessToken && (
        <nav
          className="no-print fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe lg:hidden"
          aria-label="Navigasi Smartphone"
        >
          <div className="grid h-16 grid-cols-3 items-center">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex h-full flex-col items-center justify-center gap-1 px-1 transition-colors ${
                    isActive
                      ? 'text-[#0F766E] font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] tracking-tight whitespace-nowrap">
                    {item.mobileLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Admin Execution & Validation Modal */}
      {reviewTarget && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Eksekusi Validasi Admin"
        >
          <form
            onSubmit={handleSubmitReviewDecision}
            className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Eksekusi Validasi Admin
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {reviewTarget.entry.nomorBA} ·{' '}
                {reviewTarget.entry.namaWajibBayar}
              </p>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Petugas:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {reviewTarget.entry.namaPetugas}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Nominal Tunai:</span>
                  <span className="font-mono font-semibold text-teal-800 tabular-nums">
                    {formatRupiah(reviewTarget.entry.nominalAngka)}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Pilih Keputusan Eksekusi
                </span>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setReviewTarget((prev) =>
                        prev ? { ...prev, decision: 'Disetujui' } : null
                      )
                    }
                    className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      reviewTarget.decision === 'Disetujui'
                        ? 'bg-[#0F766E] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Setujui (Buka Cetak)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReviewTarget((prev) =>
                        prev ? { ...prev, decision: 'Ditolak' } : null
                      )
                    }
                    className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      reviewTarget.decision === 'Ditolak'
                        ? 'bg-red-700 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tolak Berkas
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Catatan Validasi Admin (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    reviewTarget.decision === 'Disetujui'
                      ? 'Contoh: Uang tunai telah diterima bendahara & siap dibuatkan kode billing.'
                      : 'Contoh: Nominal atau NIP belum sesuai, harap input ulang.'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`min-h-[42px] rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                  reviewTarget.decision === 'Disetujui'
                    ? 'bg-[#0F766E] hover:bg-[#0D5D57]'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                Eksekusi Keputusan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* A4 Preview Modal */}
      <BeritaAcaraPreviewModal
        entry={previewEntry}
        agency={agency}
        onClose={() => setPreviewEntry(null)}
        onRequestSaveToDrive={handleSaveBeritaAcaraToDrive}
      />

      {/* Super Admin Sheet & Agency Management Modal */}
      <SuperAdminSheetModal
        open={sheetModalOpen}
        role={role}
        userEmail={user?.email || ''}
        spreadsheet={spreadsheet}
        driveSpreadsheets={driveSpreadsheets}
        loadingDriveList={loadingDriveList}
        loadingData={loadingData}
        agency={agency}
        onClose={() => setSheetModalOpen(false)}
        onCreateSpreadsheet={handleCreateSpreadsheet}
        onConnectSpreadsheet={handleConnectSpreadsheet}
        onSelectDriveSpreadsheet={handleConnectSpreadsheet}
        onChangeDataSheet={handleChangeDataSheet}
        onRefreshDriveList={() =>
          accessToken && refreshDriveList(accessToken, false)
        }
        onSaveAgencySettings={handleSaveAgencySettings}
      />

      {/* Explicit Confirmation Modal for Google Workspace Mutations */}
      <ConfirmModal
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </div>
  );
}
