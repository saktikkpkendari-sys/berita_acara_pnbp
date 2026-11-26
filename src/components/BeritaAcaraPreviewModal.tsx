import React from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
  UploadCloud,
  X,
} from 'lucide-react';
import { AgencySettings, BeritaAcaraPNBP } from '../types';
import { parseGangguanInfo } from '../data/petugasList';
import { DEFAULT_VALIDATOR_NAME } from '../services/googleSheets';
import {
  formatAngka,
  formatTanggalIndo,
  generateBeritaAcaraPdf,
  KOP_SURAT_IMAGE_URL,
} from '../services/pdfGenerator';

interface BeritaAcaraPreviewModalProps {
  entry: BeritaAcaraPNBP | null;
  agency: AgencySettings;
  canSaveToDrive?: boolean;
  onClose: () => void;
  onRequestSaveToDrive: (
    entry: BeritaAcaraPNBP,
    pdfBlob: Blob,
    fileName: string
  ) => void;
}

export const BeritaAcaraPreviewModal: React.FC<BeritaAcaraPreviewModalProps> = ({
  entry,
  agency,
  canSaveToDrive = false,
  onClose,
  onRequestSaveToDrive,
}) => {
  if (!entry) return null;

  const isValidated = entry.statusValidasi === 'Disetujui';
  const gangguanInfo = parseGangguanInfo(entry.jamGangguan, entry.tanggalInput);

  const handleDownloadPdf = async () => {
    const { blob, fileName } = await generateBeritaAcaraPdf(entry, agency);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadDrive = async () => {
    const { blob, fileName } = await generateBeritaAcaraPdf(entry, agency);
    onRequestSaveToDrive(entry, blob, fileName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-[2px] sm:p-4 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Dokumen Berita Acara PNBP Tunai"
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl print:max-h-none print:rounded-none print:border-none print:bg-white print:shadow-none">
        {/* Action Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-900 truncate">
              Pratinjau Berita Acara PNBP · {entry.nomorBA}
            </h2>
            <p className="text-xs text-slate-500">
              ID: <span className="font-mono">{entry.idBA}</span> · Status:{' '}
              {entry.statusValidasi}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {entry.linkPdfBA && (
              <a
                href={entry.linkPdfBA}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                PDF di Drive
              </a>
            )}
            {canSaveToDrive && (
              <button
                type="button"
                onClick={handleUploadDrive}
                disabled={!isValidated}
                className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Simpan Drive
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!isValidated}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak A4
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!isValidated}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#007376] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#005a5d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup pratinjau"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet matching TEMPLATE_BA_a1b4f38c */}
        <div className="overflow-y-auto p-3 sm:p-8 print:overflow-visible print:p-0">
          <div className="print-only-sheet mx-auto max-w-[780px] border border-slate-300 bg-white p-6 text-slate-900 shadow-sm sm:p-12">
            {/* Kop Surat Resmi */}
            <div className="border-b-2 border-slate-900 pb-2.5">
              <img
                src={KOP_SURAT_IMAGE_URL}
                alt={`Kop Surat ${agency.subUnit}`}
                className="mx-auto w-full h-auto object-contain"
              />
            </div>
            <div className="mt-[2px] border-t border-slate-900" />

            {/* Title */}
            <div className="mt-6 text-center">
              <h3 className="font-display text-sm font-bold underline underline-offset-4 sm:text-base">
                BERITA ACARA PEMBAYARAN PNBP TUNAI
              </h3>
              <p className="mt-1 font-mono text-xs text-slate-700 tabular-nums">
                Nomor: {entry.nomorBA}
              </p>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-3.5 text-xs leading-relaxed text-slate-800 sm:text-sm">
              <p>
                Pada hari ini, <strong>{entry.hari}</strong>, tanggal{' '}
                <strong>{entry.tanggalTeks}</strong> bulan{' '}
                <strong>{entry.bulanTeks}</strong> tahun{' '}
                <strong>{entry.tahun}</strong>, bertempat di{' '}
                <strong>{entry.lokasi}</strong>, kami yang bertanda tangan di
                bawah ini:
              </p>

              {/* PIHAK PERTAMA */}
              <div>
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 sm:w-40">Nama</td>
                      <td className="w-4 py-0.5">:</td>
                      <td className="py-0.5 font-semibold">
                        {entry.namaPetugas}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">NIP</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5 font-mono tabular-nums">
                        {entry.nipPetugas}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Jabatan</td>
                      <td className="py-0.5">:</td>
                      <td className="py-0.5">{entry.jabatanPetugas}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 italic text-slate-700">
                  (Selanjutnya disebut sebagai PIHAK PERTAMA)
                </div>
              </div>

              {/* PIHAK KEDUA */}
              <div>
                <table className="w-full text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 sm:w-40">Nama</td>
                      <td className="w-4 py-0.5">:</td>
                      <td className="py-0.5 font-semibold">
                        {entry.namaWajibBayar}
                      </td>
                    </tr>
                    {entry.nikWajibBayar && entry.nikWajibBayar !== '-' && (
                      <tr>
                        <td className="py-0.5">NIK</td>
                        <td className="py-0.5">:</td>
                        <td className="py-0.5 font-mono tabular-nums">
                          {entry.nikWajibBayar}
                        </td>
                      </tr>
                    )}
                    {entry.noHP && entry.noHP !== '-' && (
                      <tr>
                        <td className="py-0.5">Nomor HP (WA)</td>
                        <td className="py-0.5">:</td>
                        <td className="py-0.5 font-mono tabular-nums">
                          {entry.noHP}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-0.5 align-top">Alamat</td>
                      <td className="py-0.5 align-top">:</td>
                      <td className="py-0.5">{entry.alamatInstansi}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 italic text-slate-700">
                  (Selanjutnya disebut sebagai PIHAK KEDUA)
                </div>
              </div>

              <p className="pt-1">
                Dengan ini menerangkan hal-hal sebagai berikut:
              </p>

              <ol className="list-decimal space-y-2.5 pl-5">
                <li>
                  Telah terjadi gangguan teknis pada sistem layanan pembayaran
                  elektronik pada hari <strong>{gangguanInfo.hari}</strong>,
                  tanggal <strong>{gangguanInfo.tanggalTeks}</strong> bulan{' '}
                  <strong>{gangguanInfo.bulanTeks}</strong> tahun{' '}
                  <strong>{gangguanInfo.tahun}</strong> sejak pukul{' '}
                  <strong className="font-mono tabular-nums">
                    {gangguanInfo.jam}
                  </strong>{' '}
                  waktu setempat sehingga pembayaran non-tunai tidak dapat
                  diproses.
                </li>
                <li>
                  Demi kelancaran pelayanan publik, PIHAK KEDUA menyerahkan
                  pembayaran Penerimaan Negara Bukan Pajak (PNBP) secara tunai
                  kepada PIHAK PERTAMA, dan PIHAK PERTAMA telah menerima uang
                  tunai tersebut dengan rincian:
                  <table className="mt-2 w-full text-xs sm:text-sm">
                    <tbody>
                      <tr>
                        <td className="w-44 py-0.5 align-top">
                          • Jenis Layanan / PNBP
                        </td>
                        <td className="w-4 py-0.5 align-top">:</td>
                        <td className="py-0.5 font-medium">
                          {entry.jenisLayanan}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 align-top">• Rincian Layanan</td>
                        <td className="py-0.5 align-top">:</td>
                        <td className="py-0.5">{entry.rincianLayanan}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 align-top">• Nominal Diterima</td>
                        <td className="py-0.5 align-top">:</td>
                        <td className="py-0.5 font-mono font-semibold tabular-nums">
                          Rp {formatAngka(entry.nominalAngka)},-
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 align-top">• Terbilang</td>
                        <td className="py-0.5 align-top">:</td>
                        <td className="py-0.5 italic">{entry.terbilang}</td>
                      </tr>
                    </tbody>
                  </table>
                </li>
                <li>
                  PIHAK PERTAMA berkewajiban menyimpan uang tunai tersebut dan
                  segera membuatkan kode billing serta menyetorkannya ke Kas
                  Negara melalui Bank/Pos Persepsi paling lambat 1 (satu) hari
                  kerja setelah sistem kembali normal.
                </li>
                <li>
                  Bukti Penerimaan Negara (BPN) / Nomor Transaksi Penerimaan
                  Negara (NTPN) yang terbit setelah penyetoran akan disampaikan
                  kepada Bendahara Penerimaan dan PIHAK KEDUA sebagai bukti
                  setor yang sah.
                </li>
              </ol>

              <p className="pt-1">
                Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk
                dipergunakan sebagaimana mestinya sebagai bahan
                pertanggungjawaban administrasi dan keuangan.
              </p>

              {/* Signature Block matching TEMPLATE_BA_a1b4f38c */}
              <div className="pt-4">
                <div className="grid grid-cols-2 gap-6 text-center text-xs sm:text-sm">
                  <div className="flex flex-col items-center justify-end">
                    <p className="font-semibold">PIHAK KEDUA</p>
                    <p className="text-xs text-slate-600">(Wajib Bayar)</p>
                    <div className="my-2 flex h-20 w-44 items-center justify-center">
                      {entry.ttdWajibBayar ? (
                        <img
                          src={entry.ttdWajibBayar}
                          alt={`Tanda tangan ${entry.namaWajibBayar}`}
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          (Belum ada TTD digital)
                        </span>
                      )}
                    </div>
                    <p className="font-semibold underline">
                      {entry.namaWajibBayar}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-end">
                    <p className="mb-1 text-xs">
                      {entry.kotaTTD || agency.kota}, {entry.tanggalTTD}
                    </p>
                    <p className="font-semibold">PIHAK PERTAMA</p>
                    <p className="text-xs text-slate-600">
                      (Petugas BKK Kelas I Kendari)
                    </p>
                    <div className="my-2 flex h-20 w-44 items-center justify-center">
                      {entry.ttdPetugas ? (
                        <img
                          src={entry.ttdPetugas}
                          alt={`Tanda tangan ${entry.namaPetugas}`}
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          (Belum ada TTD digital)
                        </span>
                      )}
                    </div>
                    <p className="font-semibold underline">
                      {entry.namaPetugas}
                    </p>
                    <p className="font-mono text-xs text-slate-700 tabular-nums">
                      NIP. {entry.nipPetugas}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation Seal */}
              <div className="mt-5 rounded-md border border-[#007376]/35 bg-[#c7edec]/40 px-3.5 py-2.5 text-[11px] text-slate-700">
                <div className="flex items-center gap-1.5 font-semibold text-[#007376]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  TERVALIDASI: {entry.validatorAdmin || DEFAULT_VALIDATOR_NAME}{' '}
                  · Tanggal: {formatTanggalIndo(entry.tanggalValidasi)}
                </div>
                {entry.catatanAdmin && (
                  <div className="mt-0.5 text-slate-600">
                    Catatan: {entry.catatanAdmin}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
