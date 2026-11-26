import {
  AgencySettings,
  BeritaAcaraPNBP,
  RolePasswordCredential,
  RoleSecurityConfig,
} from '../types';
import { DEFAULT_AGENCY_SETTINGS } from './googleSheets';

const SECURITY_STORAGE_KEY = 'pnbp_role_auth_v1';
const BRIDGE_URL_STORAGE_KEY = 'pnbp_bridge_url_v1';
const LOCAL_ENTRIES_KEY = 'pnbp_local_entries_v1';
const LOCAL_AGENCY_KEY = 'pnbp_local_agency_v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePbkdf2Hex(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBytes = fromHex(saltHex);
  const saltBuffer = new ArrayBuffer(saltBytes.byteLength);
  new Uint8Array(saltBuffer).set(saltBytes);

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(derivedBits));
}

export async function hashPassword(
  password: string
): Promise<RolePasswordCredential> {
  const saltBytes = new Uint8Array(16);
  window.crypto.getRandomValues(saltBytes);
  const salt = toHex(saltBytes);
  const hash = await derivePbkdf2Hex(password, salt);
  return {
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  };
}

export async function verifyPassword(
  password: string,
  cred?: RolePasswordCredential
): Promise<boolean> {
  if (!cred || !cred.salt || !cred.hash || !password) return false;
  try {
    const candidate = await derivePbkdf2Hex(password, cred.salt);
    return timingSafeEqualHex(candidate, cred.hash);
  } catch {
    return false;
  }
}

export function loadLocalSecurityConfig(): RoleSecurityConfig {
  try {
    const raw = window.localStorage.getItem(SECURITY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RoleSecurityConfig;
    return {
      admin: parsed.admin?.hash && parsed.admin?.salt ? parsed.admin : undefined,
      superadmin:
        parsed.superadmin?.hash && parsed.superadmin?.salt
          ? parsed.superadmin
          : undefined,
    };
  } catch {
    return {};
  }
}

export function saveLocalSecurityConfig(config: RoleSecurityConfig): void {
  try {
    window.localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

export function mergeSecurityConfigs(
  local: RoleSecurityConfig,
  remote: RoleSecurityConfig
): RoleSecurityConfig {
  const pickNewest = (
    a?: RolePasswordCredential,
    b?: RolePasswordCredential
  ): RolePasswordCredential | undefined => {
    if (a && !b) return a;
    if (!a && b) return b;
    if (!a && !b) return undefined;
    if (a && b) {
      return (b.updatedAt || '') >= (a.updatedAt || '') ? b : a;
    }
    return undefined;
  };

  return {
    admin: pickNewest(local.admin, remote.admin),
    superadmin: pickNewest(local.superadmin, remote.superadmin),
  };
}

export function validateAppsScriptUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    if (
      parsed.hostname !== 'script.google.com' &&
      parsed.hostname !== 'script.googleusercontent.com'
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function loadBridgeUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('api') || params.get('bridge');
    if (paramUrl) {
      const valid = validateAppsScriptUrl(paramUrl);
      if (valid) {
        window.localStorage.setItem(BRIDGE_URL_STORAGE_KEY, valid);
        return valid;
      }
    }
    const stored = window.localStorage.getItem(BRIDGE_URL_STORAGE_KEY) || '';
    return validateAppsScriptUrl(stored) || '';
  } catch {
    return '';
  }
}

export function saveBridgeUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (!trimmed) {
      window.localStorage.removeItem(BRIDGE_URL_STORAGE_KEY);
    } else {
      const valid = validateAppsScriptUrl(trimmed);
      if (valid) {
        window.localStorage.setItem(BRIDGE_URL_STORAGE_KEY, valid);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadLocalEntries(): BeritaAcaraPNBP[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BeritaAcaraPNBP[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEntries(entries: BeritaAcaraPNBP[]): void {
  try {
    window.localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalAgencySettings(): AgencySettings {
  try {
    const raw = window.localStorage.getItem(LOCAL_AGENCY_KEY);
    if (!raw) return DEFAULT_AGENCY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AgencySettings>;
    return {
      ...DEFAULT_AGENCY_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_AGENCY_SETTINGS;
  }
}

export function saveLocalAgencySettings(agency: AgencySettings): void {
  try {
    window.localStorage.setItem(LOCAL_AGENCY_KEY, JSON.stringify(agency));
  } catch {
    // Ignore storage errors
  }
}
