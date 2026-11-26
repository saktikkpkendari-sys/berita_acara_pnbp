import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileUp,
  Lock,
  Receipt,
  Search,
} from 'lucide-react';
import { BeritaAcaraPNBP } from '../types';
import { formatRupiah } from '../services/pdfGenerator';

interface InputBuktiSetorViewProps {
  entries: BeritaAcaraPNBP[];
  loading: boolean;
  onSaveBuktiSetor: (
    entry: BeritaAcaraPNBP,
    payload: {
      kodeBilling: string;
      kodeNtpn: string;
      file: File | null;
    }
  ) => void;
}

export const InputBuktiSetorView: React.FC<InputBuktiSetorViewProps> = ({
  entries,
  loading,
  onSaveBuktiSetor,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'semua' | 'belum' | 'sudah'>(
    'semua'
  );
  const [selectedId, setSelectedId] = useState<string>('');

  const [kodeBilling, setKodeBilling] = useState<string>('');
  const [kodeNtpn, setKodeNtpn] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((item) => {
      const hasCompleteBukti = Boolean(
        item.kodeBilling && item.kodeNtpn && item.buktiSetorUrl
      );
      if (filterMode === 'belum' && hasCompleteBukti) return false;
      if (filterMode === 'sudah' && !hasCompleteBukti) return false;
      if (!q) return true;
      return (
        item.nomorBA.toLowerCase().includes(q) ||
        item.namaWajibBayar.toLowerCase().includes(q) ||
        item.namaPetugas.toLowerCase().includes(q) ||
        (item.kodeBilling || '').toLowerCase().includes(q) ||
        (item.kodeNtpn || '').toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery, filterMode]);

  const selectedEntry = useMemo(() => {
    if (selectedId) {
      const match = entries.find(
        (e) => `${e.rowNumber}-${e.idBA}` === selectedId
      );
      if (match) return match;
    }
    return filteredEntries[0] || entries[0] || null;
  }, [entries, filteredEntries, selectedId]);

  useEffect(() => {
    if (selectedEntry) {
      setKodeBilling(selectedEntry.kodeBilling || '');
      setKodeNtpn(selectedEntry.kodeNtpn || '');
      setSelectedFile(null);
      setFileError(null);
    }
  }, [selectedEntry]);

  const stats = useMemo(() => {
    const withBilling = entries.filter(
      (e) => e.kodeBilling || e.kodeNtpn || e.buktiSetorUrl
    ).length;
    const withDoc = entries.filter((e) => Boolean(e.buktiSetorUrl)).length;
    return {
      total: entries.length,
      withBilling,
      withDoc,
      pending: Math.max(0, entries.length - withDoc),
    };
  }, [entries]);

  const isSelectedComplete = Boolean(
    selectedEntry &&
      selectedEntry.kodeBilling?.trim() &&
      selectedEntry.kodeNtpn?.trim() &&
      selectedEntry.buktiSetorUrl
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSelectedComplete) return;
    setFileError(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError('Ukuran dokumen bukti setor maksimal 2 MB.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry || isSelectedComplete) return;
    setFileError(null);

    onSaveBuktiSetor(selectedEntry, {
      kodeBilling: kodeBilling.trim(),
      kodeNtpn: kodeNtpn.trim(),
      file: selectedFile,
    });
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Kemenkes Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#10b1aa]/25 bg-gradient-to-r from-[#007376] via-[#0d948e] to-[#10b1aa] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Input Bukti Setor PNBP (Billing, NTPN &amp; Dokumen Setor)
            </h1>
            <p className="mt-1 text-xs text-[#c7edec] sm:text-sm">
              Lengkapi Kode Billing, Kode NTPN, dan unggah dokumen bukti setor
              untuk setiap Berita Acara agar otomatis tampil pada Rekapitulasi
              Bulanan.
            </p>
          </div>
          <div className="flex items-center gap-5 shrink-0 border-t border-white/15 pt-3 sm:border-t-0 sm:pt-0">
            <div>
              <div className="text-[11px] text-[#c7edec]">Lengkap Dokumen</div>
              <div className="font-mono text-xl font-bold tabular-nums text-[#d1db26]">
                {stats.withDoc}/{stats.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#c7edec]">Belum Unggah</div>
              <div className="font-mono text-xl font-bold tabular-nums text-white">
                {stats.pending}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 h-1 w-24 rounded-full bg-[#d1db26]" />
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Berita Acara Selector */}
        <div className="lg:col-span-5 rounded-2xl border border-[#bfbfbf]/60 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Pilih Berita Acara
              </h2>
              <span className="text-xs text-[#63625e] tabular-nums">
                {filteredEntries.length} berkas
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-[#c7edec]/35 p-1">
              {(
                [
                  { id: 'semua', label: 'Semua' },
                  { id: 'belum', label: 'Belum Lengkap' },
                  { id: 'sudah', label: 'Lengkap' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`min-h-[36px] flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    filterMode === tab.id
                      ? 'bg-[#007376] text-white shadow-sm'
                      : 'text-[#63625e] hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#898984]" />
              <input
                type="text"
                placeholder="Cari nomor BA, pengguna jasa, billing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-[#bfbfbf] bg-white pl-9 pr-3 text-xs text-slate-900 focus:border-[#007376] focus:outline-none"
              />
            </div>
          </div>

          {loading && entries.length === 0 ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#bfbfbf] py-10 text-center text-xs text-[#63625e]">
              Tidak ada Berita Acara yang sesuai filter.
            </div>
          ) : (
            <div className="max-h-[460px] divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200">
              {filteredEntries.map((item) => {
                const key = `${item.rowNumber}-${item.idBA}`;
                const isSelected =
                  selectedEntry &&
                  `${selectedEntry.rowNumber}-${selectedEntry.idBA}` === key;
                const hasBukti = Boolean(
                  item.kodeBilling && item.kodeNtpn && item.buktiSetorUrl
                );

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedId(key)}
                    className={`w-full px-3.5 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#c7edec]/45'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-[#007376] truncate">
                          {item.nomorBA}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-900 truncate">
                          {item.namaWajibBayar}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#63625e] truncate">
                          Petugas: {item.namaPetugas}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-xs font-bold tabular-nums text-slate-900">
                          {formatRupiah(item.nominalAngka)}
                        </div>
                        <div
                          className={`mt-1 text-[11px] font-medium ${
                            hasBukti ? 'text-[#007376]' : 'text-[#e4872d]'
                          }`}
                        >
                          {hasBukti ? 'Lengkap' : 'Perlu Dilengkapi'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Input Form */}
        <div className="lg:col-span-7 rounded-2xl border border-[#bfbfbf]/60 bg-white p-5 sm:p-6">
          {!selectedEntry ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-xs text-[#63625e]">
              <Receipt className="h-9 w-9 text-[#10b1aa]/50" />
              <p className="mt-3 font-medium text-slate-800">
                Belum ada Berita Acara yang dipilih
              </p>
              <p className="mt-1">
                Buat Berita Acara terlebih dahulu atau pilih berkas di sebelah
                kiri.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-[11px] font-medium text-[#63625e]">
                    Dokumen Terpilih · {selectedEntry.tanggalInput} ·{' '}
                    {selectedEntry.statusValidasi}
                  </div>
                  <h3 className="mt-0.5 font-display text-base font-bold text-[#007376]">
                    {selectedEntry.nomorBA}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#63625e]">
                    Petugas: <strong className="text-slate-800">{selectedEntry.namaPetugas}</strong> · Pengguna Jasa:{' '}
                    <strong className="text-slate-800">{selectedEntry.namaWajibBayar}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-bold tabular-nums text-[#007376]">
                    {formatRupiah(selectedEntry.nominalAngka)}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] font-semibold ${
                      isSelectedComplete ? 'text-[#007376]' : 'text-[#e4872d]'
                    }`}
                  >
                    {isSelectedComplete ? 'Status: Lengkap' : 'Status: Belum Lengkap'}
                  </div>
                </div>
              </div>

              {isSelectedComplete && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#10b1aa]/35 bg-[#c7edec]/40 px-3.5 py-2.5 text-xs text-[#007376]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Bukti setor sudah berstatus <strong>Lengkap</strong>. Kolom
                    Kode Billing, Kode NTPN, dan Unggah Dokumen dikunci agar
                    tidak terjadi perubahan data.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Kode Billing (SIMPONI / MPN)
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isSelectedComplete}
                    disabled={isSelectedComplete}
                    placeholder="Contoh: 820261126001234"
                    value={kodeBilling}
                    onChange={(e) => setKodeBilling(e.target.value)}
                    className={`mt-1.5 min-h-[44px] w-full rounded-xl border px-3.5 py-2 font-mono text-sm focus:outline-none ${
                      isSelectedComplete
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600'
                        : 'border-[#bfbfbf] bg-white text-slate-900 focus:border-[#007376]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Kode NTPN
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isSelectedComplete}
                    disabled={isSelectedComplete}
                    placeholder="Contoh: 9F28A1C04B7D12E5"
                    value={kodeNtpn}
                    onChange={(e) => setKodeNtpn(e.target.value.toUpperCase())}
                    className={`mt-1.5 min-h-[44px] w-full rounded-xl border px-3.5 py-2 font-mono text-sm uppercase focus:outline-none ${
                      isSelectedComplete
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600'
                        : 'border-[#bfbfbf] bg-white text-slate-900 focus:border-[#007376]'
                    }`}
                  />
                </div>
              </div>

              {/* File Upload (Locked once status is Lengkap) */}
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Upload Dokumen Bukti Setor (PDF / JPG / PNG, Maks. 2 MB)
                </label>
                {isSelectedComplete ? (
                  <div className="mt-1.5 flex min-h-[96px] cursor-not-allowed flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-100 px-4 py-4 text-center">
                    <Lock className="h-5 w-5 text-slate-400" />
                    <span className="mt-1.5 text-xs font-semibold text-slate-600">
                      Menu Upload Dokumen Terkunci
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500">
                      Dokumen bukti setor telah tersimpan dan tidak dapat diubah
                    </span>
                  </div>
                ) : (
                  <label className="mt-1.5 flex min-h-[112px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#10b1aa]/50 bg-[#c7edec]/20 px-4 py-4 text-center transition-colors hover:border-[#007376] hover:bg-[#c7edec]/35">
                    <FileUp className="h-6 w-6 text-[#007376]" />
                    <span className="mt-2 text-xs font-semibold text-[#007376]">
                      {selectedFile
                        ? selectedFile.name
                        : 'Pilih file dokumen bukti setor dari perangkat'}
                    </span>
                    <span className="mt-0.5 text-[11px] text-[#63625e]">
                      {selectedFile
                        ? `${Math.round(selectedFile.size / 1024)} KB siap diunggah`
                        : 'Mendukung format PDF, JPG, atau PNG'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                )}

                {selectedEntry.buktiSetorUrl && !selectedFile && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#10b1aa]/30 bg-[#c7edec]/25 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#007376]" />
                      <span className="truncate font-medium text-slate-800">
                        Dokumen tersimpan:{' '}
                        {selectedEntry.buktiSetorNama || 'Bukti_Setor_PNBP'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={selectedEntry.buktiSetorUrl}
                        download={
                          selectedEntry.buktiSetorUrl.startsWith('data:')
                            ? selectedEntry.buktiSetorNama ||
                              `Bukti_Setor_${selectedEntry.idBA}`
                            : undefined
                        }
                        target={
                          selectedEntry.buktiSetorUrl.startsWith('data:')
                            ? undefined
                            : '_blank'
                        }
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#007376]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#007376] hover:bg-[#c7edec]/40"
                      >
                        <Download className="h-3 w-3" />
                        Unduh
                      </a>
                    </div>
                  </div>
                )}

                {fileError && (
                  <p className="mt-2 text-xs font-medium text-[#c00000]">
                    {fileError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#63625e]">
                  {isSelectedComplete
                    ? 'Bukti setor untuk Berita Acara ini telah lengkap dan otomatis masuk Cetak Rekap Bulanan.'
                    : 'Data Billing, NTPN, dan tautan dokumen otomatis tersinkron ke menu Cetak Rekap Bulanan.'}
                </p>
                {!isSelectedComplete && (
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#007376] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#005a5d]"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    SIMPAN Bukti Setor
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
