import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileCheck2, Search } from 'lucide-react';
import {
  JENIS_LAYANAN_PNBP,
  parseTanggalIndoParts,
  REFERENSI_PETUGAS,
  terbilangRupiah,
} from '../data/petugasList';
import { AgencySettings, BeritaAcaraPNBP, UserRole } from '../types';
import { formatAngka } from '../services/pdfGenerator';
import { computeNextBeritaAcaraInfo } from '../services/googleSheets';
import { SignaturePad } from './SignaturePad';

type CreatePayload = Omit<
  BeritaAcaraPNBP,
  | 'rowNumber'
  | 'statusValidasi'
  | 'validatorAdmin'
  | 'tanggalValidasi'
  | 'catatanAdmin'
  | 'linkPdfBA'
>;

interface CreateBeritaAcaraViewProps {
  agency: AgencySettings;
  entries: BeritaAcaraPNBP[];
  role: UserRole;
  hasSpreadsheet: boolean;
  onSubmitBeritaAcara: (payload: CreatePayload) => void;
  onRequireAuthOrSheet: () => void;
}

const RequiredMark: React.FC = () => (
  <span className="ml-1 font-bold italic text-[#c00000]">*Wajib diisi</span>
);

export const CreateBeritaAcaraView: React.FC<CreateBeritaAcaraViewProps> = ({
  agency,
  entries,
  role,
  onSubmitBeritaAcara,
}) => {
  const getLocalTodayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [tanggalInput] = useState<string>(() => getLocalTodayIso());
  const yyyy = tanggalInput.slice(0, 4);

  const computedNumberInfo = useMemo(
    () => computeNextBeritaAcaraInfo(entries, agency, tanggalInput),
    [entries, agency, tanggalInput]
  );

  const [nomorBA, setNomorBA] = useState<string>(
    computedNumberInfo.formattedNomorBA
  );
  const isLockedForRole =
    agency.kunciNomorUrutUntukUser && role !== 'superadmin';

  useEffect(() => {
    setNomorBA(computedNumberInfo.formattedNomorBA);
  }, [computedNumberInfo.formattedNomorBA]);

  const [tanggalGangguan, setTanggalGangguan] = useState<string>('');
  const [jamGangguan, setJamGangguan] = useState<string>('');
  const [lokasi, setLokasi] = useState<string>('');

  const [petugasSearch, setPetugasSearch] = useState<string>('');
  const [selectedNamaPetugas, setSelectedNamaPetugas] = useState<string>('');
  const [selectedNipPetugas, setSelectedNipPetugas] = useState<string>('');
  const [jabatanPetugas, setJabatanPetugas] = useState<string>(
    'Petugas Layanan Karantina Kesehatan'
  );

  const [namaWajibBayar, setNamaWajibBayar] = useState<string>('');
  const [alamatInstansi, setAlamatInstansi] = useState<string>('');

  const [jenisLayanan, setJenisLayanan] = useState<string>('');
  const [rincianLayanan, setRincianLayanan] = useState<string>('');
  const [nominalInput, setNominalInput] = useState<string>('');
  const [kotaTTD, setKotaTTD] = useState<string>('');

  const [ttdWajibBayar, setTtdWajibBayar] = useState<string>('');
  const [ttdPetugas, setTtdPetugas] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const nominalAngka = Number(nominalInput) || 0;

  const dateParts = useMemo(
    () => parseTanggalIndoParts(tanggalInput),
    [tanggalInput]
  );

  const gangguanDateParts = useMemo(
    () => (tanggalGangguan ? parseTanggalIndoParts(tanggalGangguan) : null),
    [tanggalGangguan]
  );

  const terbilangText = useMemo(
    () => (nominalAngka > 0 ? terbilangRupiah(nominalAngka) : '-'),
    [nominalAngka]
  );

  const filteredPetugas = useMemo(() => {
    const q = petugasSearch.trim().toLowerCase();
    if (!q) return REFERENSI_PETUGAS;
    return REFERENSI_PETUGAS.filter(
      (p) => p.nama.toLowerCase().includes(q) || p.nip.includes(q)
    );
  }, [petugasSearch]);

  const handleSelectNamaPetugas = (nama: string) => {
    setSelectedNamaPetugas(nama);
    if (!nama) {
      setSelectedNipPetugas('');
      return;
    }
    const found = REFERENSI_PETUGAS.find((p) => p.nama === nama);
    if (found) setSelectedNipPetugas(found.nip);
  };

  const handleSelectNipPetugas = (nip: string) => {
    setSelectedNipPetugas(nip);
    if (!nip) {
      setSelectedNamaPetugas('');
      return;
    }
    const found = REFERENSI_PETUGAS.find((p) => p.nip === nip);
    if (found) setSelectedNamaPetugas(found.nama);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (
      !lokasi.trim() ||
      !tanggalGangguan ||
      !jamGangguan ||
      !selectedNamaPetugas ||
      !selectedNipPetugas ||
      !namaWajibBayar.trim() ||
      !alamatInstansi.trim() ||
      !jenisLayanan ||
      nominalAngka < 1000 ||
      !kotaTTD.trim()
    ) {
      setFormError(
        'Mohon lengkapi seluruh kolom bertanda *Wajib diisi sebelum menyimpan Berita Acara.'
      );
      return;
    }

    if (!ttdWajibBayar || !ttdPetugas) {
      setFormError(
        'Mohon lengkapi kedua tanda tangan digital (Pihak Kedua & Petugas) sebelum menyimpan Berita Acara.'
      );
      return;
    }

    const idBA = `BA-PNBP-${yyyy}-${String(Date.now()).slice(-4)}`;

    onSubmitBeritaAcara({
      idBA,
      tanggalInput,
      nomorBA,
      hari: dateParts.hari,
      tanggalTeks: dateParts.tanggalTeks,
      bulanTeks: dateParts.bulanTeks,
      tahun: dateParts.tahun,
      pukulBA: '-',
      lokasi,
      namaPetugas: selectedNamaPetugas,
      nipPetugas: selectedNipPetugas,
      jabatanPetugas,
      namaWajibBayar,
      nikWajibBayar: '-',
      noHP: '-',
      alamatInstansi,
      jamGangguan: `${tanggalGangguan} ${jamGangguan}`,
      jenisLayanan,
      rincianLayanan,
      nominalAngka,
      terbilang: terbilangText,
      kotaTTD,
      tanggalTTD: dateParts.tanggalTTD,
      ttdWajibBayar,
      ttdPetugas,
      kodeBilling: '',
      kodeNtpn: '',
      buktiSetorUrl: '',
      buktiSetorNama: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 lg:pb-8">
      {/* Header Banner (Kemenkes Brand Gradient + Lime Highlight) */}
      <div className="rounded-2xl border border-[#10b1aa]/25 bg-gradient-to-r from-[#007376] via-[#0d948e] to-[#10b1aa] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Berita Acara Pembayaran Tunai PNBP - INTANKENDARI
            </h1>
            <p className="mt-1 text-xs text-[#c7edec] sm:text-sm">
              Digunakan khusus petugas pada kondisi Aplikasi SIMPONI dan atau
              SINKARKES tidak dapat diakses untuk dilakukan Transaksi pembayaran
              Elektronik
            </p>
          </div>
          <div className="shrink-0 font-mono text-xs font-semibold text-[#d1db26] tabular-nums">
            {dateParts.hari}, {dateParts.tanggalTTD}
          </div>
        </div>
        <div className="mt-4 h-1 w-24 rounded-full bg-[#d1db26]" />
      </div>

      {/* Section 1: Nomor, Tanggal & Lokasi */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-slate-900">
          01. Identitas & Lokasi Berita Acara
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Nomor Berita Acara
            </label>
            <input
              type="text"
              required
              readOnly={isLockedForRole}
              value={nomorBA}
              onChange={(e) => setNomorBA(e.target.value)}
              className={`mt-1.5 min-h-[44px] w-full rounded-xl border px-3.5 py-2 font-mono text-sm focus:outline-none ${
                isLockedForRole
                  ? 'border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed'
                  : 'border-slate-300 bg-white text-slate-900 focus:border-teal-700'
              }`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Tanggal Pembuatan Berita Acara
            </label>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              value={`${dateParts.hari}, ${dateParts.tanggalTTD}`}
              className="mt-1.5 min-h-[44px] w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Lokasi Pelaksanaan
              <RequiredMark />
            </label>
            <input
              type="text"
              required
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Tanggal Gangguan Teknis
              <RequiredMark />
            </label>
            <input
              type="date"
              required
              value={tanggalGangguan}
              onChange={(e) => setTanggalGangguan(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Jam Gangguan Sistem
              <RequiredMark />
            </label>
            <input
              type="time"
              required
              value={jamGangguan}
              onChange={(e) => setJamGangguan(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>
        {gangguanDateParts && jamGangguan ? (
          <p className="mt-3 text-xs text-slate-500">
            Keterangan gangguan teknis: Hari{' '}
            <strong>{gangguanDateParts.hari}</strong>, tanggal{' '}
            <strong>{gangguanDateParts.tanggalTeks}</strong> bulan{' '}
            <strong>{gangguanDateParts.bulanTeks}</strong> tahun{' '}
            <strong>{gangguanDateParts.tahun}</strong> sejak pukul{' '}
            <strong className="font-mono">{jamGangguan}</strong> waktu setempat.
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            Keterangan gangguan teknis akan terbentuk setelah Tanggal Gangguan
            Teknis dan Jam Gangguan Sistem diisi.
          </p>
        )}
      </section>

      {/* Section 2: PIHAK PERTAMA & PIHAK KEDUA */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* PIHAK PERTAMA (Petugas BKK Kendari from Reference CSV) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              02. Pihak Pertama (Petugas BKK Kendari)
            </h2>
            <span className="text-xs font-medium text-teal-700 tabular-nums">
              {REFERENSI_PETUGAS.length} Petugas
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Cari Nama / NIP Petugas (Opsional)
              </label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama atau NIP untuk menyaring..."
                  value={petugasSearch}
                  onChange={(e) => setPetugasSearch(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="select-nama-petugas"
                className="block text-xs font-medium text-slate-700"
              >
                Nama Lengkap Petugas (Referensi Resmi)
                <RequiredMark />
              </label>
              <select
                id="select-nama-petugas"
                required
                value={selectedNamaPetugas}
                onChange={(e) => handleSelectNamaPetugas(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                <option value="">-- Pilih Nama Lengkap Petugas --</option>
                {filteredPetugas.map((p) => (
                  <option key={`${p.nip}-${p.nama}`} value={p.nama}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="select-nip-petugas"
                className="block text-xs font-medium text-slate-700"
              >
                NIP Petugas (Terisi Otomatis / Dropdown)
                <RequiredMark />
              </label>
              <select
                id="select-nip-petugas"
                required
                value={selectedNipPetugas}
                onChange={(e) => handleSelectNipPetugas(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                <option value="">-- Pilih / Terisi Otomatis NIP --</option>
                {filteredPetugas.map((p) => (
                  <option key={`nip-${p.nip}-${p.nama}`} value={p.nip}>
                    {p.nip} — {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Jabatan Petugas
              </label>
              <input
                type="text"
                required
                value={jabatanPetugas}
                onChange={(e) => setJabatanPetugas(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* PIHAK KEDUA (Wajib Bayar) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-sm font-semibold text-slate-900">
            03. Pihak Kedua (Wajib Bayar)
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nama Lengkap Wajib Bayar
                <RequiredMark />
              </label>
              <input
                type="text"
                required
                value={namaWajibBayar}
                onChange={(e) => setNamaWajibBayar(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Alamat / Instansi Wajib Bayar
                <RequiredMark />
              </label>
              <textarea
                rows={3}
                required
                placeholder="Alamat lengkap atau nama perusahaan/agen pelayaran..."
                value={alamatInstansi}
                onChange={(e) => setAlamatInstansi(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: Rincian Penerimaan PNBP Tunai */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-slate-900">
          04. Rincian Pembayaran PNBP Tunai
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Jenis Layanan / PNBP
              <RequiredMark />
            </label>
            <select
              required
              value={jenisLayanan}
              onChange={(e) => setJenisLayanan(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              <option value="">-- Pilih Jenis Layanan / PNBP --</option>
              {JENIS_LAYANAN_PNBP.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Nominal Diterima (Rp)
              <RequiredMark />
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              step={1}
              required
              value={nominalInput}
              onChange={(e) => setNominalInput(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-base font-semibold tabular-nums text-teal-800 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Rincian Layanan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 1 Orang Vaksinasi Meningitis & Buku ICV / Pemeriksaan SSCEC KM. Nusantara"
              value={rincianLayanan}
              onChange={(e) => setRincianLayanan(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-teal-900">
                Nominal:{' '}
                <strong className="font-mono">
                  {nominalAngka > 0 ? `Rp ${formatAngka(nominalAngka)},-` : '-'}
                </strong>
              </span>
              <span className="text-teal-800">
                Terbilang: <strong>{terbilangText}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Direct Digital Signature on Smartphone / Desktop */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              05. Tanda Tangan Langsung di Aplikasi
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Bubuhkan tanda tangan Wajib Bayar dan Petugas langsung di layar
              smartphone atau komputer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Kota TTD:
              <RequiredMark />
            </label>
            <input
              type="text"
              required
              value={kotaTTD}
              onChange={(e) => setKotaTTD(e.target.value)}
              className="min-h-[38px] w-36 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SignaturePad
            label="Tanda Tangan PIHAK KEDUA (Wajib Bayar)"
            signerName={namaWajibBayar || 'Belum diisi'}
            value={ttdWajibBayar}
            onChange={setTtdWajibBayar}
          />
          <SignaturePad
            label="Tanda Tangan PIHAK PERTAMA (Petugas BKK Kendari)"
            signerName={
              selectedNamaPetugas
                ? `${selectedNamaPetugas} (NIP. ${selectedNipPetugas})`
                : 'Belum dipilih'
            }
            value={ttdPetugas}
            onChange={setTtdPetugas}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <span
            className={`inline-flex items-center gap-1 ${
              ttdWajibBayar ? 'text-teal-700 font-medium' : 'text-slate-400'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            TTD Wajib Bayar {ttdWajibBayar ? 'Siap' : 'Belum diisi'}
          </span>
          <span
            className={`inline-flex items-center gap-1 ${
              ttdPetugas ? 'text-teal-700 font-medium' : 'text-slate-400'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            TTD Petugas {ttdPetugas ? 'Siap' : 'Belum diisi'}
          </span>
        </div>
      </section>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {formError}
        </div>
      )}

      {/* Submit CTA & Back Button */}
      <div className="space-y-3 pt-1">
        <p className="text-xs text-[#63625e]">
          Setelah dikirim, status awal adalah <strong>Menunggu Validasi</strong>{' '}
          dan baru dapat dicetak PDF setelah disetujui Admin.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://intankendari.glide.page/dl/dd2dda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#007376] bg-white px-6 py-3 text-sm font-semibold text-[#007376] shadow-sm transition-colors hover:bg-[#c7edec]/40 active:scale-[0.99] sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            KEMBALI
          </a>
          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#007376] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#005a5d] active:scale-[0.99] sm:w-auto"
          >
            <FileCheck2 className="h-4 w-4" />
            Simpan Berita Acara
          </button>
        </div>
      </div>
    </form>
  );
};
