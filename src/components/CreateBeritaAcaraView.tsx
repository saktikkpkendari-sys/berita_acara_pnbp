import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, Search } from 'lucide-react';
import {
  JENIS_LAYANAN_PNBP,
  parseTanggalIndoParts,
  REFERENSI_PETUGAS,
  terbilangRupiah,
} from '../data/petugasList';
import { AgencySettings, BeritaAcaraPNBP } from '../types';
import { formatAngka } from '../services/pdfGenerator';
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
  nextSequence: number;
  hasSpreadsheet: boolean;
  onSubmitBeritaAcara: (payload: CreatePayload) => void;
  onRequireAuthOrSheet: () => void;
}

export const CreateBeritaAcaraView: React.FC<CreateBeritaAcaraViewProps> = ({
  agency,
  nextSequence,
  hasSpreadsheet,
  onSubmitBeritaAcara,
  onRequireAuthOrSheet,
}) => {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const seqStr = String(nextSequence).padStart(3, '0');
  const mm = todayIso.slice(5, 7);
  const yyyy = todayIso.slice(0, 4);

  const [tanggalInput, setTanggalInput] = useState<string>(todayIso);
  const [nomorBA, setNomorBA] = useState<string>(
    `${seqStr}/${agency.kodeSuratPrefix}/${mm}/${yyyy}`
  );
  const [pukulBA, setPukulBA] = useState<string>(currentTime);
  const [jamGangguan, setJamGangguan] = useState<string>('08:30');
  const [lokasi, setLokasi] = useState<string>(
    'Pelayanan Terpadu BKK Kelas I Kendari'
  );

  const [petugasSearch, setPetugasSearch] = useState<string>('');
  const [selectedNamaPetugas, setSelectedNamaPetugas] = useState<string>(
    REFERENSI_PETUGAS[0].nama
  );
  const [selectedNipPetugas, setSelectedNipPetugas] = useState<string>(
    REFERENSI_PETUGAS[0].nip
  );
  const [jabatanPetugas, setJabatanPetugas] = useState<string>(
    'Petugas Layanan Karantina Kesehatan'
  );

  const [namaWajibBayar, setNamaWajibBayar] = useState<string>('');
  const [alamatInstansi, setAlamatInstansi] = useState<string>('');

  const [jenisLayanan, setJenisLayanan] = useState<string>(
    JENIS_LAYANAN_PNBP[0]
  );
  const [rincianLayanan, setRincianLayanan] = useState<string>('');
  const [nominalAngka, setNominalAngka] = useState<number>(305000);
  const [kotaTTD, setKotaTTD] = useState<string>(agency.kota || 'Kendari');

  const [ttdWajibBayar, setTtdWajibBayar] = useState<string>('');
  const [ttdPetugas, setTtdPetugas] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const dateParts = useMemo(
    () => parseTanggalIndoParts(tanggalInput),
    [tanggalInput]
  );

  const terbilangText = useMemo(
    () => terbilangRupiah(nominalAngka),
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
    const found = REFERENSI_PETUGAS.find((p) => p.nama === nama);
    if (found) setSelectedNipPetugas(found.nip);
  };

  const handleSelectNipPetugas = (nip: string) => {
    setSelectedNipPetugas(nip);
    const found = REFERENSI_PETUGAS.find((p) => p.nip === nip);
    if (found) setSelectedNamaPetugas(found.nama);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!hasSpreadsheet) {
      onRequireAuthOrSheet();
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
      pukulBA,
      lokasi,
      namaPetugas: selectedNamaPetugas,
      nipPetugas: selectedNipPetugas,
      jabatanPetugas,
      namaWajibBayar,
      nikWajibBayar: '-',
      noHP: '-',
      alamatInstansi,
      jamGangguan,
      jenisLayanan,
      rincianLayanan,
      nominalAngka,
      terbilang: terbilangText,
      kotaTTD,
      tanggalTTD: dateParts.tanggalTTD,
      ttdWajibBayar,
      ttdPetugas,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24 lg:pb-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-teal-800/15 bg-gradient-to-br from-[#0F766E] to-[#115E59] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Buat Berita Acara Pembayaran PNBP Tunai
            </h1>
            <p className="mt-1 text-xs text-teal-50/90 sm:text-sm">
              Formulir lapangan BKK Kelas I Kendari · Dilengkapi tanda tangan
              langsung dan otomatis terkirim untuk validasi Admin.
            </p>
          </div>
          <div className="shrink-0 font-mono text-xs text-lime-200 tabular-nums">
            {dateParts.hari}, {dateParts.tanggalTTD}
          </div>
        </div>
      </div>

      {/* Section 1: Nomor, Waktu & Lokasi */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-display text-sm font-semibold text-slate-900">
          01. Identitas Waktu & Lokasi Berita Acara
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Nomor Berita Acara
            </label>
            <input
              type="text"
              required
              value={nomorBA}
              onChange={(e) => setNomorBA(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Tanggal Berita Acara
            </label>
            <input
              type="date"
              required
              value={tanggalInput}
              onChange={(e) => setTanggalInput(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Pukul BA (WITA)
            </label>
            <input
              type="time"
              required
              value={pukulBA}
              onChange={(e) => setPukulBA(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-slate-700">
              Lokasi Pelaksanaan
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
              Jam Mulai Gangguan Sistem
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
        <p className="mt-3 text-xs text-slate-500">
          Otomatis terkonversi: Hari <strong>{dateParts.hari}</strong>, tanggal{' '}
          <strong>{dateParts.tanggalTeks}</strong> bulan{' '}
          <strong>{dateParts.bulanTeks}</strong> tahun{' '}
          <strong>{dateParts.tahun}</strong>.
        </p>
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
              </label>
              <select
                id="select-nama-petugas"
                value={selectedNamaPetugas}
                onChange={(e) => handleSelectNamaPetugas(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              >
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
              </label>
              <select
                id="select-nip-petugas"
                value={selectedNipPetugas}
                onChange={(e) => handleSelectNipPetugas(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
              >
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
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: H. Ahmad Fauzan"
                value={namaWajibBayar}
                onChange={(e) => setNamaWajibBayar(e.target.value)}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Alamat / Instansi Wajib Bayar
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
            </label>
            <select
              value={jenisLayanan}
              onChange={(e) => setJenisLayanan(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            >
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
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              step={500}
              required
              value={nominalAngka}
              onChange={(e) => setNominalAngka(Number(e.target.value) || 0)}
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
                Nominal: <strong className="font-mono">Rp {formatAngka(nominalAngka)},-</strong>
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
            </label>
            <input
              type="text"
              required
              value={kotaTTD}
              onChange={(e) => setKotaTTD(e.target.value)}
              className="min-h-[38px] w-32 rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
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
            signerName={`${selectedNamaPetugas} (NIP. ${selectedNipPetugas})`}
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

      {/* Submit CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Setelah dikirim, status awal adalah <strong>Menunggu Validasi</strong>{' '}
          dan baru dapat dicetak PDF setelah disetujui Admin.
        </p>
        <button
          type="submit"
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0F766E] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0D5D57] active:scale-[0.99] sm:w-auto"
        >
          <FileCheck2 className="h-4 w-4" />
          Simpan Berita Acara ke Google Sheet
        </button>
      </div>
    </form>
  );
};
