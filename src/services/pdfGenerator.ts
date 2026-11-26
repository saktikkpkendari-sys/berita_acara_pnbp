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

interface KopOptions {
  topY?: number;
  imgW?: number;
  lineLeft?: number;
  bottomGap?: number;
}

function addKopSurat(
  doc: jsPDF,
  agency: AgencySettings,
  kopDataUrl: string | null,
  options?: KopOptions
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const topY = options?.topY ?? 10;
  const imgW = options?.imgW ?? pageWidth - 32;
  const lineLeft = options?.lineLeft ?? 16;
  const bottomGap = options?.bottomGap ?? 8;

  if (kopDataUrl) {
    try {
      const imgH = imgW * (142 / 682); // Preserve exact 682x142 ratio
      const imgX = centerX - imgW / 2;
      doc.addImage(kopDataUrl, 'PNG', imgX, topY, imgW, imgH);
      const lineY = topY + imgH + 1.8;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(lineLeft, lineY, pageWidth - lineLeft, lineY);
      doc.setLineWidth(0.25);
      doc.line(lineLeft, lineY + 1.4, pageWidth - lineLeft, lineY + 1.4);
      return lineY + bottomGap;
    } catch {
      // Fallback to text kop if image embedding fails
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 118, 110); // Kemenkes Teal accent
  doc.text(agency.namaInstansi.toUpperCase(), centerX, topY + 6, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(agency.subUnit.toUpperCase(), centerX, topY + 11.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(agency.alamatInstansi, centerX, topY + 16.5, { align: 'center' });
  doc.text(agency.teleponEmail, centerX, topY + 20.8, { align: 'center' });

  // Double horizontal kop line
  const textLineY = topY + 24;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(lineLeft, textLineY, pageWidth - lineLeft, textLineY);
  doc.setLineWidth(0.25);
  doc.line(lineLeft, textLineY + 1.4, pageWidth - lineLeft, textLineY + 1.4);

  return textLineY + bottomGap;
}

interface BaLayoutPreset {
  kopTopY: number;
  kopImgW: number;
  kopBottomGap: number;
  titleFontSize: number;
  nomorFontSize: number;
  titleGap: number;
  afterNomorGap: number;
  bodyFontSize: number;
  italicLabelFontSize: number;
  lineH: number;
  paraGap: number;
  tableFontSize: number;
  tableCellPad: number;
  subTableFontSize: number;
  closingGap: number;
  sigW: number;
  sigH: number;
  sigTopOffset: number;
  nameGapFromSigTop: number;
  footerGapFromName: number;
  footerFontSize: number;
}

const BA_LAYOUT_PRESETS: BaLayoutPreset[] = [
  {
    kopTopY: 8.5,
    kopImgW: 168,
    kopBottomGap: 6.5,
    titleFontSize: 12,
    nomorFontSize: 9.5,
    titleGap: 5.2,
    afterNomorGap: 6.5,
    bodyFontSize: 9.2,
    italicLabelFontSize: 8.8,
    lineH: 4.1,
    paraGap: 1.8,
    tableFontSize: 9.0,
    tableCellPad: 0.75,
    subTableFontSize: 8.8,
    closingGap: 4.2,
    sigW: 36,
    sigH: 14.5,
    sigTopOffset: 5.5,
    nameGapFromSigTop: 18,
    footerGapFromName: 7,
    footerFontSize: 7.5,
  },
  {
    kopTopY: 7,
    kopImgW: 156,
    kopBottomGap: 5.5,
    titleFontSize: 11.5,
    nomorFontSize: 9.0,
    titleGap: 4.6,
    afterNomorGap: 5.4,
    bodyFontSize: 8.6,
    italicLabelFontSize: 8.2,
    lineH: 3.7,
    paraGap: 1.3,
    tableFontSize: 8.4,
    tableCellPad: 0.55,
    subTableFontSize: 8.2,
    closingGap: 3.2,
    sigW: 33,
    sigH: 13,
    sigTopOffset: 4.8,
    nameGapFromSigTop: 15.5,
    footerGapFromName: 5.5,
    footerFontSize: 7.2,
  },
  {
    kopTopY: 6,
    kopImgW: 144,
    kopBottomGap: 4.8,
    titleFontSize: 11,
    nomorFontSize: 8.6,
    titleGap: 4.2,
    afterNomorGap: 4.6,
    bodyFontSize: 8.1,
    italicLabelFontSize: 7.8,
    lineH: 3.4,
    paraGap: 1.0,
    tableFontSize: 7.9,
    tableCellPad: 0.4,
    subTableFontSize: 7.8,
    closingGap: 2.5,
    sigW: 30,
    sigH: 11.5,
    sigTopOffset: 4.2,
    nameGapFromSigTop: 13.5,
    footerGapFromName: 4.5,
    footerFontSize: 6.9,
  },
];

interface RichSpan {
  text: string;
  bold?: boolean;
}

interface ClusterPart {
  text: string;
  bold: boolean;
}

interface WordCluster {
  parts: ClusterPart[];
  width: number;
}

function drawRichJustifiedParagraph(
  doc: jsPDF,
  spans: RichSpan[],
  x: number,
  startY: number,
  maxWidth: number,
  lineH: number,
  fontSize: number,
  indentPrefix?: string
): number {
  doc.setFontSize(fontSize);

  let textStartX = x;
  let availableW = maxWidth;
  if (indentPrefix) {
    doc.setFont('helvetica', 'normal');
    doc.text(indentPrefix, x, startY);
    const prefixW = doc.getTextWidth(indentPrefix);
    textStartX = x + prefixW;
    availableW = maxWidth - prefixW;
  }

  // Group contiguous non-whitespace characters across spans into unbreakable clusters
  const clusters: WordCluster[] = [];
  let activeParts: ClusterPart[] = [];

  const flushCluster = () => {
    if (activeParts.length === 0) return;
    let totalW = 0;
    for (const part of activeParts) {
      doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
      totalW += doc.getTextWidth(part.text);
    }
    clusters.push({ parts: activeParts, width: totalW });
    activeParts = [];
  };

  for (const span of spans) {
    const tokens = span.text.split(/(\s+)/);
    for (const tok of tokens) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        flushCluster();
      } else {
        activeParts.push({ text: tok, bold: Boolean(span.bold) });
      }
    }
  }
  flushCluster();

  doc.setFont('helvetica', 'normal');
  const spaceW = doc.getTextWidth(' ');

  const lines: WordCluster[][] = [];
  let currentLine: WordCluster[] = [];
  let currentLineW = 0;

  for (const cluster of clusters) {
    const addedW = currentLine.length === 0 ? cluster.width : spaceW + cluster.width;
    if (currentLine.length > 0 && currentLineW + addedW > availableW) {
      lines.push(currentLine);
      currentLine = [cluster];
      currentLineW = cluster.width;
    } else {
      currentLine.push(cluster);
      currentLineW += addedW;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  let curY = startY;
  lines.forEach((line, lineIdx) => {
    const isLastLine = lineIdx === lines.length - 1;
    const totalClustersW = line.reduce((sum, c) => sum + c.width, 0);
    const gapCount = line.length - 1;

    let gapW = spaceW;
    if (!isLastLine && gapCount > 0) {
      const computedGap = (availableW - totalClustersW) / gapCount;
      gapW = Math.min(computedGap, spaceW * 3.5);
    }

    let curX = textStartX;
    line.forEach((cluster, clusterIdx) => {
      for (const part of cluster.parts) {
        doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
        doc.text(part.text, curX, curY);
        curX += doc.getTextWidth(part.text);
      }
      if (clusterIdx < gapCount) {
        curX += gapW;
      }
    });

    curY += lineH;
  });

  doc.setFont('helvetica', 'normal');
  return curY;
}

function drawItalicPartyLabel(
  doc: jsPDF,
  partyName: 'PIHAK PERTAMA' | 'PIHAK KEDUA',
  x: number,
  y: number,
  fontSize: number
): void {
  const prefix = '(Selanjutnya disebut sebagai ';
  const suffix = ')';
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'italic');
  doc.text(prefix, x, y);
  const w1 = doc.getTextWidth(prefix);

  doc.setFont('helvetica', 'bolditalic');
  doc.text(partyName, x + w1, y);
  const w2 = doc.getTextWidth(partyName);

  doc.setFont('helvetica', 'italic');
  doc.text(suffix, x + w1 + w2, y);
}

function renderBeritaAcaraSinglePage(
  entry: BeritaAcaraPNBP,
  agency: AgencySettings,
  kopDataUrl: string | null,
  p: BaLayoutPreset
): { doc: jsPDF; finalY: number } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const leftM = 16;
  const contentW = pageWidth - leftM * 2; // 178mm

  let y = addKopSurat(doc, agency, kopDataUrl, {
    topY: p.kopTopY,
    imgW: p.kopImgW,
    lineLeft: leftM,
    bottomGap: p.kopBottomGap,
  });

  // Title matching TEMPLATE_BA_a1b4f38c
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(p.titleFontSize);
  doc.setTextColor(15, 23, 42);
  const titleText = 'BERITA ACARA PEMBAYARAN PNBP TUNAI';
  doc.text(titleText, centerX, y, { align: 'center' });
  const titleWidth = doc.getTextWidth(titleText);
  doc.setLineWidth(0.38);
  doc.line(centerX - titleWidth / 2, y + 1.2, centerX + titleWidth / 2, y + 1.2);

  y += p.titleGap;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p.nomorFontSize);
  doc.text(`Nomor: ${entry.nomorBA}`, centerX, y, { align: 'center' });

  y += p.afterNomorGap;
  doc.setTextColor(30, 41, 59);
  y = drawRichJustifiedParagraph(
    doc,
    [
      { text: 'Pada hari ini, ' },
      { text: entry.hari, bold: true },
      { text: ', tanggal ' },
      { text: entry.tanggalTeks, bold: true },
      { text: ' bulan ' },
      { text: entry.bulanTeks, bold: true },
      { text: ' tahun ' },
      { text: entry.tahun, bold: true },
      { text: ', bertempat di ' },
      { text: entry.lokasi, bold: true },
      { text: ', kami yang bertanda tangan di bawah ini:' },
    ],
    leftM,
    y,
    contentW,
    p.lineH,
    p.bodyFontSize
  );
  y += p.paraGap;

  // PIHAK PERTAMA
  autoTable(doc, {
    startY: y,
    margin: { left: leftM, right: leftM },
    theme: 'plain',
    styles: {
      fontSize: p.tableFontSize,
      cellPadding: p.tableCellPad,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 4.5 },
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
      ?.finalY ?? y + 14) + 1;
  drawItalicPartyLabel(doc, 'PIHAK PERTAMA', leftM, y + 2.5, p.italicLabelFontSize);
  y += 6.2;

  // PIHAK KEDUA
  autoTable(doc, {
    startY: y,
    margin: { left: leftM, right: leftM },
    theme: 'plain',
    styles: {
      fontSize: p.tableFontSize,
      cellPadding: p.tableCellPad,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 4.5 },
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
      ?.finalY ?? y + 18) + 1;
  drawItalicPartyLabel(doc, 'PIHAK KEDUA', leftM, y + 2.5, p.italicLabelFontSize);
  y += 6.8;

  // Body Points 1-4
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p.bodyFontSize);
  doc.setTextColor(30, 41, 59);
  doc.text('Dengan ini menerangkan hal-hal sebagai berikut:', leftM, y);
  y += p.lineH + 0.8;

  const gangguan = parseGangguanInfo(entry.jamGangguan, entry.tanggalInput);
  y = drawRichJustifiedParagraph(
    doc,
    [
      { text: 'Telah terjadi gangguan teknis pada sistem layanan pembayaran elektronik pada hari ' },
      { text: gangguan.hari, bold: true },
      { text: ', tanggal ' },
      { text: gangguan.tanggalTeks, bold: true },
      { text: ' bulan ' },
      { text: gangguan.bulanTeks, bold: true },
      { text: ' tahun ' },
      { text: gangguan.tahun, bold: true },
      { text: ' sejak pukul ' },
      { text: gangguan.jam, bold: true },
      { text: ' waktu setempat sehingga pembayaran non-tunai tidak dapat diproses.' },
    ],
    leftM,
    y,
    contentW,
    p.lineH,
    p.bodyFontSize,
    '1. '
  );
  y += p.paraGap;

  y = drawRichJustifiedParagraph(
    doc,
    [
      { text: 'Demi kelancaran pelayanan publik, ' },
      { text: 'PIHAK KEDUA', bold: true },
      { text: ' menyerahkan pembayaran Penerimaan Negara Bukan Pajak (PNBP) secara tunai kepada ' },
      { text: 'PIHAK PERTAMA', bold: true },
      { text: ', dan ' },
      { text: 'PIHAK PERTAMA', bold: true },
      { text: ' telah menerima uang tunai tersebut dengan rincian:' },
    ],
    leftM,
    y,
    contentW,
    p.lineH,
    p.bodyFontSize,
    '2. '
  );
  y += 1;

  autoTable(doc, {
    startY: y,
    margin: { left: leftM + 4, right: leftM },
    theme: 'plain',
    styles: {
      fontSize: p.subTableFontSize,
      cellPadding: p.tableCellPad,
      textColor: [15, 23, 42],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 4.5 },
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
      ?.finalY ?? y + 18) +
    p.paraGap +
    0.8;

  y = drawRichJustifiedParagraph(
    doc,
    [
      { text: 'PIHAK PERTAMA', bold: true },
      { text: ' berkewajiban menyimpan uang tunai tersebut dan segera membuatkan kode billing serta menyetorkannya ke Kas Negara melalui Bank/Pos Persepsi paling lambat 1 (satu) hari kerja setelah sistem kembali normal.' },
    ],
    leftM,
    y,
    contentW,
    p.lineH,
    p.bodyFontSize,
    '3. '
  );
  y += p.paraGap;

  y = drawRichJustifiedParagraph(
    doc,
    [
      { text: 'Bukti Penerimaan Negara (BPN) / Nomor Transaksi Penerimaan Negara (NTPN) yang terbit setelah penyetoran akan disampaikan kepada Bendahara Penerimaan dan ' },
      { text: 'PIHAK KEDUA', bold: true },
      { text: ' sebagai bukti setor yang sah.' },
    ],
    leftM,
    y,
    contentW,
    p.lineH,
    p.bodyFontSize,
    '4. '
  );
  y += p.paraGap + 0.6;

  y = drawRichJustifiedParagraph(
    doc,
    [
      { text: 'Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya sebagai bahan pertanggungjawaban administrasi dan keuangan.' },
    ],
    leftM,
    y,
    contentW,
    p.lineH,
    p.bodyFontSize
  );
  y += p.closingGap;

  // Signature Section matching TEMPLATE_BA_a1b4f38c
  const colLeftX = 52;
  const colRightX = pageWidth - 52;

  doc.setFontSize(p.bodyFontSize);
  doc.text(`${entry.kotaTTD || agency.kota}, ${entry.tanggalTTD}`, colRightX, y, {
    align: 'center',
  });
  y += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.text('PIHAK KEDUA', colLeftX, y, { align: 'center' });
  doc.text('PIHAK PERTAMA', colRightX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p.italicLabelFontSize);
  doc.text('(Wajib Bayar)', colLeftX, y + 3.8, { align: 'center' });
  doc.text('(Petugas BKK Kelas I Kendari)', colRightX, y + 3.8, {
    align: 'center',
  });

  // Embed drawn signatures if present
  const sigTopY = y + p.sigTopOffset;
  if (entry.ttdWajibBayar && entry.ttdWajibBayar.startsWith('data:image/')) {
    try {
      doc.addImage(
        entry.ttdWajibBayar,
        'PNG',
        colLeftX - p.sigW / 2,
        sigTopY,
        p.sigW,
        p.sigH
      );
    } catch {
      // skip invalid image
    }
  }
  if (entry.ttdPetugas && entry.ttdPetugas.startsWith('data:image/')) {
    try {
      doc.addImage(
        entry.ttdPetugas,
        'PNG',
        colRightX - p.sigW / 2,
        sigTopY,
        p.sigW,
        p.sigH
      );
    } catch {
      // skip invalid image
    }
  }

  const nameY = sigTopY + p.nameGapFromSigTop;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(p.bodyFontSize);
  doc.text(entry.namaWajibBayar, colLeftX, nameY, { align: 'center' });
  doc.text(entry.namaPetugas, colRightX, nameY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p.italicLabelFontSize);
  doc.text(`NIP. ${entry.nipPetugas}`, colRightX, nameY + 3.8, {
    align: 'center',
  });

  // Compact validation audit footer
  const footerY = nameY + p.footerGapFromName;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(p.footerFontSize - 0.3);
  const noteLines = entry.catatanAdmin
    ? doc.splitTextToSize(`Catatan: ${entry.catatanAdmin}`, contentW - 6)
    : [];
  const footerHeight = 8.5 + (noteLines.length > 0 ? noteLines.length * 3.2 + 1 : 0);

  doc.setDrawColor(0, 115, 118);
  doc.setFillColor(199, 237, 235);
  doc.roundedRect(leftM, footerY, contentW, footerHeight, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(p.footerFontSize);
  doc.setTextColor(0, 115, 118);
  doc.text(
    `TERVALIDASI: ${entry.validatorAdmin || DEFAULT_VALIDATOR_NAME} · Tanggal: ${formatTanggalIndo(entry.tanggalValidasi)} · ID: ${entry.idBA}`,
    leftM + 3,
    footerY + 5.2
  );

  if (noteLines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(p.footerFontSize - 0.3);
    doc.setTextColor(51, 65, 85);
    doc.text(noteLines, leftM + 3, footerY + 8.8);
  }

  return { doc, finalY: footerY + footerHeight };
}

export interface PdfGenerateOptions {
  autoPrint?: boolean;
}

export async function generateBeritaAcaraPdf(
  entry: BeritaAcaraPNBP,
  agency: AgencySettings,
  options?: PdfGenerateOptions
): Promise<{ blob: Blob; fileName: string }> {
  if (entry.statusValidasi !== 'Disetujui') {
    throw new Error('Berita Acara hanya dapat dicetak setelah divalidasi Admin.');
  }

  const kopDataUrl = await loadKopSuratDataUrl();
  let chosen = renderBeritaAcaraSinglePage(
    entry,
    agency,
    kopDataUrl,
    BA_LAYOUT_PRESETS[0]
  );

  if (chosen.finalY > 288) {
    for (let i = 1; i < BA_LAYOUT_PRESETS.length; i++) {
      const candidate = renderBeritaAcaraSinglePage(
        entry,
        agency,
        kopDataUrl,
        BA_LAYOUT_PRESETS[i]
      );
      chosen = candidate;
      if (candidate.finalY <= 288) break;
    }
  }

  if (options?.autoPrint) {
    chosen.doc.autoPrint({ variant: 'non-conform' });
  }

  const safeId = entry.idBA.replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = options?.autoPrint
    ? `Berita_Acara_PNBP_${safeId}_SiapCetak_A4.pdf`
    : `Berita_Acara_PNBP_${safeId}.pdf`;
  return { blob: chosen.doc.output('blob'), fileName };
}

export async function generateMonthlyRecapPdf(
  validatedEntries: BeritaAcaraPNBP[],
  month: number,
  year: number,
  agency: AgencySettings,
  _excludedCount: number,
  options?: PdfGenerateOptions
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
      halign: 'center',
      valign: 'middle',
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [191, 191, 191],
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 21 },
      2: { cellWidth: 35 },
      3: { cellWidth: 46 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 27 },
      6: { cellWidth: 27 },
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
        'Dokumen Bukti Setor',
        'Nominal (Rp)',
      ],
    ],
    body: validatedEntries.map((item, idx) => [
      String(idx + 1),
      item.tanggalInput,
      item.nomorBA,
      `Petugas: ${item.namaPetugas}\nPengguna Jasa: ${item.namaWajibBayar}`,
      item.rincianLayanan
        ? `${item.jenisLayanan}\n${item.rincianLayanan}`
        : item.jenisLayanan,
      item.kodeBilling || '-',
      item.kodeNtpn || '-',
      item.buktiSetorUrl ? item.buktiSetorNama || 'Terlampir' : '-',
      formatRupiah(item.nominalAngka),
    ]),
    foot: [
      [
        {
          content: 'TOTAL PENERIMAAN PNBP TUNAI TERVALIDASI',
          colSpan: 8,
          styles: { halign: 'right' },
        },
        {
          content: formatRupiah(totalNominal),
          styles: { halign: 'right' },
        },
      ],
    ],
    footStyles: {
      fillColor: [199, 237, 235],
      textColor: [0, 115, 118],
      fontStyle: 'bold',
      fontSize: 7.8,
      lineColor: [191, 191, 191],
    },
  });

  y =
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 35) + 9;

  if (y > 160) {
    doc.addPage();
    y = 20;
  }

  // Right-margin centered signer block matching w-72 justify-end text-center in Preview
  const sigBoxW = 76;
  const sigCenterX = pageWidth - 16 - sigBoxW / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(30, 41, 59);
  const todayStr = formatTanggalIndo(new Date().toISOString().slice(0, 10));
  doc.text(`${agency.kota}, ${todayStr}`, sigCenterX, y, {
    align: 'center',
  });
  doc.text('Mengetahui / Mengesahkan,', sigCenterX, y + 5, {
    align: 'center',
  });
  const jabatanLines = doc.splitTextToSize(
    agency.jabatanPimpinan || '',
    sigBoxW
  ) as string[];
  doc.setFont('helvetica', 'bold');
  doc.text(jabatanLines, sigCenterX, y + 9.8, {
    align: 'center',
  });

  const sigNameY = y + 9.8 + jabatanLines.length * 4.5 + 14;
  doc.setFont('helvetica', 'bold');
  doc.text(agency.namaPimpinan, sigCenterX, sigNameY, { align: 'center' });
  const nameW = doc.getTextWidth(agency.namaPimpinan);
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.line(
    sigCenterX - nameW / 2,
    sigNameY + 1.1,
    sigCenterX + nameW / 2,
    sigNameY + 1.1
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(99, 98, 94);
  doc.text(`NIP. ${agency.nipPimpinan}`, sigCenterX, sigNameY + 4.8, {
    align: 'center',
  });

  if (options?.autoPrint) {
    doc.autoPrint({ variant: 'non-conform' });
  }

  const fileName = options?.autoPrint
    ? `Rekap_Bulanan_PNBP_${monthName}_${year}_SiapCetak_A4.pdf`
    : `Rekap_Bulanan_PNBP_${monthName}_${year}.pdf`;
  return { blob: doc.output('blob'), fileName };
}

export async function triggerPrintA4(
  fallbackPdfFactory: () => Promise<{ blob: Blob; fileName: string }>
): Promise<'printed' | 'fallback-pdf'> {
  let beforePrintFired = false;
  const onBeforePrint = () => {
    beforePrintFired = true;
  };

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  window.addEventListener('beforeprint', onBeforePrint);
  const startedAt = Date.now();
  try {
    window.print();
  } catch {
    // Some embedded contexts throw on window.print()
  }

  await new Promise((resolve) => setTimeout(resolve, 350));
  window.removeEventListener('beforeprint', onBeforePrint);
  const elapsedMs = Date.now() - startedAt;

  if (beforePrintFired || (!isInIframe && elapsedMs >= 500)) {
    return 'printed';
  }

  if (isInIframe) {
    const { blob, fileName } = await fallbackPdfFactory();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'fallback-pdf';
  }

  return 'printed';
}
