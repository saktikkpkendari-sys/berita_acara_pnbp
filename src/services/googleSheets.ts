import { REFERENSI_PETUGAS } from '../data/petugasList';
import {
  AgencySettings,
  BeritaAcaraPNBP,
  SpreadsheetInfo,
  ValidationStatus,
} from '../types';

export const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  namaInstansi: 'KEMENTERIAN KESEHATAN REPUBLIK INDONESIA',
  subUnit: 'BALAI KEKARANTINAAN KESEHATAN KELAS I KENDARI',
  alamatInstansi: 'Jl. Jenderal Ahmad Yani No. 23, Kendari, Sulawesi Tenggara',
  kota: 'Kendari',
  teleponEmail: 'Telp. (0401) 3121740 · bkk.kendari@kemkes.go.id',
  namaPimpinan: 'NOVI HENDRI, SKM, M.Sc',
  jabatanPimpinan: 'Kepala Balai Kekarantinaan Kesehatan Kelas I Kendari',
  nipPimpinan: '197011151996031001',
  kodeSuratPrefix: 'BA-PNBP/BKK-KDI',
};

export const DATA_PNBP_HEADERS = [
  'ID_BA',                  // A (0)
  'Tanggal_Input',          // B (1)
  'Nomor_BA',               // C (2)
  'Hari',                   // D (3)
  'Tanggal_Teks',           // E (4)
  'Bulan_Teks',             // F (5)
  'Tahun',                  // G (6)
  'Pukul_BA',               // H (7)
  'Lokasi',                 // I (8)
  'Nama_Petugas',           // J (9)
  'NIP_Petugas',            // K (10)
  'Jabatan_Petugas',        // L (11)
  'Nama_Wajib_Bayar',       // M (12)
  'NIK_Wajib_Bayar',        // N (13)
  'No_HP',                  // O (14)
  'Alamat_Instansi',        // P (15)
  'Jam_Gangguan',           // Q (16)
  'Jenis_Layanan',          // R (17)
  'Rincian_Layanan',        // S (18)
  'Nominal_Angka',          // T (19)
  'Terbilang',              // U (20)
  'Kota_TTD',               // V (21)
  'Tanggal_TTD',            // W (22)
  'TTD_Wajib_Bayar',        // X (23)
  'TTD_Petugas',            // Y (24)
  'Status_Validasi',        // Z (25)
  'Validator_Admin',        // AA (26)
  'Tanggal_Validasi',       // AB (27)
  'Catatan_Admin',          // AC (28)
  'Link_PDF_BA',            // AD (29)
];

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

async function googleFetch<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMessage = `Google API error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) {
        errorMessage = errBody.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(errorMessage);
  }

  return (await res.json()) as T;
}

function normalizeStatus(raw: unknown): ValidationStatus {
  const value = String(raw || '').trim().toLowerCase();
  if (
    value === 'disetujui' ||
    value === 'validated' ||
    value === 'approved' ||
    value === 'valid'
  ) {
    return 'Disetujui';
  }
  if (value === 'ditolak' || value === 'rejected') {
    return 'Ditolak';
  }
  return 'Menunggu Validasi';
}

function parseNumeric(raw: unknown): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const cleaned = String(raw || '0').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildSamplePNBPRows(agency: AgencySettings): (string | number)[][] {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  return [
    [
      `BA-PNBP-${yyyy}-001`,
      `${yyyy}-${mm}-05`,
      `001/${agency.kodeSuratPrefix}/${mm}/${yyyy}`,
      'Kamis',
      'lima',
      'November',
      yyyy,
      '10:15',
      'Pelabuhan Nusantara Kendari',
      'NOVI HENDRI, SKM, M.Sc',
      '197011151996031001',
      'Petugas Layanan Karantina Kesehatan',
      'H. Syafruddin',
      '7471011204750003',
      '081245678910',
      'PT. Samudra Pelayaran Nusantara, Kendari',
      '09:45',
      'Penerbitan Ship Sanitation Control Exemption Certificate (SSCEC)',
      'Pemeriksaan sanitasi kapal KM. Cahaya Laut & penerbitan SSCEC',
      350000,
      'Tiga Ratus Lima Puluh Ribu Rupiah',
      'Kendari',
      `5 November ${yyyy}`,
      '',
      '',
      'Disetujui',
      agency.namaPimpinan,
      `${yyyy}-${mm}-05`,
      'Bukti setor & kode billing telah diverifikasi bendahara.',
      '',
    ],
    [
      `BA-PNBP-${yyyy}-002`,
      `${yyyy}-${mm}-12`,
      `002/${agency.kodeSuratPrefix}/${mm}/${yyyy}`,
      'Kamis',
      'dua belas',
      'November',
      yyyy,
      '13:40',
      'Klinik Layanan Vaksinasi BKK Kendari',
      'dr. HERDA MARGARET SITURU',
      '198206202009122001',
      'Dokter Layanan Vaksinasi Internasional',
      'Siti Aminah',
      '7471055408910002',
      '085299887766',
      'Jl. Malik Raya No. 18, Kendari',
      '13:10',
      'Penerbitan Sertifikat Vaksinasi Internasional (ICV / e-ICV)',
      'Vaksinasi Meningitis Umrah & penerbitan buku ICV',
      305000,
      'Tiga Ratus Lima Ribu Rupiah',
      'Kendari',
      `12 November ${yyyy}`,
      '',
      '',
      'Menunggu Validasi',
      '',
      '',
      '',
      '',
    ],
  ];
}

export async function createAutomatedSpreadsheet(
  accessToken: string,
  title: string,
  agency: AgencySettings,
  includeSampleRows: boolean
): Promise<SpreadsheetInfo> {
  const createPayload = {
    properties: {
      title:
        title.trim() ||
        'Berita Acara PNBP Tunai & Rekap Bulanan - BKK Kelas I Kendari',
      locale: 'en_US',
      timeZone: 'Asia/Makassar',
    },
    sheets: [
      { properties: { title: 'Data_BA_PNBP', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Rekap_Bulanan_PNBP', gridProperties: { frozenRowCount: 5 } } },
      { properties: { title: 'Referensi_Petugas', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Pengaturan_Instansi' } },
    ],
  };

  interface CreateResp {
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }

  const created = await googleFetch<CreateResp>(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    }
  );

  const spreadsheetId = created.spreadsheetId;
  const dataSheetId =
    created.sheets.find((s) => s.properties.title === 'Data_BA_PNBP')
      ?.properties.sheetId ?? 0;
  const rekapSheetId =
    created.sheets.find((s) => s.properties.title === 'Rekap_Bulanan_PNBP')
      ?.properties.sheetId ?? 1;
  const refSheetId =
    created.sheets.find((s) => s.properties.title === 'Referensi_Petugas')
      ?.properties.sheetId ?? 2;

  const dataRows: (string | number)[][] = [
    DATA_PNBP_HEADERS,
    ...(includeSampleRows ? buildSamplePNBPRows(agency) : []),
  ];

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;

  const rekapRows: (string | number)[][] = [
    ['REKAPITULASI BULANAN BERITA ACARA PEMBAYARAN PNBP TUNAI', '', '', '', '', '', ''],
    [
      'Periode (YYYY-MM):',
      currentMonthStr,
      '',
      'Total BA Disetujui:',
      '=COUNTIFS(Data_BA_PNBP!Z2:Z,"Disetujui",Data_BA_PNBP!B2:B,B2&"*")',
      'Total PNBP Tunai (Rp):',
      '=SUMIFS(Data_BA_PNBP!T2:T,Data_BA_PNBP!Z2:Z,"Disetujui",Data_BA_PNBP!B2:B,B2&"*")',
    ],
    [
      'Catatan: Hanya Berita Acara yang telah divalidasi Admin (Status_Validasi = "Disetujui") yang dihitung.',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    ['', '', '', '', '', '', ''],
    [
      'ID BA',
      'Tanggal',
      'Nomor BA',
      'Petugas (Pihak I)',
      'Wajib Bayar (Pihak II)',
      'Jenis Layanan PNBP',
      'Nominal (Rp)',
    ],
    [
      '=IFERROR(FILTER({Data_BA_PNBP!A2:A,Data_BA_PNBP!B2:B,Data_BA_PNBP!C2:C,Data_BA_PNBP!J2:J,Data_BA_PNBP!M2:M,Data_BA_PNBP!R2:R,Data_BA_PNBP!T2:T},Data_BA_PNBP!Z2:Z="Disetujui",LEFT(Data_BA_PNBP!B2:B,7)=B2),"Belum ada data tervalidasi pada periode ini")',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  const refRows: (string | number)[][] = [
    ['NAMA LENGKAP PETUGAS', 'NIP PETUGAS'],
    ...REFERENSI_PETUGAS.map((p) => [p.nama, `'${p.nip}`]),
  ];

  const settingsRows: (string | number)[][] = [
    ['Kunci_Pengaturan', 'Nilai'],
    ['namaInstansi', agency.namaInstansi],
    ['subUnit', agency.subUnit],
    ['alamatInstansi', agency.alamatInstansi],
    ['kota', agency.kota],
    ['teleponEmail', agency.teleponEmail],
    ['namaPimpinan', agency.namaPimpinan],
    ['jabatanPimpinan', agency.jabatanPimpinan],
    ['nipPimpinan', `'${agency.nipPimpinan}`],
    ['kodeSuratPrefix', agency.kodeSuratPrefix],
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Data_BA_PNBP!A1', values: dataRows },
          { range: 'Rekap_Bulanan_PNBP!A1', values: rekapRows },
          { range: 'Referensi_Petugas!A1', values: refRows },
          { range: 'Pengaturan_Instansi!A1', values: settingsRows },
        ],
      }),
    }
  );

  // Format header colors (Kemenkes Teal #0F766E) & Status_Validasi dropdown
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: { sheetId: dataSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.46, blue: 0.43 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            setDataValidation: {
              range: {
                sheetId: dataSheetId,
                startRowIndex: 1,
                endRowIndex: 2000,
                startColumnIndex: 25,
                endColumnIndex: 26,
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: [
                    { userEnteredValue: 'Menunggu Validasi' },
                    { userEnteredValue: 'Disetujui' },
                    { userEnteredValue: 'Ditolak' },
                  ],
                },
                showCustomUi: true,
                strict: true,
              },
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: rekapSheetId,
                startRowIndex: 4,
                endRowIndex: 5,
                startColumnIndex: 0,
                endColumnIndex: 7,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.46, blue: 0.43 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            repeatCell: {
              range: { sheetId: refSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.07, green: 0.31, blue: 0.29 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      }),
    }
  );

  return {
    spreadsheetId,
    title: created.properties.title,
    spreadsheetUrl: created.spreadsheetUrl,
    sheetNames: created.sheets.map((s) => s.properties.title),
    activeDataSheet: 'Data_BA_PNBP',
  };
}

export async function inspectSpreadsheet(
  accessToken: string,
  rawIdOrUrl: string
): Promise<SpreadsheetInfo> {
  const spreadsheetId = extractSpreadsheetId(rawIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('ID atau URL Google Spreadsheet tidak valid.');
  }

  interface MetaResp {
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { title: string } }>;
  }

  const meta = await googleFetch<MetaResp>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    accessToken
  );

  const sheetNames = meta.sheets.map((s) => s.properties.title);
  if (sheetNames.length === 0) {
    throw new Error('Spreadsheet tidak memiliki tab sheet.');
  }

  const preferred =
    sheetNames.find((name) => name === 'Data_BA_PNBP') ||
    sheetNames.find((name) => name.toLowerCase().includes('pnbp')) ||
    sheetNames.find((name) => name.toLowerCase().includes('data')) ||
    sheetNames[0];

  return {
    spreadsheetId: meta.spreadsheetId,
    title: meta.properties.title,
    spreadsheetUrl: meta.spreadsheetUrl,
    sheetNames,
    activeDataSheet: preferred,
  };
}

export async function fetchSheetEntries(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<BeritaAcaraPNBP[]> {
  interface ValuesResp {
    values?: string[][];
  }

  const range = encodeURIComponent(`${sheetName}!A1:AD2000`);
  const data = await googleFetch<ValuesResp>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${range}`,
    accessToken
  );

  const rows = data.values || [];
  if (rows.length <= 1) return [];

  const entries: BeritaAcaraPNBP[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((cell) => !String(cell || '').trim())) continue;

    entries.push({
      rowNumber: i + 1,
      idBA: String(r[0] || `BA-${i}`),
      tanggalInput: String(r[1] || ''),
      nomorBA: String(r[2] || `00${i}/BA-PNBP/BKK-KDI`),
      hari: String(r[3] || '-'),
      tanggalTeks: String(r[4] || '-'),
      bulanTeks: String(r[5] || '-'),
      tahun: String(r[6] || '-'),
      pukulBA: String(r[7] || '-'),
      lokasi: String(r[8] || '-'),
      namaPetugas: String(r[9] || '-'),
      nipPetugas: String(r[10] || '-'),
      jabatanPetugas: String(r[11] || 'Petugas BKK Kelas I Kendari'),
      namaWajibBayar: String(r[12] || '-'),
      nikWajibBayar: String(r[13] || '-'),
      noHP: String(r[14] || '-'),
      alamatInstansi: String(r[15] || '-'),
      jamGangguan: String(r[16] || '-'),
      jenisLayanan: String(r[17] || '-'),
      rincianLayanan: String(r[18] || '-'),
      nominalAngka: parseNumeric(r[19]),
      terbilang: String(r[20] || '-'),
      kotaTTD: String(r[21] || 'Kendari'),
      tanggalTTD: String(r[22] || '-'),
      ttdWajibBayar: String(r[23] || ''),
      ttdPetugas: String(r[24] || ''),
      statusValidasi: normalizeStatus(r[25]),
      validatorAdmin: String(r[26] || ''),
      tanggalValidasi: String(r[27] || ''),
      catatanAdmin: String(r[28] || ''),
      linkPdfBA: String(r[29] || ''),
    });
  }

  return entries;
}

export async function fetchAgencySettings(
  accessToken: string,
  spreadsheetId: string,
  sheetNames: string[]
): Promise<AgencySettings> {
  if (!sheetNames.includes('Pengaturan_Instansi')) {
    return DEFAULT_AGENCY_SETTINGS;
  }

  interface ValuesResp {
    values?: string[][];
  }

  const data = await googleFetch<ValuesResp>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent('Pengaturan_Instansi!A1:B30')}`,
    accessToken
  );

  const rows = data.values || [];
  const map: Record<string, string> = {};
  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i]?.[0] || '').trim();
    const val = String(rows[i]?.[1] || '').trim();
    if (key) map[key] = val;
  }

  return {
    namaInstansi: map.namaInstansi || DEFAULT_AGENCY_SETTINGS.namaInstansi,
    subUnit: map.subUnit || DEFAULT_AGENCY_SETTINGS.subUnit,
    alamatInstansi:
      map.alamatInstansi || DEFAULT_AGENCY_SETTINGS.alamatInstansi,
    kota: map.kota || DEFAULT_AGENCY_SETTINGS.kota,
    teleponEmail: map.teleponEmail || DEFAULT_AGENCY_SETTINGS.teleponEmail,
    namaPimpinan: map.namaPimpinan || DEFAULT_AGENCY_SETTINGS.namaPimpinan,
    jabatanPimpinan:
      map.jabatanPimpinan || DEFAULT_AGENCY_SETTINGS.jabatanPimpinan,
    nipPimpinan: map.nipPimpinan || DEFAULT_AGENCY_SETTINGS.nipPimpinan,
    kodeSuratPrefix:
      map.kodeSuratPrefix || DEFAULT_AGENCY_SETTINGS.kodeSuratPrefix,
  };
}

export async function saveAgencySettingsToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetNames: string[],
  agency: AgencySettings
): Promise<void> {
  if (!sheetNames.includes('Pengaturan_Instansi')) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            { addSheet: { properties: { title: 'Pengaturan_Instansi' } } },
          ],
        }),
      }
    );
  }

  const values = [
    ['Kunci_Pengaturan', 'Nilai'],
    ['namaInstansi', agency.namaInstansi],
    ['subUnit', agency.subUnit],
    ['alamatInstansi', agency.alamatInstansi],
    ['kota', agency.kota],
    ['teleponEmail', agency.teleponEmail],
    ['namaPimpinan', agency.namaPimpinan],
    ['jabatanPimpinan', agency.jabatanPimpinan],
    ['nipPimpinan', `'${agency.nipPimpinan}`],
    ['kodeSuratPrefix', agency.kodeSuratPrefix],
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(
      'Pengaturan_Instansi!A1'
    )}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
}

export async function updateRowValidation(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  status: ValidationStatus,
  validatorName: string,
  notes: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const range = encodeURIComponent(`${sheetName}!Z${rowNumber}:AC${rowNumber}`);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          [
            status,
            validatorName,
            status === 'Menunggu Validasi' ? '' : today,
            notes,
          ],
        ],
      }),
    }
  );
}

export async function updateRowPdfLink(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  pdfUrl: string
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!AD${rowNumber}`);

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[pdfUrl]],
      }),
    }
  );
}

export async function appendBeritaAcaraRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  entry: Omit<
    BeritaAcaraPNBP,
    | 'rowNumber'
    | 'statusValidasi'
    | 'validatorAdmin'
    | 'tanggalValidasi'
    | 'catatanAdmin'
    | 'linkPdfBA'
  >
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A:AD`);
  const row = [
    entry.idBA,
    entry.tanggalInput,
    entry.nomorBA,
    entry.hari,
    entry.tanggalTeks,
    entry.bulanTeks,
    entry.tahun,
    entry.pukulBA,
    entry.lokasi,
    entry.namaPetugas,
    `'${entry.nipPetugas}`,
    entry.jabatanPetugas,
    entry.namaWajibBayar,
    `'${entry.nikWajibBayar}`,
    `'${entry.noHP}`,
    entry.alamatInstansi,
    entry.jamGangguan,
    entry.jenisLayanan,
    entry.rincianLayanan,
    entry.nominalAngka,
    entry.terbilang,
    entry.kotaTTD,
    entry.tanggalTTD,
    entry.ttdWajibBayar,
    entry.ttdPetugas,
    'Menunggu Validasi',
    '',
    '',
    '',
    '',
  ];

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${range}:append?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );
}

export async function uploadPdfToDrive(
  accessToken: string,
  fileName: string,
  pdfBlob: Blob
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', pdfBlob, fileName);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    let errorMessage = `Gagal mengunggah PDF ke Google Drive (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error?.message) errorMessage = err.error.message;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return (await res.json()) as { id: string; webViewLink: string };
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string;
}

export async function listAppSpreadsheets(
  accessToken: string
): Promise<DriveSpreadsheetItem[]> {
  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const fields = encodeURIComponent('files(id,name,webViewLink,modifiedTime)');
  const resp = await googleFetch<{ files?: DriveSpreadsheetItem[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=20&fields=${fields}`,
    accessToken
  );
  return resp.files || [];
}
