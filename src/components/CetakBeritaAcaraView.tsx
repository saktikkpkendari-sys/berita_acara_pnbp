import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Lock,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AgencySettings,
  BeritaAcaraPNBP,
  UserRole,
  ValidationStatus,
} from '../types';
import { formatRupiah, generateBeritaAcaraPdf } from '../services/pdfGenerator';

interface CetakBeritaAcaraViewProps {
  entries: BeritaAcaraPNBP[];
  agency: AgencySettings;
  role: UserRole;
  loading: boolean;
  hasSpreadsheet: boolean;
  onRefresh: () => void;
  onPreview: (entry: BeritaAcaraPNBP) => void;
  onReviewDecision: (
    entry: BeritaAcaraPNBP,
    decision: 'Disetujui' | 'Ditolak'
  ) => void;
  onRevokeValidation: (entry: BeritaAcaraPNBP) => void;
  onGoCreate: () => void;
  onRequireAuthOrSheet: () => void;
}

export const CetakBeritaAcaraView: React.FC<CetakBeritaAcaraViewProps> = ({
  entries,
  agency,
  role,
  loading,
  hasSpreadsheet,
  onRefresh,
  onPreview,
  onReviewDecision,
  onRevokeValidation,
  onGoCreate,
  onRequireAuthOrSheet,
}) => {
  const [statusFilter, setStatusFilter] = useState<'Semua' | ValidationStatus>(
    'Semua'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const canValidate = role === 'admin' || role === 'superadmin';

  const stats = useMemo(() => {
    const approved = entries.filter((e) => e.statusValidasi === 'Disetujui');
    const pending = entries.filter(
      (e) => e.statusValidasi === 'Menunggu Validasi'
    );
    const rejected = entries.filter((e) => e.statusValidasi === 'Ditolak');
    return {
      total: entries.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      approvedNominal: approved.reduce((s, e) => s + e.nominalAngka, 0),
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((item) => {
      if (statusFilter !== 'Semua' && item.statusValidasi !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.idBA.toLowerCase().includes(q) ||
        item.nomorBA.toLowerCase().includes(q) ||
        item.namaPetugas.toLowerCase().includes(q) ||
        item.namaWajibBayar.toLowerCase().includes(q) ||
        item.jenisLayanan.toLowerCase().includes(q)
      );
    });
  }, [entries, statusFilter, searchQuery]);

  if (!hasSpreadsheet) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-teal-700/40" />
        <h2 className="mt-3 font-display text-base font-semibold text-slate-900">
          Hubungkan Google Sheet Terlebih Dahulu
        </h2>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          Masuk dengan akun Google dan hubungkan atau buat Google Sheet PNBP di
          panel koneksi agar data Berita Acara dapat divalidasi dan dicetak PDF.
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
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total Berita Acara</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
            {stats.total}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Tercatat di Google Sheet
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Menunggu Validasi</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700">
            {stats.pendingCount}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Cetak PDF terkunci
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Disetujui (Siap Cetak)</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-teal-700">
            {stats.approvedCount}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Sah & masuk rekap bulanan
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">PNBP Tunai Tervalidasi</div>
          <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900 sm:text-lg">
            {formatRupiah(stats.approvedNominal)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Ditolak: {stats.rejectedCount} berkas
          </div>
        </div>
      </div>

      {/* Role Notice for User & Admin */}
      {!canValidate ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-xs text-teal-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Printer className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            <div>
              Mode <strong>User (Petugas)</strong>: Berita Acara yang sudah{' '}
              <strong>Disetujui Admin</strong> menampilkan tombol{' '}
              <strong>Cetak</strong> dan <strong>Unduh PDF</strong>. Berkas
              yang belum divalidasi tetap terkunci.
            </div>
          </div>
          {stats.approvedCount > 0 && statusFilter !== 'Disetujui' && (
            <button
              type="button"
              onClick={() => setStatusFilter('Disetujui')}
              className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg border border-teal-700/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
            >
              Tampilkan Siap Cetak ({stats.approvedCount})
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-xs text-teal-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            <div>
              Mode <strong>{role === 'superadmin' ? 'Super Admin' : 'Admin (Validator)'}</strong>: Klik tombol{' '}
              <strong>Eksekusi</strong> pada berkas yang menunggu validasi
              untuk menyetujui atau menolak Berita Acara sebelum dicetak User.
            </div>
          </div>
          {stats.pendingCount > 0 && statusFilter !== 'Menunggu Validasi' && (
            <button
              type="button"
              onClick={() => setStatusFilter('Menunggu Validasi')}
              className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D5D57]"
            >
              Antrean Eksekusi ({stats.pendingCount})
            </button>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {(
              ['Semua', 'Menunggu Validasi', 'Disetujui', 'Ditolak'] as const
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`min-h-[36px] whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor BA, petugas, wajib bayar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 focus:border-teal-700 focus:outline-none sm:w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Segarkan Data
          </button>
          <button
            type="button"
            onClick={onGoCreate}
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-xl bg-[#0F766E] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0D5D57]"
          >
            + Buat BA Baru
          </button>
        </div>
      </div>

      {/* Content: Loading / Empty / Mobile Cards / Desktop Table */}
      {loading && entries.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            Tidak ada Berita Acara yang sesuai filter saat ini.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Buat Berita Acara PNBP baru pada menu 1. Buat Berita Acara.
          </p>
        </div>
      ) : (
        <>
          {/* Smartphone Card List (< md) */}
          <div className="space-y-3 md:hidden">
            {filteredEntries.map((item) => {
              const isApproved = item.statusValidasi === 'Disetujui';
              const isRejected = item.statusValidasi === 'Ditolak';

              return (
                <div
                  key={`${item.rowNumber}-${item.idBA}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-teal-800 truncate">
                        {item.nomorBA}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
                        {item.tanggalInput} · {item.pukulBA} WITA
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {formatRupiah(item.nominalAngka)}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs">
                    <div className="font-medium text-slate-900">
                      Wajib Bayar: {item.namaWajibBayar}
                    </div>
                    <div className="text-slate-600">
                      Petugas: {item.namaPetugas}
                    </div>
                    <div className="text-slate-500 line-clamp-2">
                      {item.jenisLayanan} — {item.rincianLayanan}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Disetujui Admin
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                        Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        Menunggu Validasi
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">
                      {item.ttdPetugas && item.ttdWajibBayar
                        ? '2 TTD Lengkap'
                        : 'TTD belum lengkap'}
                    </span>
                  </div>

                  {/* Mobile Touch Action Buttons (>= 44px) */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isApproved ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onPreview(item)}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-3 text-xs font-semibold text-white hover:bg-[#0D5D57]"
                        >
                          <Printer className="h-4 w-4" />
                          Cetak
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const { blob, fileName } = generateBeritaAcaraPdf(
                              item,
                              agency
                            );
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          Unduh PDF
                        </button>
                        {canValidate && (
                          <button
                            type="button"
                            onClick={() => onRevokeValidation(item)}
                            className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Batalkan Validasi
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-medium text-slate-500">
                          <Lock className="h-3.5 w-3.5" />
                          {isRejected
                            ? 'Ditolak Admin (Terkunci)'
                            : 'Menunggu Validasi Admin'}
                        </div>
                        {canValidate && (
                          <button
                            type="button"
                            onClick={() =>
                              onReviewDecision(item, 'Disetujui')
                            }
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 text-xs font-semibold text-white hover:bg-[#0D5D57]"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Eksekusi
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop High-Density Table (>= md) */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Nomor BA & Waktu</th>
                    <th className="px-4 py-3 font-semibold">
                      Pihak I (Petugas) & Pihak II (Wajib Bayar)
                    </th>
                    <th className="px-4 py-3 font-semibold">Layanan PNBP</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Nominal Tunai
                    </th>
                    <th className="px-4 py-3 font-semibold">Status Validasi</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      {canValidate ? 'Eksekusi & Cetak' : 'Cetak Dokumen'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEntries.map((item) => {
                    const isApproved = item.statusValidasi === 'Disetujui';
                    const isRejected = item.statusValidasi === 'Ditolak';

                    return (
                      <tr
                        key={`${item.rowNumber}-${item.idBA}`}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <div className="font-mono font-semibold text-teal-800">
                            {item.nomorBA}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                            {item.tanggalInput} · {item.pukulBA}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top max-w-xs">
                          <div className="font-medium text-slate-900">
                            {item.namaWajibBayar}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            Petugas: {item.namaPetugas}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            NIP. {item.nipPetugas}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top max-w-xs">
                          <div className="font-medium text-slate-800">
                            {item.jenisLayanan}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                            {item.rincianLayanan}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 tabular-nums">
                            {formatRupiah(item.nominalAngka)}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {isApproved ? (
                            <div className="text-teal-800">
                              <div className="inline-flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                Disetujui
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {item.validatorAdmin || 'Admin'} ·{' '}
                                <span className="font-mono tabular-nums">
                                  {item.tanggalValidasi}
                                </span>
                              </div>
                            </div>
                          ) : isRejected ? (
                            <div className="text-red-700">
                              <div className="inline-flex items-center gap-1.5 font-semibold">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                Ditolak
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {item.catatanAdmin || '-'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-amber-700">
                              <div className="inline-flex items-center gap-1.5 font-semibold">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                Menunggu Validasi
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                PDF terkunci
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {isApproved ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onPreview(item)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D5D57]"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Cetak
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const { blob, fileName } =
                                      generateBeritaAcaraPdf(item, agency);
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = fileName;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Unduh PDF
                                </button>
                                {canValidate && (
                                  <button
                                    type="button"
                                    onClick={() => onRevokeValidation(item)}
                                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                  >
                                    Batal
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-400">
                                  <Lock className="h-3 w-3" />
                                  Terkunci
                                </span>
                                {canValidate && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onReviewDecision(item, 'Disetujui')
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0D5D57]"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Eksekusi
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
