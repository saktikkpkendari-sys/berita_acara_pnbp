import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FilePlus2,
  FileSpreadsheet,
  FolderSync,
  RefreshCw,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AgencySettings, SpreadsheetInfo, UserRole } from '../types';
import { DriveSpreadsheetItem } from '../services/googleSheets';
import { generateFreeAppsScript } from '../services/appsScriptTemplate';

interface SuperAdminSheetModalProps {
  open: boolean;
  role: UserRole;
  userEmail: string;
  spreadsheet: SpreadsheetInfo | null;
  driveSpreadsheets: DriveSpreadsheetItem[];
  loadingDriveList: boolean;
  loadingData: boolean;
  agency: AgencySettings;
  onClose: () => void;
  onCreateSpreadsheet: (title: string, includeSample: boolean) => void;
  onConnectSpreadsheet: (urlOrId: string) => void;
  onSelectDriveSpreadsheet: (id: string) => void;
  onChangeDataSheet: (tabName: string) => void;
  onRefreshDriveList: () => void;
  onSaveAgencySettings: (updated: AgencySettings) => void;
}

export const SuperAdminSheetModal: React.FC<SuperAdminSheetModalProps> = ({
  open,
  role,
  userEmail,
  spreadsheet,
  driveSpreadsheets,
  loadingDriveList,
  loadingData,
  agency,
  onClose,
  onCreateSpreadsheet,
  onConnectSpreadsheet,
  onSelectDriveSpreadsheet,
  onChangeDataSheet,
  onRefreshDriveList,
  onSaveAgencySettings,
}) => {
  const [section, setSection] = useState<'sheet' | 'instansi' | 'script'>(
    'sheet'
  );
  const [newTitle, setNewTitle] = useState<string>(
    'Berita Acara PNBP Tunai & Rekap Bulanan - BKK Kelas I Kendari'
  );
  const [includeSample, setIncludeSample] = useState<boolean>(true);
  const [connectUrl, setConnectUrl] = useState<string>('');
  const [agencyForm, setAgencyForm] = useState<AgencySettings>(agency);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  useEffect(() => {
    setAgencyForm(agency);
  }, [agency]);

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

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Google Sheet Super Admin"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Pengelolaan Google Sheet & Instansi (Super Admin)
            </h2>
            <p className="text-xs text-slate-500">
              Akses editing struktur Google Sheet, tautan Spreadsheet, dan Kop
              Surat dibatasi khusus untuk Super Admin.
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
              <strong className="uppercase">{role}</strong>. Pengubahan koneksi,
              pembuatan, dan pengeditan pengaturan Google Sheet hanya dapat
              dilakukan oleh <strong>Super Admin</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Inner Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-5 py-2.5 sm:px-6">
              {(
                [
                  { id: 'sheet', label: 'Koneksi & Daftar Sheet' },
                  { id: 'instansi', label: 'Kop Surat & Pejabat' },
                  { id: 'script', label: 'Apps Script Gratis' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id)}
                  className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    section === tab.id
                      ? 'bg-[#0F766E] text-white'
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
                          onChange={(e) => setIncludeSample(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-teal-700"
                        />
                        Sertakan 2 contoh Berita Acara PNBP awal & 72 Referensi
                        Petugas
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
                            onChange={(e) => onChangeDataSheet(e.target.value)}
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
                        Belum ada Google Sheet yang terdaftar melalui aplikasi
                        ini di Drive Anda.
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
                                onClick={() => onSelectDriveSpreadsheet(file.id)}
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

              {section === 'instansi' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSaveAgencySettings(agencyForm);
                  }}
                  className="space-y-4"
                >
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
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs"
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
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!spreadsheet}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57] disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Simpan ke Pengaturan_Instansi
                    </button>
                  </div>
                </form>
              )}

              {section === 'script' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-600">
                      Salin skrip <code>Code.gs</code> berikut untuk otomasi
                      menu validasi & ekspor PDF gratis langsung di Google
                      Sheets.
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
