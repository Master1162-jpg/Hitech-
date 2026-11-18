import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  QrCode,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { resolveDepositWalletAddress } from '../lib/tradingEngine';
import type { Language, PlatformSettings, UserAccount, WalletTransaction } from '../types';

interface WalletViewProps {
  lang: Language;
  user: UserAccount;
  token: string;
  depositWalletAddress?: string;
  modalTrigger?: { tab: 'deposit' | 'withdraw'; seq: number } | null;
  onUserUpdated: (user: UserAccount) => void;
  onResetDemo?: () => void;
  onGoToProfile?: () => void;
  onGoToTrade?: () => void;
}

type WalletSubTab = 'main' | 'trading';
type HistoryFilter = 'deposit' | 'withdraw' | 'internal' | 'all';
type WithdrawNetwork = 'internal' | 'bep20';

const TetherIcon: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'lg' }) => {
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-11 w-11';
  return (
    <img
      src="/assets/aistudio/IMG_0102_a4e9003a.png"
      alt="USDT"
      className={`${sizeClass} shrink-0 rounded-full object-contain`}
    />
  );
};

function formatUsdt(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const WalletView: React.FC<WalletViewProps> = ({
  lang,
  user,
  token,
  depositWalletAddress,
  modalTrigger,
  onUserUpdated,
  onResetDemo,
  onGoToProfile,
  onGoToTrade,
}) => {
  const isVi = lang === 'vi';

  const [subTab, setSubTab] = useState<WalletSubTab>('main');
  const [hideBalance, setHideBalance] = useState(false);

  // Modal state matching IMG_0082 & IMG_0083
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [withdrawNetwork, setWithdrawNetwork] = useState<WithdrawNetwork>('internal');

  // History dropdown filter matching IMG_0080
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('deposit');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // Deposit form state
  const [depositAmt, setDepositAmt] = useState<string>('');
  const [depositHash, setDepositHash] = useState<string>('');
  const [instantCredit, setInstantCredit] = useState<boolean>(true);

  // Withdraw / Internal Transfer unified form state
  const [withdrawAmt, setWithdrawAmt] = useState<string>('');
  const [recipientOrAddr, setRecipientOrAddr] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [recipientPreview, setRecipientPreview] = useState<{
    id: string;
    email: string;
    nickname: string;
    isVip: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const withdrawFee = settings?.withdrawFee ?? 1;
  const activeDepositAddress = resolveDepositWalletAddress(
    depositWalletAddress || settings?.masterWalletAddress,
    user.walletAddress
  );

  // Respond to external Quick Deposit ("Nạp tiền") clicks from header or drawer
  useEffect(() => {
    if (modalTrigger && modalTrigger.seq > 0) {
      setModalTab(modalTrigger.tab);
      setFeedback(null);
      setModalOpen(true);
    }
  }, [modalTrigger]);

  // Auto-generate scannable QR Code directly from the active Admin-configured deposit wallet address
  useEffect(() => {
    if (!activeDepositAddress) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(activeDepositAddress, {
      width: 240,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [activeDepositAddress]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(data.transactions || []);
      if (data.settings) setSettings(data.settings);
    } catch {
      // ignore transient
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  // Refresh settings & transactions whenever the Deposit/Withdraw modal opens
  useEffect(() => {
    if (modalOpen) {
      fetchHistory();
    }
  }, [modalOpen, modalTab]);

  const openModal = (target: 'deposit' | 'withdraw') => {
    setModalTab(target);
    setFeedback(null);
    setModalOpen(true);
  };

  const handleCopyAddress = async () => {
    if (!activeDepositAddress) return;
    try {
      await navigator.clipboard.writeText(activeDepositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback ignored
    }
  };

  const handlePaste = async (setter: (v: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setter(text.trim());
    } catch {
      // Clipboard API may be blocked in sandboxed iframe; ignore gracefully
    }
  };

  const handleVerifyRecipient = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) {
      setRecipientPreview(null);
      return;
    }
    try {
      const res = await fetch(`/api/wallet/lookup?query=${encodeURIComponent(clean)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setRecipientPreview(null);
        return;
      }
      const data = await res.json();
      setRecipientPreview(data.recipient || null);
    } catch {
      setRecipientPreview(null);
    }
  };

  const handleMaxWithdraw = () => {
    const fee = withdrawNetwork === 'bep20' ? withdrawFee : 0;
    const maxVal = Math.max(0, Number((user.liveBalance - fee).toFixed(2)));
    setWithdrawAmt(maxVal > 0 ? String(maxVal) : '0');
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const amt = Number(depositAmt);
    if (!Number.isFinite(amt) || amt < 5) {
      setFeedback({
        type: 'err',
        text: isVi ? 'Số tiền nạp tối thiểu là 5 USDT.' : 'Minimum deposit amount is 5 USDT.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amt,
          txHash: depositHash,
          instantTestCredit: instantCredit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi nạp tiền');
      if (data.user) onUserUpdated(data.user);
      setDepositAmt('');
      setDepositHash('');
      setHistoryFilter('deposit');
      setFeedback({
        type: 'ok',
        text: instantCredit
          ? isVi
            ? `Đã nạp thành công +${formatUsdt(amt)} USDT vào Ví chính!`
            : `Successfully deposited +${formatUsdt(amt)} USDT!`
          : isVi
          ? `Đã gửi lệnh nạp ${formatUsdt(amt)} USDT. Đang chờ xác nhận.`
          : `Deposit request of ${formatUsdt(amt)} USDT submitted.`,
      });
      fetchHistory();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi nạp tiền' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawOrTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!user.twoFactorEnabled) {
      setFeedback({
        type: 'err',
        text: isVi
          ? 'Bạn phải bật 2FA trong Hồ sơ & Bảo mật trước khi thực hiện yêu cầu rút tiền.'
          : 'Please enable 2FA in Profile & Security before withdrawing.',
      });
      return;
    }

    const amt = Number(withdrawAmt);
    if (!Number.isFinite(amt) || amt < 5) {
      setFeedback({
        type: 'err',
        text: isVi ? 'Số tiền tối thiểu là 5 USDT.' : 'Minimum amount is 5 USDT.',
      });
      return;
    }

    if (!recipientOrAddr.trim()) {
      setFeedback({
        type: 'err',
        text:
          withdrawNetwork === 'internal'
            ? isVi
              ? 'Vui lòng nhập biệt danh hoặc email người nhận.'
              : 'Please enter recipient nickname or email.'
            : isVi
            ? 'Vui lòng nhập địa chỉ ví nhận (0x...).'
            : 'Please enter destination wallet address (0x...).',
      });
      return;
    }

    setLoading(true);
    try {
      if (withdrawNetwork === 'internal') {
        const res = await fetch('/api/wallet/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientQuery: recipientOrAddr.trim(),
            amount: amt,
            note: withdrawNote.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi chuyển nội bộ');
        if (data.user) onUserUpdated(data.user);
        setWithdrawAmt('');
        setRecipientOrAddr('');
        setWithdrawNote('');
        setRecipientPreview(null);
        setHistoryFilter('internal');
        setFeedback({
          type: 'ok',
          text: isVi
            ? `Đã chuyển nội bộ tức thì ${formatUsdt(amt)} USDT (Phí 0 USDT)!`
            : `Sent ${formatUsdt(amt)} USDT internally (0 fee)!`,
        });
      } else {
        const res = await fetch('/api/wallet/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amt,
            address: recipientOrAddr.trim(),
            note: withdrawNote.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi rút tiền');
        if (data.user) onUserUpdated(data.user);
        setWithdrawAmt('');
        setRecipientOrAddr('');
        setWithdrawNote('');
        setHistoryFilter('withdraw');
        setFeedback({
          type: 'ok',
          text: isVi
            ? `Đã gửi yêu cầu rút ${formatUsdt(amt)} USDT. Đang chờ duyệt.`
            : `Submitted USDT withdrawal of ${formatUsdt(amt)} USDT.`,
        });
      }
      fetchHistory();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Lỗi giao dịch' });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (historyFilter === 'all') return transactions;
    if (historyFilter === 'deposit') return transactions.filter((tx) => tx.type === 'deposit');
    if (historyFilter === 'withdraw') return transactions.filter((tx) => tx.type === 'withdraw');
    return transactions.filter((tx) => tx.type === 'transfer_in' || tx.type === 'transfer_out');
  }, [transactions, historyFilter]);

  const filterMeta: Record<
    HistoryFilter,
    { label: string; colorClass: string; icon: 'down' | 'up' | 'swap' | 'all' }
  > = {
    deposit: { label: isVi ? 'Nạp tiền' : 'Deposit', colorClass: 'text-[#00D4AA]', icon: 'down' },
    withdraw: { label: isVi ? 'Rút tiền' : 'Withdraw', colorClass: 'text-rose-500', icon: 'up' },
    internal: { label: isVi ? 'Nội bộ' : 'Internal', colorClass: 'text-sky-400', icon: 'swap' },
    all: { label: isVi ? 'Tất cả' : 'All', colorClass: 'text-slate-200', icon: 'all' },
  };

  const renderFilterIcon = (kind: 'down' | 'up' | 'swap' | 'all') => {
    if (kind === 'down') {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00D4AA]/20 text-[#00D4AA]">
          <ArrowDownLeft className="h-3.5 w-3.5" />
        </span>
      );
    }
    if (kind === 'up') {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      );
    }
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </span>
    );
  };

  const maskedBalance = '••••••';
  const liveBalanceStr = hideBalance ? maskedBalance : formatUsdt(user.liveBalance);
  const demoBalanceStr = hideBalance ? maskedBalance : formatUsdt(user.demoBalance);

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      {/* ============================================================
          TOP VIBRANT AZURE ASSETS HERO + TAB BAR (matching IMG_0080)
         ============================================================ */}
      <section className="overflow-hidden lg:rounded-2xl lg:border lg:border-slate-800/80">
        <div className="bg-gradient-to-b from-[#176ee3] via-[#1783ee] to-[#1a96f8] px-5 pb-6 pt-6 sm:px-7 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm sm:text-base font-medium text-sky-100/95">
              {isVi ? 'Tổng tài sản (USDT)' : 'Total Assets (USDT)'}
            </span>
            <button
              type="button"
              onClick={() => setHideBalance((h) => !h)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs sm:text-sm font-semibold text-white/95 transition-colors hover:bg-white/10 cursor-pointer"
            >
              {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>
                {hideBalance
                  ? isVi
                    ? 'Hiện số dư'
                    : 'Show balance'
                  : isVi
                  ? 'Ẩn số dư'
                  : 'Hide balance'}
              </span>
            </button>
          </div>

          <div
            data-testid="wallet-total-assets"
            className="mt-3 font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-white tabular-nums"
          >
            {liveBalanceStr}
          </div>
        </div>

        {/* Attached Dark Tab Strip: Ví chính | Ví giao dịch */}
        <div
          className="flex items-center gap-6 bg-[#171d2f] px-5 sm:px-7"
          role="tablist"
          aria-label={isVi ? 'Loại ví' : 'Wallet category'}
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'main'}
            onClick={() => setSubTab('main')}
            className={`relative py-3.5 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              subTab === 'main' ? 'text-[#289BF8]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isVi ? 'Ví chính' : 'Main Wallet'}</span>
            {subTab === 'main' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#289BF8]" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'trading'}
            onClick={() => setSubTab('trading')}
            className={`relative py-3.5 text-sm sm:text-base font-bold transition-colors cursor-pointer ${
              subTab === 'trading' ? 'text-[#289BF8]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isVi ? 'Ví giao dịch' : 'Trading Wallet'}</span>
            {subTab === 'trading' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#289BF8]" />
            )}
          </button>
        </div>
      </section>

      {/* ============================================================
          MAIN CONTENT BODY
         ============================================================ */}
      <div className="px-4 pt-6 space-y-8 lg:px-0">
        {subTab === 'main' ? (
          /* USDT Tether Asset Card matching IMG_0080 */
          <div className="rounded-xl border border-slate-800/90 bg-[#121623] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3.5">
                <TetherIcon size="lg" />
                <div>
                  <div className="font-display text-base sm:text-lg font-extrabold text-white">
                    USDT
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">Tether</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-base sm:text-lg font-extrabold text-white tabular-nums">
                  {liveBalanceStr}
                </div>
                <div className="font-mono text-xs sm:text-sm text-slate-400 tabular-nums">
                  {hideBalance ? '~$••••' : `~$${formatUsdt(user.liveBalance)}`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => openModal('deposit')}
                className="flex items-center justify-start sm:justify-center gap-2.5 px-4 py-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800/40 cursor-pointer"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00D4AA]/20 text-[#00D4AA]">
                  <ArrowDownLeft className="h-4 w-4" />
                </span>
                <span>{isVi ? 'Nạp tiền' : 'Deposit'}</span>
              </button>

              <button
                type="button"
                onClick={() => openModal('withdraw')}
                className="flex items-center justify-start sm:justify-center gap-2.5 border-l border-slate-800/80 px-4 py-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800/40 cursor-pointer"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                <span>{isVi ? 'Rút tiền' : 'Withdraw'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Ví giao dịch tab: Live Trading Balance + Demo Account Card */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800/90 bg-[#121623] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {isVi ? 'Tài khoản Thực' : 'Live Trading Account'}
                </span>
                <span className="text-xs font-semibold text-[#00D4AA]">USDT</span>
              </div>
              <div className="mt-3 font-mono text-3xl font-extrabold text-white tabular-nums">
                ${liveBalanceStr}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {isVi ? 'Đã nạp:' : 'Deposited:'} ${formatUsdt(user.totalDeposited)} ·{' '}
                {isVi ? 'Đã rút:' : 'Withdrawn:'} ${formatUsdt(user.totalWithdrawn)}
              </div>
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => openModal('deposit')}
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#289BF8] to-[#1D84E8] py-2.5 text-xs font-bold text-white cursor-pointer"
                >
                  {isVi ? 'Nạp tiền' : 'Deposit'}
                </button>
                {onGoToTrade && (
                  <button
                    type="button"
                    onClick={onGoToTrade}
                    className="flex-1 rounded-lg border border-slate-700 bg-[#1b2236] py-2.5 text-xs font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
                  >
                    {isVi ? 'Giao dịch ngay' : 'Trade Now'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-[#121623] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {isVi ? 'Tài khoản Demo' : 'Demo Trading Account'}
                </span>
                <span className="text-xs font-semibold text-sky-400">
                  {isVi ? 'Thử nghiệm' : 'Practice'}
                </span>
              </div>
              <div className="mt-3 font-mono text-3xl font-extrabold text-[#00D4AA] tabular-nums">
                ${demoBalanceStr}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {isVi
                  ? 'Miễn phí làm mới $1,000 bất kỳ lúc nào để luyện tập.'
                  : 'Reset freely to $1,000 anytime for practice.'}
              </div>
              <div className="mt-4 flex gap-2.5">
                {onResetDemo && (
                  <button
                    type="button"
                    onClick={onResetDemo}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#1b2236] py-2.5 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-sky-400" />
                    <span>{isVi ? 'Đặt lại $1,000' : 'Reset $1,000'}</span>
                  </button>
                )}
                {onGoToTrade && (
                  <button
                    type="button"
                    onClick={onGoToTrade}
                    className="flex-1 rounded-lg bg-[#00D4AA] py-2.5 text-xs font-extrabold text-[#050814] cursor-pointer"
                  >
                    {isVi ? 'Giao dịch Demo' : 'Trade Demo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TRANSACTION HISTORY SECTION (matching IMG_0080)
           ============================================================ */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-extrabold text-white">
            {isVi ? 'Lịch sử giao dịch' : 'Transaction History'}
          </h2>

          {/* Filter Dropdown matching IMG_0080 ("Nạp tiền ▾") */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setFilterDropdownOpen((o) => !o)}
              aria-expanded={filterDropdownOpen}
              className="inline-flex items-center gap-2.5 rounded-lg border border-slate-700/80 bg-[#192034] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-slate-500 cursor-pointer"
            >
              {renderFilterIcon(filterMeta[historyFilter].icon)}
              <span>{filterMeta[historyFilter].label}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {filterDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 rounded-xl border border-slate-700 bg-[#141a2c] p-1.5 shadow-2xl z-30">
                {(['deposit', 'withdraw', 'internal', 'all'] as HistoryFilter[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setHistoryFilter(key);
                      setFilterDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${
                      historyFilter === key
                        ? 'bg-[#289BF8]/20 text-white'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    {renderFilterIcon(filterMeta[key].icon)}
                    <span>{filterMeta[key].label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Empty State Card or Populated History List */}
          <div className="rounded-xl border border-slate-800/90 bg-[#121623] overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="py-7 text-center text-sm font-semibold text-slate-200">
                {isVi ? 'Không có dữ liệu' : 'No data available'}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {filteredTransactions.map((tx) => {
                  const isCredit =
                    tx.type === 'deposit' ||
                    tx.type === 'transfer_in' ||
                    (tx.type === 'admin_adjust' && tx.amount > 0);
                  const typeLabel =
                    tx.type === 'deposit'
                      ? isVi
                        ? 'Nạp tiền'
                        : 'Deposit'
                      : tx.type === 'withdraw'
                      ? isVi
                        ? 'Rút tiền'
                        : 'Withdraw'
                      : tx.type === 'transfer_out'
                      ? isVi
                        ? 'Chuyển nội bộ'
                        : 'Internal Out'
                      : tx.type === 'transfer_in'
                      ? isVi
                        ? 'Nhận nội bộ'
                        : 'Internal In'
                      : tx.type === 'vip_upgrade'
                      ? isVi
                        ? 'Nâng cấp VIP'
                        : 'VIP Upgrade'
                      : isVi
                      ? 'Điều chỉnh'
                      : 'Adjustment';

                  return (
                    <div
                      key={tx.id}
                      data-testid="wallet-tx-row"
                      className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 hover:bg-slate-800/30"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {renderFilterIcon(
                          tx.type === 'deposit'
                            ? 'down'
                            : tx.type === 'withdraw'
                            ? 'up'
                            : 'swap'
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-white">{typeLabel}</div>
                          <div
                            className="mt-0.5 truncate font-mono text-[11px] text-slate-400"
                            title={tx.addressOrPeer}
                          >
                            {tx.addressOrPeer}
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                            {new Date(tx.createdAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right whitespace-nowrap">
                        <div
                          className={`font-mono text-sm font-extrabold tabular-nums ${
                            isCredit ? 'text-[#00D4AA]' : 'text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                        </div>
                        <div
                          className={`mt-0.5 text-[11px] font-bold ${
                            tx.status === 'completed'
                              ? 'text-[#00D4AA]'
                              : tx.status === 'pending'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.status === 'completed'
                            ? isVi
                              ? 'Hoàn tất'
                              : 'Completed'
                            : tx.status === 'pending'
                            ? isVi
                              ? 'Chờ duyệt'
                              : 'Pending'
                            : isVi
                            ? 'Từ chối'
                            : 'Rejected'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ============================================================
          DEPOSIT / WITHDRAW FULL-FEATURED MODAL (matching IMG_0082 & IMG_0083)
         ============================================================ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/75 backdrop-blur-xs sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modalTab === 'deposit' ? 'Nạp tiền USDT' : 'Rút tiền USDT'}
        >
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#12151f] sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-slate-800 shadow-2xl">
            {/* Top Modal Tab Bar: Nạp tiền | Rút tiền + X */}
            <div className="relative flex items-center border-b border-slate-800/90 px-4">
              <div className="grid flex-1 grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('deposit');
                    setFeedback(null);
                  }}
                  className={`relative py-4 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                    modalTab === 'deposit' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{isVi ? 'Nạp tiền' : 'Deposit'}</span>
                  {modalTab === 'deposit' && (
                    <span className="absolute bottom-0 left-1/2 h-[3px] w-28 -translate-x-1/2 rounded-t-full bg-[#289BF8]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalTab('withdraw');
                    setFeedback(null);
                  }}
                  className={`relative py-4 text-center text-sm sm:text-base font-bold transition-colors cursor-pointer ${
                    modalTab === 'withdraw' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{isVi ? 'Rút tiền' : 'Withdraw'}</span>
                  {modalTab === 'withdraw' && (
                    <span className="absolute bottom-0 left-1/2 h-[3px] w-28 -translate-x-1/2 rounded-t-full bg-[#289BF8]" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng cửa sổ ví"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Shared USDT Balance Strip Box */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-700/80 bg-[#151a27] px-3.5 py-2.5">
                <TetherIcon size="sm" />
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {formatUsdt(user.liveBalance)}
                </span>
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-4 py-3 text-xs font-semibold ${
                    feedback.type === 'ok'
                      ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border border-rose-500/40 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {/* ==========================================
                  MODAL TAB 1: NẠP TIỀN (matching IMG_0082)
                 ========================================== */}
              {modalTab === 'deposit' ? (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-xs font-medium text-slate-300">
                      {isVi ? 'Mạng lưới' : 'Network'}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-gradient-to-r from-[#289BF8] to-[#1D84E8] px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/20"
                    >
                      USDT (BSC)
                    </button>
                  </div>

                  {/* Golden-amber Safety Note Box matching IMG_0082 */}
                  <div className="rounded-lg border border-amber-500/75 bg-[#3b2f12]/70 px-4 py-3 text-xs leading-relaxed text-amber-200">
                    <strong className="font-bold text-amber-300">
                      {isVi ? 'Ghi chú:' : 'Note:'}
                    </strong>{' '}
                    {isVi
                      ? 'Để đảm bảo an toàn cho tài sản của bạn, hãy chọn đúng mạng lưới. Sau khi chuyển tiền vào ví bên dưới, vui lòng điền mã TxID và số tiền đã chuyển (không bao gồm phí chuyển)'
                      : 'To keep your assets safe, please verify you selected the BSC network. After transferring to the wallet below, submit your TxID and transferred amount (excluding fees).'}
                  </div>

                  {/* Centered QR Code & Wallet Address matching IMG_0082 */}
                  <div className="flex flex-col items-center text-center">
                    <h3 className="font-display text-lg sm:text-xl font-extrabold text-white">
                      {isVi ? (
                        <>
                          Địa chỉ <span className="text-[#00D4AA]">USDT</span> nạp tiền của bạn
                        </>
                      ) : (
                        <>
                          Your <span className="text-[#00D4AA]">USDT</span> Deposit Address
                        </>
                      )}
                    </h3>

                    <div className="mt-4 rounded-xl bg-white p-2.5 shadow-lg">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR ví ${activeDepositAddress}`}
                          data-testid="wallet-qr-image"
                          className="h-44 w-44"
                        />
                      ) : (
                        <div className="flex h-44 w-44 items-center justify-center text-slate-600">
                          <QrCode className="h-14 w-14" />
                        </div>
                      )}
                    </div>

                    {/* White Wallet Address Copy Bar matching IMG_0082 */}
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      title={isVi ? 'Nhấn để sao chép địa chỉ ví' : 'Click to copy address'}
                      className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3.5 py-2.5 text-left text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
                    >
                      <code
                        data-testid="wallet-address-text"
                        className="flex-1 truncate font-mono text-xs sm:text-sm font-semibold text-slate-600"
                      >
                        {activeDepositAddress}
                      </code>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{isVi ? 'Đã chép' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </span>
                    </button>

                    <div className="mt-2.5 text-xs italic text-slate-300">
                      {isVi ? 'Số tiền tối thiểu: 5 USDT' : 'Minimum amount: 5 USDT'}
                    </div>
                  </div>

                  {/* Emerald Accent Separator + Deposit Submission Form */}
                  <div className="mx-auto h-0.5 w-3/4 rounded-full bg-gradient-to-r from-transparent via-[#00D4AA] to-transparent" />

                  <form onSubmit={handleDepositSubmit} className="space-y-4">
                    <div className="relative rounded-lg border border-slate-700/90 bg-transparent px-3.5 pb-2.5 pt-3.5">
                      <label
                        htmlFor="modal-dep-amount"
                        className="absolute -top-2.5 left-3 bg-[#12151f] px-1.5 text-[11px] font-medium text-slate-400"
                      >
                        {isVi ? 'Số tiền đã chuyển (USDT)' : 'Transferred Amount (USDT)'}
                      </label>
                      <input
                        id="modal-dep-amount"
                        type="number"
                        min={5}
                        step="0.01"
                        required
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder={isVi ? 'Số tiền tối thiểu: 5 USDT' : 'Min amount: 5 USDT'}
                        className="w-full bg-transparent font-mono text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                      />
                    </div>

                    <div className="relative flex items-center gap-2 rounded-lg border border-slate-700/90 bg-transparent px-3.5 pb-2.5 pt-3.5">
                      <label
                        htmlFor="modal-dep-hash"
                        className="absolute -top-2.5 left-3 bg-[#12151f] px-1.5 text-[11px] font-medium text-slate-400"
                      >
                        {isVi ? 'Mã TxID (tuỳ chọn)' : 'TxID Hash (optional)'}
                      </label>
                      <input
                        id="modal-dep-hash"
                        type="text"
                        value={depositHash}
                        onChange={(e) => setDepositHash(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => handlePaste(setDepositHash)}
                        className="text-xs font-bold text-[#289BF8] hover:text-sky-300 cursor-pointer"
                      >
                        {isVi ? 'Dán' : 'Paste'}
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={instantCredit}
                        onChange={(e) => setInstantCredit(e.target.checked)}
                        className="accent-[#00D4AA]"
                      />
                      <span>
                        {isVi
                          ? 'Xác nhận nạp nhanh Testnet BSC (Cộng ngay lập tức)'
                          : 'Instant BSC Testnet credit (uncheck for Admin review)'}
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-gradient-to-r from-[#00D4AA] to-[#0EA5E9] py-3 text-sm font-extrabold text-[#050814] transition-opacity hover:opacity-95 cursor-pointer disabled:opacity-60"
                    >
                      {loading
                        ? isVi
                          ? 'Đang xử lý...'
                          : 'Processing...'
                        : isVi
                        ? 'Xác nhận nạp tiền'
                        : 'Confirm Deposit'}
                    </button>
                  </form>
                </div>
              ) : (
                /* ==========================================
                   MODAL TAB 2: RÚT TIỀN — Nội bộ & BEP20 (matching IMG_0083)
                   ========================================== */
                <form onSubmit={handleWithdrawOrTransferSubmit} className="space-y-5">
                  <div>
                    <div className="mb-2.5 text-xs font-medium text-slate-300">
                      {isVi ? 'Mạng lưới' : 'Network'}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawNetwork('internal');
                          setRecipientOrAddr('');
                          setRecipientPreview(null);
                          setFeedback(null);
                        }}
                        className={`relative rounded-lg px-3 py-3 text-center transition-all cursor-pointer ${
                          withdrawNetwork === 'internal'
                            ? 'bg-gradient-to-r from-[#289BF8] to-[#1D84E8] text-white shadow-md shadow-sky-500/25'
                            : 'bg-[#2a2d3a] text-slate-300 hover:bg-[#333748]'
                        }`}
                      >
                        {withdrawNetwork === 'internal' && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#38bdf8] text-white shadow">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="text-sm font-bold">{isVi ? 'Nội bộ' : 'Internal'}</div>
                        <div
                          className={`mt-0.5 text-xs font-semibold ${
                            withdrawNetwork === 'internal' ? 'text-sky-100' : 'text-amber-400'
                          }`}
                        >
                          {isVi ? 'Phí: 0 USDT' : 'Fee: 0 USDT'}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawNetwork('bep20');
                          setRecipientOrAddr('');
                          setRecipientPreview(null);
                          setFeedback(null);
                        }}
                        className={`relative rounded-lg px-3 py-3 text-center transition-all cursor-pointer ${
                          withdrawNetwork === 'bep20'
                            ? 'bg-gradient-to-r from-[#289BF8] to-[#1D84E8] text-white shadow-md shadow-sky-500/25'
                            : 'bg-[#2a2d3a] text-slate-300 hover:bg-[#333748]'
                        }`}
                      >
                        {withdrawNetwork === 'bep20' && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#38bdf8] text-white shadow">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                        <div className="text-sm font-bold">USDT (BSC)</div>
                        <div
                          className={`mt-0.5 text-xs font-semibold ${
                            withdrawNetwork === 'bep20' ? 'text-sky-100' : 'text-amber-400'
                          }`}
                        >
                          {isVi ? `Phí: ${withdrawFee} USDT` : `Fee: ${withdrawFee} USDT`}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Field 1: Số lượng USDT + TỐI ĐA button */}
                  <div className="relative flex items-center gap-2 rounded-lg border border-slate-700/90 bg-transparent px-3.5 pb-2.5 pt-3.5">
                    <label
                      htmlFor="wd-modal-amount"
                      className="absolute -top-2.5 left-3 bg-[#12151f] px-1.5 text-[11px] font-medium text-slate-400"
                    >
                      {isVi ? 'Số lượng USDT' : 'USDT Amount'}
                    </label>
                    <input
                      id="wd-modal-amount"
                      type="number"
                      min={5}
                      step="0.01"
                      required
                      value={withdrawAmt}
                      onChange={(e) => setWithdrawAmt(e.target.value)}
                      placeholder={isVi ? 'Số tiền tối thiểu: 5 USDT' : 'Minimum amount: 5 USDT'}
                      className="flex-1 bg-transparent font-mono text-sm font-semibold text-white outline-none placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleMaxWithdraw}
                      className="rounded-md bg-[#289BF8] px-3 py-1.5 text-xs font-extrabold text-white transition-opacity hover:opacity-90 cursor-pointer shrink-0"
                    >
                      {isVi ? 'TỐI ĐA' : 'MAX'}
                    </button>
                  </div>

                  {/* Field 2: Biệt danh người nhận (Nội bộ) or Địa chỉ ví nhận (BEP20) */}
                  <div>
                    <div className="relative flex items-center gap-2 rounded-lg border border-slate-700/90 bg-transparent px-3.5 pb-2.5 pt-3.5">
                      <label
                        htmlFor="wd-modal-recipient"
                        className="absolute -top-2.5 left-3 bg-[#12151f] px-1.5 text-[11px] font-medium text-slate-400"
                      >
                        {withdrawNetwork === 'internal'
                          ? isVi
                            ? 'Biệt danh người nhận'
                            : 'Recipient Nickname'
                          : isVi
                          ? 'Địa chỉ ví nhận USDT'
                          : 'USDT Destination Address'}
                      </label>
                      <input
                        id="wd-modal-recipient"
                        type="text"
                        required
                        value={recipientOrAddr}
                        onChange={(e) => {
                          setRecipientOrAddr(e.target.value);
                          setRecipientPreview(null);
                        }}
                        onBlur={() => {
                          if (withdrawNetwork === 'internal') {
                            handleVerifyRecipient(recipientOrAddr);
                          }
                        }}
                        placeholder={
                          withdrawNetwork === 'internal'
                            ? isVi
                              ? 'Nhập biệt danh người nhận'
                              : 'Enter recipient nickname or email'
                            : '0x...'
                        }
                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => handlePaste(setRecipientOrAddr)}
                        className="text-xs font-bold text-[#289BF8] hover:text-sky-300 cursor-pointer shrink-0"
                      >
                        {isVi ? 'Dán' : 'Paste'}
                      </button>
                    </div>

                    {withdrawNetwork === 'internal' && recipientPreview && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-[#00D4AA] shrink-0" />
                        <span>
                          {isVi ? 'Đã xác nhận người nhận:' : 'Verified recipient:'}{' '}
                          <strong>{recipientPreview.nickname}</strong> ({recipientPreview.email})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Field 3: Ghi chú (tuỳ chọn) */}
                  <div className="relative flex items-center gap-2 rounded-lg border border-slate-700/90 bg-transparent px-3.5 pb-2.5 pt-3.5">
                    <label
                      htmlFor="wd-modal-note"
                      className="absolute -top-2.5 left-3 bg-[#12151f] px-1.5 text-[11px] font-medium text-slate-400"
                    >
                      {isVi ? 'Ghi chú (tuỳ chọn)' : 'Note (optional)'}
                    </label>
                    <input
                      id="wd-modal-note"
                      type="text"
                      value={withdrawNote}
                      onChange={(e) => setWithdrawNote(e.target.value)}
                      placeholder={isVi ? 'Nhập ghi chú của bạn' : 'Enter your note'}
                      className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => handlePaste(setWithdrawNote)}
                      className="text-xs font-bold text-[#289BF8] hover:text-sky-300 cursor-pointer shrink-0"
                    >
                      {isVi ? 'Dán' : 'Paste'}
                    </button>
                  </div>

                  {/* 2FA Required Warning Banner matching IMG_0083 */}
                  {!user.twoFactorEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalOpen(false);
                        onGoToProfile?.();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/70 bg-rose-950/35 px-4 py-3 text-center text-xs sm:text-sm font-semibold text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-colors hover:bg-rose-950/55 cursor-pointer"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>
                        {isVi
                          ? 'Bạn phải bật 2FA để thực hiện yêu cầu rút tiền'
                          : 'You must enable 2FA to make a withdrawal request'}
                      </span>
                    </button>
                  )}

                  {/* Centered Crimson Submit CTA ("Gửi") matching IMG_0083 */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full max-w-[260px] rounded-lg bg-[#f4294a] text-sm sm:text-base font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:bg-[#e11d48] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (isVi ? 'Đang gửi...' : 'Submitting...') : isVi ? 'Gửi' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
