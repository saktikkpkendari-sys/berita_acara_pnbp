import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BULAN_INDO, parseGangguanInfo } from '../data/petugasList';
import { DEFAULT_VALIDATOR_NAME } from './googleSheets';
import { AgencySettings, BeritaAcaraPNBP } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatAngka(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return `${parts[2]} ${BULAN_INDO[parts[1] - 1]} ${parts[0]}`;
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return `${parsed.getDate()} ${BULAN_INDO[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export const KOP_SURAT_IMAGE_URL = `${import.meta.env.BASE_URL}assets/aistudio/kop_2025_net_a4e1caa5.png`;

let cachedKopDataUrl: string | null = null;

export async function loadKopSuratDataUrl(): Promise<string | null> {
  if (cachedKopDataUrl) return cachedKopDataUrl;
  try {
    const res = await fetch(KOP_SURAT_IMAGE_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca gambar kop surat.'));
      reader.readAsDataURL(blob);
    });
    if (dataUrl.startsWith('data:image/')) {
      cachedKopDataUrl = dataUrl;
      return cachedKopDataUrl;
    }
    return null;
  } catch {
    return null;
  }
}

function addKopSurat(
  doc: jsPDF,
  agency: AgencySettings,
  kopDataUrl: string | null
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  if (kopDataUrl) {
    try {
      const imgW = pageWidth - 32; // 178mm
      const imgH = imgW * (142 / 682); // Preserve exact 682x142 ratio (~37.06mm)
      doc.addImage(kopDataUrl, 'PNG', 16, 10, imgW, imgH);
      const lineY = 10 + imgH + 2;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(16, lineY, pageWidth - 16, lineY);
      doc.setLineWidth(0.25);
      doc.line(16, lineY + 1.5, pageWidth - 16, lineY + 1.5);
      return lineY + 8;
    } catch {
      // Fallback to text kop if image embedding fails
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110); // Kemenkes Teal accent
  doc.text(agency.namaInstansi.toUpperCase(), centerX, 17, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(agency.subUnit.toUpperCase(), centerX, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(agency.alamatInstansi, centerX, 27.5, { align: 'center' });
  doc.text(agency.teleponEmail, centerX, 31.8, { align: 'center' });

  // Double horizontal kop line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(18, 35, pageWidth - 18, 35);
  doc.setLineWidth(0.25);
  doc.line(18, 36.5, pageWidth - 18, 36.5);

  return 44;
}

export async function generateBeritaAcaraPdf(
  entry: BeritaAcaraPNBP,
  agency: AgencySettings
): Promise<{ blob: Blob; fileName: string }> {
  if (entry.statusValidasi !== 'Disetujui') {
    throw new Error('Berita Acara hanya dapat dicetak setelah divalidasi Admin.');
  }

  const kopDataUrl = await loadKopSuratDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const leftM = 18;
  const contentW = pageWidth - 36;

  let y = addKopSurat(doc, agency, kopDataUrl);

  // Title matching TEMPLATE_BA_a1b4f38c
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  const titleText = 'BERITA ACARA PEMBAYARAN PNBP TUNAI';
  doc.text(titleText, centerX, y, { align: 'center' });
  const titleWidth = doc.getTextWidth(titleText);
  doc.setLineWidth(0.4);
  doc.line(centerX - titleWidth / 2, y + 1.3, centerX + titleWidth / 2, y + 1.3);

  y += 6.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nomor: ${entry.nomorBA}`, centerX, y, { align: 'center' });

  y += 9;
  const pembukaan = `Pada hari ini, ${entry.hari}, tanggal ${entry.tanggalTeks} bulan ${entry.bulanTeks} tahun ${entry.tahun}, bertempat di ${entry.lokasi}, kami yang bertanda tangan di bawah ini:`;
  doc.setFontSize(9.8);
  doc.setTextColor(30, 41, 59);
  const splitOpening = doc.splitTextToSize(pembukaan, contentW);
  doc.text(splitOpening, leftM, y);
  y += splitOpening.length * 4.8 + 3;

  // PIHAK PERTAMA
  autoTable(doc, {
    startY: y,
    margin: { left: leftM, right: leftM },
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 5 },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
    },
    body: [
      ['Nama', ':', entry.namaPetugas],
      ['NIP', ':', entry.nipPetugas],
      ['Jabatan', ':', entry.jabatanPetugas],
    ],
  });
  y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 15) + 1.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.2);
  doc.text('(Selanjutnya disebut sebagai PIHAK PERTAMA)', leftM, y + 3);
  y += 8;

  // PIHAK KEDUA
  autoTable(doc, {
    startY: y,
    margin: { left: leftM, right: leftM },
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 5 },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
    },
    body: [
      ['Nama', ':', entry.namaWajibBayar],
      ...(entry.nikWajibBayar && entry.nikWajibBayar !== '-'
        ? [['NIK', ':', entry.nikWajibBayar]]
        : []),
      ...(entry.noHP && entry.noHP !== '-'
        ? [['Nomor HP (WA)', ':', entry.noHP]]
        : []),
      ['Alamat', ':', entry.alamatInstansi],
    ],
  });
  y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20) + 1.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.2);
  doc.text('(Selanjutnya disebut sebagai PIHAK KEDUA)', leftM, y + 3);
  y += 9;

  // Body Points 1-4
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Dengan ini menerangkan hal-hal sebagai berikut:', leftM, y);
  y += 5.5;

  const gangguan = parseGangguanInfo(entry.jamGangguan, entry.tanggalInput);
  const p1 = `1. Telah terjadi gangguan teknis pada sistem layanan pembayaran elektronik pada hari ${gangguan.hari}, tanggal ${gangguan.tanggalTeks} bulan ${gangguan.bulanTeks} tahun ${gangguan.tahun} sejak pukul ${gangguan.jam} waktu setempat sehingga pembayaran non-tunai tidak dapat diproses.`;
  const splitP1 = doc.splitTextToSize(p1, contentW);
  doc.text(splitP1, leftM, y);
  y += splitP1.length * 4.5 + 2.5;

  const p2 =
    '2. Demi kelancaran pelayanan publik, PIHAK KEDUA menyerahkan pembayaran Penerimaan Negara Bukan Pajak (PNBP) secara tunai kepada PIHAK PERTAMA, dan PIHAK PERTAMA telah menerima uang tunai tersebut dengan rincian:';
  const splitP2 = doc.splitTextToSize(p2, contentW);
  doc.text(splitP2, leftM, y);
  y += splitP2.length * 4.5 + 1.5;

  autoTable(doc, {
    startY: y,
    margin: { left: leftM + 5, right: leftM },
    theme: 'plain',
    styles: { fontSize: 9.2, cellPadding: 1.2, textColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 5 },
      2: { cellWidth: 'auto', fontStyle: 'bold' },
    },
    body: [
      ['• Jenis Layanan / PNBP', ':', entry.jenisLayanan],
      ['• Rincian Layanan', ':', entry.rincianLayanan],
      ['• Nominal Diterima', ':', `Rp ${formatAngka(entry.nominalAngka)},-`],
      ['• Terbilang', ':', entry.terbilang],
    ],
  });
  y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20) + 3.5;

  const p3 =
    '3. PIHAK PERTAMA berkewajiban menyimpan uang tunai tersebut dan segera membuatkan kode billing serta menyetorkannya ke Kas Negara melalui Bank/Pos Persepsi paling lambat 1 (satu) hari kerja setelah sistem kembali normal.';
  const splitP3 = doc.splitTextToSize(p3, contentW);
  doc.text(splitP3, leftM, y);
  y += splitP3.length * 4.5 + 2.5;

  const p4 =
    '4. Bukti Penerimaan Negara (BPN) / Nomor Transaksi Penerimaan Negara (NTPN) yang terbit setelah penyetoran akan disampaikan kepada Bendahara Penerimaan dan PIHAK KEDUA sebagai bukti setor yang sah.';
  const splitP4 = doc.splitTextToSize(p4, contentW);
  doc.text(splitP4, leftM, y);
  y += splitP4.length * 4.5 + 4;

  const closing =
    'Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya sebagai bahan pertanggungjawaban administrasi dan keuangan.';
  const splitClosing = doc.splitTextToSize(closing, contentW);
  doc.text(splitClosing, leftM, y);
  y += splitClosing.length * 4.5 + 6;

  if (y > 225) {
    doc.addPage();
    y = 24;
  }

  // Signature Section matching TEMPLATE_BA_a1b4f38c
  const colLeftX = 54;
  const colRightX = pageWidth - 54;

  doc.setFontSize(9.5);
  doc.text(`${entry.kotaTTD || agency.kota}, ${entry.tanggalTTD}`, colRightX, y, {
    align: 'center',
  });
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('PIHAK KEDUA', colLeftX, y, { align: 'center' });
  doc.text('PIHAK PERTAMA', colRightX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text('(Wajib Bayar)', colLeftX, y + 4.2, { align: 'center' });
  doc.text('(Petugas BKK Kelas I Kendari)', colRightX, y + 4.2, {
    align: 'center',
  });

  // Embed drawn signatures if present
  const sigTopY = y + 7;
  if (entry.ttdWajibBayar && entry.ttdWajibBayar.startsWith('data:image/')) {
    try {
      doc.addImage(entry.ttdWajibBayar, 'PNG', colLeftX - 20, sigTopY, 40, 16);
    } catch {
      // skip invalid image
    }
  }
  if (entry.ttdPetugas && entry.ttdPetugas.startsWith('data:image/')) {
    try {
      doc.addImage(entry.ttdPetugas, 'PNG', colRightX - 20, sigTopY, 40, 16);
    } catch {
      // skip invalid image
    }
  }

  const nameY = sigTopY + 21;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(entry.namaWajibBayar, colLeftX, nameY, { align: 'center' });
  doc.text(entry.namaPetugas, colRightX, nameY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${entry.nipPetugas}`, colRightX, nameY + 4.2, {
    align: 'center',
  });

  // Compact validation audit footer
  const footerY = Math.min(nameY + 13, 282);
  doc.setDrawColor(0, 115, 118);
  doc.setFillColor(199, 237, 235);
  doc.roundedRect(leftM, footerY, contentW, 10, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 115, 118);
  doc.text(
    `TERVALIDASI: ${entry.validatorAdmin || DEFAULT_VALIDATOR_NAME} · Tanggal: ${formatTanggalIndo(entry.tanggalValidasi)} · ID: ${entry.idBA}`,
    leftM + 3,
    footerY + 6.2
  );

  const safeId = entry.idBA.replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `Berita_Acara_PNBP_${safeId}.pdf`;
  return { blob: doc.output('blob'), fileName };
}

export async function generateMonthlyRecapPdf(
  validatedEntries: BeritaAcaraPNBP[],
  month: number,
  year: number,
  agency: AgencySettings,
  _excludedCount: number
): Promise<{ blob: Blob; fileName: string }> {
  const kopDataUrl = await loadKopSuratDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const monthName = BULAN_INDO[month - 1] || String(month);

  // Use centered proportioned Kop Surat on landscape page
  let y = 12;
  if (kopDataUrl) {
    try {
      const imgW = 190;
      const imgH = imgW * (142 / 682);
      doc.addImage(kopDataUrl, 'PNG', centerX - imgW / 2, 8, imgW, imgH);
      const lineY = 8 + imgH + 2;
      doc.setDrawColor(0, 115, 118);
      doc.setLineWidth(0.8);
      doc.line(16, lineY, pageWidth - 16, lineY);
      doc.setDrawColor(209, 219, 38);
      doc.setLineWidth(0.5);
      doc.line(16, lineY + 1.5, pageWidth - 16, lineY + 1.5);
      y = lineY + 8;
    } catch {
      y = addKopSurat(doc, agency, null);
    }
  } else {
    y = addKopSurat(doc, agency, null);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'REKAPITULASI BULANAN BERITA ACARA PEMBAYARAN PNBP TUNAI',
    centerX,
    y,
    { align: 'center' }
  );

  y += 5.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Periode: ${monthName} ${year}`, centerX, y, { align: 'center' });
  y += 7;

  const totalNominal = validatedEntries.reduce(
    (acc, item) => acc + item.nominalAngka,
    0
  );

  autoTable(doc, {
    startY: y,
    margin: { left: 16, right: 16 },
    theme: 'grid',
    headStyles: {
      fillColor: [0, 115, 118],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [191, 191, 191],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 36 },
      3: { cellWidth: 48 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: 28 },
      8: { cellWidth: 28, halign: 'right' },
    },
    head: [
      [
        'No',
        'Tanggal',
        'Nomor BA',
        'Petugas dan Pengguna Jasa',
        'Jenis Layanan PNBP',
        'Kode Billing',
        'Kode NTPN',
        'Bukti Setor',
        'Nominal (Rp)',
      ],
    ],
    body: validatedEntries.map((item, idx) => [
      String(idx + 1),
      item.tanggalInput,
      item.nomorBA,
      `Petugas: ${item.namaPetugas}\nPengguna Jasa: ${item.namaWajibBayar}`,
      item.jenisLayanan,
      item.kodeBilling || '-',
      item.kodeNtpn || '-',
      item.buktiSetorUrl ? item.buktiSetorNama || 'Terlampir' : '-',
      formatRupiah(item.nominalAngka),
    ]),
    foot: [
      [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'TOTAL PENERIMAAN',
        formatRupiah(totalNominal),
      ],
    ],
    footStyles: {
      fillColor: [199, 237, 235],
      textColor: [0, 115, 118],
      fontStyle: 'bold',
      fontSize: 8,
    },
  });

  y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 35) + 9;

  if (y > 165) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(9.2);
  doc.setTextColor(30, 41, 59);
  const todayStr = formatTanggalIndo(new Date().toISOString().slice(0, 10));
  doc.text(`${agency.kota}, ${todayStr}`, pageWidth - 22, y, {
    align: 'right',
  });
  doc.text('Mengetahui / Mengesahkan,', pageWidth - 22, y + 5, {
    align: 'right',
  });
  const jabatanLines = doc.splitTextToSize(
    agency.jabatanPimpinan || '',
    95
  ) as string[];
  doc.text(jabatanLines, pageWidth - 22, y + 9.5, {
    align: 'right',
  });

  const sigNameY = y + 9.5 + jabatanLines.length * 4.5 + 12;
  doc.setFont('helvetica', 'bold');
  doc.text(agency.namaPimpinan, pageWidth - 22, sigNameY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP. ${agency.nipPimpinan}`, pageWidth - 22, sigNameY + 4.5, {
    align: 'right',
  });

  const fileName = `Rekap_Bulanan_PNBP_${monthName}_${year}.pdf`;
  return { blob: doc.output('blob'), fileName };
}
