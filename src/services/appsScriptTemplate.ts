import { AgencySettings } from '../types';

export function generateFreeAppsScript(
  sheetName: string,
  agency: AgencySettings
): string {
  return `/**
 * OTOMASI GOOGLE SHEETS & WEB APP API PUBLIK (100% GRATIS)
 * Instansi    : ${agency.subUnit} (${agency.namaInstansi})
 * Sumber Data : Tab "${sheetName}"
 * Syarat Cetak: Hanya baris dengan Status_Validasi (Kolom Z) = "Disetujui"
 *
 * CARA DEPLOY WEB APP (Agar Siapapun dengan status User bisa akses tanpa login Google):
 * 1. Klik Deploy -> New deployment -> pilih Type: Web app
 * 2. Execute as: Me (Email Anda)
 * 3. Who has access: Anyone
 * 4. Klik Deploy, salin URL Web App (/exec), lalu tempel di Menu Super Admin aplikasi.
 */

const CONFIG = {
  DATA_SHEET: '${sheetName}',
  REKAP_SHEET: 'Rekap_Bulanan_PNBP',
  SETTINGS_SHEET: 'Pengaturan_Instansi',
  NAMA_FOLDER_DRIVE: 'Arsip_PDF_BA_PNBP_Kendari',
  COL_STATUS: 26,    // Kolom Z: Status_Validasi
  COL_VALIDATOR: 27, // Kolom AA: Validator_Admin
  COL_TGL_VAL: 28,   // Kolom AB: Tanggal_Validasi
  COL_CATATAN: 29,   // Kolom AC: Catatan_Admin
  COL_LINK_PDF: 30,  // Kolom AD: Link_PDF_BA
};

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.DATA_SHEET);
    const entries = [];
    if (sheet && sheet.getLastRow() > 1) {
      const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 34).getDisplayValues();
      for (let i = 0; i < values.length; i++) {
        const r = values[i];
        if (!r.some((c) => String(c || '').trim())) continue;
        entries.push({
          rowNumber: i + 2,
          idBA: r[0] || '',
          tanggalInput: r[1] || '',
          nomorBA: r[2] || '',
          hari: r[3] || '-',
          tanggalTeks: r[4] || '-',
          bulanTeks: r[5] || '-',
          tahun: r[6] || '-',
          pukulBA: r[7] || '-',
          lokasi: r[8] || '-',
          namaPetugas: r[9] || '-',
          nipPetugas: r[10] || '-',
          jabatanPetugas: r[11] || '-',
          namaWajibBayar: r[12] || '-',
          nikWajibBayar: r[13] || '-',
          noHP: r[14] || '-',
          alamatInstansi: r[15] || '-',
          jamGangguan: r[16] || '-',
          jenisLayanan: r[17] || '-',
          rincianLayanan: r[18] || '-',
          nominalAngka: Number(String(r[19] || '0').replace(/[^0-9.-]/g, '')) || 0,
          terbilang: r[20] || '-',
          kotaTTD: r[21] || 'Kendari',
          tanggalTTD: r[22] || '-',
          ttdWajibBayar: r[23] || '',
          ttdPetugas: r[24] || '',
          statusValidasi: r[25] || 'Menunggu Validasi',
          validatorAdmin: /saktikkpkendari|@/i.test(String(r[26] || '')) ? 'Bendahara Penerimaan BKK Kelas I Kendari' : (r[26] || ''),
          tanggalValidasi: r[27] || '',
          catatanAdmin: r[28] || '',
          linkPdfBA: r[29] || '',
          kodeBilling: r[30] || '',
          kodeNtpn: r[31] || '',
          buktiSetorUrl: r[32] || '',
          buktiSetorNama: r[33] || '',
        });
      }
    }

    const map = {};
    const settingsSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
    if (settingsSheet && settingsSheet.getLastRow() > 1) {
      const sRows = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getDisplayValues();
      sRows.forEach((sr) => {
        if (sr[0]) map[String(sr[0]).trim()] = String(sr[1] || '').trim();
      });
    }

    const security = {};
    if (map.adminPwdSalt && map.adminPwdHash) {
      security.admin = {
        salt: map.adminPwdSalt,
        hash: map.adminPwdHash,
        updatedAt: map.adminPwdUpdatedAt || '',
      };
    }
    if (map.superAdminPwdSalt && map.superAdminPwdHash) {
      security.superadmin = {
        salt: map.superAdminPwdSalt,
        hash: map.superAdminPwdHash,
        updatedAt: map.superAdminPwdUpdatedAt || '',
      };
    }

    return jsonOut({
      ok: true,
      entries: entries,
      agency: {
        namaInstansi: map.namaInstansi,
        subUnit: map.subUnit,
        alamatInstansi: map.alamatInstansi,
        kota: map.kota,
        teleponEmail: map.teleponEmail,
        namaPimpinan: map.namaPimpinan,
        jabatanPimpinan: map.jabatanPimpinan,
        nipPimpinan: map.nipPimpinan,
        kodeSuratPrefix: map.kodeSuratPrefix,
        nomorUrutMulai: Number(map.nomorUrutMulai) || 1,
        digitNomorUrut: Number(map.digitNomorUrut) || 3,
        resetNomorMode: map.resetNomorMode || 'tahunan',
        kunciNomorUrutUntukUser: map.kunciNomorUrutUntukUser === 'false' ? false : true,
      },
      security: security,
    });
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}

function resolveTargetRow_(sheet, rowNumber, idBA) {
  let targetRow = Number(rowNumber);
  if (idBA && sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
    const wanted = String(idBA).trim();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0] || '').trim() === wanted) {
        return i + 2;
      }
    }
    throw new Error('Data Berita Acara tidak ditemukan (kemungkinan sudah dihapus oleh Super Admin).');
  }
  if (!targetRow || targetRow < 2 || targetRow > sheet.getLastRow()) {
    throw new Error('Baris data tidak valid atau sudah berubah.');
  }
  return targetRow;
}

function readSettingsMap_(ss) {
  const map = {};
  const settingsSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  if (settingsSheet && settingsSheet.getLastRow() > 1) {
    const sRows = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getDisplayValues();
    sRows.forEach((sr) => {
      if (sr[0]) map[String(sr[0]).trim()] = String(sr[1] || '').trim();
    });
  }
  return map;
}

function extractSeq_(nomorBA) {
  const m = String(nomorBA || '').trim().match(/^(\\d+)/);
  return m ? (parseInt(m[1], 10) || 0) : 0;
}

function computeServerNomorBA_(sheet, map, tanggalInput, fallbackNomorBA) {
  const safeDate = tanggalInput && /^\\d{4}-\\d{2}-\\d{2}$/.test(String(tanggalInput))
    ? String(tanggalInput)
    : Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd');
  const yyyy = safeDate.slice(0, 4);
  const mm = safeDate.slice(5, 7);
  const resetMode = map.resetNomorMode || 'tahunan';
  const startSeq = Math.max(1, Number(map.nomorUrutMulai) || 1);
  const digits = Math.min(6, Math.max(2, Number(map.digitNomorUrut) || 3));
  const prefix = (map.kodeSuratPrefix || 'BA-PNBP/BKK-KDI').trim();

  const usedSeqs = {};
  const usedNomors = {};
  if (sheet.getLastRow() > 1) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
    for (let i = 0; i < rows.length; i++) {
      const tgl = String(rows[i][1] || '');
      const nom = String(rows[i][2] || '').trim();
      if (nom) usedNomors[nom] = true;
      const inScope =
        resetMode === 'bulanan' ? tgl.indexOf(yyyy + '-' + mm) === 0
        : resetMode === 'tahunan' ? tgl.indexOf(yyyy) === 0
        : true;
      if (inScope) {
        const seq = extractSeq_(nom);
        if (seq > 0) usedSeqs[seq] = true;
      }
    }
  }

  let nextSeq = startSeq;
  while (usedSeqs[nextSeq]) {
    nextSeq++;
  }
  let candidate = String(nextSeq);
  while (candidate.length < digits) candidate = '0' + candidate;
  let formatted = candidate + '/' + prefix + '/' + mm + '/' + yyyy;
  while (usedNomors[formatted]) {
    nextSeq++;
    candidate = String(nextSeq);
    while (candidate.length < digits) candidate = '0' + candidate;
    formatted = candidate + '/' + prefix + '/' + mm + '/' + yyyy;
  }
  return formatted || fallbackNomorBA;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {
    return jsonOut({
      ok: false,
      error: 'Server sedang sibuk memproses antrean petugas lain. Silakan klik simpan kembali.',
    });
  }

  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.action === 'append' && body.entry) {
      const sheet = ss.getSheetByName(CONFIG.DATA_SHEET);
      if (!sheet) throw new Error('Tab ' + CONFIG.DATA_SHEET + ' tidak ditemukan.');
      const d = body.entry;

      // Cegah duplikasi jika tombol ditekan ulang / retry jaringan dengan idBA sama
      if (d.idBA && sheet.getLastRow() > 1) {
        const existingRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
        for (let i = 0; i < existingRows.length; i++) {
          if (String(existingRows[i][0] || '').trim() === String(d.idBA).trim()) {
            return jsonOut({
              ok: true,
              assignedNomorBA: String(existingRows[i][2] || d.nomorBA),
              deduplicated: true,
            });
          }
        }
      }

      const map = readSettingsMap_(ss);
      const lockSeqForUser = map.kunciNomorUrutUntukUser === 'false' ? false : true;
      let finalNomorBA = d.nomorBA;
      if (lockSeqForUser || body.autoAssignSequence) {
        finalNomorBA = computeServerNomorBA_(sheet, map, d.tanggalInput, d.nomorBA);
      }

      sheet.appendRow([
        d.idBA, d.tanggalInput, finalNomorBA, d.hari, d.tanggalTeks, d.bulanTeks,
        d.tahun, d.pukulBA, d.lokasi, d.namaPetugas, "'" + d.nipPetugas, d.jabatanPetugas,
        d.namaWajibBayar, "'" + (d.nikWajibBayar || '-'), "'" + (d.noHP || '-'),
        d.alamatInstansi, d.jamGangguan, d.jenisLayanan, d.rincianLayanan,
        d.nominalAngka, d.terbilang, d.kotaTTD, d.tanggalTTD,
        d.ttdWajibBayar || '', d.ttdPetugas || '', 'Menunggu Validasi', '', '', '', '',
        d.kodeBilling ? "'" + d.kodeBilling : '', d.kodeNtpn ? "'" + d.kodeNtpn : '',
        d.buktiSetorUrl || '', d.buktiSetorNama || '',
      ]);
      SpreadsheetApp.flush();
      return jsonOut({ ok: true, assignedNomorBA: finalNomorBA });
    }

    if (body.action === 'saveBuktiSetor') {
      const sheet = ss.getSheetByName(CONFIG.DATA_SHEET);
      if (!sheet) throw new Error('Tab ' + CONFIG.DATA_SHEET + ' tidak ditemukan.');
      const row = resolveTargetRow_(sheet, body.rowNumber, body.idBA);

      const existingBukti = sheet.getRange(row, 31, 1, 3).getDisplayValues()[0];
      if (
        String(existingBukti[0] || '').trim() &&
        String(existingBukti[1] || '').trim() &&
        String(existingBukti[2] || '').trim()
      ) {
        throw new Error('Bukti setor untuk Berita Acara ini sudah lengkap dan terkunci oleh input sebelumnya.');
      }

      let fileUrl = body.buktiSetorUrl || '';
      const fileName = body.buktiSetorNama || '';
      if (body.fileBase64 && body.fileMimeType && fileName) {
        const bytes = Utilities.base64Decode(body.fileBase64);
        const blob = Utilities.newBlob(bytes, body.fileMimeType, fileName);
        const folders = DriveApp.getFoldersByName(CONFIG.NAMA_FOLDER_DRIVE);
        const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.NAMA_FOLDER_DRIVE);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      }

      sheet.getRange(row, 31, 1, 4).setValues([[
        body.kodeBilling ? "'" + body.kodeBilling : '',
        body.kodeNtpn ? "'" + body.kodeNtpn : '',
        fileUrl,
        fileName,
      ]]);
      SpreadsheetApp.flush();
      return jsonOut({ ok: true, buktiSetorUrl: fileUrl });
    }

    if (body.action === 'delete') {
      const sheet = ss.getSheetByName(CONFIG.DATA_SHEET);
      if (!sheet) throw new Error('Tab ' + CONFIG.DATA_SHEET + ' tidak ditemukan.');
      const targetRow = resolveTargetRow_(sheet, body.rowNumber, body.idBA);
      sheet.deleteRow(targetRow);
      SpreadsheetApp.flush();
      return jsonOut({ ok: true });
    }

    if (body.action === 'validate') {
      const sheet = ss.getSheetByName(CONFIG.DATA_SHEET);
      if (!sheet) throw new Error('Tab ' + CONFIG.DATA_SHEET + ' tidak ditemukan.');
      const row = resolveTargetRow_(sheet, body.rowNumber, body.idBA);
      const status = body.status || 'Menunggu Validasi';
      const today = status === 'Menunggu Validasi'
        ? ''
        : Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd');
      sheet.getRange(row, CONFIG.COL_STATUS, 1, 4).setValues([[
        status,
        body.validatorName || '',
        today,
        body.notes || '',
      ]]);
      SpreadsheetApp.flush();
      return jsonOut({ ok: true });
    }

    if (body.action === 'saveSettings') {
      let sSheet = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
      if (!sSheet) sSheet = ss.insertSheet(CONFIG.SETTINGS_SHEET);
      const a = body.agency || {};
      const sec = body.security || {};
      const rows = [
        ['Kunci_Pengaturan', 'Nilai'],
        ['namaInstansi', a.namaInstansi || ''],
        ['subUnit', a.subUnit || ''],
        ['alamatInstansi', a.alamatInstansi || ''],
        ['kota', a.kota || ''],
        ['teleponEmail', a.teleponEmail || ''],
        ['namaPimpinan', a.namaPimpinan || ''],
        ['jabatanPimpinan', a.jabatanPimpinan || ''],
        ['nipPimpinan', "'" + (a.nipPimpinan || '')],
        ['kodeSuratPrefix', a.kodeSuratPrefix || ''],
        ['nomorUrutMulai', String(a.nomorUrutMulai || 1)],
        ['digitNomorUrut', String(a.digitNomorUrut || 3)],
        ['resetNomorMode', a.resetNomorMode || 'tahunan'],
        ['kunciNomorUrutUntukUser', a.kunciNomorUrutUntukUser === false ? 'false' : 'true'],
        ['adminPwdSalt', (sec.admin && sec.admin.salt) || ''],
        ['adminPwdHash', (sec.admin && sec.admin.hash) || ''],
        ['adminPwdUpdatedAt', (sec.admin && sec.admin.updatedAt) || ''],
        ['superAdminPwdSalt', (sec.superadmin && sec.superadmin.salt) || ''],
        ['superAdminPwdHash', (sec.superadmin && sec.superadmin.hash) || ''],
        ['superAdminPwdUpdatedAt', (sec.superadmin && sec.superadmin.updatedAt) || ''],
      ];
      sSheet.getRange(1, 1, rows.length, 2).setValues(rows);
      SpreadsheetApp.flush();
      return jsonOut({ ok: true });
    }

    throw new Error('Aksi tidak dikenali.');
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

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

  const adminName = 'Bendahara Penerimaan BKK Kelas I Kendari';
  sheet.getRange(row, CONFIG.COL_STATUS).setValue('Disetujui');
  sheet.getRange(row, CONFIG.COL_VALIDATOR).setValue(adminName);
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
