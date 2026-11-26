import React, { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { RoleSecurityConfig, UserRole } from '../types';
import { hashPassword, verifyPassword } from '../services/roleAuth';

interface RoleLoginModalProps {
  open: boolean;
  initialRole?: 'admin' | 'superadmin';
  securityConfig: RoleSecurityConfig;
  onClose: () => void;
  onSuccess: (role: 'admin' | 'superadmin') => void;
  onSetupInitialSuperAdmin: (
    updatedConfig: RoleSecurityConfig
  ) => Promise<void>;
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  open,
  initialRole = 'admin',
  securityConfig,
  onClose,
  onSuccess,
  onSetupInitialSuperAdmin,
}) => {
  const [targetRole, setTargetRole] = useState<'admin' | 'superadmin'>(
    initialRole
  );
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTargetRole(initialRole);
      setPassword('');
      setConfirmPassword('');
      setShowPass(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialRole]);

  if (!open) return null;

  const isFirstRunSuperAdmin =
    targetRole === 'superadmin' && !securityConfig.superadmin;
  const isAdminUnconfigured = targetRole === 'admin' && !securityConfig.admin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isAdminUnconfigured) {
      setError(
        'Sandi Admin belum diatur. Masuk sebagai Super Admin terlebih dahulu.'
      );
      return;
    }

    if (isFirstRunSuperAdmin) {
      if (password.length < 6) {
        setError('Sandi Super Admin minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi sandi tidak cocok.');
        return;
      }
      setSubmitting(true);
      try {
        const cred = await hashPassword(password);
        const updated: RoleSecurityConfig = {
          ...securityConfig,
          superadmin: cred,
        };
        await onSetupInitialSuperAdmin(updated);
        onSuccess('superadmin');
        onClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan sandi Super Admin.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!password) {
      setError('Masukkan kata sandi terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const targetCred =
        targetRole === 'admin'
          ? securityConfig.admin
          : securityConfig.superadmin;
      const valid = await verifyPassword(password, targetCred);
      if (!valid) {
        setError(
          `Sandi ${
            targetRole === 'admin' ? 'Admin' : 'Super Admin'
          } tidak sesuai.`
        );
        return;
      }
      onSuccess(targetRole);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const roleTitleMap: Record<Exclude<UserRole, 'user'>, string> = {
    admin: 'Admin (Validator)',
    superadmin: 'Super Admin',
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Masuk Mode Admin atau Super Admin"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 sm:text-base">
                Akses Terbatas Admin
              </h2>
              <p className="text-[11px] text-slate-500">
                Pilih jenis akses dan masukkan kata sandi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup dialog masuk admin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Segmented Role Selector */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            {(['admin', 'superadmin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setTargetRole(r);
                  setPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  targetRole === r
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {roleTitleMap[r]}
              </button>
            ))}
          </div>

          {isAdminUnconfigured ? (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="leading-relaxed">
                  <strong>Sandi Admin belum diatur.</strong> Silakan masuk
                  sebagai <strong>Super Admin</strong> terlebih dahulu untuk
                  membuat sandi Admin pada <strong>Menu Super Admin</strong>{' '}
                  &rarr; <strong>Pengaturan Sandi</strong>.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetRole('superadmin');
                  setError(null);
                }}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57]"
              >
                <ShieldCheck className="h-4 w-4" />
                Masuk sebagai Super Admin
              </button>
            </div>
          ) : (
            <>
              {isFirstRunSuperAdmin && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-950 leading-relaxed">
                  <strong>Pengaturan Awal Super Admin:</strong> Sandi Super
                  Admin belum terdaftar. Buat sandi baru (minimal 6 karakter)
                  untuk mengamankan akses pengelolaan Google Sheet dan sandi
                  Admin.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  {isFirstRunSuperAdmin
                    ? 'Buat Sandi Super Admin Baru'
                    : `Kata Sandi ${roleTitleMap[targetRole]}`}
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder={
                      isFirstRunSuperAdmin
                        ? 'Minimal 6 karakter'
                        : 'Masukkan kata sandi...'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-11 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                    aria-label={showPass ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {isFirstRunSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Ulangi Sandi Super Admin
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Ketik ulang sandi baru..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0D5D57] disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {submitting
                    ? 'Memproses...'
                    : isFirstRunSuperAdmin
                    ? 'Simpan & Masuk Super Admin'
                    : `Masuk ${roleTitleMap[targetRole]}`}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
