import React, { useState } from 'react';
import {
  AlertCircle,
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
  triggerPrintA4,
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
  const [printingA4, setPrintingA4] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

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

  const handlePrintA4 = async () => {
    if (!isValidated || printingA4) return;
    setPrintingA4(true);
    setPrintNotice(null);
    try {
      const result = await triggerPrintA4(() =>
        generateBeritaAcaraPdf(entry, agency, { autoPrint: true })
      );
      if (result === 'fallback-pdf') {
        setPrintNotice(
          'Mode pratinjau/iframe membatasi dialog cetak langsung browser. File PDF Siap Cetak A4 telah diunduh otomatis — buka file tersebut untuk langsung mencetak (Ctrl+P), atau buka aplikasi di tab browser penuh.'
        );
      }
    } finally {
      setPrintingA4(false);
    }
  };

  const handleUploadDrive = async () => {
    const { blob, fileName } = await generateBeritaAcaraPdf(entry, agency);
    onRequestSaveToDrive(entry, blob, fileName);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-[2px] sm:p-4 print:static print:inset-auto print:block print:bg-white print:p-0 print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Dokumen Berita Acara PNBP Tunai"
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl print:block print:max-h-none print:w-full print:max-w-none print:rounded-none print:border-none print:bg-white print:shadow-none">
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
              onClick={handlePrintA4}
              disabled={!isValidated || printingA4}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#007376]/40 bg-[#c7edec]/40 px-3 py-1.5 text-xs font-semibold text-[#007376] hover:bg-[#c7edec]/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              {printingA4 ? 'Menyiapkan Cetak...' : 'Cetak A4'}
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

        {printNotice && (
          <div className="no-print flex items-start justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{printNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrintNotice(null)}
              className="text-amber-700 hover:text-amber-950"
              aria-label="Tutup info cetak"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Printable A4 Sheet matching TEMPLATE_BA_a1b4f38c */}
        <div className="overflow-y-auto p-3 sm:p-8 print:overflow-visible print:p-0">
          <div className="print-only-sheet mx-auto max-w-[780px] border border-slate-300 bg-white p-6 text-slate-900 shadow-sm sm:p-12">
            {/* Kop Surat Resmi */}
            <div className="border-b-2 border-slate-900 pb-2.5 print:pb-1.5">
              <img
                src={KOP_SURAT_IMAGE_URL}
                alt={`Kop Surat ${agency.subUnit}`}
                className="mx-auto h-auto w-full object-contain print:max-h-[27mm] print:w-auto print:max-w-full"
              />
            </div>
            <div className="mt-[2px] border-t border-slate-900" />

            {/* Title */}
            <div className="mt-6 text-center print:mt-2.5">
              <h3 className="font-display text-sm font-bold underline underline-offset-4 sm:text-base print:text-[13px]">
                BERITA ACARA PEMBAYARAN PNBP TUNAI
              </h3>
              <p className="mt-1 font-mono text-xs text-slate-700 tabular-nums print:mt-0.5 print:text-[10.5px]">
                Nomor: {entry.nomorBA}
              </p>
            </div>

            {/* Body */}
            <div className="mt-5 space-y-3.5 text-xs leading-relaxed text-slate-800 sm:text-sm print:mt-2.5 print:space-y-1.5 print:text-[10.5px] print:leading-[1.38]">
              <p className="text-justify">
                Pada hari ini, <strong>{entry.hari}</strong>, tanggal{' '}
                <strong>{entry.tanggalTeks}</strong> bulan{' '}
                <strong>{entry.bulanTeks}</strong> tahun{' '}
                <strong>{entry.tahun}</strong>, bertempat di{' '}
                <strong>{entry.lokasi}</strong>, kami yang bertanda tangan di
                bawah ini:
              </p>

              {/* PIHAK PERTAMA */}
              <div>
                <table className="w-full text-xs sm:text-sm print:text-[10.5px]">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 sm:w-40 print:w-32 print:py-[1px]">
                        Nama
                      </td>
                      <td className="w-4 py-0.5 print:py-[1px]">:</td>
                      <td className="py-0.5 font-semibold print:py-[1px]">
                        {entry.namaPetugas}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5 print:py-[1px]">NIP</td>
                      <td className="py-0.5 print:py-[1px]">:</td>
                      <td className="py-0.5 font-mono tabular-nums print:py-[1px]">
                        {entry.nipPetugas}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5 print:py-[1px]">Jabatan</td>
                      <td className="py-0.5 print:py-[1px]">:</td>
                      <td className="py-0.5 print:py-[1px]">
                        {entry.jabatanPetugas}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 italic text-slate-700 print:mt-0.5">
                  (Selanjutnya disebut sebagai{' '}
                  <strong className="font-bold">PIHAK PERTAMA</strong>)
                </div>
              </div>

              {/* PIHAK KEDUA */}
              <div>
                <table className="w-full text-xs sm:text-sm print:text-[10.5px]">
                  <tbody>
                    <tr>
                      <td className="w-32 py-0.5 sm:w-40 print:w-32 print:py-[1px]">
                        Nama
                      </td>
                      <td className="w-4 py-0.5 print:py-[1px]">:</td>
                      <td className="py-0.5 font-semibold print:py-[1px]">
                        {entry.namaWajibBayar}
                      </td>
                    </tr>
                    {entry.nikWajibBayar && entry.nikWajibBayar !== '-' && (
                      <tr>
                        <td className="py-0.5 print:py-[1px]">NIK</td>
                        <td className="py-0.5 print:py-[1px]">:</td>
                        <td className="py-0.5 font-mono tabular-nums print:py-[1px]">
                          {entry.nikWajibBayar}
                        </td>
                      </tr>
                    )}
                    {entry.noHP && entry.noHP !== '-' && (
                      <tr>
                        <td className="py-0.5 print:py-[1px]">Nomor HP (WA)</td>
                        <td className="py-0.5 print:py-[1px]">:</td>
                        <td className="py-0.5 font-mono tabular-nums print:py-[1px]">
                          {entry.noHP}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-0.5 align-top print:py-[1px]">Alamat</td>
                      <td className="py-0.5 align-top print:py-[1px]">:</td>
                      <td className="py-0.5 print:py-[1px]">
                        {entry.alamatInstansi}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-1 italic text-slate-700 print:mt-0.5">
                  (Selanjutnya disebut sebagai{' '}
                  <strong className="font-bold">PIHAK KEDUA</strong>)
                </div>
              </div>

              <p className="pt-1 print:pt-0.5">
                Dengan ini menerangkan hal-hal sebagai berikut:
              </p>

              <ol className="list-decimal space-y-2.5 pl-5 text-justify print:space-y-1.5">
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
                  Demi kelancaran pelayanan publik,{' '}
                  <strong className="font-bold">PIHAK KEDUA</strong> menyerahkan
                  pembayaran Penerimaan Negara Bukan Pajak (PNBP) secara tunai
                  kepada <strong className="font-bold">PIHAK PERTAMA</strong>,
                  dan <strong className="font-bold">PIHAK PERTAMA</strong> telah
                  menerima uang tunai tersebut dengan rincian:
                  <table className="mt-2 w-full text-left text-xs sm:text-sm print:mt-1 print:text-[10.5px]">
                    <tbody>
                      <tr>
                        <td className="w-44 py-0.5 align-top print:w-40 print:py-[1px]">
                          • Jenis Layanan / PNBP
                        </td>
                        <td className="w-4 py-0.5 align-top print:py-[1px]">:</td>
                        <td className="py-0.5 font-medium print:py-[1px]">
                          {entry.jenisLayanan}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 align-top print:py-[1px]">
                          • Rincian Layanan
                        </td>
                        <td className="py-0.5 align-top print:py-[1px]">:</td>
                        <td className="py-0.5 print:py-[1px]">
                          {entry.rincianLayanan}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 align-top print:py-[1px]">
                          • Nominal Diterima
                        </td>
                        <td className="py-0.5 align-top print:py-[1px]">:</td>
                        <td className="py-0.5 font-mono font-semibold tabular-nums print:py-[1px]">
                          Rp {formatAngka(entry.nominalAngka)},-
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 align-top print:py-[1px]">
                          • Terbilang
                        </td>
                        <td className="py-0.5 align-top print:py-[1px]">:</td>
                        <td className="py-0.5 italic print:py-[1px]">
                          {entry.terbilang}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </li>
                <li>
                  <strong className="font-bold">PIHAK PERTAMA</strong>{' '}
                  berkewajiban menyimpan uang tunai tersebut dan segera
                  membuatkan kode billing serta menyetorkannya ke Kas Negara
                  melalui Bank/Pos Persepsi paling lambat 1 (satu) hari kerja
                  setelah sistem kembali normal.
                </li>
                <li>
                  Bukti Penerimaan Negara (BPN) / Nomor Transaksi Penerimaan
                  Negara (NTPN) yang terbit setelah penyetoran akan disampaikan
                  kepada Bendahara Penerimaan dan{' '}
                  <strong className="font-bold">PIHAK KEDUA</strong> sebagai
                  bukti setor yang sah.
                </li>
              </ol>

              <p className="pt-1 text-justify print:pt-0.5">
                Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk
                dipergunakan sebagaimana mestinya sebagai bahan
                pertanggungjawaban administrasi dan keuangan.
              </p>

              {/* Signature Block matching TEMPLATE_BA_a1b4f38c */}
              <div className="pt-4 print:pt-2 break-inside-avoid">
                <div className="grid grid-cols-2 gap-6 text-center text-xs sm:text-sm print:text-[10.5px]">
                  <div className="flex flex-col items-center justify-end">
                    <p className="font-bold">PIHAK KEDUA</p>
                    <p className="text-xs text-slate-600 print:text-[10px]">
                      (Wajib Bayar)
                    </p>
                    <div className="my-2 flex h-20 w-44 items-center justify-center print:my-1 print:h-14">
                      {entry.ttdWajibBayar ? (
                        <img
                          src={entry.ttdWajibBayar}
                          alt={`Tanda tangan ${entry.namaWajibBayar}`}
                          className="max-h-20 max-w-full object-contain print:max-h-14"
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
                    <p className="mb-1 text-xs print:mb-0.5 print:text-[10px]">
                      {entry.kotaTTD || agency.kota}, {entry.tanggalTTD}
                    </p>
                    <p className="font-bold">PIHAK PERTAMA</p>
                    <p className="text-xs text-slate-600 print:text-[10px]">
                      (Petugas BKK Kelas I Kendari)
                    </p>
                    <div className="my-2 flex h-20 w-44 items-center justify-center print:my-1 print:h-14">
                      {entry.ttdPetugas ? (
                        <img
                          src={entry.ttdPetugas}
                          alt={`Tanda tangan ${entry.namaPetugas}`}
                          className="max-h-20 max-w-full object-contain print:max-h-14"
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
                    <p className="font-mono text-xs text-slate-700 tabular-nums print:text-[10px]">
                      NIP. {entry.nipPetugas}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation Seal */}
              <div className="mt-5 rounded-md border border-[#007376]/35 bg-[#c7edec]/40 px-3.5 py-2.5 text-[11px] text-slate-700 print:mt-2.5 print:px-3 print:py-1.5 print:text-[9.5px] break-inside-avoid">
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
