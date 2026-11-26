import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Printer,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { BULAN_INDO } from '../data/petugasList';
import { AgencySettings, BeritaAcaraPNBP, UserRole } from '../types';
import {
  formatRupiah,
  formatTanggalIndo,
  generateMonthlyRecapPdf,
  KOP_SURAT_IMAGE_URL,
  triggerPrintA4,
} from '../services/pdfGenerator';

interface MonthlyRecapViewProps {
  entries: BeritaAcaraPNBP[];
  agency: AgencySettings;
  role: UserRole;
  hasSpreadsheet: boolean;
  canSaveToDrive?: boolean;
  onDeleteEntry: (entry: BeritaAcaraPNBP) => void;
  onRequestSaveRecapToDrive: (
    pdfBlob: Blob,
    fileName: string,
    summaryText: string
  ) => void;
  onRequireAuthOrSheet: () => void;
}

export const MonthlyRecapView: React.FC<MonthlyRecapViewProps> = ({
  entries,
  agency,
  role,
  canSaveToDrive = false,
  onDeleteEntry,
  onRequestSaveRecapToDrive,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [printingA4, setPrintingA4] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear(), now.getFullYear() - 1]);
    entries.forEach((item) => {
      const y = Number((item.tanggalInput || '').slice(0, 4));
      if (y >= 2020 && y <= 2035) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, now]);

  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const entriesInMonth = useMemo(
    () => entries.filter((e) => (e.tanggalInput || '').startsWith(monthPrefix)),
    [entries, monthPrefix]
  );

  const validatedEntries = useMemo(
    () => entriesInMonth.filter((e) => e.statusValidasi === 'Disetujui'),
    [entriesInMonth]
  );

  const excludedCount = entriesInMonth.length - validatedEntries.length;
  const totalNominal = validatedEntries.reduce(
    (sum, e) => sum + e.nominalAngka,
    0
  );
  const isSuperAdmin = role === 'superadmin';
  const monthLabel = BULAN_INDO[selectedMonth - 1] || String(selectedMonth);

  const handleDownloadPdf = async () => {
    const { blob, fileName } = await generateMonthlyRecapPdf(
      validatedEntries,
      selectedMonth,
      selectedYear,
      agency,
      excludedCount
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToDrive = async () => {
    const { blob, fileName } = await generateMonthlyRecapPdf(
      validatedEntries,
      selectedMonth,
      selectedYear,
      agency,
      excludedCount
    );
    onRequestSaveRecapToDrive(
      blob,
      fileName,
      `${validatedEntries.length} Berita Acara PNBP tervalidasi periode ${monthLabel} ${selectedYear}`
    );
  };

  const handlePrintA4 = async () => {
    if (validatedEntries.length === 0 || printingA4) return;
    setPrintingA4(true);
    setPrintNotice(null);
    try {
      const result = await triggerPrintA4(() =>
        generateMonthlyRecapPdf(
          validatedEntries,
          selectedMonth,
          selectedYear,
          agency,
          excludedCount,
          { autoPrint: true }
        )
      );
      if (result === 'fallback-pdf') {
        setPrintNotice(
          'Mode pratinjau/iframe membatasi dialog cetak langsung browser. File PDF Rekap Siap Cetak A4 telah diunduh otomatis — buka file tersebut untuk langsung mencetak (Ctrl+P).'
        );
      }
    } finally {
      setPrintingA4(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Controls & Filter Bar */}
      <div className="no-print flex flex-col gap-4 rounded-2xl border border-[#10b1aa]/25 bg-white p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <div>
            <label
              htmlFor="recap-month"
              className="block text-xs font-medium text-[#63625e]"
            >
              Bulan Periode
            </label>
            <select
              id="recap-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-[#bfbfbf] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#007376] focus:outline-none sm:w-44"
            >
              {BULAN_INDO.map((label, idx) => (
                <option key={label} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="recap-year"
              className="block text-xs font-medium text-[#63625e]"
            >
              Tahun
            </label>
            <select
              id="recap-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-[#bfbfbf] bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-[#007376] focus:outline-none sm:w-28"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canSaveToDrive && (
            <button
              type="button"
              onClick={handleSaveToDrive}
              disabled={validatedEntries.length === 0}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#bfbfbf] bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-[#c7edec]/30 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
            >
              <UploadCloud className="h-4 w-4" />
              Simpan Drive
            </button>
          )}
          <button
            type="button"
            onClick={handlePrintA4}
            disabled={validatedEntries.length === 0 || printingA4}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#007376]/40 bg-[#c7edec]/35 px-4 py-2 text-xs font-semibold text-[#007376] transition-colors hover:bg-[#c7edec]/65 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
          >
            <Printer className="h-4 w-4" />
            {printingA4 ? 'Menyiapkan Cetak...' : 'Cetak A4'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={validatedEntries.length === 0}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#007376] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#005a5d] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Unduh Rekap PDF
          </button>
        </div>
      </div>

      {printNotice && (
        <div className="no-print flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 sm:text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{printNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrintNotice(null)}
            className="text-amber-700 hover:text-amber-950"
            aria-label="Tutup info cetak"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Warning if unvalidated rows exist */}
      {excludedCount > 0 && (
        <div className="no-print flex items-start gap-3 rounded-xl border border-[#e4872d]/40 bg-[#f4f7c2]/55 px-4 py-3 text-xs text-slate-800 sm:text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e4872d]" />
          <div>
            <span className="font-semibold tabular-nums">
              {excludedCount} Berita Acara
            </span>{' '}
            pada periode {monthLabel} {selectedYear} masih berstatus{' '}
            <em>Menunggu Validasi</em> atau <em>Ditolak</em>, sehingga otomatis{' '}
            <strong>dikecualikan</strong> dari Rekapitulasi Bulanan sampai
            disetujui Admin.
          </div>
        </div>
      )}

      {/* Printable A4 Recap Document */}
      <div className="print-only-sheet rounded-2xl border border-[#bfbfbf]/60 bg-white p-5 shadow-sm sm:p-8 print:p-0">
        {/* Kop Surat Resmi */}
        <div className="border-b-2 border-[#007376] pb-2.5 print:pb-1.5">
          <img
            src={KOP_SURAT_IMAGE_URL}
            alt={`Kop Surat ${agency.subUnit}`}
            className="mx-auto h-auto w-full object-contain print:max-h-[26mm] print:w-auto print:max-w-full"
          />
        </div>
        <div className="mt-[2px] border-t-2 border-[#d1db26]" />

        <div className="mt-6 text-center">
          <h3 className="font-display text-sm font-bold text-slate-900 sm:text-base">
            REKAPITULASI BULANAN BERITA ACARA PEMBAYARAN PNBP TUNAI
          </h3>
          <p className="mt-1 text-xs text-[#63625e] sm:text-sm">
            Periode: {monthLabel} {selectedYear}
          </p>
        </div>

        {/* Table directly below Periode */}
        {validatedEntries.length === 0 ? (
          <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#bfbfbf] py-10 text-center">
            <FileSpreadsheet className="h-9 w-9 text-[#10b1aa]/50" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Belum ada Berita Acara PNBP berstatus Disetujui pada {monthLabel}{' '}
              {selectedYear}
            </p>
            <p className="mt-1 max-w-md text-xs text-[#63625e]">
              Admin perlu memvalidasi Berita Acara pada menu Cetak Berita Acara
              agar otomatis tampil di Rekapitulasi Bulanan.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse border border-[#bfbfbf] text-xs print:text-[9px]">
              <thead>
                <tr className="bg-[#007376] text-white">
                  <th className="w-9 border border-[#bfbfbf]/60 px-2 py-2.5 text-center">
                    No
                  </th>
                  <th className="w-24 border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Tanggal
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Nomor BA
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Petugas dan Pengguna Jasa
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Jenis Layanan PNBP
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Kode Billing
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Kode NTPN
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Dokumen Bukti Setor
                  </th>
                  <th className="border border-[#bfbfbf]/60 px-2.5 py-2.5 text-center">
                    Nominal (Rp)
                  </th>
                  {isSuperAdmin && (
                    <th className="no-print border border-[#bfbfbf]/60 px-2 py-2.5 text-center">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {validatedEntries.map((item, idx) => (
                  <tr
                    key={`${item.rowNumber}-${item.idBA}`}
                    className="hover:bg-[#c7edec]/20"
                  >
                    <td className="border border-[#bfbfbf]/70 px-2 py-2 text-center tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2 font-mono tabular-nums whitespace-nowrap">
                      {item.tanggalInput}
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2 font-mono text-[11px] font-medium text-slate-900">
                      {item.nomorBA}
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2">
                      <div className="font-medium text-slate-900">
                        Petugas: {item.namaPetugas}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#63625e]">
                        Pengguna Jasa: {item.namaWajibBayar}
                      </div>
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2">
                      <div>{item.jenisLayanan}</div>
                      <div className="text-[11px] text-[#63625e]">
                        {item.rincianLayanan}
                      </div>
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2 font-mono text-[11px] text-slate-900 whitespace-nowrap">
                      {item.kodeBilling || '-'}
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2 font-mono text-[11px] text-slate-900 whitespace-nowrap">
                      {item.kodeNtpn || '-'}
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2 whitespace-nowrap">
                      {item.buktiSetorUrl ? (
                        <a
                          href={item.buktiSetorUrl}
                          download={
                            item.buktiSetorUrl.startsWith('data:')
                              ? item.buktiSetorNama ||
                                `Bukti_Setor_${item.idBA}`
                              : undefined
                          }
                          target={
                            item.buktiSetorUrl.startsWith('data:')
                              ? undefined
                              : '_blank'
                          }
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#007376] hover:underline"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0" />
                          <span>Unduh Bukti</span>
                        </a>
                      ) : (
                        <span className="text-[#898984]">-</span>
                      )}
                    </td>
                    <td className="border border-[#bfbfbf]/70 px-2.5 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatRupiah(item.nominalAngka)}
                    </td>
                    {isSuperAdmin && (
                      <td className="no-print border border-[#bfbfbf]/70 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(item)}
                          title="Hapus Berita Acara & Rekap"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#c00000] hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#c7edec]/50 font-semibold text-[#007376]">
                  <td
                    colSpan={8}
                    className="border border-[#bfbfbf]/70 px-2.5 py-2 text-right"
                  >
                    TOTAL PENERIMAAN PNBP TUNAI TERVALIDASI
                  </td>
                  <td className="border border-[#bfbfbf]/70 px-2.5 py-2 text-right font-mono tabular-nums">
                    {formatRupiah(totalNominal)}
                  </td>
                  {isSuperAdmin && (
                    <td className="no-print border border-[#bfbfbf]/70" />
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature Footer */}
        <div className="mt-8 flex justify-end text-xs text-slate-800 print:mt-5 break-inside-avoid">
          <div className="w-72 text-center">
            <p>
              {agency.kota},{' '}
              {formatTanggalIndo(new Date().toISOString().slice(0, 10))}
            </p>
            <p className="mt-1">Mengetahui / Mengesahkan,</p>
            <p className="font-medium">{agency.jabatanPimpinan}</p>
            <div className="h-16" />
            <p className="font-semibold underline">{agency.namaPimpinan}</p>
            <p className="font-mono text-[#63625e] tabular-nums">
              NIP. {agency.nipPimpinan}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
