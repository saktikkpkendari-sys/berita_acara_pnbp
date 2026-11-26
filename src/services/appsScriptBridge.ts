import {
  AgencySettings,
  BeritaAcaraPNBP,
  RoleSecurityConfig,
  ValidationStatus,
} from '../types';
import { DEFAULT_AGENCY_SETTINGS } from './googleSheets';

interface BridgeGetResponse {
  ok?: boolean;
  error?: string;
  entries?: BeritaAcaraPNBP[];
  agency?: Partial<AgencySettings>;
  security?: RoleSecurityConfig;
}

interface BridgePostResponse {
  ok?: boolean;
  error?: string;
}

export async function fetchViaAppsScript(bridgeUrl: string): Promise<{
  entries: BeritaAcaraPNBP[];
  agency: AgencySettings;
  security: RoleSecurityConfig;
}> {
  const sep = bridgeUrl.includes('?') ? '&' : '?';
  const res = await fetch(`${bridgeUrl}${sep}action=list&t=${Date.now()}`, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Gagal memuat data publik dari Google Sheet (${res.status}).`);
  }
  const data = (await res.json()) as BridgeGetResponse;
  if (data.ok === false) {
    throw new Error(data.error || 'Gagal membaca data dari Apps Script.');
  }

  return {
    entries: Array.isArray(data.entries) ? data.entries : [],
    agency: {
      ...DEFAULT_AGENCY_SETTINGS,
      ...(data.agency || {}),
    },
    security: data.security || {},
  };
}

async function postToAppsScript(
  bridgeUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(bridgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Gagal mengirim data ke Google Sheet (${res.status}).`);
  }
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as BridgePostResponse;
    if (parsed.ok === false) {
      throw new Error(parsed.error || 'Operasi Apps Script ditolak.');
    }
  } catch (err) {
    if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
      if (!(err instanceof SyntaxError)) {
        throw err;
      }
    }
  }
}

export async function appendViaAppsScript(
  bridgeUrl: string,
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
  await postToAppsScript(bridgeUrl, {
    action: 'append',
    entry,
  });
}

export async function validateViaAppsScript(
  bridgeUrl: string,
  rowNumber: number,
  status: ValidationStatus,
  validatorName: string,
  notes: string
): Promise<void> {
  await postToAppsScript(bridgeUrl, {
    action: 'validate',
    rowNumber,
    status,
    validatorName,
    notes,
  });
}

export async function saveSettingsViaAppsScript(
  bridgeUrl: string,
  agency: AgencySettings,
  security?: RoleSecurityConfig
): Promise<void> {
  await postToAppsScript(bridgeUrl, {
    action: 'saveSettings',
    agency,
    security,
  });
}

export async function saveBuktiSetorViaAppsScript(
  bridgeUrl: string,
  payload: {
    rowNumber: number;
    kodeBilling: string;
    kodeNtpn: string;
    buktiSetorUrl: string;
    buktiSetorNama: string;
    fileBase64?: string;
    fileMimeType?: string;
  }
): Promise<void> {
  await postToAppsScript(bridgeUrl, {
    action: 'saveBuktiSetor',
    ...payload,
  });
}

export async function deleteViaAppsScript(
  bridgeUrl: string,
  rowNumber: number,
  idBA: string
): Promise<void> {
  await postToAppsScript(bridgeUrl, {
    action: 'delete',
    rowNumber,
    idBA,
  });
}
