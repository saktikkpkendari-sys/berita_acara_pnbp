import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Database,
  FilePlus2,
  FileText,
  KeyRound,
  LogOut,
  Printer,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  AgencySettings,
  BeritaAcaraPNBP,
  PendingConfirmation,
  RoleSecurityConfig,
  SpreadsheetInfo,
  StorageMode,
  UserRole,
} from './types';
import { googleSignIn, initAuth, logout } from './services/googleAuth';
import {
  appendBeritaAcaraRow,
  createAutomatedSpreadsheet,
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_VALIDATOR_NAME,
  deleteBeritaAcaraRow,
  DriveSpreadsheetItem,
  fetchAgencySettings,
  fetchSheetEntries,
  fetchSheetSecurityConfig,
  inspectSpreadsheet,
  listAppSpreadsheets,
  saveAgencySettingsToSheet,
  saveSecurityConfigToSheet,
  updateRowBuktiSetor,
  updateRowPdfLink,
  updateRowValidation,
  uploadDocumentToDrive,
  uploadPdfToDrive,
} from './services/googleSheets';
import {
  appendViaAppsScript,
  deleteViaAppsScript,
  fetchViaAppsScript,
  saveBuktiSetorViaAppsScript,
  saveSettingsViaAppsScript,
  validateViaAppsScript,
} from './services/appsScriptBridge';
import {
  loadBridgeUrl,
  loadLocalAgencySettings,
  loadLocalEntries,
  loadLocalSecurityConfig,
  mergeSecurityConfigs,
  saveBridgeUrl,
  saveLocalAgencySettings,
  saveLocalEntries,
  saveLocalSecurityConfig,
} from './services/roleAuth';
import { formatRupiah, loadKopSuratDataUrl } from './services/pdfGenerator';
import { ConfirmModal } from './components/ConfirmModal';
import { BeritaAcaraPreviewModal } from './components/BeritaAcaraPreviewModal';
import { CreateBeritaAcaraView } from './components/CreateBeritaAcaraView';
import { CetakBeritaAcaraView } from './components/CetakBeritaAcaraView';
import { InputBuktiSetorView } from './components/InputBuktiSetorView';
import { MonthlyRecapView } from './components/MonthlyRecapView';
import { SuperAdminSheetModal } from './components/SuperAdminSheetModal';
import { RoleLoginModal } from './components/RoleLoginModal';

const MENU_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'buat',
    label: '1. Buat BA',
    mobileLabel: 'Buat BA',
    icon: FilePlus2,
  },
  {
    id: 'cetak',
    label: '2. Cetak BA',
    mobileLabel: 'Cetak BA',
    icon: Printer,
  },
  {
    id: 'bukti',
    label: '3. Input Bukti Setor',
    mobileLabel: 'Bukti Setor',
    icon: Receipt,
  },
  {
    id: 'rekap',
    label: '4. Rekap Bulanan',
    mobileLabel: 'Rekap',
    icon: FileText,
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User (Petugas)',
  admin: 'Admin (Validator)',
  superadmin: 'Super Admin',
};

async function readFileAsDataUrl(file: File): Promise<{
  dataUrl: string;
  base64: string;
  mimeType: string;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () =>
      reject(new Error('Gagal membaca file dokumen bukti setor.'));
    reader.readAsDataURL(file);
  });
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : '';
  return {
    dataUrl,
    base64,
    mimeType: file.type || 'application/octet-stream',
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState<boolean>(false);

  // Default access is always public 'user' — Admin & Super Admin require password
  const [role, setRole] = useState<UserRole>('user');
  const [activeTab, setActiveTab] = useState<ActiveTab>('buat');

  const [securityConfig, setSecurityConfig] = useState<RoleSecurityConfig>(() =>
    loadLocalSecurityConfig()
  );
  const [bridgeUrl, setBridgeUrl] = useState<string>(() => loadBridgeUrl());

  const [roleLoginOpen, setRoleLoginOpen] = useState<boolean>(false);
  const [roleLoginInitial, setRoleLoginInitial] = useState<
    'admin' | 'superadmin'
  >('admin');

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [entries, setEntries] = useState<BeritaAcaraPNBP[]>(() =>
    loadLocalEntries()
  );
  const [agency, setAgency] = useState<AgencySettings>(() =>
    loadLocalAgencySettings()
  );
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
  const [reviewValidator, setReviewValidator] = useState<string>(
    DEFAULT_VALIDATOR_NAME
  );
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null
  );

  const storageMode: StorageMode = useMemo(() => {
    if (accessToken && spreadsheet) return 'google-sheet';
    if (bridgeUrl) return 'apps-script';
    return 'local';
  }, [accessToken, spreadsheet, bridgeUrl]);

  const pendingCount = useMemo(
    () => entries.filter((e) => e.statusValidasi === 'Menunggu Validasi').length,
    [entries]
  );

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? null : prev));
    }, 4500);
  }, []);

  useEffect(() => {
    void loadKopSuratDataUrl();
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
      },
      (maybeUser) => {
        setUser(maybeUser);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadBridgeData = useCallback(async (url: string) => {
    if (!url) return;
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const result = await fetchViaAppsScript(url);
      setEntries(result.entries);
      setAgency(result.agency);
      saveLocalAgencySettings(result.agency);
      setSecurityConfig((prev) => {
        const merged = mergeSecurityConfigs(prev, result.security);
        saveLocalSecurityConfig(merged);
        return merged;
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data publik dari Google Sheet.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken && bridgeUrl) {
      void loadBridgeData(bridgeUrl);
    }
  }, [accessToken, bridgeUrl, loadBridgeData]);

  const loadSpreadsheetData = useCallback(
    async (token: string, info: SpreadsheetInfo) => {
      setLoadingData(true);
      setErrorMsg(null);
      try {
        const [loadedEntries, loadedSettings, sheetSec] = await Promise.all([
          fetchSheetEntries(token, info.spreadsheetId, info.activeDataSheet),
          fetchAgencySettings(token, info.spreadsheetId, info.sheetNames),
          fetchSheetSecurityConfig(token, info.spreadsheetId, info.sheetNames),
        ]);
        setEntries(loadedEntries);
        setAgency(loadedSettings);
        saveLocalAgencySettings(loadedSettings);
        setSecurityConfig((prev) => {
          const merged = mergeSecurityConfigs(prev, sheetSec.security);
          saveLocalSecurityConfig(merged);
          return merged;
        });
        if (sheetSec.appsScriptUrl && !bridgeUrl) {
          setBridgeUrl(sheetSec.appsScriptUrl);
          saveBridgeUrl(sheetSec.appsScriptUrl);
        }
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
    [bridgeUrl]
  );

  const refreshCurrentData = useCallback(async () => {
    if (storageMode === 'google-sheet' && accessToken && spreadsheet) {
      await loadSpreadsheetData(accessToken, spreadsheet);
    } else if (storageMode === 'apps-script' && bridgeUrl) {
      await loadBridgeData(bridgeUrl);
    } else {
      setEntries(loadLocalEntries());
    }
  }, [
    storageMode,
    accessToken,
    spreadsheet,
    bridgeUrl,
    loadSpreadsheetData,
    loadBridgeData,
  ]);

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

  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        showToast(
          `Akun Google terhubung: ${res.user.email || res.user.displayName}`
        );
        await refreshDriveList(res.accessToken, true);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Pastikan pop-up browser diizinkan.'
      );
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setSpreadsheet(null);
    setDriveSpreadsheets([]);
    if (bridgeUrl) {
      await loadBridgeData(bridgeUrl);
    } else {
      setEntries(loadLocalEntries());
    }
    showToast('Koneksi Google Workspace diputus.');
  };

  const handleSaveSecurityConfig = async (updated: RoleSecurityConfig) => {
    setSecurityConfig(updated);
    saveLocalSecurityConfig(updated);

    if (accessToken && spreadsheet) {
      await saveSecurityConfigToSheet(
        accessToken,
        spreadsheet.spreadsheetId,
        spreadsheet.sheetNames,
        agency,
        updated,
        bridgeUrl
      );
      if (!spreadsheet.sheetNames.includes('Pengaturan_Instansi')) {
        setSpreadsheet({
          ...spreadsheet,
          sheetNames: [...spreadsheet.sheetNames, 'Pengaturan_Instansi'],
        });
      }
    } else if (bridgeUrl) {
      await saveSettingsViaAppsScript(bridgeUrl, agency, updated);
    }
  };

  const handleSaveBridgeUrl = async (url: string) => {
    setBridgeUrl(url);
    saveBridgeUrl(url);

    if (accessToken && spreadsheet) {
      await saveSecurityConfigToSheet(
        accessToken,
        spreadsheet.spreadsheetId,
        spreadsheet.sheetNames,
        agency,
        securityConfig,
        url
      );
    }

    if (url && !(accessToken && spreadsheet)) {
      await loadBridgeData(url);
      showToast('URL koneksi publik Google Sheet berhasil disimpan & dimuat.');
    } else if (!url) {
      showToast('URL koneksi publik dihapus.');
    } else {
      showToast('URL koneksi publik disimpan ke Pengaturan Instansi.');
    }
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
          if (securityConfig.admin || securityConfig.superadmin || bridgeUrl) {
            await saveSecurityConfigToSheet(
              accessToken,
              info.spreadsheetId,
              info.sheetNames,
              agency,
              securityConfig,
              bridgeUrl
            );
          }
          setSpreadsheet(info);
          await Promise.all([
            loadSpreadsheetData(accessToken, info),
            refreshDriveList(accessToken, false),
          ]);
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
    const targetDesc =
      storageMode === 'google-sheet'
        ? `Data beserta tanda tangan digital akan dikirim ke tab ${spreadsheet?.activeDataSheet} dengan status awal "Menunggu Validasi".`
        : storageMode === 'apps-script'
        ? 'Data beserta tanda tangan digital akan dikirim ke Google Sheet pusat dengan status awal "Menunggu Validasi".'
        : 'Data beserta tanda tangan digital akan disimpan ke penyimpanan perangkat ini dengan status awal "Menunggu Validasi".';

    setConfirmation({
      title: 'Simpan Berita Acara PNBP?',
      description: targetDesc,
      details: [
        `Nomor BA: ${payload.nomorBA}`,
        `Petugas: ${payload.namaPetugas} (NIP. ${payload.nipPetugas})`,
        `Wajib Bayar: ${payload.namaWajibBayar}`,
        `Nominal PNBP: ${formatRupiah(payload.nominalAngka)}`,
      ],
      confirmLabel: 'Simpan Berita Acara',
      onConfirm: async () => {
        if (storageMode === 'google-sheet' && accessToken && spreadsheet) {
          await appendBeritaAcaraRow(
            accessToken,
            spreadsheet.spreadsheetId,
            spreadsheet.activeDataSheet,
            payload
          );
          await loadSpreadsheetData(accessToken, spreadsheet);
        } else if (storageMode === 'apps-script' && bridgeUrl) {
          await appendViaAppsScript(bridgeUrl, payload);
          await loadBridgeData(bridgeUrl);
        } else {
          const current = loadLocalEntries();
          const newItem: BeritaAcaraPNBP = {
            ...payload,
            rowNumber: current.length + 2,
            statusValidasi: 'Menunggu Validasi',
            validatorAdmin: '',
            tanggalValidasi: '',
            catatanAdmin: '',
            linkPdfBA: '',
          };
          const next = [newItem, ...current];
          saveLocalEntries(next);
          setEntries(next);
        }
        showToast(
          `Berita Acara ${payload.nomorBA} tersimpan. Menunggu validasi Admin.`
        );
        setActiveTab('cetak');
      },
    });
  };

  const handleSubmitReviewDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || role === 'user') return;

    const { entry, decision } = reviewTarget;
    const validatorName = reviewValidator.trim() || DEFAULT_VALIDATOR_NAME;
    const noteText = reviewNotes.trim();

    setReviewTarget(null);
    setConfirmation({
      title:
        decision === 'Disetujui'
          ? 'Konfirmasi Eksekusi & Persetujuan Cetak PDF'
          : 'Konfirmasi Penolakan Berita Acara',
      description:
        decision === 'Disetujui'
          ? `Berita Acara ${entry.nomorBA} akan disetujui sehingga User dapat mencetak PDF resmi dan masuk Rekapitulasi Bulanan.`
          : `Berita Acara ${entry.nomorBA} akan ditolak dan tetap terkunci dari pencetakan PDF.`,
      details: [
        `Wajib Bayar: ${entry.namaWajibBayar}`,
        `Nominal PNBP: ${formatRupiah(entry.nominalAngka)}`,
        `Validator: ${validatorName}`,
        `Catatan: ${noteText || '-'}`,
      ],
      confirmLabel:
        decision === 'Disetujui' ? 'Eksekusi & Setujui' : 'Eksekusi Penolakan',
      variant: decision === 'Ditolak' ? 'danger' : 'primary',
      onConfirm: async () => {
        if (storageMode === 'google-sheet' && accessToken && spreadsheet) {
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
        } else if (storageMode === 'apps-script' && bridgeUrl) {
          await validateViaAppsScript(
            bridgeUrl,
            entry.rowNumber,
            decision,
            validatorName,
            noteText
          );
          await loadBridgeData(bridgeUrl);
        } else {
          const today = new Date().toISOString().slice(0, 10);
          const next = loadLocalEntries().map((item) =>
            item.idBA === entry.idBA && item.rowNumber === entry.rowNumber
              ? {
                  ...item,
                  statusValidasi: decision,
                  validatorAdmin: validatorName,
                  tanggalValidasi: today,
                  catatanAdmin: noteText,
                }
              : item
          );
          saveLocalEntries(next);
          setEntries(next);
        }
        showToast(
          `Berita Acara ${entry.nomorBA} dieksekusi menjadi "${decision}".`
        );
      },
    });
  };

  const handleRevokeValidation = (entry: BeritaAcaraPNBP) => {
    if (role === 'user') return;
    setConfirmation({
      title: 'Batalkan Validasi Berita Acara?',
      description: `Status Berita Acara ${entry.nomorBA} akan dikembalikan ke "Menunggu Validasi" dan pencetakan PDF dikunci kembali.`,
      details: [
        `Nomor BA: ${entry.nomorBA}`,
        `Wajib Bayar: ${entry.namaWajibBayar}`,
      ],
      confirmLabel: 'Batalkan Validasi',
      variant: 'danger',
      onConfirm: async () => {
        if (storageMode === 'google-sheet' && accessToken && spreadsheet) {
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
        } else if (storageMode === 'apps-script' && bridgeUrl) {
          await validateViaAppsScript(
            bridgeUrl,
            entry.rowNumber,
            'Menunggu Validasi',
            '',
            ''
          );
          await loadBridgeData(bridgeUrl);
        } else {
          const next = loadLocalEntries().map((item) =>
            item.idBA === entry.idBA && item.rowNumber === entry.rowNumber
              ? {
                  ...item,
                  statusValidasi: 'Menunggu Validasi' as const,
                  validatorAdmin: '',
                  tanggalValidasi: '',
                  catatanAdmin: '',
                }
              : item
          );
          saveLocalEntries(next);
          setEntries(next);
        }
        showToast(`Validasi ${entry.nomorBA} dibatalkan.`);
      },
    });
  };

  const handleSaveBuktiSetor = (
    entry: BeritaAcaraPNBP,
    payload: {
      kodeBilling: string;
      kodeNtpn: string;
      file: File | null;
    }
  ) => {
    const fileLabel = payload.file
      ? payload.file.name
      : entry.buktiSetorNama || 'Tidak ada lampiran';

    setConfirmation({
      title: 'Simpan Data Bukti Setor PNBP?',
      description: `Kode Billing, Kode NTPN, dan dokumen bukti setor untuk Berita Acara ${entry.nomorBA} akan diperbarui dan ditampilkan pada Rekap Bulanan.`,
      details: [
        `Nomor BA: ${entry.nomorBA}`,
        `Pengguna Jasa: ${entry.namaWajibBayar}`,
        `Kode Billing: ${payload.kodeBilling || '-'}`,
        `Kode NTPN: ${payload.kodeNtpn || '-'}`,
        `Dokumen Bukti Setor: ${fileLabel}`,
      ],
      confirmLabel: 'Simpan Bukti Setor',
      onConfirm: async () => {
        let nextUrl = entry.buktiSetorUrl || '';
        let nextName = entry.buktiSetorNama || '';

        if (storageMode === 'google-sheet' && accessToken && spreadsheet) {
          if (payload.file) {
            const uploaded = await uploadDocumentToDrive(
              accessToken,
              `BuktiSetor_${entry.nomorBA.replace(/[^a-zA-Z0-9_-]/g, '_')}_${payload.file.name}`,
              payload.file,
              payload.file.type || 'application/octet-stream'
            );
            nextUrl = uploaded.webViewLink;
            nextName = payload.file.name;
          }
          await updateRowBuktiSetor(
            accessToken,
            spreadsheet.spreadsheetId,
            spreadsheet.activeDataSheet,
            entry.rowNumber,
            payload.kodeBilling,
            payload.kodeNtpn,
            nextUrl,
            nextName
          );
          await loadSpreadsheetData(accessToken, spreadsheet);
        } else if (storageMode === 'apps-script' && bridgeUrl) {
          let fileBase64: string | undefined;
          let fileMimeType: string | undefined;
          if (payload.file) {
            const encoded = await readFileAsDataUrl(payload.file);
            fileBase64 = encoded.base64;
            fileMimeType = encoded.mimeType;
            nextName = payload.file.name;
          }
          await saveBuktiSetorViaAppsScript(bridgeUrl, {
            rowNumber: entry.rowNumber,
            kodeBilling: payload.kodeBilling,
            kodeNtpn: payload.kodeNtpn,
            buktiSetorUrl: nextUrl,
            buktiSetorNama: nextName,
            fileBase64,
            fileMimeType,
          });
          await loadBridgeData(bridgeUrl);
        } else {
          if (payload.file) {
            const encoded = await readFileAsDataUrl(payload.file);
            nextUrl = encoded.dataUrl;
            nextName = payload.file.name;
          }
          const next = loadLocalEntries().map((item) =>
            item.idBA === entry.idBA && item.rowNumber === entry.rowNumber
              ? {
                  ...item,
                  kodeBilling: payload.kodeBilling,
                  kodeNtpn: payload.kodeNtpn,
                  buktiSetorUrl: nextUrl,
                  buktiSetorNama: nextName,
                }
              : item
          );
          saveLocalEntries(next);
          setEntries(next);
        }

        showToast(
          `Bukti setor untuk ${entry.nomorBA} berhasil disimpan ke Rekap.`
        );
        setActiveTab('buat');
      },
    });
  };

  const handleDeleteBeritaAcara = (entry: BeritaAcaraPNBP) => {
    if (role !== 'superadmin') return;
    setConfirmation({
      title: 'Hapus Berita Acara & Rekapitulasi?',
      description: `Hanya Super Admin yang berwenang menghapus Berita Acara (${entry.statusValidasi}). Setelah dihapus, Nomor Urut Berita Acara berikutnya otomatis menyesuaikan ke nomor urut ${entry.nomorBA}.`,
      details: [
        `Nomor BA: ${entry.nomorBA}`,
        `Status Saat Ini: ${entry.statusValidasi}`,
        `Petugas: ${entry.namaPetugas}`,
        `Pengguna Jasa: ${entry.namaWajibBayar}`,
        `Nominal PNBP: ${formatRupiah(entry.nominalAngka)}`,
      ],
      confirmLabel: 'Hapus Permanen',
      variant: 'danger',
      onConfirm: async () => {
        if (storageMode === 'google-sheet' && accessToken && spreadsheet) {
          await deleteBeritaAcaraRow(
            accessToken,
            spreadsheet.spreadsheetId,
            spreadsheet.activeDataSheet,
            entry.rowNumber
          );
          await loadSpreadsheetData(accessToken, spreadsheet);
        } else if (storageMode === 'apps-script' && bridgeUrl) {
          await deleteViaAppsScript(bridgeUrl, entry.rowNumber, entry.idBA);
          await loadBridgeData(bridgeUrl);
        } else {
          const filtered = loadLocalEntries()
            .filter(
              (item) =>
                !(item.idBA === entry.idBA && item.rowNumber === entry.rowNumber)
            )
            .map((item, idx) => ({ ...item, rowNumber: idx + 2 }));
          saveLocalEntries(filtered);
          setEntries(filtered);
        }
        if (previewEntry?.idBA === entry.idBA) {
          setPreviewEntry(null);
        }
        showToast(
          `Berita Acara ${entry.nomorBA} dihapus. Nomor Urut BA berikutnya menyesuaikan ke nomor yang dihapus.`
        );
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
    if (role !== 'superadmin') return;
    setConfirmation({
      title: 'Simpan Pengaturan Instansi & Penomoran BA?',
      description: `Identitas instansi, pimpinan pengesah, serta aturan Nomor Urut Berita Acara akan diperbarui untuk dokumen BA & Rekap Bulanan.`,
      details: [
        `Instansi: ${updated.namaInstansi}`,
        `Satuan Kerja: ${updated.subUnit}`,
        `Jabatan Pengesahan: ${updated.jabatanPimpinan}`,
        `Pimpinan: ${updated.namaPimpinan}`,
        `Format Nomor: Mulai #${updated.nomorUrutMulai} · ${updated.kodeSuratPrefix} (${updated.resetNomorMode})`,
      ],
      confirmLabel: 'Simpan Pengaturan',
      onConfirm: async () => {
        saveLocalAgencySettings(updated);
        setAgency(updated);

        if (accessToken && spreadsheet) {
          await saveAgencySettingsToSheet(
            accessToken,
            spreadsheet.spreadsheetId,
            spreadsheet.sheetNames,
            updated
          );
          if (!spreadsheet.sheetNames.includes('Pengaturan_Instansi')) {
            setSpreadsheet({
              ...spreadsheet,
              sheetNames: [...spreadsheet.sheetNames, 'Pengaturan_Instansi'],
            });
          }
        } else if (bridgeUrl) {
          await saveSettingsViaAppsScript(bridgeUrl, updated, securityConfig);
        }
        showToast('Pengaturan instansi berhasil disimpan.');
      },
    });
  };

  const openRoleLogin = (preferred: 'admin' | 'superadmin') => {
    setRoleLoginInitial(preferred);
    setRoleLoginOpen(true);
  };

  const handleExitPrivilegedRole = () => {
    setRole('user');
    setSheetModalOpen(false);
    setReviewTarget(null);
    showToast('Kembali ke mode akses publik User (Petugas).');
  };

  return (
    <div className="min-h-screen bg-[#F4FAFA] text-slate-900">
      {/* Kemenkes Top Accent Bar */}
      <div className="no-print h-1 w-full bg-gradient-to-r from-[#007376] via-[#10b1aa] to-[#d1db26]" />

      {/* Top Bar (Adapted per User Role) */}
      <header className="no-print sticky top-0 z-30 border-b border-[#10b1aa]/20 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:gap-6 lg:px-8">
          {/* Zone 1: Brand wordmark + role badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('buat')}
              className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#007376] to-[#10b1aa] font-display text-xs font-bold text-white ring-2 ring-[#d1db26]/70">
                BK
              </span>
              <span className="font-display text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                PNBP BKK Kendari
              </span>
            </button>
            <span
              className={`hidden sm:inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                role === 'superadmin'
                  ? 'border-[#007376] bg-[#007376] text-white'
                  : role === 'admin'
                  ? 'border-[#10b1aa]/40 bg-[#c7edec]/60 text-[#007376]'
                  : 'border-[#bfbfbf]/70 bg-slate-100 text-[#63625e]'
              }`}
            >
              {role === 'user' ? (
                <UserIcon className="h-3 w-3" />
              ) : (
                <ShieldCheck className="h-3 w-3" />
              )}
              {ROLE_LABELS[role]}
            </span>
          </div>

          {/* Zone 2: 4 Concise Menu Links (Desktop) */}
          <nav
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#63625e]"
            aria-label="Menu Utama"
          >
            {MENU_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const showPendingCount =
                role !== 'user' && item.id === 'cetak' && pendingCount > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border-b-2 py-5 transition-colors ${
                    isActive
                      ? 'border-[#007376] font-semibold text-[#007376]'
                      : 'border-transparent hover:text-[#007376]'
                  }`}
                >
                  <span>{item.label}</span>
                  {showPendingCount && (
                    <span className="rounded bg-[#f4f7c2] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#63625e] tabular-nums">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Role-Adapted Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {role === 'user' && (
              <button
                type="button"
                onClick={() => openRoleLogin('admin')}
                className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#10b1aa]/40 bg-[#c7edec]/50 px-3 py-1.5 text-xs font-semibold text-[#007376] hover:bg-[#c7edec]"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Masuk Admin</span>
              </button>
            )}

            {role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => openRoleLogin('superadmin')}
                  className="hidden sm:inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#bfbfbf] bg-white px-3 py-1.5 text-xs font-medium text-[#63625e] hover:bg-slate-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Super Admin
                </button>
                <button
                  type="button"
                  onClick={handleExitPrivilegedRole}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#bfbfbf] bg-white px-3 py-1.5 text-xs font-medium text-[#63625e] hover:bg-slate-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar Admin</span>
                </button>
              </>
            )}

            {role === 'superadmin' && (
              <>
                <button
                  type="button"
                  onClick={() => setSheetModalOpen(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#007376] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005e60]"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Menu Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={handleExitPrivilegedRole}
                  className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#bfbfbf] bg-white px-3 py-1.5 text-xs font-medium text-[#63625e] hover:bg-slate-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Role-Specific Context Strip */}
      <div
        className={`no-print border-b ${
          role === 'superadmin'
            ? 'border-[#005e60] bg-[#007376] text-white'
            : role === 'admin'
            ? 'border-[#10b1aa]/30 bg-[#c7edec]/45 text-[#007376]'
            : 'border-[#bfbfbf]/50 bg-white text-[#63625e]'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            {role === 'user' && (
              <>
                <UserIcon className="h-3.5 w-3.5 text-[#10b1aa] shrink-0" />
                <span>
                  Akses Publik <strong>User (Petugas)</strong> &middot;{' '}
                  {storageMode === 'google-sheet'
                    ? `Terhubung Sheet: ${spreadsheet?.title}`
                    : storageMode === 'apps-script'
                    ? 'Terhubung ke Google Sheet Pusat'
                    : 'Mode Siap Input (Penyimpanan Perangkat)'}
                </span>
              </>
            )}
            {role === 'admin' && (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-[#007376] shrink-0" />
                <span>
                  <strong>Mode Admin (Validator)</strong> &middot;{' '}
                  {pendingCount > 0
                    ? `${pendingCount} Berita Acara menunggu eksekusi validasi`
                    : 'Semua Berita Acara telah dieksekusi'}
                </span>
              </>
            )}
            {role === 'superadmin' && (
              <>
                <Database className="h-3.5 w-3.5 text-[#d1db26] shrink-0" />
                <span>
                  <strong>Mode Super Admin</strong> &middot;{' '}
                  {spreadsheet
                    ? `Sheet Aktif: ${spreadsheet.title}`
                    : bridgeUrl
                    ? 'Terhubung Bridge Publik Google Sheet'
                    : 'Kelola Google Sheet, Nomor BA & Penghapusan Data'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {role === 'admin' && pendingCount > 0 && activeTab !== 'cetak' && (
              <button
                type="button"
                onClick={() => setActiveTab('cetak')}
                className="inline-flex min-h-[30px] items-center rounded-md bg-[#007376] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#005e60]"
              >
                Buka Antrean Eksekusi ({pendingCount})
              </button>
            )}
            {role === 'superadmin' && (
              <button
                type="button"
                onClick={() => setSheetModalOpen(true)}
                className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/25"
              >
                Atur Sheet & Sandi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts / Toasts */}
      <div className="no-print mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {errorMsg && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#c00000]/30 bg-red-50 px-4 py-3 text-xs text-[#c00000] sm:text-sm">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#c00000]" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-[#c00000] hover:opacity-80"
              aria-label="Tutup pesan galat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {toastMsg && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#10b1aa]/40 bg-[#c7edec]/70 px-4 py-3 text-xs text-[#007376] sm:text-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#007376]" />
              <span className="font-medium">{toastMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-[#007376] hover:opacity-80"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content — Always accessible by anyone as User */}
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {activeTab === 'buat' && (
          <CreateBeritaAcaraView
            agency={agency}
            entries={entries}
            role={role}
            hasSpreadsheet={true}
            onSubmitBeritaAcara={handleSubmitBeritaAcara}
            onRequireAuthOrSheet={() => {
              if (role === 'superadmin') {
                setSheetModalOpen(true);
              } else {
                openRoleLogin('superadmin');
              }
            }}
          />
        )}

        {activeTab === 'cetak' && (
          <CetakBeritaAcaraView
            entries={entries}
            agency={agency}
            role={role}
            loading={loadingData}
            hasSpreadsheet={true}
            onRefresh={refreshCurrentData}
            onPreview={(item) => setPreviewEntry(item)}
            onReviewDecision={(item, decision) => {
              setReviewValidator(item.validatorAdmin || DEFAULT_VALIDATOR_NAME);
              setReviewNotes(item.catatanAdmin || '');
              setReviewTarget({ entry: item, decision });
            }}
            onRevokeValidation={handleRevokeValidation}
            onDeleteEntry={handleDeleteBeritaAcara}
            onGoCreate={() => setActiveTab('buat')}
            onRequireAuthOrSheet={() => {
              if (role === 'superadmin') {
                setSheetModalOpen(true);
              } else {
                openRoleLogin('superadmin');
              }
            }}
          />
        )}

        {activeTab === 'bukti' && (
          <InputBuktiSetorView
            entries={entries}
            loading={loadingData}
            onSaveBuktiSetor={handleSaveBuktiSetor}
          />
        )}

        {activeTab === 'rekap' && (
          <MonthlyRecapView
            entries={entries}
            agency={agency}
            role={role}
            hasSpreadsheet={true}
            canSaveToDrive={Boolean(accessToken && spreadsheet)}
            onDeleteEntry={handleDeleteBeritaAcara}
            onRequestSaveRecapToDrive={handleSaveRecapToDrive}
            onRequireAuthOrSheet={() => {
              if (role === 'superadmin') {
                setSheetModalOpen(true);
              } else {
                openRoleLogin('superadmin');
              }
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Thumb Zone, 4 Menus) */}
      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-30 border-t border-[#10b1aa]/25 bg-white/95 backdrop-blur-md pb-safe lg:hidden"
        aria-label="Navigasi Smartphone"
      >
        <div className="grid h-16 grid-cols-4 items-center">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showBadge =
              role !== 'user' && item.id === 'cetak' && pendingCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex h-full flex-col items-center justify-center gap-1 px-1 transition-colors ${
                  isActive
                    ? 'text-[#007376] font-semibold'
                    : 'text-[#898984] hover:text-[#007376]'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {showBadge && (
                    <span className="absolute -right-2.5 -top-1 rounded bg-[#e4872d] px-1 text-[9px] font-bold text-white tabular-nums">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] tracking-tight whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Role Password Login Modal (Admin / Super Admin) */}
      <RoleLoginModal
        open={roleLoginOpen}
        initialRole={roleLoginInitial}
        securityConfig={securityConfig}
        onClose={() => setRoleLoginOpen(false)}
        onSuccess={(unlockedRole) => {
          setRole(unlockedRole);
          showToast(`Berhasil masuk sebagai ${ROLE_LABELS[unlockedRole]}.`);
        }}
        onSetupInitialSuperAdmin={handleSaveSecurityConfig}
      />

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
                  <span className="font-mono font-semibold text-[#007376] tabular-nums">
                    {formatRupiah(reviewTarget.entry.nominalAngka)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Validator Pengesah (Default)
                </label>
                <input
                  type="text"
                  required
                  value={reviewValidator}
                  onChange={(e) => setReviewValidator(e.target.value)}
                  placeholder={DEFAULT_VALIDATOR_NAME}
                  className="mt-1.5 min-h-[42px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#007376] focus:outline-none"
                />
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
                        ? 'bg-[#007376] text-white shadow-sm'
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
                        ? 'bg-[#c00000] text-white shadow-sm'
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
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#007376] focus:outline-none"
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
                    ? 'bg-[#007376] hover:bg-[#005e60]'
                    : 'bg-[#c00000] hover:bg-red-800'
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
        canSaveToDrive={Boolean(accessToken && spreadsheet)}
        onClose={() => setPreviewEntry(null)}
        onRequestSaveToDrive={handleSaveBeritaAcaraToDrive}
      />

      {/* Super Admin Sheet, Agency & Password Management Modal */}
      <SuperAdminSheetModal
        open={sheetModalOpen}
        role={role}
        userEmail={user?.email || ''}
        hasGoogleAuth={Boolean(accessToken)}
        isLoggingInGoogle={isLoggingInGoogle}
        spreadsheet={spreadsheet}
        driveSpreadsheets={driveSpreadsheets}
        loadingDriveList={loadingDriveList}
        loadingData={loadingData}
        entries={entries}
        agency={agency}
        securityConfig={securityConfig}
        bridgeUrl={bridgeUrl}
        onClose={() => setSheetModalOpen(false)}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        onCreateSpreadsheet={handleCreateSpreadsheet}
        onConnectSpreadsheet={handleConnectSpreadsheet}
        onSelectDriveSpreadsheet={handleConnectSpreadsheet}
        onChangeDataSheet={handleChangeDataSheet}
        onRefreshDriveList={() =>
          accessToken && refreshDriveList(accessToken, false)
        }
        onSaveAgencySettings={handleSaveAgencySettings}
        onSaveSecurityConfig={handleSaveSecurityConfig}
        onSaveBridgeUrl={handleSaveBridgeUrl}
        onDeleteEntry={handleDeleteBeritaAcara}
      />

      {/* Explicit Confirmation Modal for Mutations */}
      <ConfirmModal
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </div>
  );
}
