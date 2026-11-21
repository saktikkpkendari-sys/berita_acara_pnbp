import { AgencySettings } from '../types';

export function generateFreeAppsScript(
  sheetName: string,
  agency: AgencySettings
): string {
  return `/**
 * OTOMASI GOOGLE SHEETS BERITA ACARA PNBP TUNAI (100% GRATIS)
 * Instansi    : ${agency.subUnit} (${agency.namaInstansi})
 * Sumber Data : Tab "${sheetName}"
 * Syarat Cetak: Hanya baris dengan Status_Validasi (Kolom Z) = "Disetujui"
 */

const CONFIG = {
  DATA_SHEET: '${sheetName}',
  REKAP_SHEET: 'Rekap_Bulanan_PNBP',
  NAMA_FOLDER_DRIVE: 'Arsip_PDF_BA_PNBP_Kendari',
  COL_STATUS: 26,    // Kolom Z: Status_Validasi
  COL_VALIDATOR: 27, // Kolom AA: Validator_Admin
  COL_TGL_VAL: 28,   // Kolom AB: Tanggal_Validasi
  COL_LINK_PDF: 30,  // Kolom AD: Link_PDF_BA
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Otomasi BA PNBP')
    .addItem('1. Validasi & Setujui Baris Aktif (Admin)', 'validasiBarisAktif')
    .addItem('2. Cetak Rekapitulasi Bulanan PDF', 'cetakRekapBulananPDF')
    .addToUi();
}

function validasiBarisAktif() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();

  if (sheet.getName() !== CONFIG.DATA_SHEET) {
    ui.alert('Pilih baris data pada tab "' + CONFIG.DATA_SHEET + '" terlebih dahulu.');
    return;
  }

  const row = sheet.getActiveRange().getRow();
  if (row < 2) {
    ui.alert('Pilih baris data (baris 2 ke bawah).');
    return;
  }

  const nomorBA = sheet.getRange(row, 3).getValue();
  const konfirmasi = ui.alert(
    'Konfirmasi Validasi Admin',
    'Setujui Berita Acara "' + nomorBA + '" agar dapat dicetak PDF?',
    ui.ButtonSet.YES_NO
  );
  if (konfirmasi !== ui.Button.YES) return;

  const adminEmail = Session.getActiveUser().getEmail() || 'Admin';
  sheet.getRange(row, CONFIG.COL_STATUS).setValue('Disetujui');
  sheet.getRange(row, CONFIG.COL_VALIDATOR).setValue(adminEmail);
  sheet.getRange(row, CONFIG.COL_TGL_VAL).setValue(
    Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd')
  );

  ui.alert('Berhasil! Berita Acara ' + nomorBA + ' sudah berstatus Disetujui.');
}

function cetakRekapBulananPDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rekapSheet = ss.getSheetByName(CONFIG.REKAP_SHEET);
  const ui = SpreadsheetApp.getUi();

  if (!rekapSheet) {
    ui.alert('Tab "' + CONFIG.REKAP_SHEET + '" tidak ditemukan.');
    return;
  }

  const resp = ui.prompt(
    'Cetak Rekapitulasi Bulanan PNBP (Tervalidasi)',
    'Masukkan periode bulan format YYYY-MM (contoh: 2026-11):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const periode = resp.getResponseText().trim();
  if (!/^\\d{4}-\\d{2}$/.test(periode)) {
    ui.alert('Format periode harus YYYY-MM, misalnya 2026-11.');
    return;
  }

  rekapSheet.getRange('B2').setValue(periode);
  SpreadsheetApp.flush();

  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?'
    + 'format=pdf&size=A4&portrait=true&fitw=true&sheetnames=false&printtitle=false'
    + '&pagenumbers=true&gridlines=false&fzr=false&gid=' + rekapSheet.getSheetId();
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  });
  const pdfBlob = response.getBlob().setName('Rekap_Bulanan_PNBP_' + periode + '.pdf');

  const folders = DriveApp.getFoldersByName(CONFIG.NAMA_FOLDER_DRIVE);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.NAMA_FOLDER_DRIVE);
  const file = folder.createFile(pdfBlob);

  ui.alert('PDF Rekapitulasi Bulanan berhasil disimpan di Drive:\\n' + file.getUrl());
}
`;
}
