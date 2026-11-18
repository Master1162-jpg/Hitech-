import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  Ban,
  CheckCircle2,
  Coins,
  Crown,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sliders,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { validateMasterWalletAddress } from '../lib/tradingEngine';
import type {
  AccountMode,
  AdminRoundOverride,
  Language,
  PlatformSettings,
  TradeOrder,
  UserAccount,
  WalletTransaction,
} from '../types';

interface AdminDashboardProps {
  lang: Language;
  token: string;
  onSyncSelfUser: () => void;
}

interface AdminOverviewPayload {
  stats: {
    totalUsers: number;
    totalLiveBalance: number;
    totalVolume: number;
    platformNetPnl: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  };
  roundControl: {
    roundId: number;
    phase: 'betting' | 'waiting';
    secondsRemaining: number;
    adminOverride: AdminRoundOverride;
    liveBuyVolume: number;
    liveSellVolume: number;
    totalBuyVolume: number;
    totalSellVolume: number;
    openOrdersCount: number;
  };
  users: UserAccount[];
  transactions: WalletTransaction[];
  trades: TradeOrder[];
  settings: PlatformSettings;
}

type AdminTab = 'overview' | 'round' | 'users' | 'finance' | 'ledger' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  token,
  onSyncSelfUser,
}) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Balance adjustment modal state
  const [adjustUser, setAdjustUser] = useState<UserAccount | null>(null);
  const [adjustMode, setAdjustMode] = useState<AccountMode>('live');
  const [adjustOp, setAdjustOp] = useState<'add' | 'subtract'>('add');
  const [adjustAmt, setAdjustAmt] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Thưởng sự kiện HitechTrade');

  // Settings local form
  const [settingsForm, setSettingsForm] = useState<PlatformSettings | null>(null);
  const [walletQrPreview, setWalletQrPreview] = useState<string>('');

  const isVi = lang === 'vi';

  // Live QR preview for the configured deposit wallet address
  useEffect(() => {
    const addr = settingsForm?.masterWalletAddress?.trim() ?? '';
    if (addr.length < 10 || /\s/.test(addr)) {
      setWalletQrPreview('');
      return;
    }
    QRCode.toDataURL(addr, {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setWalletQrPreview(url))
      .catch(() => setWalletQrPreview(''));
  }, [settingsForm?.masterWalletAddress]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = (await res.json()) as AdminOverviewPayload;
      setData(json);
      setSettingsForm((prev) => prev ?? json.settings);
    } catch {
      // ignore transient poll errors
    }
  }, [token]);

  useEffect(() => {
    loadOverview();
    const timer = setInterval(loadOverview, 2000);
    return () => clearInterval(timer);
  }, [loadOverview]);

  const handleSetOverride = async (override: AdminRoundOverride) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/round-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ override }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật điều khiển phiên');
      setFeedback({
        type: 'ok',
        text: `Đã đặt kết quả phiên #${data?.roundControl.roundId}: ${
          override === 'auto' ? 'Tự động (Auto)' : override === 'BUY' ? 'Ép MUA (BUY)' : 'Ép BÁN (SELL)'
        }`,
      });
      loadOverview();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleDecideTx = async (txId: string, decision: 'approve' | 'reject') => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi xử lý giao dịch');
      setFeedback({
        type: 'ok',
        text: decision === 'approve' ? 'Đã duyệt giao dịch thành công.' : 'Đã từ chối giao dịch.',
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleUpdateUser = async (userId: string, patch: Partial<UserAccount>) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi cập nhật người dùng');
      setFeedback({ type: 'ok', text: `Đã cập nhật tài khoản ${json.user.nickname}.` });
      loadOverview();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleSubmitBalanceAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUser) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${adjustUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountMode: adjustMode,
          operation: adjustOp,
          amount: adjustAmt,
          reason: adjustReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi điều chỉnh số dư');
      setFeedback({
        type: 'ok',
        text: `Đã ${adjustOp === 'add' ? 'cộng' : 'trừ'} $${adjustAmt} cho ${adjustUser.nickname} (${adjustMode.toUpperCase()}).`,
      });
      setAdjustUser(null);
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setFeedback(null);

    const walletCheck = validateMasterWalletAddress(settingsForm.masterWalletAddress);
    if (!walletCheck.valid) {
      setFeedback({ type: 'err', text: walletCheck.error || 'Địa chỉ ví không hợp lệ.' });
      return;
    }

    try {
      const payload: PlatformSettings = {
        ...settingsForm,
        masterWalletAddress: walletCheck.address,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lỗi lưu cấu hình');
      setSettingsForm(json.settings);
      setFeedback({
        type: 'ok',
        text: 'Đã lưu cấu hình & đồng bộ ví nhận nạp tiền mới sang mục Nạp tiền của toàn bộ thành viên.',
      });
      loadOverview();
      onSyncSelfUser();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi' });
    }
  };

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-10 text-center text-sm text-slate-400">
        Đang tải bảng điều khiển Quản trị viên...
      </div>
    );
  }

  const filteredUsers = data.users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const pendingTxs = data.transactions.filter((t) => t.status === 'pending');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0b1021] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-[#0EA5E9]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold text-white">
              {isVi ? 'Bảng điều khiển Quản trị HitechTrade' : 'HitechTrade Admin Console'}
            </h1>
            <p className="text-xs text-slate-400">
              {isVi
                ? 'Quản lý người dùng, duyệt nạp/rút USDT, điều khiển phiên BTC/USDT & cấu hình sàn'
                : 'Manage users, approve USDT deposits/withdrawals, control BTC/USDT rounds & settings'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOverview}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: isVi ? 'Tổng quan' : 'Overview', icon: Activity },
          { id: 'round', label: isVi ? 'Điều khiển phiên BTC/USDT' : 'Round Control', icon: Sliders },
          { id: 'users', label: isVi ? `Thành viên (${data.users.length})` : `Users (${data.users.length})`, icon: Users },
          {
            id: 'finance',
            label: isVi ? `Duyệt Nạp/Rút (${pendingTxs.length})` : `Approvals (${pendingTxs.length})`,
            icon: Coins,
          },
          { id: 'ledger', label: isVi ? 'Sổ lệnh & Chuyển tiền' : 'Trades Ledger', icon: TrendingUp },
          { id: 'settings', label: isVi ? 'Cài đặt Sàn' : 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] text-[#050814]'
                  : 'border border-slate-800 bg-[#0b1021] text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            feedback.type === 'ok'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* TAB 1: Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-[#0b1021] p-4">
              <div className="text-xs text-slate-400">Tổng thành viên</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-white">
                {data.stats.totalUsers}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0b1021] p-4">
              <div className="text-xs text-slate-400">Tổng số dư Ví Thực</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-[#00D4AA]">
                ${data.stats.totalLiveBalance.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0b1021] p-4">
              <div className="text-xs text-slate-400">Tổng khối lượng Live</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-sky-400">
                ${data.stats.totalVolume.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0b1021] p-4">
              <div className="text-xs text-slate-400">Chờ duyệt Nạp / Rút</div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold text-amber-400">
                {data.stats.pendingDeposits} / {data.stats.pendingWithdrawals}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-5">
              <h3 className="font-display text-sm font-bold text-white mb-3">
                Phiên BTC/USDT hiện tại (#{data.roundControl.roundId})
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-[#080c17] p-3 border border-slate-800">
                  <div className="text-slate-400">Tổng MUA (Live / All)</div>
                  <div className="mt-1 font-mono text-base font-bold text-[#00D4AA]">
                    ${data.roundControl.liveBuyVolume.toFixed(2)} / ${data.roundControl.totalBuyVolume.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl bg-[#080c17] p-3 border border-slate-800">
                  <div className="text-slate-400">Tổng BÁN (Live / All)</div>
                  <div className="mt-1 font-mono text-base font-bold text-rose-400">
                    ${data.roundControl.liveSellVolume.toFixed(2)} / ${data.roundControl.totalSellVolume.toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('round')}
                className="mt-4 w-full rounded-xl border border-sky-500/30 bg-sky-500/10 py-2.5 text-xs font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
              >
                Mở bảng điều khiển kết quả phiên
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-5">
              <h3 className="font-display text-sm font-bold text-white mb-3">
                Yêu cầu Nạp/Rút đang chờ duyệt ({pendingTxs.length})
              </h3>
              {pendingTxs.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">Không có yêu cầu nào đang chờ.</p>
              ) : (
                <div className="space-y-2">
                  {pendingTxs.slice(0, 4).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080c17] px-3 py-2.5 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {tx.type === 'deposit' ? 'Nạp USDT' : 'Rút USDT'} · ${tx.amount.toFixed(2)}
                        </div>
                        <div className="text-slate-400">{tx.userEmail}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDecideTx(tx.id, 'approve')}
                          className="rounded-lg bg-[#00D4AA] px-2.5 py-1.5 font-bold text-[#050814] cursor-pointer"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecideTx(tx.id, 'reject')}
                          className="rounded-lg bg-rose-500/20 px-2.5 py-1.5 font-bold text-rose-300 cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Live BTC/USDT Round Result Control */}
      {tab === 'round' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Điều khiển kết quả phiên BTC/USDT #{data.roundControl.roundId}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Trạng thái: <strong className="text-white uppercase">{data.roundControl.phase}</strong> · Còn{' '}
                <strong className="font-mono text-[#00D4AA]">{data.roundControl.secondsRemaining}s</strong>
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-[#080c17] px-4 py-2 text-xs">
              Chế độ đang chọn:{' '}
              <strong
                className={
                  data.roundControl.adminOverride === 'BUY'
                    ? 'text-[#00D4AA]'
                    : data.roundControl.adminOverride === 'SELL'
                    ? 'text-rose-400'
                    : 'text-sky-400'
                }
              >
                {data.roundControl.adminOverride.toUpperCase()}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">KHỐI LƯỢNG ĐẶT MUA (BUY)</span>
                <TrendingUp className="h-5 w-5 text-[#00D4AA]" />
              </div>
              <div className="mt-2 font-mono text-3xl font-extrabold text-white">
                ${data.roundControl.totalBuyVolume.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Trong đó Ví Thực (Live): ${data.roundControl.liveBuyVolume.toFixed(2)}
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">KHỐI LƯỢNG ĐẶT BÁN (SELL)</span>
                <TrendingDown className="h-5 w-5 text-rose-400" />
              </div>
              <div className="mt-2 font-mono text-3xl font-extrabold text-white">
                ${data.roundControl.totalSellVolume.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Trong đó Ví Thực (Live): ${data.roundControl.liveSellVolume.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleSetOverride('auto')}
              className={`rounded-xl border py-4 text-sm font-extrabold transition-all cursor-pointer ${
                data.roundControl.adminOverride === 'auto'
                  ? 'border-sky-400 bg-sky-500/20 text-white'
                  : 'border-slate-800 bg-[#080c17] text-slate-400 hover:text-white'
              }`}
            >
              Tự động theo thị trường (Auto)
            </button>
            <button
              type="button"
              onClick={() => handleSetOverride('BUY')}
              className={`rounded-xl border py-4 text-sm font-extrabold transition-all cursor-pointer ${
                data.roundControl.adminOverride === 'BUY'
                  ? 'border-[#00D4AA] bg-[#00D4AA] text-[#050814]'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-[#00D4AA] hover:bg-emerald-500/20'
              }`}
            >
              Ép kết quả MUA (BUY)
            </button>
            <button
              type="button"
              onClick={() => handleSetOverride('SELL')}
              className={`rounded-xl border py-4 text-sm font-extrabold transition-all cursor-pointer ${
                data.roundControl.adminOverride === 'SELL'
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              Ép kết quả BÁN (SELL)
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Users Management */}
      {tab === 'users' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-white">Quản lý tài khoản người dùng</h2>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo email hoặc biệt danh..."
                className="w-full rounded-lg border border-slate-700 bg-[#080c17] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#00D4AA]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Người dùng</th>
                  <th className="pb-3 font-semibold text-right">Ví Thực</th>
                  <th className="pb-3 font-semibold text-right">Ví Demo</th>
                  <th className="pb-3 font-semibold text-center">KYC</th>
                  <th className="pb-3 font-semibold text-center">VIP</th>
                  <th className="pb-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/25">
                    <td className="py-3">
                      <div className="font-bold text-white">
                        {u.nickname}{' '}
                        {u.role === 'admin' && <span className="text-[10px] text-sky-400">(ADMIN)</span>}
                        {u.isBanned && <span className="text-[10px] text-rose-400">(LOCKED)</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#00D4AA]">
                      ${u.liveBalance.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      ${u.demoBalance.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateUser(u.id, {
                            kycStatus: u.kycStatus === 'verified' ? 'unverified' : 'verified',
                          })
                        }
                        className={`rounded px-2 py-1 text-[11px] font-bold cursor-pointer ${
                          u.kycStatus === 'verified'
                            ? 'bg-emerald-500/15 text-[#00D4AA]'
                            : u.kycStatus === 'pending'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {u.kycStatus.toUpperCase()}
                      </button>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u.id, { isVip: !u.isVip })}
                        aria-label={`Đổi VIP cho ${u.nickname}`}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold cursor-pointer ${
                          u.isVip ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Crown className="h-3 w-3" />
                        {u.isVip ? 'VIP' : 'Free'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustUser(u);
                            setAdjustAmt(100);
                          }}
                          className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
                        >
                          +/- Tiền
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateUser(u.id, { isBanned: !u.isBanned })}
                            aria-label={u.isBanned ? `Mở khóa ${u.nickname}` : `Khóa ${u.nickname}`}
                            className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer ${
                              u.isBanned
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Deposit & Withdraw Approvals */}
      {tab === 'finance' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-5">
          <h2 className="font-display text-base font-bold text-white mb-4">
            Quản lý & Duyệt giao dịch Nạp / Rút tiền
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3">Loại</th>
                  <th className="pb-3">Người dùng</th>
                  <th className="pb-3">Địa chỉ / Chi tiết</th>
                  <th className="pb-3 text-right">Số tiền</th>
                  <th className="pb-3 text-right">Trạng thái / Duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.transactions
                  .filter((t) => t.type === 'deposit' || t.type === 'withdraw')
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/25">
                      <td className="py-3 font-bold text-white">
                        {tx.type === 'deposit' ? 'Nạp USDT' : 'Rút USDT'}
                      </td>
                      <td className="py-3 text-slate-300">{tx.userEmail}</td>
                      <td className="py-3 font-mono text-[11px] text-slate-400 max-w-[180px] truncate">
                        {tx.addressOrPeer}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-white">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        {tx.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDecideTx(tx.id, 'approve')}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#00D4AA] px-2.5 py-1 font-bold text-[#050814] cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecideTx(tx.id, 'reject')}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1 font-bold text-rose-300 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`font-bold ${
                              tx.status === 'completed' ? 'text-[#00D4AA]' : 'text-rose-400'
                            }`}
                          >
                            {tx.status === 'completed' ? 'Đã duyệt' : 'Từ chối'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: All Platform Trades & Transfers Ledger */}
      {tab === 'ledger' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0b1021] p-5 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-white mb-3">
              Lịch sử Đặt lệnh BTC/USDT toàn hệ thống
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5">Phiên</th>
                    <th className="pb-2.5">Email</th>
                    <th className="pb-2.5">Ví / Nguồn</th>
                    <th className="pb-2.5">Lệnh</th>
                    <th className="pb-2.5 text-right">Vốn</th>
                    <th className="pb-2.5 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.trades.slice(0, 30).map((tr) => (
                    <tr key={tr.id}>
                      <td className="py-2.5 font-mono text-slate-400">#{tr.roundId}</td>
                      <td className="py-2.5 text-slate-200">{tr.userEmail}</td>
                      <td className="py-2.5 text-slate-400">
                        {tr.accountMode.toUpperCase()} · {tr.source.toUpperCase()}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-bold ${
                            tr.direction === 'BUY' ? 'text-[#00D4AA]' : 'text-rose-400'
                          }`}
                        >
                          {tr.direction}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-white">
                        ${tr.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold">
                        {tr.status === 'OPEN' ? (
                          <span className="text-sky-400">OPEN</span>
                        ) : (
                          <span className={tr.pnl >= 0 ? 'text-[#00D4AA]' : 'text-rose-400'}>
                            {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: System Settings */}
      {tab === 'settings' && settingsForm && (
        <form onSubmit={handleSaveSettings} className="rounded-2xl border border-slate-800 bg-[#0b1021] p-6 space-y-5">
          <h2 className="font-display text-base font-bold text-white border-b border-slate-800 pb-3">
            Cấu hình thông số hệ thống HitechTrade
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="admin-payout-rate" className="block text-xs text-slate-300 mb-1">
                Tỷ lệ trả thưởng (0.95 = 95%)
              </label>
              <input
                id="admin-payout-rate"
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={settingsForm.payoutRate}
                onChange={(e) => setSettingsForm({ ...settingsForm, payoutRate: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 font-mono text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="admin-withdraw-fee" className="block text-xs text-slate-300 mb-1">
                Phí rút USDT
              </label>
              <input
                id="admin-withdraw-fee"
                type="number"
                min="0"
                value={settingsForm.withdrawFee}
                onChange={(e) => setSettingsForm({ ...settingsForm, withdrawFee: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 font-mono text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="admin-vip-fee" className="block text-xs text-slate-300 mb-1">
                Phí nâng cấp VIP (USDT)
              </label>
              <input
                id="admin-vip-fee"
                type="number"
                min="0"
                value={settingsForm.vipFee}
                onChange={(e) => setSettingsForm({ ...settingsForm, vipFee: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 font-mono text-sm text-white"
              />
            </div>

            <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-[#080c17]/70 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="admin-master-wallet" className="block text-xs font-semibold text-slate-200">
                    Địa chỉ ví tổng USDT (Ví nhận nạp tiền)
                  </label>
                  <input
                    id="admin-master-wallet"
                    type="text"
                    required
                    value={settingsForm.masterWalletAddress}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, masterWalletAddress: e.target.value })
                    }
                    placeholder="0x..."
                    className="w-full rounded-lg border border-slate-700 bg-[#050814] px-3 py-2.5 font-mono text-xs text-white focus:border-[#00D4AA] focus:outline-none"
                  />
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Khi bấm lưu, địa chỉ ví và mã QR mới sẽ hiển thị ngay lập tức tại mục{' '}
                    <span className="font-semibold text-[#00D4AA]">Ví → Nạp tiền</span> của tất cả người dùng.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white p-1.5 shadow">
                    {walletQrPreview ? (
                      <img
                        src={walletQrPreview}
                        alt="Xem trước mã QR ví nạp"
                        data-testid="admin-wallet-qr-preview"
                        className="h-full w-full"
                      />
                    ) : (
                      <QrCode className="h-9 w-9 text-slate-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">Xem trước QR</span>
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={settingsForm.maintenanceMode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })}
                  className="accent-rose-500"
                />
                <span>Chế độ bảo trì giao dịch</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] px-6 py-2.5 text-xs font-extrabold text-[#050814] cursor-pointer"
          >
            Lưu cấu hình hệ thống
          </button>
        </form>
      )}

      {/* Balance Adjustment Modal */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSubmitBalanceAdjust}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0d1326] p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-display text-lg font-bold text-white">
              Điều chỉnh số dư: {adjustUser.nickname}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Loại ví</label>
                <select
                  value={adjustMode}
                  onChange={(e) => setAdjustMode(e.target.value as AccountMode)}
                  className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 text-xs text-white"
                >
                  <option value="live">Ví Thực (${adjustUser.liveBalance.toFixed(2)})</option>
                  <option value="demo">Ví Demo (${adjustUser.demoBalance.toFixed(2)})</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Thao tác</label>
                <select
                  value={adjustOp}
                  onChange={(e) => setAdjustOp(e.target.value as 'add' | 'subtract')}
                  className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 text-xs text-white"
                >
                  <option value="add">Cộng tiền (+)</option>
                  <option value="subtract">Trừ tiền (-)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Số tiền (USDT)</label>
              <input
                type="number"
                min={1}
                required
                value={adjustAmt}
                onChange={(e) => setAdjustAmt(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 font-mono text-sm font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Lý do điều chỉnh</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#080c17] px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustUser(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#00D4AA] px-5 py-2 text-xs font-extrabold text-[#050814] cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
