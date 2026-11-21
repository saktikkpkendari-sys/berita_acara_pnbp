import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  UploadCloud,
} from 'lucide-react';
import { BULAN_INDO } from '../data/petugasList';
import { AgencySettings, BeritaAcaraPNBP } from '../types';
import {
  formatRupiah,
  formatTanggalIndo,
  generateMonthlyRecapPdf,
} from '../services/pdfGenerator';

interface MonthlyRecapViewProps {
  entries: BeritaAcaraPNBP[];
  agency: AgencySettings;
  hasSpreadsheet: boolean;
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
  hasSpreadsheet,
  onRequestSaveRecapToDrive,
  onRequireAuthOrSheet,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

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

  const serviceBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    validatedEntries.forEach((e) => {
      const prev = map.get(e.jenisLayanan) || { count: 0, total: 0 };
      map.set(e.jenisLayanan, {
        count: prev.count + 1,
        total: prev.total + e.nominalAngka,
      });
    });
    return Array.from(map.entries());
  }, [validatedEntries]);

  const monthLabel = BULAN_INDO[selectedMonth - 1] || String(selectedMonth);

  const handleDownloadPdf = () => {
    const { blob, fileName } = generateMonthlyRecapPdf(
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

  const handleSaveToDrive = () => {
    const { blob, fileName } = generateMonthlyRecapPdf(
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

  if (!hasSpreadsheet) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-teal-700/40" />
        <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
          Hubungkan Google Sheet Terlebih Dahulu
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          Rekapitulasi Bulanan membaca langsung Berita Acara PNBP berstatus
          Disetujui dari Google Sheet BKK Kelas I Kendari.
        </p>
        <button
          type="button"
          onClick={onRequireAuthOrSheet}
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0D5D57]"
        >
          Buka Koneksi Google Sheet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Controls & Filter Bar */}
      <div className="no-print flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <div>
            <label
              htmlFor="recap-month"
              className="block text-xs font-medium text-slate-600"
            >
              Bulan Periode
            </label>
            <select
              id="recap-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none sm:w-44"
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
              className="block text-xs font-medium text-slate-600"
            >
              Tahun
            </label>
            <select
              id="recap-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none sm:w-28"
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
          <button
            type="button"
            onClick={handleSaveToDrive}
            disabled={validatedEntries.length === 0}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
          >
            <UploadCloud className="h-4 w-4" />
            Simpan Drive
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={validatedEntries.length === 0}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
          >
            <Printer className="h-4 w-4" />
            Cetak A4
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={validatedEntries.length === 0}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0D5D57] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Unduh Rekap PDF
          </button>
        </div>
      </div>

      {/* Warning if unvalidated rows exist */}
      {excludedCount > 0 && (
        <div className="no-print flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 sm:text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <span className="font-semibold tabular-nums">
              {excludedCount} Berita Acara
            </span>{' '}
            pada periode {monthLabel} {selectedYear} masih berstatus{' '}
            <em>Menunggu Validasi</em> atau <em>Ditolak</em>, sehingga otomatis{' '}
            <strong>dikecualikan</strong> dari Rekapitulasi Bulanan PDF sampai
            disetujui Admin.
          </div>
        </div>
      )}

      {/* Printable A4 Recap Document */}
      <div className="print-only-sheet rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 print:p-0">
        {/* Kop Surat */}
        <div className="border-b-2 border-slate-900 pb-3 text-center">
          <div className="font-display text-sm font-bold uppercase text-teal-800 sm:text-base">
            {agency.namaInstansi}
          </div>
          <div className="text-xs font-bold uppercase text-slate-900 sm:text-sm">
            {agency.subUnit}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600 sm:text-xs">
            {agency.alamatInstansi} · {agency.teleponEmail}
          </div>
        </div>
        <div className="mt-[2px] border-t border-slate-900" />

        <div className="mt-6 text-center">
          <h3 className="font-display text-sm font-bold text-slate-900 sm:text-base">
            REKAPITULASI BULANAN BERITA ACARA PEMBAYARAN PNBP TUNAI
          </h3>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Periode: {monthLabel} {selectedYear}
          </p>
        </div>

        {/* Summary Strip */}
        <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-[#F4F9F9] p-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Berita Acara Tervalidasi</div>
            <div className="mt-1 font-display text-xl font-bold tabular-nums text-slate-900">
              {validatedEntries.length} Dokumen
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">
              Total PNBP Tunai Diterima
            </div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-teal-800">
              {formatRupiah(totalNominal)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">
              Belum Valid (Dikecualikan)
            </div>
            <div className="mt-1 font-display text-xl font-bold tabular-nums text-amber-700">
              {excludedCount} Entri
            </div>
          </div>
        </div>

        {/* Service Breakdown */}
        {serviceBreakdown.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-slate-200 pb-4 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              Rincian Jenis Layanan:
            </span>
            {serviceBreakdown.map(([svc, info]) => (
              <span key={svc} className="tabular-nums">
                {svc}: <strong className="text-slate-900">{info.count} dok</strong>{' '}
                ({formatRupiah(info.total)})
              </span>
            ))}
          </div>
        )}

        {/* Table */}
        {validatedEntries.length === 0 ? (
          <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-10 text-center">
            <FileSpreadsheet className="h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Belum ada Berita Acara PNBP berstatus Disetujui pada {monthLabel}{' '}
              {selectedYear}
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Admin perlu memvalidasi Berita Acara pada menu Cetak Berita Acara
              agar otomatis terhitung di laporan bulanan.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-[#0F766E] text-white">
                  <th className="w-10 border border-slate-300 px-2.5 py-2 text-center">
                    No
                  </th>
                  <th className="w-24 border border-slate-300 px-2.5 py-2 text-left">
                    Tanggal
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left">
                    Nomor BA
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left">
                    Petugas & Wajib Bayar
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left">
                    Jenis Layanan PNBP
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-left">
                    Validator
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 text-right">
                    Nominal (Rp)
                  </th>
                </tr>
              </thead>
              <tbody>
                {validatedEntries.map((item, idx) => (
                  <tr key={item.idBA} className="hover:bg-slate-50/70">
                    <td className="border border-slate-300 px-2.5 py-2 text-center tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 font-mono tabular-nums whitespace-nowrap">
                      {item.tanggalInput}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 font-mono text-[11px] font-medium text-slate-900">
                      {item.nomorBA}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      <div className="font-medium text-slate-900">
                        {item.namaWajibBayar}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Petugas: {item.namaPetugas}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      <div>{item.jenisLayanan}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.rincianLayanan}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      <div className="inline-flex items-center gap-1 text-teal-800">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>{item.validatorAdmin || 'Admin'}</span>
                      </div>
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatRupiah(item.nominalAngka)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50 font-semibold text-teal-950">
                  <td
                    colSpan={6}
                    className="border border-slate-300 px-2.5 py-2 text-right"
                  >
                    TOTAL PENERIMAAN PNBP TUNAI TERVALIDASI
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 text-right font-mono tabular-nums">
                    {formatRupiah(totalNominal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature Footer */}
        <div className="mt-8 flex justify-end text-xs text-slate-800">
          <div className="w-64 text-center">
            <p>
              {agency.kota},{' '}
              {formatTanggalIndo(new Date().toISOString().slice(0, 10))}
            </p>
            <p className="mt-1">Mengetahui / Mengesahkan,</p>
            <p>{agency.jabatanPimpinan}</p>
            <div className="h-16" />
            <p className="font-semibold underline">{agency.namaPimpinan}</p>
            <p className="font-mono text-slate-600 tabular-nums">
              NIP. {agency.nipPimpinan}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
