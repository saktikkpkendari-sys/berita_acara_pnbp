export type ValidationStatus = 'Menunggu Validasi' | 'Disetujui' | 'Ditolak';

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface PetugasRef {
  nama: string;
  nip: string;
}

export interface BeritaAcaraPNBP {
  rowNumber: number; // 1-indexed row in Google Sheet (row 2+)
  idBA: string;
  tanggalInput: string; // YYYY-MM-DD
  nomorBA: string;
  hari: string;
  tanggalTeks: string;
  bulanTeks: string;
  tahun: string;
  pukulBA: string;
  lokasi: string;
  namaPetugas: string;
  nipPetugas: string;
  jabatanPetugas: string;
  namaWajibBayar: string;
  nikWajibBayar: string;
  noHP: string;
  alamatInstansi: string;
  jamGangguan: string;
  jenisLayanan: string;
  rincianLayanan: string;
  nominalAngka: number;
  terbilang: string;
  kotaTTD: string;
  tanggalTTD: string;
  ttdWajibBayar: string; // Data URL PNG signature
  ttdPetugas: string; // Data URL PNG signature
  statusValidasi: ValidationStatus;
  validatorAdmin: string;
  tanggalValidasi: string;
  catatanAdmin: string;
  linkPdfBA: string;
}

export interface AgencySettings {
  namaInstansi: string;
  subUnit: string;
  alamatInstansi: string;
  kota: string;
  teleponEmail: string;
  namaPimpinan: string;
  jabatanPimpinan: string;
  nipPimpinan: string;
  kodeSuratPrefix: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetNames: string[];
  activeDataSheet: string;
}

export type ActiveTab = 'buat' | 'cetak' | 'rekap';

export interface PendingConfirmation {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
}
